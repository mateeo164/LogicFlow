alter table public.progreso_usuario
    add column if not exists prueba_arranque_at timestamptz,
    add column if not exists arranque_exitoso   boolean;

alter table public.eventos_simulacion
    drop constraint if exists eventos_simulacion_tipo_check;

alter table public.eventos_simulacion
    add constraint eventos_simulacion_tipo_check
    check (tipo in (
        'acierto',
        'error_pieza',
        'demora',
        'error_ensamble',
        'acierto_ensamble',
        'quiz_acierto',
        'quiz_error',
        'prueba_arranque_ok',
        'prueba_arranque_fallo'
    ));

notify pgrst, 'reload schema';
