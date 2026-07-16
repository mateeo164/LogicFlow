alter table public.progreso_usuario enable row level security;

drop policy if exists progreso_usuario_select_own on public.progreso_usuario;
create policy progreso_usuario_select_own
    on public.progreso_usuario for select
    to authenticated
    using (auth.uid() = user_id);

drop policy if exists progreso_usuario_insert_own on public.progreso_usuario;
create policy progreso_usuario_insert_own
    on public.progreso_usuario for insert
    to authenticated
    with check (auth.uid() = user_id);

drop policy if exists progreso_usuario_update_own on public.progreso_usuario;
create policy progreso_usuario_update_own
    on public.progreso_usuario for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

alter table public.eventos_simulacion enable row level security;

drop policy if exists eventos_simulacion_select_own on public.eventos_simulacion;
create policy eventos_simulacion_select_own
    on public.eventos_simulacion for select
    to authenticated
    using (auth.uid() = user_id);

drop policy if exists eventos_simulacion_insert_own on public.eventos_simulacion;
create policy eventos_simulacion_insert_own
    on public.eventos_simulacion for insert
    to authenticated
    with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
