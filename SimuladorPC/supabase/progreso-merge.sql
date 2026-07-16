create or replace function public.lf_instalar_componente(
    p_componente text,
    p_segundos   int default 0,
    p_total      int default 6
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
    v_user uuid := auth.uid();
    v_len  int;
begin
    if v_user is null or p_componente is null or length(trim(p_componente)) = 0 then
        return;
    end if;

    insert into public.progreso_usuario (user_id, componentes_instalados, total_componentes, paso_actual)
    values (v_user, array[]::text[], p_total, 1)
    on conflict (user_id) do nothing;

    update public.progreso_usuario
       set componentes_instalados = array_append(coalesce(componentes_instalados, array[]::text[]), p_componente),
           tiempo_total_segundos  = coalesce(tiempo_total_segundos, 0) + greatest(0, coalesce(p_segundos, 0)),
           ultimo_componente      = p_componente,
           total_componentes      = p_total,
           updated_at             = now()
     where user_id = v_user
       and not (coalesce(componentes_instalados, array[]::text[]) @> array[p_componente]);

    select coalesce(array_length(componentes_instalados, 1), 0)
      into v_len
      from public.progreso_usuario
     where user_id = v_user;

    update public.progreso_usuario
       set paso_actual = least(v_len + 1, p_total + 1),
           simulaciones_completadas = case
               when v_len >= p_total and completed_at is null
               then coalesce(simulaciones_completadas, 0) + 1
               else coalesce(simulaciones_completadas, 0)
           end,
           completed_at = case
               when v_len >= p_total and completed_at is null then now()
               else completed_at
           end
     where user_id = v_user;
end;
$$;

notify pgrst, 'reload schema';
