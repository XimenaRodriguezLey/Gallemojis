/* =============================================================
 *  Repositorio del slice "maestros".
 *  Lo usa el director para CRUD; el slice auth/ ya cubre el login.
 * ============================================================= */
const { query } = require('../../config/db');

function obtenerPorId(id) {
    return query(
        `SELECT m.id_maestro, m.nombre, m.apellido, m.correo, m.activo, m.fecha_creacion,
                (m.password_hash IS NOT NULL) AS tiene_password,
                COALESCE((SELECT COUNT(*) FROM salones s WHERE s.id_maestro = m.id_maestro AND s.activo = TRUE), 0)::int AS salones
         FROM maestros m WHERE m.id_maestro = $1`,
        [id]
    ).then(r => r[0] || null);
}

function obtenerPorCorreo(correo) {
    return query(
        `SELECT id_maestro, nombre, apellido, correo, activo, fecha_creacion,
                (password_hash IS NOT NULL) AS tiene_password
         FROM maestros WHERE correo = $1 LIMIT 1`,
        [correo]
    ).then(r => r[0] || null);
}

function listar({ soloActivos = false } = {}) {
    const filtro = soloActivos ? 'WHERE m.activo = TRUE' : '';
    return query(
        `SELECT m.id_maestro, m.nombre, m.apellido, m.correo, m.activo, m.fecha_creacion,
                (m.password_hash IS NOT NULL) AS tiene_password,
                COALESCE((SELECT COUNT(*) FROM salones s WHERE s.id_maestro = m.id_maestro AND s.activo = TRUE), 0)::int AS salones
         FROM maestros m
         ${filtro}
         ORDER BY m.apellido, m.nombre`
    );
}

function crear({ nombre, apellido, correo, passwordHash, activacionToken, activacionExpira }) {
    return query(
        `INSERT INTO maestros (nombre, apellido, correo,
                               password_hash, activacion_token, activacion_expira)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id_maestro, nombre, apellido, correo, activo, fecha_creacion,
                   (password_hash IS NOT NULL) AS tiene_password`,
        [nombre, apellido, correo,
         passwordHash || null, activacionToken || null, activacionExpira || null]
    ).then(r => r[0]);
}

function actualizar(idMaestro, { nombre, apellido, correo, activo }) {
    return query(
        `UPDATE maestros
         SET nombre   = COALESCE($2, nombre),
             apellido = COALESCE($3, apellido),
             correo   = COALESCE($4, correo),
             activo   = COALESCE($5, activo)
         WHERE id_maestro = $1
         RETURNING id_maestro, nombre, apellido, correo, activo, fecha_creacion,
                   (password_hash IS NOT NULL) AS tiene_password`,
        [
            idMaestro,
            nombre   ?? null,
            apellido ?? null,
            correo   ?? null,
            typeof activo === 'boolean' ? activo : null,
        ]
    ).then(r => r[0] || null);
}

function desactivar(idMaestro) {
    return query(
        `UPDATE maestros SET activo = FALSE WHERE id_maestro = $1 RETURNING id_maestro`,
        [idMaestro]
    ).then(r => r[0] || null);
}

module.exports = { obtenerPorId, obtenerPorCorreo, listar, crear, actualizar, desactivar };
