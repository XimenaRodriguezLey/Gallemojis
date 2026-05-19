/* =============================================================
 *  Lógica del slice "directores".
 *  · CRUD de la tabla directores.
 *  · Mismo flujo de activación que padres: si no se da password,
 *    se genera token y se devuelve link.
 * ============================================================= */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const repo   = require('./directores.repository');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_DIAS = 14;

function _expira() {
    const d = new Date(); d.setDate(d.getDate() + TOKEN_TTL_DIAS); return d;
}
function _generarToken(prefijo = 'd') {
    return `${prefijo}_${crypto.randomBytes(12).toString('hex')}`;
}

function obtenerPorId(id)     { return repo.obtenerPorId(id); }
function listar()             { return repo.listar(); }
function buscarPorActivacionToken(token) { return repo.buscarPorActivacionToken(token); }
function establecerPassword(id, hash)    { return repo.establecerPassword(id, hash); }

async function crear({ nombre, apellido, correo, password }) {
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
        const err = new Error('Ya existe un director con ese correo');
        err.status = 409; throw err;
    }

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
            passwordHash,
        });
    }

    const activacionToken  = _generarToken('d');
    const activacionExpira = _expira();
    const director = await repo.crear({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        correo: correoNorm,
        activacionToken,
        activacionExpira,
    });
    director.activacion_token  = activacionToken;
    director.activacion_expira = activacionExpira;
    return director;
}

async function actualizar(idDirector, cambios) {
    const actual = await repo.obtenerPorId(idDirector);
    if (!actual) {
        const err = new Error('Director no encontrado'); err.status = 404; throw err;
    }
    if (cambios.correo) {
        const correoNorm = String(cambios.correo).trim().toLowerCase();
        if (!EMAIL_RE.test(correoNorm)) {
            const err = new Error('Correo inválido'); err.status = 400; throw err;
        }
        cambios.correo = correoNorm;
    }
    return repo.actualizar(idDirector, cambios);
}

async function desactivar(idDirector) {
    const actual = await repo.obtenerPorId(idDirector);
    if (!actual) {
        const err = new Error('Director no encontrado'); err.status = 404; throw err;
    }
    return repo.desactivar(idDirector);
}

/**
 *  Reset de contraseña de OTRO director (administrativo).
 *  Invalida el password actual y crea un activacion_token nuevo.
 */
async function resetPassword(idDirector) {
    const actual = await repo.obtenerPorId(idDirector);
    if (!actual) {
        const err = new Error('Director no encontrado'); err.status = 404; throw err;
    }
    const token = _generarToken('d');
    const expira = _expira();
    await repo.guardarTokenReset(idDirector, token, expira);
    return { token, expira };
}

module.exports = {
    obtenerPorId,
    listar,
    crear,
    actualizar,
    desactivar,
    resetPassword,
    buscarPorActivacionToken,
    establecerPassword,
};
