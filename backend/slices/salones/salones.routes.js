const router = require('express').Router();
const { requireAuth, requireRol } = require('../../middlewares/auth');
const ctrl = require('./salones.controller');

// Endpoints del maestro autenticado
router.get('/:id/ninos',     requireAuth, requireRol('maestro'),  ctrl.ninosDelSalon);
router.get('/:id/historial', requireAuth, requireRol('maestro'),  ctrl.historialSalon);

// CRUD global — solo director
router.get('/',              requireAuth, requireRol('director'), ctrl.listarTodos);
router.post('/',             requireAuth, requireRol('director'), ctrl.crear);
router.patch('/:id',         requireAuth, requireRol('director'), ctrl.actualizar);
router.delete('/:id',        requireAuth, requireRol('director'), ctrl.desactivar);

module.exports = router;
