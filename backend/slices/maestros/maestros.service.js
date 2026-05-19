/* =============================================================
 *  Slice "maestros" — gestión por el director.
 *  Crear sin password genera token (m_xxx) igual que padres.
 * ============================================================= */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const repo   = require('./maestros.repository');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_DIAS = 14;

function _expira() {
    const d = new Date(); d.setDate(d.getDate() + TOKEN_TTL_DIAS); return d;
}

function obtenerPorId(id) { return repo.obtenerPorId(id); }
function listar(opts)     { return repo.listar(opts); }

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
        const err = new Error('Ya existe un maestro con ese correo');
        err.status = 409; throw err;
    }

    if (password) {
        if (String(password).length < 6) {
            const err = new Error('La contraseña debe tener al menos 6 caracteres');
            err.status = 400; throw err;
        }
        const passwordHash = await bcrypt.hash(password, 10);
        return repo.crear({ nombre: nombre.trim(), apellido: apellido.trim(),
                            correo: correoNorm, passwordHash });
    }

    const activacionToken  = 'm_' + crypto.randomBytes(12).toString('hex');
    const activacionExpira = _expira();
    const maestro = await repo.crear({
        nombre: nombre.trim(), apellido: apellido.trim(),
        correo: correoNorm, activacionToken, activacionExpira,
    });
    maestro.activacion_token  = activacionToken;
    maestro.activacion_expira = activacionExpira;
    return maestro;
}

async function actualizar(idMaestro, cambios) {
    const actual = await repo.obtenerPorId(idMaestro);
    if (!actual) {
        const err = new Error('Maestro no encontrado'); err.status = 404; throw err;
    }
    if (cambios.correo) {
        const correoNorm = String(cambios.correo).trim().toLowerCase();
        if (!EMAIL_RE.test(correoNorm)) {
            const err = new Error('Correo inválido'); err.status = 400; throw err;
        }
        cambios.correo = correoNorm;
    }
    return repo.actualizar(idMaestro, cambios);
}

async function desactivar(idMaestro) {
    const actual = await repo.obtenerPorId(idMaestro);
    if (!actual) {
        const err = new Error('Maestro no encontrado'); err.status = 404; throw err;
    }
    return repo.desactivar(idMaestro);
}

module.exports = { obtenerPorId, listar, crear, actualizar, desactivar };
