-- progreso-merge.sql
-- Instalación ATÓMICA de un componente en progreso_usuario.
--
-- Problema que resuelve: `guardarProgreso` en js/progreso.js hace un
-- read-modify-write del arreglo `componentes_instalados` (lee la fila, agrega el
-- componente en JS, y reescribe). Si un mismo estudiante usa la web y la app
-- móvil casi a la vez en la MISMA corrida, ambos leen el mismo arreglo y el
-- último en escribir pisa al otro → se pierde un componente (last-write-wins).
--
-- Solución: mover el append al servidor. El UPDATE con `array_append` toma un
-- lock de fila, así dos instalaciones concurrentes se SERIALIZAN y ambas se
-- conservan. Incluye deduplicación (@>) para que reinstalar sea un no-op.
--
-- El cliente llama esta función vía /rpc/lf_instalar_componente y, si no existe
-- (o falla), cae automáticamente al camino clásico. Por eso ejecutar este SQL
-- es OPCIONAL pero recomendado; sin él, la app sigue funcionando igual que antes.
--
-- >>> El administrador debe ejecutar este archivo en el editor SQL de Supabase. <<<
--
-- Supuestos (verificados contra el uso existente en otros .sql):
--   • componentes_instalados  text[]     (se usa array_length(...,1) en academia/ranking)
--   • simulaciones_completadas / tiempo_total_segundos / paso_actual / total_componentes  integer
--   • user_id tiene restricción UNIQUE o PRIMARY KEY (una sola fila por usuario).
-- Si tu columna user_id NO fuese única, cambia el ON CONFLICT por el nombre real
-- de la constraint, o crea: alter table public.progreso_usuario
--   add constraint progreso_usuario_user_id_key unique (user_id);

create or replace function public.lf_instalar_componente(
    p_componente text,
    p_segundos   int default 0,
    p_total      int default 6
) returns void
language plpgsql
security invoker           -- opera sobre la fila propia; la RLS dueño-únicamente basta
set search_path = public
as $$
declare
    v_user uuid := auth.uid();
    v_len  int;
begin
    if v_user is null or p_componente is null or length(trim(p_componente)) = 0 then
        return;
    end if;

    -- Asegura que exista la fila del usuario (primer componente de la corrida).
    insert into public.progreso_usuario (user_id, componentes_instalados, total_componentes, paso_actual)
    values (v_user, array[]::text[], p_total, 1)
    on conflict (user_id) do nothing;

    -- Append atómico + dedup. El WHERE deja el UPDATE en no-op si el componente
    -- ya estaba (no se vuelve a sumar tiempo, igual que el early-return del cliente).
    update public.progreso_usuario
       set componentes_instalados = array_append(coalesce(componentes_instalados, array[]::text[]), p_componente),
           tiempo_total_segundos  = coalesce(tiempo_total_segundos, 0) + greatest(0, coalesce(p_segundos, 0)),
           ultimo_componente      = p_componente,
           total_componentes      = p_total,
           updated_at             = now()
     where user_id = v_user
       and not (coalesce(componentes_instalados, array[]::text[]) @> array[p_componente]);

    -- Derivados (paso actual, completado, simulaciones, completed_at) recalculados
    -- desde el arreglo ya consolidado. Espeja exactamente la lógica de guardarProgreso.
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

-- Refresca el cache de esquema de PostgREST para que la RPC quede disponible ya.
notify pgrst, 'reload schema';
