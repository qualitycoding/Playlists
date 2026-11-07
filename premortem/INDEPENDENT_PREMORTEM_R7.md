# Pre-mortem and adversarial review, round 7: the TIDAL + YouTube replan

- **Reviewer:** independent fresh-context subagent, owner-authorised extra round (beyond the five-round protocol). Read-only: nothing in the repository was changed.
- **Repository:** /home/claude/playlists, branch gen-20261107T154700Z-playlists-app-reliability, commit b78f21d ("cleanup of stale wording, checker stale-phrase rule").
- **Read:** plan/PLAN.md, DECISIONS.md (all, with focus on D-057..D-064 and D-023, D-024, D-026, D-030..D-035, D-040, D-041, D-043..D-056), GATES.md, ASSUMPTIONS.md, OPERATIONS.md, TRACEABILITY.md, tests/TEST_PLAN.md (T-001..T-075), premortem/RISK_REGISTER.md, PROVIDER_RESEARCH.md, round-6.md, RECHECK_R7.md, HANDOFF.md, AMENDMENTS.md (R8/R9), plan/tools/check_plan_consistency.py, cache/collection_cache.json, .github/workflows/weekly_sync.yml.
- **Mechanical checks:** `python3 -I plan/tools/check_plan_consistency.py .` printed OK (tests=75, unit 54, other 21, steps=13, decisions=64, risks=60, criteria=13). `sha256sum -c tests/FROZEN_MANIFEST.sha256` printed OK. Neither check can see the problems below, which are semantic.
- **Not raised, as instructed:** R-043 (agent runs as owner admin), public repository/collection/playlists (A-030), deferral of Spotify and Apple Music, owner declining any paid service (D-062).

## External facts checked (2026-11-07)

