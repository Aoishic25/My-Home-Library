// Unit tests for lib/schema.js (the SQL identifier whitelist).
// Run with `npm test`. No database needed: a fake pool stands in for MySQL.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSchema, qualified, ALLOWED_DATABASES } = require('../lib/schema');

// One row per column, shaped like the information_schema query in lib/schema.js
const col = (db, tbl, name, type, ckey = '', extra = '') => ({ db, tbl, col: name, type, ckey, extra });
const FIXTURE = [
    col('Shelf', 'Classics', 'Cno', 'int', 'PRI', 'auto_increment'),
    col('Shelf', 'Classics', 'Bname', 'char'),
    col('Shelf', 'Classics', 'C_Writer', 'char', 'MUL'),
    col('Writer', 'C_Author', 'Cname', 'char', 'PRI'),
    col('Writer', 'Pairs', 'a', 'int', 'PRI'),
    col('Writer', 'Pairs', 'b', 'int', 'PRI'),
    col('Names', 'Latin', 'Phrase', 'varchar'),
    col('Names', 'Latin', 'Meanings', 'text'),
    col('Names', 'Latin', 'Added', 'date'),
    col('Collection', 'Movies', 'No', 'int', 'PRI', 'auto_increment'),
    col('Collection', 'Movies', 'Title', 'varchar')
];

// Fake mysql2 pool. Records every query so tests can assert on the SQL and params.
function fakePool(rows = FIXTURE) {
    const calls = [];
    return {
        calls,
        promise() {
            return { query: async (sql, params) => { calls.push({ sql, params }); return [rows]; } };
        }
    };
}

test('queries information_schema for exactly the four allowed databases', async () => {
    const pool = fakePool();
    await createSchema(pool).databases();

    assert.equal(pool.calls.length, 1);
    assert.match(pool.calls[0].sql, /information_schema\.COLUMNS/);
    assert.deepEqual(pool.calls[0].params, [['shelf', 'collection', 'names', 'writer']]);
    assert.deepEqual(ALLOWED_DATABASES, ['Shelf', 'Collection', 'Names', 'Writer']);
});

test('databases() lists the allowed databases that exist, sorted', async () => {
    assert.deepEqual(await createSchema(fakePool()).databases(), ['Collection', 'Names', 'Shelf', 'Writer']);
});

test('resolveDb matches case-insensitively and returns the real name', async () => {
    const s = createSchema(fakePool());
    assert.equal(await s.resolveDb('shelf'), 'Shelf');
    assert.equal(await s.resolveDb('SHELF'), 'Shelf');
    assert.equal(await s.resolveDb('Writer'), 'Writer');
});

test('resolveDb rejects databases that are not whitelisted', async () => {
    const s = createSchema(fakePool());
    const bad = ['mysql', 'sys', 'information_schema', 'performance_schema', '', 'Shelf; DROP DATABASE Shelf', 'Shelf ', '`Shelf`', "Shelf' --"];
    for (const name of bad) {
        assert.equal(await s.resolveDb(name), null, `should reject ${JSON.stringify(name)}`);
    }
});

test('resolveDb and resolveTable reject non-string input', async () => {
    const s = createSchema(fakePool());
    for (const bad of [undefined, null, 42, {}, [], ['Shelf'], { toString: () => 'Shelf' }]) {
        assert.equal(await s.resolveDb(bad), null);
        assert.equal(await s.resolveTable('Shelf', bad), null);
        assert.equal(await s.resolveTable(bad, 'Classics'), null);
    }
});

test('tables() lists the tables of a database, sorted, or null for an unknown database', async () => {
    const s = createSchema(fakePool());
    assert.deepEqual(await s.tables('writer'), ['C_Author', 'Pairs']);
    assert.equal(await s.tables('mysql'), null);
    assert.equal(await s.tables(undefined), null);
});

test('resolveTable returns real db and table names for case-insensitive input', async () => {
    const t = await createSchema(fakePool()).resolveTable('shelf', 'classics');
    assert.equal(t.db, 'Shelf');
    assert.equal(t.name, 'Classics');
    assert.deepEqual(t.columns.map((c) => c.name), ['Cno', 'Bname', 'C_Writer']);
});

test('resolveTable rejects unknown tables, injection attempts and object-prototype keys', async () => {
    const s = createSchema(fakePool());
    const bad = [
        'Nope',
        '',
        'Classics; DROP TABLE Classics',
        'Classics`',
        '`Classics`',
        'Classics --',
        "Classics' OR '1'='1",
        'Classics ',
        'Shelf.Classics',
        'constructor',
        '__proto__',
        'hasOwnProperty',
        'toString'
    ];
    for (const name of bad) {
        assert.equal(await s.resolveTable('Shelf', name), null, `should reject ${JSON.stringify(name)}`);
    }
});

