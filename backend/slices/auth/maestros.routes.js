/* =============================================================
 *  /api/maestros/me/...
 *  Endpoints específicos del maestro autenticado.
 * ============================================================= */
const router = require('express').Router();
const { requireAuth, requireRol } = require('../../middlewares/auth');
const salonesService  = require('../salones/salones.service');
const mensajesService = require('../mensajes/mensajes.service');

router.get(
    '/me/salones',
    requireAuth, requireRol('maestro'),
    async (req, res, next) => {
        try {
            const salones = await salonesService.listarPorMaestro(req.user.userId);
            res.json(salones);
        } catch (err) { next(err); }
    }
);

// Padres a los que el maestro puede mensajearse (padres de niños de sus salones).
// Incluye conteo de no-leídos por hilo.
router.get(
    '/me/padres',
    requireAuth, requireRol('maestro'),
    async (req, res, next) => {
        try {
            const padres = await mensajesService.padresDelMaestro(req.user.userId);
            res.json(padres);
        } catch (err) { next(err); }
    }
);

module.exports = router;
