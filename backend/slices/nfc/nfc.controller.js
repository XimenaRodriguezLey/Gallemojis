const service = require('./nfc.service');

// ─── tap del módulo PN532 ─────────────────────────────────────
async function tap(req, res, next) {
    try {
        const { uid, emocion } = req.body || {};
        const result = await service.registrarTap({ uid, emocion });
        res.status(201).json(result);
    } catch (err) { next(err); }
}

// ─── CRUD de tarjetas (maestro) ───────────────────────────────
async function listarTarjetas(req, res, next) {
    try {
        const idSalon = req.query.salon || null;
        const tarjetas = await service.listarTarjetasDeMaestro(req.user.userId, { idSalon });
        res.json(tarjetas);
    } catch (err) { next(err); }
}

async function registrarTarjeta(req, res, next) {
    try {
        const { uid, idNino, activa } = req.body || {};
        const t = await service.registrarTarjeta(req.user.userId, { uid, idNino, activa });
        res.status(201).json(t);
    } catch (err) { next(err); }
}

async function actualizarTarjeta(req, res, next) {
    try {
        const { uid, activa } = req.body || {};
        const t = await service.actualizarTarjeta(req.user.userId, req.params.id, { uid, activa });
        res.json(t);
    } catch (err) { next(err); }
}

async function eliminarTarjeta(req, res, next) {
    try {
        await service.eliminarTarjeta(req.user.userId, req.params.id);
        res.status(204).end();
    } catch (err) { next(err); }
}

// ─── Captura asistida ─────────────────────────────────────────
function ultimoUid(req, res) {
    const ultimo = service.ultimoUidLeido();
    if (!ultimo) return res.json({ uid: null });
    res.json(ultimo);
}

module.exports = {
    tap,
    listarTarjetas,
    registrarTarjeta,
    actualizarTarjeta,
    eliminarTarjeta,
    ultimoUid,
};
