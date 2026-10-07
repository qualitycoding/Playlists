import React from 'react';
import { Play, PlaySquare, Download } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onTriggerSync: (dryRun: boolean) => void;
  isSyncing: boolean;
  onDownloadZip: () => void;
  onOpenDriveModal: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  onTriggerSync,
  isSyncing,
  onDownloadZip,
  onOpenDriveModal,
}) => {
  const navItems = [
    { id: 'overview', label: 'Architecture & Overview' },
    { id: 'collection', label: 'Discogs Collection' },
    { id: 'playlists', label: 'Playlists & Genres' },
    { id: 'cache', label: 'Cache & Unmatched' },
    { id: 'code', label: 'Python Scripts & Workflow' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        {/* Zone 1: Wordmark Single Text Element */}
        <button
          onClick={() => setActiveTab('overview')}
          className="text-left font-serif text-lg font-bold tracking-tight text-neutral-100 hover:text-white transition-colors"
        >
          Discogs Streaming Sync
        </button>

        {/* Zone 2: Clean Text Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-neutral-400">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`transition-colors py-1 ${
                  isActive
                    ? 'text-white border-b-2 border-emerald-400 font-semibold'
                    : 'hover:text-neutral-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1-2 Primary Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onTriggerSync(true)}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-700 rounded-md hover:bg-neutral-800 hover:text-white transition-colors disabled:opacity-50"
            title="Simulate sync without mutating playlists"
          >
            <PlaySquare className="w-3.5 h-3.5 text-neutral-400" />
            <span className="whitespace-nowrap">Dry Run</span>
          </button>

          <button
            onClick={() => onTriggerSync(false)}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-black bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors disabled:opacity-50"
            title="Execute live sync with streaming playlists"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="whitespace-nowrap">{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>

          <button
            onClick={onOpenDriveModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-700 rounded-md hover:bg-neutral-800 hover:text-white transition-colors"
            title="Save project package to Google Drive"
          >
            <span className="text-emerald-400">▲</span>
            <span className="whitespace-nowrap">Save to Drive</span>
          </button>

          <button
            onClick={onDownloadZip}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-700 rounded-md hover:bg-neutral-800 hover:text-white transition-colors"
            title="Download project zip file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Download ZIP</span>
          </button>
        </div>
      </div>
    </header>
  );
};
