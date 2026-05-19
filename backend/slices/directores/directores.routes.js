/* =============================================================
 *  /api/directores — todo requiere rol 'director'.
 * ============================================================= */
const router = require('express').Router();
const { requireAuth, requireRol } = require('../../middlewares/auth');
const ctrl = require('./directores.controller');

router.get('/me',              requireAuth, requireRol('director'), ctrl.me);

router.get('/',                requireAuth, requireRol('director'), ctrl.listar);
router.post('/',               requireAuth, requireRol('director'), ctrl.crear);
router.patch('/:id',           requireAuth, requireRol('director'), ctrl.actualizar);
router.delete('/:id',          requireAuth, requireRol('director'), ctrl.desactivar);
router.post('/:id/reset',      requireAuth, requireRol('director'), ctrl.resetPassword);

module.exports = router;
