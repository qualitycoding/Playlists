# GATE G-001 — YouTube Music adapter
Date: 2026-11-07. Decision: REMOVE YouTube Music from release 1 (D-043). Spotify-only first release.
Options presented: remove; ytmusicapi on a dedicated Google account; official YouTube Data API; ytmusicapi on the main account (not advised).
Evidence (no collection data): ytmusicapi is unofficial and authenticates with browser request headers (a Google-account session) or OAuth, which has had reported 400 errors in the project's issue tracker; the official YouTube Data API bills 50 quota units per playlist insert against a 10,000 unit daily default, and its search method is separately capped (Google's quota table; secondary sources differ on the exact search figure).
Approval: given by the owner in the planning conversation on 2026-11-07, not by a PR approval; this is covered by the accepted admin-credential risk R-043 (D-028).
Consequences: R-006 and R-013 close for release 1; T-007 and T-022 and the YouTube part of T-063 are deferred; no YouTube secret, script or workflow step is built; reintroduction needs a new G-001.
