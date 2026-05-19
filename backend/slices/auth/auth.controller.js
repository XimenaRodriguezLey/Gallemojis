const service = require('./auth.service');

async function login(req, res, next) {
    try {
        const { correo, password } = req.body || {};
        const data = await service.login(correo, password);
        res.json(data);
    } catch (err) { next(err); }
}

async function establecerPassword(req, res, next) {
    try {
        const { token, password } = req.body || {};
        const data = await service.establecerPassword({ token, password });
        res.json(data);
    } catch (err) { next(err); }
}

/** Solo el director: reset password de un maestro o padre. */
async function recuperarPassword(req, res, next) {
    try {
        if (req.user.rol !== 'director') {
            return res.status(403).json({ error: 'Solo el director puede reiniciar contraseñas' });
        }
        const { rol, idObjetivo } = req.body || {};
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const out = await service.recuperarPassword({ rol, idObjetivo, baseUrl });
        res.json(out);
    } catch (err) { next(err); }
}

module.exports = { login, establecerPassword, recuperarPassword };
