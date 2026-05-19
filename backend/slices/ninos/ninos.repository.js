const { query } = require('../../config/db');

function obtenerPorId(idNino) {
    return query(
        `SELECT id_nino, nombre, apellido, fecha_nacimiento,
                id_padre, id_salon, avatar_url, activo
         FROM ninos WHERE id_nino = $1`,
        [idNino]
    ).then(r => r[0] || null);
}

function hijosDelPadre(idPadre) {
    return query(
        `SELECT id_nino, nombre, apellido, fecha_nacimiento,
                id_salon, avatar_url
         FROM ninos
         WHERE id_padre = $1 AND activo = TRUE
         ORDER BY nombre`,
        [idPadre]
    );
}

function buscarPorUidTarjeta(uid) {
    return query(
        `SELECT t.id_tarjeta, t.uid, t.activa,
                n.id_nino, n.id_padre, n.id_salon, n.nombre, n.apellido
         FROM tarjetas_nfc t
         JOIN ninos n ON n.id_nino = t.id_nino
         WHERE t.uid = $1
         LIMIT 1`,
        [uid]
    ).then(r => r[0] || null);
}

/**
 *  Listado para administración: incluye datos del padre y si ya
 *  tiene tarjeta NFC asignada. Incluye inactivos a menos que se pida lo contrario.
 */
function listarPorSalon(idSalon, { soloActivos = false } = {}) {
    const filtroActivo = soloActivos ? 'AND n.activo = TRUE' : '';
    return query(
        `SELECT n.id_nino, n.nombre, n.apellido, n.fecha_nacimiento,
                n.id_padre, n.id_salon, n.avatar_url, n.activo,
                p.nombre   AS nombre_padre,
                p.apellido AS apellido_padre,
                p.correo   AS correo_padre,
                p.telefono AS telefono_padre,
                (p.password_hash IS NOT NULL) AS padre_activado,
                EXISTS (SELECT 1 FROM tarjetas_nfc t WHERE t.id_nino = n.id_nino) AS tiene_tarjeta
         FROM ninos n
         JOIN padres p ON p.id_padre = n.id_padre
         WHERE n.id_salon = $1
           ${filtroActivo}
         ORDER BY n.apellido, n.nombre`,
        [idSalon]
    );
}

function desactivar(idNino) {
    return query(
        `UPDATE ninos SET activo = FALSE WHERE id_nino = $1 RETURNING id_nino`,
        [idNino]
    ).then(r => r[0] || null);
}

function crear({ nombre, apellido, fechaNacimiento, idPadre, idSalon, avatarUrl }) {
    return query(
        `INSERT INTO ninos (nombre, apellido, fecha_nacimiento, id_padre, id_salon, avatar_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id_nino, nombre, apellido, fecha_nacimiento, id_padre, id_salon, avatar_url, activo`,
        [nombre, apellido, fechaNacimiento || null, idPadre, idSalon, avatarUrl || null]
    ).then(r => r[0]);
}

function actualizar(idNino, { nombre, apellido, fechaNacimiento, idPadre, idSalon, avatarUrl, activo }) {
    return query(
        `UPDATE ninos SET
            nombre           = COALESCE($2,  nombre),
            apellido         = COALESCE($3,  apellido),
            fecha_nacimiento = COALESCE($4,  fecha_nacimiento),
            id_padre         = COALESCE($5,  id_padre),
            id_salon         = COALESCE($6,  id_salon),
            avatar_url       = COALESCE($7,  avatar_url),
            activo           = COALESCE($8,  activo)
         WHERE id_nino = $1
         RETURNING id_nino, nombre, apellido, fecha_nacimiento, id_padre, id_salon, avatar_url, activo`,
        [
            idNino,
            nombre   ?? null,
            apellido ?? null,
            fechaNacimiento ?? null,
            idPadre  ?? null,
            idSalon  ?? null,
            avatarUrl ?? null,
            typeof activo === 'boolean' ? activo : null,
        ]
    ).then(r => r[0] || null);
}

module.exports = {
    obtenerPorId,
    hijosDelPadre,
    buscarPorUidTarjeta,
    listarPorSalon,
    crear,
    actualizar,
    desactivar,
};
