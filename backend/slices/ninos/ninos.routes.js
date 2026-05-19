const router = require('express').Router();
const { requireAuth, requireRol } = require('../../middlewares/auth');
const ctrl = require('./ninos.controller');

// Historial: maestro, padre con acceso, o director
router.get('/:id/historial',          requireAuth,                                  ctrl.historialNino);

// Listado global (director)
router.get('/',                       requireAuth, requireRol('director'),          ctrl.listarTodos);

// Listado por salón (maestro)
router.get('/por-salon/:idSalon',     requireAuth, requireRol('maestro'),           ctrl.listarPorSalon);

// Alta orquestada: alumno + padre (maestro)
router.post('/registrar',             requireAuth, requireRol('maestro'),           ctrl.registrarAlumno);

// CRUD básico: maestro o director
router.post('/',                      requireAuth, requireRol('maestro'),           ctrl.crearNino);
router.patch('/:id',                  requireAuth, requireRol('maestro', 'director'), ctrl.actualizarNino);
router.delete('/:id',                 requireAuth, requireRol('maestro', 'director'), ctrl.desactivarNino);

module.exports = router;
