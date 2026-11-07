# Independent pre-mortem: Discogs playlist synchroniser plan

- **Reviewer:** fresh-context independent subagent (model opus)
- **Date:** 2026-11-07
- **Plan commit:** 768df4b576e5d1cc9e0ee11e4f68b498c42476ad
- **Files read, before any comparison:** plan/PLAN.md, DECISIONS.md, ASSUMPTIONS.md, GATES.md, OPERATIONS.md, ENVIRONMENT.md, CI-MATRIX.md, TRACEABILITY.md, PROFILE.md, ADDENDUM-V3.9-GAP.md; tests/TEST_PLAN.md, tests/test_sync.py, tests/FROZEN_MANIFEST.sha256; sync_playlists.py, config.py, server.ts (scanned), src/App.tsx (scanned), src/types.ts, src/lib/firebaseConfig.ts, src/components/SpotifyTokenGeneratorModal.tsx (scanned), scripts/*.py, .github/workflows/{ci,deploy-pages,weekly_sync}.yml, cache/collection_cache.json, logs/unmatched.json, metadata.json, .gitignore, .env.example, requirements.txt, package.json.
- **Files read only after step 2:** premortem/RISK_REGISTER.md, round-1.md, round-2.md. I did not read reviews/* or research/*.
- **Not done:** no git commands and no access to live services. Anything I say about external-service behaviour is marked *(unverified)*.

## 1. Failure narratives (six months after the plan was fully implemented)

Ratings use L = likelihood and I = impact. Sev is the residual severity with the plan's controls as written.

**PM-001 — Recently Added replace wipes the master or a genre playlist.** A secret is pasted twice, so `SPOTIFY_RECENTLY_ADDED_PLAYLIST_ID` equals the master or a genre ID. The guarded replace passes the top-20/max-100 check and overwrites a list with thousands of tracks. Add-only lists are "not rolled back" (OPERATIONS), and only Recently Added has a snapshot. The current code already shows this hazard: in server.ts the default Hip-Hop ID and the default Recently Added ID are the same (`37i9dQZF1DX0XUsuxWHRQd`), and all of those defaults are third-party editorial playlist IDs.
- *Root cause:* D-015 checks only that IDs are present. Nothing checks that the nine IDs are distinct, or who owns them.
- *Ratings:* L Low–Med, I Critical, **Sev High**.
- *Control:* D-010/T-018/T-019. Not sufficient.
- *Amend:* in S-005, add a preflight that runs before any write and checks:
  - all target IDs are pairwise distinct;
  - each playlist is owned by the authenticated user;
  - Recently Added does not equal any add-only ID;
  - the remote Recently Added holds no more than 100 items, otherwise it is not the Recently Added list and the run aborts.
  Add a new test T-051 and a decision D-023.

**PM-002 — The collection leaks through public Actions logs and artifacts.** State is encrypted (D-004), but every run prints "Processing: artist — album" and the unmatched rows to the job log. In a public repository those logs are readable by anyone. A-012 and D-003 restrict only the *status* output. T-045 scans for secrets, and collection rows are not secrets.
- *Ratings:* L High, I High, **Sev High**.
- *Control:* A-012/T-045. Not sufficient.
- *Amend:* in OPERATIONS, allow only counts and hashed release IDs in logs and artifacts. Add T-052: run the fixture pipeline, capture stdout/stderr and the artifacts, and assert that no fixture artist or title string appears.

**PM-003 — The Spotify refresh token stops working weeks after G-002.** D-013 says "verified Spotipy token cache", but Actions runners are ephemeral and the plan never says where that cache lives. If Spotify returns a rotated refresh token *(unverified for the authorisation-code flow)*, it is thrown away and the next run hits `invalid_grant`. The other ways to keep it each have a cost:
- the token cache gets committed (T-030 might catch this);
- the workflow needs a PAT that can write secrets, which breaks D-020.
- *Ratings:* L Med, I High, **Sev High**.
- *Control:* T-020/T-021 detect the failure but do not prevent it.
- *Amend:* S-002 must name one persistence mechanism (recommended: the rotated token inside the AEAD state), turn the rotation behaviour into a verified claim, and add T-053 (a rotated token is persisted, and the old token is not reused).

**PM-004 — Concurrent runs create duplicates.** The owner presses "Run workflow" while the Sunday run is still going. Both reconcile membership, both insert, and one `git push` is rejected, so its ledger is lost. weekly_sync.yml has no `concurrency:` group, and the plan does not mention concurrency. T-016 tests only a serial rerun.
- *Ratings:* L Med, I High (permanent duplicates on add-only lists), **Sev High**.
- *Control:* none.
- *Amend:* S-008 adds `concurrency: {group: sync, cancel-in-progress: false}` and T-027 asserts it. A rejected push makes the run fail red. Add T-054 (two interleaved runs against a fake provider leave zero duplicates).

**PM-005 — Silent staleness.** The collection does not change for two months, so nothing new is committed. GitHub disables scheduled workflows in public repositories after 60 days without activity *(documented behaviour; whether bot commits count as activity is unverified)*. Separately, any status JSON pushed with `GITHUB_TOKEN` and `[skip ci]` does not trigger deploy-pages.yml. The dashboard keeps showing the last "success" indefinitely.
- *Ratings:* L Med–High, I Med–High, **Sev High**.
- *Control:* T-032 (provenance) and T-049. Neither checks how old the status is.
- *Amend:*
  - S-007 must specify how status reaches the page: either a client-side read of the Actions runs API, or a deploy step inside the sync workflow.
  - The page shows STALE when the last success is more than 8 days old.
  - Add T-055.
  - OPERATIONS adds a monthly check that the schedule is still enabled.

**PM-006 — Matching recall collapses while every test stays green.** Exact unique artist/title matching plus edition/year/track conflict rejection (D-008) rejects most real vinyl. The causes:
- Discogs names carry disambiguators such as "Artist (2)" and name variations ending in "\*";
- compilations are credited to "Various";
- titles carry suffixes such as "(Picture Disc Edition)" (see logs/unmatched.json);
- the Discogs year is the *pressing* year (for example a 2015 reissue), not the original release year;
- streaming albums add bonus tracks.

The unmatched list grows to most of the collection. "Ambiguous remains unmatched" is satisfied trivially by matching nothing.
- *Ratings:* L High, I Med (the product loses its purpose), **Sev High**.
- *Control:* T-005..T-009 and G-006. G-006 governs *expansion* only, and no recall floor exists.
- *Amend:*
  - Build a labelled, private fixture from the owner's collection and report precision **and** recall before G-002.
  - D-008 must spell out normalisation: strip `(\d+)` suffixes, handle name variations and Various, and compare against the master-release year rather than the pressing year.
  - The run reports the change in the unmatched count.

**PM-007 — Recently Added never updates.** "Full top20 validation" (D-010) can be read as "all 20 must be matched". Any vinyl-only release in the top 20 then blocks the replace every week.
- *Ratings:* L Med, I Med, **Sev Medium**.
- *Amend:* D-010 defines the semantics:
  - matched releases among the 20 newest are used, and unmatched ones are skipped and reported;
  - order is newest first;
  - truncation to 100 keeps whole albums, newest first.
  T-018 gets cases for "some unmatched" and "more than 100 tracks".

**PM-008 — Idempotency keyed on URIs drifts into duplicates.** Spotify track relinking or re-issued URIs, and YouTube videoId changes *(unverified behaviours)*, make a track look absent on read-back. It is re-added to an add-only list, where it can never be rolled back.
- *Ratings:* L Med, I Med, **Sev Medium**.
- *Amend:* the ledger records completion per (release, target). Once a read-back has confirmed a release as added, it is never re-added automatically. Membership reconciliation is used only for rows in the "unknown" state. Add a relinked-URI fixture to T-016.

**PM-009 — One job holds every privilege.** The same job holds the provider secrets, `contents: write`, and dependencies installed from ranges (requirements.txt uses `>=`; actions use floating tags). A compromised package can steal the tokens and push to the repository.
- *Ratings:* L Low, I Critical, **Sev Medium** (pinning in S-000 reduces it).
- *Amend:* in S-008, the sync job is read-only and uploads the encrypted state. A separate commit job has `contents: write` and no provider secrets. Install with `pip --require-hashes` and `npm ci`. Add a T-027 assertion that this holds.

**PM-010 — Encryption has no test and no key lifecycle.** Success criterion 8 has no test ID and no row in TRACEABILITY. OPERATIONS says "decrypt/schema failure stops before writes", but no test covers it. D-004 names no algorithm or library, and no backup, rotation or loss procedure for the key. If the key is lost, the ledger is lost, and the plan then relies on reconciling with remote membership, which carries the PM-008 duplicate risk.
- *Ratings:* L Med, I High, **Sev High**.
- *Amend:*
  - D-004 names a pinned, audited AEAD (for example `cryptography`'s AESGCM or Fernet).
  - The owner keeps an offline copy of the key.
  - OPERATIONS documents rotation and recovery after key loss.
  - Add T-056: the committed bytes are not parseable JSON, a tampered or wrong-key file aborts before any write, and a known-answer test passes.

**PM-011 — Off-repository state evicted.** If "outside public repo" (D-004) is implemented with the Actions cache, entries unused for 7 days are evicted *(documented GitHub behaviour)*, which coincides exactly with a weekly cadence. Artifact retention can also expire.
- *Ratings:* L Low–Med, I High, **Sev Medium**.
- *Amend:* D-004 forbids the Actions cache as the source of truth. If artifacts are used, the retrieval of the previous artifact must be tested.

**PM-012 — The legacy cache is demo data.** cache/collection_cache.json holds three rows. App.tsx hard-codes the same three IDs as a fallback, and metadata.json shows an AI Studio template. G-004 treats those rows as genuine history.
- *Ratings:* L Med, I Low, **Sev Low**.
- *Amend:* S-006 first establishes where the cache came from. Rows that are not in the live Discogs collection are dropped and never written.

**PM-013 — Tests pass while provider contracts drift.** Every provider test is mocked with mocks written by the authors, and the only live check is T-040, run once at G-002. Field or endpoint changes in Spotify, ytmusicapi or Discogs surface only in production. An author-written mock of "membership" may also deduplicate, whereas real playlists accept duplicates.
- *Ratings:* L Med–High, I Med, **Sev Medium**.
- *Amend:*
  - Use recorded, sanitised read-only response fixtures.
  - Use a fake provider that accepts duplicates and enforces the 100-item limit.
  - Every live run starts with a read-only schema canary that fails closed.

**PM-014 — The old workflow keeps firing during the rebuild.** weekly_sync.yml stays scheduled throughout implementation. If a partial fix lands early (for example the `if: secrets` correction), the legacy code runs. That code swallows exceptions and inserts at position 0 without any ledger, so it adds duplicates before G-004.
- *Ratings:* L Low–Med, I High, **Sev Medium**.
- *Amend:* S-000 disables the scheduled workflow, and it is re-enabled only after G-002. T-029 verifies the re-enabling.

**PM-015 — No guard after G-002.** G-002 is a one-off approval. Later unsupervised runs have no limit on how many tracks they add, and nothing detects a remote add-only list *shrinking*, which would point to a wrong ID or outside tampering.
- *Ratings:* L Med, I High, **Sev High**.
- *Amend:* add D-024, a circuit breaker:
  - abort if additions exceed (new releases × 40), or if any add-only target's remote count has fallen since the last run;
  - a manual-dispatch input can override the abort.
  Add T-057.

**PM-016 — The privacy remedy conflicts with free hosting.** G-005 lists "visibility change". A private repository loses free Pages *(GitHub pricing, unverified as of today)*, which contradicts "no paid hosting". Public history and forks keep the old rows regardless.
- *Ratings:* L Med, I Med, **Sev Medium**.
- *Amend:* G-005 evidence must list the consequences of each option, and should consider a separate private state repository.

**PM-017 — The first full run exceeds its budget.** The collection size has never been measured (A-014, and A-002 gives no count). The first run performs migration plus a search and a tracks call per release on two providers. T-047 uses fixtures only.
- *Ratings:* L Med, I Low–Med, **Sev Medium**.
- *Amend:* S-000 records the collection count (count only), and each run processes at most K releases with resumable progress.

**PM-018 — Traceability gaps and plan contradictions.**
- TRACEABILITY omits T-036..T-038 and T-040..T-050.
- Success criteria 6, 8, 9 and 10 have no rows.
- The Python version for the sync job is undecided: weekly_sync.yml uses 3.11, CI uses 3.10–3.12, and the local environment has 3.13.5.
- The PLAN header counts (Critical 3, High 8, Medium 6) do match the register, but only if the first figure in each register rating is read as severity. The register never says so.
- *Ratings:* L High, I Low, **Sev Low**.
- *Amend:* regenerate TRACEABILITY with a row for every criterion and every T-ID, and add a decision on the Python version.

**PM-019 — The rewrite starts before the cause of the failed runs is known.** The Nov 7 runs failed and ENVIRONMENT records the cause as unknown. Likely candidates are an invalid `if: ${{ secrets... }}` and the shell interpolation `echo "${{ secrets.YTMUSIC_AUTH_JSON }}"`, which also breaks on embedded quotes and is an injection vector.
- *Control:* S-008/T-027 fix the probable causes.
- *Ratings:* **Sev Low**.
- *Amend:* record the actual cause in S-000.

**PM-020 — Accepting ytmusicapi exposes a whole Google account.** The browser-header credential in an Actions secret is a session for the full Google account. G-001 lets the owner "accept" this without stating the blast radius. Account action under the terms of service is possible *(unverified)*.
- *Ratings:* L Med, I High, **Sev High** until G-001 is resolved.
- *Amend:* G-001 evidence must state the blast radius and require a dedicated or Brand account, or else removal.

## 2. Comparison with premortem/RISK_REGISTER.md and rounds 1–2

**Quality of the register.** The register has 17 one-line entries. The "X/Y" ratings are not labelled, so it is unclear which figure is likelihood and which is impact. There is no residual rating after mitigation, and most entries map to no test. round-1.md (266 bytes) and round-2.md (203 bytes) contain no actual failure narratives, and round-1 states "planner simulation only".

**Risks the register lacks entirely:** PM-001 (ID collision), PM-002 (log leakage), PM-003 (token persistence), PM-004 (concurrency), PM-006 (recall collapse), PM-007 (Recently Added deadlock), PM-009 (job privilege split), PM-011 (cache eviction), PM-012 (demo cache), PM-013 (contract drift), PM-014 (legacy schedule), PM-015 (circuit breaker), PM-016 (private repository versus Pages), PM-020 (blast radius).

**Risks the register covers only in part:** PM-005 against R-014, PM-008 against R-015, PM-010 against R-011, PM-017 against R-012, PM-018 against R-016.

**Ratings I would change:**
- **R-001 Critical → High before mitigation, Low after.** A fake dashboard misleads but loses no data, and removing it (T-025) is simple and verifiable.
- **R-003 Critical → High, and still open.** The register's control (encrypting state) leaves the log channel in PM-002 open.
- **R-010 High/High → Medium.** The exposure has already happened and a rewrite cannot recall forks. The real decision is PM-016.
- **R-011 Medium → High.** There is no test and no key lifecycle (PM-010).
- **R-014 Medium → High.** Silent staleness is the most likely way this product fails (PM-005).
- **R-009:** the rating is right, but the control misses PM-001.

**Risks I agree with as rated:** R-002, R-004, R-005, R-006, R-007, R-008 (the rating holds for precision, but recall is missing), R-012, R-013, R-017.

## 3. Verdict

**Residual counts after my independent review, with the plan's controls as written (20 risks):**
- **Critical:** 0. The register's three Critical risks are adequately controlled *on paper* by T-025, the per-target ledger and D-004, provided PM-002 and PM-010 are fixed.
- **High:** 9 (PM-001, 002, 003, 004, 005, 006, 010, 015, 020).
- **Medium:** 8 (PM-007, 008, 009, 011, 013, 014, 016, 017).
- **Low:** 3 (PM-012, 018, 019).

**Convergence criterion "0 Critical/High after mitigation": NOT met.** The plan itself records Critical/High risks and a BLOCKED status (PLAN.md, D-021). Nine High residuals have no sufficient control.

**What must change to meet it:**
1. Add decisions D-023 (target IDs distinct and owned), D-024 (write circuit breaker and shrink detection), a concrete AEAD and key lifecycle in D-004, the persistence of the rotated Spotify token in D-013, and concrete Recently Added semantics in D-010.
2. Change the workflow: a `concurrency` group, a split between the sync job and the commit job, logs that contain no collection rows, and the legacy schedule disabled until G-002.
3. Change the dashboard: specify how status gets to the page, and show STALE when the last success is more than 8 days old.
4. Change matching: a private labelled fixture with a recall floor recorded at G-002, plus the D-008 normalisation spec.
5. Change G-001 so that it records the blast radius and either a dedicated account or removal of YouTube Music.
6. Unfreeze TEST_PLAN.md, add T-051..T-057 (preflight IDs, log privacy, token rotation, concurrency, staleness, encryption, circuit breaker), red-verify them, refreeze, and update FROZEN_MANIFEST.sha256.
7. Regenerate TRACEABILITY so that every criterion and T-ID has a row, and label the rating fields in the register.
8. Rebuild RISK_REGISTER with explicit likelihood, impact, residual severity, control and test for each risk.

With items 1–7 applied, I would expect every High above to fall to Medium or Low. PM-020 falls only if G-001 resolves to removal or a dedicated account.
