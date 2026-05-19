-- ============================================================
--  Migración 003 — Directores + activación para maestros
--
--  Cambios:
--    · Nueva tabla `directores` (login propio, gestiona todo).
--    · `maestros` ahora admite password_hash NULL y agrega
--      activacion_token / activacion_expira, para que el director
--      pueda reiniciar contraseñas con el mismo flujo del padre.
--
--  Uso:
--    psql gallemojis -f backend/db/migrations/003_directores.sql
--
--  Después: crea el primer director con un INSERT manual (al final
--  de este archivo está el ejemplo comentado — el hash es de
--  'director123' generado con bcryptjs cost 10).
-- ============================================================

-- ─── directores ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS directores (
    id_director         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre              VARCHAR(100)    NOT NULL,
    apellido            VARCHAR(100)    NOT NULL,
    correo              VARCHAR(255)    NOT NULL UNIQUE,
    password_hash       TEXT,
    activacion_token    TEXT,
    activacion_expira   TIMESTAMPTZ,
    activo              BOOLEAN         NOT NULL DEFAULT TRUE,
    fecha_creacion      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    ultimo_login        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_directores_activacion_token
    ON directores (activacion_token)
    WHERE activacion_token IS NOT NULL;

-- ─── maestros: permitir reset de contraseña ─────────────────
ALTER TABLE maestros
    ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE maestros
    ADD COLUMN IF NOT EXISTS activacion_token   TEXT,
    ADD COLUMN IF NOT EXISTS activacion_expira  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_maestros_activacion_token
    ON maestros (activacion_token)
    WHERE activacion_token IS NOT NULL;

-- ─── Bootstrap del primer director (descomenta y ajusta) ────
-- Hash bcrypt de 'director123':
--   $2a$10$Y0p2N0e9z4Yk9Yj0Q5y3FOdv8K9Jc8QkqA0vM/3eXYJL0NwGc3yYa
--
-- Si prefieres otra contraseña, genera el hash desde Node:
--   node -e "console.log(require('bcryptjs').hashSync('TU_PASSWORD', 10))"
--
-- INSERT INTO directores (nombre, apellido, correo, password_hash)
-- VALUES ('Admin', 'Principal', 'director@gallemojis.test',
--         '$2a$10$Y0p2N0e9z4Yk9Yj0Q5y3FOdv8K9Jc8QkqA0vM/3eXYJL0NwGc3yYa');
