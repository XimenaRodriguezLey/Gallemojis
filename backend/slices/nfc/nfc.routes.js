/* =============================================================
 *  Rutas del slice NFC
 *    · /tap                   → solo módulos (API key)
 *    · /tarjetas (CRUD)       → solo maestros (JWT)
 *    · /ultimo-uid            → solo maestros (JWT)
 * ============================================================= */
const router = require('express').Router();
const { requireAuth, requireRol, requireModuleKey } = require('../../middlewares/auth');
const ctrl = require('./nfc.controller');

// Lectura desde los módulos PN532
router.post('/tap', requireModuleKey, ctrl.tap);

// CRUD de tarjetas — solo maestro
router.get('/tarjetas',           requireAuth, requireRol('maestro'), ctrl.listarTarjetas);
router.post('/tarjetas',          requireAuth, requireRol('maestro'), ctrl.registrarTarjeta);
router.patch('/tarjetas/:id',     requireAuth, requireRol('maestro'), ctrl.actualizarTarjeta);
router.delete('/tarjetas/:id',    requireAuth, requireRol('maestro'), ctrl.eliminarTarjeta);

// Último UID leído por cualquier módulo (para auto-rellenar el form)
router.get('/ultimo-uid',         requireAuth, requireRol('maestro'), ctrl.ultimoUid);

module.exports = router;
