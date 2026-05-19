/* =============================================================
 *  Datos demo: 1 maestro, 1 padre, 1 salón, 1 niño y 1 tarjeta NFC.
 *  Útil para probar el login y los endpoints rápidamente.
 *
 *  IDEMPOTENTE: si lo corres varias veces, no duplica filas.
 *
 *  Uso:    node db/seed.js
 *  Requiere DATABASE_URL en .env y el schema ya aplicado.
 * ============================================================= */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, query } = require('../config/db');

(async function seed() {
    try {
        console.log('→ Sembrando datos demo...');

        const passMaestro = await bcrypt.hash('maestro123', 10);
        const passPadre   = await bcrypt.hash('padre123',   10);

        // Maestro
        const [maestro] = await query(
            `INSERT INTO maestros (nombre, apellido, correo, password_hash)
             VALUES ('María', 'García', 'maria@gallemojis.test', $1)
             ON CONFLICT (correo) DO UPDATE SET password_hash = EXCLUDED.password_hash
             RETURNING id_maestro`,
            [passMaestro]
        );

        // Padre
        const [padre] = await query(
            `INSERT INTO padres (nombre, apellido, correo, telefono, password_hash)
             VALUES ('Juan', 'Pérez', 'juan@gallemojis.test', '5551234567', $1)
             ON CONFLICT (correo) DO UPDATE SET password_hash = EXCLUDED.password_hash
             RETURNING id_padre`,
            [passPadre]
        );

        // Salón — buscamos primero por (nombre, id_maestro); si no existe, lo creamos.
        // `salones` no tiene UNIQUE así que no podemos usar ON CONFLICT.
        let [salon] = await query(
            `SELECT id_salon FROM salones
             WHERE nombre = 'Salón Girasol' AND id_maestro = $1
             LIMIT 1`,
            [maestro.id_maestro]
        );
        if (!salon) {
            [salon] = await query(
                `INSERT INTO salones (nombre, grado, id_maestro)
                 VALUES ('Salón Girasol', '2° A', $1)
                 RETURNING id_salon`,
                [maestro.id_maestro]
            );
        }

        // Niño — mismo patrón: buscar por (nombre, apellido, id_padre) y crear si no existe.
        let [nino] = await query(
            `SELECT id_nino FROM ninos
             WHERE nombre = 'Diego' AND apellido = 'Pérez' AND id_padre = $1
             LIMIT 1`,
            [padre.id_padre]
        );
        if (!nino) {
            [nino] = await query(
                `INSERT INTO ninos (nombre, apellido, fecha_nacimiento, id_padre, id_salon)
                 VALUES ('Diego', 'Pérez', '2019-04-12', $1, $2)
                 RETURNING id_nino`,
                [padre.id_padre, salon.id_salon]
            );
        } else {
            // Si Diego existía pero estaba desactivado, lo reactivamos
            await query(`UPDATE ninos SET activo = TRUE WHERE id_nino = $1`, [nino.id_nino]);
        }

        // Tarjeta NFC
        await query(
            `INSERT INTO tarjetas_nfc (uid, id_nino) VALUES ($1, $2)
             ON CONFLICT (uid) DO NOTHING`,
            ['NFC-DEMO-0001', nino.id_nino]
        );

        // Registros demo — solo si todavía no hay ninguno para esta tarjeta,
        // para que correr el seed dos veces no infle el historial.
        const [modAlegria] = await query(
            `SELECT id_modulo FROM modulos WHERE emocion = 'alegria' LIMIT 1`
        );
        const [tarjeta] = await query(
            `SELECT id_tarjeta FROM tarjetas_nfc WHERE uid = $1`,
            ['NFC-DEMO-0001']
        );

        if (modAlegria && tarjeta) {
            const [{ count }] = await query(
                `SELECT COUNT(*)::int AS count FROM registros_emocionales
                 WHERE id_tarjeta = $1`,
                [tarjeta.id_tarjeta]
            );
            if (count === 0) {
                await query(
                    `INSERT INTO registros_emocionales (id_tarjeta, id_modulo)
                     VALUES ($1, $2), ($1, $2)`,
                    [tarjeta.id_tarjeta, modAlegria.id_modulo]
                );
            }
        }

        console.log('✓ Listo. Credenciales demo:');
        console.log('  maestro: maria@gallemojis.test / maestro123');
        console.log('  padre:   juan@gallemojis.test  / padre123');
        console.log('  tarjeta NFC: UID = NFC-DEMO-0001');

        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('✗ Error en seed:', err);
        await pool.end();
        process.exit(1);
    }
})();
