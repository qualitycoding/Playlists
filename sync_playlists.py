#!/usr/bin/env python3
"""
Discogs to Spotify & YouTube Music Sync Engine
Synchronizes your vinyl / Discogs collection with streaming playlists on a scheduled cadence.
"""
import os
import sys
import json
import time
import argparse
try:
    import requests
except ImportError:
    requests = None
import config

# Initialize File Paths
CACHE_FILE = "cache/collection_cache.json"
UNMATCHED_FILE = "logs/unmatched.json"

def load_json(filepath, default):
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Warning: Failed to parse {filepath}: {e}")
    return default

def save_json(filepath, data):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def init_spotify():
    """Initialize Spotify client with refresh token or None."""
    if not (config.SPOTIPY_CLIENT_ID and config.SPOTIPY_CLIENT_SECRET and config.SPOTIFY_REFRESH_TOKEN):
        print("Notice: Spotify credentials not fully configured. Skipping Spotify sync.")
        return None
    try:
        from spotipy import Spotify
        from spotipy.oauth2 import SpotifyOAuth
        sp = Spotify(auth_manager=SpotifyOAuth(
            client_id=config.SPOTIPY_CLIENT_ID,
            client_secret=config.SPOTIPY_CLIENT_SECRET,
            redirect_uri=os.getenv("SPOTIPY_REDIRECT_URI", "http://localhost:8888/callback"),
            scope="playlist-modify-public playlist-modify-private playlist-read-private",
            refresh_token=config.SPOTIFY_REFRESH_TOKEN
        ))
        # Test call
        user_info = sp.current_user()
        print(f"Connected to Spotify account: {user_info.get('id', 'unknown')}")
        return sp
    except Exception as e:
        print(f"Warning: Failed to initialize Spotify: {e}")
        return None

def init_ytmusic():
    """Initialize YouTube Music client from auth JSON or None."""
    auth_file = config.YTMUSIC_AUTH_JSON
    if not os.path.exists(auth_file):
        print(f"Notice: YouTube Music auth file '{auth_file}' not found. Skipping YT Music sync.")
        return None
    try:
        from ytmusicapi import YTMusic
        yt = YTMusic(auth_file)
        print("Connected to YouTube Music successfully.")
        return yt
    except Exception as e:
        print(f"Warning: Failed to initialize YouTube Music: {e}")
        return None

def get_discogs_collection(token, username):
    """Fetch user collection from Discogs sorted by date_added descending."""
    if not token or not username:
        print("Error: DISCOGS_TOKEN and DISCOGS_USERNAME are required.")
        return []

    releases = []
    page = 1
    headers = {
        "User-Agent": "DiscogsPlaylistSync/1.0",
        "Authorization": f"Discogs token={token}"
    }

    print(f"Fetching collection for Discogs user '{username}'...")
    while True:
        url = f"https://api.discogs.com/users/{username}/collection/folders/0/releases"
        params = {"sort": "date_added", "sort_order": "desc", "per_page": 100, "page": page}
        try:
            resp = requests.get(url, headers=headers, params=params, timeout=15)
            if resp.status_code == 429:
                retry_after = int(resp.headers.get("Retry-After", 10))
                print(f"Rate limited by Discogs. Waiting {retry_after}s...")
                time.sleep(retry_after)
                continue
            if resp.status_code != 200:
                print(f"Error fetching Discogs collection: {resp.status_code} - {resp.text}")
                break

            data = resp.json()
            page_releases = data.get("releases", [])
            releases.extend(page_releases)

            total_pages = data.get("pagination", {}).get("pages", 1)
            print(f"Retrieved page {page}/{total_pages} ({len(releases)} releases so far)")
            if page >= total_pages:
                break
            page += 1
            time.sleep(1) # Respect Discogs 60/min rate limits
        except Exception as e:
            print(f"Request error while fetching Discogs: {e}")
            break

    return releases

def resolve_spotify_tracks(sp, artist, album):
    """Search Spotify for album and return track URIs."""
    if not sp:
        return []
    try:
        # Search exact
        query = f'album:"{album}" artist:"{artist}"'
        results = sp.search(q=query, type="album", limit=1)
        items = results.get("albums", {}).get("items", [])

        # Fallback search without strict field qualifiers
        if not items:
            results = sp.search(q=f"{artist} {album}", type="album", limit=1)
            items = results.get("albums", {}).get("items", [])

        if items:
            album_id = items[0]["id"]
            tracks = sp.album_tracks(album_id).get("items", [])
            return [t["uri"] for t in tracks]
    except Exception as e:
        print(f"Spotify search error for '{artist} - {album}': {e}")
    return []

def resolve_ytmusic_tracks(ytmusic, artist, album):
    """Search YouTube Music for album and return video IDs."""
    if not ytmusic:
        return []
    try:
        results = ytmusic.search(f"{artist} {album}", filter="albums")
        if results:
            browse_id = results[0]["browseId"]
            album_details = ytmusic.get_album(browse_id)
            return [t["videoId"] for t in album_details.get("tracks", []) if "videoId" in t]
    except Exception as e:
        print(f"YTMusic search error for '{artist} - {album}': {e}")
    return []

