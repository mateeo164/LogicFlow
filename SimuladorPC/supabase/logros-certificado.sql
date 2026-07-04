-- ============================================================
-- LogicFlow · Logros granulares, notas y certificado
-- Ejecutar en Supabase → SQL Editor (una sola vez).
--
-- Amplía el ecosistema de progreso para que:
--   • Los errores del ensamble fino (cables, alineación, dual-channel)
--     se registren en la BD con su detalle.
--   • Los logros se persistan de forma unificada (web + móvil + retos)
--     en la tabla logros_usuario ya existente.
--   • Se distinga la finalización WEB de la MÓVIL (comparten fila).
--   • Exista un certificado final con foto del simulador + foto real.
--
-- NOTA: además de este SQL hay que crear el bucket de Storage
-- "ensambles" (privado). Al final del archivo se incluye el bloque
-- para crearlo por SQL; si prefieres, créalo desde el panel
-- Storage → New bucket → nombre "ensambles", NO público.
-- ============================================================


-- ---------- 1) eventos_simulacion: detalle + nuevos tipos ----------
-- Se añade una columna "detalle" para describir el sub-paso concreto
-- (p. ej. "Conectar cable EPS 8-pin"). Y se amplían los tipos válidos
-- con error_ensamble / acierto_ensamble para el ensamble fino.

alter table public.eventos_simulacion
    add column if not exists detalle text;

-- El CHECK original (si existe) solo permitía acierto/error_pieza/demora.
-- Lo soltamos de forma defensiva y lo recreamos con el set completo.
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


-- ---------- 2) progreso_usuario: nota web, foto y marcas de fin ----------
-- Web y móvil escriben sobre la MISMA fila de progreso_usuario. Para el
-- certificado necesitamos saber por separado si completó la web y el móvil.

alter table public.progreso_usuario
    add column if not exists nota_web            numeric(4,1),
    add column if not exists foto_simulador_path text,
    add column if not exists web_aprobado_at     timestamptz,
    add column if not exists movil_completado_at timestamptz;


-- ---------- 3) certificados ----------
-- Una fila por usuario: registra la emisión del certificado final.

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


-- ---------- 4) Storage: bucket privado "ensambles" ----------
-- Cada usuario guarda sus fotos bajo el prefijo {auth.uid()}/...
-- (p. ej. "<uid>/simulador.png", "<uid>/real.jpg").

insert into storage.buckets (id, name, public)
values ('ensambles', 'ensambles', false)
on conflict (id) do nothing;

-- Políticas: el usuario solo lee/escribe dentro de su propia carpeta.
-- La carpeta es el primer segmento del path (storage.foldername(name)[1]).

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
