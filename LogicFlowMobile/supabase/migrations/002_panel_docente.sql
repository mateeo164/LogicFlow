-- LogicFlow — Panel de Docente (rol interno 'Tutor', label visible "Docente")
-- Ejecutar UNA vez en el editor SQL de Supabase (proyecto kgyhbimpwwtnkiozymyr).
--
-- ANTES de correr esta migración, confirma que las policies existentes de
-- progreso_usuario / eventos_simulacion son PERMISSIVE (el default). Corre:
--   select tablename, policyname, permissive, cmd
--   from pg_policies
--   where tablename in ('progreso_usuario','eventos_simulacion');
-- Si alguna sale como RESTRICTIVE, avisa antes de continuar: las policies
-- nuevas de este archivo asumen que se combinan con OR (comportamiento
-- normal de policies PERMISSIVE del mismo comando).

-- =========================================================
-- 1. profiles — espejo de auth.users, poblado por trigger
-- =========================================================
-- auth.users no es accesible vía REST/anon key para leer nombres de OTROS
-- usuarios (el docente necesita ver full_name de sus estudiantes). Se
-- mantiene una tabla espejo actualizada por trigger en cada signup/update.

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  institucion   text,
  rol           text not null default 'Estudiante' check (rol in ('Estudiante','Tutor')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, institucion, rol)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'institucion',
    coalesce(new.raw_user_meta_data ->> 'rol', 'Estudiante')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantiene profiles sincronizado si el usuario actualiza su perfil
-- (PUT /auth/v1/user, ver progreso.js actualizarPerfil()).
create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set full_name   = new.raw_user_meta_data ->> 'full_name',
      institucion = new.raw_user_meta_data ->> 'institucion',
      email       = new.email,
      updated_at  = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_user_updated();

-- Backfill de usuarios ya existentes antes de esta migración.
insert into public.profiles (id, email, full_name, institucion, rol)
select
  u.id,
  u.email,
  u.raw_user_meta_data ->> 'full_name',
  u.raw_user_meta_data ->> 'institucion',
  coalesce(u.raw_user_meta_data ->> 'rol', 'Estudiante')
from auth.users u
on conflict (id) do nothing;

