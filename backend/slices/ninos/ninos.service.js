const repo            = require('./ninos.repository');
const salonesService  = require('../salones/salones.service');
const padresService   = require('../padres/padres.service');

function hijosDelPadre(idPadre) {
    return repo.hijosDelPadre(idPadre);
}

/**
 *  Verifica que el usuario tenga derecho a ver/editar este niño.
 *  Padre    → solo si es su hijo
 *  Maestro  → solo si el niño está en uno de sus salones
 *  Director → acceso global
 */
async function verificarAcceso(user, idNino) {
    const nino = await repo.obtenerPorId(idNino);
    if (!nino) {
        const err = new Error('Niño no encontrado'); err.status = 404; throw err;
    }
    if (user.rol === 'director') return nino;
    if (user.rol === 'padre' && nino.id_padre === user.userId) return nino;
    if (user.rol === 'maestro') {
        await salonesService.verificarAccesoMaestro(user.userId, nino.id_salon);
        return nino;
    }
    const err = new Error('Acceso denegado'); err.status = 403; throw err;
}

/** Listado global usado por el director (todos los salones). */
async function listarTodos({ soloActivos = false } = {}) {
    return repo.listarTodos
        ? repo.listarTodos({ soloActivos })
        : (await _todosFallback(soloActivos));
}

// Fallback inline si el repo aún no expone listarTodos
async function _todosFallback(soloActivos) {
    const { query } = require('../../config/db');
    const filtro = soloActivos ? 'WHERE n.activo = TRUE' : '';
    return query(
        `SELECT n.id_nino, n.nombre, n.apellido, n.fecha_nacimiento,
                n.id_padre, n.id_salon, n.avatar_url, n.activo,
                p.nombre   AS nombre_padre, p.apellido AS apellido_padre, p.correo AS correo_padre,
                s.nombre   AS nombre_salon, s.grado    AS grado_salon,
                EXISTS (SELECT 1 FROM tarjetas_nfc t WHERE t.id_nino = n.id_nino) AS tiene_tarjeta
         FROM ninos n
         JOIN padres   p ON p.id_padre  = n.id_padre
         JOIN salones  s ON s.id_salon  = n.id_salon
         ${filtro}
         ORDER BY s.nombre, n.apellido, n.nombre`
    );
}

async function listarPorSalonComoMaestro(idMaestro, idSalon, { soloActivos = false } = {}) {
    await salonesService.verificarAccesoMaestro(idMaestro, idSalon);
    return repo.listarPorSalon(idSalon, { soloActivos });
}

/**
 *  Alta orquestada: la maestra envía el alumno + datos del padre.
 *  · Si el correo del padre ya existe → se reusa (caso de hermanos).
 *  · Si no existe → se crea (con password o con activacion_token).
 *  · Luego se inserta el niño asignado al salón del maestro.
 *
 *  Respuesta:
 *    { nino, padre, padre_reusado, activacion: {token, expira, link} | null }
 */
