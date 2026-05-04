# My Home Library

A personal web application for cataloguing and browsing a home library collection — including books, media, and name references — organized by genre, category, and author.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Databases](#databases)
- [Getting Started](#getting-started)
- [Features](#features)

---

## Overview

My Home Library is a Node.js web application that serves as a personal digital catalogue. It connects to multiple MySQL databases to display, search, and manage a large collection of books (organized by genre and series), media (anime, manga, movies, shows, and videogames), author information, and name references.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Templating | Handlebars (`.hbs`) |
| Database | MySQL |
| DB Admin | phpMyAdmin |
| Styling | CSS (5 stylesheets) |
| Entry Point | `app.js` |

---

## Project Structure

```
Sites/
├── app.js                  # Main application entry point
├── package.json            # Project dependencies and scripts
├── package-lock.json
├── assets/                 # Background images
│   ├── bg1.jpg
│   ├── bg2.jpg
│   ├── bg3.jpg
│   ├── bg4.jpg
│   └── bg5.jpg
├── styles/                 # CSS stylesheets
│   ├── style1.css
│   ├── style2.css
│   ├── style3.css
│   ├── style4.css
│   └── style5.css
├── views/                  # Handlebars templates
│   ├── index.hbs           # Entry/layout template
│   ├── homepage.hbs        # Home page
│   ├── form.hbs            # Data entry form
│   ├── search.hbs          # Search interface
│   └── tables.hbs          # Table/list view
├── vendor/                 # Third-party libraries
├── phpmyadmin/             # phpMyAdmin configuration
└── node_modules/           # npm dependencies
```

---

## Databases

The application draws from four MySQL databases.

### `shelf` — Book Collection

Organizes books by genre and category across 11 tables:

| Table | Description |
|---|---|
| `AncientEgypt` | Books set in or about ancient Egypt |
| `Anthology` | Anthologies and short story collections |
| `ArabianFantasy` | Arabian-inspired fantasy fiction |
| `AsianFantasy` | Asian-inspired fantasy fiction |
| `ChildhoodReads` | Childhood and young reader books |
| `Classics` | Classic literature |
| `IndiaBooks` | Books from or about India |
| `MythsRetold` | Mythology retellings |
| `PenguinBooks` | Penguin Classics and publications |
| `Series` | Multi-book series |
| `SingleNovel` | Standalone novels |

### `Collection` — Media Collection

Tracks non-book media across 5 tables:

| Table | Description |
|---|---|
| `Anime` | Anime series and films |
| `Manga` | Manga volumes and series |
| `Movies` | Feature films |
| `Shows` | TV shows and series |
| `Videogames` | Video game titles |

### `Names` — Name Reference Database

A personal name reference organized into 5 tables:

| Table | Description |
|---|---|
| `Female` | Female names |
| `Male` | Male names |
| `Unisex` | Gender-neutral names |
| `Japanese` | Japanese names |
| `Latin` | Latin-origin names |

### `Writer` — Author Database

Stores author information categorized by specialty or regional focus across 12 tables:

| Table | Description |
|---|---|
| `Author` | General author records |
| `Arabia_Author` | Authors of Arabian/Middle Eastern works |
| `Asia_Author` | Authors of Asian literature |
| `C_Author` | Classical authors |
| `CH_Author` | Childhood/children's literature authors |
| `Egypt_Author` | Authors of Egyptian-themed works |
| `Folk_Author` | Folklore and folk tale authors |
| `India_Author` | Authors from or writing about India |
| `Myth_Author` | Mythology and myth retelling authors |
| `Penguin_Author` | Authors published under Penguin |
| `Poet` | Poets |
| `Sr_Author` | Series authors |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- MySQL server running locally
- phpMyAdmin (optional, included in project)

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd Sites
```

2. Install dependencies:

```bash
npm install
```

3. Set up your MySQL databases (`shelf`, `Collection`, `Names`, `Writer`) and import your data.

4. Configure your database connection in `app.js` (host, user, password).

5. Start the application:

```bash
node app.js
```

6. Open your browser and navigate to `http://localhost:<port>`.

---

## Features

- Browse books organized by genre and category
- View and search your media collection (anime, manga, movies, shows, games)
- Look up authors by regional or thematic specialty
- Reference a name database filtered by origin and gender
- Search across tables via the search view
- Add or update entries through the form view
