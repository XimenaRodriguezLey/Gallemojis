/* =============================================================
 *  Lógica del slice "padres".
 *
 *  Dos modos de alta:
 *    1. Con password   → el padre queda activo de inmediato.
 *    2. Sin password   → se genera activacion_token; el padre lo
 *                         canjea por POST /api/auth/establecer-password.
 *
 *  buscarPorCorreo se usa desde alumnos.html para reusar el
 *  padre cuando ya existe (caso de hermanos).
 * ============================================================= */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const repo   = require('./padres.repository');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_DIAS = 14;

function obtenerPorId(idPadre) {
    return repo.obtenerPorId(idPadre);
}

function buscarPorCorreo(correo) {
    if (!correo) return Promise.resolve(null);
    return repo.obtenerPorCorreo(String(correo).trim().toLowerCase());
}

function _generarToken() {
    // 24 caracteres hex urlsafe → suficientemente único, fácil de copiar.
    return crypto.randomBytes(12).toString('hex');
}

function _expira() {
    const d = new Date();
    d.setDate(d.getDate() + TOKEN_TTL_DIAS);
    return d;
}

async function crear({ nombre, apellido, correo, telefono, password }) {
    if (!nombre || !apellido || !correo) {
        const err = new Error('nombre, apellido y correo son obligatorios');
        err.status = 400; throw err;
    }
    const correoNorm = String(correo).trim().toLowerCase();
    if (!EMAIL_RE.test(correoNorm)) {
        const err = new Error('Correo inválido'); err.status = 400; throw err;
    }

    const yaExiste = await repo.obtenerPorCorreo(correoNorm);
    if (yaExiste) {
        const err = new Error('Ya existe un padre con ese correo'); err.status = 409;
        err.padre = yaExiste; throw err;
    }

    // Modo 1: la maestra eligió poner password ella misma.
    if (password) {
        if (String(password).length < 6) {
            const err = new Error('La contraseña debe tener al menos 6 caracteres');
            err.status = 400; throw err;
        }
        const passwordHash = await bcrypt.hash(password, 10);
        return repo.crear({
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            correo: correoNorm,
            telefono: telefono ? String(telefono).trim() : null,
            passwordHash,
        });
    }

    // Modo 2: alta sin password → token de activación que el padre canjeará.
    const activacionToken  = _generarToken();
    const activacionExpira = _expira();
    const padre = await repo.crear({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        correo: correoNorm,
        telefono: telefono ? String(telefono).trim() : null,
        activacionToken,
        activacionExpira,
    });
    // El token se devuelve UNA sola vez al cliente (la maestra lo apunta).
    padre.activacion_token  = activacionToken;
    padre.activacion_expira = activacionExpira;
    return padre;
}

module.exports = {
    obtenerPorId,
    buscarPorCorreo,
    listarTodos: repo.listarTodos,
    crear,
    // expuesto para que el slice auth canje el token:
    buscarPorActivacionToken: repo.buscarPorActivacionToken,
    establecerPassword:       repo.establecerPassword,
};
