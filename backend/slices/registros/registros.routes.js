const router = require('express').Router();
const { requireAuth } = require('../../middlewares/auth');
const ctrl = require('./registros.controller');

router.get('/', requireAuth, ctrl.listar);

module.exports = router;
