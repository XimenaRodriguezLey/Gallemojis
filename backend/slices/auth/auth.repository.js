/* =============================================================
 *  Acceso a datos del slice "auth".
 *  Maneja maestros y padres en consultas unificadas.
 * ============================================================= */
const { query } = require('../../config/db');

async function buscarMaestroPorCorreo(correo) {
    const rows = await query(
        `SELECT id_maestro AS id, nombre, apellido, correo, password_hash, activo
         FROM maestros WHERE correo = $1 LIMIT 1`,
        [correo]
    );
    return rows[0] || null;
}

async function buscarPadrePorCorreo(correo) {
    const rows = await query(
        `SELECT id_padre AS id, nombre, apellido, correo, password_hash, activo
         FROM padres WHERE correo = $1 LIMIT 1`,
        [correo]
    );
    return rows[0] || null;
}

async function buscarDirectorPorCorreo(correo) {
    const rows = await query(
        `SELECT id_director AS id, nombre, apellido, correo, password_hash, activo
         FROM directores WHERE correo = $1 LIMIT 1`,
        [correo]
    );
    return rows[0] || null;
}

async function tocarUltimoLoginDirector(idDirector) {
    await query(
        `UPDATE directores SET ultimo_login = NOW() WHERE id_director = $1`,
        [idDirector]
    );
}

// ─── Reset password — maestros ───────────────────────────────
async function guardarTokenResetMaestro(idMaestro, token, expira) {
    const rows = await query(
        `UPDATE maestros
         SET password_hash = NULL,
             activacion_token  = $2,
             activacion_expira = $3
         WHERE id_maestro = $1
         RETURNING id_maestro, correo, nombre, apellido`,
        [idMaestro, token, expira]
    );
    return rows[0] || null;
}

async function buscarMaestroPorActivacionToken(token) {
    const rows = await query(
        `SELECT id_maestro, nombre, apellido, correo, activacion_expira
         FROM maestros
         WHERE activacion_token = $1 AND activo = TRUE
         LIMIT 1`,
        [token]
    );
    return rows[0] || null;
}

async function establecerPasswordMaestro(idMaestro, passwordHash) {
    const rows = await query(
        `UPDATE maestros
         SET password_hash = $2,
             activacion_token  = NULL,
             activacion_expira = NULL
         WHERE id_maestro = $1
         RETURNING id_maestro, correo, nombre, apellido`,
        [idMaestro, passwordHash]
    );
    return rows[0] || null;
}

async function tocarUltimoLoginPadre(idPadre) {
    await query(
        `UPDATE padres SET ultimo_login = NOW() WHERE id_padre = $1`,
        [idPadre]
    );
}

module.exports = {
    buscarMaestroPorCorreo,
    buscarPadrePorCorreo,
    buscarDirectorPorCorreo,
    tocarUltimoLoginPadre,
    tocarUltimoLoginDirector,
    guardarTokenResetMaestro,
    buscarMaestroPorActivacionToken,
    establecerPasswordMaestro,
};
