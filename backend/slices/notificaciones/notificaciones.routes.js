const router = require('express').Router();
const { requireAuth, requireRol } = require('../../middlewares/auth');
const ctrl = require('./notificaciones.controller');

router.patch('/:id/leida', requireAuth, requireRol('padre'), ctrl.marcarLeida);

module.exports = router;
