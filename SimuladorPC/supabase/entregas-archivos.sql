-- ============================================================
-- LogicFlow · Entregas con ARCHIVO (PDF) — MIGRACIÓN
-- Ejecutar UNA vez en Supabase → SQL Editor, DESPUÉS de tutor-setup.sql.
--
-- Añade a la entrega del estudiante un archivo adjunto (PDF u otro):
--   1) Columnas archivo_path / archivo_nombre en lf_entregas.
--   2) lf_entregar_tarea() ahora acepta el archivo subido.
--   3) lf_mis_tareas() / lf_resumen_tarea() devuelven el archivo.
--   4) Bucket privado de Storage "entregas" + políticas RLS:
--        · el estudiante sube/lee SOLO sus propios archivos,
--        · el tutor de la tarea puede leerlos (para calificarlos).
--
-- Es seguro correrlo varias veces.
-- ============================================================


-- ---------- 1) COLUMNAS NUEVAS ----------
alter table public.lf_entregas add column if not exists archivo_path   text;
alter table public.lf_entregas add column if not exists archivo_nombre text;


-- ---------- 2) HELPER: ¿puede el usuario entregar esta tarea? ----------
-- (está inscrito en la clase de la tarea). SECURITY DEFINER para saltar RLS.
create or replace function public.lf_puede_entregar_tarea(p_tarea_id uuid)
returns boolean language plpgsql security definer stable set search_path = public as $$
begin
    return exists (
        select 1 from public.lf_tareas t
        join public.lf_inscripciones i on i.clase_id = t.clase_id
        where t.id = p_tarea_id and i.estudiante_id = auth.uid()
    );
end;
$$;


-- ---------- 2b) HELPER: ¿sigue vigente la fecha límite de la tarea? ----------
-- lf_entregar_tarea() ya rechaza la entrega si vence_at pasó, pero la política
-- de Storage "lf_entregas_subir" solo validaba inscripción: un estudiante podía
-- seguir subiendo/reemplazando el archivo después del vencimiento aunque no
-- pudiera marcar entregada=true. SECURITY DEFINER para saltar RLS.
create or replace function public.lf_tarea_vigente(p_tarea_id uuid)
returns boolean language plpgsql security definer stable set search_path = public as $$
begin
    return exists (
        select 1 from public.lf_tareas t
        where t.id = p_tarea_id and (t.vence_at is null or now() <= t.vence_at)
    );
end;
$$;


-- ---------- 3) RPC: entregar (con archivo opcional) ----------
-- Se cambia la firma, así que hay que borrar la versión anterior primero.
drop function if exists public.lf_entregar_tarea(uuid) cascade;

create or replace function public.lf_entregar_tarea(
    p_tarea_id uuid,
    p_archivo_path   text default null,
    p_archivo_nombre text default null
)
returns public.lf_entregas language plpgsql security definer set search_path = public as $$
declare
    v_fila          public.lf_entregas;
    v_vence         timestamptz;
    v_archivo_prev  text;
begin
    if auth.uid() is null then raise exception 'No autenticado'; end if;
    if not public.lf_puede_entregar_tarea(p_tarea_id) then
        raise exception 'No perteneces a la clase de esta tarea';
    end if;

    -- Fecha límite: si ya pasó, no se puede entregar.
    select vence_at into v_vence from public.lf_tareas where id = p_tarea_id;
    if v_vence is not null and now() > v_vence then
        raise exception 'La fecha límite ya pasó. La tarea no se puede entregar.';
    end if;

    -- Archivo obligatorio: debe venir uno nuevo o existir uno previo.
    select archivo_path into v_archivo_prev
        from public.lf_entregas where tarea_id = p_tarea_id and estudiante_id = auth.uid();
    if p_archivo_path is null and v_archivo_prev is null then
        raise exception 'Debes adjuntar un archivo para entregar la tarea.';
    end if;

    insert into public.lf_entregas
        (tarea_id, estudiante_id, entregada, entregada_at, archivo_path, archivo_nombre, updated_at)
    values
        (p_tarea_id, auth.uid(), true, now(), p_archivo_path, p_archivo_nombre, now())
    on conflict (tarea_id, estudiante_id) do update set
        entregada      = true,
        entregada_at   = now(),
        -- si esta entrega trae archivo lo reemplaza; si no, conserva el anterior
        archivo_path   = coalesce(excluded.archivo_path,   public.lf_entregas.archivo_path),
        archivo_nombre = coalesce(excluded.archivo_nombre, public.lf_entregas.archivo_nombre),
        updated_at     = now()
    returning * into v_fila;
    return v_fila;
end;
$$;


-- ---------- 4) RPCs de lectura (añaden el archivo) ----------
-- Devuelven columnas nuevas → hay que borrarlas y recrearlas.
drop function if exists public.lf_resumen_tarea(uuid) cascade;

