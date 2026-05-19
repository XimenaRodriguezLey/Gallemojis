/* =============================================================
 *  Slice NFC — dos responsabilidades:
 *
 *    1. registrarTap()      → orquesta el evento "niño tocó módulo"
 *    2. CRUD de tarjetas    → registrar / listar / actualizar /
 *                              eliminar tarjetas (solo maestro)
 *
 *  Al inicio del tap se guarda el UID en memoria volátil para
 *  permitir captura asistida desde el form del maestro.
 * ============================================================= */
const repo                  = require('./nfc.repository');
const ninosService          = require('../ninos/ninos.service');
const registrosService      = require('../registros/registros.service');
const notificacionesService = require('../notificaciones/notificaciones.service');
const salonesService        = require('../salones/salones.service');

const EMOJI_BY_EMOCION = {
    alegria:  '😄',
    tristeza: '😢',
    enojo:    '😠',
    calma:    '😌',
    miedo:    '😨',
};

// ─── 1. tap del módulo PN532 ──────────────────────────────────
async function registrarTap({ uid, emocion }) {
    if (!uid || !emocion) {
        const err = new Error('uid y emocion son obligatorios'); err.status = 400;
        throw err;
    }

    const tarjeta = await ninosService.buscarPorUidTarjeta(uid);

    // Siempre guardamos el último UID leído para captura desde el form.
    repo.setUltimoUid(uid, !!tarjeta);

    if (!tarjeta) {
        const err = new Error('Tarjeta NFC no registrada'); err.status = 404;
        throw err;
    }

    if (!tarjeta.activa) {
        const modulo = await registrosService.buscarModuloPorEmocion(emocion);
        if (modulo) {
            await registrosService.insertarRegistro({
                idTarjeta: tarjeta.id_tarjeta,
                idModulo:  modulo.id_modulo,
                resultado: 'tarjeta_inactiva',
            });
        }
        const err = new Error('Tarjeta inactiva'); err.status = 403; throw err;
    }

    const modulo = await registrosService.buscarModuloPorEmocion(emocion);
    if (!modulo) {
        const err = new Error(`No existe módulo para "${emocion}"`); err.status = 404;
        throw err;
    }

    const registro = await registrosService.insertarRegistro({
        idTarjeta: tarjeta.id_tarjeta,
        idModulo:  modulo.id_modulo,
        resultado: 'ok',
    });

    const emoji = EMOJI_BY_EMOCION[emocion] || '🙂';
    const mensaje = `${emoji} ${tarjeta.nombre} registró "${emocion}"`;
    await notificacionesService.crear({
        idRegistro: registro.id_registro,
        idPadre:    tarjeta.id_padre,
        mensaje,
    });

    return {
        ok: true,
        id_registro: registro.id_registro,
        nino: { id: tarjeta.id_nino, nombre: tarjeta.nombre, apellido: tarjeta.apellido },
        emocion,
        fecha_hora: registro.fecha_hora,
    };
}

// ─── 2. CRUD de tarjetas (maestro autenticado) ────────────────

/** Lista las tarjetas de los salones del maestro. */
async function listarTarjetasDeMaestro(idMaestro, { idSalon } = {}) {
    if (idSalon) {
        await salonesService.verificarAccesoMaestro(idMaestro, idSalon);
        return repo.listar({ idSalon });
    }
    // Sin filtro: devuelve solo tarjetas de los salones del maestro
    const salones = await salonesService.listarPorMaestro(idMaestro);
    const ids = salones.map(s => s.id_salon);
    if (!ids.length) return [];
    // Hacemos N consultas pequeñas para no complicar el repo con IN dinámico.
    const lotes = await Promise.all(ids.map(id => repo.listar({ idSalon: id })));
    return lotes.flat();
}

async function registrarTarjeta(idMaestro, { uid, idNino, activa }) {
    if (!uid || !idNino) {
        const err = new Error('uid e idNino son obligatorios'); err.status = 400;
        throw err;
    }
    const uidLimpio = String(uid).trim();
    if (!uidLimpio) {
        const err = new Error('UID vacío'); err.status = 400; throw err;
    }

    // Solo si el niño pertenece a un salón del maestro.
    const nino = await ninosService.verificarAcceso({ rol: 'maestro', userId: idMaestro }, idNino);

    // Si el UID ya pertenece a otra tarjeta, fallar con mensaje claro.
    const existente = await repo.buscarPorUid(uidLimpio);
    if (existente && existente.id_nino !== idNino) {
        const err = new Error(`Este UID ya está asignado a ${existente.nombre_nino} ${existente.apellido_nino}`);
        err.status = 409; throw err;
    }

    return repo.crear({
        uid: uidLimpio,
        idNino: nino.id_nino,
        activa: typeof activa === 'boolean' ? activa : true,
    });
}

async function actualizarTarjeta(idMaestro, idTarjeta, { uid, activa }) {
    const tarjeta = await repo.obtenerPorId(idTarjeta);
    if (!tarjeta) {
        const err = new Error('Tarjeta no encontrada'); err.status = 404; throw err;
    }
    await salonesService.verificarAccesoMaestro(idMaestro, tarjeta.id_salon);

    if (uid !== undefined) {
        const otra = await repo.buscarPorUid(String(uid).trim());
        if (otra && otra.id_tarjeta !== idTarjeta) {
            const err = new Error('Ese UID ya pertenece a otra tarjeta'); err.status = 409;
            throw err;
        }
    }
    return repo.actualizar(idTarjeta, {
        uid: uid !== undefined ? String(uid).trim() : undefined,
        activa,
    });
}

async function eliminarTarjeta(idMaestro, idTarjeta) {
    const tarjeta = await repo.obtenerPorId(idTarjeta);
    if (!tarjeta) {
        const err = new Error('Tarjeta no encontrada'); err.status = 404; throw err;
    }
    await salonesService.verificarAccesoMaestro(idMaestro, tarjeta.id_salon);
    return repo.eliminar(idTarjeta);
}

/**
 *  Devuelve el último UID que algún módulo PN532 reportó vía /tap.
 *  El frontend lo consulta cuando el maestro pulsa "Capturar desde módulo".
 */
function ultimoUidLeido() {
    return repo.getUltimoUid();
}

module.exports = {
    registrarTap,
    listarTarjetasDeMaestro,
    registrarTarjeta,
    actualizarTarjeta,
    eliminarTarjeta,
    ultimoUidLeido,
};
