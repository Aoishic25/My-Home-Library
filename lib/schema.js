// Schema whitelist: every database/table/column name that reaches a SQL
// statement is resolved through here first, so user input is never
// interpolated into a query as an identifier.
const mysql = require('mysql2');

const ALLOWED_DATABASES = ['Shelf', 'Collection', 'Names', 'Writer'];
const CACHE_MS = 30 * 1000;

const TEXT_TYPES = ['char', 'varchar', 'tinytext', 'text', 'mediumtext', 'longtext'];

function createSchema(pool) {
    let cache = null;
    let loadedAt = 0;

    async function load() {
        if (cache && Date.now() - loadedAt < CACHE_MS) return cache;

        const [rows] = await pool.promise().query(
            `SELECT TABLE_SCHEMA AS db, TABLE_NAME AS tbl, COLUMN_NAME AS col,
                    DATA_TYPE AS type, COLUMN_KEY AS ckey, EXTRA AS extra
             FROM information_schema.COLUMNS
             WHERE LOWER(TABLE_SCHEMA) IN (?)
             ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION`,
            [ALLOWED_DATABASES.map((d) => d.toLowerCase())]
        );

        const schema = {};
        for (const r of rows) {
            schema[r.db] = schema[r.db] || { name: r.db, tables: {} };
            const t = (schema[r.db].tables[r.tbl] = schema[r.db].tables[r.tbl] || {
                name: r.tbl,
                db: r.db,
                columns: []
            });
            t.columns.push({
                name: r.col,
                type: r.type,
                isPrimary: r.ckey === 'PRI',
                isAutoIncrement: /auto_increment/i.test(r.extra || ''),
                isText: TEXT_TYPES.includes(r.type)
            });
        }
        cache = schema;
        loadedAt = Date.now();
        return schema;
    }

    return {
        ALLOWED_DATABASES,

        invalidate() {
            cache = null;
        },

        // Databases that exist and are allowed, using their real (server) names.
        async databases() {
            const schema = await load();
            return Object.keys(schema).sort();
        },

        // Case-insensitive lookup of a database. Returns its real name or null.
        async resolveDb(name) {
            if (typeof name !== 'string') return null;
            const schema = await load();
            const key = Object.keys(schema).find((k) => k.toLowerCase() === name.toLowerCase());
            return key || null;
        },

        async tables(db) {
            const real = await this.resolveDb(db);
            if (!real) return null;
            const schema = await load();
            return Object.keys(schema[real].tables).sort();
        },

        // Returns { db, name, columns, primaryKeys } or null if not whitelisted.
        async resolveTable(db, table) {
            const realDb = await this.resolveDb(db);
            if (!realDb || typeof table !== 'string') return null;
            const schema = await load();
            const tables = schema[realDb].tables;
            const key = Object.keys(tables).find((k) => k.toLowerCase() === table.toLowerCase());
            if (!key) return null;
            const t = tables[key];
            return {
                db: realDb,
                name: t.name,
                columns: t.columns,
                primaryKeys: t.columns.filter((c) => c.isPrimary).map((c) => c.name)
            };
        },

        // Every table in the allowed databases (used by global search).
        async allTables() {
            const schema = await load();
            const out = [];
            for (const db of Object.keys(schema).sort()) {
                for (const name of Object.keys(schema[db].tables).sort()) {
                    const t = schema[db].tables[name];
                    out.push({ db, name, columns: t.columns, primaryKeys: t.columns.filter((c) => c.isPrimary).map((c) => c.name) });
                }
            }
            return out;
        }
    };
}

// `db`.`table` with both parts safely quoted.
function qualified(t) {
    return `${mysql.escapeId(t.db)}.${mysql.escapeId(t.name)}`;
}

module.exports = { createSchema, qualified, ALLOWED_DATABASES };
