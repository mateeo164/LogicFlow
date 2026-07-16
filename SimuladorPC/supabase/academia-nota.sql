alter table public.progreso_usuario
    add column if not exists academia_aciertos jsonb   default '[]'::jsonb,
    add column if not exists academia_nota     numeric default 0;

alter table public.progreso_usuario drop constraint if exists progreso_usuario_academia_nota_check;
alter table public.progreso_usuario
    add constraint progreso_usuario_academia_nota_check check (academia_nota >= 0 and academia_nota <= 10);

alter table public.progreso_usuario drop constraint if exists progreso_usuario_academia_aciertos_check;
alter table public.progreso_usuario
    add constraint progreso_usuario_academia_aciertos_check check (jsonb_typeof(academia_aciertos) = 'array');

notify pgrst, 'reload schema';
