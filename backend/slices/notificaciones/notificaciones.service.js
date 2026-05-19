const repo = require('./notificaciones.repository');

function listarDelPadre(idPadre, soloNoLeidas) {
    return repo.listarDelPadre(idPadre, soloNoLeidas);
}

async function marcarLeida(idNotif, idPadre) {
    const n = await repo.obtenerPorId(idNotif);
    if (!n) {
        const err = new Error('Notificación no encontrada'); err.status = 404; throw err;
    }
    if (n.id_padre !== idPadre) {
        const err = new Error('No es tu notificación'); err.status = 403; throw err;
    }
    return repo.marcarLeida(idNotif);
}

function crear(payload) {
    return repo.crear(payload);
}

module.exports = { listarDelPadre, marcarLeida, crear };
