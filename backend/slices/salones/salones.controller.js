const service          = require('./salones.service');
const registrosService = require('../registros/registros.service');

async function ninosDelSalon(req, res, next) {
    try {
        const ninos = await service.ninosDelSalon(req.user.userId, req.params.id);
        res.json(ninos);
    } catch (err) { next(err); }
}

async function historialSalon(req, res, next) {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
        await service.verificarAccesoMaestro(req.user.userId, req.params.id);
        const historial = await registrosService.historialPorSalon(req.params.id, limit);
        res.json(historial);
    } catch (err) { next(err); }
}

// ─── CRUD del director ────────────────────────────────────────
async function listarTodos(req, res, next) {
    try {
        const soloActivos = req.query.activos === 'true';
        res.json(await service.listarTodos({ soloActivos }));
    } catch (err) { next(err); }
}

async function crear(req, res, next) {
    try {
        const { nombre, grado, idMaestro } = req.body || {};
        res.status(201).json(await service.crear({ nombre, grado, idMaestro }));
    } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
    try { res.json(await service.actualizar(req.params.id, req.body || {})); }
    catch (err) { next(err); }
}

async function desactivar(req, res, next) {
    try {
        await service.desactivar(req.params.id);
        res.status(204).end();
    } catch (err) { next(err); }
}

module.exports = { ninosDelSalon, historialSalon, listarTodos, crear, actualizar, desactivar };
