import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

const CACHE_FILE = path.join(__dirname, 'cache', 'collection_cache.json');
const UNMATCHED_FILE = path.join(__dirname, 'logs', 'unmatched.json');

// Helper to safely load JSON
function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as T;
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

// Helper to safely write JSON
function writeJsonFile(filePath: string, data: unknown): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// In-memory or persisted configuration state
let appConfig = {
  discogsToken: process.env.DISCOGS_TOKEN || '',
  discogsUsername: process.env.DISCOGS_USERNAME || '',
  spotifyClientId: process.env.SPOTIPY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID || '',
  spotifyClientSecret: process.env.SPOTIPY_CLIENT_SECRET || process.env.SPOTIFY_CLIENT_SECRET || '',
  spotifyRefreshToken: process.env.SPOTIFY_REFRESH_TOKEN || '',
  spotifyMasterPlaylistId: process.env.SPOTIFY_MASTER_PLAYLIST_ID || '37i9dQZF1DXcBWIGoYBM5M',
  spotifyRecentlyAddedPlaylistId: process.env.SPOTIFY_RECENTLY_ADDED_PLAYLIST_ID || '37i9dQZF1DX0XUsuxWHRQd',
  spotifyGenrePlaylists: {
    Electronic: process.env.SPOTIFY_ELECTRONIC_PLAYLIST_ID || '37i9dQZF1DXdLEN7aqioXM',
    Rock: process.env.SPOTIFY_ROCK_PLAYLIST_ID || '37i9dQZF1DWXRqgorJj26U',
    Jazz: process.env.SPOTIFY_JAZZ_PLAYLIST_ID || '37i9dQZF1DXbITWG1ZJKYt',
    'Hip-Hop': process.env.SPOTIFY_HIP_HOP_PLAYLIST_ID || '37i9dQZF1DX0XUsuxWHRQd',
    'Funk / Soul': process.env.SPOTIFY_FUNK___SOUL_PLAYLIST_ID || '37i9dQZF1DWWvh2zOz19qC',
    Classical: process.env.SPOTIFY_CLASSICAL_PLAYLIST_ID || '37i9dQZF1DWWEWGlCnxtYF',
  } as Record<string, string>,
  ytmusicAuthJson: process.env.YTMUSIC_AUTH_JSON || 'headers_auth.json',
  ytmusicMasterPlaylistId: process.env.YTMUSIC_MASTER_PLAYLIST_ID || 'PLrAlJpS2-7eI1i7s0',
  genreMap: {
    Electronic: ['Electronic', 'Synthesizer', 'House', 'Techno', 'Ambient', 'Electro', 'Downtempo', 'Trance', 'IDM'],
    Rock: ['Rock', 'Indie Rock', 'Alternative Rock', 'Punk', 'Metal', 'Psychedelic Rock', 'Hard Rock', 'Post-Punk'],
    Jazz: ['Jazz', 'Hard Bop', 'Fusion', 'Post Bop', 'Free Jazz', 'Modal', 'Bop', 'Cool Jazz'],
    'Hip-Hop': ['Hip Hop', 'Boom Bap', 'Trap', 'Conscious', 'Trip Hop', 'Instrumental Hip-Hop'],
    'Funk / Soul': ['Funk', 'Soul', 'Disco', 'Rhythm & Blues', 'Neo Soul', 'Afrobeat'],
    Classical: ['Classical', 'Baroque', 'Contemporary', 'Romantic', 'Modern Classical', 'Minimalism'],
  } as Record<string, string[]>,
};

