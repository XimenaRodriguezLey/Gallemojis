/* =============================================================
 *  Firma y verificación de tokens JWT.
 * ============================================================= */
const jwt = require('jsonwebtoken');

const SECRET    = process.env.JWT_SECRET || 'dev-secret-cambiame';
const EXPIRES   = process.env.JWT_EXPIRES_IN || '12h';

function firmar(payload) {
    return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
}

function verificar(token) {
    return jwt.verify(token, SECRET);
}

module.exports = { firmar, verificar };
