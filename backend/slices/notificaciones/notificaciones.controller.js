const service = require('./notificaciones.service');

async function marcarLeida(req, res, next) {
    try {
        const n = await service.marcarLeida(req.params.id, req.user.userId);
        res.json(n);
    } catch (err) { next(err); }
}

module.exports = { marcarLeida };
