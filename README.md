<div align="center">
  <img width="160" alt="Pladi logo" src="https://github.com/user-attachments/assets/5790d3ac-d0ee-4eb0-803f-2c0ad0787c66" />

  <h1>Pladi</h1>
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

## Getting Started

1. **Sign up** at the login page and add your Plex server URL and auth token in Settings.
2. Your library loads automatically. Use **Refresh** to pull the latest data from Plex.
3. Use **Enrich** to load full metadata (ratings, genres, directors) — this runs in the background and is cached.

## Self-Hosting

Pladi is a standard Rails 8 app. The easiest path is Docker:

```bash
docker build -t pladi .
docker run -d -p 80:80 -e RAILS_MASTER_KEY=<value from config/master.key> --name pladi pladi
```

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

Run tests: `bundle exec rspec`

Run linters: `bin/rubocop` and `bin/brakeman`

## Stack

Rails 8.1 · React 19 · TypeScript · Tailwind CSS v4 · SQLite3 · Solid Cache/Queue