create or replace function public.lf_resumen_tarea(p_tarea_id uuid)
returns table (
    estudiante_id uuid, nombre text, email text, entregada boolean,
    entregada_at timestamptz, nota numeric, comentario text, calificada boolean,
    archivo_path text, archivo_nombre text
) language plpgsql security definer set search_path = public as $$
begin
    if not public.lf_es_tutor_de_tarea(p_tarea_id) then
        raise exception 'No autorizado para ver esta tarea';
    end if;

    return query
    select
        i.estudiante_id,
        coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
        u.email::text,
        coalesce(e.entregada, false),
        e.entregada_at, e.nota, e.comentario,
        e.calificada_at is not null,
        e.archivo_path, e.archivo_nombre
    from public.lf_tareas t
    join public.lf_inscripciones i on i.clase_id = t.clase_id
    join auth.users u on u.id = i.estudiante_id
    left join public.lf_entregas e on e.tarea_id = t.id and e.estudiante_id = i.estudiante_id
    where t.id = p_tarea_id
    order by 2;
end;
$$;

drop function if exists public.lf_mis_tareas() cascade;

create or replace function public.lf_mis_tareas()
returns table (
    tarea_id uuid, clase_id uuid, clase_nombre text, titulo text, descripcion text,
    puntaje_max numeric, vence_at timestamptz, entregada boolean, nota numeric,
    comentario text, calificada boolean, archivo_path text, archivo_nombre text
) language plpgsql security definer set search_path = public as $$
begin
    if auth.uid() is null then raise exception 'No autenticado'; end if;

    return query
    select
        t.id, t.clase_id, c.nombre, t.titulo, t.descripcion, t.puntaje_max, t.vence_at,
        coalesce(e.entregada, false), e.nota, e.comentario, e.calificada_at is not null,
        e.archivo_path, e.archivo_nombre
    from public.lf_inscripciones i
    join public.lf_tareas t on t.clase_id = i.clase_id
    join public.lf_clases c on c.id = t.clase_id
    left join public.lf_entregas e on e.tarea_id = t.id and e.estudiante_id = auth.uid()
    where i.estudiante_id = auth.uid()
    order by (t.vence_at is null), t.vence_at asc, t.created_at desc;
end;
$$;


-- ---------- 5) STORAGE: bucket privado + políticas ----------
-- Bucket "entregas" (privado). Ruta de cada archivo: {tarea_id}/{estudiante_id}/{nombre}
insert into storage.buckets (id, name, public)
values ('entregas', 'entregas', false)
on conflict (id) do nothing;

-- Limpieza de políticas previas (por si se re-ejecuta).
drop policy if exists "lf_entregas_subir"     on storage.objects;
drop policy if exists "lf_entregas_actualizar" on storage.objects;
drop policy if exists "lf_entregas_leer"       on storage.objects;
drop policy if exists "lf_entregas_borrar"     on storage.objects;

-- El estudiante SUBE archivos solo bajo su propia carpeta y a tareas suyas.
create policy "lf_entregas_subir" on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'entregas'
        and (storage.foldername(name))[2] = auth.uid()::text
        and public.lf_puede_entregar_tarea(((storage.foldername(name))[1])::uuid)
        and public.lf_tarea_vigente(((storage.foldername(name))[1])::uuid)
    );

-- Reemplazar (upsert) su propio archivo.
create policy "lf_entregas_actualizar" on storage.objects
    for update to authenticated
    using (
        bucket_id = 'entregas'
        and (storage.foldername(name))[2] = auth.uid()::text
    )
    with check (
        bucket_id = 'entregas'
        and (storage.foldername(name))[2] = auth.uid()::text
        and public.lf_tarea_vigente(((storage.foldername(name))[1])::uuid)
    );

-- LEER: el dueño (estudiante) o el tutor de la tarea.
create policy "lf_entregas_leer" on storage.objects
    for select to authenticated
    using (
        bucket_id = 'entregas'
        and (
            (storage.foldername(name))[2] = auth.uid()::text
            or public.lf_es_tutor_de_tarea(((storage.foldername(name))[1])::uuid)
        )
    );

-- BORRAR: el propio estudiante (para reemplazar su entrega).
create policy "lf_entregas_borrar" on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'entregas'
        and (storage.foldername(name))[2] = auth.uid()::text
    );


-- ---------- 6) PERMISOS ----------
grant execute on function public.lf_puede_entregar_tarea(uuid)          to authenticated;
grant execute on function public.lf_tarea_vigente(uuid)                 to authenticated;
grant execute on function public.lf_entregar_tarea(uuid, text, text)    to authenticated;
grant execute on function public.lf_resumen_tarea(uuid)                 to authenticated;
grant execute on function public.lf_mis_tareas()                        to authenticated;


-- ---------- 7) Refrescar la caché de la API ----------
notify pgrst, 'reload schema';
