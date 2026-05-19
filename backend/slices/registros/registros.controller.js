const service        = require('./registros.service');
const ninosService   = require('../ninos/ninos.service');

/**
 *  Endpoint genérico — útil para depurar / construir reportes:
 *  GET /api/registros?nino=...&salon=...&limit=...
 */
async function listar(req, res, next) {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
        if (req.query.nino) {
            await ninosService.verificarAcceso(req.user, req.query.nino);
            return res.json(await service.historialPorNino(req.query.nino, limit));
        }
        if (req.query.salon) {
            // por simplicidad: solo maestros pueden consultar salones
            if (req.user.rol !== 'maestro') {
                return res.status(403).json({ error: 'Solo el maestro puede ver el salón completo' });
            }
            return res.json(await service.historialPorSalon(req.query.salon, limit));
        }
        return res.status(400).json({ error: 'Indica ?nino=... o ?salon=...' });
    } catch (err) { next(err); }
}

module.exports = { listar };
