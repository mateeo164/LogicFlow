create table if not exists public.retos_resultados (
    id                   bigint generated always as identity primary key,
    user_id              uuid not null references auth.users(id) on delete cascade,
    reto_id              text not null,
    nota                 numeric(4,1) not null default 0,
    exito                boolean not null default false,
    errores_diagnostico  integer not null default 0,
    pistas_usadas        integer not null default 0,
    inspecciones         integer not null default 0,
    segundos             integer not null default 0,
    created_at           timestamptz not null default now()
);

create index if not exists retos_resultados_user_idx
    on public.retos_resultados (user_id, reto_id, created_at desc);

alter table public.retos_resultados enable row level security;

drop policy if exists "retos_select_propios" on public.retos_resultados;
create policy "retos_select_propios"
    on public.retos_resultados for select
    using (auth.uid() = user_id);

drop policy if exists "retos_insert_propios" on public.retos_resultados;
create policy "retos_insert_propios"
    on public.retos_resultados for insert
    with check (auth.uid() = user_id);

create table if not exists public.logros_usuario (
    user_id    uuid not null references auth.users(id) on delete cascade,
    logro_id   text not null,
    contexto   text,
    created_at timestamptz not null default now(),
    primary key (user_id, logro_id)
);

alter table public.logros_usuario enable row level security;

drop policy if exists "logros_select_propios" on public.logros_usuario;
create policy "logros_select_propios"
    on public.logros_usuario for select
    using (auth.uid() = user_id);

drop policy if exists "logros_insert_propios" on public.logros_usuario;
create policy "logros_insert_propios"
    on public.logros_usuario for insert
    with check (auth.uid() = user_id);
