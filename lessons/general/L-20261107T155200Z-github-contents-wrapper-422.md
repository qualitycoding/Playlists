---
id: L-20261107T155200Z-github-contents-wrapper-422
title: GitHub create-file wrapper returned missing-SHA 422
status: active
supersedes: []
recurrence_of: null
occurrences: 1
severity: Medium
tags: [tech:github, tech:git, phase:planning, kind:tooling]
recorded_by: planner
run: gen-20261107T154700Z-playlists-app-reliability
recorded_at: 2026-11-07T15:52:00Z
---
## Trigger
Connected GitHub create-file action returns HTTP 422 saying SHA was not supplied for a new path.
## What went wrong
The wrapper failed on first plan artifact write.
## Correction
Use Git Data API blobs, tree from current tree, commit parented to branch head, then update ref with expected-SHA lease.
## Prevention rule
When create-file returns missing-SHA 422 on a new path, use Git Data API and verify branch head.
## Detection check
Fetch branch ref and every created file.
## Evidence
Planning run gen-20261107T154700Z-playlists-app-reliability; no application source changed.
