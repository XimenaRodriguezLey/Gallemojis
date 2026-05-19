-- ============================================================
--  Migración 002 — desduplica ninos
--
--  Si por alguna razón (correr seed.js varias veces, o doble click
--  en "Guardar" del form) terminaste con varios niños con el mismo
--  nombre, apellido y padre, esta migración deja activo solo el más
--  antiguo y desactiva el resto. No borra filas: conserva tarjetas
--  e historial emocional intactos.
--
--  Uso:
--    psql gallemojis -f backend/db/migrations/002_dedup_ninos.sql
-- ============================================================

WITH duplicados AS (
    SELECT id_nino,
           ROW_NUMBER() OVER (
               PARTITION BY nombre, apellido, id_padre, id_salon
               ORDER BY id_nino
           ) AS rn
    FROM ninos
    WHERE activo = TRUE
)
UPDATE ninos
SET activo = FALSE
WHERE id_nino IN (SELECT id_nino FROM duplicados WHERE rn > 1);

-- Informe rápido de lo que quedó
SELECT 'ninos activos por (nombre, padre)' AS reporte;
SELECT nombre, apellido, id_padre, COUNT(*) AS veces
FROM ninos
WHERE activo = TRUE
GROUP BY nombre, apellido, id_padre
ORDER BY veces DESC;
