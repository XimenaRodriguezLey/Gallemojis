/* =============================================================
 *  Manejador global de errores. Siempre devuelve JSON.
 * ============================================================= */
function notFound(req, res, _next) {
    res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
}

function errorHandler(err, _req, res, _next) {
    console.error('[error]', err);
    const status = err.status || 500;
    res.status(status).json({
        error: err.message || 'Error interno del servidor',
    });
}

module.exports = { notFound, errorHandler };
