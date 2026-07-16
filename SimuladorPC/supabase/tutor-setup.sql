drop table if exists public.lf_entregas       cascade;
drop table if exists public.lf_tareas         cascade;
drop table if exists public.lf_inscripciones  cascade;
drop table if exists public.lf_clases         cascade;

drop function if exists public.lf_es_tutor_de(uuid)                          cascade;
drop function if exists public.lf_esta_inscrito(uuid)                        cascade;
drop function if exists public.lf_es_tutor_de_tarea(uuid)                    cascade;
drop function if exists public.lf_crear_clase(text)                          cascade;
drop function if exists public.lf_unirse_a_clase(text)                       cascade;
drop function if exists public.lf_tutor_resumen_clase(uuid)                  cascade;
drop function if exists public.lf_entregar_tarea(uuid)                       cascade;
drop function if exists public.lf_calificar_entrega(uuid, uuid, numeric, text) cascade;
drop function if exists public.lf_resumen_tarea(uuid)                        cascade;
drop function if exists public.lf_mis_tareas()                              cascade;

create table public.lf_clases (
    id         uuid primary key default gen_random_uuid(),
    tutor_id   uuid not null references auth.users(id) on delete cascade,
    nombre     text not null,
    codigo     text not null unique,
    created_at timestamptz not null default now()
);
create index lf_clases_tutor_idx on public.lf_clases (tutor_id);

create table public.lf_inscripciones (
    clase_id      uuid not null references public.lf_clases(id) on delete cascade,
    estudiante_id uuid not null references auth.users(id) on delete cascade,
    created_at    timestamptz not null default now(),
    primary key (clase_id, estudiante_id)
);
create index lf_inscripciones_estudiante_idx on public.lf_inscripciones (estudiante_id);

create table public.lf_tareas (
    id          uuid primary key default gen_random_uuid(),
    clase_id    uuid not null references public.lf_clases(id) on delete cascade,
    titulo      text not null,
    descripcion text,
    puntaje_max numeric(4,1) not null default 10,
    vence_at    timestamptz,
    created_at  timestamptz not null default now()
);
create index lf_tareas_clase_idx on public.lf_tareas (clase_id, created_at desc);

create table public.lf_entregas (
    tarea_id      uuid not null references public.lf_tareas(id) on delete cascade,
    estudiante_id uuid not null references auth.users(id) on delete cascade,
    entregada     boolean not null default false,
    entregada_at  timestamptz,
    nota          numeric(4,1),
    comentario    text,
    calificada_at timestamptz,
    updated_at    timestamptz not null default now(),
    primary key (tarea_id, estudiante_id)
);

create or replace function public.lf_es_tutor_de(p_clase_id uuid)
returns boolean language plpgsql security definer stable set search_path = public as $$
begin
    return exists (select 1 from public.lf_clases where id = p_clase_id and tutor_id = auth.uid());
end;
$$;

create or replace function public.lf_esta_inscrito(p_clase_id uuid)
returns boolean language plpgsql security definer stable set search_path = public as $$
begin
    return exists (select 1 from public.lf_inscripciones where clase_id = p_clase_id and estudiante_id = auth.uid());
end;
$$;

create or replace function public.lf_es_tutor_de_tarea(p_tarea_id uuid)
returns boolean language plpgsql security definer stable set search_path = public as $$
begin
    return exists (
        select 1 from public.lf_tareas t
        join public.lf_clases c on c.id = t.clase_id
        where t.id = p_tarea_id and c.tutor_id = auth.uid()
    );
end;
$$;

alter table public.lf_clases        enable row level security;
alter table public.lf_inscripciones enable row level security;
alter table public.lf_tareas        enable row level security;
alter table public.lf_entregas      enable row level security;

create policy "lf_clases_tutor_all" on public.lf_clases
    for all using (auth.uid() = tutor_id) with check (auth.uid() = tutor_id);
create policy "lf_clases_estudiante_select" on public.lf_clases
    for select using (public.lf_esta_inscrito(id));

create policy "lf_inscripciones_tutor_select" on public.lf_inscripciones
    for select using (public.lf_es_tutor_de(clase_id));
create policy "lf_inscripciones_estudiante_select" on public.lf_inscripciones
    for select using (auth.uid() = estudiante_id);
create policy "lf_inscripciones_estudiante_delete" on public.lf_inscripciones
    for delete using (auth.uid() = estudiante_id);
create policy "lf_inscripciones_tutor_delete" on public.lf_inscripciones
    for delete using (public.lf_es_tutor_de(clase_id));

create policy "lf_tareas_tutor_all" on public.lf_tareas
    for all using (public.lf_es_tutor_de(clase_id)) with check (public.lf_es_tutor_de(clase_id));
