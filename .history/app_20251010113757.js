const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const mysql = require('mysql2');

const app = express();
const port = 3000;
dotenv.config({ path: './.env' });

// Use cors middleware
app.use(cors());

// Database details
const dbcon = {
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
};

const conn = mysql.createConnection(dbcon);

// Connecting to database
conn.connect((err) => {
    if (err) {
        console.log('Error connecting to database:', err);
        return;
    }
    console.log('Database connected successfully');
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

app.get('/index', (req, res) => {
    conn.query('SHOW DATABASES', (err, results) => {
        if (err) throw err;
        const databases = results.map((result) => result.Database);
        res.render('index', { databases });
    });
});

app.post('/tables', (req, res) => {
    const selectedDB = req.body.database;

    conn.query(`USE ${selectedDB}`, (err) => {
        if (err) throw err;

        conn.query('SHOW TABLES', (err, results) => {
            if (err) throw err;
            const tables = results.map((result) => Object.values(result)[0]);
            res.render('tables', { selectedDB, tables });
        });
    });
});
// Route to fetch parent tables and render the dropdown
app.get('/search', (req, res) => {
    const sql = 'SHOW TABLES FROM Writer';
    conn.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching parent tables:', err);
            return res.status(500).send('Error fetching parent tables');
        }
        // Extract table names
        const tables = results.map(row => Object.values(row)[0]);
        res.render('search', { tables });
    });
});

// Route to fetch author names from the selected parent table
app.post('/fetch-authors', (req, res) => {
    const selectedTable = req.body.table;
    // Map of tables to their foreign key column names
    const foreignColumns = {
        'Author': 'Authname',
        'Arabia_Author': 'Arname',
        'Asia_Author': 'Asname',
        'C_Author': 'Cname',
        'Egypt_Author': 'Ename',
        'Folk_Author': 'Fname',
        'India_Author': 'Iname',
        'Myth_Author': 'Mname',
        'Penguin_Author': 'Name',
        'Sr_Author': 'Srname',
        'CH_Author': 'Hname'
    };

    const columnName = foreignColumns[selectedTable];
    if (!columnName) {
        return res.status(400).send('Invalid table selected');
    }
    const sql = `SELECT ${columnName} FROM Writer.${selectedTable}`;
    conn.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching authors:', err);
            return res.status(500).send('Error fetching authors');
        }
        // Extract the author names (column values)
        const authors = results.map(row => Object.values(row)[0]);
        res.json(authors);
    });
});

// Route to fetch book titles from child tables based on the selected author
app.post('/fetch-titles', (req, res) => {
    const selectedTable = req.body.table;  // Parent table
    const selectedAuthor = req.body.author;  // Selected author
    // Map of child tables to their foreign key columns and parent tables
    const childTableMapping = {
        'Egypt_Author': { table: 'AncientEgypt', column: 'E_Writer', titleColumn: 'Title' },
        'Folk_Author': { table: 'Anthology', column: 'A_Writer', titleColumn: 'Bname' },
        'Arabia_Author': { table: 'ArabianFantasy', column: 'Arabia_Writer', titleColumn: 'Title' },
        'Asia_Author': { table: 'AsianFantasy', column: 'Asia_Writer', titleColumn: 'Title' },
        'C_Author': { table: 'Classics', column: 'C_Writer', titleColumn: 'Bname' },
        'India_Author': { table: 'Indiabooks', column: 'I_Writer', titleColumn: 'Title' },
        'Myth_Author': { table: 'MythsRetold', column: 'Myth_Writer', titleColumn: 'Title' },
        'Penguin_Author': { table: 'PenguinBooks', column: 'Penguin_Writer', titleColumn: 'Bname' },
        'Sr_Author': { table: 'Series', column: 'Sr_Writer', titleColumn: 'Title' },
        'Author': { table: 'SingleNovel', column: 'SN_Writer', titleColumn: 'Bname' },
        'CH_Author': { table: 'ChildhoodReads', column: 'CH_Writer', titleColumn: 'Title' }
    };
    // Get child table and column based on the selected parent table
    const childDetails = childTableMapping[selectedTable];
    // Logging to check the selectedTable and childDetails
    console.log('Selected Table:', selectedTable);
    console.log('Child Details:', childDetails);
    // If no mapping found for the selected table, return an error
    if (!childDetails) {
        console.error('Invalid table or author selected');
        return res.status(400).send('Invalid table or author selected');
    }
    // Build the query using the title column and table
    const sql = `SELECT ${childDetails.titleColumn} AS Title FROM Shelf.${childDetails.table} WHERE ${childDetails.column} = ?`;
    // Logging the SQL query to see if it's correct
    console.log('SQL Query:', sql);
    // Execute the query
    conn.query(sql, [selectedAuthor], (err, results) => {
        if (err) {
            console.error('Error fetching titles:', err);
            return res.status(500).send('Error fetching titles');
        }
        // Extract the titles from the result
        const titles = results.map(row => row.Title);
        res.json(titles);
    });
});

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

app.post('/form', (req, res) => {
    const selectedDB = req.body.database;
    const selectedTable = req.body.table;

    // Fetch all columns in the selected table
    conn.query(`USE ${selectedDB}`,(err) =>{
        if(err){
            console.error('Error:',err);
            res.status(500).send('Error selecteing database');
            return;
        }

        // Fetch all columns in the selected table
        conn.query(`DESCRIBE ${}`)
    })
    /*
        // Fetch all columns in the selected table
        conn.query(`DESCRIBE ${selectedTable}`, (err, results) => {
            if (err) {
                console.error('Error:', err);
                res.status(500).send('Error fetching table columns');
                return;
            }
            const columns = results.filter((column) => column.Extra !== 'auto_increment');
            res.render('form', { selectedDB, selectedTable, columns });
        });
    });*/
});

app.post('/submit', (req, res) => {
    const selectedDB = req.body.database;
    const selectedTable = req.body.table;

    // Log the incoming form data and the full request body
    console.log('Received request body:', req.body);

    const formData = { ...req.body };
    delete formData.database; // Database info is used separately
    delete formData.table; // Table info is used separately

    // Check if formData contains any fields
    console.log('Processed formData:', formData);

    // Convert empty strings to null 
    for (const key in formData) {
        if (formData[key] === '') {
            formData[key] = null;
        }
    }

    if (Object.keys(formData).length === 0) {
        return res.json({
            message: 'No data to insert',
            messageType: 'error'
        });
    }

    conn.query(`USE ${selectedDB}`, (err) => {
        if (err) {
            console.log('Error:', err);
            return res.json({
                message: 'Error selecting database',
                messageType: 'error'
            });
        }

        const sql = `INSERT INTO ${selectedTable} SET ?`;
        console.log('SQL Query:', sql, formData);

        conn.query(sql, formData, (err, results) => {
            if (err) {
                console.log('Error:', err);
                return res.json({
                    message: 'Error submitting data',
                    messageType: 'error'
                });
            }
            res.json({
                message: 'Data submitted successfully!',
                messageType: 'success'
            });
        });
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});