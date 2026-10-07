import React, { useState } from 'react';
import { Disc, Sparkles, RefreshCw, CheckCircle2, ArrowRight, Settings, Radio } from 'lucide-react';
import { SystemStatus } from '../types';

interface OverviewHeroProps {
  status: SystemStatus | null;
  onRefresh: () => void;
  onTriggerSync: (dryRun: boolean) => void;
  onSaveConfig: (updated: Partial<SystemStatus['config'] & { discogsToken?: string; spotifyClientId?: string; spotifyClientSecret?: string; spotifyRefreshToken?: string }>) => Promise<void>;
  onNavigateTab: (tab: string) => void;
}

export const OverviewHero: React.FC<OverviewHeroProps> = ({
  status,
  onRefresh,
  onTriggerSync,
  onSaveConfig,
  onNavigateTab,
}) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [discogsUsername, setDiscogsUsername] = useState(status?.config?.discogsUsername || '');
  const [discogsToken, setDiscogsToken] = useState('');
  const [spotifyClientId, setSpotifyClientId] = useState('');
  const [spotifyClientSecret, setSpotifyClientSecret] = useState('');
  const [spotifyRefreshToken, setSpotifyRefreshToken] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveConfig({
        discogsUsername,
        discogsToken: discogsToken || undefined,
        spotifyClientId: spotifyClientId || undefined,
        spotifyClientSecret: spotifyClientSecret || undefined,
        spotifyRefreshToken: spotifyRefreshToken || undefined,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      setShowConfigModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const cachedCount = status?.cachedCount ?? 3;
  const unmatchedCount = status?.unmatchedCount ?? 1;

  return (
    <div className="space-y-8">
      {/* Editorial Hero Visual Card */}
      <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60 shadow-xl">
        <div className="relative grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
          {/* Left Column: Context & Execution Brief */}
          <div className="lg:col-span-7 p-8 md:p-10 flex flex-col justify-between z-10">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 mb-3 tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>WEEKLY AUTOMATED SYNCHRONIZATION</span>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span className="text-neutral-400 font-mono text-[11px]">cron: 0 3 * * 0</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight leading-tight max-w-2xl">
                Discogs Collection to Spotify & YouTube Music Sync
              </h1>

              <p className="mt-3 text-sm text-neutral-300 leading-relaxed max-w-xl">
                Bridges your physical vinyl record collection with streaming playlists.
                Extracts your Discogs releases and genres, maps tracks via Spotify and YouTube Music APIs,
                and prepends new additions to the very top (Position 0).
              </p>
            </div>

            {/* Architecture Metrics & Target Rules */}
            <div className="mt-8 pt-6 border-t border-neutral-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="block text-[11px] font-medium text-neutral-400">STATE CACHE</span>
                <span className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
                  {cachedCount}
                </span>
                <span className="block text-[11px] text-neutral-500">Indexed releases</span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-neutral-400">UNMATCHED</span>
                <span className="mt-1 font-mono text-xl font-bold text-amber-400 tabular-nums">
                  {unmatchedCount}
                </span>
                <span className="block text-[11px] text-neutral-500">Pending review</span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-neutral-400">PLAYLIST STRATEGY</span>
                <span className="mt-1 font-mono text-xl font-bold text-emerald-400">
                  Pos 0
                </span>
                <span className="block text-[11px] text-neutral-500">Newest first</span>
              </div>

              <div>
                <span className="block text-[11px] font-medium text-neutral-400">TARGET TIERS</span>
                <span className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
                  3 Tiers
                </span>
                <span className="block text-[11px] text-neutral-500">Master · Recent · Genres</span>
              </div>
            </div>
          </div>

          {/* Right Column: High-Fidelity Editorial Turntable Visual Asset */}
          <div className="lg:col-span-5 relative min-h-[240px] lg:min-h-full overflow-hidden border-t lg:border-t-0 lg:border-l border-neutral-800">
            <img
              src="/src/assets/images/hero_vinyl_sync_1791391394298.jpg"
              alt="High fidelity turntable with black vinyl record and tonearm"
              className="absolute inset-0 h-full w-full object-cover object-center filter brightness-90 contrast-105"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback container in case asset fails
                e.currentTarget.style.display = 'none';
              }}
            />
            {/* Measured contrast scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent lg:bg-gradient-to-r lg:from-neutral-950/80 lg:via-transparent lg:to-transparent pointer-events-none" />

            <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded bg-neutral-950/80 px-2.5 py-1 text-[11px] font-mono text-neutral-300 backdrop-blur border border-neutral-700">
              <Disc className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>33⅓ RPM · Analog to Digital Engine</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Architecture Flowchart & Operational Status */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-800">
          <div>
            <h2 className="text-base font-semibold text-white">System Architecture & Execution Flow</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Scheduled weekly via GitHub Actions or triggered on demand through Python CLI
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors border border-neutral-700"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>API Credentials</span>
            </button>
            <button
              onClick={onRefresh}
              className="p-1.5 text-neutral-400 hover:text-white rounded-md hover:bg-neutral-800 transition-colors"
              title="Refresh status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3-Step Interactive Architecture Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1: Discogs API */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 relative group">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
              <span className="font-mono text-emerald-400">01. SOURCE</span>
              <span className="text-[11px]">{status?.config?.discogsUsername ? `@${status.config.discogsUsername}` : 'Sample/Demo Active'}</span>
            </div>
            <h3 className="text-sm font-semibold text-white">Discogs User Collection</h3>
            <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
              Fetches collection folders sorted by <code className="text-neutral-300">date_added desc</code>. Extracts artist, album title, release year, genre tags, and styles.
            </p>
            <div className="mt-4 pt-3 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-500">
              <span>Rate limit guard: 60 req/min</span>
              <button
                onClick={() => onNavigateTab('collection')}
                className="text-emerald-400 hover:underline flex items-center gap-1"
              >
                Inspect
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Step 2: Sync Engine & State Cache */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 relative group">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
              <span className="font-mono text-emerald-400">02. SYNC ENGINE</span>
              <span className="font-mono text-neutral-300 tabular-nums">{cachedCount} cached</span>
            </div>
            <h3 className="text-sm font-semibold text-white">Cache & Track Resolver</h3>
            <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
              Compares against <code className="text-neutral-300">collection_cache.json</code>. Resolves ISRC/catalog queries on Spotify & YT Music. Unmatched items route to <code className="text-neutral-300">unmatched.json</code>.
            </p>
            <div className="mt-4 pt-3 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-500">
              <span>Chronological reverse order</span>
              <button
                onClick={() => onNavigateTab('cache')}
                className="text-emerald-400 hover:underline flex items-center gap-1"
              >
                Inspect Cache
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Step 3: Playlist Targets */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 relative group">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
              <span className="font-mono text-emerald-400">03. TARGET DESTINATIONS</span>
              <span className="text-[11px]">Spotify + YT Music</span>
            </div>
            <h3 className="text-sm font-semibold text-white">Streaming Playlists</h3>
            <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
              Adds resolved track IDs at <strong>Position 0</strong> (top of playlist). Updates Master playlist, auto-refreshes Recently Added (top 20), and maps to Genre playlists.
            </p>
            <div className="mt-4 pt-3 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-500">
              <span>6 Genre classifications</span>
              <button
                onClick={() => onNavigateTab('playlists')}
                className="text-emerald-400 hover:underline flex items-center gap-1"
              >
                View Mappings
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Execution Bar */}
        <div className="mt-6 p-4 rounded-lg bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <div className="text-xs text-neutral-300">
              <span className="font-semibold text-white">Ready to run: </span>
              Trigger a Dry-Run simulation to preview playlist additions without altering your streaming accounts.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onTriggerSync(true)}
              className="px-3 py-1.5 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors"
            >
              Simulate Dry-Run
            </button>
            <button
              onClick={() => onTriggerSync(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-black bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Run Pipeline Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">API Credentials & Sync Configuration</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Stored securely for your session and sync automation
                </p>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-neutral-400 hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Discogs Settings</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Discogs Username</label>
                    <input
                      type="text"
                      value={discogsUsername}
                      onChange={(e) => setDiscogsUsername(e.target.value)}
                      placeholder="e.g. vinyl_collector_99"
                      className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Discogs Personal Token</label>
                    <input
                      type="password"
                      value={discogsToken}
                      onChange={(e) => setDiscogsToken(e.target.value)}
                      placeholder="From Developer Settings"
                      className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-neutral-900">
                <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Spotify Settings</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">SPOTIPY_CLIENT_ID</label>
                    <input
                      type="text"
                      value={spotifyClientId}
                      onChange={(e) => setSpotifyClientId(e.target.value)}
                      placeholder="Spotify App Client ID"
                      className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">SPOTIPY_CLIENT_SECRET</label>
                    <input
                      type="password"
                      value={spotifyClientSecret}
                      onChange={(e) => setSpotifyClientSecret(e.target.value)}
                      placeholder="Spotify App Client Secret"
                      className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">SPOTIFY_REFRESH_TOKEN</label>
                  <input
                    type="password"
                    value={spotifyRefreshToken}
                    onChange={(e) => setSpotifyRefreshToken(e.target.value)}
                    placeholder="Generated via setup_spotify_auth.py"
                    className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
                <span className="text-xs text-neutral-500">
                  Leave blank to retain current environment variables
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-1.5 text-xs font-medium text-black bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md bg-emerald-950 border border-emerald-700 px-4 py-2.5 text-xs text-emerald-200 shadow-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Configuration saved successfully.</span>
        </div>
      )}
    </div>
  );
};
