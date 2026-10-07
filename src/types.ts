export interface DiscogsRelease {
  id: number;
  date_added: string;
  basic_information: {
    title: string;
    artists: Array<{ name: string }>;
    year: number;
    labels?: Array<{ name: string }>;
    formats?: Array<{ name: string; descriptions?: string[] }>;
    genres?: string[];
    styles?: string[];
    thumb?: string;
  };
}

export interface CachedTrackRecord {
  artist: string;
  album: string;
  genres: string[];
  spotify_uris: string[];
  yt_ids: string[];
  synced_at: string;
  resolved_manually?: boolean;
}

export interface CollectionCache {
  synced_release_ids: number[];
  tracks: Record<string, CachedTrackRecord>;
}

export interface UnmatchedItem {
  id: number;
  artist: string;
  album: string;
  genres?: string[];
  date_added?: string;
  note?: string;
}

export interface SystemStatus {
  discogsConfigured: boolean;
  spotifyConfigured: boolean;
  ytmusicConfigured: boolean;
  cachedCount: number;
  unmatchedCount: number;
  config: {
    discogsUsername: string;
    hasDiscogsToken: boolean;
    hasSpotifyCredentials: boolean;
    hasSpotifyRefreshToken: boolean;
    spotifyMasterPlaylistId: string;
    spotifyRecentlyAddedPlaylistId: string;
    spotifyGenrePlaylists: Record<string, string>;
    ytmusicAuthFile: string;
    ytmusicMasterPlaylistId: string;
    genreMap: Record<string, string[]>;
  };
}

export interface SyncRunResult {
  success: boolean;
  dryRun: boolean;
  syncedCount: number;
  processed: Array<{
    id: number;
    artist: string;
    album: string;
    genres: string[];
    spotifyUris: string[];
    targetPlaylists: string[];
    status: 'synced' | 'unmatched';
  }>;
  logs: string[];
  cacheCount: number;
}