| Fact | Result | Source |
|---|---|---|
| YouTube write costs | playlistItems.insert, .update, .delete and playlists.insert cost 50 units; playlistItems.list and videos.list cost 1. Matches D-063. | [Google, Quota calculator](https://developers.google.com/youtube/v3/determine_quota_cost) (page last updated 2026-11-03) |
| YouTube search cost | **Changed.** The page now says projects have "a default quota allocation of 100 `search.list` calls, 100 `videos.insert` calls, and 10,000 units per day combined for all other endpoints". search.list is "100 quota per day. Each call costs 1 quota." So search is now a separate bucket of 100 calls a day. D-063 and A-040 still treat it as 100 units drawn from the 10,000. | same page; corroborated by [PPC Land](https://ppc.land/youtube-data-api/) |
| YouTube playlist capacity | The API returns 403 `playlistContainsMaximumNumberOfVideos` when "the playlist already contains the maximum allowed number of items". No number is documented. 5,000 is the commonly reported figure (unverified). Inserting with a `position` into a playlist that is not manually sorted returns `manualSortRequired`. | [playlistItems.insert reference](https://developers.google.com/youtube/v3/docs/playlistItems/insert?apix=true); [YouTube Help, playlists](https://support.google.com/youtube/answer/57792) |
| Google refresh tokens in Testing | **Verified.** "Authorizations by a test user will expire seven days from the time of consent", and that includes the refresh token. Only basic profile scopes are exempt. In production, an unverified app that requests sensitive scopes shows an "Unverified apps" warning and is limited to 100 users over the project's lifetime. | [Google Cloud Help 15549945](https://support.google.com/cloud/answer/15549945?hl=fr); [Google developer forum](https://discuss.google.dev/t/oauth2-refresh-token-expiration-and-youtube-api-v3/160874) |
| YouTube data storage | API data must not be stored for more than 30 days without being refreshed or deleted, and projects can be audited. | [PPC Land summary of the YouTube API Services policies](https://ppc.land/youtube-data-api/) (secondary source) |
| TIDAL free tier | **Withdrawn.** From 10 April 2024 "users who were on the Tidal Free tier will need to switch to a paid Tidal subscription". | [CMU, 6 March 2024](https://completemusicupdate.com/tidal-phases-out-hifi-plus-tier-makes-higher-quality-audio-part-of-its-standard-subscription-product/) |
| TIDAL developer access | "No fee and no approval to start". Registration is free with any TIDAL account. Rate limits are "not documented" and may change without notice. ISRC and barcode filters take up to 20 values. Responses are country-dependent through `countryCode`. The terms say: "You may not store, aggregate or compile databases of TIDAL content, and may not store it indefinitely." | [Sonovault TIDAL API summary](https://sonovault.now/tidal-api) (secondary source) |
| TIDAL playlist API maturity | Staff said in 2024 that playlist write support was still to be built and the API was "still in beta". "We're applying global cap of 20 items everywhere" (listing page size). A 2025 user post says write endpoints now exist; no staff confirmation was found. Nothing found on whether writes need a subscription. | [tidal-music discussion #6](https://github.com/orgs/tidal-music/discussions/6) |

## Is the replan coherent?

Mostly no. The provider swap was done by annotation: "[R9]" notes and "D-043 superseded by D-062" were added, and the operational model was not re-derived for the two new providers. The engine (D-024, D-026, D-032, D-033, D-034) is still Spotify-shaped: one write per 100 tracks, album entities with dates, no daily budget, and a weekly cadence that is enough. YouTube breaks each of those premises. TIDAL is probably unusable at no cost, and even if it works the owner cannot play its playlists. The findings follow, most severe first.

---

### PM7-001 (Critical): on the weekly schedule the YouTube first sync cannot finish, and the steady state barely keeps up
**Where:** D-063 ("the first sync is spread over several days by a persisted queue"), A-004 and the weekly_sync.yml cron `0 3 * * 0`, D-024, A-028, A-040, T-047, T-074.
**Arithmetic:**
- Writes use the 10,000-unit bucket. At 50 units per insert that is at most 200 playlist inserts a day, less the list calls.
- Each matched track is inserted into the master and into each of its genre lists (D-040 allows several genres per release, so allow about 1.3), plus Recently Added for new releases.
- At about 10 tracks per release that is roughly 23 inserts per release, so about **8 releases per day of quota**.
- The plan runs once a week. That gives **about 8 releases per week**.
**Failure scenario:** take a collection of 500 releases (A-028 is unmeasured; any collection over a few dozen behaves the same way). The YouTube backlog needs about 60 days of quota, which is about **60 weeks** of Sunday runs. If the owner buys more than about 8 records a week, the queue never drains. "Several days" is true only with daily runs, and the plan has none. Manual daily dispatches are possible, but D-042 warns that a dispatch displaces a pending run, and nothing in the plan schedules them.
**Minimal fix:**
- Add a decision that YouTube runs on a daily schedule (a second cron in sync.yml, or a provider-filtered job, under the same concurrency group `sync`). Each run spends a precomputed unit and search budget.
- Measure the collection size (A-028) in S-000a and record the projected backlog in days.
- Show backlog size and an ETA on the dashboard.
- Replace "several days" in D-063 with the computed figure. Add a T-074 case asserting that the budget limits inserts to at most `floor((10,000 − reserved list units)/50)` a day.

### PM7-002 (High): TIDAL is very likely dead on arrival for a no-pay owner, which leaves release 1 with only YouTube, the hardest provider
**Where:** D-059, D-061, D-064, A-034, A-035, A-041, PROVIDER_RESEARCH.md ("Chosen (needs a free account that can write playlists)"), R-056.
**Failure scenario:**
- TIDAL ended its free tier in April 2024. A TIDAL account without a subscription can register a developer app ("free with any TIDAL account"), but no source says it can write user playlists. The playlist write API was still described as beta.
- The more basic problem: even if the S-000a probe passes, the owner **cannot play** a TIDAL playlist without a subscription. The TIDAL half of release 1 would maintain eight playlists nobody listens to.
- Within three months the likely path is this. S-000a fails A-041, or passes it and TIDAL turns out to be pointless. D-064 then drops release 1 to "YouTube alone", after S-001..S-005 have been designed around two providers and the D-058 abstraction.
**Minimal fix:**
- Make the A-041 probe the first action of S-000a, before any other work.
- Record an owner decision now on whether TIDAL playlists the owner cannot play still have value. They would be public (A-030), so they might, for other listeners.
- Plan release 1 as **YouTube-first with TIDAL optional**, so the plan does not depend on A-041.

### PM7-003 (High): no workable YouTube matching rule exists, and the year rule leaves every YouTube release pending for ever
**Where:** D-032 (year rule: "a year check that cannot run leaves the release pending … retried next run"), D-058 ("barcode first … falls back to the D-032 exact artist/title rule"), D-063 ("matching uses the conservative D-032 rule on search results"), D-008, G-006, T-061, T-072, T-074.
**Failure scenario:**
- D-032 is album-centred: provider album artist and title, album date, track-count tolerance. The Data API has **no album entity, no album release date, no ISRC and no barcode**. A video's publishedAt is its upload date.
- Followed literally, the year check cannot run for any YouTube candidate. Every release stays "pending", is retried every run and spends the 100-call search bucket each time. Recall is zero, and the quota burns for ever.
- If the implementer instead matches per track over video search results, "unique exact title over K_search results" almost never holds: a Topic upload, the official video and lyric videos often share the exact title. That gives either near-zero recall or a quiet relaxation of D-008 without G-006.
- D-063 says precision is "judged at G-002b" from the D-041 owner report. That is a terminal listing, not the labelled-fixture precision and recall report (T-067) that G-002b requires.
**Minimal fix:** add a YouTube matching decision.
- Spend one search.list call per release with `type=playlist` for the auto-generated album playlist (channel "<Artist> - Topic", exact normalised title).
- Accept a candidate only if exactly one matches. Then list its items (1 unit per 50) and require the track-title set to agree with the Discogs tracklist under the D-032 tolerance.
- The year rule is waived for YouTube, recorded as such and not left pending. A pending release gets a retry back-off.
- This is beyond D-008, so it passes G-006 with a labelled YouTube fixture (T-067).
- Add T-074 cases for the rule and for "year check unavailable does not pend for ever".

### PM7-004 (High): quota-limited progress is reported as partial, so YouTube shows STALE and raises an issue every week for months
**Where:** D-063 ("a quotaExceeded response ends that provider's targets with exit 2"), D-026, D-031, D-053, D-054 (last-success and STALE per target), T-055, T-059.
**Failure scenario:**
- During the backlog of PM7-001, every YouTube run stops on its budget or on quotaExceeded and exits 2.
- Per-target last-success never advances. After 8 days every YouTube target shows STALE, and the D-031 check and the outside D-053 alarm open issues every week until the backlog clears, which could take months.
- The owner learns to ignore the alarm. When a real failure happens, such as an expired token or a disabled schedule, nobody notices. This is the R-014/R-054 failure, made by the plan itself.
**Minimal fix:**
- Define the outcome "progressing (quota)": the run spent its planned budget without error, everything written was read back, and the backlog shrank. It exits 0, or a distinct code that counts as success for STALE.
- STALE measures "last run that made verified progress", and the dashboard shows the backlog size.
- Only an unplanned quotaExceeded (budget miscounted) or a backlog that did not shrink counts as partial.
- Add cases to T-055 and T-059.

### PM7-005 (High): the circuit breaker contradicts the persisted queue
**Where:** D-024 ("abort if additions exceed new matched releases x T_rel"; the first-run cap applies only to targets with an empty ledger, D-054), D-063 (persisted queue of "unmatched and unadded releases"), T-057, T-074.
**Failure scenario:**
- From the second YouTube run on, nearly all additions come from releases matched in earlier runs and dequeued now, and "new matched releases" is about 0.
- The breaker aborts every run, so YouTube stalls after day 1, or the owner gives an override with a logged reason every day. Overrides also reset the shrink baseline (D-024 R5), so routine overrides weaken shrink detection too.
- The opposite reading (count every queued release as "new") makes the breaker allowance roughly unbounded on the first day.
**Minimal fix:**
- Amend D-024: the allowance is (releases dequeued for this target in this run) × T_rel.
- Each queue entry records its match time and the release's track count.
- The first-run cap becomes a per-run dequeue cap for every provider with a backlog.
- Add a T-057 case: a five-run backlog drain trips no breaker, and an injected burst trips it.

### PM7-006 (High): exit codes contradict provider isolation, so one bad YouTube token stops TIDAL's progress being saved
**Where:** D-026 ("A configured target with missing or invalid credentials is fatal, never skipped"), D-058 ("A provider failing fails only its own targets (exit 2, D-054)"), D-030 (upload and commit jobs run after exit 0 or 2, and after exit 1 only when a token rotated), D-063, T-059, T-075.
**Failure scenario:**
- The YouTube refresh token expires: 7 days in Testing (verified above), revoked, or 6 months unused.
- Under D-026 the run is fatal (exit 1). If TIDAL wrote first, its ledger and state are **not committed**, because the commit job skips exit 1 unless a token rotated. Each week TIDAL's writes are redone from the "unknown" state, and the first-run cap and breaker see no progress.
- Under D-058 the same event is exit 2. The plan does not say which rule wins, so the implementer chooses.
**Minimal fix:**
- Amend D-026: invalid or missing credentials for one provider fail only that provider's targets (exit 2, status REAUTH NEEDED per target).
- Exit 1 only for Discogs failure, state or key failure, or when every configured provider fails.
- Add a T-059 or T-075 case: YouTube invalid_grant while TIDAL succeeds leaves the TIDAL state committed.

---

### PM7-007 (Medium): the Google token behaviour is now verified, so decide it now instead of "checking in S-000a"
**Where:** D-063, A-039, R-060, OPERATIONS.
**Failure scenario:**
- An app in Testing loses its refresh token 7 days after consent, so a weekly job fails on most runs.
- D-063 defers the choice ("S-000a checks it and the plan either publishes … or returns to the owner"). A 7-day observation cannot finish inside S-000a.
- Moving to production unverified shows a warning screen and has a lifetime cap of 100 users. That is acceptable for one owner, but nothing records it. Tokens unused for about 6 months also lapse; that matters if YouTube is paused.
**Minimal fix:**
- Decide now: consent screen "In production", unverified, personal use, a documented warning click-through at setup.
- Add to OPERATIONS that each new consent counts towards the 100-user cap. Reauthorising the same owner does not add a user, but separate Google accounts used for rehearsal or dry-runs do.
- Turn A-039 into a fact with this source. R-060 stays High until the decision is recorded.

### PM7-008 (Medium): D-063's quota model is out of date (search now has its own bucket), and every non-production use shares the same buckets
**Where:** D-063, D-043 (basis text), A-040, D-041 (monthly re-search), D-046/D-047/D-052 (rehearsal, dry-run, gate-readonly), G-002a ("redacted dry-run diff").
**Failure scenario:**
- A single "unit budget" that charges 100 units per search does two things wrong. It wastes write budget on searches, and it does not see the separate 100-call search cap: search.list returns quotaExceeded at call 101 while the budget still shows room.
- Separately, quota is per Google Cloud project. Local dry-runs, the gate-readonly reads, rehearsal and the monthly re-search all draw from the production buckets, unless they use separate projects.
- The G-002a "redacted dry-run diff" of the whole collection needs one search per release. On one project it takes as many days as the collection has hundreds of releases, and it starves the live sync on those days.
**Minimal fix:**
- Amend D-063 and A-040: two budgets (search calls up to 100 a day; units up to 10,000 a day), both reset at midnight Pacific.
- Give rehearsal and dry-run their own Google Cloud project, or a written allocation from the production budget.
- Make the G-002a dry-run diff a sample, or let it reuse queued match results.
- Add a T-074 case for the two buckets.

### PM7-009 (Medium): YouTube Recently Added has no quota priority, and newest-first ordering costs extra
**Where:** D-033, D-063 (diff update), D-024, T-018, T-074.
**Failure scenario:**
- Under backlog pressure the run spends its budget on master and genre inserts, and the Recently Added diff starts late. Its deletes go through, then quotaExceeded hits before the inserts. Recently Added is left shrunk, or empty if most items changed.
- D-033 forbids that ("zero matched aborts without replacing"), but the diff path has no all-or-nothing budget check.
- Newest-first order needs `position`. That fails with `manualSortRequired` unless the playlist is manually sorted, and each reorder (playlistItems.update) costs 50 units.
**Minimal fix:**
- Recently Added runs first, and only if its whole diff (deletes + inserts + reorder) fits in the remaining budget. Otherwise it is skipped intact and reported.
- Set manual sort at playlist setup and insert at position 0, or drop the newest-first requirement for YouTube.
- Add T-018 and T-074 cases.

### PM7-010 (Medium): YouTube capacity, dead videos and read completeness conflict with the add-only ledger
**Where:** A-025 ("YouTube 5,000 items, moot under D-043"), D-023 capacity preflight, D-034 (never re-add, complete read against provider total, quarantine after N), D-054, D-024 shrink detection.
**Failure scenarios:**
1. **Capacity.** The master of a large collection reaches the commonly reported 5,000-video cap. D-054 fails only that target, but A-025 still calls the limit "moot", so nothing measures it or plans what to do when it is reached.
2. **Dead videos.** Videos are deleted, blocked by copyright or made private. They stay as dead playlist entries, or drop out of the count. Under "never re-added automatically" the track is never replaced. If the count falls, D-024's shrink detection aborts YouTube (beyond M) for a reason that is not the sync's fault.
3. **Completeness.** If `pageInfo.totalResults` disagrees with the items returned (unavailable videos; plausible, unverified), the "complete read" rule never passes and each target is quarantined after N runs.
**Minimal fix:**
- Reinstate A-025 for YouTube and measure capacity in S-000a.
- Add a cheap availability check (videos.list, 1 unit per 50 IDs), and an owner-approved replacement path for dead videos that is exempt from never-re-add.
- For YouTube, the shrink baseline counts available items only.
- Define completeness for YouTube as "pages exhausted with stable etag", not equality with totalResults.

### PM7-011 (Medium): legacy YouTube data and playlists are not addressed by the migration
**Where:** cache/collection_cache.json (rows hold `yt_ids`), S-006, D-005, D-037, D-048, G-004, T-011, T-062.
**Failure scenario:**
- The legacy cache holds YouTube video IDs from the ytmusicapi era, and the owner may have YouTube playlists that the old sync wrote to.
- The plan does not say whether release 1 reuses those playlists, which may sit on a different Google account or Brand account from the new OAuth one, or starts fresh.
- Reused: the legacy yt_ids need read-back and re-matching like the Spotify rows. Otherwise duplicates are added, or the empty-ledger first-run cap does not apply.
- Not reused: they must be dropped explicitly.
- D-048 meanwhile signs out the very Google session that owns those playlists.
**Minimal fix:**
- Record an owner decision on reusing or abandoning the legacy YouTube playlists, and name the Google account or channel to use.
- Extend S-006 and G-004 to the yt_ids column, or drop it explicitly.
- Add a T-062 case.

### PM7-012 (Medium): YouTube came back without the gate D-043 requires, and the OAuth scope reaches the whole channel
**Where:** D-043 ("Reintroduction needs a new G-001 with the D-038 evidence"), GATES G-001 (still "DECIDED … removed"), GATES R8 note, D-062, D-063, R-006 and R-013 (both "CLOSED for release 1").
**Failure scenario:**
- Playlist writes need `https://www.googleapis.com/auth/youtube` or `youtube.force-ssl`, which grant full management of the channel: deleting videos, playlists and comments.
- The token sits in Environment secrets and encrypted state. Under R-043 an agent can read it. A leak, or a bug in the Recently Added delete path, can delete things on the owner's main channel.
- D-038's protection (a dedicated or Brand account) was required for exactly this, but no new G-001 was held. The register still shows the YouTube account risks as CLOSED.
**Minimal fix:**
- Record a GATE-G-001 re-decision for the official API: scope, blast radius, and a dedicated Brand-account channel that holds only these playlists.
- Reopen R-013 (re-scoped to Data API scope and terms).
- Restrict deletes to Recently Added's playlist ID, checked again immediately before any delete call.

### PM7-013 (Medium): the provider configuration is unspecified or contradictory
**Where:** PLAN out of scope ("playlist creation"), D-058 and D-059 ("create playlist"), T-073 ("playlist create"), D-015, D-040 (secret names SPOTIFY_*_PLAYLIST_ID; "Configured means every one of the eight Spotify targets"), T-069 ("secret names as the owner's"), D-023 and A-030 (only Spotify playlists are stated public), D-035 and D-055 (one path, state/token.enc, for "each provider's" token).
**Failure scenario:**
- The owner has no TIDAL or YouTube playlist IDs or secrets.
- The implementer either builds playlist creation, which is out of scope and would need privacy decisions, or blocks on D-015 with no instruction to the owner.
- T-069 cannot pass for names that do not exist.
- Two providers each writing state/token.enc overwrite each other's refresh token. The next run then falls back to the secret token once (D-055) and fails.
**Minimal fix:**
- The owner creates 16 playlists by hand: visibility public, rehearsal private (YouTube: public/unlisted/private, unlisted counts as non-private).
- Keep creation out of scope and remove it from D-058, D-059 and T-073.
- Name the secrets TIDAL_<GENRE>_PLAYLIST_ID and YOUTUBE_<GENRE>_PLAYLIST_ID in D-040.
- Use state/<provider>/token.enc, with its own generation number.

### PM7-014 (Medium): barcode-first matching is a new rule that no gate covers
**Where:** D-058, D-008, D-032, G-006, T-073.
**Failure scenario:**
- Discogs barcodes for vinyl rarely equal a digital release's UPC, so recall gains are small.
- Discogs barcode fields often hold mistyped or extra codes (matrix numbers, a reissue's code). A barcode hit is treated as definitive and skips the edition, year and track-set conflict checks of D-008 and D-032, so a wrong edition or a compilation is matched without any ambiguity check.
- The rule goes beyond "exact unique artist/title", which G-006 says needs a precision report and owner approval.
**Minimal fix:**
- A barcode hit must also pass the D-032 conflict checks.
- The labelled fixture (T-067) reports barcode-path precision separately.
- Name G-006 for this rule.

### PM7-015 (Medium): TIDAL API realities and both providers' terms are not reflected
**Where:** D-059, D-034 (complete read), D-024, D-035/D-041 (ledger, unmatched list), T-073, A-034.
**Failure scenario:**
- TIDAL listings are paged at about 20 items (staff, 2024), and rate limits are undocumented and may change without notice. A complete read of a master with several thousand tracks takes hundreds of calls a run. A 429 in the middle gives an incomplete read, and D-034 quarantines the target after N runs.
- `countryCode` changes availability. A catalogue match made with one country code may be unplayable in the owner's account country.
- TIDAL's terms forbid storing TIDAL content "indefinitely" or compiling databases of it. YouTube requires stored API data to be refreshed or deleted within 30 days. The ledger, the persisted queue and any match cache keep provider IDs and metadata indefinitely. That could get the app or project revoked, an outage outside the plan's control.
**Minimal fix:**
- In S-000a, record TIDAL page size, rate-limit behaviour, refresh-token rotation, account country and redirect-URI support.
- Give each provider a read budget with Retry-After back-off.
- Store only IDs, and refresh or expire cached metadata within 30 days. Weekly read-back already refreshes the IDs in playlists.
- Record a terms review (TIDAL Developer Terms 3.0, YouTube API Services policies) in PROVIDER_RESEARCH.md.

### PM7-016 (Medium): the tests and the checker still encode the old provider set
**Where:** tests/TEST_PLAN.md, TRACEABILITY.md, check_plan_consistency.py.
**Failure scenarios and gaps:**
- **T-065 cannot pass.** T-065 asserts that "every deferred marker cites D-043", yet TEST_PLAN requires markers citing D-057 for the Spotify parts. T-065 is a required status check on main (D-055), so it fails as soon as S-000b writes those markers. Amending it needs owner approval (D-036).
- **Spotify-only tests not deferred.** T-006 ("unique exact Spotify match"), T-010 ("Spotify chunks <=100") and T-037/D-036 ("enforces the 100-item limit") are Spotify-specific but missing from the D-057 deferral list. T-010 has no TIDAL or YouTube equivalent (YouTube inserts one item per call).
- **Stale text.** TEST_PLAN says "the provider-neutral clauses run against the TIDAL and Apple adapters". TRACEABILITY maps T-074 to criterion 13 because of the deferred Apple day-150 warning; it now tests the YouTube adapter. D-060 still cites T-074.
- **Missing tests.** Daily quota schedule and backlog (PM7-001); "progressing (quota)" status (PM7-004); breaker with queue (PM7-005); cross-provider exit codes (PM7-006); two quota buckets (PM7-008); Recently Added under budget (PM7-009); YouTube match rule and year waiver (PM7-003); TIDAL free-account write probe and paging of about 20 items (PM7-002, PM7-015); per-provider token files (PM7-013).
- **Checker.** check_plan_consistency.py fails any YouTube line without "D-043", "deferred", "removed" or "moot". That forces the misleading "D-043 superseded by D-062" notes and would reject accurate new YouTube text. Its deferred-test logic and success criterion 10 count only D-043 deferrals, not D-057 or D-064.
**Minimal fix:**
- Amend T-065 to "every deferred marker cites its deferring decision (D-043, D-057 or D-064)".
- Add T-006, T-010 and T-037's limit to the D-057 list, with provider-parameterised replacements.
- Add the missing cases to T-073, T-074 and T-075.
- Retire the YouTube rule in the checker and teach it the D-057 and D-064 deferrals.
- Re-map T-074 in TRACEABILITY.

### PM7-017 (Medium): stale Spotify, Apple and old-YouTube wording now misleads the implementer
These are not marked as superseded, and each one gives a wrong instruction:
- PLAN criterion 6 ("rotated Spotify token").
- PLAN criterion 10 ("deferred for YouTube Music (D-043)" only).
- PLAN S-002 ("supported Spotipy handling").
- PLAN S-005 ("max-100 Spotify chunks").
- PLAN header ("G-001 decided … YouTube Music removed").
- D-011 ("no YT Recently Added"), which contradicts D-063's diff-updated Recently Added.
- D-013 and D-017 (Spotipy).
- D-023 ("eight target IDs (Spotify …)"; the [R9] note helps only partly).
- D-027 ("Spotify playlists are public"; "holds the rotated Spotify token").
- D-034 (identity "YouTube playlist item IDs" as an alias: a playlistItem ID is per insertion, and the content identity is the videoId).
- D-035 (Spotipy and Spotify scope list as *the* minimal scopes; T-068 the same).
- D-040 (see PM7-013).
- D-047 (Spotify-only rotation measurement; TIDAL rotation is unmeasured).
- A-005 and A-006 ("no YouTube adapter in release 1").
- A-025 ("moot under D-043").
- OPERATIONS R8 ("TIDAL subscription and developer app").
- R-006 and R-013 ("CLOSED for release 1").
- R-023 (residual High titled "Spotify refresh-token persistence").
- HANDOFF.md line 2 ("Goal: reliable Discogs sync to Spotify master … ytmusicapi").
**Minimal fix:** one cleanup commit. Re-scope each item to "per provider" or mark it "[superseded by D-0xx]". Add the phrases to the checker's STALE list.

### PM7-018 (Medium): fresh pre-mortem: in three months there is still no code
**Where:** PLAN status (BLOCKED), 64 decisions, 75 tests, 13 steps, 6 gates, 8 review rounds; A-001 ("hobby").
**Failure scenario:**
- The most likely three-month outcome is not a bad sync but none at all. Each replan adds about 5–8 decisions and a review round.
- S-000a's probes (A-039, A-041, collection size, quota) decide the shape of release 1 and have not run.
- Meanwhile the legacy workflow is disabled, so the owner has no working sync at all. The plan's complexity is itself the leading risk, and it is not in the register.
**Minimal fix:**
- Freeze plan amendments now, except for the Critical and High fixes here.
- Run the S-000a provider probes (A-041 TIDAL write, Google production consent, collection count, quota) before any further review round.
- Define a minimal release 1: YouTube master playlist only, add-only, daily quota-paced. Add the genres, Recently Added and TIDAL as release 1.1 once that runs green for four weeks.
- Add this as a register risk.

### PM7-019 (Low): the register is out of date for the replan
**Where:** RISK_REGISTER.md.
- The PLAN and register say "Residual High 12", but the residuals are planner estimates that count the Spotify-titled R-023.
- No register entry covers PM7-001 (throughput), PM7-003 (YouTube matching), PM7-004 (alarm fatigue), PM7-005 (breaker and queue), PM7-011 (legacy YouTube), PM7-015 (terms) or PM7-018 (never ships).
- R-012 ("Quota … overrun", Medium/Medium) understates the YouTube quota, which now drives the design.
**Minimal fix:** add these risks, re-scope R-023 to provider tokens, raise R-012, and re-derive the totals.

### PM7-020 (Low): the YouTube consent and setup details are not written down
**Where:** D-035 setup rules (Spotify loopback and scopes), D-063.
- The installed-app client, the loopback redirect, the `youtube` scope (no narrower write scope exists), the read-only scope for gate-readonly, and `access_type=offline` with `prompt=consent` (needed to get a refresh token on reauth) are not specified.
- A reauthorisation without `prompt=consent` can return no refresh token. The setup script would then store nothing and the next run fails.
**Minimal fix:** list these parameters in D-063 and test them in T-068.

---

## Findings table

| ID | Severity | One line |
|---|---|---|
| PM7-001 | Critical | Weekly schedule plus YouTube quota (about 200 inserts a day, about 8 releases a week) means the first sync takes about a year and may never drain; "several days" needs daily runs |
| PM7-002 | High | TIDAL free tier withdrawn April 2024, so A-041 is likely false and the owner cannot play TIDAL playlists; release 1 is effectively YouTube-only |
| PM7-003 | High | No workable YouTube match rule: no album, date, ISRC or barcode; the D-032 year rule leaves every YouTube release pending for ever |
| PM7-004 | High | Quota-limited runs exit 2, so YouTube STALE and issue alarms fire weekly for months (alarm fatigue) |
| PM7-005 | High | Circuit-breaker allowance ("new matched releases") trips on every queue-drain run, or becomes unbounded |
| PM7-006 | High | D-026 (invalid credentials fatal) contradicts D-058 (provider-isolated exit 2); a bad YouTube token loses TIDAL's committed state |
| PM7-007 | Medium | Google Testing tokens expire in 7 days (verified); decide production-unverified now, not in S-000a |
| PM7-008 | Medium | search.list is now a separate 100-call bucket (page updated 2026-11-03); dry-run, rehearsal and re-search share production quota |
| PM7-009 | Medium | YouTube Recently Added has no budget priority or all-or-nothing check; newest-first needs manual sort and 50-unit updates |
| PM7-010 | Medium | YouTube capacity (A-025 "moot"), dead videos under never-re-add, and the totalResults completeness rule cause quarantines and shrink aborts |
| PM7-011 | Medium | Legacy yt_ids and old YouTube playlists are not covered by S-006 or G-004; the account owning them is unnamed |
| PM7-012 | Medium | YouTube reinstated without the new G-001 D-043 requires; the `youtube` scope can manage the whole channel |
| PM7-013 | Medium | Playlist creation in/out of scope, no TIDAL or YouTube secret names, privacy unspecified, one token.enc for two providers |
| PM7-014 | Medium | Barcode-first match bypasses conflict checks and G-006 |
| PM7-015 | Medium | TIDAL 20-item paging and undocumented limits break complete reads; TIDAL and YouTube storage terms versus an indefinite ledger |
| PM7-016 | Medium | T-065 requires D-043 on all deferred markers (cannot pass); T-006, T-010 and T-037 not deferred; missing tests; checker forces stale marks |
| PM7-017 | Medium | Unmarked stale Spotify, Apple and old-YouTube wording across PLAN, DECISIONS, ASSUMPTIONS, OPERATIONS, the register and HANDOFF |
| PM7-018 | Medium | Plan weight means nothing ships in three months; S-000a probes not run; no minimal release 1 |
| PM7-019 | Low | Register lacks the replan risks; R-012 understated; R-023 mis-titled |
| PM7-020 | Low | YouTube OAuth setup parameters (offline access, prompt=consent, scopes) unspecified |

**Totals:** Critical 1, High 5, Medium 12, Low 2.

**Residual Critical/High excluding accepted items (R-043, A-030, Spotify and Apple deferral, D-062):**
- From this round: **Critical 1, High 5** (PM7-001..006, all open).
- The planner's own register also lists unreviewed residual Highs: R-007, R-011, R-020, R-021, R-026, R-041, R-047, R-056, R-059 and R-060. R-020 needs named owner acceptance, and R-023 needs re-scoping.

## Convergence verdict

**NOT CONVERGED.** There is 1 Critical and there are 5 High residuals, none of them in an accepted category. The replan is coherent in its intent: free providers only, and a provider-neutral engine. Its mechanics were carried over from a Spotify design that assumed cheap writes, album entities and a weekly cadence. The fixes are small and mostly declarative:
- a daily, quota-paced YouTube schedule with a "progressing" status;
- a YouTube matching decision under G-006;
- a breaker allowance based on dequeued releases;
- provider-isolated exit codes;
- running the A-041 TIDAL probe before anything else.

After those, one more targeted re-check (not a full round) should be enough.
