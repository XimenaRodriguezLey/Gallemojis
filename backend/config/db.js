/* =============================================================
 *  Pool de conexiones PostgreSQL.
 *  Se usa desde los repositories de cada slice.
 * ============================================================= */
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
    console.error('[db] error inesperado del pool', err);
});

// Helper consistente: query(sql, params) → rows
async function query(text, params) {
    const start = Date.now();
    const res = await pool.query(text, params);
    if (process.env.LOG_SQL === 'true') {
        const dur = Date.now() - start;
        console.log(`[sql ${dur}ms]`, text.replace(/\s+/g, ' ').trim().slice(0, 120));
    }
    return res.rows;
}

module.exports = { pool, query };
