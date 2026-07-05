-- seguridad-rls.sql
-- Asegura Row Level Security (RLS) en las tablas de datos personales del estudiante.
-- Toda la seguridad del proyecto depende de RLS porque el cliente usa la anon key
-- pública. Estas dos tablas (progreso y eventos) se crearon en Supabase antes de
-- versionar el SQL, así que este archivo GARANTIZA que estén bien protegidas.
--
-- Es idempotente: se puede ejecutar varias veces sin error.
-- Ejecútalo en el SQL Editor de Supabase.
--
-- Nota: el docente NO lee el progreso del alumno por estas políticas, sino por las
-- funciones SECURITY DEFINER del panel (lf_tutor_resumen_clase, etc.). Por eso aquí
-- basta con la política "cada quien ve/edita SOLO lo suyo" y evitamos EXISTS cruzados
-- (que en este proyecto causaban "infinite recursion detected in policy").

-- =========================================================
-- 1) progreso_usuario  (una fila por usuario; nota, XP, marcas de fin)
-- =========================================================
alter table public.progreso_usuario enable row level security;

drop policy if exists progreso_usuario_select_own on public.progreso_usuario;
create policy progreso_usuario_select_own
    on public.progreso_usuario for select
    to authenticated
    using (auth.uid() = user_id);

drop policy if exists progreso_usuario_insert_own on public.progreso_usuario;
create policy progreso_usuario_insert_own
    on public.progreso_usuario for insert
    to authenticated
    with check (auth.uid() = user_id);

drop policy if exists progreso_usuario_update_own on public.progreso_usuario;
create policy progreso_usuario_update_own
    on public.progreso_usuario for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- =========================================================
-- 2) eventos_simulacion  (bitácora de aciertos/errores/demoras; append-only)
-- =========================================================
alter table public.eventos_simulacion enable row level security;

drop policy if exists eventos_simulacion_select_own on public.eventos_simulacion;
create policy eventos_simulacion_select_own
    on public.eventos_simulacion for select
    to authenticated
    using (auth.uid() = user_id);

drop policy if exists eventos_simulacion_insert_own on public.eventos_simulacion;
create policy eventos_simulacion_insert_own
    on public.eventos_simulacion for insert
    to authenticated
    with check (auth.uid() = user_id);

-- Los eventos son una bitácora: no se permite UPDATE ni DELETE desde el cliente
-- (no se crea política para esas acciones, por lo que quedan denegadas con RLS activo).

-- Refresca el cache de esquema de PostgREST.
notify pgrst, 'reload schema';
