# Provider research for release 1 (2026-11-07)
Question: which streaming services could this app maintain playlists on, for an individual developer, unattended from GitHub Actions? Sources are web search results read on 2026-11-07; none was tested with a live call.

| Service | Official playlist-write API for an individual | Unattended auth | Catalogue fit | Verdict |
|---|---|---|---|---|
| TIDAL | Yes: API v2 (openapi.tidal.com/v2), playlists.read/write scopes, ISRC filter and album barcode lookup in third-party clients | OAuth authorization code with PKCE and refresh token (refresh behaviour unverified) | Commercial catalogue, ISRC and barcode | Chosen |
| Apple Music | Yes: Music API with a developer token from a $99/year Developer Program key | Music User Token about 180 days, no refresh token, browser reauthorisation | Commercial catalogue; playlists must use library IDs; only API-created playlists editable; item removal reportedly unsupported | Chosen |
| Deezer | API exists, but new app creation by private individuals has been disabled since 2025 (Deezer community staff reply, June 2025) | OAuth | Commercial catalogue | Rejected unless reopened |
| Amazon Music | Web API with playlist endpoints, but closed beta for approved developers only | Login with Amazon | Commercial | Rejected |
| SoundCloud | Playlist create/edit exists; self-service app registration opened May 2026 for Artist Pro subscribers only | OAuth with single-use refresh tokens | User-uploaded audio, poor match to Discogs releases | Rejected |
| Qobuz | Only a private, undocumented API | Password flow | Commercial | Rejected (against its terms) |
| YouTube Music | See issue #1 | | | Out of scope |
| Spotify | Development Mode needs the app owner on Premium (owner has none); Extended Quota is for registered organisations with 250,000 users | | | Deferred (D-057) |

Why these two: they are the only two with a current, official route open to an individual that supports playlist writes and catalogue lookup by ISRC or barcode. Both have costs and prerequisites the owner has not confirmed (TIDAL subscription; Apple Developer Program membership and Apple Music subscription). Apple Music's six-monthly reauthorisation and likely lack of item removal are its main weaknesses.
Sources: developer.tidal.com API listing via api-evangelist, minim and tidalapi documentation; Apple Music user-token reports (Music Assistant docs, Apple developer forums); Deezer community thread "api auth impossible"; Amazon Music Web API overview; SoundCloud developer blog and soundcloud/api issue 246; Spotify developer blog 2026-02-06.