create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- =========================================================
-- 2. clases
-- =========================================================
create table if not exists public.clases (
  id            uuid primary key default gen_random_uuid(),
  docente_id    uuid not null references auth.users(id) on delete cascade,
  nombre        text not null,
  descripcion   text,
  codigo        text not null unique,
  activa        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_clases_docente on public.clases(docente_id);

alter table public.clases enable row level security;

-- =========================================================
-- 3. matriculas
-- =========================================================
create table if not exists public.matriculas (
  id             uuid primary key default gen_random_uuid(),
  clase_id       uuid not null references public.clases(id) on delete cascade,
  estudiante_id  uuid not null references auth.users(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (clase_id, estudiante_id)
);

create index if not exists idx_matriculas_clase on public.matriculas(clase_id);
create index if not exists idx_matriculas_estudiante on public.matriculas(estudiante_id);

alter table public.matriculas enable row level security;

-- =========================================================
-- 4. clase_tareas (unifica deberes y retos)
-- =========================================================
create table if not exists public.clase_tareas (
  id            uuid primary key default gen_random_uuid(),
  clase_id      uuid not null references public.clases(id) on delete cascade,
  categoria     text not null check (categoria in ('deber','reto')),
  titulo        text not null,
  descripcion   text,
  tipo_meta     text not null check (tipo_meta in ('web_nota_minima','web_aprobado','ar_completo')),
  meta_valor    numeric(4,2),
  xp_bonus      integer not null default 0 check (xp_bonus >= 0),
  fecha_limite  timestamptz,
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint chk_meta_valor_requerido check (
    (tipo_meta = 'web_nota_minima' and meta_valor is not null)
    or (tipo_meta <> 'web_nota_minima' and meta_valor is null)
  )
);

create index if not exists idx_clase_tareas_clase on public.clase_tareas(clase_id, categoria);

alter table public.clase_tareas enable row level security;

-- =========================================================
-- 5. Funciones auxiliares SECURITY DEFINER (evitan ambigüedad de RLS
--    cruzado entre clases <-> matriculas <-> progreso_usuario)
-- =========================================================
create or replace function public.es_docente_de_clase(p_clase_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.clases c
    where c.id = p_clase_id and c.docente_id = auth.uid()
  );
$$;

create or replace function public.es_estudiante_en_clase(p_clase_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.matriculas m
    where m.clase_id = p_clase_id and m.estudiante_id = auth.uid()
  );
$$;

-- Estudiantes matriculados en cualquier clase del docente autenticado.
-- Usada por las policies de progreso_usuario / eventos_simulacion.
create or replace function public.estudiantes_de_mis_clases()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select m.estudiante_id
  from public.matriculas m
  join public.clases c on c.id = m.clase_id
  where c.docente_id = auth.uid();
$$;

grant execute on function public.es_docente_de_clase(uuid) to authenticated;
grant execute on function public.es_estudiante_en_clase(uuid) to authenticated;
grant execute on function public.estudiantes_de_mis_clases() to authenticated;

-- =========================================================
-- 6. Políticas: clases
-- =========================================================
create policy "clases_select_own_docente"
  on public.clases for select
  using (docente_id = auth.uid());

create policy "clases_insert_docente"
  on public.clases for insert
  with check (docente_id = auth.uid());

create policy "clases_update_own_docente"
  on public.clases for update
  using (docente_id = auth.uid())
  with check (docente_id = auth.uid());

-- Sin policy de DELETE: el borrado de clases es siempre soft (activa=false)
-- vía UPDATE, cubierto por la policy de update de arriba.

-- Estudiante necesita resolver una clase POR CÓDIGO antes de matricularse
-- (aún no existe fila en matriculas en ese momento). El código corto actúa
-- como secreto compartido; se acepta que cualquier autenticado pueda listar
-- clases activas (nombre/descripción, no datos de estudiantes).
create policy "clases_select_activas_authenticated"
  on public.clases for select
  using (activa = true);

-- =========================================================
-- 7. Políticas: matriculas
-- =========================================================
create policy "matriculas_insert_self"
  on public.matriculas for insert
  with check (estudiante_id = auth.uid());

create policy "matriculas_select_own_estudiante"
  on public.matriculas for select
  using (estudiante_id = auth.uid());

create policy "matriculas_select_docente"
  on public.matriculas for select
  using (public.es_docente_de_clase(clase_id));

create policy "matriculas_delete_docente"
  on public.matriculas for delete
  using (public.es_docente_de_clase(clase_id));

create policy "matriculas_delete_self"
  on public.matriculas for delete
  using (estudiante_id = auth.uid());

-- =========================================================
-- 8. Políticas: clase_tareas
-- =========================================================
create policy "clase_tareas_select_docente"
  on public.clase_tareas for select
  using (public.es_docente_de_clase(clase_id));

create policy "clase_tareas_select_estudiante"
  on public.clase_tareas for select
  using (activo = true and public.es_estudiante_en_clase(clase_id));

create policy "clase_tareas_insert_docente"
  on public.clase_tareas for insert
  with check (public.es_docente_de_clase(clase_id));

create policy "clase_tareas_update_docente"
  on public.clase_tareas for update
  using (public.es_docente_de_clase(clase_id))
  with check (public.es_docente_de_clase(clase_id));

create policy "clase_tareas_delete_docente"
  on public.clase_tareas for delete
  using (public.es_docente_de_clase(clase_id));

-- =========================================================
-- 9. Políticas ADITIVAS sobre progreso_usuario / eventos_simulacion
-- =========================================================
-- No se toca ninguna policy existente. Se agrega una policy SELECT
-- adicional: Postgres combina policies permissive del mismo comando con OR,
-- así el docente gana lectura de sus estudiantes matriculados sin afectar
-- el acceso que cada usuario ya tiene a sus propias filas. El docente NUNCA
-- tiene INSERT/UPDATE/DELETE aquí — panel de solo analítica.

create policy "progreso_usuario_select_docente"
  on public.progreso_usuario for select
  using (user_id in (select public.estudiantes_de_mis_clases()));

create policy "eventos_simulacion_select_docente"
  on public.eventos_simulacion for select
  using (user_id in (select public.estudiantes_de_mis_clases()));
