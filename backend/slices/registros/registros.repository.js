const { query } = require('../../config/db');

/**
 *  Usa la vista v_historial_emocional (definida en el SQL base):
 *  contiene niño + emoción + timestamp + resultado.
 */
function historialPorNino(idNino, limit = 50) {
    return query(
        `SELECT id_registro, fecha_hora, id_nino, nombre_nino, apellido_nino,
                id_padre, id_salon, emocion, color_hex, icono, resultado
         FROM v_historial_emocional
         WHERE id_nino = $1
         ORDER BY fecha_hora DESC
         LIMIT $2`,
        [idNino, limit]
    );
}

function historialPorSalon(idSalon, limit = 50) {
    return query(
        `SELECT id_registro, fecha_hora, id_nino, nombre_nino, apellido_nino,
                id_padre, id_salon, emocion, color_hex, icono, resultado
         FROM v_historial_emocional
         WHERE id_salon = $1
         ORDER BY fecha_hora DESC
         LIMIT $2`,
        [idSalon, limit]
    );
}

function insertarRegistro({ idTarjeta, idModulo, resultado = 'ok' }) {
    return query(
        `INSERT INTO registros_emocionales (id_tarjeta, id_modulo, resultado)
         VALUES ($1, $2, $3)
         RETURNING id_registro, fecha_hora, resultado`,
        [idTarjeta, idModulo, resultado]
    ).then(r => r[0]);
}

function buscarModuloPorEmocion(emocion) {
    return query(
        `SELECT id_modulo, emocion, color_hex, icono
         FROM modulos WHERE emocion = $1 LIMIT 1`,
        [emocion]
    ).then(r => r[0] || null);
}

module.exports = {
    historialPorNino,
    historialPorSalon,
    insertarRegistro,
    buscarModuloPorEmocion,
};
