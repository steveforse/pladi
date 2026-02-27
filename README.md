<img width="642" height="644" alt="pladi logo" src="https://github.com/user-attachments/assets/5790d3ac-d0ee-4eb0-803f-2c0ad0787c66" />

# Pladi

A Plex media library browser. Connect your Plex servers, then browse and inspect your movie libraries with enriched metadata — resolution, codecs, genres, ratings, directors, and more.


## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Rails 8.1, Ruby 4.0.1 |
| Frontend | React 19, TypeScript, Vite 6 |
| Styling | Tailwind CSS v4, shadcn/ui |
| Database | SQLite3 (via Active Record) |
| Cache / Queue | Solid Cache, Solid Queue, Solid Cable |
| Deployment | Docker + Kamal |

## Prerequisites

- Ruby 4.0.1 (managed via [asdf](https://asdf-vm.com/) or rbenv)
- Node.js (for the frontend build)
- SQLite3

## Getting Started

```bash
# Install dependencies
bundle install
npm install

# Set up the database
bundle exec rails db:migrate
bundle exec rails db:seed   # optional — creates a demo user

# Start both servers (Rails + Vite HMR)
bundle exec rails server        # http://localhost:3000
bundle exec vite dev            # Vite on port 3036
```

Or use the Procfile:

```bash
bin/dev
```

## Configuration

Plex credentials are stored per-user in the database (Plex server URL + auth token). Add your server through the Settings page after logging in. No environment variables are required for basic development.

Optional environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PLEX_ENRICH_THREADS` | `3` | Concurrent threads for metadata enrichment |

## Testing

```bash
bundle exec rspec                          # all tests
bundle exec rspec spec/models/             # single directory
bundle exec rspec spec/models/user_spec.rb # single file
```

Tests use RSpec, FactoryBot, and Faker. Factories live in `spec/factories/`.

## Linting & Security

```bash
bin/rubocop      # Ruby style (rubocop-rails + rubocop-rspec)
bin/brakeman     # Rails security scan
bundle exec bundler-audit check --update  # gem vulnerability audit
```

CI runs all three on every push and PR.

## Production Build

```bash
bundle exec rails assets:precompile   # builds frontend into public/vite/
```

### Docker

```bash
docker build -t pladi .
docker run -d -p 80:80 -e RAILS_MASTER_KEY=<value from config/master.key> --name pladi pladi
```

The image uses Thruster (HTTP caching/compression) in front of Puma, runs as a non-root user, and preloads jemalloc.

### Kamal

Deployment config lives in `config/deploy.yml`. See the [Kamal docs](https://kamal-deploy.org/) for setup.

## Architecture Overview

**Authentication** — Rails 8 built-in auth. Signed-cookie sessions; `Current.session` via CurrentAttributes. `require_authentication` guards all API endpoints.

**Plex integration** — `PlexService` handles all Plex API calls. Movie lists and enriched metadata are cached in Solid Cache (30-day TTL, keyed by section `updatedAt` so stale data is never served after a library change). Metadata enrichment uses a configurable thread pool to parallelize detail fetches.

**Frontend** — Single-page React app served by Rails. No router library — navigation is manual `pushState`/`popstate`. Two pages: movie browser and server settings.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/me` | Current user or 401 |
| `GET` | `/api/movies?server_id=` | Cached movie sections |
| `GET` | `/api/movies/refresh?server_id=` | Force-refresh from Plex |
| `GET` | `/api/movies/enrich?server_id=` | Sections with full metadata |
| `GET` | `/api/movies/:id/poster?server_id=` | Poster image (cached) |
| `GET` | `/api/plex_servers` | List user's servers |
| `POST` | `/api/plex_servers` | Add a server |
| `PATCH` | `/api/plex_servers/:id` | Update a server |
| `DELETE` | `/api/plex_servers/:id` | Remove a server |
| `GET` | `/api/plex_servers/lookup_name` | Resolve friendly name from URL+token |
| `POST` | `/session` | Log in |
| `DELETE` | `/session` | Log out |