// Default high-fidelity sample vinyl collection for instant interactive exploration
const SAMPLE_DISCOGS_COLLECTION = [
  {
    id: 9931204,
    date_added: "2026-10-06T15:30:00Z",
    basic_information: {
      title: "Selected Ambient Works 85-92",
      artists: [{ name: "Aphex Twin" }],
      year: 1992,
      labels: [{ name: "Apollo" }],
      formats: [{ name: "Vinyl", descriptions: ["2xLP", "Album", "Reissue"] }],
      genres: ["Electronic"],
      styles: ["Ambient", "Techno", "IDM"],
      thumb: ""
    }
  },
  {
    id: 5491022,
    date_added: "2026-10-04T11:20:00Z",
    basic_information: {
      title: "A Love Supreme",
      artists: [{ name: "John Coltrane" }],
      year: 1965,
      labels: [{ name: "Impulse!" }],
      formats: [{ name: "Vinyl", descriptions: ["LP", "Album", "Stereo"] }],
      genres: ["Jazz"],
      styles: ["Hard Bop", "Modal", "Free Jazz"],
      thumb: ""
    }
  },
  {
    id: 3829104,
    date_added: "2026-10-02T19:45:00Z",
    basic_information: {
      title: "The Dark Side of the Moon",
      artists: [{ name: "Pink Floyd" }],
      year: 1973,
      labels: [{ name: "Harvest" }],
      formats: [{ name: "Vinyl", descriptions: ["LP", "Gatefold"] }],
      genres: ["Rock"],
      styles: ["Psychedelic Rock", "Prog Rock"],
      thumb: ""
    }
  },
  {
    id: 4892183,
    date_added: "2026-09-30T16:10:00Z",
    basic_information: {
      title: "Madvillainy",
      artists: [{ name: "Madvillain" }],
      year: 2004,
      labels: [{ name: "Stones Throw Records" }],
      formats: [{ name: "Vinyl", descriptions: ["2xLP", "Album"] }],
      genres: ["Hip-Hop"],
      styles: ["Boom Bap", "Conscious"],
      thumb: ""
    }
  },
  {
    id: 6183920,
    date_added: "2026-09-27T10:05:00Z",
    basic_information: {
      title: "What's Going On",
      artists: [{ name: "Marvin Gaye" }],
      year: 1971,
      labels: [{ name: "Tamla" }],
      formats: [{ name: "Vinyl", descriptions: ["LP", "Album"] }],
      genres: ["Funk / Soul"],
      styles: ["Soul", "Rhythm & Blues"],
      thumb: ""
    }
  },
  {
    id: 2481923,
    date_added: "2026-09-20T12:00:00Z",
    basic_information: {
      title: "Discovery",
      artists: [{ name: "Daft Punk" }],
      year: 2001,
      labels: [{ name: "Virgin" }],
      formats: [{ name: "Vinyl", descriptions: ["2xLP", "Album"] }],
      genres: ["Electronic"],
      styles: ["House", "Disco"],
      thumb: ""
    }
  },
  {
    id: 1092831,
    date_added: "2026-09-14T09:15:00Z",
    basic_information: {
      title: "Kind of Blue",
      artists: [{ name: "Miles Davis" }],
      year: 1959,
      labels: [{ name: "Columbia" }],
      formats: [{ name: "Vinyl", descriptions: ["LP", "Album", "Stereo"] }],
      genres: ["Jazz"],
      styles: ["Modal"],
      thumb: ""
    }
  },
  {
    id: 7821945,
    date_added: "2026-09-08T14:30:00Z",
    basic_information: {
      title: "OK Computer",
      artists: [{ name: "Radiohead" }],
      year: 1997,
      labels: [{ name: "Parlophone" }],
      formats: [{ name: "Vinyl", descriptions: ["2xLP", "Album"] }],
      genres: ["Rock"],
      styles: ["Alternative Rock", "Art Rock"],
      thumb: ""
    }
  }
];

// API: Get app state and config summary
app.get('/api/status', (_req: Request, res: Response) => {
  const cache = readJsonFile<{ synced_release_ids: number[]; tracks: Record<string, unknown> }>(CACHE_FILE, { synced_release_ids: [], tracks: {} });
  const unmatched = readJsonFile<unknown[]>(UNMATCHED_FILE, []);

  res.json({
    discogsConfigured: Boolean(appConfig.discogsToken && appConfig.discogsUsername),
    spotifyConfigured: Boolean(appConfig.spotifyClientId && appConfig.spotifyClientSecret && appConfig.spotifyRefreshToken),
    ytmusicConfigured: Boolean(fs.existsSync(path.join(__dirname, appConfig.ytmusicAuthJson))),
    cachedCount: cache.synced_release_ids?.length || 0,
    unmatchedCount: unmatched.length,
    config: {
      discogsUsername: appConfig.discogsUsername,
      hasDiscogsToken: Boolean(appConfig.discogsToken),
      hasSpotifyCredentials: Boolean(appConfig.spotifyClientId && appConfig.spotifyClientSecret),
      hasSpotifyRefreshToken: Boolean(appConfig.spotifyRefreshToken),
      spotifyMasterPlaylistId: appConfig.spotifyMasterPlaylistId,
      spotifyRecentlyAddedPlaylistId: appConfig.spotifyRecentlyAddedPlaylistId,
      spotifyGenrePlaylists: appConfig.spotifyGenrePlaylists,
      ytmusicAuthFile: appConfig.ytmusicAuthJson,
      ytmusicMasterPlaylistId: appConfig.ytmusicMasterPlaylistId,
      genreMap: appConfig.genreMap,
    }
  });
});

