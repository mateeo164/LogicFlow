-- academia.sql
-- Persiste el progreso de la ACADEMIA (capa de teoría/lecciones) en la misma fila
-- de progreso_usuario que ya usan el laboratorio y la comprensión. Así el avance
-- del estudiante en las lecciones se sincroniza entre dispositivos y queda disponible
-- para el panel del docente.
--
-- Idempotente. Ejecútalo en el SQL Editor de Supabase.
-- Requiere que ya existan tutor-setup.sql, logros-certificado.sql y pedagogia-coherencia.sql.

-- =========================================================
-- 1) progreso_usuario: lecciones completadas de la Academia
-- =========================================================
alter table public.progreso_usuario
    add column if not exists academia_lecciones     jsonb default '[]'::jsonb,  -- ids de lección completados
    add column if not exists academia_completadas    integer default 0,          -- nº de lecciones (derivado, para consultas rápidas)
    add column if not exists academia_actualizado_at  timestamptz;               -- última vez que avanzó en la Academia

-- Nota: las políticas RLS existentes de progreso_usuario (select/insert/update
-- del propio user_id) ya cubren estas columnas. No hace falta política nueva.

-- =========================================================
-- 2) Resumen de clase: se añade "Academia" (nº de lecciones completadas)
--    Reemplaza la función de pedagogia-coherencia.sql con una columna nueva al final.
-- =========================================================
drop function if exists public.lf_tutor_resumen_clase(uuid) cascade;

create or replace function public.lf_tutor_resumen_clase(p_clase_id uuid)
returns table (
    estudiante_id         uuid,
    nombre                text,
    email                 text,
    nota_web              numeric,
    web_aprobado          boolean,
    movil_completado      boolean,
    tiempo_total_segundos integer,
    componentes           integer,
    retos_superados       integer,
    mejor_nota_reto       numeric,
    logros_total          integer,
    inscrito_at           timestamptz,
    comprension_pct       numeric,
    ganancia              numeric,
    academia_completadas  integer
) language plpgsql security definer set search_path = public as $$
begin
    if not public.lf_es_tutor_de(p_clase_id) then
        raise exception 'No autorizado para ver esta clase';
    end if;

    return query
    select
        i.estudiante_id,
        coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as nombre,
        u.email::text,
        pr.nota_web,
        pr.web_aprobado_at is not null,
        pr.movil_completado_at is not null,
        coalesce(pr.tiempo_total_segundos, 0),
        coalesce(array_length(pr.componentes_instalados, 1), 0),
        coalesce((select count(distinct r.reto_id)::int from public.retos_resultados r where r.user_id = i.estudiante_id and r.exito), 0),
        (select max(r.nota) from public.retos_resultados r where r.user_id = i.estudiante_id),
        coalesce((select count(*)::int from public.logros_usuario l where l.user_id = i.estudiante_id), 0),
        i.created_at,
        pr.comprension_pct,
        pr.ganancia,
        coalesce(pr.academia_completadas, 0)
    from public.lf_inscripciones i
    join auth.users u on u.id = i.estudiante_id
    left join public.progreso_usuario pr on pr.user_id = i.estudiante_id
    where i.clase_id = p_clase_id
    order by nombre;
end;
$$;

grant execute on function public.lf_tutor_resumen_clase(uuid) to authenticated;

notify pgrst, 'reload schema';
