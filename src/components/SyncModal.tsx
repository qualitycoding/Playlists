import React from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, ArrowRight, X, Disc } from 'lucide-react';
import { SyncRunResult } from '../types';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: SyncRunResult | null;
  loading: boolean;
  dryRun: boolean;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  result,
  loading,
  dryRun,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-3xl rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${dryRun ? 'bg-amber-950/40 border-amber-800 text-amber-400' : 'bg-emerald-950/40 border-emerald-800 text-emerald-400'}`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">
                  {dryRun ? 'Dry-Run Simulation Pipeline' : 'Streaming Playlist Sync Pipeline'}
                </h3>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                  {dryRun ? 'DRY-RUN' : 'LIVE'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {dryRun
                  ? 'Testing collection diff and track resolution without altering streaming playlists.'
                  : 'Resolving tracks and prepending to Master & Genre playlists at Position 0.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <Disc className="w-10 h-10 text-emerald-400 animate-spin" style={{ animationDuration: '2s' }} />
            <div className="text-center">
              <div className="text-sm font-semibold text-white">Executing Sync Engine...</div>
              <p className="text-xs text-neutral-400 mt-1">
                Querying Discogs collection, calculating diff against cache, and matching streaming URIs.
              </p>
            </div>
          </div>
        )}

        {/* Results View */}
        {!loading && result && (
          <div className="space-y-5 overflow-y-auto pr-1">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800">
              <div>
                <span className="block text-[11px] text-neutral-400">PROCESSED RELEASES</span>
                <span className="font-mono text-lg font-bold text-white tabular-nums">
                  {result.syncedCount}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-neutral-400">ORDERING STRATEGY</span>
                <span className="font-mono text-lg font-bold text-emerald-400">
                  Position 0
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-neutral-400">STATE CACHE TOTAL</span>
                <span className="font-mono text-lg font-bold text-white tabular-nums">
                  {result.cacheCount}
                </span>
              </div>
            </div>

            {/* Processed Releases List */}
            {result.processed && result.processed.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Resolved Album Matches
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {result.processed.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-white">
                          {item.artist} — {item.album}
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          Targets: {item.targetPlaylists.join(' · ')}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{item.spotifyUris.length} Tracks</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Execution Logs Terminal */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Pipeline Execution Logs
              </h4>
              <div className="rounded-lg bg-black border border-neutral-800 p-4 font-mono text-[11px] text-neutral-300 space-y-1 max-h-48 overflow-y-auto select-text leading-relaxed">
                {result.logs.map((log, i) => (
                  <div key={i} className="text-neutral-400">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-[11px] text-neutral-500">
            {dryRun
              ? 'Simulation finished. Ready to run live with streaming playlists.'
              : 'Sync complete. Playlists updated on Spotify & YouTube Music.'}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-black bg-white hover:bg-neutral-200 rounded-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
