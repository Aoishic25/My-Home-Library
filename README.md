# My Home Library

This is a personal web application for cataloguing and browsing different collections, including books, media, and name references,
organized by genre, category, and author.

#Table of Contents

Overview
Tech Stack
Project Structure
Databases
Getting Started
Features

## Overview

My Home Library is a Node.js web application that serves as a personal digital catalogue. It connects to multiple MySQL databases to 
display, search, and manage a large collection of books (organized by genre and series), media (anime, manga, movies, shows, and videogames), 
author information, and name references.

## Tech Stack

Layer         Technology
Runtime       Node.js
Templating    Handlebars (.hbs)
Database      MySQL
DB Admin      phpMyAdmin
Styling       CSS (5 stylesheets)
Entry Point   app.js

# Project Structure

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

## Features

- Browse books organized by genre and category
- View and search your media collection (anime, manga, movies, shows, games)
- Look up authors by regional or thematic specialty
- Reference a name database filtered by origin and gender
- Search across tables via the search view
- Add or update entries through the form view