test('a table is only found in its own database', async () => {
    const s = createSchema(fakePool());
    assert.equal(await s.resolveTable('Shelf', 'C_Author'), null);
    assert.equal((await s.resolveTable('Writer', 'C_Author')).db, 'Writer');
});

test('resolveTable rejects tables in databases outside the whitelist', async () => {
    const s = createSchema(fakePool());
    assert.equal(await s.resolveTable('mysql', 'user'), null);
    assert.equal(await s.resolveTable('information_schema', 'COLUMNS'), null);
});

test('column metadata: primary keys, auto-increment and text detection', async () => {
    const s = createSchema(fakePool());

    const classics = await s.resolveTable('Shelf', 'Classics');
    assert.deepEqual(classics.primaryKeys, ['Cno']);
    const [cno, bname, writer] = classics.columns;
    assert.equal(cno.isPrimary, true);
    assert.equal(cno.isAutoIncrement, true);
    assert.equal(cno.isText, false);
    assert.equal(bname.isText, true);
    assert.equal(bname.isPrimary, false);
    // MUL (a foreign-key index) is not a primary key
    assert.equal(writer.isPrimary, false);

    const latin = await s.resolveTable('Names', 'Latin');
    assert.deepEqual(latin.columns.map((c) => [c.name, c.isText]), [['Phrase', true], ['Meanings', true], ['Added', false]]);
});

test('composite and missing primary keys', async () => {
    const s = createSchema(fakePool());
    assert.deepEqual((await s.resolveTable('Writer', 'Pairs')).primaryKeys, ['a', 'b']);
    assert.deepEqual((await s.resolveTable('Names', 'Latin')).primaryKeys, []);
});

test('allTables() covers every table, ordered by database then table', async () => {
    const all = await createSchema(fakePool()).allTables();
    assert.deepEqual(all.map((t) => `${t.db}.${t.name}`), [
        'Collection.Movies',
        'Names.Latin',
        'Shelf.Classics',
        'Writer.C_Author',
        'Writer.Pairs'
    ]);
    assert.deepEqual(all.find((t) => t.name === 'Movies').primaryKeys, ['No']);
});

test('an empty schema resolves nothing', async () => {
    const s = createSchema(fakePool([]));
    assert.deepEqual(await s.databases(), []);
    assert.equal(await s.resolveDb('Shelf'), null);
    assert.equal(await s.resolveTable('Shelf', 'Classics'), null);
    assert.deepEqual(await s.allTables(), []);
});

test('schema is cached, reloads after invalidate() and after the TTL', async () => {
    const pool = fakePool();
    const s = createSchema(pool);
    const realNow = Date.now;
    let now = 1_000_000;
    Date.now = () => now;
    try {
        await s.databases();
        await s.resolveTable('Shelf', 'Classics');
        await s.tables('Names');
        assert.equal(pool.calls.length, 1, 'served from cache');

        s.invalidate();
        await s.databases();
        assert.equal(pool.calls.length, 2, 'invalidate() forces a reload');

        now += 29_000;
        await s.databases();
        assert.equal(pool.calls.length, 2, 'still cached just under the TTL');

        now += 2_000;
        await s.databases();
        assert.equal(pool.calls.length, 3, 'reloads once the TTL has passed');
    } finally {
        Date.now = realNow;
    }
});

test('a newly created table is picked up after the cache is invalidated', async () => {
    const rows = [...FIXTURE];
    const s = createSchema(fakePool(rows));
    assert.equal(await s.resolveTable('Shelf', 'Fresh'), null);

    rows.push(col('Shelf', 'Fresh', 'Id', 'int', 'PRI'));
    assert.equal(await s.resolveTable('Shelf', 'Fresh'), null, 'still cached');
    s.invalidate();
    assert.equal((await s.resolveTable('Shelf', 'Fresh')).name, 'Fresh');
});

test('a failed load surfaces the error instead of resolving anything', async () => {
    const pool = { promise: () => ({ query: async () => { throw new Error('db down'); } }) };
    const s = createSchema(pool);
    await assert.rejects(() => s.resolveTable('Shelf', 'Classics'), /db down/);
    await assert.rejects(() => s.databases(), /db down/);
});

test('qualified() quotes both parts and escapes embedded backticks', () => {
    assert.equal(qualified({ db: 'Shelf', name: 'Classics' }), '`Shelf`.`Classics`');
    assert.equal(qualified({ db: 'a`b', name: 'c`; DROP TABLE x; --' }), '`a``b`.`c``; DROP TABLE x; --`');
});
