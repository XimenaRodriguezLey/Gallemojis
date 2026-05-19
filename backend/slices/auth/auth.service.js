/* =============================================================
 *  Lógica de autenticación.
 *  Maneja tres roles: maestro, padre, director.
 *
 *  Tokens de activación:
 *    · 'p_' + hex  → padre
 *    · 'm_' + hex  → maestro
 *    · 'd_' + hex  → director
 *  Al canjear el token detectamos el rol por el prefijo.
 * ============================================================= */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const repo             = require('./auth.repository');
const padresService    = require('../padres/padres.service');
const directoresSvc    = require('../directores/directores.service');
const { firmar }       = require('../../config/jwt');

const TOKEN_TTL_DIAS = 14;

function _expira() {
    const d = new Date(); d.setDate(d.getDate() + TOKEN_TTL_DIAS); return d;
}
function _generarToken(prefijo) {
    return `${prefijo}_${crypto.randomBytes(12).toString('hex')}`;
}

async function login(correo, password) {
    if (!correo || !password) {
        const err = new Error('Correo y contraseña son obligatorios');
        err.status = 400; throw err;
    }

    correo = correo.trim().toLowerCase();

    // ─── Maestro ────────────────────────────────────────────
    const maestro = await repo.buscarMaestroPorCorreo(correo);
    if (maestro) {
        if (!maestro.activo) {
            const err = new Error('Cuenta inactiva'); err.status = 403; throw err;
        }
        if (!maestro.password_hash) {
            const err = new Error('Tu cuenta aún no está activada. Pide al director tu enlace de activación.');
            err.status = 403; throw err;
        }
        const ok = await bcrypt.compare(password, maestro.password_hash);
        if (!ok) {
            const err = new Error('Credenciales incorrectas'); err.status = 401; throw err;
        }
        const payload = {
            userId: maestro.id, rol: 'maestro',
            nombre: `${maestro.nombre} ${maestro.apellido}`,
            correo: maestro.correo,
        };
        return { ...payload, token: firmar(payload) };
    }

    // ─── Padre ──────────────────────────────────────────────
    const padre = await repo.buscarPadrePorCorreo(correo);
    if (padre) {
        if (!padre.activo) {
            const err = new Error('Cuenta inactiva'); err.status = 403; throw err;
        }
        if (!padre.password_hash) {
            const err = new Error('Tu cuenta aún no está activada. Pide a la maestra tu enlace de activación.');
            err.status = 403; throw err;
        }
        const ok = await bcrypt.compare(password, padre.password_hash);
        if (!ok) {
            const err = new Error('Credenciales incorrectas'); err.status = 401; throw err;
        }
        await repo.tocarUltimoLoginPadre(padre.id);
        const payload = {
            userId: padre.id, rol: 'padre',
            nombre: `${padre.nombre} ${padre.apellido}`,
            correo: padre.correo,
        };
        return { ...payload, token: firmar(payload) };
    }

    // ─── Director ───────────────────────────────────────────
    const director = await repo.buscarDirectorPorCorreo(correo);
    if (director) {
        if (!director.activo) {
            const err = new Error('Cuenta inactiva'); err.status = 403; throw err;
        }
        if (!director.password_hash) {
            const err = new Error('Tu cuenta aún no está activada. Usa tu enlace de activación.');
            err.status = 403; throw err;
        }
        const ok = await bcrypt.compare(password, director.password_hash);
        if (!ok) {
            const err = new Error('Credenciales incorrectas'); err.status = 401; throw err;
        }
        await repo.tocarUltimoLoginDirector(director.id);
        const payload = {
            userId: director.id, rol: 'director',
            nombre: `${director.nombre} ${director.apellido}`,
            correo: director.correo,
        };
        return { ...payload, token: firmar(payload) };
    }

    const err = new Error('Credenciales incorrectas'); err.status = 401;
    throw err;
}

/**
 *  Canjea cualquier activacion_token (padre, maestro o director) por
 *  una contraseña real. Detectamos el rol por el prefijo del token.
 *  Tras establecerla, devolvemos un JWT (login automático).
 */
