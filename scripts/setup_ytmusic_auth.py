"""
Interactive helper to configure YouTube Music authentication for automated syncing.
Run once locally: python scripts/setup_ytmusic_auth.py
"""
import sys

try:
    from ytmusicapi import YTMusic
except ImportError:
    print("Error: ytmusicapi is not installed. Run 'pip install -r requirements.txt'")
    sys.exit(1)

print("=" * 60)
print("YouTube Music Header Setup")
print("=" * 60)
print("1. Open music.youtube.com in an authenticated browser tab.")
print("2. Open Developer Tools (F12) -> Network tab.")
print("3. Filter by 'browse' or make any action in YT Music.")
print("4. Copy the request headers from the request.")
print("5. Follow the interactive prompt below:\n")

try:
    auth_file = "headers_auth.json"
    YTMusic.setup(filepath=auth_file)
    print(f"\nSUCCESS: Saved '{auth_file}' successfully.")
    print("To use with GitHub Actions, encode this file as a secret named YTMUSIC_AUTH_JSON.")
except Exception as e:
    print(f"\nSetup failed: {e}")
    sys.exit(1)
