/* =============================================================
 *  Repositorio del slice "directores".
 *  CRUD básico + helpers de activación (mismo patrón que padres).
 * ============================================================= */
const { query } = require('../../config/db');

function obtenerPorId(idDirector) {
    return query(
        `SELECT id_director, nombre, apellido, correo, activo, fecha_creacion,
                (password_hash IS NOT NULL) AS tiene_password
         FROM directores WHERE id_director = $1`,
        [idDirector]
    ).then(r => r[0] || null);
}

function obtenerPorCorreo(correo) {
    return query(
        `SELECT id_director, nombre, apellido, correo, activo, fecha_creacion,
                (password_hash IS NOT NULL) AS tiene_password
         FROM directores WHERE correo = $1 LIMIT 1`,
        [correo]
    ).then(r => r[0] || null);
}

function listar() {
    return query(
        `SELECT id_director, nombre, apellido, correo, activo, fecha_creacion,
                (password_hash IS NOT NULL) AS tiene_password
         FROM directores
         ORDER BY apellido, nombre`
    );
}

function crear({ nombre, apellido, correo, telefono, passwordHash, activacionToken, activacionExpira }) {
    return query(
        `INSERT INTO directores (nombre, apellido, correo,
                                 password_hash, activacion_token, activacion_expira)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id_director, nombre, apellido, correo, activo, fecha_creacion,
                   (password_hash IS NOT NULL) AS tiene_password`,
        [nombre, apellido, correo,
         passwordHash || null, activacionToken || null, activacionExpira || null]
    ).then(r => r[0]);
}

function actualizar(idDirector, { nombre, apellido, correo, activo }) {
    return query(
        `UPDATE directores
         SET nombre   = COALESCE($2, nombre),
             apellido = COALESCE($3, apellido),
             correo   = COALESCE($4, correo),
             activo   = COALESCE($5, activo)
         WHERE id_director = $1
         RETURNING id_director, nombre, apellido, correo, activo, fecha_creacion,
                   (password_hash IS NOT NULL) AS tiene_password`,
        [
            idDirector,
            nombre   ?? null,
            apellido ?? null,
            correo   ?? null,
            typeof activo === 'boolean' ? activo : null,
        ]
    ).then(r => r[0] || null);
}

function desactivar(idDirector) {
    return query(
        `UPDATE directores SET activo = FALSE WHERE id_director = $1 RETURNING id_director`,
        [idDirector]
    ).then(r => r[0] || null);
}

// ─── activación / reset password ─────────────────────────────
function guardarTokenReset(idDirector, token, expira) {
    return query(
        `UPDATE directores
         SET password_hash      = NULL,
             activacion_token   = $2,
             activacion_expira  = $3
         WHERE id_director = $1
         RETURNING id_director, correo, nombre, apellido`,
        [idDirector, token, expira]
    ).then(r => r[0] || null);
}

function buscarPorActivacionToken(token) {
    return query(
        `SELECT id_director, nombre, apellido, correo, activacion_expira
         FROM directores
         WHERE activacion_token = $1 AND activo = TRUE
         LIMIT 1`,
        [token]
    ).then(r => r[0] || null);
}

function establecerPassword(idDirector, passwordHash) {
    return query(
        `UPDATE directores
         SET password_hash     = $2,
             activacion_token  = NULL,
             activacion_expira = NULL
         WHERE id_director = $1
         RETURNING id_director, correo, nombre, apellido`,
        [idDirector, passwordHash]
    ).then(r => r[0] || null);
}

module.exports = {
    obtenerPorId,
    obtenerPorCorreo,
    listar,
    crear,
    actualizar,
    desactivar,
    guardarTokenReset,
    buscarPorActivacionToken,
    establecerPassword,
};
