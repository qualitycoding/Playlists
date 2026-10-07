import React, { useState } from 'react';
import { ListMusic, Plus, Trash2, ArrowUpCircle, Check, Music2 } from 'lucide-react';
import { SystemStatus } from '../types';

interface PlaylistMappingProps {
  status: SystemStatus | null;
  onSaveGenreMap: (genreMap: Record<string, string[]>) => Promise<void>;
  onSavePlaylists: (playlists: {
    spotifyMasterPlaylistId: string;
    spotifyRecentlyAddedPlaylistId: string;
    spotifyGenrePlaylists: Record<string, string>;
    ytmusicMasterPlaylistId: string;
  }) => Promise<void>;
}

export const PlaylistMapping: React.FC<PlaylistMappingProps> = ({
  status,
  onSaveGenreMap,
  onSavePlaylists,
}) => {
  const [genreMap, setGenreMap] = useState<Record<string, string[]>>(
    status?.config?.genreMap || {
      Electronic: ['Electronic', 'Synthesizer', 'House', 'Techno', 'Ambient', 'Electro', 'Downtempo', 'Trance', 'IDM'],
      Rock: ['Rock', 'Indie Rock', 'Alternative Rock', 'Punk', 'Metal', 'Psychedelic Rock', 'Hard Rock', 'Post-Punk'],
      Jazz: ['Jazz', 'Hard Bop', 'Fusion', 'Post Bop', 'Free Jazz', 'Modal', 'Bop', 'Cool Jazz'],
      'Hip-Hop': ['Hip Hop', 'Boom Bap', 'Trap', 'Conscious', 'Trip Hop', 'Instrumental Hip-Hop'],
      'Funk / Soul': ['Funk', 'Soul', 'Disco', 'Rhythm & Blues', 'Neo Soul', 'Afrobeat'],
      Classical: ['Classical', 'Baroque', 'Contemporary', 'Romantic', 'Modern Classical', 'Minimalism'],
    }
  );

  const [newKeywordInputs, setNewKeywordInputs] = useState<Record<string, string>>({});
  const [masterId, setMasterId] = useState(status?.config?.spotifyMasterPlaylistId || '37i9dQZF1DXcBWIGoYBM5M');
  const [recentId, setRecentId] = useState(status?.config?.spotifyRecentlyAddedPlaylistId || '37i9dQZF1DX0XUsuxWHRQd');
  const [ytMasterId, setYtMasterId] = useState(status?.config?.ytmusicMasterPlaylistId || 'PLrAlJpS2-7eI1i7s0');
  const [genrePlaylists, setGenrePlaylists] = useState<Record<string, string>>(
    status?.config?.spotifyGenrePlaylists || {
      Electronic: '37i9dQZF1DXdLEN7aqioXM',
      Rock: '37i9dQZF1DWXRqgorJj26U',
      Jazz: '37i9dQZF1DXbITWG1ZJKYt',
      'Hip-Hop': '37i9dQZF1DX0XUsuxWHRQd',
      'Funk / Soul': '37i9dQZF1DWWvh2zOz19qC',
      Classical: '37i9dQZF1DWWEWGlCnxtYF',
    }
  );

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAddKeyword = (genre: string) => {
    const val = (newKeywordInputs[genre] || '').trim();
    if (!val) return;
    if (genreMap[genre]?.includes(val)) return;

    const updated = {
      ...genreMap,
      [genre]: [...(genreMap[genre] || []), val],
    };
    setGenreMap(updated);
    setNewKeywordInputs((prev) => ({ ...prev, [genre]: '' }));
    onSaveGenreMap(updated);
  };

  const handleRemoveKeyword = (genre: string, keyword: string) => {
    const updated = {
      ...genreMap,
      [genre]: (genreMap[genre] || []).filter((k) => k !== keyword),
    };
    setGenreMap(updated);
    onSaveGenreMap(updated);
  };

  const handleSaveAll = async () => {
    await onSavePlaylists({
      spotifyMasterPlaylistId: masterId,
      spotifyRecentlyAddedPlaylistId: recentId,
      spotifyGenrePlaylists: genrePlaylists,
      ytmusicMasterPlaylistId: ytMasterId,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-8">
      {/* Overview & Rule Banner */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span>PLAYLIST ENGINE CONTRACT</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 font-mono">POSITION 0 PREPEND</span>
            </div>
            <h2 className="text-xl font-serif font-bold text-white mt-1">
              Playlist Targets & Genre Mapping Rules
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              New tracks are inserted at index 0 so recently acquired vinyl is always played first on streaming.
            </p>
          </div>

          <button
            onClick={handleSaveAll}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-black bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Playlist IDs</span>
          </button>
        </div>

        {/* 3 Core Destination Tiers */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tier 1: Master Playlist */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-400">TIER 1</span>
              <span className="text-[11px] text-neutral-400">Spotify + YT Music</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Master Collection Playlist</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Full chronological archive of every track resolved from your vinyl library.
              </p>
            </div>
            <div className="pt-2 border-t border-neutral-900 space-y-2">
              <div>
                <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                  SPOTIFY_MASTER_PLAYLIST_ID
                </label>
                <input
                  type="text"
                  value={masterId}
                  onChange={(e) => setMasterId(e.target.value)}
                  className="w-full rounded border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs font-mono text-neutral-200 focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                  YTMUSIC_MASTER_PLAYLIST_ID
                </label>
                <input
                  type="text"
                  value={ytMasterId}
                  onChange={(e) => setYtMasterId(e.target.value)}
                  className="w-full rounded border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs font-mono text-neutral-200 focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Tier 2: Recently Added */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-400">TIER 2</span>
              <span className="text-[11px] text-neutral-400">Top 20 Releases</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Recently Added Playlist</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Automatically refreshed with tracks from the 20 most recent Discogs additions.
              </p>
            </div>
            <div className="pt-2 border-t border-neutral-900 space-y-2">
              <div>
                <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                  SPOTIFY_RECENTLY_ADDED_PLAYLIST_ID
                </label>
                <input
                  type="text"
                  value={recentId}
                  onChange={(e) => setRecentId(e.target.value)}
                  className="w-full rounded border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs font-mono text-neutral-200 focus:border-emerald-400 focus:outline-none"
                />
              </div>
              <div className="text-[11px] text-neutral-500 pt-1">
                Refreshed each run with `playlist_replace_items`
              </div>
            </div>
          </div>

          {/* Tier 3: Genre Mapping Engine */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-400">TIER 3</span>
              <span className="text-[11px] text-neutral-400">Categorical</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Genre Target Playlists</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Mapped dynamically from Discogs genres and style tags (e.g. Ambient & Techno → Electronic).
              </p>
            </div>
            <div className="pt-2 border-t border-neutral-900 flex items-center gap-2 text-xs text-neutral-400">
              <ArrowUpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Multi-genre vinyl items are cross-posted to all matching genre playlists at Pos 0.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Genre Mapping & Keyword Rules */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 space-y-6">
        <div>
          <h3 className="text-base font-semibold text-white">Genre & Style Keyword Dictionary</h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            If any keyword matches a release&apos;s Discogs genres or styles, it is automatically routed to that playlist.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(genreMap).map(([broadGenre, keywords]) => {
            const envKey = `SPOTIFY_${broadGenre.toUpperCase().replace(/\s+/g, '_').replace(/\//g, '_')}_PLAYLIST_ID`;
            const currentPlaylistId = genrePlaylists[broadGenre] || '';

            return (
              <div
                key={broadGenre}
                className="rounded-lg border border-neutral-800 bg-neutral-950 p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music2 className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-semibold text-white">{broadGenre}</h4>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-500 tabular-nums">
                    {keywords.length} keywords
                  </span>
                </div>

                {/* Target Playlist ID configuration */}
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                    {envKey}
                  </label>
                  <input
                    type="text"
                    value={currentPlaylistId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGenrePlaylists((prev) => ({ ...prev, [broadGenre]: val }));
                    }}
                    placeholder={`e.g. Spotify playlist URI / ID for ${broadGenre}`}
                    className="w-full rounded border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs font-mono text-neutral-200 focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                {/* Keyword items rendered as clean unboxed text with removal buttons */}
                <div>
                  <span className="block text-[11px] font-medium text-neutral-400 mb-2">
                    Matching Discogs Keywords:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {keywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1 rounded bg-neutral-900 border border-neutral-800 px-2 py-0.5 text-xs text-neutral-300"
                      >
                        <span>{kw}</span>
                        <button
                          onClick={() => handleRemoveKeyword(broadGenre, kw)}
                          className="text-neutral-500 hover:text-neutral-300 transition-colors"
                          title="Remove keyword"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Add new keyword input */}
                <div className="flex items-center gap-2 pt-2 border-t border-neutral-900">
                  <input
                    type="text"
                    value={newKeywordInputs[broadGenre] || ''}
                    onChange={(e) =>
                      setNewKeywordInputs((prev) => ({
                        ...prev,
                        [broadGenre]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddKeyword(broadGenre);
                      }
                    }}
                    placeholder={`Add tag (e.g. ${broadGenre === 'Electronic' ? 'Synthwave' : 'Indie'})...`}
                    className="flex-1 rounded border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-white placeholder-neutral-500 focus:border-emerald-400 focus:outline-none"
                  />
                  <button
                    onClick={() => handleAddKeyword(broadGenre)}
                    className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                    title="Add keyword"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {savedSuccess && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md bg-emerald-950 border border-emerald-700 px-4 py-2.5 text-xs text-emerald-200 shadow-xl">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Playlist IDs and Genre Maps successfully saved.</span>
        </div>
      )}
    </div>
  );
};
