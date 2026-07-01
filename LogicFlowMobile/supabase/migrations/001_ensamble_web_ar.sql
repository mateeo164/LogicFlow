-- LogicFlow — Desbloqueo del Ensamble Real (AR) tras aprobar el Ensamble Web
-- Ejecutar UNA vez en el editor SQL de Supabase (proyecto kgyhbimpwwtnkiozymyr).
-- Agrega el rastro de la NOTA del ensamble web (gate) y un progreso AR separado.

alter table public.progreso_usuario
  -- Ensamble WEB (SimuladorPC): nota 0-10 y bandera de aprobado (nota >= 7)
  add column if not exists ensamble_web_nota          numeric(4,2),
  add column if not exists ensamble_web_aprobado       boolean     not null default false,
  add column if not exists ensamble_web_completado_at  timestamptz,
  -- Ensamble REAL con AR (app móvil): progreso propio, separado del web/virtual
  add column if not exists ensamble_real_instalados    text[]      not null default '{}',
  add column if not exists ensamble_real_completado_at timestamptz;

-- Las políticas RLS existentes de la tabla aplican tal cual a las columnas nuevas.
-- No se requieren policies adicionales.
