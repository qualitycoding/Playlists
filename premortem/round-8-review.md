# Pre-mortem and adversarial review, round 10: do D-065..D-070 resolve PM7-001..PM7-008?

- **Reviewer:** independent fresh-context subagent. Read-only: nothing in the repository was changed.
- **Repository:** /home/claude/playlists, branch gen-20261107T154700Z-playlists-app-reliability, commit 958ddcb ("plan: apply round-7 fixes PM7-001..008 (D-065..D-070), YouTube-first release 1").
- **Scope:** only whether the round-10 decisions D-065..D-070 resolve PM7-001..PM7-008, and whether they introduce new problems or contradictions. Not re-raised, as instructed: R-043 (agent runs as owner admin), public repository, collection and playlists (A-030), the Spotify and Apple Music deferral, and the owner's refusal of any paid service (D-062). Round-7 Mediums PM7-009..PM7-020 are out of scope except where a round-10 decision makes one of them worse.
- **Read:** plan/DECISIONS.md (all 70), PLAN.md, GATES.md, OPERATIONS.md, ASSUMPTIONS.md, TRACEABILITY.md, AMENDMENTS.md, tests/TEST_PLAN.md, premortem/RISK_REGISTER.md, INDEPENDENT_PREMORTEM_R7.md, round-7-replan.md, the diff of 958ddcb, and .github/workflows/weekly_sync.yml (legacy cron `0 3 * * 0`).
- **Mechanical checks (2026-11-07):** `python3 -I plan/tools/check_plan_consistency.py .` printed `tests=75 (unit 54, other 21) steps=13 decisions=70 risks=66 criteria=13` and `OK`. `sha256sum -c tests/FROZEN_MANIFEST.sha256` printed `tests/TEST_PLAN.md: OK`. Both pass, but neither can see the semantic problems below. In particular the checker passes although T-055, T-057, T-059 and T-072 still contradict D-068, D-069 and D-070, and although PLAN, OPERATIONS, GATES and ASSUMPTIONS still describe a weekly-only YouTube sync.

**Main observation.** Commit 958ddcb changed only DECISIONS.md (6 new lines), one line of T-074, the PLAN decision count, AMENDMENTS and the register's control column. The fixes are sound in intent and mostly in substance. They were added as amending decisions and not carried into the documents an implementer works from: PLAN steps, OPERATIONS, GATES, ASSUMPTIONS, and the specific tests they amend. Several of them also leave the key quantity undefined: "per day" against "per run", what counts as "backlog", what "dequeued" means, and which targets are "configured".

## External facts checked (2026-11-07)

