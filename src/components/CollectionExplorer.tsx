import React, { useState } from 'react';
import { Search, Disc, Filter, CheckCircle2, Clock, Music } from 'lucide-react';
import { DiscogsRelease, CollectionCache } from '../types';

interface CollectionExplorerProps {
  releases: DiscogsRelease[];
  cache: CollectionCache | null;
  loading: boolean;
  onRefreshCollection: () => void;
  username: string;
}

export const CollectionExplorer: React.FC<CollectionExplorerProps> = ({
  releases,
  cache,
  loading,
  onRefreshCollection,
  username,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [filterStatus, setFilterStatus] = useState<'all' | 'synced' | 'pending'>('all');

  const syncedIds = new Set(cache?.synced_release_ids || []);

  // Compute genres available in collection
  const allGenres = Array.from(
    new Set(
      releases.flatMap((r) => [
        ...(r.basic_information.genres || []),
        ...(r.basic_information.styles || []),
      ])
    )
  ).sort();

  const filteredReleases = releases.filter((release) => {
    const info = release.basic_information;
    const title = info.title.toLowerCase();
    const artist = (info.artists?.[0]?.name || '').toLowerCase();
    const matchesSearch = title.includes(searchQuery.toLowerCase()) || artist.includes(searchQuery.toLowerCase());

    const releaseGenres = [...(info.genres || []), ...(info.styles || [])];
    const matchesGenre = selectedGenre === 'All' || releaseGenres.includes(selectedGenre);

    const isSynced = syncedIds.has(release.id);
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'synced' && isSynced) ||
      (filterStatus === 'pending' && !isSynced);

    return matchesSearch && matchesGenre && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span>DISCOGS COLLECTION VIEWER</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 font-mono">
                {username ? `@${username}` : 'Sample Curated Collection'}
              </span>
            </div>
            <h2 className="text-xl font-serif font-bold text-white mt-1">
              Vinyl Releases & Catalog Items
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Sorted by date added in descending order. Top 20 items feed into the Recently Added playlist.
            </p>
          </div>

          <button
            onClick={onRefreshCollection}
            disabled={loading}
            className="self-start md:self-auto px-3.5 py-1.5 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors border border-neutral-700 disabled:opacity-50"
          >
            {loading ? 'Fetching...' : 'Reload Discogs Catalog'}
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search box */}
          <div className="sm:col-span-5 relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by artist, title, or label..."
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          {/* Genre selector */}
          <div className="sm:col-span-4 relative">
            <Filter className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-500" />
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 pl-9 pr-3 py-1.5 text-xs text-white focus:border-emerald-400 focus:outline-none"
            >
              <option value="All">All Genres & Styles ({allGenres.length})</option>
              {allGenres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Sync Status Filter */}
          <div className="sm:col-span-3 flex items-center gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded-md">
            <button
              onClick={() => setFilterStatus('all')}
              className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors ${
                filterStatus === 'all'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('synced')}
              className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors ${
                filterStatus === 'synced'
                  ? 'bg-emerald-950 text-emerald-300'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Synced
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors ${
                filterStatus === 'pending'
                  ? 'bg-amber-950 text-amber-300'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Pending
            </button>
          </div>
        </div>
      </div>

      {/* Collection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReleases.map((release, idx) => {
          const info = release.basic_information;
          const isSynced = syncedIds.has(release.id);
          const cachedRecord = cache?.tracks?.[String(release.id)];
          const artist = info.artists?.[0]?.name || 'Unknown Artist';
          const formatDesc = info.formats?.[0]?.descriptions?.join(', ') || info.formats?.[0]?.name || 'Vinyl LP';
          const genres = [...(info.genres || []), ...(info.styles || [])];

          return (
            <div
              key={release.id}
              className="group rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 hover:border-neutral-700 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header: Position / Index & Sync Status */}
                <div className="flex items-center justify-between text-xs pb-3 border-b border-neutral-800/80">
                  <div className="flex items-center gap-1.5 text-neutral-400 font-mono text-[11px]">
                    <span className="text-neutral-500">#{idx + 1}</span>
                    <span aria-hidden="true">·</span>
                    <span>Discogs ID: {release.id}</span>
                  </div>

                  {isSynced ? (
                    <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Synced in Cache</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] font-medium text-amber-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Pending Next Run</span>
                    </div>
                  )}
                </div>

                {/* Vinyl Album Info */}
                <div className="mt-4 flex gap-4">
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center relative overflow-hidden group-hover:border-neutral-700 transition-colors">
                    <Disc className="w-8 h-8 text-neutral-600 group-hover:text-emerald-400 transition-colors" />
                    <div className="absolute inset-0 bg-radial from-transparent to-black/60 pointer-events-none" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white truncate" title={info.title}>
                      {info.title}
                    </h3>
                    <p className="text-xs text-neutral-300 truncate mt-0.5" title={artist}>
                      {artist}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-400">
                      <span>{info.year || 'Unknown Year'}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{info.labels?.[0]?.name || 'Direct Release'}</span>
                    </div>
                  </div>
                </div>

                {/* Formats & Genres Metadata (Unboxed text with typographic separators) */}
                <div className="mt-4 pt-3 border-t border-neutral-800/60 text-xs text-neutral-400 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-neutral-500">Format:</span>
                    <span className="text-neutral-300 font-medium">{formatDesc}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 text-[11px]">
                    <span className="text-neutral-500">Tags:</span>
                    {genres.slice(0, 4).map((g, i) => (
                      <React.Fragment key={g}>
                        <span className="text-neutral-300">{g}</span>
                        {i < Math.min(genres.length, 4) - 1 && (
                          <span aria-hidden="true" className="text-neutral-600">·</span>
                        )}
                      </React.Fragment>
                    ))}
                    {genres.length > 4 && (
                      <span className="text-neutral-500">+{genres.length - 4} more</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Streaming Target Details */}
              <div className="mt-4 pt-3 border-t border-neutral-800 text-[11px]">
                {isSynced && cachedRecord ? (
                  <div className="flex items-center justify-between text-neutral-400">
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Music className="w-3 h-3" />
                      <span>{cachedRecord.spotify_uris?.length || 0} Spotify URIs</span>
                    </div>
                    <span className="font-mono text-neutral-500 text-[10px]">
                      {new Date(cachedRecord.synced_at).toLocaleDateString()}
                    </span>
                  </div>
                ) : (
                  <div className="text-neutral-500 flex items-center justify-between">
                    <span>Target: Master + Genre (Pos 0)</span>
                    <span className="text-amber-500/80">Awaiting Cron</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredReleases.length === 0 && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-12 text-center">
          <Disc className="mx-auto h-8 w-8 text-neutral-600 mb-3" />
          <h3 className="text-sm font-semibold text-white">No releases matched your filter</h3>
          <p className="mt-1 text-xs text-neutral-400">
            Try adjusting your search query, genre selection, or sync status filter.
          </p>
        </div>
      )}
    </div>
  );
};
