# Automated Discogs to Spotify & YouTube Music Sync

A pipeline to synchronize your physical vinyl and Discogs collection with streaming playlists on **Spotify** and **YouTube Music** on a scheduled cadence (weekly via GitHub Actions or manual trigger).

## Architecture

```
┌─────────────────┐       ┌───────────────────────────┐       ┌───────────────────┐
│   Discogs API   │ ────► │ Python Sync Engine        │ ────► │ Spotify Web API   │
│ (User Collection│       │ (GitHub Actions / Cron)   │       ├───────────────────┤
│  & Genres)      │       │ - State Cache             │ ────► │ YouTube Music API │
└─────────────────┘       │ - Track Resolution       │       │ (ytmusicapi)      │
                          └───────────────────────────┘       └───────────────────┘
```

### Key Features
- **Master Playlist**: all synced tracks across your collection, on Spotify and on YouTube Music.
- **Recently Added (Spotify only)**: the tracks of the 20 most recently added releases. The playlist is replaced
  on each run, with at most 100 tracks.
- **Genre Playlists (Spotify only)**: Discogs genres and styles are grouped into Electronic, Rock, Jazz, Hip-Hop, Funk / Soul and
  Classical (`GENRE_MAP` in `config.py`). Each has its own playlist ID.
- **Position 0 Inserter (Spotify only)**: new additions go to the top of the Spotify playlists. On YouTube Music new tracks are
  added with `add_playlist_items` and no position.
- **State Caching**: `cache/collection_cache.json` tracks synced release IDs and avoids redundant API queries.
- **Unmatched Logs**: `logs/unmatched.json` lists vinyl releases that were not found on a streaming service, for manual matching.
- **Web dashboard**: a React and Express app (`npm run dev` serves it on port 3000) that shows the collection,
  playlist mapping, cache and unmatched releases, can start a sync, and exports the project as a zip or to Google Drive.
  The `deploy-pages.yml` workflow publishes its static build to GitHub Pages; the server API only exists when `npm run dev` or `npm start` is running.

## Quick Setup

### 1. Requirements
```bash
pip install -r requirements.txt
```

### 2. Environment Variables (.env)
```env
DISCOGS_TOKEN="your_discogs_token"
DISCOGS_USERNAME="your_discogs_username"

SPOTIPY_CLIENT_ID="your_spotify_client_id"
SPOTIPY_CLIENT_SECRET="your_spotify_client_secret"
SPOTIFY_REFRESH_TOKEN="your_spotify_refresh_token"

SPOTIFY_MASTER_PLAYLIST_ID="your_spotify_master_playlist_id"
SPOTIFY_RECENTLY_ADDED_PLAYLIST_ID="your_spotify_recent_playlist_id"
SPOTIFY_ELECTRONIC_PLAYLIST_ID="..."
SPOTIFY_ROCK_PLAYLIST_ID="..."
SPOTIFY_JAZZ_PLAYLIST_ID="..."
SPOTIFY_HIP_HOP_PLAYLIST_ID="..."
SPOTIFY_FUNK___SOUL_PLAYLIST_ID="..."
SPOTIFY_CLASSICAL_PLAYLIST_ID="..."

YTMUSIC_AUTH_JSON="headers_auth.json"
YTMUSIC_MASTER_PLAYLIST_ID="..."
```

`config.py` also reads `YTMUSIC_RECENTLY_ADDED_PLAYLIST_ID`, but `sync_playlists.py` never uses it. The genre playlist ID variables are named `SPOTIFY_<GENRE>_PLAYLIST_ID` with spaces and slashes turned into underscores (so `SPOTIFY_FUNK___SOUL_PLAYLIST_ID`).

### 3. Generate Auth Tokens
- **Spotify**: Run `python scripts/setup_spotify_auth.py`
- **YouTube Music**: Run `python scripts/setup_ytmusic_auth.py`

### 4. Run Sync
```bash
# Dry run (simulate without mutating playlists)
python sync_playlists.py --dry-run

# Live sync
python sync_playlists.py
```

### 5. Automated Weekly Execution via GitHub Actions
Add the secrets listed above to your repository under **Settings > Secrets and variables > Actions**. The workflow in `.github/workflows/weekly_sync.yml` runs every Sunday at 03:00 UTC and automatically commits updated cache and unmatched log files.

## Tests and CI

`python -m unittest tests/test_sync.py` runs 8 unit tests with mocked services (no accounts needed). The `ci.yml` workflow
runs flake8 and the tests on Python 3.10, 3.11 and 3.12. The weekly workflow commits `cache/collection_cache.json` and
`logs/unmatched.json` back to the repository when they change.

## Licence

Apache License 2.0. See [LICENSE](LICENSE).
