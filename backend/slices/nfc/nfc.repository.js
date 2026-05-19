/* =============================================================
 *  Repositorio del slice NFC
 *  Acceso a las tablas: tarjetas_nfc (CRUD) y modulos (lectura).
 *
 *  Nota: el "último UID leído" no vive en disco; se mantiene en
 *  memoria del proceso para que el form de registro pueda
 *  auto-rellenar el campo después de un tap.
 * ============================================================= */
const { query } = require('../../config/db');

// ─── memoria volátil para captura asistida ────────────────────
let ultimoUidLeido = null; // { uid, fecha, registrada }

function setUltimoUid(uid, registrada) {
    ultimoUidLeido = {
        uid,
        fecha: new Date().toISOString(),
        registrada: !!registrada,
    };
}

function getUltimoUid() {
    return ultimoUidLeido;
}

// ─── tarjetas_nfc ─────────────────────────────────────────────
function listar({ idSalon } = {}) {
    if (idSalon) {
        return query(
            `SELECT t.id_tarjeta, t.uid, t.activa, t.fecha_asignacion,
                    n.id_nino, n.nombre AS nombre_nino, n.apellido AS apellido_nino,
                    n.id_salon
             FROM tarjetas_nfc t
             JOIN ninos n ON n.id_nino = t.id_nino
             WHERE n.id_salon = $1
             ORDER BY n.apellido, n.nombre`,
            [idSalon]
        );
    }
    return query(
        `SELECT t.id_tarjeta, t.uid, t.activa, t.fecha_asignacion,
                n.id_nino, n.nombre AS nombre_nino, n.apellido AS apellido_nino,
                n.id_salon
         FROM tarjetas_nfc t
         JOIN ninos n ON n.id_nino = t.id_nino
         ORDER BY n.apellido, n.nombre`
    );
}

function obtenerPorId(idTarjeta) {
    return query(
        `SELECT t.id_tarjeta, t.uid, t.activa, t.fecha_asignacion,
                n.id_nino, n.id_salon, n.id_padre,
                n.nombre AS nombre_nino, n.apellido AS apellido_nino
         FROM tarjetas_nfc t
         JOIN ninos n ON n.id_nino = t.id_nino
         WHERE t.id_tarjeta = $1`,
        [idTarjeta]
    ).then(r => r[0] || null);
}

function buscarPorUid(uid) {
    return query(
        `SELECT t.id_tarjeta, t.uid, t.activa, t.fecha_asignacion,
                n.id_nino, n.id_salon, n.id_padre,
                n.nombre AS nombre_nino, n.apellido AS apellido_nino
         FROM tarjetas_nfc t
         JOIN ninos n ON n.id_nino = t.id_nino
         WHERE t.uid = $1
         LIMIT 1`,
        [uid]
    ).then(r => r[0] || null);
}

/**
 *  Crea o reasigna la tarjeta de un niño.
 *  Como tarjetas_nfc.id_nino es UNIQUE, si el niño ya tenía una
 *  tarjeta se actualiza el uid en lugar de fallar.
 */
function crear({ uid, idNino, activa = true }) {
    return query(
        `INSERT INTO tarjetas_nfc (uid, id_nino, activa)
         VALUES ($1, $2, $3)
         ON CONFLICT (id_nino) DO UPDATE
             SET uid = EXCLUDED.uid,
                 activa = EXCLUDED.activa,
                 fecha_asignacion = NOW()
         RETURNING id_tarjeta, uid, activa, fecha_asignacion, id_nino`,
        [uid, idNino, activa]
    ).then(r => r[0]);
}

function actualizar(idTarjeta, { uid, activa }) {
    return query(
        `UPDATE tarjetas_nfc
         SET uid    = COALESCE($2, uid),
             activa = COALESCE($3, activa)
         WHERE id_tarjeta = $1
         RETURNING id_tarjeta, uid, activa, fecha_asignacion, id_nino`,
        [idTarjeta, uid ?? null, typeof activa === 'boolean' ? activa : null]
    ).then(r => r[0] || null);
}

function eliminar(idTarjeta) {
    return query(
        `DELETE FROM tarjetas_nfc WHERE id_tarjeta = $1 RETURNING id_tarjeta`,
        [idTarjeta]
    ).then(r => r[0] || null);
}

module.exports = {
    listar,
    obtenerPorId,
    buscarPorUid,
    crear,
    actualizar,
    eliminar,
    setUltimoUid,
    getUltimoUid,
};
