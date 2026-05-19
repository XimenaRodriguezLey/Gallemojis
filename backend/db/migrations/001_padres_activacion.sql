-- ============================================================
--  Migración 001 — Activación de cuentas de padres
--  Aplicar sobre una base existente con el schema_nfc_escolar.sql
--  ya cargado.
--
--  Cambios:
--    · password_hash en padres pasa de NOT NULL a NULL (un padre
--      recién dado de alta por la maestra aún no tiene password).
--    · Se agregan activacion_token (UUID corto) y activacion_expira
--      (caducidad del token).
--
--  Uso:
--    psql gallemojis -f backend/db/migrations/001_padres_activacion.sql
-- ============================================================

ALTER TABLE padres
    ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE padres
    ADD COLUMN IF NOT EXISTS activacion_token   TEXT,
    ADD COLUMN IF NOT EXISTS activacion_expira  TIMESTAMPTZ;

-- Búsqueda rápida del token al activar la cuenta.
CREATE INDEX IF NOT EXISTS idx_padres_activacion_token
    ON padres (activacion_token)
    WHERE activacion_token IS NOT NULL;
