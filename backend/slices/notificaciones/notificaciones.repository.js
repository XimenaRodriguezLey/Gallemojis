const { query } = require('../../config/db');

function listarDelPadre(idPadre, soloNoLeidas = false) {
    const filtroLeida = soloNoLeidas ? 'AND leida = FALSE' : '';
    return query(
        `SELECT id_notif, id_registro, id_padre, mensaje, enviada, leida, fecha
         FROM notificaciones_push
         WHERE id_padre = $1 ${filtroLeida}
         ORDER BY fecha DESC
         LIMIT 200`,
        [idPadre]
    );
}

function obtenerPorId(idNotif) {
    return query(
        `SELECT id_notif, id_padre, leida
         FROM notificaciones_push WHERE id_notif = $1`,
        [idNotif]
    ).then(r => r[0] || null);
}

function marcarLeida(idNotif) {
    return query(
        `UPDATE notificaciones_push SET leida = TRUE
         WHERE id_notif = $1 RETURNING id_notif, leida`,
        [idNotif]
    ).then(r => r[0]);
}

function crear({ idRegistro, idPadre, mensaje }) {
    return query(
        `INSERT INTO notificaciones_push (id_registro, id_padre, mensaje)
         VALUES ($1, $2, $3)
         RETURNING id_notif, fecha`,
        [idRegistro, idPadre, mensaje]
    ).then(r => r[0]);
}

module.exports = { listarDelPadre, obtenerPorId, marcarLeida, crear };
