const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const mysql = require('mysql2');
const path=require('path');
const { createSchema, qualified } = require('./lib/schema');

const app = express();
const port = process.env.PORT || 3000;
const livereload=require('livereload');
const connectLiveReload=require('connect-livereload');
const { error } = require('console');
const { spawn } = require('child_process');
dotenv.config({ path: './.env' });

//Start PHP server for phpMyAdmin automatically
//(skipped in Docker — the docker-compose setup runs phpMyAdmin as its own container)
if (process.env.SKIP_PHP_ADMIN !== 'true') {
    const phpServer=spawn('php',['-S','localhost:8000'],{
        cwd:path.join(__dirname,'phpmyadmin')
    });

    phpServer.stdout.on('data',(data)=>{
        console.log(`phpMyAdmin:${data}`);
    });
    phpServer.stderr.on('data',(data)=>{
        console.log(`phpMyAdmin:${data}`);
    });
    phpServer.on('close',(code)=>{
        console.log(`phpMyAdmin server exited with code ${code}`);
    });

    //Make sure the PHP server shuts down when the Node app stops
    process.on('exit',()=>{
        phpServer.kill();
    });
    process.on('SIGINT',()=>{
        phpServer.kill();
        process.exit();
    });
}

//Live reload is a development convenience only
if (process.env.NODE_ENV !== 'production') {
    //Create livereload server
    const liveReloadServer=livereload.createServer();
    liveReloadServer.watch([
        path.join(__dirname,'views'),
        path.join(__dirname,'styles'),
        path.join(__dirname,'assets'),
        path.join(__dirname,'app.js')
    ]);

    //Wait for server to restart, then refresh the browser
    liveReloadServer.server.once("connection",()=>{
        setTimeout(()=>{
            liveReloadServer.refresh("/");
        },100);
    });

    //Add middleware to inject the livereload script into the pages
    app.use(connectLiveReload());
}

// Use cors middleware
app.use(cors());

// Database details
const dbcon = {
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : 3306,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE,
    dateStrings: true // keep DATE columns as 'YYYY-MM-DD' so edits round-trip cleanly
};

const conn = mysql.createPool(dbcon);
const schema = createSchema(conn);
const db = conn.promise();