create policy "lf_tareas_estudiante_select" on public.lf_tareas
    for select using (public.lf_esta_inscrito(clase_id));

create policy "lf_entregas_tutor_select" on public.lf_entregas
    for select using (public.lf_es_tutor_de_tarea(tarea_id));
create policy "lf_entregas_estudiante_select" on public.lf_entregas
    for select using (auth.uid() = estudiante_id);

create or replace function public.lf_crear_clase(p_nombre text)
returns public.lf_clases language plpgsql security definer set search_path = public as $$
declare
    v_codigo   text;
    v_alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    v_fila     public.lf_clases;
    v_intento  int := 0;
begin
    if auth.uid() is null then raise exception 'No autenticado'; end if;
    if coalesce(trim(p_nombre), '') = '' then raise exception 'El nombre de la clase es obligatorio'; end if;

    loop
        v_codigo := '';
        for i in 1..6 loop
            v_codigo := v_codigo || substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1);
        end loop;
        begin
            insert into public.lf_clases (tutor_id, nombre, codigo)
            values (auth.uid(), trim(p_nombre), v_codigo)
            returning * into v_fila;
            return v_fila;
        exception when unique_violation then
            v_intento := v_intento + 1;
            if v_intento > 12 then raise exception 'No se pudo generar un código único, intenta de nuevo'; end if;
        end;
    end loop;
end;
$$;

create or replace function public.lf_unirse_a_clase(p_codigo text)
returns public.lf_clases language plpgsql security definer set search_path = public as $$
declare
    v_clase public.lf_clases;
begin
    if auth.uid() is null then raise exception 'No autenticado'; end if;

    select * into v_clase from public.lf_clases where upper(codigo) = upper(trim(p_codigo));

    if v_clase.id is null then raise exception 'Código de clase no válido'; end if;
    if v_clase.tutor_id = auth.uid() then raise exception 'Eres el tutor de esta clase'; end if;

    insert into public.lf_inscripciones (clase_id, estudiante_id)
    values (v_clase.id, auth.uid())
    on conflict do nothing;

    return v_clase;
end;
$$;

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
    inscrito_at           timestamptz
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
        i.created_at
    from public.lf_inscripciones i
    join auth.users u on u.id = i.estudiante_id
    left join public.progreso_usuario pr on pr.user_id = i.estudiante_id
    where i.clase_id = p_clase_id
    order by nombre;
end;
$$;

create or replace function public.lf_entregar_tarea(p_tarea_id uuid)
returns public.lf_entregas language plpgsql security definer set search_path = public as $$
declare v_fila public.lf_entregas;
begin
    if auth.uid() is null then raise exception 'No autenticado'; end if;
    if not exists (
        select 1 from public.lf_tareas t
        join public.lf_inscripciones i on i.clase_id = t.clase_id
        where t.id = p_tarea_id and i.estudiante_id = auth.uid()
    ) then raise exception 'No perteneces a la clase de esta tarea'; end if;

    insert into public.lf_entregas (tarea_id, estudiante_id, entregada, entregada_at, updated_at)
    values (p_tarea_id, auth.uid(), true, now(), now())
    on conflict (tarea_id, estudiante_id) do update
        set entregada = true, entregada_at = now(), updated_at = now()
    returning * into v_fila;
    return v_fila;
end;
$$;

create or replace function public.lf_calificar_entrega(
    p_tarea_id uuid, p_estudiante_id uuid, p_nota numeric, p_comentario text default null
)
returns public.lf_entregas language plpgsql security definer set search_path = public as $$
declare v_fila public.lf_entregas;
begin
    if not public.lf_es_tutor_de_tarea(p_tarea_id) then
        raise exception 'No autorizado para calificar esta tarea';
    end if;

    insert into public.lf_entregas (tarea_id, estudiante_id, nota, comentario, calificada_at, updated_at)
    values (p_tarea_id, p_estudiante_id, p_nota, p_comentario, now(), now())
    on conflict (tarea_id, estudiante_id) do update
        set nota = excluded.nota, comentario = excluded.comentario, calificada_at = now(), updated_at = now()
    returning * into v_fila;
    return v_fila;
end;
$$;

