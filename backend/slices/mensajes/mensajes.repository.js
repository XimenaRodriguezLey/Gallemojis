const { query } = require('../../config/db');

/**
 *  Mensajes del padre, con el nombre del maestro para mostrarlo en
 *  notifications.html. ORDEN DESC: lo más reciente arriba.
 */
function listarDelPadre(idPadre) {
    return query(
        `SELECT m.id_mensaje, m.id_maestro, m.id_padre,
                m.remitente, m.contenido, m.leido, m.fecha_envio,
                ma.nombre   AS nombre_maestro,
                ma.apellido AS apellido_maestro
         FROM mensajes m
         JOIN maestros ma ON ma.id_maestro = m.id_maestro
         WHERE m.id_padre = $1
         ORDER BY m.fecha_envio DESC
         LIMIT 200`,
        [idPadre]
    );
}

/**
 *  Hilo completo entre un maestro y un padre. ASC para chat.
 */
function listarHilo(idMaestro, idPadre) {
    return query(
        `SELECT id_mensaje, remitente, contenido, leido, fecha_envio
         FROM mensajes
         WHERE id_maestro = $1 AND id_padre = $2
         ORDER BY fecha_envio ASC`,
        [idMaestro, idPadre]
    );
}

function crear({ idMaestro, idPadre, remitente, contenido }) {
    return query(
        `INSERT INTO mensajes (id_maestro, id_padre, remitente, contenido)
         VALUES ($1, $2, $3, $4)
         RETURNING id_mensaje, fecha_envio, remitente, contenido, leido`,
        [idMaestro, idPadre, remitente, contenido]
    ).then(r => r[0]);
}

/**
 *  Padres a los que un maestro puede mensajearse: cualquier padre con
 *  hijos en algún salón del maestro. Trae:
 *    · datos del padre
 *    · nombre del último mensaje y fecha (si lo hay)
 *    · conteo de mensajes que el padre aún no marca como leído
 */
function padresDelMaestro(idMaestro) {
    return query(
        `WITH padres_del_maestro AS (
            SELECT DISTINCT p.id_padre, p.nombre, p.apellido, p.correo
            FROM padres p
            JOIN ninos   n ON n.id_padre  = p.id_padre AND n.activo = TRUE
            JOIN salones s ON s.id_salon  = n.id_salon AND s.activo = TRUE
            WHERE s.id_maestro = $1
         )
         SELECT pdm.id_padre, pdm.nombre, pdm.apellido, pdm.correo,
                ult.contenido          AS ultimo_contenido,
                ult.fecha_envio        AS ultimo_fecha,
                ult.remitente          AS ultimo_remitente,
                COALESCE(nl.cnt, 0)::int AS no_leidos_por_padre,
                COALESCE(total.cnt, 0)::int AS total_mensajes
         FROM padres_del_maestro pdm
         LEFT JOIN LATERAL (
            SELECT contenido, fecha_envio, remitente
            FROM mensajes
            WHERE id_maestro = $1 AND id_padre = pdm.id_padre
            ORDER BY fecha_envio DESC
            LIMIT 1
         ) ult ON TRUE
         LEFT JOIN LATERAL (
            SELECT COUNT(*) AS cnt
            FROM mensajes
            WHERE id_maestro = $1 AND id_padre = pdm.id_padre
              AND remitente = 'maestro' AND leido = FALSE
         ) nl ON TRUE
         LEFT JOIN LATERAL (
            SELECT COUNT(*) AS cnt
            FROM mensajes
            WHERE id_maestro = $1 AND id_padre = pdm.id_padre
         ) total ON TRUE
         ORDER BY ult.fecha_envio DESC NULLS LAST, pdm.apellido, pdm.nombre`,
        [idMaestro]
    );
}

/**
 *  ¿El padre tiene al menos un hijo en algún salón del maestro?
 *  Se usa al enviar un mensaje para evitar que un maestro le escriba a
 *  un padre que no le corresponde.
 */
function padreEnSalonesDelMaestro(idMaestro, idPadre) {
    return query(
        `SELECT 1
         FROM ninos n
         JOIN salones s ON s.id_salon = n.id_salon
         WHERE n.id_padre  = $2
           AND s.id_maestro = $1
           AND n.activo    = TRUE
         LIMIT 1`,
        [idMaestro, idPadre]
    ).then(r => r.length > 0);
}

/**
 *  Marca como leídos los mensajes que el padre RECIBIÓ (remitente=maestro).
 *  Si se pasa idMaestro, solo ese hilo; si no, todos los hilos del padre.
 */
function marcarHiloLeido({ idPadre, idMaestro }) {
    const params = [idPadre];
    let sql = `UPDATE mensajes SET leido = TRUE
               WHERE id_padre = $1
                 AND remitente = 'maestro'
                 AND leido = FALSE`;
    if (idMaestro) {
        params.push(idMaestro);
        sql += ` AND id_maestro = $2`;
    }
    sql += ` RETURNING id_mensaje`;
    return query(sql, params).then(r => ({ marcados: r.length }));
}

module.exports = {
    listarDelPadre,
    listarHilo,
    crear,
    padresDelMaestro,
    padreEnSalonesDelMaestro,
    marcarHiloLeido,
};
