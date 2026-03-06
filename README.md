<div align="center">
  <img width="160" alt="Pladi logo" src="https://github.com/user-attachments/assets/5790d3ac-d0ee-4eb0-803f-2c0ad0787c66" />

  <h1>Pladi</h1>
  <p>
    <a href="https://github.com/steveforse/pladi/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/steveforse/pladi/actions/workflows/ci.yml/badge.svg" /></a>
    <a href="https://github.com/steveforse/pladi/actions/workflows/codeql.yml"><img alt="Security" src="https://github.com/steveforse/pladi/actions/workflows/codeql.yml/badge.svg" /></a>
    <a href="LICENSE"><img alt="License: GPLv3" src="https://img.shields.io/badge/License-GPLv3-blue.svg" /></a>
    <a href="https://www.ruby-lang.org/"><img alt="Ruby 4.0.1" src="https://img.shields.io/badge/Ruby-4.0.1-CC342D?logo=ruby&logoColor=white" /></a>
    <a href="https://nodejs.org/"><img alt="Node 22" src="https://img.shields.io/badge/Node-22-339933?logo=node.js&logoColor=white" /></a>
    <a href="https://github.com/steveforse/pladi/releases"><img alt="Release" src="https://img.shields.io/github/v/release/steveforse/pladi?display_name=tag" /></a>
  </p>
  <p><strong>Plex library inspector and metadata editor</strong></p>
  <p>Built for self-hosters who run large Plex libraries and want faster ways to audit, clean up, and edit metadata.</p>
</div>

---

<img width="2992" height="1506" alt="image" src="https://github.com/user-attachments/assets/ad417fe0-fc43-4e7e-8cc8-8ade80e5bce1" />

---


## What Pladi Does

Pladi is built for people running Plex in homelabs, on boxes like Proxmox, Unraid, or other self-hosted setups. If you have a large movie or TV library and Plex Web is too slow or too limited for bulk inspection, Pladi gives you a faster way to audit and edit what is already in Plex.

- **Movies and TV in one app**: inspect movie libraries, show libraries, and episode-level TV views from the same interface
- **Show mode and episode mode**: switch TV libraries between show-level metadata and episode/file-level metadata depending on what you need to audit
- **Spot bad matches and duplicates**: compare titles, years, Plex links, file paths, codecs, resolutions, and bitrates side-by-side
- **Review enriched metadata**: genres, content ratings, external ratings, directors, writers, studios, collections, labels, and more
- **Edit Plex metadata directly**: update titles, summaries, original titles, years, and tag-style fields from the browser
- **Bulk edit tags**: apply shared metadata changes across multiple selected rows at once
- **Track every change**: media edits are written to an audit trail with before/after values and Plex server context
- **Warm poster and background caches**: prefetch artwork for movie libraries so the UI stays responsive during large audits

## Requirements

- A running [Plex Media Server](https://www.plex.tv/media-server-downloads/) reachable from the host
- Your **Plex auth token** — find it by signing in to Plex Web, opening any media item, clicking ··· → Get Info → View XML, and copying the `X-Plex-Token` value from the URL ([full instructions](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/))
- Ruby 4.0.1, Node 22, and SQLite3 installed on the host

## Who It Is For

- Plex users with medium or large libraries
- Self-hosters who want better audit and cleanup workflows than Plex Web provides
- People managing mixed movie and TV collections with uneven metadata quality

If you just want to browse Plex, this is probably not for you. Pladi is most useful when you are actively maintaining a library.

## Getting Started

1. Start Pladi and create the first account in the setup flow.
2. Add your Plex server URL and auth token in Settings.
3. Open Movies or TV Shows, then pick a Plex server and library.
4. Use **Refresh** to pull the latest section list from Plex and **Enrich** to load deeper metadata.

## Main Features

### Library inspection

- Sort, search, and filter large libraries without leaving the page
- Compare file-level technical metadata such as codec, resolution, bitrate, duration, and audio details
- Open the matching Plex item directly from each row

### TV-specific workflows

- **Shows mode** for show-level metadata like season count, episode count, watched counts, and overview data
- **Episodes mode** for episode-level rows with file paths, per-file stream details, and episode-specific editing

### Editing and history

- Inline edits for supported fields
- Bulk tag editing for multi-row cleanup
- Persistent edit history with media type, media title, field name, old value, and new value

### Caching and performance

- Section and enrichment caching on the Rails side
- IndexedDB-backed enrichment cache on the frontend for large libraries
- Configurable Plex enrichment concurrency with `PLEX_ENRICH_THREADS`

## Self-Hosting

Pladi is intended to be self-hosted alongside your existing Plex setup. The easiest path is Docker:

```bash
docker build -t pladi .
docker run -d -p 80:80 \
  -e SECRET_KEY_BASE=<generate-a-random-secret> \
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

# Run the app
bin/dev
```

If you prefer to run the processes separately:

```bash
bundle exec rails server   # API on port 3000
bundle exec vite dev       # Frontend HMR on port 3036
```

Useful commands:

- Backend tests: `bundle exec rspec`
- Frontend tests: `npm test`
- Frontend coverage: `npm run test:coverage`
- Ruby lint: `bin/rubocop`
- Security scan: `bin/brakeman`

## Contributing

Bug reports, feature requests, and pull requests are welcome. The project is primarily aimed at self-hosted Plex users, so the README is optimized for operators first, but contributions are appreciated.

## Stack

Rails 8.1 · React 19 · TypeScript · Vite · Tailwind CSS v4 · SQLite3 · Action Cable · Solid Cache/Queue
