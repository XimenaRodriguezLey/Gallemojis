const router = require('express').Router();
const { requireAuth } = require('../../middlewares/auth');
const ctrl = require('./auth.controller');

router.post('/login',                  ctrl.login);
router.post('/establecer-password',    ctrl.establecerPassword);
router.post('/recuperar-password',     requireAuth, ctrl.recuperarPassword);

module.exports = router;
