-- academia-nota.sql
-- Persiste la CALIFICACIÓN de la Academia (los mini-quiz acertados) en la misma
-- fila de progreso_usuario donde ya viven las lecciones completadas.
--
-- Por qué: el laboratorio 3D exige "completar la Academia con buena calificación".
-- Sin esta columna la nota vivía solo en localStorage, así que un estudiante que
-- estudiaba en casa aparecía bloqueado al abrir el simulador en el laboratorio.
--
-- Idempotente. Ejecútalo en el SQL Editor de Supabase.
-- Requiere que ya exista academia.sql (columnas academia_lecciones/academia_completadas).
--
-- Nota: el cliente (js/academia-api.js) degrada con gracia si NO ejecutas este
-- archivo: detecta que la columna no existe y sigue guardando solo las lecciones,
-- dejando la nota en local. Ejecútalo para que la nota viaje entre dispositivos.

-- =========================================================
-- progreso_usuario: calificación de los mini-quiz de la Academia
-- =========================================================
alter table public.progreso_usuario
    -- ids de lección cuyo mini-quiz se acertó (fuente de verdad de la nota).
    -- Se fusiona por UNIÓN entre dispositivos: acertar acredita la lección y un
    -- fallo posterior no la retira ("mejor intento gana").
    add column if not exists academia_aciertos jsonb   default '[]'::jsonb,
    -- nota derivada sobre 10 (aciertos / nº de lecciones con quiz * 10).
    -- Redundante pero barata: permite ordenar/filtrar sin desempacar el jsonb.
    add column if not exists academia_nota     numeric default 0;

-- Las políticas RLS existentes de progreso_usuario (dueño-únicamente por
-- auth.uid() = user_id) ya cubren estas columnas. No hace falta política nueva.
--
-- Nota: estos CHECK son solo defensa en profundidad (rango/tipo válidos); NO
-- validan que academia_nota corresponda realmente a academia_aciertos, porque
-- eso exigiría mover el banco de preguntas (hoy en js/quiz-data.js) al servidor.

alter table public.progreso_usuario drop constraint if exists progreso_usuario_academia_nota_check;
alter table public.progreso_usuario
    add constraint progreso_usuario_academia_nota_check check (academia_nota >= 0 and academia_nota <= 10);

alter table public.progreso_usuario drop constraint if exists progreso_usuario_academia_aciertos_check;
alter table public.progreso_usuario
    add constraint progreso_usuario_academia_aciertos_check check (jsonb_typeof(academia_aciertos) = 'array');

notify pgrst, 'reload schema';