async function registrarAlumnoConPadre(idMaestro, payload, { baseUrl } = {}) {
    const { alumno = {}, padre: padreInput = {} } = payload || {};
    const { nombre, apellido, fechaNacimiento, idSalon, avatarUrl } = alumno;

    if (!nombre || !apellido || !idSalon) {
        const err = new Error('alumno.nombre, alumno.apellido y alumno.idSalon son obligatorios');
        err.status = 400; throw err;
    }
    if (!padreInput.correo) {
        const err = new Error('padre.correo es obligatorio'); err.status = 400; throw err;
    }
    // Solo a un salón propio
    await salonesService.verificarAccesoMaestro(idMaestro, idSalon);

    // ¿Padre ya existe?
    let padre = await padresService.buscarPorCorreo(padreInput.correo);
    let padreReusado = false;
    let activacion = null;

    if (padre) {
        padreReusado = true;
    } else {
        try {
            padre = await padresService.crear({
                nombre:   padreInput.nombre,
                apellido: padreInput.apellido,
                correo:   padreInput.correo,
                telefono: padreInput.telefono,
                password: padreInput.password,   // opcional
            });
        } catch (err) {
            // Re-lanzamos errores de validación tal cual
            throw err;
        }
        if (padre.activacion_token) {
            const base = (baseUrl || '').replace(/\/$/, '');
            activacion = {
                token:  padre.activacion_token,
                expira: padre.activacion_expira,
                link:   base ? `${base}/activar.html?token=${padre.activacion_token}` : null,
            };
            // No filtramos el token en el objeto padre del response público:
            delete padre.activacion_token;
            delete padre.activacion_expira;
        }
    }

    // Guard contra duplicados accidentales (doble click, reenvíos…).
    // Si ya existe un niño activo con el mismo nombre, apellido, padre y
    // salón, lo devolvemos en lugar de crear otro.
    const yaExisten = await repo.listarPorSalon(idSalon);
    const dup = yaExisten.find(n =>
        n.activo &&
        n.id_padre === padre.id_padre &&
        n.nombre.trim().toLowerCase()   === nombre.trim().toLowerCase() &&
        n.apellido.trim().toLowerCase() === apellido.trim().toLowerCase()
    );
    if (dup) {
        const err = new Error(
            `Ya hay un alumno activo llamado ${dup.nombre} ${dup.apellido} con este padre en este salón.`
        );
        err.status = 409;
        throw err;
    }

    const nino = await repo.crear({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        fechaNacimiento,
        idPadre: padre.id_padre,
        idSalon,
        avatarUrl,
    });

    return { nino, padre, padre_reusado: padreReusado, activacion };
}

async function crearComoMaestro(idMaestro, payload) {
    const { nombre, apellido, fechaNacimiento, idPadre, idSalon, avatarUrl } = payload || {};
    if (!nombre || !apellido || !idPadre || !idSalon) {
        const err = new Error('nombre, apellido, idPadre e idSalon son obligatorios');
        err.status = 400; throw err;
    }
    // El maestro solo puede asignar a un salón propio
    await salonesService.verificarAccesoMaestro(idMaestro, idSalon);

    // El padre debe existir
    const padre = await padresService.obtenerPorId(idPadre);
    if (!padre) {
        const err = new Error('Padre no encontrado'); err.status = 404; throw err;
    }

    return repo.crear({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        fechaNacimiento,
        idPadre,
        idSalon,
        avatarUrl,
    });
}

async function actualizarComoMaestro(idMaestro, idNino, cambios) {
    const actual = await repo.obtenerPorId(idNino);
    if (!actual) {
        const err = new Error('Niño no encontrado'); err.status = 404; throw err;
    }
    await salonesService.verificarAccesoMaestro(idMaestro, actual.id_salon);

    // Si se quiere mover de salón, debe ser a otro salón del mismo maestro
    if (cambios.idSalon && cambios.idSalon !== actual.id_salon) {
        await salonesService.verificarAccesoMaestro(idMaestro, cambios.idSalon);
    }
    return repo.actualizar(idNino, cambios);
}

async function desactivarComoMaestro(idMaestro, idNino) {
    const actual = await repo.obtenerPorId(idNino);
    if (!actual) {
        const err = new Error('Niño no encontrado'); err.status = 404; throw err;
    }
    await salonesService.verificarAccesoMaestro(idMaestro, actual.id_salon);
    return repo.actualizar(idNino, { activo: false });
}

// ─── Versiones para el director (acceso global) ──────────────
async function actualizarComoDirector(idNino, cambios) {
    const actual = await repo.obtenerPorId(idNino);
    if (!actual) {
        const err = new Error('Niño no encontrado'); err.status = 404; throw err;
    }
    return repo.actualizar(idNino, cambios);
}

async function desactivarComoDirector(idNino) {
    const actual = await repo.obtenerPorId(idNino);
    if (!actual) {
        const err = new Error('Niño no encontrado'); err.status = 404; throw err;
    }
    return repo.actualizar(idNino, { activo: false });
}

module.exports = {
    hijosDelPadre,
    verificarAcceso,
    buscarPorUidTarjeta: repo.buscarPorUidTarjeta,
    listarPorSalonComoMaestro,
    registrarAlumnoConPadre,
    crearComoMaestro,
    actualizarComoMaestro,
    desactivarComoMaestro,
    actualizarComoDirector,
    desactivarComoDirector,
    listarTodos,
};
