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
