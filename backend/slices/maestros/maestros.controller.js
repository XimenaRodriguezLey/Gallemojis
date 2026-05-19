const service = require('./maestros.service');

async function listar(req, res, next) {
    try {
        const soloActivos = req.query.activos === 'true';
        res.json(await service.listar({ soloActivos }));
    } catch (err) { next(err); }
}

async function crear(req, res, next) {
    try {
        const { nombre, apellido, correo, password } = req.body || {};
        const m = await service.crear({ nombre, apellido, correo, password });
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        if (m.activacion_token) {
            m.activacion_link = `${baseUrl}/activar.html?token=${m.activacion_token}`;
        }
        res.status(201).json(m);
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

module.exports = { listar, crear, actualizar, desactivar };
