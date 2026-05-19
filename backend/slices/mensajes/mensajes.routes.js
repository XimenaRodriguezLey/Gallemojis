const router = require('express').Router();
const { requireAuth, requireRol } = require('../../middlewares/auth');
const ctrl = require('./mensajes.controller');

// Cualquier participante autenticado puede leer su hilo
router.get('/',          requireAuth,                       ctrl.hilo);

// El maestro envía; el padre no puede (el service también lo refuerza)
router.post('/',         requireAuth, requireRol('maestro'), ctrl.enviar);

// El padre marca como leídos los mensajes que recibió (?maestro= opcional)
router.patch('/leido',   requireAuth, requireRol('padre'),   ctrl.marcarLeidos);

module.exports = router;