async function establecerPassword({ token, password }) {
    if (!token || !password) {
        const err = new Error('token y password son obligatorios'); err.status = 400;
        throw err;
    }
    if (String(password).length < 6) {
        const err = new Error('La contraseña debe tener al menos 6 caracteres');
        err.status = 400; throw err;
    }

    const prefijo = token.startsWith('m_') ? 'maestro'
                  : token.startsWith('d_') ? 'director'
                  : 'padre'; // 'p_' o legacy sin prefijo
    const passwordHash = await bcrypt.hash(password, 10);
    let payload;

    if (prefijo === 'maestro') {
        const m = await repo.buscarMaestroPorActivacionToken(token);
        if (!m) { const e = new Error('Token inválido o ya utilizado'); e.status = 404; throw e; }
        if (m.activacion_expira && new Date(m.activacion_expira) < new Date()) {
            const e = new Error('El token expiró. Pide al director uno nuevo.'); e.status = 410; throw e;
        }
        const actualizado = await repo.establecerPasswordMaestro(m.id_maestro, passwordHash);
        payload = {
            userId: actualizado.id_maestro, rol: 'maestro',
            nombre: `${actualizado.nombre} ${actualizado.apellido}`,
            correo: actualizado.correo,
        };
    } else if (prefijo === 'director') {
        const d = await directoresSvc.buscarPorActivacionToken(token);
        if (!d) { const e = new Error('Token inválido o ya utilizado'); e.status = 404; throw e; }
        if (d.activacion_expira && new Date(d.activacion_expira) < new Date()) {
            const e = new Error('El token expiró.'); e.status = 410; throw e;
        }
        const actualizado = await directoresSvc.establecerPassword(d.id_director, passwordHash);
        payload = {
            userId: actualizado.id_director, rol: 'director',
            nombre: `${actualizado.nombre} ${actualizado.apellido}`,
            correo: actualizado.correo,
        };
    } else {
        const p = await padresService.buscarPorActivacionToken(token);
        if (!p) { const e = new Error('Token inválido o ya utilizado'); e.status = 404; throw e; }
        if (p.activacion_expira && new Date(p.activacion_expira) < new Date()) {
            const e = new Error('El token expiró. Pide a la maestra uno nuevo.'); e.status = 410; throw e;
        }
        const actualizado = await padresService.establecerPassword(p.id_padre, passwordHash);
        payload = {
            userId: actualizado.id_padre, rol: 'padre',
            nombre: `${actualizado.nombre} ${actualizado.apellido}`,
            correo: actualizado.correo,
        };
    }

    return { ...payload, token: firmar(payload) };
}

/**
 *  Solo el director invoca esto. Reinicia la contraseña de un
 *  maestro o un padre generando un activacion_token nuevo.
 *  Devuelve token + link para que el director lo entregue.
 */
async function recuperarPassword({ rol, idObjetivo, baseUrl }) {
    if (!rol || !idObjetivo) {
        const err = new Error('rol y idObjetivo son obligatorios'); err.status = 400; throw err;
    }
    const base = (baseUrl || '').replace(/\/$/, '');
    const expira = _expira();

    if (rol === 'maestro') {
        const token = _generarToken('m');
        const m = await repo.guardarTokenResetMaestro(idObjetivo, token, expira);
        if (!m) { const e = new Error('Maestro no encontrado'); e.status = 404; throw e; }
        return {
            rol: 'maestro',
            destinatario: { id: m.id_maestro, nombre: m.nombre, apellido: m.apellido, correo: m.correo },
            token, expira,
            link: base ? `${base}/activar.html?token=${token}` : null,
        };
    }

    if (rol === 'padre') {
        const token = _generarToken('p');
        const p = await padresService.guardarTokenReset
            ? await padresService.guardarTokenReset(idObjetivo, token, expira)
            : await _resetPadre(idObjetivo, token, expira);
        if (!p) { const e = new Error('Padre no encontrado'); e.status = 404; throw e; }
        return {
            rol: 'padre',
            destinatario: { id: p.id_padre, nombre: p.nombre, apellido: p.apellido, correo: p.correo },
            token, expira,
            link: base ? `${base}/activar.html?token=${token}` : null,
        };
    }

    const err = new Error("rol debe ser 'maestro' o 'padre'"); err.status = 400; throw err;
}

// Helper local cuando padresService no exponga el guardar — usa la query directa
async function _resetPadre(idPadre, token, expira) {
    const { query } = require('../../config/db');
    const rows = await query(
        `UPDATE padres
         SET password_hash      = NULL,
             activacion_token   = $2,
             activacion_expira  = $3
         WHERE id_padre = $1
         RETURNING id_padre, correo, nombre, apellido`,
        [idPadre, token, expira]
    );
    return rows[0] || null;
}

module.exports = { login, establecerPassword, recuperarPassword };
