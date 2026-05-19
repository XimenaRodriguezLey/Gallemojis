/* =============================================================
 *  Repositorio del slice "padres".
 *  Maneja CRUD básico sobre la tabla `padres`.
 *  Nota: la búsqueda por correo y el "tocar último login" siguen
 *  viviendo en auth.repository, porque son operaciones del flujo
 *  de autenticación.
 * ============================================================= */
const { query } = require('../../config/db');

function obtenerPorId(idPadre) {
    return query(
        `SELECT id_padre, nombre, apellido, correo, telefono, activo, fecha_registro,
                (password_hash IS NOT NULL) AS tiene_password
         FROM padres WHERE id_padre = $1`,
        [idPadre]
    ).then(r => r[0] || null);
}

function listarTodos({ soloActivos = false } = {}) {
    const filtro = soloActivos ? 'WHERE p.activo = TRUE' : '';
    return query(
        `SELECT p.id_padre, p.nombre, p.apellido, p.correo, p.telefono,
                p.activo, p.fecha_registro, p.ultimo_login,
                (p.password_hash IS NOT NULL) AS tiene_password,
                COALESCE((SELECT COUNT(*) FROM ninos n WHERE n.id_padre = p.id_padre AND n.activo = TRUE), 0)::int AS hijos
         FROM padres p
         ${filtro}
         ORDER BY p.apellido, p.nombre`
    );
}

function obtenerPorCorreo(correo) {
    return query(
        `SELECT id_padre, nombre, apellido, correo, telefono, activo, fecha_registro,
                (password_hash IS NOT NULL) AS tiene_password
         FROM padres WHERE correo = $1 LIMIT 1`,
        [correo]
    ).then(r => r[0] || null);
}

/**
 *  Crea un padre. Si se pasa passwordHash queda activado al instante;
 *  si se pasa activacionToken queda pendiente de establecer contraseña.
 */
function crear({ nombre, apellido, correo, telefono, passwordHash, activacionToken, activacionExpira }) {
    return query(
        `INSERT INTO padres (nombre, apellido, correo, telefono,
                             password_hash, activacion_token, activacion_expira)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id_padre, nombre, apellido, correo, telefono, activo, fecha_registro,
                   (password_hash IS NOT NULL) AS tiene_password`,
        [
            nombre,
            apellido,
            correo,
            telefono || null,
            passwordHash || null,
            activacionToken || null,
            activacionExpira || null,
        ]
    ).then(r => r[0]);
}

function buscarPorActivacionToken(token) {
    return query(
        `SELECT id_padre, nombre, apellido, correo, activacion_expira
         FROM padres
         WHERE activacion_token = $1
           AND activo = TRUE
         LIMIT 1`,
        [token]
    ).then(r => r[0] || null);
}

function establecerPassword(idPadre, passwordHash) {
    return query(
        `UPDATE padres
         SET password_hash      = $2,
             activacion_token   = NULL,
             activacion_expira  = NULL
         WHERE id_padre = $1
         RETURNING id_padre, correo, nombre, apellido`,
        [idPadre, passwordHash]
    ).then(r => r[0] || null);
}

module.exports = {
    obtenerPorId,
    obtenerPorCorreo,
    listarTodos,
    crear,
    buscarPorActivacionToken,
    establecerPassword,
};
