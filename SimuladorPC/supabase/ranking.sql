-- ============================================================
-- LogicFlow · Ranking entre pares (leaderboard por clase)
-- Ejecutar en Supabase → SQL Editor (una sola vez; es idempotente).
--
-- Añade la capa SOCIAL de la gamificación: cada estudiante puede ver
-- cómo se ubica frente a sus COMPAÑEROS DE CLASE (sus pares reales).
--
-- Privacidad y seguridad:
--   · SECURITY DEFINER para poder leer datos de otros usuarios saltando
--     el RLS, igual que lf_tutor_resumen_clase.
--   · Solo puede llamarlo alguien que PERTENECE a la clase: el tutor
--     (lf_es_tutor_de) o un estudiante inscrito (lf_esta_inscrito).
--   · A los pares NO se les expone el correo (a diferencia del panel
--     docente): solo el nombre visible. La comparación es entre iguales.
--
-- Fórmula de puntos (documentada y transparente en la UI):
--     puntos = retos_superados * 100
--            + logros_total     * 25
--            + mejor_nota_reto  * 10   (0–100)
--            + componentes      * 10
-- Premia el aprendizaje basado en retos (peso mayor) sin ignorar la
-- práctica del laboratorio ni las insignias.
-- ============================================================

create or replace function public.lf_ranking_clase(p_clase_id uuid)
returns table (
    posicion        integer,
    estudiante_id   uuid,
    nombre          text,
    es_tu           boolean,
    retos_superados integer,
    mejor_nota_reto numeric,
    logros_total    integer,
    componentes     integer,
    nota_web        numeric,
    puntos          integer
) language plpgsql security definer set search_path = public as $$
begin
    -- Solo miembros de la clase (tutor o estudiante inscrito).
    if not (public.lf_es_tutor_de(p_clase_id) or public.lf_esta_inscrito(p_clase_id)) then
        raise exception 'No autorizado para ver el ranking de esta clase';
    end if;

    return query
    with base as (
        select
            i.estudiante_id as est_id,
            coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as nom,
            coalesce((
                select count(distinct r.reto_id)::int
                from public.retos_resultados r
                where r.user_id = i.estudiante_id and r.exito
            ), 0) as retos_ok,
            coalesce((
                select max(r.nota)
                from public.retos_resultados r
                where r.user_id = i.estudiante_id
            ), 0) as mejor_reto,
            coalesce((
                select count(*)::int
                from public.logros_usuario l
                where l.user_id = i.estudiante_id
            ), 0) as logros_n,
            coalesce(array_length(pr.componentes_instalados, 1), 0) as comps,
            coalesce(pr.nota_web, 0) as nota_w
        from public.lf_inscripciones i
        join auth.users u on u.id = i.estudiante_id
        left join public.progreso_usuario pr on pr.user_id = i.estudiante_id
        where i.clase_id = p_clase_id
    ),
    scored as (
        select
            b.*,
            (b.retos_ok * 100
             + b.logros_n * 25
             + round(b.mejor_reto * 10)::int
             + b.comps * 10)::int as pts
        from base b
    )
    select
        rank() over (order by s.pts desc)::int,
        s.est_id,
        s.nom,
        s.est_id = auth.uid(),
        s.retos_ok,
        s.mejor_reto,
        s.logros_n,
        s.comps,
        s.nota_w,
        s.pts
    from scored s
    order by s.pts desc, s.nom asc;
end;
$$;

grant execute on function public.lf_ranking_clase(uuid) to authenticated;

-- Refrescar la caché de la API de PostgREST.
notify pgrst, 'reload schema';
