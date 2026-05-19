/* =============================================================
 *  Gallemojis — cliente HTTP del frontend
 *  Maneja sesión (localStorage) y todas las llamadas REST.
 *  Se expone como `window.api`.
 * ============================================================= */
(function () {
    const STORAGE_KEY = 'gallemojis.session';

    // Permite definir el origen del backend desde el HTML antes de
    // cargar este script:  window.GALLEMOJIS_API = "http://localhost:3001";
    const BASE_URL = (window.GALLEMOJIS_API || '').replace(/\/$/, '') || '';

    // ─── sesión ────────────────────────────────────────────────
    function leerSesion() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
        } catch (_) {
            return null;
        }
    }

    function guardarSesion(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function borrarSesion() {
        localStorage.removeItem(STORAGE_KEY);
    }

    // ─── HTTP helper ───────────────────────────────────────────
    async function http(metodo, ruta, body) {
        const sesion = leerSesion();
        const opts = {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
        };
        if (sesion?.token) {
            opts.headers['Authorization'] = `Bearer ${sesion.token}`;
        }
        if (body !== undefined) {
            opts.body = JSON.stringify(body);
        }

        let res;
        try {
            res = await fetch(`${BASE_URL}${ruta}`, opts);
        } catch (err) {
            throw new Error('No se pudo conectar con el servidor');
        }

        let payload = null;
        const txt = await res.text();
        if (txt) {
            try { payload = JSON.parse(txt); } catch (_) { payload = txt; }
        }

        if (!res.ok) {
            const msg = (payload && payload.error) || `Error ${res.status}`;
            // Si el token caducó, limpiar sesión.
            if (res.status === 401) borrarSesion();
            throw new Error(msg);
        }

        return payload;
    }

    // ─── API pública ───────────────────────────────────────────
    const api = {
        // estado expuesto (se actualiza en login())
        get token()   { return leerSesion()?.token   || null; },
        get rol()     { return leerSesion()?.rol     || null; },
        get nombre()  { return leerSesion()?.nombre  || null; },
        get userId()  { return leerSesion()?.userId  || null; },

        isLoggedIn() {
            return !!leerSesion()?.token;
        },

        requireAuth() {
            if (!this.isLoggedIn()) {
                window.location.href = 'index.html';
                return false;
            }
            return true;
        },

        async login(correo, password) {
            const data = await http('POST', '/api/auth/login', { correo, password });
            guardarSesion(data);
            return data;
        },

        // El padre canjea su activacion_token por una contraseña real.
        async establecerPassword(token, password) {
            const data = await http('POST', '/api/auth/establecer-password', { token, password });
            guardarSesion(data);
            return data;
        },

        logout() {
            borrarSesion();
        },

        // ─── Maestro ──────────────────────────────────────────
        misSalones() {
            return http('GET', '/api/maestros/me/salones');
        },

        ninosDelSalon(idSalon) {
            return http('GET', `/api/salones/${idSalon}/ninos`);
        },

        historialSalon(idSalon, limit = 50) {
            return http('GET', `/api/salones/${idSalon}/historial?limit=${limit}`);
        },

        // ─── Padre ────────────────────────────────────────────
        misHijos() {
            return http('GET', '/api/padres/me/hijos');
        },

        historialNino(idNino, limit = 50) {
            return http('GET', `/api/ninos/${idNino}/historial?limit=${limit}`);
        },

        misNotificaciones(soloNoLeidas = false) {
            const q = soloNoLeidas ? '?noLeidas=true' : '';
            return http('GET', `/api/padres/me/notificaciones${q}`);
        },

        marcarNotificacionLeida(idNotif) {
            return http('PATCH', `/api/notificaciones/${idNotif}/leida`);
        },

        misMensajes() {
            return http('GET', '/api/padres/me/mensajes');
        },

        // El padre marca como leídos los mensajes que recibió.
        marcarMensajesLeidos(idMaestro = null) {
            const q = idMaestro ? `?maestro=${encodeURIComponent(idMaestro)}` : '';
            return http('PATCH', `/api/mensajes/leido${q}`);
        },

        // ─── Mensajes del maestro ─────────────────────────────
        padresDelMaestro() {
            return http('GET', '/api/maestros/me/padres');
        },

        hiloConPadre(idPadre) {
            return http('GET', `/api/mensajes?maestro=${encodeURIComponent(this.userId)}&padre=${encodeURIComponent(idPadre)}`);
        },

        enviarMensajeAPadre(idPadre, contenido) {
            return http('POST', '/api/mensajes', { id_padre: idPadre, contenido });
        },

        // ─── Director (administración global) ─────────────────
        // Maestros
        listarMaestros(soloActivos = false) {
            const q = soloActivos ? '?activos=true' : '';
            return http('GET', `/api/maestros${q}`);
        },
        registrarMaestro({ nombre, apellido, correo, password }) {
            return http('POST', '/api/maestros', { nombre, apellido, correo, password });
        },
        actualizarMaestro(idMaestro, cambios) {
            return http('PATCH', `/api/maestros/${idMaestro}`, cambios);
        },
        desactivarMaestro(idMaestro) {
            return http('DELETE', `/api/maestros/${idMaestro}`);
        },

        // Salones (vista global)
        listarSalones(soloActivos = false) {
            const q = soloActivos ? '?activos=true' : '';
            return http('GET', `/api/salones${q}`);
        },
        registrarSalon({ nombre, grado, idMaestro }) {
            return http('POST', '/api/salones', { nombre, grado, idMaestro });
        },
        actualizarSalon(idSalon, cambios) {
            return http('PATCH', `/api/salones/${idSalon}`, cambios);
        },
        desactivarSalon(idSalon) {
            return http('DELETE', `/api/salones/${idSalon}`);
        },

        // Alumnos (vista global)
        listarTodosAlumnos(soloActivos = false) {
            const q = soloActivos ? '?activos=true' : '';
            return http('GET', `/api/ninos${q}`);
        },

        // Padres (vista global)
        listarTodosPadres(soloActivos = false) {
            const q = soloActivos ? '?activos=true' : '';
            return http('GET', `/api/padres${q}`);
        },

        // Recuperación de contraseña (maestro o padre)
        recuperarPassword(rol, idObjetivo) {
            return http('POST', '/api/auth/recuperar-password', { rol, idObjetivo });
        },

        // Directores (CRUD del director)
        listarDirectores() {
            return http('GET', '/api/directores');
        },
        registrarDirector({ nombre, apellido, correo, password }) {
            return http('POST', '/api/directores', { nombre, apellido, correo, password });
        },
        actualizarDirector(id, cambios) {
            return http('PATCH', `/api/directores/${id}`, cambios);
        },
        desactivarDirector(id) {
            return http('DELETE', `/api/directores/${id}`);
        },
        resetPasswordDirector(id) {
            return http('POST', `/api/directores/${id}/reset`);
        },

        // ─── NFC (módulos PN532) ──────────────────────────────
        // El módulo no necesita login: usa una API-key configurada en el servidor
        registrarTap({ uid, emocion, moduloApiKey }) {
            return fetch(`${BASE_URL}/api/nfc/tap`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Module-Key': moduloApiKey || '',
                },
                body: JSON.stringify({ uid, emocion }),
            }).then(async r => {
                if (!r.ok) throw new Error((await r.json()).error || 'Error NFC');
                return r.json();
            });
        },

        // ─── Tarjetas NFC / RFID (CRUD para maestros) ─────────
        listarTarjetas(idSalon) {
            const q = idSalon ? `?salon=${encodeURIComponent(idSalon)}` : '';
            return http('GET', `/api/nfc/tarjetas${q}`);
        },

        registrarTarjeta({ uid, idNino, activa = true }) {
            return http('POST', '/api/nfc/tarjetas', { uid, idNino, activa });
        },

        actualizarTarjeta(idTarjeta, cambios) {
            return http('PATCH', `/api/nfc/tarjetas/${idTarjeta}`, cambios);
        },

        eliminarTarjeta(idTarjeta) {
            return http('DELETE', `/api/nfc/tarjetas/${idTarjeta}`);
        },

        // Último UID leído por cualquier módulo PN532 (captura asistida)
        ultimoUid() {
            return http('GET', '/api/nfc/ultimo-uid');
        },

        // ─── Alumnos y padres (administración del maestro) ────
        buscarPadrePorCorreo(correo) {
            return http('GET', `/api/padres?correo=${encodeURIComponent(correo)}`);
        },

        registrarPadre({ nombre, apellido, correo, telefono, password }) {
            return http('POST', '/api/padres', { nombre, apellido, correo, telefono, password });
        },

        registrarNino({ nombre, apellido, fechaNacimiento, idPadre, idSalon, avatarUrl }) {
            return http('POST', '/api/ninos', {
                nombre, apellido, fechaNacimiento, idPadre, idSalon, avatarUrl,
            });
        },

        // Alta orquestada: alumno + padre en una sola llamada.
        // payload = { alumno: {...}, padre: {...} }
        registrarAlumno(payload) {
            return http('POST', '/api/ninos/registrar', payload);
        },

        // Listado del salón para la pantalla de administración.
        alumnosDelSalon(idSalon, soloActivos = false) {
            const q = soloActivos ? '?activos=true' : '';
            return http('GET', `/api/ninos/por-salon/${idSalon}${q}`);
        },

        actualizarNino(idNino, cambios) {
            return http('PATCH', `/api/ninos/${idNino}`, cambios);
        },

        desactivarNino(idNino) {
            return http('DELETE', `/api/ninos/${idNino}`);
        },
    };

    window.api = api;
})();
