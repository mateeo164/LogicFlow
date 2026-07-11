-- retos-validacion.sql
-- Recalcula nota/exito de retos_resultados EN EL SERVIDOR a partir de los
-- contadores crudos (errores_diagnostico, pistas_usadas, segundos), en vez de
-- confiar en los valores que manda el cliente.
--
-- Por qué: js/retos-api.js (guardarResultadoReto) solo acotaba nota a [0,10] antes
-- de insertar, pero nunca verificaba que nota/exito coincidieran con lo que
-- realmente pasó en el reto. Cualquier usuario autenticado podía abrir la consola
-- y llamar guardarResultadoReto({retoId:'x', nota:10, exito:true}) sin haber
-- jugado el reto, desbloqueando "Superado 10/10" y los logros de LOGROS_RETO
-- (tecnico_de_taller, nota_perfecta, etc.) sin mérito.
--
-- La fórmula replica exactamente calcularNotaReto() de js/retos-data.js:
--   nota = clamp(10 - errores*2 - pistas*1 - (1 si segundos > 360), 0, 10)
--   exito = nota >= NOTA_MINIMA_RETO (7)
-- Si esa función cambia, actualiza también este trigger.
--
-- Idempotente. Ejecútalo en el SQL Editor de Supabase.
-- Requiere que ya exista retos.sql (tabla retos_resultados).

create or replace function public.lf_calcular_nota_reto()
returns trigger
language plpgsql
as $$
begin
    new.errores_diagnostico := greatest(0, coalesce(new.errores_diagnostico, 0));
    new.pistas_usadas       := greatest(0, coalesce(new.pistas_usadas, 0));
    new.segundos            := greatest(0, coalesce(new.segundos, 0));
    new.inspecciones        := greatest(0, coalesce(new.inspecciones, 0));

    new.nota := greatest(0, least(10,
        10
        - new.errores_diagnostico * 2
        - new.pistas_usadas * 1
        - (case when new.segundos > 360 then 1 else 0 end)
    ));
    new.exito := new.nota >= 7;

    return new;
end;
$$;

drop trigger if exists lf_retos_calcular_nota on public.retos_resultados;
create trigger lf_retos_calcular_nota
    before insert on public.retos_resultados
    for each row
    execute function public.lf_calcular_nota_reto();
