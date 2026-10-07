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
- **Master Playlist**: All synced tracks across your entire collection.
- **Recently Added**: Tracks from the top 20 most recently added releases.
- **Genre Playlists**: Automated classification based on Discogs genres/styles into targeted playlists (Electronic, Rock, Jazz, Hip-Hop, Funk/Soul, Classical).
- **Position 0 Inserter**: New additions are inserted at the very top of playlists for immediate access.
- **State Caching**: `cache/collection_cache.json` tracks synced release IDs and avoids redundant API queries.
- **Unmatched Logs**: `logs/unmatched.json` logs vinyl releases not found on streaming services for manual matching.

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
