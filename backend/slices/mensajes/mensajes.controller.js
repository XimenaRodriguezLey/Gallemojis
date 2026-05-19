const service = require('./mensajes.service');

// ─── Solo maestro envía ──────────────────────────────────────
async function enviar(req, res, next) {
    try {
        const { id_padre, contenido } = req.body || {};
        const msg = await service.enviar({
            user: req.user,
            idPadre: id_padre,
            contenido,
        });
        res.status(201).json(msg);
    } catch (err) { next(err); }
}

// ─── Hilo entre maestro y padre ─────────────────────────────
async function hilo(req, res, next) {
    try {
        const { maestro, padre } = req.query;
        if (!maestro || !padre) {
            return res.status(400).json({ error: '?maestro=...&padre=... son requeridos' });
        }
        // Solo los participantes pueden leer el hilo
        if (
            (req.user.rol === 'maestro' && req.user.userId !== maestro) ||
            (req.user.rol === 'padre'   && req.user.userId !== padre)
        ) {
            return res.status(403).json({ error: 'No participas en este hilo' });
        }
        const mensajes = await service.listarHilo(maestro, padre);
        res.json(mensajes);
    } catch (err) { next(err); }
}

// ─── El padre marca como leídos los mensajes que recibió ────
async function marcarLeidos(req, res, next) {
    try {
        if (req.user.rol !== 'padre') {
            return res.status(403).json({ error: 'Solo el padre marca sus propios mensajes' });
        }
        const idMaestro = req.query.maestro || null;
        const out = await service.marcarHiloLeidoPorPadre(req.user.userId, idMaestro);
        res.json(out);
    } catch (err) { next(err); }
}

module.exports = { enviar, hilo, marcarLeidos };