create or replace function public.lf_resumen_tarea(p_tarea_id uuid)
returns table (
    estudiante_id uuid, nombre text, email text, entregada boolean,
    entregada_at timestamptz, nota numeric, comentario text, calificada boolean
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
        e.calificada_at is not null
    from public.lf_tareas t
    join public.lf_inscripciones i on i.clase_id = t.clase_id
    join auth.users u on u.id = i.estudiante_id
    left join public.lf_entregas e on e.tarea_id = t.id and e.estudiante_id = i.estudiante_id
    where t.id = p_tarea_id
    order by 2;
end;
$$;

create or replace function public.lf_mis_tareas()
returns table (
    tarea_id uuid, clase_id uuid, clase_nombre text, titulo text, descripcion text,
    puntaje_max numeric, vence_at timestamptz, entregada boolean, nota numeric,
    comentario text, calificada boolean
) language plpgsql security definer set search_path = public as $$
begin
    if auth.uid() is null then raise exception 'No autenticado'; end if;

    return query
    select
        t.id, t.clase_id, c.nombre, t.titulo, t.descripcion, t.puntaje_max, t.vence_at,
        coalesce(e.entregada, false), e.nota, e.comentario, e.calificada_at is not null
    from public.lf_inscripciones i
    join public.lf_tareas t on t.clase_id = i.clase_id
    join public.lf_clases c on c.id = t.clase_id
    left join public.lf_entregas e on e.tarea_id = t.id and e.estudiante_id = auth.uid()
    where i.estudiante_id = auth.uid()
    order by (t.vence_at is null), t.vence_at asc, t.created_at desc;
end;
$$;

drop table if exists public.lf_notificaciones cascade;
create table public.lf_notificaciones (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references auth.users(id) on delete cascade,
    tipo       text not null,
    titulo     text not null,
    cuerpo     text,
    clase_id   uuid,
    tarea_id   uuid,
    leida      boolean not null default false,
    created_at timestamptz not null default now()
);
create index lf_notif_user_idx on public.lf_notificaciones (user_id, leida, created_at desc);

alter table public.lf_notificaciones enable row level security;
create policy "lf_notif_propias_select" on public.lf_notificaciones
    for select using (auth.uid() = user_id);
create policy "lf_notif_propias_update" on public.lf_notificaciones
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "lf_notif_propias_delete" on public.lf_notificaciones
    for delete using (auth.uid() = user_id);

create or replace function public.lf_notif_tarea_nueva()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_clase text;
begin
    select nombre into v_clase from public.lf_clases where id = NEW.clase_id;
    insert into public.lf_notificaciones (user_id, tipo, titulo, cuerpo, clase_id, tarea_id)
    select i.estudiante_id, 'tarea_nueva',
           'Nueva tarea: ' || NEW.titulo,
           'En ' || coalesce(v_clase, 'tu clase') ||
               case when coalesce(NEW.descripcion, '') <> '' then ' · ' || NEW.descripcion else '' end,
           NEW.clase_id, NEW.id
    from public.lf_inscripciones i
    where i.clase_id = NEW.clase_id;
    return NEW;
end;
$$;
drop trigger if exists lf_tareas_notif on public.lf_tareas;
create trigger lf_tareas_notif after insert on public.lf_tareas
    for each row execute function public.lf_notif_tarea_nueva();

create or replace function public.lf_notif_calificacion()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_titulo text;
begin
    if NEW.calificada_at is not null and (
        TG_OP = 'INSERT'
        or NEW.calificada_at is distinct from OLD.calificada_at
        or NEW.nota is distinct from OLD.nota
    ) then
        select titulo into v_titulo from public.lf_tareas where id = NEW.tarea_id;
        insert into public.lf_notificaciones (user_id, tipo, titulo, cuerpo, tarea_id)
        values (NEW.estudiante_id, 'tarea_calificada',
            'Tarea calificada: ' || coalesce(v_titulo, ''),
            'Obtuviste ' || coalesce(NEW.nota::text, '—') ||
                case when coalesce(NEW.comentario, '') <> '' then ' · ' || NEW.comentario else '' end,
            NEW.tarea_id);
    end if;
    return NEW;
end;
$$;
drop trigger if exists lf_entregas_notif on public.lf_entregas;
create trigger lf_entregas_notif after insert or update on public.lf_entregas
    for each row execute function public.lf_notif_calificacion();

grant execute on function public.lf_es_tutor_de(uuid)                          to authenticated;
grant execute on function public.lf_esta_inscrito(uuid)                        to authenticated;
grant execute on function public.lf_es_tutor_de_tarea(uuid)                    to authenticated;
grant execute on function public.lf_crear_clase(text)                          to authenticated;
grant execute on function public.lf_unirse_a_clase(text)                       to authenticated;
grant execute on function public.lf_tutor_resumen_clase(uuid)                  to authenticated;
grant execute on function public.lf_entregar_tarea(uuid)                       to authenticated;
grant execute on function public.lf_calificar_entrega(uuid, uuid, numeric, text) to authenticated;
grant execute on function public.lf_resumen_tarea(uuid)                        to authenticated;
grant execute on function public.lf_mis_tareas()                              to authenticated;

notify pgrst, 'reload schema';
