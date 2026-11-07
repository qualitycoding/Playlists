# Independent adversarial review — Discogs playlist sync plan

- **Reviewer:** fresh-context independent subagent (model opus). I did not write the plan.
- **Date:** 2026-11-07
- **Plan commit:** 768df4b576e5d1cc9e0ee11e4f68b498c42476ad. I could not check this commit myself because git commands were not allowed. The working tree was reviewed as found.
- **Files read, before the existing reviews:** plan/{PLAN,DECISIONS,GATES,OPERATIONS,ASSUMPTIONS,TRACEABILITY,CI-MATRIX,ENVIRONMENT,PROFILE,ADDENDUM-V3.9-GAP}.md; tests/{TEST_PLAN.md,test_sync.py,FROZEN_MANIFEST.sha256}; sync_playlists.py; config.py; server.ts (grep, plus lines 190–600); src/App.tsx (lines 50–240); src/lib/{firebaseConfig,exportZip}.ts; src/components/SpotifyTokenGeneratorModal.tsx (lines 60–100); scripts/*.py; .github/workflows/*.yml; .gitignore; .env.example (masked); requirements.txt; package.json; vite.config.ts; cache/; logs/; .checkpoints/state.json; research/claims.json; README.md; DEVIATIONS.md; EXECUTION_LOG.md; HANDOFF.md; ADDENDUM-V3.9-STATUS.md.
- **Files read afterwards (step 4):** reviews/{ADVERSARIAL_REVIEW,CODE_REVIEW,MUTATION}.md; premortem/*; lessons/; knowledge/ (headers only).
- **Commands run:**
  - `sha256sum -c tests/FROZEN_MANIFEST.sha256` → OK; `sha256sum tests/*`
  - a Python script that cross-checks T-IDs across TEST_PLAN, PLAN and TRACEABILITY
  - a shape-only JSON inspection of cache/, logs/ and .checkpoints/
  - a weekday check on the cache `synced_at` dates
  - a count of statuses in claims.json
  - `python3 -m pytest -q tests/test_sync.py` → 8 passed
  - a mutation probe on a copy in /tmp/mut that adds an unconditional state write in dry-run → still 8 passed
- Nothing was installed, nothing touched the network, and no credentials were used. Every secret-like value is masked in this report.

## 1. Exposure inventory: working tree as of today

| Artefact | What it holds | Assessment |
|---|---|---|
| `cache/collection_cache.json` | 3 release IDs with artist, album, genres, Spotify URIs, YT IDs and `synced_at` | Probably fabricated seed data. Every `synced_at` falls on a Thursday (2026-09-17/24, 10-01), but the cron runs on Sundays, and the same IDs are hard-coded in `src/App.tsx` and `src/lib/exportZip.ts`. Whether real collection rows exist in git history is **unverified** (git was not allowed). |
| `logs/unmatched.json` | 1 release row (artist, album, date) | Same seed pattern. |
| `src/lib/firebaseConfig.ts` | Firebase web config: apiKey, appId, project/bucket names, OAuth client ID (values masked here) | This is shipped in the Pages bundle. Firebase web keys are designed to be public, but nothing shows the key is restricted to an HTTP referrer, and D-016 lets it stay "unless justified". |
| `.env.example` | Placeholder values only | OK. |
| `.checkpoints/state.json`, `lessons/`, `knowledge/` | Planning-run metadata, plus the existence and HEAD SHAs of the private Lessons/knowledge repos | Copies are already committed to the product repo before G-003 (see AB-012). Low sensitivity. |
| `.gitignore` | Covers `.env*` and `headers_auth.json` | Does **not** cover Spotipy's default `.cache` token file (see AB-020). |
| `weekly_sync.yml` | Prints every release's artist and album, the Spotify user ID, and the Discogs `resp.text` | These end up in Actions logs (see AB-011). |

## 2. Breaks

Format for each break: attack → how it fails → which control it defeats → severity → evidence → fix.

**AB-001: Pagination drift and duplicate items (High; criterion 1).**
- **Attack:** the owner adds or deletes a record while the run is paging through `sort=date_added desc`.
- **How it fails:** a deletion shifts every later item up by one, so one release is silently skipped. An insertion duplicates one item across a page boundary. A 200 response with `releases: []` on page k < pages is accepted. Several copies of one release (different `instance_id`) are double-counted.
- **Control defeated:** T-001 only tests "all pages", and T-003 only separates an empty collection from an error. All four of these cases pass both tests.
- **Evidence:** `sync_playlists.py:100-109`.
- **Fix:** dedupe by `instance_id`. Assert that the number of unique items equals `pagination.items` on both the first and the last page. Re-fetch page 1 at the end and fail closed if the item count or top ID has changed. Treat an empty non-final page as an error. Add these cases to T-001 and T-002.

**AB-002: Unparseable Retry-After (Medium; criterion 1).**
- **How it fails:** `Retry-After` sent as an HTTP-date, or as junk, makes `int()` raise. The broad `except` then breaks out of the loop, and the run continues with partial data.
- **Control defeated:** T-004 says only "bounded Retry-After".
- **Evidence:** `:93`, `:111-113`.
- **Fix:** T-004 must cover HTTP-date, a missing header, a negative value, and a total-wait budget.

**AB-003: Every failure exits 0 (High; criterion 9).**
- **How it fails:** `sync()` always returns `None`. A missing `requests`, a Discogs error, and the Spotify `TypeError` (C-002) all print a warning and either skip or return, so the Actions run goes green with zero writes. A YT-only run then advances the shared cache, so Spotify is never retried.
- **Control defeated:** T-028 "no swallowed failures" has no exit-code contract. D-015 covers missing playlist IDs but not missing or invalid credentials.
- **Evidence:** `:37-56`, `:168-170`, `:297-301`.
- **Fix:** define an exit-code matrix (0 = all targets verified; 2 = partial; 1 = fatal; dry-run is distinct). A configured target whose credentials are missing must be a hard failure. Add this to T-028 and T-042.

**AB-004: Concurrent runs (High; criterion 3).**
- **How it fails:** the schedule and a manual dispatch overlap, or a dispatch is clicked twice. `weekly_sync.yml` has no `concurrency:`. Both runs read the same state and both add the same tracks. The second `git push` is rejected as non-fast-forward *after* its writes, so its ledger is lost.
- **Control defeated:** S-008's scope doesn't mention concurrency. D-009's add-only rule makes the duplicates permanent.
- **Fix:** add a `concurrency: {group: sync, cancel-in-progress: false}`, fetch/rebase and retry the state push, and add a test asserting the concurrency key (T-027).

**AB-005: Reconciliation is fooled by incomplete or aliased read-back (High; criteria 2 and 3).**
- **How it fails:** D-007 reads the remote playlist before inserting. Three ways this goes wrong:
  1. Paging the read fails at page 40 of 90. Without a check against the playlist's `total`, the missing tracks look absent and get re-added.
  2. Spotify track relinking, or YT returning the ATV/OMV counterpart `videoId`, means the read-back never contains the requested ID. The target never completes, and each week the track is re-added.
  3. Read-after-write lag makes a successful write look failed.
- **Control defeated:** T-014 and T-016 don't specify read completeness or identity aliasing. Whether relinking and the YT substitution actually happen is **unverified** against live APIs.
- **Fix:** check read-back completeness against `total` or `snapshot_id`. Map identity through `linked_from` or `setVideoId`. After N mismatches, quarantine the target rather than re-adding. Never insert without positive proof that the track is absent.

**AB-006: Duplicates within one run (High; criterion 3).**
- **How it fails:** two pressings of the same master, or an album plus a compilation, resolve to the same URIs in one run. The ledger is keyed by release, and T-016 only tests reruns, so the master playlist receives the same tracks twice.
- **Fix:** dedupe the batch by URI before writing, and add a test with two release IDs that share one master.

**AB-007: Recently Added validation is undefined (High; criterion 4).**
- **How it fails:** "top20/max100 validation" either means:
  - all 20 must resolve, in which case one vinyl-only release blocks updates for weeks, or
  - partial results are allowed, in which case 1 of 20 matched releases replaces the list with one album.

  On top of that, `[:100]` cuts mid-album, so a single 100-track box set fills the list. And nothing proves the snapshot was persisted *before* the replace.
- **Evidence:** `:273-288`; T-018 is one line.
- **Fix:** specify the rule exactly: take the 20 most recent *matched* releases, truncate only at whole-album boundaries, require a minimum fill, and persist the snapshot before replacing. T-018 should assert the order of calls.

**AB-008: Exact matching fails on most real data (High; criterion 5 passes trivially).**
- **How it fails:**
  - Discogs artist names carry "(2)" disambiguation suffixes and "*" name variations; "Various" never equals "Various Artists".
  - D-008's year check rejects every reissue (the release year is the pressing year).
  - Its track-count check rejects most vinyl/digital pairs.
  - Uniqueness is judged on a truncated result set (current `limit=1`), so a collision on result 11 passes as "unique".
  - Unicode handling is unspecified: NFC/NFD, `casefold` vs `lower`, and accent stripping that merges different artists.
  - Quotes in titles break the `album:"…"` query.

  Making everything unmatched satisfies criterion 5 and produces a useless system.
- **Fix:** write the normalisation spec into T-005 (suffix stripping, casefold, NFKC, rule for "Various"). Compare against the master's year, not the pressing year. Require K>1 search results with K stated. Add a recall floor to G-006 and the success criteria.

**AB-009: Migration legitimises old wrong matches (High; criteria 4 and 5).**
- **How it fails:** the legacy cache came from first-result fuzzy matching (`:127-135`). D-005's read-back confirms those wrong tracks really are in the playlist, so they get marked verified. D-009 then forbids removing them.
- **Fix:** re-run the new matcher over legacy rows during migration. Report any disagreements, and give the owner a G-004 path to approve removing them.

**AB-010: Gate evidence leaks collection data (High; criteria 7 and 8).**
- **How it fails:** GATES requires a committed `GATE-<id>.md`. G-002's dry-run diff and G-004's duplicate/migration report contain artist/album rows, and they go into the public repo. Separately, `.checkpoints/`, `lessons/` and `knowledge/` are already copied into the product repo, which sidesteps G-003's purpose.
- **Fix:** commit only redacted gate evidence (counts and hashes); keep the raw evidence in encrypted state or an Actions artifact with short retention. Move the store copies out of the product repo.

**AB-011: Collection rows leak via public Actions logs (Critical; criteria 7 and 8).**
- **How it fails:** for each release, the run logs `Processing: {artist} — {album}`, plus the Discogs `resp.text` on errors and "Connected to Spotify account: <id>". A public repo's Actions logs are world-readable, and encrypting state does nothing about this.
- **Control defeated:** criterion 7 is scoped to Pages and criterion 8 to state. T-045 scans for *secrets*, not collection rows.
- **Evidence:** `:52`, `:98`, `:193-214`. Repo visibility is **unverified**, but Pages on a free plan implies the repo is public.
- **Fix:** logs show counts only. Add a canary collection row to the fixtures and fail T-045 if it appears in logs, artifacts or dist. Add log redaction to OPERATIONS.

**AB-012: Gates can be bypassed (Critical; criterion 11).**
- **How it fails:** "requires committed GATE-<id>.md" is a file the implementing agent can write itself. Nothing ties it to the owner's identity.
- **Fix:** put live-write secrets in a GitHub Environment with the owner as required reviewer. CI should require each GATE file to be added in a commit by the owner, with a signed commit or PR approval, never by a bot.

**AB-013: G-002 depends on itself (High; criteria 10 and 11).**
- **How it fails:** G-002 needs "idempotency and rollback" evidence and a Pages smoke test *before* the first live write or deploy. But T-040 (live rehearsal) is explicitly "after G-002", and T-049/T-050 need production Pages. So the gate either deadlocks or gets rubber-stamped on mock evidence.
- **Fix:** split it. G-002a covers rehearsal on disposable private playlists plus a preview Pages environment; G-002b covers production.

**AB-014: Encryption is unspecified and untested (High; criterion 8).**
- **How it fails:** no T-ID covers a wrong or missing key, ciphertext tampering, nonce uniqueness, key rotation, or rollback. Reverting the state commit, or dispatching from an older branch, restores a valid older ciphertext that AEAD accepts.
  - Spotipy's refresh-token cache has to persist between ephemeral runners somehow, so a credential ends up in the repo state (encrypted), coupling key compromise to account takeover.
  - R-011 promises "KAT/rotation", but no test covers it.
- **Fix:** add tests T-051 to T-056: a wrong key fails before any write; a missing key fails with no plaintext fallback; a flipped bit is rejected; every write uses a fresh random nonce (or XChaCha); rotation is proven by a key-ID header and re-encryption; and a monotonic generation number in the AAD is checked against an Actions variable to catch rollback. Keep tokens out of committed state.

**AB-015: Branch dispatch defeats the gates (High; criteria 9 and 11).**
- **How it fails:** `workflow_dispatch` can run on any branch, and the secrets are repo-level, so unreviewed branch code (including this plan branch) can make live writes and commit its own state.
- **Fix:** move the secrets into an Environment limited to `main` with a required reviewer, and add a `github.ref == 'refs/heads/main'` guard. Add a test for both (T-027).

**AB-016: The YT secret is interpolated straight into shell (High; criteria 2 and 9).**
- **How it fails:** the workflow runs `echo "${{ secrets.YTMUSIC_AUTH_JSON }}" > headers_auth.json`.
  - The JSON's double quotes end the shell string, so the file is written as invalid JSON. YT init then fails and is silently skipped (`:69-71`).
  - `$`, backticks or `$(` inside cookie values get evaluated.
  - The setup script says to "encode" the file, but the workflow never decodes it.

  S-008 lists secrets-in-`if` but not this, even though OPERATIONS says "never interpolate".
- **Evidence:** `weekly_sync.yml:28-30`.
- **Fix:** pass the secret through `env:` and write it with `printf '%s'`, or base64-decode it. T-027 should fail if `${{ secrets.` appears inside any `run:`.

**AB-017: YT auth expiry or schema change looks like "unmatched" (High; criteria 2 and 5).**
- **How it fails:** `YTMusic(auth)` doesn't make an authenticated call. A ytmusicapi schema change raises `KeyError: browseId`, which is swallowed and the release recorded as unmatched, with no retry ever.
- **Fix:** before any write, probe with an authenticated read-only call. Use typed errors so `ProviderError` and `NoMatch` are distinct. Re-try unmatched releases periodically. Trip a circuit breaker when the unmatched rate spikes. Add these to T-022.

**AB-018: The status page freezes (High; criteria 7 and 9).**
- **How it fails:** two mechanisms stop the status from changing:
  - The sync commit carries `[skip ci]`, and a push made with GITHUB_TOKEN doesn't trigger workflows anyway, so `deploy-pages.yml` never redeploys the status. The last "success" stays up forever.
  - GitHub disables scheduled workflows after 60 days without repository activity. That happens if state moves out of the repo, or no commit is made on weeks with no change. The schedule then stops silently, and nothing fails.
- **Evidence:** `weekly_sync.yml:58`; `deploy-pages.yml:3-6`.
- **Fix:** deploy the status from the sync workflow itself, or through `workflow_run`. The dashboard should label status "stale" when it is older than 8 days. Add an external or keepalive check. Add staleness to T-032 and T-029.

**AB-019: Dry-run isn't side-effect-free (Medium; criterion 6).**
- **How it fails:** a Spotipy token refresh writes `.cache` (not gitignored) and may rotate the refresh token. A CI dry-run without secrets returns early and passes vacuously. A dry-run status could be published as a success.
- **Fix:** use an in-memory cache handler in dry-run. CI dry-run should run on recorded fixtures (T-039). Label dry-run status distinctly.

**AB-020: The frozen tests aren't frozen (Critical; criterion 10).**
- **How it fails:**
  - FROZEN_MANIFEST lists only `TEST_PLAN.md`, a two-line specification. `tests/test_sync.py` isn't in the manifest, and 0 of the 50 T-IDs exist as code, so the implementer will write the tests *after* the freeze.
  - The existing dry-run test is tautological. My mutation adding an unconditional cache and unmatched write in dry-run still passed 8/8, because the comment says the cache is checked but no assertion does it (`test_sync.py:123-124`).
  - `test_resolve_spotify_tracks_success` locks in the first-result behaviour that D-008 forbids (`:73-76`).
  - No CI step runs `sha256sum -c`, and amendments only need "refreeze", with no gate.
- **Fix:** write the executable red tests now and hash them into the manifest. CI should verify the manifest. Amending a frozen test should require owner approval. Delete or rewrite the contradicting tests.

**AB-021: Counts and cross-references are wrong (Medium; criteria 10 and 11).** Checked mechanically:
- PLAN says "Steps: 11", but there are 12 (S-000..S-009, S-RETRO, S-KNOW).
- PLAN says "Claims: verified 7, single-source 7", but claims.json has 8 and 6.
- TRACEABILITY maps tests to the wrong things:
  - T-039 (Actions dry-run fixture) → Spotify/YT writes
  - T-047 (runtime budget) → Cache/privacy
  - T-043 (interruption recovery) → Static dashboard (also in S-007)
  - T-041 (browser controls) → S-008 Actions
  - T-033 (override provenance) → S-007
- T-035 and T-043 duplicate each other.
- **No step and no traceability row cover T-037, 038, 040, 042, 044, 045, 046, 048, 049 or 050.** That includes the secret scan and the Pages smoke and rollback tests that criterion 10 names.
- Criteria 2, 3, 6, 8 and 9 have no traceability rows.
- The PLAN header says "Independent adversarial breaks: not run", yet reviews/ADVERSARIAL_REVIEW.md exists. It is a self-labelled stub.
- **Fix:** regenerate TRACEABILITY with one row per criterion, and make a CI script assert that every T-ID is mapped.

**AB-022: Supply chain (Medium; criterion 9).**
- **How it fails:** secrets and a token that will gain `contents:write` share a job with `pip install` of `>=` ranges and floating `@v4/@v5` tags. CI uses `ubuntu-latest` and Python 3.10–3.12, which contradicts D-022 and CI-MATRIX. T-036 and T-046 check vulnerabilities, not pinning.
- **Fix:** install with `--require-hashes`, pin actions to SHAs and assert this in T-027, and run the state commit in a separate job that holds no secrets.

**AB-023: The local Express server is open (Medium).**
- **How it fails:** it binds to `0.0.0.0` without auth (`server.ts:590`). `/api/config`, `/api/cache/reset` and `/api/spotify/exchange-token` are reachable from the LAN, and the Discogs token is accepted in the query string. D-016's "unless justified" has no gate.
- **Fix:** delete these routes, or bind to 127.0.0.1 with a CSRF token. Put any justification through G-002.

**AB-024: Provider capacity limits (Medium; criterion 2).** **Unverified:** YouTube playlists cap at 5,000 items, and Spotify's historical cap was 10,000. A large collection hits the cap and the master playlist never completes. Spotify's development-mode and endpoint changes since 2025 also need checking (D-017).
- **Fix:** add a capacity preflight and a test for the "target full" state.

**AB-025: Public playlists defeat the privacy goal (Medium; criteria 7 and 8).** The scope includes `playlist-modify-public`. If the master playlist is public, the whole collection is public no matter how state is encrypted.
- **Fix:** require private targets, or record that the owner accepts this at G-002.

**AB-026: Process documents contradict each other (Low).** ADDENDUM-V3.9-STATUS marks "mutation CI" and "independent plan review" as **pass**. That conflicts with D-014 (mutation testing opted out), A-020 (no independent reviewer) and premortem/ASSUMPTION_AUDIT. MUTATION.md proposes Mull, a C/C++ tool, and calls the repo TypeScript-primary, but the engine is Python.

**AB-027: Chunked position-0 inserts reverse order (Low).** When an album has more than 100 tracks, inserting chunk 2 at position 0 puts it above chunk 1 (`:225-227`). T-009 and T-010 don't check order across chunks.

## 3. Comparison with the existing reviews

**reviews/ADVERSARIAL_REVIEW.md** is a stub listing attack themes; it doesn't give failure sequences or fixes. It **missed:**
- AB-004 concurrency
- AB-006 duplicates within a run
- AB-008 Discogs naming and reissue years
- AB-009 migration legitimising wrong matches
- AB-010 gate evidence leaking
- AB-011 Actions-log leakage
- AB-012 gate bypass
- AB-013 G-002 circularity
- AB-015 branch dispatch
- AB-016 secret interpolation into shell
- AB-018 frozen status page and 60-day disablement
- AB-020 tautological tests and the hollow freeze
- AB-021 broken traceability

**reviews/CODE_REVIEW.md:** I agree with CR-001, 003, 004 and 007. Where I differ:
- **CR-002 (Critical public cache):** the files present today look like seed data (Thursday timestamps against a Sunday cron, and the same IDs hard-coded in the UI). As a description of *current* exposure, Critical is overstated, and history is unverified. Going forward it remains Critical, together with AB-011.
- **CR-005:** the consequence is understated. It is a *silent* skip with exit 0 that still advances the cache, not a crash.
- **CR-006:** secrets in an `if` is probably a workflow validation error, and therefore the likely cause of the 7 November failures (**unverified**). It also misses AB-016, which is equally severe.
- **CR-009 (Medium):** reading `os.environ` is not a defect in itself, so this should be Low.
- **CR-010 (Medium):** understated. It should be High because of the `0.0.0.0` bind with no auth.

**premortem:** the risk counts (3/8/6) are internally consistent. R-011 promises tests (KAT/rotation) that no T-ID provides.

## 4. Verdict

- **Counts:** Critical 3 (AB-011, AB-012, AB-020); High 15; Medium 7; Low 2. Total 27.
- **Success criteria not adequately protected as written:**
  - 1: drift and empty pages (AB-001, AB-002)
  - 2: read-back aliasing, capacity limits, silent skips (AB-003, AB-005, AB-017, AB-024)
  - 3: concurrency and duplicates within a run (AB-004, AB-006)
  - 4: Recently Added rule, migration (AB-007, AB-009)
  - 6: dry-run side effects (AB-019)
  - 7: logs, gate evidence, frozen status (AB-010, AB-011, AB-018)
  - 8: encryption untested, rollback (AB-014)
  - 9: exit codes, branch dispatch, schedule disablement (AB-003, AB-015, AB-018)
  - 10: hollow freeze, unmapped tests (AB-020, AB-021)
  - 11: bypassable and circular gates (AB-012, AB-013)
  - Criterion 5 holds on precision only; nothing protects recall (AB-008).
- **Can the plan honestly be called READY?** No. The **BLOCKED — HUMAN DECISION REQUIRED** status is accurate and must stay. The header counts need correcting (steps 12; claims 8/6).
- **Minimum changes before READY:**
  1. Implement the 50 tests (plus the encryption tests T-051 to T-056) as executable red tests, hash them, and make CI verify the manifest. Rewrite the tautological and contradicting tests.
  2. Make gates provable through a GitHub Environment with the owner as required reviewer, limited to `main`. Split G-002 into G-002a and G-002b.
  3. Add a concurrency group, an exit-code matrix, a rule against interpolating secrets into shell, SHA and hash pinning, and a state-commit job without secrets.
  4. Redact logs and gate evidence, backed by a canary-row scan.
  5. Specify the AEAD scheme, including rollback detection.
  6. Specify Discogs completeness checks, deduplication within a run, read-back completeness and aliasing, and the Recently Added fill/truncation rule.
  7. Specify matching normalisation with a recall floor, and re-validate legacy matches during migration.
  8. Add a staleness indicator and a guard against the 60-day schedule disablement.
  9. Regenerate TRACEABILITY with every T-ID mapped and a row for every criterion.