def sync(dry_run=False):
    print("=" * 60)
    print("Starting Discogs Playlist Sync Pipeline")
    if dry_run:
        print("MODE: DRY RUN (no modifications will be made to playlists)")
    print("=" * 60)

    cache = load_json(CACHE_FILE, {"synced_release_ids": [], "tracks": {}})
    unmatched = load_json(UNMATCHED_FILE, [])

    sp = init_spotify()
    ytmusic = init_ytmusic()

    releases = get_discogs_collection(config.DISCOGS_TOKEN, config.DISCOGS_USERNAME)
    if not releases:
        print("No releases found or failed to fetch Discogs collection.")
        return

    print(f"Total collection releases: {len(releases)}")
    synced_set = set(cache.get("synced_release_ids", []))
    new_releases = [r for r in releases if r["id"] not in synced_set]

    if not new_releases:
        print("All releases are already synced in cache. Everything is up to date!")
        return

    print(f"Found {len(new_releases)} new release(s) to process.")

    # Process releases in chronological order of addition so newest ends up at index 0
    synced_count = 0
    unmatched_count = 0

    for release in reversed(new_releases):
        rel_id = release["id"]
        info = release.get("basic_information", {})
        artist = info.get("artists", [{}])[0].get("name", "Unknown Artist")
        album = info.get("title", "Unknown Album")
        genres = info.get("genres", []) + info.get("styles", [])

        print(f"\nProcessing: {artist} — {album} (ID: {rel_id})")
        print(f"  Genres/Styles: {', '.join(genres) if genres else 'None'}")

        sp_uris = resolve_spotify_tracks(sp, artist, album)
        yt_ids = resolve_ytmusic_tracks(ytmusic, artist, album)

        if sp:
            print(f"  Spotify tracks resolved: {len(sp_uris)}")
        if ytmusic:
            print(f"  YT Music tracks resolved: {len(yt_ids)}")

        if not sp_uris and not yt_ids:
            # Check if already recorded in unmatched
            if not any(u.get("id") == rel_id for u in unmatched):
                unmatched.append({
                    "id": rel_id,
                    "artist": artist,
                    "album": album,
                    "genres": genres,
                    "date_added": release.get("date_added")
                })
            print("  └─ [Unmatched] Failed to resolve streaming tracks.")
            unmatched_count += 1
            continue

        if not dry_run:
            # Add to Spotify Master Playlist at position 0
            if sp and sp_uris:
                master_id = config.SPOTIFY_MASTER_PLAYLIST_ID
                if master_id:
                    try:
                        # Spotify API accepts chunks of up to 100 URIs
                        for i in range(0, len(sp_uris), 100):
                            chunk = sp_uris[i:i+100]
                            sp.playlist_add_items(master_id, chunk, position=0)
                        print(f"  └─ Added {len(sp_uris)} tracks to Spotify Master Playlist (pos 0)")
                    except Exception as e:
                        print(f"  └─ Error adding to Spotify Master Playlist: {e}")

                # Map to Genre Playlists
                for broad_genre, keywords in config.GENRE_MAP.items():
                    if any(k.lower() in [g.lower() for g in genres] for k in keywords):
                        env_key = f"SPOTIFY_{broad_genre.upper().replace(' ', '_').replace('/', '_')}_PLAYLIST_ID"
                        genre_playlist_id = os.getenv(env_key)
                        if genre_playlist_id:
                            try:
                                sp.playlist_add_items(genre_playlist_id, sp_uris, position=0)
                                print(f"  └─ Added to Spotify {broad_genre} playlist (pos 0)")
                            except Exception as e:
                                print(f"  └─ Error adding to Spotify {broad_genre} playlist: {e}")

            # Add to YouTube Music Master Playlist
            if ytmusic and yt_ids:
                yt_master_id = config.YTMUSIC_MASTER_PLAYLIST_ID
                if yt_master_id:
                    try:
                        ytmusic.add_playlist_items(yt_master_id, yt_ids)
                        print(f"  └─ Added {len(yt_ids)} tracks to YouTube Music Master Playlist")
                    except Exception as e:
                        print(f"  └─ Error adding to YT Music Master Playlist: {e}")

            # Update cache
            if rel_id not in cache["synced_release_ids"]:
                cache["synced_release_ids"].append(rel_id)
            cache["tracks"][str(rel_id)] = {
                "artist": artist,
                "album": album,
                "genres": genres,
                "spotify_uris": sp_uris,
                "yt_ids": yt_ids,
                "synced_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }

            save_json(CACHE_FILE, cache)
            save_json(UNMATCHED_FILE, unmatched)

        synced_count += 1
        time.sleep(0.5)

    # Sync Recently Added Playlist (Top 20 additions)
    recent_20 = releases[:20]
    print(f"\nEvaluating Top {len(recent_20)} recently added releases for 'Recently Added' playlists...")
    # Recently added logic: gathers tracks for the top 20 releases
    recent_sp_tracks = []
    for r in recent_20:
        r_id = str(r.get("id"))
        if r_id in cache.get("tracks", {}):
            recent_sp_tracks.extend(cache["tracks"][r_id].get("spotify_uris", []))

    if sp and config.SPOTIFY_RECENTLY_ADDED_PLAYLIST_ID and recent_sp_tracks and not dry_run:
        try:
            # Replace items in recently added playlist
            sp.playlist_replace_items(config.SPOTIFY_RECENTLY_ADDED_PLAYLIST_ID, recent_sp_tracks[:100])
            print(f"Updated Spotify Recently Added playlist with {len(recent_sp_tracks[:100])} tracks.")
        except Exception as e:
            print(f"Failed to update Spotify Recently Added playlist: {e}")

    print("\n" + "=" * 60)
    print("Sync complete summary:")
    print(f"  Newly Synced: {synced_count}")
    print(f"  Unmatched:    {unmatched_count}")
    print(f"  Total Cache:  {len(cache.get('synced_release_ids', []))} releases")
    print("=" * 60)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync Discogs collection with streaming playlists.")
    parser.add_argument("--dry-run", action="store_true", help="Simulate sync without modifying playlists")
    args = parser.parse_args()
    sync(dry_run=args.dry_run or (os.getenv("DRY_RUN", "").lower() in ["1", "true"]))
