---
id: K-20261107T155300Z-github-contents-wrapper-422
statement: Connected GitHub create-file wrapper returned 422 missing SHA for a new path; Git Data API blobs/tree/commit/update-ref succeeded as fallback in this run.
status: current
supersedes: []
tags: [tech:github, tech:git, subject:discogs-playlist-sync, phase:planning]
applies_to_version: connected GitHub integration observed 2026-11-07
source: { url: "https://docs.github.com/en/rest/git", doi: "", title: "Git Database API", locator: "Create blobs/trees/commits/refs", accessed: "2026-11-07", tier: 1 }
confidence: verified
derived_from: []
discovered_by: planner
run: gen-20261107T154700Z-playlists-app-reliability
recorded_at: 2026-11-07T15:53:00Z
---
Tool-specific observation. Create blobs/tree/commit then update branch ref with expected-SHA lease; verify ref and content.
