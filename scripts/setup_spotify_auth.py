"""
Interactive helper to generate SPOTIFY_REFRESH_TOKEN for automated syncing.
Run once locally: python scripts/setup_spotify_auth.py
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

try:
    from spotipy.oauth2 import SpotifyOAuth
except ImportError:
    print("Error: spotipy is not installed. Run 'pip install -r requirements.txt'")
    sys.exit(1)

client_id = os.getenv("SPOTIPY_CLIENT_ID") or input("Enter SPOTIPY_CLIENT_ID: ").strip()
client_secret = os.getenv("SPOTIPY_CLIENT_SECRET") or input("Enter SPOTIPY_CLIENT_SECRET: ").strip()
redirect_uri = os.getenv("SPOTIPY_REDIRECT_URI", "http://localhost:8888/callback")

if not client_id or not client_secret:
    print("Error: Both Client ID and Client Secret are required.")
    sys.exit(1)

sp_oauth = SpotifyOAuth(
    client_id=client_id,
    client_secret=client_secret,
    redirect_uri=redirect_uri,
    scope="playlist-modify-public playlist-modify-private playlist-read-private"
)

auth_url = sp_oauth.get_authorize_url()
print("\n" + "=" * 60)
print("1. Open this URL in your web browser to grant permissions:")
print(f"   {auth_url}")
print("=" * 60)
print("\n2. After approving, Spotify will redirect to localhost:8888.")
response_url = input("Paste the entire redirect URL here (even if page shows not found): ").strip()

try:
    code = sp_oauth.parse_response_code(response_url)
    token_info = sp_oauth.get_access_token(code)
    refresh_token = token_info.get("refresh_token")
    print("\n" + "=" * 60)
    print("SUCCESS! Your SPOTIFY_REFRESH_TOKEN is:\n")
    print(refresh_token)
    print("=" * 60)
    print("\nAdd this token to your .env file or GitHub Secrets as SPOTIFY_REFRESH_TOKEN.")
except Exception as e:
    print(f"\nFailed to extract token: {e}")
    sys.exit(1)
