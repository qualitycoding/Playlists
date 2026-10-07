import React, { useState } from 'react';
import { FileCode, Copy, Check, Download, ExternalLink, Terminal, Shield } from 'lucide-react';

interface CodeViewerAndExportProps {
  onDownloadZip: () => void;
  onOpenDriveModal: () => void;
}

export const CodeViewerAndExport: React.FC<CodeViewerAndExportProps> = ({
  onDownloadZip,
  onOpenDriveModal,
}) => {
  const [activeFile, setActiveFile] = useState<string>('sync_playlists.py');
  const [copied, setCopied] = useState<boolean>(false);

  const files: Record<string, { desc: string; code: string; lang: string }> = {
    'sync_playlists.py': {
      desc: 'Core Python synchronization engine executed weekly or on-demand',
      lang: 'python',
      code: `#!/usr/bin/env python3
"""
Discogs to Spotify & YouTube Music Sync Engine
Synchronizes your vinyl / Discogs collection with streaming playlists on a scheduled cadence.
"""
import os
import sys
import json
import time
import argparse
import requests
import config

CACHE_FILE = "cache/collection_cache.json"
UNMATCHED_FILE = "logs/unmatched.json"

def load_json(filepath, default):
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Warning: Failed to parse {filepath}: {e}")
    return default

def save_json(filepath, data):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def init_spotify():
    """Initialize Spotify client with refresh token."""
    if not (config.SPOTIPY_CLIENT_ID and config.SPOTIPY_CLIENT_SECRET and config.SPOTIFY_REFRESH_TOKEN):
        print("Notice: Spotify credentials not fully configured.")
        return None
    try:
        from spotipy import Spotify
        from spotipy.oauth2 import SpotifyOAuth
        return Spotify(auth_manager=SpotifyOAuth(
            client_id=config.SPOTIPY_CLIENT_ID,
            client_secret=config.SPOTIPY_CLIENT_SECRET,
            redirect_uri=os.getenv("SPOTIPY_REDIRECT_URI", "http://localhost:8888/callback"),
            scope="playlist-modify-public playlist-modify-private playlist-read-private",
            refresh_token=config.SPOTIFY_REFRESH_TOKEN
        ))
    except Exception as e:
        print(f"Warning: Failed to initialize Spotify: {e}")
        return None

def init_ytmusic():
    """Initialize YouTube Music client from auth JSON."""
    auth_file = config.YTMUSIC_AUTH_JSON
    if not os.path.exists(auth_file):
        print(f"Notice: YouTube Music auth file '{auth_file}' not found.")
        return None
    try:
        from ytmusicapi import YTMusic
        return YTMusic(auth_file)
    except Exception as e:
        print(f"Warning: Failed to initialize YouTube Music: {e}")
        return None

def get_discogs_collection(token, username):
    """Fetch user collection from Discogs sorted by date_added descending."""
    releases = []
    page = 1
    headers = {
        "User-Agent": "DiscogsPlaylistSync/1.0",
        "Authorization": f"Discogs token={token}"
    }

    while True:
        url = f"https://api.discogs.com/users/{username}/collection/folders/0/releases"
        params = {"sort": "date_added", "sort_order": "desc", "per_page": 100, "page": page}
        resp = requests.get(url, headers=headers, params=params)
        if resp.status_code != 200:
            break
        data = resp.json()
        releases.extend(data.get("releases", []))
        if page >= data.get("pagination", {}).get("pages", 1):
            break
        page += 1
        time.sleep(1) # Discogs rate limit guard

    return releases

def resolve_spotify_tracks(sp, artist, album):
    if not sp: return []
    query = f'album:"{album}" artist:"{artist}"'
    results = sp.search(q=query, type="album", limit=1)
    items = results.get("albums", {}).get("items", [])
    if not items:
        results = sp.search(q=f"{artist} {album}", type="album", limit=1)
        items = results.get("albums", {}).get("items", [])
    if items:
        album_id = items[0]["id"]
        tracks = sp.album_tracks(album_id).get("items", [])
        return [t["uri"] for t in tracks]
    return []

def resolve_ytmusic_tracks(ytmusic, artist, album):
    if not ytmusic: return []
    try:
        results = ytmusic.search(f"{artist} {album}", filter="albums")
        if results:
            browse_id = results[0]["browseId"]
            album_details = ytmusic.get_album(browse_id)
            return [t["videoId"] for t in album_details.get("tracks", []) if "videoId" in t]
    except Exception:
        pass
    return []

def sync(dry_run=False):
    cache = load_json(CACHE_FILE, {"synced_release_ids": [], "tracks": {}})
    unmatched = load_json(UNMATCHED_FILE, [])

    sp = init_spotify()
    ytmusic = init_ytmusic()

    releases = get_discogs_collection(config.DISCOGS_TOKEN, config.DISCOGS_USERNAME)
    new_releases = [r for r in releases if r["id"] not in cache["synced_release_ids"]]

    if not new_releases:
        print("No new releases to process.")
        return

    # Process in reverse chronological order so newest ends up at index 0
    for release in reversed(new_releases):
        rel_id = release["id"]
        info = release["basic_information"]
        artist = info["artists"][0]["name"]
        album = info["title"]
        genres = info.get("genres", []) + info.get("styles", [])

        sp_uris = resolve_spotify_tracks(sp, artist, album)
        yt_ids = resolve_ytmusic_tracks(ytmusic, artist, album)

        if not sp_uris and not yt_ids:
            unmatched.append({"id": rel_id, "artist": artist, "album": album, "genres": genres})
            continue

        if not dry_run:
            if sp and sp_uris:
                # Master Playlist (Pos 0)
                if config.SPOTIFY_MASTER_PLAYLIST_ID:
                    sp.playlist_add_items(config.SPOTIFY_MASTER_PLAYLIST_ID, sp_uris, position=0)

                # Genre Playlists (Pos 0)
                for broad_genre, keywords in config.GENRE_MAP.items():
                    if any(k.lower() in [g.lower() for g in genres] for k in keywords):
                        env_key = f"SPOTIFY_{broad_genre.upper().replace(' ', '_').replace('/', '_')}_PLAYLIST_ID"
                        genre_id = os.getenv(env_key)
                        if genre_id:
                            sp.playlist_add_items(genre_id, sp_uris, position=0)

            if ytmusic and yt_ids and config.YTMUSIC_MASTER_PLAYLIST_ID:
                ytmusic.add_playlist_items(config.YTMUSIC_MASTER_PLAYLIST_ID, yt_ids)

            cache["synced_release_ids"].append(rel_id)
            cache["tracks"][str(rel_id)] = {
                "artist": artist,
                "album": album,
                "genres": genres,
                "spotify_uris": sp_uris,
                "yt_ids": yt_ids
            }

            save_json(CACHE_FILE, cache)
            save_json(UNMATCHED_FILE, unmatched)

    # Refresh top 20 recently added
    recent_20 = releases[:20]
    recent_sp = [uri for r in recent_20 for uri in cache.get("tracks", {}).get(str(r["id"]), {}).get("spotify_uris", [])]
    if sp and config.SPOTIFY_RECENTLY_ADDED_PLAYLIST_ID and recent_sp and not dry_run:
        sp.playlist_replace_items(config.SPOTIFY_RECENTLY_ADDED_PLAYLIST_ID, recent_sp[:100])

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    sync(dry_run=args.dry_run)
`,
    },
    'config.py': {
      desc: 'Environment secrets and genre dictionary mapping for target playlists',
      lang: 'python',
      code: `import os
from dotenv import load_dotenv

load_dotenv()

# Discogs API Credentials
DISCOGS_TOKEN = os.getenv("DISCOGS_TOKEN", "")
DISCOGS_USERNAME = os.getenv("DISCOGS_USERNAME", "")

# Spotify Web API Credentials
SPOTIPY_CLIENT_ID = os.getenv("SPOTIPY_CLIENT_ID", "")
SPOTIPY_CLIENT_SECRET = os.getenv("SPOTIPY_CLIENT_SECRET", "")
SPOTIFY_REFRESH_TOKEN = os.getenv("SPOTIFY_REFRESH_TOKEN", "")

# YouTube Music Credentials
YTMUSIC_AUTH_JSON = os.getenv("YTMUSIC_AUTH_JSON", "headers_auth.json")

# Target Playlist IDs
SPOTIFY_MASTER_PLAYLIST_ID = os.getenv("SPOTIFY_MASTER_PLAYLIST_ID", "")
SPOTIFY_RECENTLY_ADDED_PLAYLIST_ID = os.getenv("SPOTIFY_RECENTLY_ADDED_PLAYLIST_ID", "")
YTMUSIC_MASTER_PLAYLIST_ID = os.getenv("YTMUSIC_MASTER_PLAYLIST_ID", "")
YTMUSIC_RECENTLY_ADDED_PLAYLIST_ID = os.getenv("YTMUSIC_RECENTLY_ADDED_PLAYLIST_ID", "")

# Mapping Discogs genre/style tags to broad playlist targets
GENRE_MAP = {
    "Electronic": ["Electronic", "Synthesizer", "House", "Techno", "Ambient", "Electro", "Downtempo", "Trance", "IDM"],
    "Rock": ["Rock", "Indie Rock", "Alternative Rock", "Punk", "Metal", "Psychedelic Rock", "Hard Rock", "Post-Punk"],
    "Jazz": ["Jazz", "Hard Bop", "Fusion", "Post Bop", "Free Jazz", "Modal", "Bop", "Cool Jazz"],
    "Hip-Hop": ["Hip Hop", "Boom Bap", "Trap", "Conscious", "Trip Hop", "Instrumental Hip-Hop"],
    "Funk / Soul": ["Funk", "Soul", "Disco", "Rhythm & Blues", "Neo Soul", "Afrobeat"],
    "Classical": ["Classical", "Baroque", "Contemporary", "Romantic", "Modern Classical", "Minimalism"]
}
`,
    },
    '.github/workflows/weekly_sync.yml': {
      desc: 'Automated GitHub Action scheduled weekly with auto-commit to state cache',
      lang: 'yaml',
      code: `name: Weekly Discogs Playlist Sync

on:
  schedule:
    - cron: '0 3 * * 0' # Every Sunday at 03:00 UTC
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install Dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Reconstruct YTMusic Credentials
        if: \${{ secrets.YTMUSIC_AUTH_JSON != '' }}
        run: |
          echo "\${{ secrets.YTMUSIC_AUTH_JSON }}" > headers_auth.json

      - name: Execute Sync
        env:
          DISCOGS_TOKEN: \${{ secrets.DISCOGS_TOKEN }}
          DISCOGS_USERNAME: \${{ secrets.DISCOGS_USERNAME }}
          SPOTIPY_CLIENT_ID: \${{ secrets.SPOTIPY_CLIENT_ID }}
          SPOTIPY_CLIENT_SECRET: \${{ secrets.SPOTIPY_CLIENT_SECRET }}
          SPOTIFY_REFRESH_TOKEN: \${{ secrets.SPOTIFY_REFRESH_TOKEN }}
          SPOTIFY_MASTER_PLAYLIST_ID: \${{ secrets.SPOTIFY_MASTER_PLAYLIST_ID }}
          SPOTIFY_RECENTLY_ADDED_PLAYLIST_ID: \${{ secrets.SPOTIFY_RECENTLY_ADDED_PLAYLIST_ID }}
          SPOTIFY_ELECTRONIC_PLAYLIST_ID: \${{ secrets.SPOTIFY_ELECTRONIC_PLAYLIST_ID }}
          SPOTIFY_ROCK_PLAYLIST_ID: \${{ secrets.SPOTIFY_ROCK_PLAYLIST_ID }}
          SPOTIFY_JAZZ_PLAYLIST_ID: \${{ secrets.SPOTIFY_JAZZ_PLAYLIST_ID }}
          SPOTIFY_HIP_HOP_PLAYLIST_ID: \${{ secrets.SPOTIFY_HIP_HOP_PLAYLIST_ID }}
          SPOTIFY_FUNK___SOUL_PLAYLIST_ID: \${{ secrets.SPOTIFY_FUNK___SOUL_PLAYLIST_ID }}
          SPOTIFY_CLASSICAL_PLAYLIST_ID: \${{ secrets.SPOTIFY_CLASSICAL_PLAYLIST_ID }}
          YTMUSIC_MASTER_PLAYLIST_ID: \${{ secrets.YTMUSIC_MASTER_PLAYLIST_ID }}
          YTMUSIC_RECENTLY_ADDED_PLAYLIST_ID: \${{ secrets.YTMUSIC_RECENTLY_ADDED_PLAYLIST_ID }}
        run: python sync_playlists.py

      - name: Commit Updated Cache and Logs
        run: |
          git config --local user.email "github-actions[bot]@users.noreply.github.com"
          git config --local user.name "github-actions[bot]"
          git add cache/collection_cache.json logs/unmatched.json
          git diff --quiet && git diff --staged --quiet || (git commit -m "Automated cache & log update [skip ci]" && git push)
`,
    },
    'scripts/setup_spotify_auth.py': {
      desc: 'CLI tool to authorize Spotify and extract long-lived SPOTIFY_REFRESH_TOKEN',
      lang: 'python',
      code: `import os
from spotipy.oauth2 import SpotifyOAuth
from dotenv import load_dotenv

load_dotenv()

sp_oauth = SpotifyOAuth(
    client_id=os.getenv("SPOTIPY_CLIENT_ID"),
    client_secret=os.getenv("SPOTIPY_CLIENT_SECRET"),
    redirect_uri="http://localhost:8888/callback",
    scope="playlist-modify-public playlist-modify-private playlist-read-private"
)

auth_url = sp_oauth.get_authorize_url()
print(f"Open this URL in your browser: {auth_url}")
response_url = input("Paste the full redirect URL here: ")
code = sp_oauth.parse_response_code(response_url)
token_info = sp_oauth.get_access_token(code)

print(f"\\nYour SPOTIFY_REFRESH_TOKEN is:\\n{token_info['refresh_token']}")
`,
    },
    'scripts/setup_ytmusic_auth.py': {
      desc: 'CLI tool to setup YouTube Music headers_auth.json from browser network inspection',
      lang: 'python',
      code: `from ytmusicapi import YTMusic

print("Follow instructions to paste HTTP headers from YouTube Music Network tab:")
YTMusic.setup(filepath="headers_auth.json")
print("Saved headers_auth.json successfully.")
`,
    },
    'requirements.txt': {
      desc: 'Python dependency specifications',
      lang: 'text',
      code: `spotipy>=2.23.0
ytmusicapi>=1.5.0
requests>=2.31.0
python-dotenv>=1.0.0
`,
    },
  };

  const handleCopy = () => {
    const code = files[activeFile]?.code || '';
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Overview & Export Actions */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span>PROJECT CODEBASE & AUTOMATION SCRIPTS</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 font-mono">READY TO EXPORT</span>
            </div>
            <h2 className="text-xl font-serif font-bold text-white mt-1">
              Python Synchronization Engine Files
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              All scripts, authentication helpers, and GitHub Actions workflow matching the execution plan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenDriveModal}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-md transition-colors"
            >
              <span className="text-emerald-400">▲</span>
              <span>Save to Google Drive</span>
            </button>

            <button
              onClick={onDownloadZip}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-black bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Project ZIP</span>
            </button>
          </div>
        </div>

        {/* Required GitHub Secrets Reference Matrix */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>GitHub Action Required Secrets Reference</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { name: 'DISCOGS_TOKEN', source: 'Discogs > Developer Settings', desc: 'Personal access token' },
              { name: 'DISCOGS_USERNAME', source: 'Discogs Profile', desc: 'Collection owner username' },
              { name: 'SPOTIPY_CLIENT_ID', source: 'Spotify Developer Dashboard', desc: 'App Client ID' },
              { name: 'SPOTIPY_CLIENT_SECRET', source: 'Spotify Developer Dashboard', desc: 'App Client Secret' },
              { name: 'SPOTIFY_REFRESH_TOKEN', source: 'setup_spotify_auth.py', desc: 'Long-lived OAuth refresh token' },
              { name: 'YTMUSIC_AUTH_JSON', source: 'setup_ytmusic_auth.py', desc: 'Browser request headers JSON' },
            ].map((secret) => (
              <div key={secret.name} className="rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-xs space-y-1">
                <div className="font-mono text-emerald-400 font-semibold">{secret.name}</div>
                <div className="text-neutral-400 text-[11px]">Source: {secret.source}</div>
                <div className="text-neutral-500 text-[11px]">{secret.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Code Browser */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-2xl">
        {/* File Tabs */}
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/80 px-4 py-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            {Object.keys(files).map((fileName) => {
              const isSelected = activeFile === fileName;
              return (
                <button
                  key={fileName}
                  onClick={() => setActiveFile(fileName)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-neutral-800 text-white font-medium shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{fileName}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pl-4">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Copy File</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* File Description Header */}
        <div className="bg-neutral-900/40 px-5 py-2.5 border-b border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
          <span>{files[activeFile]?.desc}</span>
          <span className="font-mono text-neutral-500 text-[11px]">{files[activeFile]?.lang.toUpperCase()}</span>
        </div>

        {/* Code Viewport with Line Numbers */}
        <div className="p-5 font-mono text-xs text-neutral-300 overflow-x-auto bg-neutral-950 max-h-[550px] overflow-y-auto leading-relaxed">
          <pre className="select-text">
            <code>{files[activeFile]?.code}</code>
          </pre>
        </div>
      </div>

      {/* Setup Guide Walkthrough */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>Local Quickstart & Execution Walkthrough</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 space-y-2">
            <span className="font-mono text-emerald-400 font-semibold">1. Local Setup</span>
            <p className="text-neutral-400 leading-relaxed">
              Clone repository or extract ZIP. Run <code className="text-neutral-300">pip install -r requirements.txt</code>.
            </p>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 space-y-2">
            <span className="font-mono text-emerald-400 font-semibold">2. Generate Tokens</span>
            <p className="text-neutral-400 leading-relaxed">
              Run <code className="text-neutral-300">python scripts/setup_spotify_auth.py</code> to get your Spotify refresh token.
            </p>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 space-y-2">
            <span className="font-mono text-emerald-400 font-semibold">3. Run Dry-Run</span>
            <p className="text-neutral-400 leading-relaxed">
              Execute <code className="text-neutral-300">python sync_playlists.py --dry-run</code> to simulate track resolution without mutating playlists.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
