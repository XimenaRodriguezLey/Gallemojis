const service = require('./directores.service');

async function listar(req, res, next) {
    try {
        res.json(await service.listar());
    } catch (err) { next(err); }
}

async function crear(req, res, next) {
    try {
        const { nombre, apellido, correo, password } = req.body || {};
        const director = await service.crear({ nombre, apellido, correo, password });
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        if (director.activacion_token) {
            director.activacion_link = `${baseUrl}/activar.html?token=${director.activacion_token}`;
        }
        res.status(201).json(director);
    } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
    try {
        res.json(await service.actualizar(req.params.id, req.body || {}));
    } catch (err) { next(err); }
}

async function desactivar(req, res, next) {
    try {
        await service.desactivar(req.params.id);
        res.status(204).end();
    } catch (err) { next(err); }
}

async function resetPassword(req, res, next) {
    try {
        const { token, expira } = await service.resetPassword(req.params.id);
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        res.json({
            token, expira,
            link: `${baseUrl}/activar.html?token=${token}`,
        });
    } catch (err) { next(err); }
}

async function me(req, res, next) {
    try {
        const d = await service.obtenerPorId(req.user.userId);
        if (!d) return res.status(404).json({ error: 'Director no encontrado' });
        res.json(d);
    } catch (err) { next(err); }
}

module.exports = { listar, crear, actualizar, desactivar, resetPassword, me };
