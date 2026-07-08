-- prueba-arranque.sql
-- Persiste la PRUEBA DE ARRANQUE del taller 3D: cuando el estudiante lleva la PC
-- ensamblada al banco de pruebas y la enciende, el monitor muestra el POST/arranque
-- (exitoso si el ensamble aprobó, con error si no). Aquí se guardan tanto el evento
-- puntual (bitácora) como una marca resumen por estudiante para el panel del docente.
--
-- Idempotente. Ejecútalo en el SQL Editor de Supabase.
-- Requiere que ya existan las tablas progreso_usuario y eventos_simulacion
-- (y, para el CHECK, las migraciones logros-certificado.sql y pedagogia-coherencia.sql).

-- =========================================================
-- 1) progreso_usuario: resumen de la prueba de arranque por estudiante
-- =========================================================
alter table public.progreso_usuario
    add column if not exists prueba_arranque_at timestamptz,   -- cuándo probó el arranque
    add column if not exists arranque_exitoso   boolean;       -- POST correcto (ensamble aprobado)

-- =========================================================
-- 2) eventos_simulacion: nuevos tipos para la prueba de arranque
--    (se reafirma toda la lista de tipos permitidos, idempotente)
-- =========================================================
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
        'prueba_arranque_ok',      -- probó la PC en el banco y arrancó correctamente
        'prueba_arranque_fallo'    -- probó la PC en el banco pero el POST falló
    ));

-- Recarga el esquema de PostgREST para que la API exponga las columnas nuevas.
notify pgrst, 'reload schema';
