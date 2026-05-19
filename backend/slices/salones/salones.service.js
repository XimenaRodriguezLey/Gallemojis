const repo = require('./salones.repository');

function listarPorMaestro(idMaestro) {
    return repo.listarPorMaestro(idMaestro);
}

function listarTodos(opts) {
    return repo.listarTodos(opts);
}

async function verificarAccesoMaestro(idMaestro, idSalon) {
    const salon = await repo.obtenerPorId(idSalon);
    if (!salon) {
        const err = new Error('Salón no encontrado'); err.status = 404; throw err;
    }
    if (salon.id_maestro !== idMaestro) {
        const err = new Error('No tienes acceso a este salón'); err.status = 403; throw err;
    }
    return salon;
}

async function ninosDelSalon(idMaestro, idSalon) {
    await verificarAccesoMaestro(idMaestro, idSalon);
    return repo.ninosDelSalon(idSalon);
}

// ─── CRUD del director ────────────────────────────────────────
async function crear({ nombre, grado, idMaestro }) {
    if (!nombre || !grado || !idMaestro) {
        const err = new Error('nombre, grado e idMaestro son obligatorios');
        err.status = 400; throw err;
    }
    return repo.crear({ nombre: nombre.trim(), grado: grado.trim(), idMaestro });
}

async function actualizar(idSalon, cambios) {
    const actual = await repo.obtenerPorId(idSalon);
    if (!actual) {
        const err = new Error('Salón no encontrado'); err.status = 404; throw err;
    }
    return repo.actualizar(idSalon, cambios);
}

async function desactivar(idSalon) {
    const actual = await repo.obtenerPorId(idSalon);
    if (!actual) {
        const err = new Error('Salón no encontrado'); err.status = 404; throw err;
    }
    return repo.desactivar(idSalon);
}

module.exports = {
    listarPorMaestro,
    listarTodos,
    ninosDelSalon,
    verificarAccesoMaestro,
    crear,
    actualizar,
    desactivar,
};
