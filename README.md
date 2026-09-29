# 📚 My Home Library

A personal web application for cataloguing and browsing a home library collection — including books, media, anime, manga, and name references — organized by genre, category, and author.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Databases](#databases)
- [Pages & Routes](#pages--routes)
- [Getting Started](#getting-started)
- [Features](#features)

---

## Overview

My Home Library is a Node.js web application that serves as a personal digital catalogue. It connects to multiple MySQL databases to display, search, and manage a large collection of books (organized by genre and series), media (anime, manga, movies, shows, and videogames), author information, and name references. The UI uses a glassmorphism design system with animated background art across all pages.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Templating | Handlebars (`.hbs`) |
| Database | MySQL |
| DB Admin | phpMyAdmin |
| Styling | CSS (9 stylesheets) |
| Live Reload | livereload + connect-livereload |
| Entry Point | `app.js` |
| Schema whitelist | `lib/schema.js` |

---

## Project Structure

```
Sites/
├── app.js                  # Main application entry point
├── package.json            # Project dependencies and scripts
├── package-lock.json
├── Dockerfile              # Builds the Node app image
├── docker-compose.yml      # App + MySQL + phpMyAdmin, wired together
├── .env.example            # Template for the required .env values
├── docker/
│   └── db/init/            # MySQL seed data (gitignored — see its own README)
├── assets/                 # Background images
│   ├── bg1.jpg – bg5.jpg   # Used across existing pages
│   ├── bg6.jpg             # Anime/Manga, Watchlist, Book Browser pages
│   └── bg8.jpg             # Library of Names page
├── styles/                 # CSS stylesheets
│   ├── style1.css          # Homepage
│   ├── style2.css          # Index / database selector
│   ├── style3.css          # Tables view
│   ├── style4.css          # Form (data entry)
│   ├── style5.css          # Search page
│   ├── style6.css          # Anime & Manga page
│   ├── style7.css          # Watchlist page
│   ├── style8.css          # Library of Names page
│   └── style9.css          # Book Browser page
├── views/                  # Handlebars templates
│   ├── homepage.hbs        # Home page
│   ├── index.hbs           # Database selector
│   ├── tables.hbs          # Table list view
│   ├── form.hbs            # Data entry form
│   ├── search.hbs          # Author/title search
│   ├── anime-manga.hbs     # Anime & Manga browser
│   ├── watchlist.hbs       # Watchlist (shows & movies)
│   ├── names.hbs           # Library of Names
│   └── books.hbs           # Book Browser
├── vendor/                 # Third-party libraries (native/phpMyAdmin setup only)
├── phpmyadmin/             # Standalone phpMyAdmin install (native setup only, not tracked in git)
└── node_modules/           # npm dependencies
```

---

## Databases

The application draws from four MySQL databases.

### `shelf` — Book Collection

Organizes books by genre across 11 tables. All tables share the same structure: a primary key, a title column (`Title` or `Bname`), and a foreign key linking to the `Writer` database.

| Table | Title Column | Writer Column | Extra |
|---|---|---|---|
| `AncientEgypt` | Title | E_Writer | |
| `Anthology` | Bname | A_Writer | |
| `ArabianFantasy` | Title | Arabia_Writer | |
| `AsianFantasy` | Title | Asia_Writer | |
| `ChildhoodReads` | Title | CH_Writer | |
| `Classics` | Bname | C_Writer | |
| `IndiaBooks` | Title | I_Writer | |
| `MythsRetold` | Title | Myth_Writer | |
| `PenguinBooks` | Bname | Penguin_Writer | |
| `Series` | Title | Sr_Writer | Num_of_Books |
| `SingleNovel` | Bname | SN_Writer | |

---

### `Collection` — Media Collection

| Table | Description |
|---|---|
| `Anime` | Anime series and films (Name, Japanese, seasons, Type) |
| `Manga` | Manga volumes (Name, Japanese, Hepburn, Writer, Volumes) |
| `Movies` | Feature films |
| `Shows` | TV shows and series |
| `Videogames` | Video game titles |

---

### `Names` — Name Reference Database

| Table | Columns |
|---|---|
| `Female` | Name, Meanings |
| `Male` | Name, Meanings |
| `Unisex` | Name, Meanings |
| `Latin` | Phrase, Meanings |
| `Japanese` | No, Name, Gender, Meanings |

---

### `Writer` — Author Database

Stores author information linked to the `shelf` database via foreign keys across 12 tables: `Author`, `Arabia_Author`, `Asia_Author`, `C_Author`, `CH_Author`, `Egypt_Author`, `Folk_Author`, `India_Author`, `Myth_Author`, `Penguin_Author`, `Poet`, `Sr_Author`.

---

## Pages & Routes

| Route | Method | Description |
|---|---|---|
| `/` | GET | Homepage |
| `/index` | GET | Database selector |
| `/tables` | POST | Show tables in selected database |
| `/form` | POST | Data entry form for selected table |
| `/submit` | POST | Insert form data into database |
| `/search` | GET | Search every text column of every table (`?q=`) |
| `/anime-manga` | GET | Anime & Manga browser (tabbed, 25 per page; `?tab=&apage=&mpage=`) |
| `/watchlist` | GET | Watchlist — Shows & Movies (tabbed) |
| `/names` | GET | Library of Names page |
| `/fetch-names` | GET | Returns one page (50) of names as JSON: `{rows,total,page,pages,size}` (`?table=&page=`) |
| `/books` | GET | Book Browser — all 11 shelf genres |
| `/rows` | GET | Paginated, sortable, filterable view of any table (`?db=&table=&q=&sort=&dir=&page=`) |
| `/row` | PUT | Update one row, identified by its primary key (JSON body) |
| `/row` | DELETE | Delete one row, identified by its primary key (JSON body) |
| `/global-search` | GET | Redirects to `/search` (old URL) |

---

## Getting Started

There are two ways to run this project: **Docker** (recommended — works the same on macOS, Windows, and Linux, no local MySQL/PHP install needed) or **native** (Node + a local MySQL server).

### Option A: Docker (recommended, especially for Windows)

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) only.

1. Clone the repository:

```bash
git clone https://github.com/Aoishic25/My-Home-Library.git
cd My-Home-Library
```

2. Copy the env template and set a password:

```bash
cp .env.example .env
```

Edit `.env` and set `DATABASE_PASSWORD` (this becomes the MySQL root password too — leave `DATABASE_USER=root` and `DATABASE_HOST=db` as-is).

3. Bring your data with you: `docker/db/init/*.sql` is gitignored (this repo is public, and the dump contains your personal library data), so it doesn't come with `git clone`. Copy your seed file into `docker/db/init/` on the new machine yourself — privately, via USB/AirDrop/cloud drive, not through the repo. See [`docker/db/init/README.md`](docker/db/init/README.md) for how to (re)generate it from an existing MySQL install.

4. Start everything:

```bash
docker compose up
```

This builds the Node app, starts MySQL seeded from any `.sql` file in `docker/db/init/` (your existing library data), and starts phpMyAdmin — all three linked together.

5. Open:
   - App: `http://localhost:3000`
   - phpMyAdmin: `http://localhost:8000` (log in as `root` / the password you set)

Once the databases are seeded (first run), they persist in a Docker volume across restarts — the seed file is only used the first time.

#### Everyday use

After the first-time setup above, running it again on any machine is just:

```bash
docker compose up
```

To stop it: `Ctrl+C`, or from another terminal, `docker compose down`.

| Want to... | Run |
|---|---|
| Run in the background (no terminal tied up) | `docker compose up -d` |
| Pick up code changes (app.js, views, styles, package.json) | `docker compose up --build` |
| Reset the database back to the seed file | `docker compose down -v` then `docker compose up` |
| View logs while running in the background | `docker compose logs -f` |

#### Troubleshooting

- **"port is already allocated"** — something else on your machine (a local MySQL/XAMPP install, another project) is already using that port. `docker-compose.yml` doesn't publish MySQL's port to the host by default for this reason; if you hit this for port 3000 or 8000 instead, either stop the other process or change the host-side port in `docker-compose.yml` (the left number in `"3000:3000"`).
- **phpMyAdmin login says access denied, or you changed `DATABASE_PASSWORD` and it didn't take effect** — MySQL only reads `MYSQL_ROOT_PASSWORD` (sourced from `DATABASE_PASSWORD`) the *first* time it initializes its data volume. Editing `.env` afterward doesn't retroactively change the running database's password. To apply a new password, either run `docker compose down -v` (wipes and reinitializes — you'll lose anything added since the seed) or log in with the *old* password and run `ALTER USER 'root'@'%' IDENTIFIED BY 'new_password'; FLUSH PRIVILEGES;` in phpMyAdmin's SQL tab.
- **Adding a book fails with a foreign key error, or the `db` container exits with "different lower_case_table_names"** — the seed's foreign keys mix upper/lower case, so the MySQL container runs with `--lower-case-table-names=1` (set in `docker-compose.yml`). MySQL only accepts that setting when it first creates the data volume. If you have a volume from before this setting existed, run `docker compose down -v` then `docker compose up` to recreate it from the seed (anything added since the seed is lost). With this setting, Docker shows database and table names in lowercase (e.g. `shelf`, `classics`); the app matches them case-insensitively.
- **phpMyAdmin 404s** — go to `http://localhost:8000/` (the root path). The official phpMyAdmin image serves itself there, not at `/phpmyadmin`.
- Passwords are case-sensitive — double-check exact casing between what you typed and what's in `.env`.
- Stopping/starting individual containers from the Docker Desktop app's UI does **not** recreate them or re-read `.env` — use the `docker compose` commands above when you've changed configuration.

### Option B: Native (Node.js + local MySQL)

**Prerequisites:**

- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- MySQL server running locally
- phpMyAdmin (optional, included in project as `phpmyadmin/`, not tracked in git)

1. Clone the repository:

```bash
git clone https://github.com/Aoishic25/My-Home-Library.git
cd My-Home-Library
```

2. Install dependencies:

```bash
npm install
```

3. Set up your MySQL databases (`Shelf`, `Collection`, `Names`, `Writer`) and import your data — if you have a seed dump (see [`docker/db/init/README.md`](docker/db/init/README.md)), restore it with:

```bash
mysql -u root -p < docker/db/init/01-seed.sql
```

4. Create a `.env` file in the root directory:

```
DATABASE_HOST=localhost
DATABASE_USER=your_username
DATABASE_PASSWORD=your_password
DATABASE=Shelf
```

Optional: `DATABASE_PORT` (default 3306), `PORT` (default 3000), and `NODE_ENV=production` to disable live reload.

5. Start the application:

```bash
node app.js
```

6. Open your browser and navigate to `http://localhost:3000`.

---

## Features

- Browse books across 11 genres via the Book Browser — genre filter buttons load each shelf table on demand
- View anime and manga in a tabbed interface with Series/Movie badges and Japanese titles
- Browse your Watchlist (shows and movies) in a tabbed layout
- Names and Anime/Manga are paginated server-side (50 and 25 per page) with Prev/Next controls
- Explore the Library of Names — filter by Male, Female, Unisex, Latin, or Japanese with AJAX table loading; Japanese names include colour-coded gender badges
- Search: one box that searches titles, authors, anime, manga, names and meanings across all four databases
- Browse, edit and delete rows in any table (25 per page, sortable, filterable) — tables with a primary key get inline Edit/Delete buttons
- Safe by construction: database, table and column names are checked against the real schema (`lib/schema.js`) before they reach any SQL, so only `Shelf`, `Collection`, `Names` and `Writer` are reachable
- Add data to any table via the dynamic form page — supports text inputs, foreign key dropdowns, and radio buttons (Type for anime, Gender for Japanese names)
- Glassmorphism UI with illustrated background art across all pages
- Live reload — the browser refreshes automatically when any `.hbs`, `.css`, or `.js` file is saved