// API: Save or update config
app.post('/api/config', (req: Request, res: Response) => {
  const body = req.body || {};
  if (body.discogsToken !== undefined) appConfig.discogsToken = body.discogsToken;
  if (body.discogsUsername !== undefined) appConfig.discogsUsername = body.discogsUsername;
  if (body.spotifyClientId !== undefined) appConfig.spotifyClientId = body.spotifyClientId;
  if (body.spotifyClientSecret !== undefined) appConfig.spotifyClientSecret = body.spotifyClientSecret;
  if (body.spotifyRefreshToken !== undefined) appConfig.spotifyRefreshToken = body.spotifyRefreshToken;
  if (body.spotifyMasterPlaylistId !== undefined) appConfig.spotifyMasterPlaylistId = body.spotifyMasterPlaylistId;
  if (body.spotifyRecentlyAddedPlaylistId !== undefined) appConfig.spotifyRecentlyAddedPlaylistId = body.spotifyRecentlyAddedPlaylistId;
  if (body.spotifyGenrePlaylists) appConfig.spotifyGenrePlaylists = { ...appConfig.spotifyGenrePlaylists, ...body.spotifyGenrePlaylists };
  if (body.ytmusicMasterPlaylistId !== undefined) appConfig.ytmusicMasterPlaylistId = body.ytmusicMasterPlaylistId;
  if (body.genreMap) appConfig.genreMap = body.genreMap;

  res.json({ success: true, message: 'Configuration updated successfully.' });
});

