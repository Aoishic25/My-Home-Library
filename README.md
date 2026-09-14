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

---

## Project Structure

```
Sites/
├── app.js                  # Main application entry point
├── package.json            # Project dependencies and scripts
├── package-lock.json
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
├── vendor/                 # Third-party libraries
├── phpmyadmin/             # phpMyAdmin configuration
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
| `/search` | GET | Search books by author |
| `/fetch-authors` | POST | Fetch author names for dropdown |
| `/fetch-titles` | POST | Fetch book titles by author |
| `/anime-manga` | GET | Anime & Manga browser (tabbed) |
| `/watchlist` | GET | Watchlist — Shows & Movies (tabbed) |
| `/names` | GET | Library of Names page |
| `/fetch-names` | GET | Returns name data as JSON (AJAX) |
| `/books` | GET | Book Browser — all 11 shelf genres |

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

To stop: `Ctrl+C`, or `docker compose down` (add `-v` to also wipe the database and reseed from the SQL file next time).

Once the databases are seeded (first run), they persist in a Docker volume across restarts — the seed file is only used the first time.

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
- Explore the Library of Names — filter by Male, Female, Unisex, Latin, or Japanese with AJAX table loading; Japanese names include colour-coded gender badges
- Search books by author using the Writer database with foreign key joins
- Add data to any table via the dynamic form page — supports text inputs, foreign key dropdowns, and radio buttons (Type for anime, Gender for Japanese names)
- Glassmorphism UI with illustrated background art across all pages
- Live reload — the browser refreshes automatically when any `.hbs`, `.css`, or `.js` file is saved