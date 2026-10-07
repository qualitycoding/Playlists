import JSZip from 'jszip';

/**
 * Client-side zip generation fallback for GitHub Pages where /api/download-zip is not available.
 */
export async function downloadProjectZipClientSide(): Promise<void> {
  const zip = new JSZip();

  // Core files that can be bundled statically
  const files: Record<string, string> = {
    'requirements.txt': `spotipy>=2.23.0\nytmusicapi>=1.5.0\nrequests>=2.31.0\npython-dotenv>=1.0.0\n`,
    'config.py': `import os\n\ntry:\n    from dotenv import load_dotenv\n    load_dotenv()\nexcept ImportError:\n    pass\n\n# Discogs API Credentials\nDISCOGS_TOKEN = os.getenv("DISCOGS_TOKEN", "")\nDISCOGS_USERNAME = os.getenv("DISCOGS_USERNAME", "")\n\n# Spotify Web API Credentials\nSPOTIPY_CLIENT_ID = os.getenv("SPOTIPY_CLIENT_ID", "")\nSPOTIPY_CLIENT_SECRET = os.getenv("SPOTIPY_CLIENT_SECRET", "")\nSPOTIFY_REFRESH_TOKEN = os.getenv("SPOTIFY_REFRESH_TOKEN", "")\n\n# YouTube Music Credentials\nYTMUSIC_AUTH_JSON = os.getenv("YTMUSIC_AUTH_JSON", "headers_auth.json")\n\n# Target Playlist IDs\nSPOTIFY_MASTER_PLAYLIST_ID = os.getenv("SPOTIFY_MASTER_PLAYLIST_ID", "")\nSPOTIFY_RECENTLY_ADDED_PLAYLIST_ID = os.getenv("SPOTIFY_RECENTLY_ADDED_PLAYLIST_ID", "")\nYTMUSIC_MASTER_PLAYLIST_ID = os.getenv("YTMUSIC_MASTER_PLAYLIST_ID", "")\nYTMUSIC_RECENTLY_ADDED_PLAYLIST_ID = os.getenv("YTMUSIC_RECENTLY_ADDED_PLAYLIST_ID", "")\n\n# Mapping Discogs genre/style tags to broad playlist targets\nGENRE_MAP = {\n    "Electronic": ["Electronic", "Synthesizer", "House", "Techno", "Ambient", "Electro", "Downtempo", "Trance", "IDM"],\n    "Rock": ["Rock", "Indie Rock", "Alternative Rock", "Punk", "Metal", "Psychedelic Rock", "Hard Rock", "Post-Punk"],\n    "Jazz": ["Jazz", "Hard Bop", "Fusion", "Post Bop", "Free Jazz", "Modal", "Bop", "Cool Jazz"],\n    "Hip-Hop": ["Hip Hop", "Boom Bap", "Trap", "Conscious", "Trip Hop", "Instrumental Hip-Hop"],\n    "Funk / Soul": ["Funk", "Soul", "Disco", "Rhythm & Blues", "Neo Soul", "Afrobeat"],\n    "Classical": ["Classical", "Baroque", "Contemporary", "Romantic", "Modern Classical", "Minimalism"]\n}\n`,
    '.github/workflows/weekly_sync.yml': `name: Weekly Discogs Playlist Sync\n\non:\n  schedule:\n    - cron: '0 3 * * 0'\n  workflow_dispatch:\n\njobs:\n  sync:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-python@v5\n        with:\n          python-version: '3.11'\n          cache: 'pip'\n      - run: pip install -r requirements.txt\n      - run: python sync_playlists.py\n`,
    '.github/workflows/ci.yml': `name: CI\n\non:\n  push:\n    branches: [ main ]\n  pull_request:\n    branches: [ main ]\n\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-python@v5\n        with:\n          python-version: '3.11'\n      - run: pip install -r requirements.txt flake8\n      - run: python -m unittest discover -s tests\n`,
    'cache/collection_cache.json': `{\n  "synced_release_ids": [2481923, 1092831, 7821945],\n  "tracks": {}\n}\n`,
    'logs/unmatched.json': `[]\n`,
    'README.md': `# Automated Discogs to Spotify & YouTube Music Sync\n\nRuns weekly via GitHub Actions or locally with Python.\n`,
  };

  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'discogs-streaming-sync.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
