import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { Navigation } from './components/Navigation';
import { OverviewHero } from './components/OverviewHero';
import { CollectionExplorer } from './components/CollectionExplorer';
import { PlaylistMapping } from './components/PlaylistMapping';
import { CacheAndUnmatched } from './components/CacheAndUnmatched';
import { CodeViewerAndExport } from './components/CodeViewerAndExport';
import { SyncModal } from './components/SyncModal';
import { GoogleDriveExportModal } from './components/GoogleDriveExportModal';
import { initAuth, SCOPES } from './lib/auth';
import { DiscogsRelease, CollectionCache, UnmatchedItem, SystemStatus, SyncRunResult } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [releases, setReleases] = useState<DiscogsRelease[]>([]);
  const [cache, setCache] = useState<CollectionCache | null>(null);
  const [unmatched, setUnmatched] = useState<UnmatchedItem[]>([]);
  const [loadingCollection, setLoadingCollection] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncModalOpen, setSyncModalOpen] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<SyncRunResult | null>(null);
  const [syncDryRun, setSyncDryRun] = useState<boolean>(false);

  // Google Drive & Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [driveModalOpen, setDriveModalOpen] = useState<boolean>(false);
  const [spotifyCallbackCode, setSpotifyCallbackCode] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setSpotifyCallbackCode(code);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Fetch system status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      } else {
        // Fallback for static hosting (e.g. GitHub Pages)
        setStatus({
          discogsConfigured: false,
          spotifyConfigured: false,
          ytmusicConfigured: false,
          cachedCount: 3,
          unmatchedCount: 1,
          config: {
            discogsUsername: '',
            hasDiscogsToken: false,
            hasSpotifyCredentials: false,
            hasSpotifyRefreshToken: false,
            spotifyMasterPlaylistId: '37i9dQZF1DXcBWIGoYBM5M',
            spotifyRecentlyAddedPlaylistId: '37i9dQZF1DX0XUsuxWHRQd',
            spotifyGenrePlaylists: {
              Electronic: '37i9dQZF1DXdLEN7aqioXM',
              Rock: '37i9dQZF1DWXRqgorJj26U',
              Jazz: '37i9dQZF1DXbITWG1ZJKYt',
              'Hip-Hop': '37i9dQZF1DX0XUsuxWHRQd',
              'Funk / Soul': '37i9dQZF1DWWvh2zOz19qC',
              Classical: '37i9dQZF1DWWEWGlCnxtYF',
            },
            ytmusicAuthFile: 'headers_auth.json',
            ytmusicMasterPlaylistId: 'PLrAlJpS2-7eI1i7s0',
            genreMap: {
              Electronic: ['Electronic', 'Synthesizer', 'House', 'Techno', 'Ambient', 'Electro', 'Downtempo', 'Trance', 'IDM'],
              Rock: ['Rock', 'Indie Rock', 'Alternative Rock', 'Punk', 'Metal', 'Psychedelic Rock', 'Hard Rock', 'Post-Punk'],
              Jazz: ['Jazz', 'Hard Bop', 'Fusion', 'Post Bop', 'Free Jazz', 'Modal', 'Bop', 'Cool Jazz'],
              'Hip-Hop': ['Hip Hop', 'Boom Bap', 'Trap', 'Conscious', 'Trip Hop', 'Instrumental Hip-Hop'],
              'Funk / Soul': ['Funk', 'Soul', 'Disco', 'Rhythm & Blues', 'Neo Soul', 'Afrobeat'],
              Classical: ['Classical', 'Baroque', 'Contemporary', 'Romantic', 'Modern Classical', 'Minimalism'],
            },
          },
        });
      }
    } catch {
      // Offline fallback
    }
  }, []);

  // Fetch Discogs collection
  const fetchCollection = useCallback(async () => {
    setLoadingCollection(true);
    try {
      const res = await fetch('/api/discogs/collection');
      if (res.ok) {
        const data = await res.json();
        setReleases(data.releases || data.fallbackReleases || []);
      }
    } catch (err) {
      console.error('Failed to load Discogs collection:', err);
    } finally {
      setLoadingCollection(false);
    }
  }, []);

  // Fetch cache
  const fetchCache = useCallback(async () => {
    try {
      const res = await fetch('/api/cache');
      if (res.ok) {
        const data = await res.json();
        setCache(data);
      }
    } catch (err) {
      console.error('Failed to load cache:', err);
    }
  }, []);

  // Fetch unmatched
  const fetchUnmatched = useCallback(async () => {
    try {
      const res = await fetch('/api/unmatched');
      if (res.ok) {
        const data = await res.json();
        setUnmatched(data);
      }
    } catch (err) {
      console.error('Failed to load unmatched:', err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchCollection();
    fetchCache();
    fetchUnmatched();
  }, [fetchStatus, fetchCollection, fetchCache, fetchUnmatched]);

  // Trigger sync run (dry-run or live)
  const handleTriggerSync = async (dryRun: boolean) => {
    setIsSyncing(true);
    setSyncDryRun(dryRun);
    setSyncResult(null);
    setSyncModalOpen(true);

    try {
      const res = await fetch('/api/sync/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data: SyncRunResult = await res.json();
        setSyncResult(data);
        fetchStatus();
        fetchCache();
        fetchUnmatched();
        setIsSyncing(false);
        return;
      }
    } catch {
      // Backend route not available (e.g. static GitHub Pages)
    }

    // Execute in-browser simulation for static hosting environments
    await new Promise((resolve) => setTimeout(resolve, 600));

    const currentReleases = releases.length > 0 ? releases : [
      {
        id: 9931204,
        date_added: "2026-10-06T15:30:00Z",
        basic_information: {
          title: "Selected Ambient Works 85-92",
          artists: [{ name: "Aphex Twin" }],
          year: 1992,
          genres: ["Electronic"],
          styles: ["Ambient", "Techno", "IDM"],
        }
      },
      {
        id: 5491022,
        date_added: "2026-10-04T11:20:00Z",
        basic_information: {
          title: "A Love Supreme",
          artists: [{ name: "John Coltrane" }],
          year: 1965,
          genres: ["Jazz"],
          styles: ["Hard Bop", "Modal"],
        }
      },
      {
        id: 3829104,
        date_added: "2026-10-02T19:45:00Z",
        basic_information: {
          title: "The Dark Side of the Moon",
          artists: [{ name: "Pink Floyd" }],
          year: 1973,
          genres: ["Rock"],
          styles: ["Psychedelic Rock"],
        }
      }
    ];

    const currentCache = cache || { synced_release_ids: [2481923, 1092831, 7821945], tracks: {} };
    const syncedSet = new Set(currentCache.synced_release_ids || []);
    const newReleases = currentReleases.filter((r) => !syncedSet.has(r.id));

    const timeStr = new Date().toLocaleTimeString();
    const logs: string[] = [
      `[${timeStr}] Initializing sync pipeline (Mode: ${dryRun ? 'DRY-RUN' : 'LIVE SIMULATION'})...`,
      `[${timeStr}] Collection contains ${currentReleases.length} vinyl records.`,
      `[${timeStr}] Currently indexed in cache: ${syncedSet.size}. New candidates: ${newReleases.length}.`,
    ];

    const processedList: SyncRunResult['processed'] = [];
    const genreMap = status?.config?.genreMap || {
      Electronic: ['Electronic', 'Ambient', 'Techno', 'House'],
      Rock: ['Rock', 'Psychedelic Rock', 'Alternative Rock'],
      Jazz: ['Jazz', 'Modal', 'Hard Bop'],
      'Hip-Hop': ['Hip Hop', 'Boom Bap'],
      'Funk / Soul': ['Funk', 'Soul', 'Disco'],
      Classical: ['Classical'],
    };

    for (const rel of [...newReleases].reverse()) {
      const info = rel.basic_information;
      const artist = info.artists?.[0]?.name || 'Unknown Artist';
      const album = info.title;
      const genres = [...(info.genres || []), ...(info.styles || [])];

      logs.push(`[${new Date().toLocaleTimeString()}] Resolving tracks: ${artist} - "${album}"...`);

      const targetPlaylists: string[] = ['Master Playlist (Pos 0)'];
      for (const [broadGenre, keywords] of Object.entries(genreMap)) {
        if (keywords.some((k) => genres.some((g) => g.toLowerCase().includes(k.toLowerCase())))) {
          targetPlaylists.push(`${broadGenre} Playlist (Pos 0)`);
        }
      }

      const pseudoUris = [
        `spotify:track:sync_${rel.id}_01`,
        `spotify:track:sync_${rel.id}_02`,
        `spotify:track:sync_${rel.id}_03`,
      ];

      logs.push(`  └─ Matched 3 tracks. Target playlists: ${targetPlaylists.join(' · ')}`);

      processedList.push({
        id: rel.id,
        artist,
        album,
        genres,
        spotifyUris: pseudoUris,
        targetPlaylists,
        status: 'synced',
      });
    }

    logs.push(`[${new Date().toLocaleTimeString()}] Updating "Recently Added" playlist (top 20 latest additions)...`);
    logs.push(`[${new Date().toLocaleTimeString()}] Simulation completed successfully.`);

    const clientResult: SyncRunResult = {
      success: true,
      dryRun,
      syncedCount: newReleases.length,
      processed: processedList,
      logs,
      cacheCount: syncedSet.size + (dryRun ? 0 : newReleases.length),
    };

    if (!dryRun && newReleases.length > 0) {
      const updatedIds = [...(currentCache.synced_release_ids || []), ...newReleases.map((r) => r.id)];
      setCache({ ...currentCache, synced_release_ids: updatedIds });
    }

    setSyncResult(clientResult);
    setIsSyncing(false);
  };

  // Save config
  const handleSaveConfig = async (updated: Partial<SystemStatus['config'] & {
    discogsToken?: string;
    spotifyClientId?: string;
    spotifyClientSecret?: string;
    spotifyRefreshToken?: string;
  }>) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        await fetchStatus();
        await fetchCollection();
      }
    } catch (err) {
      console.error('Error saving config:', err);
    }
  };

  // Save genre map
  const handleSaveGenreMap = async (genreMap: Record<string, string[]>) => {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genreMap }),
      });
      fetchStatus();
    } catch (err) {
      console.error('Error saving genre map:', err);
    }
  };

  // Save playlists
  const handleSavePlaylists = async (playlists: {
    spotifyMasterPlaylistId: string;
    spotifyRecentlyAddedPlaylistId: string;
    spotifyGenrePlaylists: Record<string, string>;
    ytmusicMasterPlaylistId: string;
  }) => {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playlists),
      });
      fetchStatus();
    } catch (err) {
      console.error('Error saving playlists:', err);
    }
  };

  // Reset cache
  const handleResetCache = async () => {
    try {
      const res = await fetch('/api/cache/reset', { method: 'POST' });
      if (res.ok) {
        fetchStatus();
        fetchCache();
      }
    } catch (err) {
      console.error('Error resetting cache:', err);
    }
  };

  // Resolve unmatched track
  const handleResolveUnmatched = async (data: {
    releaseId: number;
    artist: string;
    album: string;
    spotifyUris: string[];
    ytIds: string[];
  }) => {
    try {
      const res = await fetch('/api/unmatched/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        fetchStatus();
        fetchCache();
        fetchUnmatched();
      }
    } catch (err) {
      console.error('Error resolving unmatched:', err);
    }
  };

  // Download project ZIP (works both with Express backend and on static GitHub Pages)
  const handleDownloadZip = async () => {
    try {
      const res = await fetch('/api/download-zip');
      if (res.ok) {
        window.location.href = '/api/download-zip';
        return;
      }
    } catch {
      // Fallback to client-side generation
    }
    const { downloadProjectZipClientSide } = await import('./lib/exportZip');
    await downloadProjectZipClientSide();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Bar Navigation */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onTriggerSync={handleTriggerSync}
        isSyncing={isSyncing}
        onDownloadZip={handleDownloadZip}
        onOpenDriveModal={() => setDriveModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {spotifyCallbackCode && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/60 border border-emerald-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="font-semibold text-emerald-300">
                Spotify Authorization Code Received!
              </div>
              <div className="text-neutral-300 font-mono text-[11px] truncate max-w-md">
                Code: {spotifyCallbackCode.slice(0, 32)}...
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(spotifyCallbackCode);
                alert('Copied code to clipboard! Open "API Credentials" → "Generate on Mobile / Android" to exchange for Refresh Token.');
              }}
              className="px-3.5 py-1.5 rounded bg-emerald-400 hover:bg-emerald-300 text-black font-semibold whitespace-nowrap"
            >
              Copy Code to Clipboard
            </button>
          </div>
        )}
        {activeTab === 'overview' && (
          <OverviewHero
            status={status}
            onRefresh={() => {
              fetchStatus();
              fetchCache();
              fetchUnmatched();
            }}
            onTriggerSync={handleTriggerSync}
            onSaveConfig={handleSaveConfig}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'collection' && (
          <CollectionExplorer
            releases={releases}
            cache={cache}
            loading={loadingCollection}
            onRefreshCollection={fetchCollection}
            username={status?.config?.discogsUsername || ''}
          />
        )}

        {activeTab === 'playlists' && (
          <PlaylistMapping
            status={status}
            onSaveGenreMap={handleSaveGenreMap}
            onSavePlaylists={handleSavePlaylists}
          />
        )}

        {activeTab === 'cache' && (
          <CacheAndUnmatched
            cache={cache}
            unmatched={unmatched}
            onResetCache={handleResetCache}
            onResolveUnmatched={handleResolveUnmatched}
            onRefresh={() => {
              fetchCache();
              fetchUnmatched();
            }}
          />
        )}

        {activeTab === 'code' && (
          <CodeViewerAndExport
            onDownloadZip={handleDownloadZip}
            onOpenDriveModal={() => setDriveModalOpen(true)}
          />
        )}
      </main>

      {/* Sync Execution Modal */}
      <SyncModal
        isOpen={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        result={syncResult}
        loading={isSyncing}
        dryRun={syncDryRun}
      />

      {/* Google Drive Export Modal */}
      <GoogleDriveExportModal
        isOpen={driveModalOpen}
        onClose={() => setDriveModalOpen(false)}
        currentUser={currentUser}
        accessToken={accessToken}
        onAuthSuccess={(user, token) => {
          setCurrentUser(user);
          setAccessToken(token);
        }}
        onAuthSignOut={() => {
          setCurrentUser(null);
          setAccessToken(null);
        }}
      />

      {/* Clean quiet footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-6 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-serif font-semibold text-neutral-400">Discogs Streaming Sync</span>
            <span aria-hidden="true">·</span>
            <span>Automated Vinyl to Spotify & YouTube Music Bridge</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-neutral-500">
            <span>Position 0 Inserter</span>
            <span aria-hidden="true">·</span>
            <span>Weekly Cron Pipeline</span>
            <span aria-hidden="true">·</span>
            <span>State Cache Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
