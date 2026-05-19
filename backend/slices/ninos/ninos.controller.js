const service          = require('./ninos.service');
const registrosService = require('../registros/registros.service');

async function historialNino(req, res, next) {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
        await service.verificarAcceso(req.user, req.params.id);
        const historial = await registrosService.historialPorNino(req.params.id, limit);
        res.json(historial);
    } catch (err) { next(err); }
}

async function crearNino(req, res, next) {
    try {
        const nino = await service.crearComoMaestro(req.user.userId, req.body || {});
        res.status(201).json(nino);
    } catch (err) { next(err); }
}

/**
 *  Listado completo del salón para la pantalla de administración
 *  de la maestra (incluye datos del padre y si tiene tarjeta NFC).
 */
async function listarPorSalon(req, res, next) {
    try {
        const soloActivos = req.query.activos === 'true';
        const data = await service.listarPorSalonComoMaestro(
            req.user.userId, req.params.idSalon, { soloActivos }
        );
        res.json(data);
    } catch (err) { next(err); }
}

/**
 *  Alta orquestada: alumno + padre en un solo POST.
 *  · Si padre.correo ya existe → se reusa (hermanos).
 *  · Si no, se crea con o sin password.
 *  Devuelve también el link de activación cuando aplique.
 */
async function registrarAlumno(req, res, next) {
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const out = await service.registrarAlumnoConPadre(
            req.user.userId, req.body, { baseUrl }
        );
        res.status(201).json(out);
    } catch (err) { next(err); }
}

async function actualizarNino(req, res, next) {
    try {
        const nino = req.user.rol === 'director'
            ? await service.actualizarComoDirector(req.params.id, req.body || {})
            : await service.actualizarComoMaestro(req.user.userId, req.params.id, req.body || {});
        res.json(nino);
    } catch (err) { next(err); }
}

async function desactivarNino(req, res, next) {
    try {
        if (req.user.rol === 'director') {
            await service.desactivarComoDirector(req.params.id);
        } else {
            await service.desactivarComoMaestro(req.user.userId, req.params.id);
        }
        res.status(204).end();
    } catch (err) { next(err); }
}

// Director: listado global de niños (todos los salones)
async function listarTodos(req, res, next) {
    try {
        const soloActivos = req.query.activos === 'true';
        res.json(await service.listarTodos({ soloActivos }));
    } catch (err) { next(err); }
}

module.exports = {
    historialNino,
    listarPorSalon,
    registrarAlumno,
    crearNino,
    actualizarNino,
    desactivarNino,
    listarTodos,
};
