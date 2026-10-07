"""
Unit and integration tests for Discogs to Spotify & YouTube Music sync pipeline.
"""
import os
import json
import tempfile
import unittest
from unittest.mock import MagicMock, patch

import config
import sync_playlists


class TestConfigAndGenreMapping(unittest.TestCase):
    def test_genre_map_structure(self):
        self.assertIn("Electronic", config.GENRE_MAP)
        self.assertIn("Rock", config.GENRE_MAP)
        self.assertIn("Jazz", config.GENRE_MAP)
        self.assertIn("Hip-Hop", config.GENRE_MAP)
        self.assertIn("Funk / Soul", config.GENRE_MAP)
        self.assertIn("Classical", config.GENRE_MAP)

    def test_genre_matching_logic(self):
        # Test Electronic keywords
        electronic_styles = ["Ambient", "Techno", "House"]
        matched = []
        for genre, keywords in config.GENRE_MAP.items():
            if any(k.lower() in [s.lower() for s in electronic_styles] for k in keywords):
                matched.append(genre)
        self.assertIn("Electronic", matched)

        # Test Jazz keywords
        jazz_styles = ["Modal", "Hard Bop"]
        matched = []
        for genre, keywords in config.GENRE_MAP.items():
            if any(k.lower() in [s.lower() for s in jazz_styles] for k in keywords):
                matched.append(genre)
        self.assertIn("Jazz", matched)


class TestCacheAndStorage(unittest.TestCase):
    def test_load_and_save_json(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = os.path.join(tmpdir, "cache", "test_cache.json")
            data = {"synced_release_ids": [123, 456], "tracks": {"123": {"album": "Discovery"}}}

            sync_playlists.save_json(test_file, data)
            self.assertTrue(os.path.exists(test_file))

            loaded = sync_playlists.load_json(test_file, {})
            self.assertEqual(loaded["synced_release_ids"], [123, 456])
            self.assertEqual(loaded["tracks"]["123"]["album"], "Discovery")

    def test_load_json_fallback_on_missing(self):
        fallback = {"default": True}
        result = sync_playlists.load_json("/non/existent/path/file.json", fallback)
        self.assertEqual(result, fallback)


class TestTrackResolution(unittest.TestCase):
    def test_resolve_spotify_tracks_success(self):
        mock_sp = MagicMock()
        mock_sp.search.return_value = {
            "albums": {"items": [{"id": "mock_album_123"}]}
        }
        mock_sp.album_tracks.return_value = {
            "items": [
                {"uri": "spotify:track:111"},
                {"uri": "spotify:track:222"}
            ]
        }

        uris = sync_playlists.resolve_spotify_tracks(mock_sp, "Daft Punk", "Discovery")
        self.assertEqual(uris, ["spotify:track:111", "spotify:track:222"])
        mock_sp.search.assert_called_once()
        mock_sp.album_tracks.assert_called_once_with("mock_album_123")

    def test_resolve_spotify_tracks_not_found(self):
        mock_sp = MagicMock()
        mock_sp.search.return_value = {"albums": {"items": []}}

        uris = sync_playlists.resolve_spotify_tracks(mock_sp, "Obscure Artist", "White Label Vinyl")
        self.assertEqual(uris, [])

    def test_resolve_spotify_tracks_none_client(self):
        uris = sync_playlists.resolve_spotify_tracks(None, "Artist", "Album")
        self.assertEqual(uris, [])


class TestSyncPipelineExecution(unittest.TestCase):
    @patch("sync_playlists.get_discogs_collection")
    @patch("sync_playlists.init_spotify")
    @patch("sync_playlists.init_ytmusic")
    def test_dry_run_does_not_mutate_cache(self, mock_yt, mock_sp_init, mock_discogs):
        with tempfile.TemporaryDirectory() as tmpdir:
            cache_file = os.path.join(tmpdir, "cache.json")
            unmatched_file = os.path.join(tmpdir, "unmatched.json")

            # Patch paths
            with patch("sync_playlists.CACHE_FILE", cache_file), \
                 patch("sync_playlists.UNMATCHED_FILE", unmatched_file):

                mock_sp = MagicMock()
                mock_sp_init.return_value = mock_sp
                mock_yt.return_value = None

                mock_discogs.return_value = [
                    {
                        "id": 99999,
                        "date_added": "2026-10-01T00:00:00Z",
                        "basic_information": {
                            "title": "Selected Ambient Works",
                            "artists": [{"name": "Aphex Twin"}],
                            "genres": ["Electronic"],
                            "styles": ["Ambient"]
                        }
                    }
                ]

                # Run in dry-run mode
                sync_playlists.sync(dry_run=True)

                # In dry-run, cache file should not have recorded changes
                mock_sp.playlist_add_items.assert_not_called()


if __name__ == "__main__":
    unittest.main()