// Verify the pool can reach the database (individual queries still get their
// own connection on demand, so this is just a startup log, not a requirement)
conn.getConnection((err, connection) => {
    if (err) {
        console.log('Error connecting to database:', err);
        return;
    }
    console.log('Database connected successfully');
    connection.release();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());  // To handle JSON data


// Setting static files from 'styles' directory
app.use(express.static('styles'));
// Setting static files from 'assets' directory
app.use(express.static('assets'));

// Set up Handlebars with a custom helper
const handlebars = exphbs.create({
    extname: '.hbs',
    defaultLayout: false,
    helpers: {
        notEqual: function (value1, value2, options) {
            return value1 !== value2 ? options.fn(this) : options.inverse(this);
        },
        eq: function (v1, v2) {
            return v1 === v2;
        },
        and: function () {
            return Array.prototype.every.call(arguments, function (arg) {
                // Exclude final argument (Handlebars options object)
                return arg !== false && arg !== undefined && arg !== null && arg !== '' && typeof arg !== 'object';
            });
        },
        matchAnimeType: function (selectedTable, field, options) {
            return selectedTable === "Anime" && field === "Type"
                ? options.fn(this)
                : options.inverse(this);
        }
    },
});

app.engine('hbs', handlebars.engine);
app.set('view engine', 'hbs');
app.set('views', './views');

// Routes
app.get('/', (req, res) => {
    res.render('homepage', {
        title: 'My Home Library',
        welcomeMessage: 'Welcome to My Home Library',
        createDB: 'Create Database/Table(s)',
        addDatabutton: 'Add Data'
    });
});

app.get('/index', async (req, res) => {
    try {
        const databases = await schema.databases();
        res.render('index', { databases });
    } catch (err) {
        console.error('Error listing databases:', err);
        res.status(500).send('Error listing databases');
    }
});

// Shared by the POST (database selector) and GET (Back button from form) variants
async function renderTables(selectedDBInput, res) {
    try {
        const selectedDB = await schema.resolveDb(selectedDBInput);
        if (!selectedDB) return res.status(400).send('Invalid database selected');
        const tables = await schema.tables(selectedDB);
        res.render('tables', { selectedDB, tables });
    } catch (err) {
        console.error('Error listing tables:', err);
        res.status(500).send('Error listing tables');
    }
}

// Route to display tables in the selected database
app.post('/tables', (req, res) => renderTables(req.body.database, res));

//set the writers' list in the form as a dropdown box
const writerDB='Writer';

//Foreign key relationships specific to the "shelf" database
const shelfForeignKeys={
    E_Writer:{table:`${writerDB}.Egypt_Author`,column:'Ename'},
    SN_Writer:{table:`${writerDB}.Author`,column:'Authname'},
    CH_Writer:{table:`${writerDB}.CH_Author`,column:'Hname'},
    A_Writer:{table:`${writerDB}.Folk_Author`,column:'Fname'},
    Arabia_Writer:{table:`${writerDB}.Arabia_Author`,column:'Arname'},
    Asia_Writer:{table:`${writerDB}.Asia_Author`,column:'Asname'},
    C_Writer:{table:`${writerDB}.C_Author`,column:'Cname'},
    I_Writer:{table:`${writerDB}.India_Author`,column:'Iname'},
    Myth_Writer:{table:`${writerDB}.Myth_Author`,column:'Mname'},
    Penguin_Writer:{table:`${writerDB}.Penguin_Author`,column:'Name'},
    Sr_Writer:{table:`${writerDB}.Sr_Author`,column:'Srname'}
};

app.post('/form', async (req, res) => {
    try {
        const table = await schema.resolveTable(req.body.database, req.body.table);
        if (!table) return res.status(400).send('Invalid database or table');

        const columns = await dropdownColumns(table, table.columns.filter((c) => !c.isAutoIncrement));
        res.render('form', { selectedDB: table.db, selectedTable: table.name, columns });
    } catch (err) {
        console.error('Error building form:', err);
        res.status(500).send('Error fetching table columns');
    }
});

// Turns schema columns into the {Field, isForeignKey, dropdownValues} shape the
// form template expects. Only the Shelf database has author foreign keys.
async function dropdownColumns(table, cols) {
    const out = [];
    for (const c of cols) {
        const col = { Field: c.name };
        const fk = table.db.toLowerCase() === 'shelf' ? shelfForeignKeys[c.name] : null;
        if (fk) {
            const [rows] = await db.query(`SELECT ${fk.column} FROM ${fk.table}`);
            col.isForeignKey = true;
            col.dropdownValues = rows.map((row) => row[fk.column]);
        }
        out.push(col);
    }
    return out;
}

app.post('/submit', async (req, res) => {
    try {
        const table = await schema.resolveTable(req.body.database, req.body.table);
        if (!table) return res.json({ message: 'Invalid database or table', messageType: 'error' });

        const formData = pickColumns(req.body, table);
        if (Object.keys(formData).length === 0) {
            return res.json({ message: 'No data to insert', messageType: 'error' });
        }

        await db.query(`INSERT INTO ${qualified(table)} SET ?`, [formData]);
        res.json({ message: 'Data submitted successfully!', messageType: 'success' });
    } catch (err) {
        console.error('Error submitting data:', err);
        res.json({ message: 'Error submitting data', messageType: 'error' });
    }
});

// Keeps only real, non-auto-increment columns from a request body; '' becomes NULL
function pickColumns(body, table) {
    const data = {};
    for (const c of table.columns) {
        if (c.isAutoIncrement || !(c.name in body)) continue;
        const v = body[c.name];
        data[c.name] = v === '' ? null : v;
    }
    return data;
}

//Clamps a requested page number into 1..pages and works out the OFFSET
function paginate(total, requested, size) {
    const pages = Math.max(1, Math.ceil(total / size));
    const page = Math.min(Math.max(1, parseInt(requested, 10) || 1), pages);
    return { total, size, pages, page, offset: (page - 1) * size, paged: pages > 1, hasPrev: page > 1, hasNext: page < pages };
}

//Route to fetch Anime and Manga titles, one page of each at a time
const COLLECTION_PAGE_SIZE = 25;
app.get('/anime-manga', async (req, res) => {
    try {
        const [[{ n: animeTotal }]] = await db.query('SELECT COUNT(*) AS n FROM Collection.Anime');
        const [[{ n: mangaTotal }]] = await db.query('SELECT COUNT(*) AS n FROM Collection.Manga');
        const anime = paginate(animeTotal, req.query.apage, COLLECTION_PAGE_SIZE);
        const manga = paginate(mangaTotal, req.query.mpage, COLLECTION_PAGE_SIZE);
        const tab = req.query.tab === 'manga' ? 'manga' : 'anime';

        const [animeRows] = await db.query(
            'SELECT * FROM Collection.Anime ORDER BY No LIMIT ? OFFSET ?', [anime.size, anime.offset]);
        const [mangaRows] = await db.query(
            'SELECT * FROM Collection.Manga ORDER BY No LIMIT ? OFFSET ?', [manga.size, manga.offset]);

        //Each pager link keeps the other tab's page so switching tabs doesn't reset it
        const link = (t, a, m) => `/anime-manga?tab=${t}&apage=${a}&mpage=${m}`;
        res.render('anime-manga', {
            anime: animeRows,
            manga: mangaRows,
            animeActive: tab === 'anime',
            mangaActive: tab === 'manga',
            animePager: { ...anime, prevUrl: link('anime', anime.page - 1, manga.page), nextUrl: link('anime', anime.page + 1, manga.page) },
            mangaPager: { ...manga, prevUrl: link('manga', anime.page, manga.page - 1), nextUrl: link('manga', anime.page, manga.page + 1) }
        });
    } catch (err) {
        console.error('Error fetching anime/manga:', err);
        res.status(500).send('Error fetching anime and manga data');
    }
});

//Route to fetch Show and Movie titles
app.get('/watchlist',(req,res)=>{
    conn.query(`SELECT * FROM Collection.Shows`,(err,showsResults)=>{
        if (err){
            console.error('Error fetching Shows:',err);
            return res.status(500).send('Error fetching shows data');
        }
        conn.query(`SELECT * FROM Collection.Movies`,(err,moviesResults)=>{
            if (err){
                console.error('Error fetching movies:',err);
                return res.status(500).send('Error fetching movies data');
            }
            res.render('watchlist',{
                shows:showsResults,
                movies:moviesResults
            });
        });
    });
});

//Route to fetch Names from all tables in the Name DB
app.get('/names',(req,res)=>{   //Just renders the page
    res.render('names');
});

//Returns one page of a names table as JSON when a filter button is clicked
const NAMES_PAGE_SIZE = 50;
const NAMES_ORDER = { Male: 'Name', Female: 'Name', Unisex: 'Name', Latin: 'Phrase', Japanese: 'No' };
app.get('/fetch-names', async (req, res) => {
    const table = req.query.table;
    if (!Object.prototype.hasOwnProperty.call(NAMES_ORDER, table)) {
        return res.status(400).json({ error: 'Invalid table selected.' });
    }
    try {
        const [[{ n }]] = await db.query(`SELECT COUNT(*) AS n FROM Names.${table}`);
        const p = paginate(n, req.query.page, NAMES_PAGE_SIZE);
        const [rows] = await db.query(
            `SELECT * FROM Names.${table} ORDER BY ${NAMES_ORDER[table]} LIMIT ? OFFSET ?`, [p.size, p.offset]);
        res.json({ rows, total: p.total, page: p.page, pages: p.pages, size: p.size });
    } catch (err) {
        console.error('Error fetching names:', err);
        res.status(500).json({ error: 'Error fetching names' });
    }
});

// GET — Back button from form.hbs
app.get('/tables', (req, res) => {
    if (!req.query.db) return res.redirect('/index');
    renderTables(req.query.db, res);
});

// ---------------------------------------------------------------------------
// Row browser: paginated, searchable, sortable view of any whitelisted table,
// with edit and delete for tables that have a primary key.
// ---------------------------------------------------------------------------
const PAGE_SIZE = 25;

// Escapes LIKE wildcards so a search for "100%" matches literally
function likePattern(term) {
    return '%' + term.replace(/[\\%_]/g, '\\$&') + '%';
}

// Builds the WHERE clause matching one row from its primary-key values.
// Returns null unless `key` supplies exactly the table's primary-key columns.
function keyWhere(table, key) {
    const pks = table.primaryKeys;
    if (!pks.length || !key || typeof key !== 'object') return null;
    if (Object.keys(key).length !== pks.length) return null;
    if (!pks.every((k) => key[k] !== undefined && key[k] !== null)) return null;
    return {
        sql: pks.map((k) => `${mysql.escapeId(k)} = ?`).join(' AND '),
        params: pks.map((k) => key[k])
    };
}

app.get('/rows', async (req, res) => {
    try {
        const table = await schema.resolveTable(req.query.db || req.query.database, req.query.table);
        if (!table) return res.status(400).send('Invalid database or table');

        const q = (req.query.q || '').toString().trim();
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const sortCol = table.columns.find((c) => c.name === req.query.sort);
        const dir = req.query.dir === 'desc' ? 'DESC' : 'ASC';

        const params = [];
        let where = '';
        const textCols = table.columns.filter((c) => c.isText);
        if (q && textCols.length) {
            where = 'WHERE ' + textCols.map((c) => `${mysql.escapeId(c.name)} LIKE ?`).join(' OR ');
            textCols.forEach(() => params.push(likePattern(q)));
        }

        const order = sortCol ? `ORDER BY ${mysql.escapeId(sortCol.name)} ${dir}` : '';
        const from = qualified(table);

        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM ${from} ${where}`, params);
        const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const current = Math.min(page, pages);
        const [rows] = await db.query(
            `SELECT * FROM ${from} ${where} ${order} LIMIT ? OFFSET ?`,
            [...params, PAGE_SIZE, (current - 1) * PAGE_SIZE]
        );

        const editable = table.primaryKeys.length > 0;
        const view = rows.map((row) => ({
            key: editable ? JSON.stringify(Object.fromEntries(table.primaryKeys.map((k) => [k, row[k]]))) : '',
            cells: table.columns.map((c) => ({
                name: c.name,
                value: row[c.name] === null ? '' : String(row[c.name]),
                isNull: row[c.name] === null,
                readonly: c.isAutoIncrement
            }))
        }));

        const base = `/rows?db=${encodeURIComponent(table.db)}&table=${encodeURIComponent(table.name)}`
            + (q ? `&q=${encodeURIComponent(q)}` : '');
        const sortBase = sortCol ? `&sort=${encodeURIComponent(sortCol.name)}&dir=${dir.toLowerCase()}` : '';

        res.render('rows', {
            db: table.db,
            table: table.name,
            columns: table.columns.map((c) => ({
                name: c.name,
                sortUrl: `${base}&sort=${encodeURIComponent(c.name)}&dir=${sortCol && sortCol.name === c.name && dir === 'ASC' ? 'desc' : 'asc'}`,
                sorted: sortCol && sortCol.name === c.name ? (dir === 'ASC' ? '▲' : '▼') : ''
            })),
            rows: view,
            editable,
            q,
            total,
            page: current,
            pages,
            hasPrev: current > 1,
            hasNext: current < pages,
            prevUrl: `${base}${sortBase}&page=${current - 1}`,
            nextUrl: `${base}${sortBase}&page=${current + 1}`
        });
    } catch (err) {
        console.error('Error browsing rows:', err);
        res.status(500).send('Error fetching rows');
    }
});

// Update one row, identified by its primary key
app.put('/row', async (req, res) => {
    try {
        const table = await schema.resolveTable(req.body.database, req.body.table);
        if (!table) return res.status(400).json({ message: 'Invalid database or table', messageType: 'error' });

        const where = keyWhere(table, req.body.key);
        if (!where) return res.status(400).json({ message: 'Row cannot be identified', messageType: 'error' });

        const values = pickColumns(req.body.values || {}, table);
        if (Object.keys(values).length === 0) {
            return res.status(400).json({ message: 'Nothing to update', messageType: 'error' });
        }

        const [result] = await db.query(
            `UPDATE ${qualified(table)} SET ? WHERE ${where.sql} LIMIT 1`,
            [values, ...where.params]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Row not found', messageType: 'error' });
        }
        res.json({ message: 'Row updated', messageType: 'success' });
    } catch (err) {
        console.error('Error updating row:', err);
        res.status(500).json({ message: friendlyDbError(err, 'Error updating row'), messageType: 'error' });
    }
});

// Delete one row, identified by its primary key
app.delete('/row', async (req, res) => {
    try {
        const table = await schema.resolveTable(req.body.database, req.body.table);
        if (!table) return res.status(400).json({ message: 'Invalid database or table', messageType: 'error' });

        const where = keyWhere(table, req.body.key);
        if (!where) return res.status(400).json({ message: 'Row cannot be identified', messageType: 'error' });

        const [result] = await db.query(
            `DELETE FROM ${qualified(table)} WHERE ${where.sql} LIMIT 1`,
            where.params
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Row not found', messageType: 'error' });
        }
        res.json({ message: 'Row deleted', messageType: 'success' });
    } catch (err) {
        console.error('Error deleting row:', err);
        res.status(500).json({ message: friendlyDbError(err, 'Error deleting row'), messageType: 'error' });
    }
});

// Foreign keys tie books to authors; say so instead of a generic failure
function friendlyDbError(err, fallback) {
    if (err.errno === 1451) return 'Other records still reference this row (e.g. an author with books). Remove those first.';
    if (err.errno === 1452) return 'That value does not exist in the linked table (e.g. unknown author).';
    if (err.errno === 1062) return 'A row with that key already exists.';
    return fallback;
}

// ---------------------------------------------------------------------------
// Global search across every text column of every table
// ---------------------------------------------------------------------------
const GLOBAL_LIMIT = 10;

app.get('/search', async (req, res) => {
    const q = (req.query.q || '').toString().trim();
    if (q.length < 2) {
        return res.render('search', { q, tooShort: q.length > 0, groups: [], totalHits: 0 });
    }
    try {
        const tables = (await schema.allTables()).filter((t) => t.columns.some((c) => c.isText));
        const pattern = likePattern(q);

        const groups = (await Promise.all(tables.map(async (t) => {
            const textCols = t.columns.filter((c) => c.isText);
            const where = textCols.map((c) => `${mysql.escapeId(c.name)} LIKE ?`).join(' OR ');
            const params = textCols.map(() => pattern);
            const [rows] = await db.query(
                `SELECT * FROM ${qualified(t)} WHERE ${where} LIMIT ?`,
                [...params, GLOBAL_LIMIT + 1]
            );
            if (!rows.length) return null;
            return {
                db: t.db,
                table: t.name,
                more: rows.length > GLOBAL_LIMIT,
                link: `/rows?db=${encodeURIComponent(t.db)}&table=${encodeURIComponent(t.name)}&q=${encodeURIComponent(q)}`,
                columns: t.columns.map((c) => c.name),
                rows: rows.slice(0, GLOBAL_LIMIT).map((r) => t.columns.map((c) => (r[c.name] === null ? null : String(r[c.name]))))
            };
        }))).filter(Boolean);

        res.render('search', {
            q,
            groups,
            totalHits: groups.reduce((n, g) => n + g.rows.length, 0)
        });
    } catch (err) {
        console.error('Error in global search:', err);
        res.status(500).send('Error searching');
    }
});

// Old URL from the previous release of this page
app.get('/global-search', (req, res) => {
    const q = req.query.q ? `?q=${encodeURIComponent(req.query.q.toString())}` : '';
    res.redirect(301, `/search${q}`);
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});