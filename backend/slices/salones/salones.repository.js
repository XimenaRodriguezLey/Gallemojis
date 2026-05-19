const { query } = require('../../config/db');

function listarPorMaestro(idMaestro) {
    return query(
        `SELECT id_salon, nombre, grado, activo
         FROM salones
         WHERE id_maestro = $1 AND activo = TRUE
         ORDER BY nombre`,
        [idMaestro]
    );
}

/** Listado global con datos del maestro y conteo de niños activos. */
function listarTodos({ soloActivos = false } = {}) {
    const filtro = soloActivos ? 'WHERE s.activo = TRUE' : '';
    return query(
        `SELECT s.id_salon, s.nombre, s.grado, s.activo, s.id_maestro,
                m.nombre   AS nombre_maestro,
                m.apellido AS apellido_maestro,
                m.correo   AS correo_maestro,
                COALESCE((SELECT COUNT(*) FROM ninos n WHERE n.id_salon = s.id_salon AND n.activo = TRUE), 0)::int AS ninos
         FROM salones s
         JOIN maestros m ON m.id_maestro = s.id_maestro
         ${filtro}
         ORDER BY s.nombre`
    );
}

function obtenerPorId(idSalon) {
    return query(
        `SELECT id_salon, nombre, grado, id_maestro, activo
         FROM salones WHERE id_salon = $1`,
        [idSalon]
    ).then(r => r[0] || null);
}

function ninosDelSalon(idSalon) {
    return query(
        `SELECT n.id_nino, n.nombre, n.apellido, n.fecha_nacimiento,
                n.id_padre, n.avatar_url
         FROM ninos n
         WHERE n.id_salon = $1 AND n.activo = TRUE
         ORDER BY n.apellido, n.nombre`,
        [idSalon]
    );
}

function crear({ nombre, grado, idMaestro }) {
    return query(
        `INSERT INTO salones (nombre, grado, id_maestro)
         VALUES ($1, $2, $3)
         RETURNING id_salon, nombre, grado, id_maestro, activo`,
        [nombre, grado, idMaestro]
    ).then(r => r[0]);
}

function actualizar(idSalon, { nombre, grado, idMaestro, activo }) {
    return query(
        `UPDATE salones
         SET nombre     = COALESCE($2, nombre),
             grado      = COALESCE($3, grado),
             id_maestro = COALESCE($4, id_maestro),
             activo     = COALESCE($5, activo)
         WHERE id_salon = $1
         RETURNING id_salon, nombre, grado, id_maestro, activo`,
        [
            idSalon,
            nombre   ?? null,
            grado    ?? null,
            idMaestro ?? null,
            typeof activo === 'boolean' ? activo : null,
        ]
    ).then(r => r[0] || null);
}

function desactivar(idSalon) {
    return query(
        `UPDATE salones SET activo = FALSE WHERE id_salon = $1 RETURNING id_salon`,
        [idSalon]
    ).then(r => r[0] || null);
}

module.exports = {
    listarPorMaestro,
    listarTodos,
    obtenerPorId,
    ninosDelSalon,
    crear,
    actualizar,
    desactivar,
};
