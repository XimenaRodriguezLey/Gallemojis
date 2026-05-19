/* =============================================================
 *  Gallemojis API — entry point
 * ============================================================= */
require('dotenv').config();

const path    = require('path');
const express = require('express');
const cors    = require('cors');

const { notFound, errorHandler } = require('./middlewares/errorHandler');

// Slices verticales
const authRoutes          = require('./slices/auth/auth.routes');
const salonesRoutes       = require('./slices/salones/salones.routes');
const ninosRoutes         = require('./slices/ninos/ninos.routes');
const padresRoutes        = require('./slices/padres/padres.routes');
const registrosRoutes     = require('./slices/registros/registros.routes');
const notificacionesRoutes= require('./slices/notificaciones/notificaciones.routes');
const mensajesRoutes      = require('./slices/mensajes/mensajes.routes');
const nfcRoutes           = require('./slices/nfc/nfc.routes');
const maestrosMeRoutes    = require('./slices/auth/maestros.routes');
const maestrosCrudRoutes  = require('./slices/maestros/maestros.routes');
const directoresRoutes    = require('./slices/directores/directores.routes');

const app = express();

// CORS
const origins = (process.env.CORS_ORIGIN || '*')
    .split(',')
    .map(s => s.trim());
app.use(cors({
    origin: origins.includes('*') ? true : origins,
    credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date() }));

// Rutas
app.use('/api/auth',           authRoutes);
app.use('/api/maestros',       maestrosMeRoutes);        // /me/* del maestro
app.use('/api/maestros',       maestrosCrudRoutes);      // CRUD director
app.use('/api/directores',     directoresRoutes);
app.use('/api/salones',        salonesRoutes);
app.use('/api/ninos',          ninosRoutes);
app.use('/api/padres',         padresRoutes);
app.use('/api/registros',      registrosRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/mensajes',       mensajesRoutes);
app.use('/api/nfc',            nfcRoutes);

// Sirve el frontend estático en la raíz (útil en local).
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));
app.get('/', (_req, res) => res.sendFile(path.join(FRONTEND_DIR, 'index.html')));

// 404 + manejador de errores
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[gallemojis] API escuchando en http://0.0.0.0:${PORT}`);
});
