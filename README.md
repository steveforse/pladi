<div align="center">
  <img width="160" alt="Pladi logo" src="https://github.com/user-attachments/assets/5790d3ac-d0ee-4eb0-803f-2c0ad0787c66" />

  <h1>Pladi</h1>
  <p>
    <a href="https://github.com/steveforse/pladi/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/steveforse/pladi/actions/workflows/ci.yml/badge.svg" /></a>
    <a href="https://codecov.io/gh/steveforse/pladi"><img alt="Coverage" src="https://codecov.io/gh/steveforse/pladi/branch/main/graph/badge.svg" /></a>
    <a href="https://github.com/steveforse/pladi/actions/workflows/codeql.yml"><img alt="Security" src="https://github.com/steveforse/pladi/actions/workflows/codeql.yml/badge.svg" /></a>
    <a href="LICENSE"><img alt="License: GPLv3" src="https://img.shields.io/badge/License-GPLv3-blue.svg" /></a>
    <a href="https://www.ruby-lang.org/"><img alt="Ruby 4.0.1" src="https://img.shields.io/badge/Ruby-4.0.1-CC342D?logo=ruby&logoColor=white" /></a>
    <a href="https://nodejs.org/"><img alt="Node 22" src="https://img.shields.io/badge/Node-22-339933?logo=node.js&logoColor=white" /></a>
    <a href="https://github.com/steveforse/pladi/releases"><img alt="Release" src="https://img.shields.io/github/v/release/steveforse/pladi?display_name=tag" /></a>
  </p>
  <p><strong>Plex Library API Data Inspector</strong></p>
  <p>Find problems in your Plex movie library — bad matches, duplicates, unnecessary files, and more.</p>
</div>

---

## What It Does

Pladi connects to your Plex server and gives you a detailed, sortable view of your movie library with the information you need to spot problems:

- **Bad matches** — see titles, years, and Plex links to quickly verify metadata
- **Duplicate files** — identify movies with multiple video files
- **Unnecessary copies** — spot redundant encodes by comparing resolution, codec, and bitrate side-by-side
- **Quality overview** — audit your library's codecs, resolutions, and audio across all sections at a glance
- **Enriched metadata** — genres, ratings, directors, and content ratings pulled directly from Plex
- **Edit metadata** — fix titles, years, and tags directly from the browser; bulk-edit fields across multiple movies at once
- **Change history** — every edit is logged so you can see exactly what changed

## Requirements

- A running [Plex Media Server](https://www.plex.tv/media-server-downloads/) reachable from the host
- Your **Plex auth token** — find it by signing in to Plex Web, opening any media item, clicking ··· → Get Info → View XML, and copying the `X-Plex-Token` value from the URL ([full instructions](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/))
- Ruby 4.0.1, Node 22, and SQLite3 installed on the host

## Getting Started

1. **Sign up** at the login page and add your Plex server URL and auth token in Settings.
2. Your library loads automatically. Use **Refresh** to pull the latest data from Plex.

## Self-Hosting

Pladi is a standard Rails 8 app. The easiest path is Docker:

```bash
docker build -t pladi .
docker run -d -p 80:80 \
  -e RAILS_MASTER_KEY=<value from config/master.key> \
  -v pladi_storage:/rails/storage \
  --name pladi pladi
```

Set `PLEX_ENRICH_THREADS` to control how many threads are used during metadata enrichment (default: 3). Lower this on resource-constrained hosts.

For production deployments, [Kamal](https://kamal-deploy.org/) is preconfigured in `config/deploy.yml`.

## Development Setup

```bash
bundle install
npm install
bundle exec rails db:migrate

# Run both servers
bundle exec rails server   # API on port 3000
bundle exec vite dev       # Frontend HMR on port 3036
```

Run backend tests: `bundle exec rspec`

Run frontend tests: `npm test`

Run frontend tests with coverage: `npm run test:coverage`

Run static analyzers: `bin/rubocop` and `bin/brakeman`

## Stack

Rails 8.1 · React 19 · TypeScript · Tailwind CSS v4 · SQLite3 · Solid Cache/Queue