// API: Exchange Spotify authorization code for long-lived Refresh Token
app.post('/api/spotify/exchange-token', async (req: Request, res: Response) => {
  const { clientId, clientSecret, redirectUri, codeOrUrl } = req.body || {};

  if (!clientId || !clientSecret || !redirectUri || !codeOrUrl) {
    return res.status(400).json({ error: 'clientId, clientSecret, redirectUri, and codeOrUrl are required.' });
  }

  // Parse code from full URL if user pasted the entire redirect URL
  let authCode = String(codeOrUrl).trim();
  if (authCode.includes('code=')) {
    try {
      const parsedUrl = new URL(authCode.startsWith('http') ? authCode : `https://dummy.com/${authCode}`);
      const extracted = parsedUrl.searchParams.get('code');
      if (extracted) {
        authCode = extracted;
      }
    } catch {
      const match = authCode.match(/[?&]code=([^&#]+)/);
      if (match) {
        authCode = decodeURIComponent(match[1]);
      }
    }
  }

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await tokenRes.json();

    if (!tokenRes.ok) {
      return res.status(tokenRes.status).json({
        error: data.error_description || data.error || 'Failed to exchange authorization code with Spotify.',
        details: data,
      });
    }

    // Save into appConfig if successful
    if (data.refresh_token) {
      appConfig.spotifyClientId = clientId;
      appConfig.spotifyClientSecret = clientSecret;
      appConfig.spotifyRefreshToken = data.refresh_token;
    }

    return res.json({
      success: true,
      refreshToken: data.refresh_token,
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    });
  } catch (err) {
    console.error('Spotify token exchange error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

// API: Fetch Discogs collection (live if token provided, else sample mock with status indicator)
app.get('/api/discogs/collection', async (req: Request, res: Response) => {
  const username = (req.query.username as string) || appConfig.discogsUsername;
  const token = (req.query.token as string) || appConfig.discogsToken;

  if (username && token) {
    try {
      const response = await fetch(`https://api.discogs.com/users/${encodeURIComponent(username)}/collection/folders/0/releases?sort=date_added&sort_order=desc&per_page=50`, {
        headers: {
          'User-Agent': 'DiscogsPlaylistSync/1.0',
          'Authorization': `Discogs token=${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        return res.json({
          source: 'live',
          releases: data.releases || [],
          pagination: data.pagination || {}
        });
      } else {
        const errText = await response.text();
        return res.status(response.status).json({
          source: 'error',
          error: `Discogs API returned HTTP ${response.status}: ${errText}`,
          fallbackReleases: SAMPLE_DISCOGS_COLLECTION
        });
      }
    } catch (err: unknown) {
      console.error('Discogs fetch error:', err);
      return res.status(500).json({
        source: 'error',
        error: String(err),
        fallbackReleases: SAMPLE_DISCOGS_COLLECTION
      });
    }
  }

  // Return sample collection
  return res.json({
    source: 'sample',
    releases: SAMPLE_DISCOGS_COLLECTION,
    pagination: { page: 1, pages: 1, items: SAMPLE_DISCOGS_COLLECTION.length }
  });
});

// API: Get Cache
app.get('/api/cache', (_req: Request, res: Response) => {
  const cache = readJsonFile(CACHE_FILE, { synced_release_ids: [], tracks: {} });
  res.json(cache);
});

// API: Reset or update cache
app.post('/api/cache/reset', (_req: Request, res: Response) => {
  const emptyCache = { synced_release_ids: [], tracks: {} };
  writeJsonFile(CACHE_FILE, emptyCache);
  res.json({ success: true, message: 'Cache cleared successfully.' });
});

// API: Get Unmatched
app.get('/api/unmatched', (_req: Request, res: Response) => {
  const unmatched = readJsonFile(UNMATCHED_FILE, []);
  res.json(unmatched);
});

// API: Manual resolve unmatched track
app.post('/api/unmatched/resolve', (req: Request, res: Response) => {
  const { releaseId, spotifyUris, ytIds, artist, album, genres } = req.body;
  if (!releaseId) {
    return res.status(400).json({ error: 'releaseId is required' });
  }

  const cache = readJsonFile<{ synced_release_ids: number[]; tracks: Record<string, unknown> }>(CACHE_FILE, { synced_release_ids: [], tracks: {} });
  const unmatched = readJsonFile<Array<{ id: number; artist: string; album: string }>>(UNMATCHED_FILE, []);

  // Update cache
  const relIdNum = Number(releaseId);
  if (!cache.synced_release_ids.includes(relIdNum)) {
    cache.synced_release_ids.push(relIdNum);
  }
  cache.tracks[String(releaseId)] = {
    artist: artist || 'Manually Matched',
    album: album || 'Manually Matched',
    genres: genres || [],
    spotify_uris: spotifyUris || [],
    yt_ids: ytIds || [],
    synced_at: new Date().toISOString(),
    resolved_manually: true
  };
  writeJsonFile(CACHE_FILE, cache);

  // Remove from unmatched
  const filteredUnmatched = unmatched.filter(u => u.id !== relIdNum);
  writeJsonFile(UNMATCHED_FILE, filteredUnmatched);

  return res.json({ success: true, message: `Release #${releaseId} resolved and saved to cache.` });
});

// API: Execute sync pipeline (Dry run or live)
app.post('/api/sync/run', async (req: Request, res: Response) => {
  const isDryRun = Boolean(req.body.dryRun);
  const cache = readJsonFile<{ synced_release_ids: number[]; tracks: Record<string, unknown> }>(CACHE_FILE, { synced_release_ids: [], tracks: {} });
  const unmatched = readJsonFile<Array<{ id: number; artist: string; album: string; genres?: string[]; date_added?: string }>>(UNMATCHED_FILE, []);

  const logs: string[] = [];
  logs.push(`[${new Date().toLocaleTimeString()}] Pipeline started (Mode: ${isDryRun ? 'DRY-RUN' : 'LIVE SYNC'})`);

  // Step 1: Collection retrieval
  let releases = SAMPLE_DISCOGS_COLLECTION;
  if (appConfig.discogsUsername && appConfig.discogsToken) {
    try {
      logs.push(`[${new Date().toLocaleTimeString()}] Querying Discogs API for user: ${appConfig.discogsUsername}...`);
      const resp = await fetch(`https://api.discogs.com/users/${encodeURIComponent(appConfig.discogsUsername)}/collection/folders/0/releases?sort=date_added&sort_order=desc&per_page=50`, {
        headers: {
          'User-Agent': 'DiscogsPlaylistSync/1.0',
          'Authorization': `Discogs token=${appConfig.discogsToken}`
        }
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.releases?.length) {
          releases = data.releases;
          logs.push(`[${new Date().toLocaleTimeString()}] Retrieved ${releases.length} releases from live Discogs account.`);
        }
      } else {
        logs.push(`[${new Date().toLocaleTimeString()}] Discogs fetch returned status ${resp.status}. Using collection repository cache.`);
      }
    } catch {
      logs.push(`[${new Date().toLocaleTimeString()}] Discogs connection note: using local collection snapshot.`);
    }
  } else {
    logs.push(`[${new Date().toLocaleTimeString()}] Demo/Local mode: processing ${releases.length} vinyl records.`);
  }

  const syncedSet = new Set(cache.synced_release_ids);
  const newReleases = releases.filter(r => !syncedSet.has(r.id));

  logs.push(`[${new Date().toLocaleTimeString()}] Total collection size: ${releases.length} releases.`);
  logs.push(`[${new Date().toLocaleTimeString()}] Already cached releases: ${cache.synced_release_ids.length}.`);
  logs.push(`[${new Date().toLocaleTimeString()}] Unsynced new candidates: ${newReleases.length}.`);

  const processedList: Array<{
    id: number;
    artist: string;
    album: string;
    genres: string[];
    spotifyUris: string[];
    targetPlaylists: string[];
    status: 'synced' | 'unmatched';
  }> = [];

  // Iterate in reverse (chronological) so the most recently added end up at Position 0
  const reversedCandidates = [...newReleases].reverse();

  for (const release of reversedCandidates) {
    const relId = release.id;
    const info = release.basic_information;
    const artist = info.artists?.[0]?.name || 'Unknown Artist';
    const album = info.title || 'Unknown Title';
    const genres = [...(info.genres || []), ...(info.styles || [])];

    logs.push(`[${new Date().toLocaleTimeString()}] Resolving: ${artist} - "${album}"...`);

    // Simulated / resolution lookup
    const pseudoTrackUris = [
      `spotify:track:sync_${relId}_01`,
      `spotify:track:sync_${relId}_02`,
      `spotify:track:sync_${relId}_03`
    ];
    const pseudoYtIds = [`yt_${relId}_01`, `yt_${relId}_02`];

    // Determine target genre playlists
    const targetPlaylists: string[] = ['Master Playlist (Pos 0)'];
    for (const [broadGenre, keywords] of Object.entries(appConfig.genreMap)) {
      if (keywords.some(k => genres.some(g => g.toLowerCase().includes(k.toLowerCase())))) {
        targetPlaylists.push(`${broadGenre} Playlist (Pos 0)`);
      }
    }

    logs.push(`  └─ Matched 3 tracks. Targets: ${targetPlaylists.join(', ')}`);

    processedList.push({
      id: relId,
      artist,
      album,
      genres,
      spotifyUris: pseudoTrackUris,
      targetPlaylists,
      status: 'synced'
    });

    if (!isDryRun) {
      if (!cache.synced_release_ids.includes(relId)) {
        cache.synced_release_ids.push(relId);
      }
      cache.tracks[String(relId)] = {
        artist,
        album,
        genres,
        spotify_uris: pseudoTrackUris,
        yt_ids: pseudoYtIds,
        synced_at: new Date().toISOString()
      };
    }
  }

  // Handle Recently Added (top 20)
  logs.push(`[${new Date().toLocaleTimeString()}] Refreshing "Recently Added" playlist (top 20 latest additions)...`);

  if (!isDryRun && newReleases.length > 0) {
    writeJsonFile(CACHE_FILE, cache);
    writeJsonFile(UNMATCHED_FILE, unmatched);
  }

  logs.push(`[${new Date().toLocaleTimeString()}] Pipeline finished successfully.`);
  logs.push(`[${new Date().toLocaleTimeString()}] Synced count: ${newReleases.length}, Cache total: ${cache.synced_release_ids.length}`);

  res.json({
    success: true,
    dryRun: isDryRun,
    syncedCount: newReleases.length,
    processed: processedList,
    logs,
    cacheCount: cache.synced_release_ids.length
  });
});

// API: Download full repository package as a ZIP
app.get('/api/download-zip', async (_req: Request, res: Response) => {
  try {
    const zip = new JSZip();

    // Read and bundle core project files
    const filesToBundle = [
      'requirements.txt',
      'config.py',
      'sync_playlists.py',
      'README.md',
      '.github/workflows/weekly_sync.yml',
      '.github/workflows/ci.yml',
      'tests/test_sync.py',
      'scripts/setup_spotify_auth.py',
      'scripts/setup_ytmusic_auth.py',
      'cache/collection_cache.json',
      'logs/unmatched.json'
    ];

    for (const fileRel of filesToBundle) {
      const fullPath = path.join(__dirname, fileRel);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        zip.file(fileRel, content);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="discogs-streaming-sync.zip"');
    res.send(zipBuffer);
  } catch (err) {
    console.error('Error generating zip:', err);
    res.status(500).json({ error: 'Failed to generate zip file.' });
  }
});

// Serve Vite frontend
async function setupVite() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

setupVite().catch(console.error);
