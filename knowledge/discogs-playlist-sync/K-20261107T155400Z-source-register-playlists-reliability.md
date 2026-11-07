---
id: K-20261107T155400Z-source-register-playlists-reliability
statement: Source register for playlist reliability run: 13 sources, 10 used, 1 not relevant, 2 incomplete/unreachable; licence review incomplete.
status: current
supersedes: []
tags: [subject:discogs-playlist-sync, tech:github-actions, phase:research, kind:source-register]
applies_to_version: version-independent
source: { url: "", doi: "", title: "Source register", locator: "table below", accessed: "2026-11-07", tier: "n/a" }
confidence: single-source
derived_from: [C-001,C-002,C-003,C-004,C-005,C-006,C-007,C-008,C-009,C-010,C-011,C-012,C-013,C-014]
discovered_by: planner
run: gen-20261107T154700Z-playlists-app-reliability
recorded_at: 2026-11-07T15:54:00Z
---
| Source | URL | Outcome | Licence/terms | Permitted use |
|---|---|---|---|---|
| Spotify Add Items | https://developer.spotify.com/documentation/web-api/reference/add-items-to-playlist | used | Spotify Developer Terms, not re-read | read only |
| Spotipy OAuth | https://github.com/spotipy-dev/spotipy/blob/master/spotipy/oauth2.py | used | repo licence not inspected | read only |
| GitHub secrets | https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions | used | GitHub Docs terms | read only |
| GitHub Pages | https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages | used | GitHub Docs terms | read only |
| ytmusicapi | https://github.com/sigma67/ytmusicapi | used | pinned licence not inspected | read only |
| YouTube Data API | https://developers.google.com/youtube/v3/docs/playlistItems/insert | used | Google API terms | read only |
| Discogs API | https://www.discogs.com/developers | used | terms not fully read | read only |
| Target repository | https://github.com/qualitycoding/Playlists | used | Apache-2.0 code licence | read only |
| Actions history | https://api.github.com/repos/qualitycoding/Playlists/actions/runs?per_page=20 | used | GitHub API terms | read only |
| Git Database API | https://docs.github.com/en/rest/git | used | GitHub Docs terms | read only |
| Runner docs | https://docs.github.com/en/actions/reference/runners/github-hosted-runners | not relevant | GitHub Docs terms | read only |
| Actions job detail | https://api.github.com/repos/qualitycoding/Playlists/actions/runs/42388089013/jobs | unreachable/incomplete | GitHub API terms | read only |
| Package registries | https://pypi.org/ ; https://registry.npmjs.org/ | not probed | terms not read | read only |

R7 completeness/licence review incomplete; confidence single-source. No reference files downloaded: redistributable 0, private 0.
