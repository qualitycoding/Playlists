import React, { useState } from 'react';
import { Database, AlertCircle, Trash2, CheckCircle2, Search, ExternalLink, RefreshCw } from 'lucide-react';
import { CollectionCache, UnmatchedItem } from '../types';

interface CacheAndUnmatchedProps {
  cache: CollectionCache | null;
  unmatched: UnmatchedItem[];
  onResetCache: () => Promise<void>;
  onResolveUnmatched: (data: {
    releaseId: number;
    artist: string;
    album: string;
    spotifyUris: string[];
    ytIds: string[];
  }) => Promise<void>;
  onRefresh: () => void;
}

export const CacheAndUnmatched: React.FC<CacheAndUnmatchedProps> = ({
  cache,
  unmatched,
  onResetCache,
  onResolveUnmatched,
  onRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'cache' | 'unmatched'>('cache');
  const [resolvingItem, setResolvingItem] = useState<UnmatchedItem | null>(null);
  const [spotifyUriInput, setSpotifyUriInput] = useState('');
  const [ytIdInput, setYtIdInput] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [searchCacheQuery, setSearchCacheQuery] = useState('');

  const cachedEntries = Object.entries(cache?.tracks || {});

  const filteredCachedEntries = cachedEntries.filter(([, track]) => {
    const q = searchCacheQuery.toLowerCase();
    return (
      track.artist.toLowerCase().includes(q) ||
      track.album.toLowerCase().includes(q) ||
      track.genres.some((g) => g.toLowerCase().includes(q))
    );
  });

  const handleOpenResolve = (item: UnmatchedItem) => {
    setResolvingItem(item);
    setSpotifyUriInput(`spotify:track:resolved_${item.id}_01\nspotify:track:resolved_${item.id}_02`);
    setYtIdInput(`yt_resolved_${item.id}`);
  };

  const handleSubmitResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingItem) return;

    setResolving(true);
    try {
      const spUris = spotifyUriInput
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const ytIds = ytIdInput
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      await onResolveUnmatched({
        releaseId: resolvingItem.id,
        artist: resolvingItem.artist,
        album: resolvingItem.album,
        spotifyUris: spUris,
        ytIds,
      });

      setResolvingItem(null);
    } catch (err) {
      console.error(err);
    } finally {
      setResolving(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!window.confirm('Are you sure you want to clear collection_cache.json? The next sync run will re-process all collection releases.')) {
      return;
    }
    setResetting(true);
    try {
      await onResetCache();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Sub-Tab Navigation */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span>STATE PERSISTENCE & RESOLUTION LOGS</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 font-mono">FILE SYSTEM BACKED</span>
            </div>
            <h2 className="text-xl font-serif font-bold text-white mt-1">
              State Cache & Unmatched Vinyl Records
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Tracks synced release IDs in <code className="text-neutral-300">cache/collection_cache.json</code> and unmatched catalog queries in <code className="text-neutral-300">logs/unmatched.json</code>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-1.5 text-neutral-400 hover:text-white rounded-md hover:bg-neutral-800 transition-colors"
              title="Refresh cache files"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleConfirmReset}
              disabled={resetting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-950/70 border border-red-900/60 rounded-md transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{resetting ? 'Resetting...' : 'Reset Cache File'}</span>
            </button>
          </div>
        </div>

        {/* Sub-tab selection */}
        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('cache')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeSubTab === 'cache'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>collection_cache.json ({cachedEntries.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('unmatched')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeSubTab === 'unmatched'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>unmatched.json ({unmatched.length})</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: State Cache Viewer */}
      {activeSubTab === 'cache' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-500" />
              <input
                type="text"
                value={searchCacheQuery}
                onChange={(e) => setSearchCacheQuery(e.target.value)}
                placeholder="Search cached artist, album, genre..."
                className="w-full rounded-md border border-neutral-800 bg-neutral-900 pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-emerald-400 focus:outline-none"
              />
            </div>
            <span className="text-xs font-mono text-neutral-500 tabular-nums">
              Showing {filteredCachedEntries.length} of {cachedEntries.length} entries
            </span>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/60 text-neutral-400">
                    <th className="py-3 px-4 font-medium">Release ID</th>
                    <th className="py-3 px-4 font-medium">Artist & Album</th>
                    <th className="py-3 px-4 font-medium">Mapped Genres</th>
                    <th className="py-3 px-4 font-medium text-right">Resolved Spotify Tracks</th>
                    <th className="py-3 px-4 font-medium text-right">Synced Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {filteredCachedEntries.map(([relId, track]) => (
                    <tr key={relId} className="hover:bg-neutral-900/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-neutral-400 tabular-nums">
                        #{relId}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{track.album}</div>
                        <div className="text-[11px] text-neutral-400">{track.artist}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 text-[11px] text-neutral-400">
                          {track.genres?.map((g, i) => (
                            <span key={g}>
                              {g}
                              {i < track.genres.length - 1 && <span className="text-neutral-600 ml-1">·</span>}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-neutral-300 tabular-nums">
                        {track.spotify_uris?.length || 0} URIs
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-neutral-500 tabular-nums text-[11px]">
                        {new Date(track.synced_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}

                  {filteredCachedEntries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-neutral-500">
                        No cached records found. Run a sync to populate the state cache.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Unmatched Records Viewer */}
      {activeSubTab === 'unmatched' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-950/30 border border-amber-900/50 p-4 text-xs text-amber-200 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">Unmatched Vinyl Records: </span>
              These items were found in your Discogs collection but automated exact search on Spotify and YouTube Music did not return high-confidence album matches (common for vinyl-only pressings or localized reissue titles).
              Click <strong>Resolve & Match</strong> to pair with specific streaming URIs.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unmatched.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-neutral-800 bg-neutral-950 p-5 space-y-4"
              >
                <div className="flex items-center justify-between text-xs pb-3 border-b border-neutral-800">
                  <span className="font-mono text-neutral-500">Discogs #{item.id}</span>
                  <span className="text-amber-400 text-[11px]">Unmatched</span>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-white">{item.album}</h4>
                  <p className="text-xs text-neutral-300 mt-0.5">{item.artist}</p>
                  {item.genres && (
                    <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-neutral-500">
                      {item.genres.map((g, i) => (
                        <span key={g}>
                          {g}
                          {i < item.genres!.length - 1 && <span className="text-neutral-700 ml-1">·</span>}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.note && (
                    <p className="mt-2 text-[11px] text-neutral-400 italic">
                      Note: {item.note}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-neutral-900 flex items-center justify-between">
                  <a
                    href={`https://www.discogs.com/release/${item.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1"
                  >
                    <span>View on Discogs</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    onClick={() => handleOpenResolve(item)}
                    className="px-3 py-1.5 text-xs font-medium text-black bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors"
                  >
                    Resolve & Match
                  </button>
                </div>
              </div>
            ))}

            {unmatched.length === 0 && (
              <div className="col-span-2 rounded-xl border border-neutral-800 bg-neutral-950 p-12 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400 mb-3" />
                <h3 className="text-sm font-semibold text-white">All vinyl records matched!</h3>
                <p className="mt-1 text-xs text-neutral-400">
                  There are currently no unmatched items in <code className="text-neutral-300">logs/unmatched.json</code>.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Match Modal */}
      {resolvingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">Manually Match Streaming Tracks</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Pair &quot;{resolvingItem.artist} - {resolvingItem.album}&quot; with streaming identifiers
                </p>
              </div>
              <button
                onClick={() => setResolvingItem(null)}
                className="text-neutral-400 hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitResolve} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Spotify Track URIs (one per line)
                </label>
                <textarea
                  rows={3}
                  value={spotifyUriInput}
                  onChange={(e) => setSpotifyUriInput(e.target.value)}
                  placeholder="spotify:track:..."
                  className="w-full rounded border border-neutral-800 bg-neutral-900 p-2.5 text-xs font-mono text-white focus:border-emerald-400 focus:outline-none"
                />
                <span className="block text-[11px] text-neutral-500 mt-1">
                  Find in Spotify app: Right click track → Share → Copy Spotify URI
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  YouTube Music Video IDs (one per line)
                </label>
                <textarea
                  rows={2}
                  value={ytIdInput}
                  onChange={(e) => setYtIdInput(e.target.value)}
                  placeholder="videoId from music.youtube.com/watch?v=..."
                  className="w-full rounded border border-neutral-800 bg-neutral-900 p-2.5 text-xs font-mono text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolvingItem(null)}
                  className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="px-4 py-1.5 text-xs font-medium text-black bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors disabled:opacity-50"
                >
                  {resolving ? 'Saving...' : 'Promote to Cache & Resolve'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
