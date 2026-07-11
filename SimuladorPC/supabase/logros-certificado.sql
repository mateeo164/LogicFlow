-- ============================================================
-- LogicFlow · Logros granulares, notas y certificado
-- Ejecutar en Supabase → SQL Editor (una sola vez).
--
-- Amplía el ecosistema de progreso para que:
--   • Los errores del ensamble fino (cables, alineación, dual-channel)
--     se registren en la BD con su detalle.
--   • Los logros se persistan de forma unificada (web + móvil + retos)
--     en la tabla logros_usuario ya existente.
--   • Se distinga la finalización WEB de la MÓVIL (comparten fila).
--   • Exista un certificado final con foto del simulador + foto real.
--
-- NOTA: además de este SQL hay que crear el bucket de Storage
-- "ensambles" (privado). Al final del archivo se incluye el bloque
-- para crearlo por SQL; si prefieres, créalo desde el panel
-- Storage → New bucket → nombre "ensambles", NO público.
-- ============================================================


-- ---------- 1) eventos_simulacion: detalle + nuevos tipos ----------
-- Se añade una columna "detalle" para describir el sub-paso concreto
-- (p. ej. "Conectar cable EPS 8-pin"). Y se amplían los tipos válidos
-- con error_ensamble / acierto_ensamble para el ensamble fino.

alter table public.eventos_simulacion
    add column if not exists detalle text;

-- El CHECK original (si existe) solo permitía acierto/error_pieza/demora.
-- Lo soltamos de forma defensiva y lo recreamos con el set completo.
alter table public.eventos_simulacion
    drop constraint if exists eventos_simulacion_tipo_check;

alter table public.eventos_simulacion
    add constraint eventos_simulacion_tipo_check
    check (tipo in (
        'acierto',
        'error_pieza',
        'demora',
        'error_ensamble',
        'acierto_ensamble'
    ));


-- ---------- 2) progreso_usuario: nota web, foto y marcas de fin ----------
-- Web y móvil escriben sobre la MISMA fila de progreso_usuario. Para el
-- certificado necesitamos saber por separado si completó la web y el móvil.

alter table public.progreso_usuario
    add column if not exists nota_web            numeric(4,1),
    add column if not exists foto_simulador_path text,
    add column if not exists web_aprobado_at     timestamptz,
    add column if not exists movil_completado_at timestamptz;


-- ---------- 3) certificados ----------
-- Una fila por usuario: registra la emisión del certificado final.

create table if not exists public.certificados (
    user_id               uuid primary key references auth.users(id) on delete cascade,
    emitido_at            timestamptz not null default now(),
    tiempo_total_segundos integer not null default 0,
    nota_web              numeric(4,1),
    foto_simulador_path   text,
    foto_real_path        text,
    logros_total          integer not null default 0
);

alter table public.certificados enable row level security;

drop policy if exists "cert_select_propios" on public.certificados;
create policy "cert_select_propios"
    on public.certificados for select
    using (auth.uid() = user_id);

drop policy if exists "cert_insert_propios" on public.certificados;
create policy "cert_insert_propios"
    on public.certificados for insert
    with check (auth.uid() = user_id);

drop policy if exists "cert_update_propios" on public.certificados;
create policy "cert_update_propios"
    on public.certificados for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Las políticas de arriba solo comprueban auth.uid() = user_id: cualquier usuario
-- autenticado podía insertar/actualizar su propia fila con nota_web, logros_total
-- y tiempo_total_segundos INVENTADOS (p. ej. insert({user_id: yo, nota_web: 10,
-- logros_total: 999}) desde la consola), a diferencia de lf_entregas/lf_tareas
-- (tutor-setup.sql) donde todo escritura pasa por una función security definer
-- que valida las reglas de negocio. Este trigger recalcula esos 3 campos a
-- partir de progreso_usuario/logros_usuario (las fuentes de verdad reales) y
-- exige que la etapa web ya esté aprobada, así el cliente ya no puede fijarlos.
create or replace function public.lf_calcular_certificado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_progreso public.progreso_usuario%rowtype;
begin
    select * into v_progreso from public.progreso_usuario where user_id = new.user_id;

    if v_progreso.web_aprobado_at is null then
        raise exception 'No se puede emitir el certificado: la etapa del simulador web aún no está aprobada.';
    end if;

    new.nota_web              := coalesce(v_progreso.nota_web, 0);
    new.tiempo_total_segundos := greatest(0, coalesce(v_progreso.tiempo_total_segundos, 0));
    new.logros_total          := (select count(*)::integer from public.logros_usuario where user_id = new.user_id);

    return new;
end;
$$;

drop trigger if exists lf_certificados_calcular on public.certificados;
create trigger lf_certificados_calcular
    before insert or update on public.certificados
    for each row
    execute function public.lf_calcular_certificado();


-- ---------- 4) Storage: bucket privado "ensambles" ----------
-- Cada usuario guarda sus fotos bajo el prefijo {auth.uid()}/...
-- (p. ej. "<uid>/simulador.png", "<uid>/real.jpg").

insert into storage.buckets (id, name, public)
values ('ensambles', 'ensambles', false)
on conflict (id) do nothing;

-- Políticas: el usuario solo lee/escribe dentro de su propia carpeta.
-- La carpeta es el primer segmento del path (storage.foldername(name)[1]).

drop policy if exists "ensambles_select_propios" on storage.objects;
create policy "ensambles_select_propios"
    on storage.objects for select
    using (
        bucket_id = 'ensambles'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

drop policy if exists "ensambles_insert_propios" on storage.objects;
create policy "ensambles_insert_propios"
    on storage.objects for insert
    with check (
        bucket_id = 'ensambles'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

drop policy if exists "ensambles_update_propios" on storage.objects;
create policy "ensambles_update_propios"
    on storage.objects for update
    using (
        bucket_id = 'ensambles'
        and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
        bucket_id = 'ensambles'
        and (storage.foldername(name))[1] = auth.uid()::text
    );
