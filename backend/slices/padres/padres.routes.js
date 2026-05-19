const router = require('express').Router();
const { requireAuth, requireRol } = require('../../middlewares/auth');
const ctrl = require('./padres.controller');

// Endpoints del padre autenticado
router.get('/me/hijos',          requireAuth, requireRol('padre'),               ctrl.misHijos);
router.get('/me/notificaciones', requireAuth, requireRol('padre'),               ctrl.misNotificaciones);
router.get('/me/mensajes',       requireAuth, requireRol('padre'),               ctrl.misMensajes);

// Búsqueda por correo (maestro o director) | listado total (director)
router.get('/',                  requireAuth, requireRol('maestro', 'director'), ctrl.indice);

// Alta directa (maestro o director — el flujo orquestado vive en /api/ninos/registrar)
router.post('/',                 requireAuth, requireRol('maestro', 'director'), ctrl.crear);

module.exports = router;
