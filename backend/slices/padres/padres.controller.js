const ninosService          = require('../ninos/ninos.service');
const notificacionesService = require('../notificaciones/notificaciones.service');
const mensajesService       = require('../mensajes/mensajes.service');
const padresService         = require('./padres.service');

// ─── endpoints "/me" (padre autenticado) ──────────────────────
async function misHijos(req, res, next) {
    try {
        const hijos = await ninosService.hijosDelPadre(req.user.userId);
        res.json(hijos);
    } catch (err) { next(err); }
}

async function misNotificaciones(req, res, next) {
    try {
        const soloNoLeidas = req.query.noLeidas === 'true';
        const lista = await notificacionesService.listarDelPadre(req.user.userId, soloNoLeidas);
        res.json(lista);
    } catch (err) { next(err); }
}

async function misMensajes(req, res, next) {
    try {
        const lista = await mensajesService.listarDelPadre(req.user.userId);
        res.json(lista);
    } catch (err) { next(err); }
}

// ─── búsqueda / alta (uso del maestro) ────────────────────────
async function buscarPorCorreo(req, res, next) {
    try {
        const correo = req.query.correo;
        if (!correo) {
            return res.status(400).json({ error: 'Falta query param ?correo=' });
        }
        const padre = await padresService.buscarPorCorreo(correo);
        if (!padre) return res.status(404).json({ error: 'Padre no encontrado' });
        res.json(padre);
    } catch (err) { next(err); }
}

async function crear(req, res, next) {
    try {
        // password es OPCIONAL: si no viene, el service genera activacion_token.
        const { nombre, apellido, correo, telefono, password } = req.body || {};
        const padre = await padresService.crear({ nombre, apellido, correo, telefono, password });
        res.status(201).json(padre);
    } catch (err) {
        // Caso especial: padre ya existe → devolvemos 409 con el padre para que el
        // front pueda reusarlo automáticamente (caso de hermanos).
        if (err.status === 409 && err.padre) {
            return res.status(409).json({ error: err.message, padre: err.padre });
        }
        next(err);
    }
}

// ─── Listado global (director) ────────────────────────────────
async function listarTodos(req, res, next) {
    try {
        const soloActivos = req.query.activos === 'true';
        res.json(await padresService.listarTodos({ soloActivos }));
    } catch (err) { next(err); }
}

/**
 *  GET /api/padres
 *   · con ?correo= → buscar (maestro o director)
 *   · sin query    → listar todos (director)
 */
async function indice(req, res, next) {
    try {
        if (req.query.correo) {
            return buscarPorCorreo(req, res, next);
        }
        if (req.user.rol !== 'director') {
            return res.status(403).json({ error: 'Solo el director puede listar todos los padres' });
        }
        return listarTodos(req, res, next);
    } catch (err) { next(err); }
}

module.exports = { misHijos, misNotificaciones, misMensajes, buscarPorCorreo, crear, listarTodos, indice };