| Fact | Result | Source (date) |
|---|---|---|
| YouTube quota | "default quota allocation of 100 `search.list` calls, 100 `videos.insert` calls, and 10,000 units per day"; search.list "100 quota per day. Each call costs 1 quota"; playlistItems.insert, playlistItems.delete and playlists.insert cost 50; playlistItems.list and videos.list cost 1; "Daily quotas reset at midnight Pacific Time (PT)". D-065's two budgets match this. | [Google, Quota calculator](https://developers.google.com/youtube/v3/determine_quota_cost), page "Last updated 2026-11-03 UTC" |
| Google OAuth, Testing status | "Authorizations by a test user will expire seven days from the time of consent", and an offline refresh token "will also expire". | [Google Cloud Help 15549945, Manage App Audience](https://support.google.com/cloud/answer/15549945) (fetched 2026-11-07) |
| Google OAuth, unverified in production | An unverified app with sensitive or restricted scopes shows an "Unverified apps" warning. The cap is "100 new users in total, after the app presents the unverified app screen", and it "applies over the entire lifetime of the project, and it cannot be reset or changed". The page does not say whether re-consent by an existing user counts, and it mentions no personal-use exemption. | same page |
| Other refresh-token invalidation | A token unused for six consecutive months is invalidated. "Each user can hold up to 100 live refresh tokens for a given OAuth client", and the oldest is silently invalidated when that is exceeded. Production status does not by itself guarantee a token's lifetime. | [Nango, "Google OAuth invalid_grant"](https://nango.dev/blog/google-oauth-invalid-grant-token-has-been-expired-or-revoked) (1 Apr 2026, secondary; summarises Google's OAuth 2.0 docs, which this session could not fetch) |
| YouTube data retention | III.E.4: authorised data other than statistics may be stored for no longer than the consent period and 30 calendar days, after which "the API client must delete or refresh the stored data". Non-authorised data may be stored only temporarily, for at most 30 days. Revoked consent requires deletion (7 or 30 days, inconsistent on the page). No exception for identifiers is stated. | [YouTube API Services Developer Policies](https://developers.google.cn/youtube/terms/developer-policies?hl=en) (last updated 2025-08-21; Chinese locale rendering); [Developer Policies guide](https://developers.google.cn/youtube/terms/developer-policies-guide?hl=en) (last updated 2026-09-14): "Store a user's information indefinitely" is listed under "Don't" |
| YouTube playlist capacity | 5,000 items per playlist. Google gives no number; the API only returns `playlistContainsMaximumNumberOfVideos`. | [Secondary blog, 8 June 2026](https://simpledecisionmaker.onrender.com/blogs/youtube-playlist-misconceptions-debunked/) (unverified; consistent with round 7) |
| TIDAL free tier | No free tier: "Tidal removed its free tier in April 2024"; only a 30-day trial exists. No source found on whether an account without a subscription can write playlists through the developer API (A-041 stays unverified). | [FreeYourMusic TIDAL review, updated Sep 2026](https://freeyourmusic.com/blog/what-is-tidal) |
| Album playlists via search.list | Whether `search.list type=playlist` reliably returns the auto-generated album playlists ("OLAK5uy_…", "<Artist> - Topic") could not be confirmed from Google's documentation in this session. Treat it as **unverified**. | searches 2026-11-07, no authoritative result |

## Quota arithmetic, re-done

Assumptions: inserts cost 50 units. R is the reserved list units per day. A complete read of a playlist of n items costs ceil(n/50) units. D-054 requires a complete read before an add, and D-006 a read-back after it. D-067 adds one list call per release matched. On average there are 10 tracks per release (A-028 and track counts are unmeasured).

- Inserts per day = floor((10,000 − R)/50). With R = 200 that is **196 a day**. With a 5,000-item master read twice (2 × 100 units) plus about 20 matching lists, R ≈ 220 and the result is still about 195. D-065's formula is correct, but it does not say how R is computed. R grows with playlist size and must be derived from it each day.
- Search: 100 calls a day, which allows at most 100 new match attempts a day. That is not the binding limit on first-sync throughput (inserts are, at about 20 releases a day). Retries with back-off and the D-041 monthly re-search share the same 100.
- **Master-only (D-066):** about 19.6 releases a day. A collection of 300 releases takes about 16 days, 500 about 26 days, 1,000 about 52 days and 2,000 about 103 days. This is feasible, so the Critical is resolved in principle.
- **Full configuration (master + about 1.3 genre lists per track):** 2.3 inserts per track gives about 8.5 releases a day. A collection of 500 takes about 59 days and 2,000 about 235 days. Adding the genres after the master backlog clears (D-066) moves this cost later but does not remove it. The genres' own backfill is about 1.3 × the master backlog in inserts.
- **Matching runs ahead of inserting:** 100 searches a day against about 20 releases inserted a day. A 2,000-release collection is fully matched in about 20 days and fully inserted in about 103. Queued match results therefore wait up to about 80 days (see PM10-008).
- **Capacity:** at 10 tracks per release, a 5,000-item master (secondary source) holds about **500 releases**. Any larger collection fills the only release-1 target (see PM10-003).

## Findings

### PM10-001 (High): the single-master minimal release contradicts "configured means all eight targets" and the preflight
**Where:** D-066 against D-015, D-023 ("all eight target IDs … pairwise distinct"), D-040 ("Configured means every one of the eight … targets has an ID … a missing genre ID is fatal"), D-026 (exit 0 = all configured targets verified), D-033, T-019 (missing ID hard error), T-051, T-069 ("missing genre ID fatal"), PLAN goal and success criterion 4, GATES G-002a ("targets distinct and owned").
**Failure scenario:**
- The implementer follows D-066 and configures only YOUTUBE master. Preflight (D-023, D-040) then finds seven missing IDs, and every run is a hard failure.
- If the implementer satisfies T-019 and T-069 instead, the owner must create seven extra real public YouTube playlists. Those are add-only targets, so the engine starts filling them, which is exactly the quota spend D-066 meant to avoid.
- Either way, frozen tests (T-019, T-051, T-069) assert behaviour that D-066 forbids, and amending them needs owner approval (D-036).
- Activating the genre lists and Recently Added later is a first write to new real playlists, and no gate covers it. G-002b approved a master-only scope, and GATES R8 says "each live provider run still needs G-002a and G-002b" but says nothing about adding targets.

**Minimal fix:**
- Amend D-015, D-023 and D-040: each provider has an explicit, committed **target set** (release 1 YouTube: {master}). "Configured" means every ID in that set is present. IDs outside the set must be absent, and their absence is not an error.
- Amend T-019, T-051 and T-069 to match, with owner approval recorded in DECISIONS (D-036).
- Add to GATES: enlarging a provider's target set needs a G-002b-style approval for the new targets, and the first-run cap and breaker (D-069) apply to them.

### PM10-002 (Medium): the quota budget is per run, not per Pacific day, and the two crons are under-specified
**Where:** D-065 ("Each run computes floor(...) inserts"; "a second cron in sync.yml under the same concurrency group `sync`"), D-025, D-042, A-029, D-052 (rehearsal shares group `sync`), D-068, D-070.
**Failure scenario:**
- More than one run can draw on one Pacific day's quota: the Sunday weekly cron and the daily cron both fire, a manual dispatch, "re-run failed jobs", a delayed cron, or a rehearsal that uses a "written allocation from the production budget". Each run assumes a fresh 10,000 units and 100 searches.
- The second run then hits an unplanned quotaExceeded. Under D-068 that is a "budget miscount" (exit 2). In a YouTube-only release, D-070's "every configured provider fails" makes it exit 1, and the commit job does not commit that run's writes (PM10-006).
- Separately, if both crons are `0 3 …`, two runs are triggered at once on Sunday. GitHub keeps one pending run per group, so a third event, such as a dispatch, silently cancels the weekly TIDAL run (A-029). The plan also does not say how one sync.yml knows which providers a given trigger runs (github.event.schedule), so the daily cron may run TIDAL daily, or the weekly cron may run YouTube twice that day.

**Minimal fix:**
- Persist a per-provider quota ledger in the encrypted state, keyed by Pacific date: units and searches spent, plus each run's allocation. Each run's budget is the day's remainder.
- Use **one** daily cron, away from midnight PT (07:00–08:00 UTC is the danger window; 03:00 UTC is safe all year). The engine selects providers by weekday: YouTube daily, TIDAL on Sunday.
- Add T-074 cases for two runs on one Pacific date and for the provider selection.
- Drop "Spotify" from D-065.

### PM10-003 (High, conditional on A-028): the single master playlist cannot hold a collection of more than about 500 releases
**Where:** D-066 (one master playlist), A-025 (still "YouTube 5,000 items, moot under D-043"), D-023 capacity preflight, D-054 (capacity fails only its own target).
**Failure scenario:**
- A collection of 1,000 releases (A-028 is unmeasured) fills the master at about 5,000 items after about 26 days. playlistItems.insert then returns `playlistContainsMaximumNumberOfVideos`.
- D-054 fails that target with exit 2 every day. It is release 1's only target, so the release stops, and D-068 counts a non-shrinking backlog as partial from then on. About half the collection is never synced.
- Round 7 raised this as PM7-010 (Medium). D-066 makes it High, because the whole release now rests on that one playlist.

**Minimal fix:**
- Re-open A-025 for YouTube. Measure the real cap with a rehearsal playlist, and measure the collection size, both in S-000a.
- If tracks exceed about 90 % of the cap, decide now how the master is split (for example "Master 1..k", each a committed target, filled in order), or record the owner's acceptance of a truncated master.
- Add a capacity-forecast line (days until full) to the dashboard next to the D-065 ETA.

### PM10-004 (Medium): "progressing (quota)" is defined on an undefined backlog, so it gives either false alarms or a masked stall
**Where:** D-068, D-063 (queue of "unmatched and unadded releases"), D-067 (unmatched with retry back-off), D-054 (STALE per target), D-031 and D-053 (8-day threshold, issue alarm), T-055 (unchanged: "STALE after 8 days … last success").
**Failure scenarios:**
1. **False alarms (if "backlog" includes unmatched entries).** Once every matchable release is inserted, the backlog equals the unmatched remainder plus new purchases. It never shrinks again. Each budget-limited run then exits 2, and in the steady state, alarm fatigue returns (R-064).
2. **Masked stall (if "shrinks" is measured gross).** If shrinking means "anything dequeued", a backlog whose arrival rate is at or above the drain rate (a bulk import after a record fair, or a large collection near the 5,000 cap) shows "progressing" for ever while its ETA grows without limit. Nothing alarms on the ETA. Releases moved from "unadded" to "unmatched/back-off" can also count as shrinkage without a write.
3. **Net-measured shrink.** If shrinking is measured net, a day on which the owner adds more releases than about 20 exits 2 although nothing failed.
4. **Per-provider or per-target ambiguity.** D-068 judges progress per run or provider, but STALE is per target (D-054). Once genre lists exist, a quarantined genre target can sit behind a progressing master unless progress is judged per target.
5. **Threshold.** 8 days is a weekly threshold. For a daily provider it means up to a week of silent failure before the alarm, although a REAUTH NEEDED status (D-070) would be visible on the dashboard (see PM10-006 for when it is not).

D-068 does not mask the important failures: an expired token, a disabled schedule or a broken write all spend no budget, so none of them can be "progressing".

**Minimal fix:**
- Define the progress metric per target as "verified inserts this run > 0 and no unplanned error". Exclude backed-off unmatched entries from "backlog".
- Add an ETA alarm: open an issue if the projected drain date moves later on 7 consecutive runs, or if the backlog is not zero by 1.5 × the ETA recorded in S-000a.
- Set a per-provider STALE threshold: 2 days for a daily provider, 8 for a weekly one.
- Amend T-055, and point the D-031 and D-053 checks at the per-target "last verified progress" field.

### PM10-005 (High): the D-067 matching rule is under-specified and its recall is unproven, and it is release 1's only matching path
**Where:** D-067, D-063, D-055 (K_search "at most 10 per page", a Spotify figure), D-041 (monthly re-search), G-006, G-002b recall floor, T-067, T-072 (unchanged: "a year check that cannot run leaves the release pending").
**Failure scenario:**
- D-067 says "exactly one search result matches artist and title … its items are then listed" but never says **what is searched**. Round 7's fix named `type=playlist` and the "<Artist> - Topic" album playlist; D-067 dropped both.
- If the implementer searches videos, "its items" is meaningless. If it searches playlists, whether search.list returns auto-generated album playlists reliably is unverified (see the facts table).
- Uniqueness fails in common cases: the same album exists as several album playlists (explicit and clean, regional or label duplicates, remaster and original with identical normalised titles). D-067 sends all of those to "unmatched with back-off", and each retry spends the 100-call search bucket alongside the monthly re-search.
- K_search ≤ 10 is inherited from Spotify. A YouTube search costs one call whatever maxResults is (up to 50), so judging uniqueness over 10 results is weaker and cheaper for no reason.
- No probe checks feasibility before S-004. A low recall is found only at G-002b, after S-000a..S-008 are built. That is the "nothing ships in three months" outcome of PM7-018.

**Minimal fix:**
- Specify the search: `type=playlist`, maxResults=50, candidate channel title equal to "<artist> - Topic" or the artist after normalisation, then playlistItems.list.
- Add an S-000a probe: run D-067 by hand on 30 owner-picked releases and record hit, ambiguous and miss rates. If recall is below the owner's floor, the plan returns to the owner before S-001. A named fallback could be resolving the artist's Topic channel once per artist and enumerating its playlists at 1 unit each (also unverified).
- Set K_search for YouTube to 50.
- Amend T-072 with the YouTube waiver.
- Give the back-off a ceiling (for example 30, 90 and then 180 days) and count it in the search ledger of PM10-002.

### PM10-006 (Medium): in a YouTube-only release, D-070 turns every YouTube failure into exit 1, and the commit job then drops progress and REAUTH NEEDED
**Where:** D-070 ("Exit 1 … when every configured provider fails"), D-066 (YouTube alone is the planned default), D-030 (commit after exit 0 or 2, and after exit 1 only when a token rotated), D-051 (pages deploys only when the status generation changed), D-068 (unplanned quotaExceeded exits 2), D-026 (text not annotated), T-059 (unchanged: "missing credentials fatal").
**Failure scenarios:**
- With YouTube as the only provider, an expired token is "every configured provider fails", so it exits 1. The commit job is skipped, status.json is not updated, the generation does not change and pages.yml does not deploy.
- The REAUTH NEEDED status that D-070 promises is therefore never shown. The owner learns of the failure only from the 8-day STALE issue.
- The same applies to a 5xx outage or an unplanned quotaExceeded **after** 150 verified inserts. D-068 says exit 2; D-070 makes it exit 1, so the plan contradicts itself. The run's verified ledger rows are not committed. The next run reconciles them from the unknown state at read cost, so there are no duplicates, thanks to D-054, but the progress metric and the breaker's view of that day are wrong.
- T-059 (frozen) still requires "missing credentials fatal", so S-000b would write a test that contradicts D-070.

**Minimal fix:**
- Exit 1 means "no provider write was attempted and state is unchanged" (Discogs, state, key or preflight failure before any write). Any run that wrote or changed status exits 2 or 0.
- Alternatively, let the commit job run after exit 1 whenever a sync-job output `state_changed` is true.
- Annotate D-026, amend T-059 (with owner approval, D-036), and add a T-074 case for a YouTube-only release with invalid_grant that shows REAUTH NEEDED on the next Pages deploy.

### PM10-007 (Medium): D-069 does not define when a release leaves the queue, and with T_rel = 40 the breaker is inert for YouTube
**Where:** D-069, D-024, D-054 (first-run cap for empty-ledger targets), T-057 (unchanged: "first-run cap also for any target with an empty ledger").
**Failure scenario:**
- "Dequeued" is undefined. If a release counts as dequeued when the run picks it, then budget exhaustion halfway through it, or a breaker abort, can drop it from the queue unless it is requeued. It is then never synced, and D-068 counts it as shrinkage.
- The allowance is dequeued × 40, against an average of about 10 tracks. With a dequeue cap of, say, 20 releases, the allowance is 800, while the insert budget is 196. The breaker can never trip on YouTube, so the quota, not the breaker, is the only cap. A wrong match to a 150-track box set inside a run of small releases passes.
- The per-run dequeue cap has no value and no stated relation to the budget.

**Minimal fix:**
- A release leaves a target's queue only when all its tracks are confirmed by read-back in that target. Partial releases stay at the head of the queue.
- Use the queue entry's **recorded track count** (which D-069 already stores) for the allowance: the sum of recorded counts times a tolerance, with T_rel only as a ceiling per release.
- Derive the dequeue cap from the day's remaining budget.
- Amend T-057 to the D-069 wording.

### PM10-008 (Medium): queued YouTube match data outlives YouTube's 30-day storage limit
**Where:** D-065 (G-002a "reuses queued match results"), D-069 (queue records match time), D-063 (persisted queue), D-034 (ledger), YouTube API Services Developer Policies III.E.4.
**Failure scenario:**
- Matching runs about 5× faster than inserting (see the arithmetic above), so queue entries hold YouTube-derived data (album playlist and video IDs from search) for up to about 80 days on a 2,000-release collection, and longer on bigger ones.
- The policy requires such data to be refreshed or deleted within 30 days, and Google may audit projects.
- Separately, an inserted video that has since been removed is caught only by read-back. A queue entry over 30 days old may insert a video that is no longer the right one.

**Minimal fix:**
- Queue entries hold Discogs IDs plus the YouTube album playlist ID. Before insert, any entry whose match is more than 30 days old is refreshed: one playlistItems.list at 1 unit, re-checked against the tracklist.
- Do not match further ahead than the inserts of about 25 days.
- The daily complete read of each target already refreshes the ledger's view of the playlists. Record that as the III.E.4 refresh.
- Record the policy review in PROVIDER_RESEARCH.md.

### PM10-009 (Low): the Google consent decision is right but incompletely recorded
**Where:** D-070, A-039 (unchanged text), OPERATIONS (unchanged), D-065 (separate Google Cloud project for rehearsal and dry-run), D-047 (separate local authorisation).
**Gaps:**
- D-070 says "A-039 is treated as verified by Google's documentation". The documentation verifies the **Testing** 7-day expiry. It does not show that a production-unverified token lasts. Tokens still lapse after 6 months unused (if YouTube is paused) and when more than 100 live refresh tokens exist per account per client.
- The separate rehearsal or dry-run project needs its own consent screen set "In production". Otherwise its tokens expire after 7 days in the middle of rehearsal. It also has its own 100-user cap.
- The OPERATIONS entry asked for by PM7-007 is missing.

**Minimal fix:**
- Rewrite A-039 as "Testing tokens expire in 7 days (verified, Google Cloud Help 15549945, 2026-11-07). Production-unverified tokens expire on 6 months' disuse or past 100 live tokens per client; otherwise no expiry is documented."
- Add an OPERATIONS line: production status for both projects, warning click-through, the 100-user lifetime cap per project, and reauthorise with `prompt=consent` (PM7-020).

### PM10-010 (Medium): the fixes were not propagated, so the working documents still contradict them, and the checker cannot see it
**Where and what:**
- **PLAN.md:** the goal ("weekly Sunday 03:00 UTC"; "master + six genre playlists and Recently Added on TIDAL and YouTube"); S-000a (A-041 not first, no consent decision, no collection-size and backlog projection); S-004 (no D-067); S-005 and S-008 (no daily cron, quota ledger or dequeue cap); Blockers ("found 1 Critical and 5 High … not yet fixed").
- **OPERATIONS:** "Sunday 03:00 UTC + manual"; no daily YouTube cadence, backlog ETA or Google consent operations.
- **ASSUMPTIONS:** A-004 is weekly only. A-039 and A-040 still say "weekly job" and "search at 100" units. A-025 still calls YouTube capacity "moot".
- **GATES:** G-001 is still "DECIDED … YouTube Music removed", yet D-066 records the TIDAL value decision "at G-001" (and PM7-012 asked for a G-001 re-decision for the Data API). G-002a still requires a full "redacted dry-run diff", which contradicts D-065's sample.
- **DECISIONS:** D-063 still says "spread over several days" (PM7-001 asked for the computed figure). D-064 says that if A-041 fails the plan "returns to the owner", while D-066 says "nothing else changes". D-026, D-024 and D-031 carry no "[R10] amended by" marks.
- **TEST_PLAN:** T-055, T-057, T-059 and T-072 contradict D-068, D-069, D-070 and D-067. Only T-074 was amended, and it is mapped to S-002 only in TRACEABILITY, although its new cases belong to S-005 and S-008. D-065..D-070 appear in no TRACEABILITY row.
- **Process:** the frozen manifest was re-hashed, but D-036's "owner approval recorded here" for amending a frozen test is recorded only in AMENDMENTS, not in DECISIONS.

**Failure scenario:** S-000b writes red tests from TEST_PLAN, which still says "missing credentials fatal" and "first-run cap for empty-ledger targets". The implementer builds a weekly cron from OPERATIONS and PLAN, and the D-065..D-070 behaviour is lost or contradicted by frozen tests.

**Minimal fix:** one propagation commit.
- Amend T-055, T-057, T-059 and T-072, with the owner's approval recorded in DECISIONS.
- Update the PLAN goal, S-000a, S-004, S-005, S-008 and Blockers; OPERATIONS; A-004, A-025, A-039 and A-040; and G-001 and G-002a.
- Add "[R10]" marks to D-024, D-026, D-031, D-063 and D-064, and add TRACEABILITY rows.
- Add "Sunday 03:00 UTC + manual" and "several days" to the checker's stale-phrase list.

## Resolution of the round-7 findings

| Round-7 finding | Status | Reason |
|---|---|---|
| PM7-001 (Critical, weekly cadence cannot drain the backlog) | **RESOLVED** | A daily cron gives about 196 inserts a day, about 20 releases a day master-only, so a first sync of about 500 releases takes about 4 weeks. The residual is per-day accounting and the cron mechanics (PM10-002) and stale weekly wording (PM10-010). |
| PM7-002 (High, TIDAL probably unusable free) | **PARTIAL** | YouTube-first with TIDAL optional is right, but the single-master release contradicts D-015, D-023 and D-040 (PM10-001), cannot hold a large collection (PM10-003), and PLAN S-000a does not put A-041 first. |
| PM7-003 (High, no workable YouTube match rule) | **PARTIAL** | The year waiver removes "pending for ever", but the search is unspecified, recall is unproven with no early probe, and T-072 still contradicts the waiver (PM10-005). |
| PM7-004 (High, alarm fatigue during the backlog) | **PARTIAL** | The backlog metric is undefined: it gives steady-state false alarms or a masked never-draining backlog; there is no ETA alarm, the threshold is 8 days for a daily provider, and T-055 is unchanged (PM10-004). |
| PM7-005 (High, breaker against the queue) | **RESOLVED** (Medium residual) | Draining no longer trips the breaker. When an entry leaves the queue is undefined, and T_rel = 40 makes the breaker inert for YouTube (PM10-007). |
| PM7-006 (High, exit codes against provider isolation) | **PARTIAL** | The two-provider case is fixed, but in the planned YouTube-only release any YouTube failure becomes exit 1, so progress and REAUTH NEEDED are not committed. D-068 and D-070 conflict, and T-059 is unchanged (PM10-006). |
| PM7-007 (Medium, Google consent) | **PARTIAL** | The decision is right. A-039 is overstated as verified, the rehearsal project's status is not set, and the OPERATIONS entry is missing (PM10-009). |
| PM7-008 (Medium, two quota buckets, shared non-production quota) | **RESOLVED** in DECISIONS, stale elsewhere | D-065 matches Google's 2026-11-03 quota page. A-040 and G-002a were not updated (PM10-010), and per-day accounting across runs is missing (PM10-002). |

## Findings table

| ID | Severity | One line |
|---|---|---|
| PM10-001 | High | A master-only YouTube release contradicts "configured = all eight targets", the D-023 preflight and frozen tests T-019, T-051 and T-069; enlarging the target set later has no gate |
| PM10-002 | Medium | The quota budget is per run, not per Pacific day; two crons in one sync.yml are under-specified and can collide or cancel under the one-pending rule |
| PM10-003 | High (conditional on A-028) | One master playlist with a 5,000-item cap (secondary source) holds about 500 releases; a larger collection stalls release 1 |
| PM10-004 | Medium | "Progressing (quota)" rests on an undefined backlog: steady-state false alarms or a masked never-draining backlog; no ETA alarm; 8-day STALE for a daily provider |
| PM10-005 | High | The D-067 search is unspecified (type, channel, K_search), album-playlist discoverability is unverified, uniqueness fails on duplicate albums, and there is no recall probe before the build |
| PM10-006 | Medium | YouTube-only: D-070 makes any YouTube failure exit 1, so the commit job drops verified progress and REAUTH NEEDED; D-068 and D-070 conflict; T-059 is unchanged |
| PM10-007 | Medium | Dequeue semantics undefined (a release can be lost); T_rel = 40 × dequeued is above the insert budget, so the breaker is inert; T-057 is unchanged |
| PM10-008 | Medium | Queued YouTube match data is kept beyond the 30-day limit of the API policies, and G-002a reuses it |
| PM10-009 | Low | A-039 is overstated as verified; the rehearsal project's consent status, the 6-month and 100-token invalidations and the OPERATIONS entry are missing |
| PM10-010 | Medium | Fixes not propagated to PLAN, OPERATIONS, GATES, ASSUMPTIONS, T-055, T-057, T-059, T-072 and TRACEABILITY; the checker passes regardless |

**Totals:** Critical 0, High 3, Medium 6, Low 1.

## Convergence verdict

**NOT CONVERGED, but close.** After excluding the accepted items (R-043, A-030, the Spotify and Apple deferral, D-062), there are **0 Critical** and **3 High** residuals:
- PM10-001 is a definitional contradiction with a one-decision fix.
- PM10-003 is conditional on the collection size, which S-000a can settle in an hour.
- PM10-005 is the only High that needs evidence rather than wording: a 30-release manual probe of the D-067 search path.

Round 7's Critical is resolved and its five Highs are resolved or reduced. None of the residuals needs new architecture. They need:
- a per-provider target set (PM10-001);
- a per-Pacific-day quota ledger (PM10-002);
- a precise per-target progress metric with an ETA alarm (PM10-004);
- "exit 1 only if nothing was written" (PM10-006);
- a dequeue rule (PM10-007);
- one propagation commit (PM10-010);
- two S-000a measurements: collection size against playlist capacity, and the D-067 recall probe.

If those are applied, and if the probe and the collection count come back favourably, a targeted re-check (not a full round) should be enough to reach 0 Critical/High. If the probe shows low recall, release 1 has no workable matching path and the decision goes back to the owner, as PM7-018 recommended. Running the S-000a probes before any further plan amendment remains the highest-value next step.

## Summary

D-065..D-070 are sound in intent and fix the core of round 7:
- daily pacing makes a first YouTube sync of about 500 releases finish in about 4 weeks master-only;
- the two quota buckets match Google's 2026-11-03 page;
- the breaker no longer trips on draining;
- cross-provider exit isolation is defined;
- the Google consent choice is correct.

The fixes were applied as six terse decisions without propagating them, and without defining their key quantities. As a result:
- the minimal single-master release is illegal under D-015, D-023 and D-040 and three frozen tests;
- the budget is per run instead of per day;
- "backlog shrank" and "dequeued" are undefined;
- the YouTube-only exit-1 path loses progress and hides REAUTH NEEDED;
- the matching rule's search is unspecified and its recall is unproven;
- one master playlist may not hold the collection;
- queued match data can break YouTube's 30-day storage rule.

There are three High findings, so convergence is not met. All are cheap to close, and two depend on S-000a measurements rather than more planning.
