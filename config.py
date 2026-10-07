import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Discogs Credentials
DISCOGS_TOKEN = os.getenv("DISCOGS_TOKEN", "")
DISCOGS_USERNAME = os.getenv("DISCOGS_USERNAME", "")

# Spotify Credentials
SPOTIPY_CLIENT_ID = os.getenv("SPOTIPY_CLIENT_ID", "")
SPOTIPY_CLIENT_SECRET = os.getenv("SPOTIPY_CLIENT_SECRET", "")
SPOTIFY_REFRESH_TOKEN = os.getenv("SPOTIFY_REFRESH_TOKEN", "")

# YouTube Music Credentials
YTMUSIC_AUTH_JSON = os.getenv("YTMUSIC_AUTH_JSON", "headers_auth.json")

# Target Playlist IDs
SPOTIFY_MASTER_PLAYLIST_ID = os.getenv("SPOTIFY_MASTER_PLAYLIST_ID", "")
SPOTIFY_RECENTLY_ADDED_PLAYLIST_ID = os.getenv("SPOTIFY_RECENTLY_ADDED_PLAYLIST_ID", "")
YTMUSIC_MASTER_PLAYLIST_ID = os.getenv("YTMUSIC_MASTER_PLAYLIST_ID", "")
YTMUSIC_RECENTLY_ADDED_PLAYLIST_ID = os.getenv("YTMUSIC_RECENTLY_ADDED_PLAYLIST_ID", "")

# Mapping Discogs genre/style tags to broad playlist targets
GENRE_MAP = {
    "Electronic": ["Electronic", "Synthesizer", "House", "Techno", "Ambient", "Electro", "Downtempo", "Trance", "IDM"],
    "Rock": ["Rock", "Indie Rock", "Alternative Rock", "Punk", "Metal", "Psychedelic Rock", "Hard Rock", "Post-Punk"],
    "Jazz": ["Jazz", "Hard Bop", "Fusion", "Post Bop", "Free Jazz", "Modal", "Bop", "Cool Jazz"],
    "Hip-Hop": ["Hip Hop", "Boom Bap", "Trap", "Conscious", "Trip Hop", "Instrumental Hip-Hop"],
    "Funk / Soul": ["Funk", "Soul", "Disco", "Rhythm & Blues", "Neo Soul", "Afrobeat"],
    "Classical": ["Classical", "Baroque", "Contemporary", "Romantic", "Modern Classical", "Minimalism"]
}
