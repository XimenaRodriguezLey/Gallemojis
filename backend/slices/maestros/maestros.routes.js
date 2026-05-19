/* =============================================================
 *  /api/maestros — CRUD por el director.
 *  El endpoint /me/* del maestro autenticado vive en auth/maestros.routes.js
 *  (montado bajo /api/maestros también; los paths no chocan).
 * ============================================================= */
const router = require('express').Router();
const { requireAuth, requireRol } = require('../../middlewares/auth');
const ctrl = require('./maestros.controller');

router.get('/',         requireAuth, requireRol('director'), ctrl.listar);
router.post('/',        requireAuth, requireRol('director'), ctrl.crear);
router.patch('/:id',    requireAuth, requireRol('director'), ctrl.actualizar);
router.delete('/:id',   requireAuth, requireRol('director'), ctrl.desactivar);

module.exports = router;
