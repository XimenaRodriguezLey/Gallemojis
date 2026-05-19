/* =============================================================
 *  Slice mensajes
 *
 *  Reglas de negocio:
 *    · Solo el MAESTRO envía mensajes. El padre solo lee.
 *    · Tanto maestro como padre pueden listar su propio hilo.
 *    · El padre puede marcar como leídos los mensajes que recibió.
 * ============================================================= */
const repo            = require('./mensajes.repository');
const salonesService  = require('../salones/salones.service');
const padresService   = require('../padres/padres.service');

function listarDelPadre(idPadre) {
    return repo.listarDelPadre(idPadre);
}

function listarHilo(idMaestro, idPadre) {
    return repo.listarHilo(idMaestro, idPadre);
}

/**
 *  Padres con los que la maestra puede mensajearse: los padres
 *  de los niños de sus salones, con conteo de no leídos por hilo.
 */
async function padresDelMaestro(idMaestro) {
    return repo.padresDelMaestro(idMaestro);
}

/**
 *  Solo el maestro envía. Verifica además que el padre destinatario
 *  tenga al menos un hijo en alguno de los salones del maestro.
 */
async function enviar({ user, idPadre, contenido }) {
    if (user.rol !== 'maestro') {
        const err = new Error('Los padres solo pueden leer mensajes, no enviarlos');
        err.status = 403; throw err;
    }
    if (!idPadre) {
        const err = new Error('id_padre requerido'); err.status = 400; throw err;
    }
    if (!contenido || !contenido.trim()) {
        const err = new Error('El mensaje no puede estar vacío'); err.status = 400; throw err;
    }

    // El maestro solo puede mensajear a padres con hijos en sus salones.
    const autorizado = await repo.padreEnSalonesDelMaestro(user.userId, idPadre);
    if (!autorizado) {
        const err = new Error('Ese padre no tiene hijos en tus salones'); err.status = 403;
        throw err;
    }
    // Confirmar que el padre exista (defensa adicional)
    const padre = await padresService.obtenerPorId(idPadre);
    if (!padre) {
        const err = new Error('Padre no encontrado'); err.status = 404; throw err;
    }

    return repo.crear({
        idMaestro: user.userId,
        idPadre,
        remitente: 'maestro',
        contenido: contenido.trim(),
    });
}

/**
 *  El padre marca como leído TODO el hilo con un maestro
 *  (o todos los mensajes que recibió, si no se especifica maestro).
 */
async function marcarHiloLeidoPorPadre(idPadre, idMaestro = null) {
    return repo.marcarHiloLeido({ idPadre, idMaestro });
}

module.exports = {
    listarDelPadre,
    listarHilo,
    enviar,
    padresDelMaestro,
    marcarHiloLeidoPorPadre,
};
