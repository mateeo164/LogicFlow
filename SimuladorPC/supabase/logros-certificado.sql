alter table public.eventos_simulacion
    add column if not exists detalle text;

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

alter table public.progreso_usuario
    add column if not exists nota_web            numeric(4,1),
    add column if not exists foto_simulador_path text,
    add column if not exists web_aprobado_at     timestamptz,
    add column if not exists movil_completado_at timestamptz;

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

insert into storage.buckets (id, name, public)
values ('ensambles', 'ensambles', false)
on conflict (id) do nothing;

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
