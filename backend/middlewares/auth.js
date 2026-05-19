/* =============================================================
 *  Middleware de autenticación JWT.
 *  Pone en req.user → { userId, rol, nombre, correo }
 * ============================================================= */
const { verificar } = require('../config/jwt');

function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const [, token] = header.split(' ');
    if (!token) {
        return res.status(401).json({ error: 'Falta token de autenticación' });
    }
    try {
        req.user = verificar(token);
        next();
    } catch (_) {
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

function requireRol(...roles) {
    return function (req, res, next) {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({ error: 'Acceso denegado para este rol' });
        }
        next();
    };
}

// Para los módulos PN532 — autenticación por API key compartida.
function requireModuleKey(req, res, next) {
    const expected = process.env.MODULE_API_KEY;
    const sent     = req.headers['x-module-key'];
    if (!expected) {
        return res.status(500).json({ error: 'MODULE_API_KEY no configurada' });
    }
    if (sent !== expected) {
        return res.status(401).json({ error: 'API key inválida' });
    }
    next();
}

module.exports = { requireAuth, requireRol, requireModuleKey };
