# Pre-mortem round 5 (final permitted round): Discogs playlist synchroniser plan

- **Reviewer:** fresh-context independent subagent (model opus). I did not write the plan or any of its amendments.
- **Date:** 2026-11-07
- **Repository:** /home/claude/playlists at 94c4895 ("plan: relax D-027 for public collection and playlists"). The tree is clean and I made no changes.
- **Files read, in order:**
  1. plan/PLAN.md, plan/DECISIONS.md, plan/GATES.md, GATE-G-001.md, plan/OPERATIONS.md, plan/ASSUMPTIONS.md, plan/TRACEABILITY.md, plan/CI-MATRIX.md, plan/ENVIRONMENT.md, plan/PROFILE.md, tests/TEST_PLAN.md, premortem/RISK_REGISTER.md, plan/tools/check_plan_consistency.py, tests/FROZEN_MANIFEST.sha256.
  2. The legacy code: .github/workflows/{ci,deploy-pages,weekly_sync}.yml, requirements.txt, package.json, .gitignore, .env.example, config.py, metadata.json, logs/unmatched.json, cache/collection_cache.json (head only), vite.config.ts, index.html, src/ (by grep), sync_playlists.py (by grep), scripts/setup_spotify_auth.py.
  3. Only after my findings were written: plan/AMENDMENTS.md (R5, G-001 and privacy sections), premortem/round-4.md, premortem/INDEPENDENT_PREMORTEM_R4.md (narratives and §2), HANDOFF.md, EXECUTION_LOG.md. I consulted the earlier independent reports only through R4's adjudication table.
- **Commands run (all read-only):**
  - `python3 -I plan/tools/check_plan_consistency.py /home/claude/playlists`
  - `sha256sum tests/TEST_PLAN.md`
  - grep and ugrep searches for IDs and keywords
  - an inline `python3 -I` script that cross-checks the criterion rows against the test rows in TRACEABILITY
  - `git log --oneline`
- **"Unverified"** marks every claim that depends on GitHub or Spotify behaviour I could not test here (no network).

## 1. Failure narratives (six months after full implementation)

### High

**PM5-001: Every push to main wipes status.json, and the rollback counter wedges or fails open (High).**
- **Story:** The owner merges a dashboard fix. deploy-pages.yml fires on the push, runs `npm run build` and deploys `./dist`. That build has no status.json, or only a stale one.
  - On Sunday the engine reads the "previously deployed status.json over HTTPS" (D-035). It finds nothing and fails closed, every week, until the next successful status deploy, which can never happen because the run aborts first.
  - If the implementer instead treats "status.json missing" as "first run after G-002b", the counter becomes fail-open: anyone who redeploys Pages disables rollback detection.
  - Either way the dashboard shows nothing or STALE.
- **Root cause:** Two deployers publish the same site. D-030 makes them share a concurrency group, which serialises them but does not merge their content. No decision says where deploy-pages.yml gets status.json, where the sync deploy job gets its "prebuilt dashboard" (dist/ is git-ignored, and nothing says which artefact or run), or how the engine recognises "the first run after G-002b".
- **Controls:** D-030, D-031 and D-035, tested by T-055, T-056 and T-064. **Not sufficient.**
- **Amendment:**
  - Keep exactly one Pages deployer. Either delete deploy-pages.yml and have the sync workflow rebuild the site, or have deploy-pages.yml fetch the live status.json and include it unchanged.
  - Record the status counter in a committed file as well, written by the commit job.
  - Define "first run" as state generation 0 plus a recorded GATE-G-002b, never as "source missing".
  - T-055 adds "a code push leaves status.json and its counter unchanged". T-056 adds "missing status.json after the first run aborts".

**PM5-002: Branch protection rejects the bot's weekly state commit (High).**
- **Story:** S-008 turns on branch protection with required reviews and CODEOWNERS for main (D-028). The commit job pushes encrypted state to main with GITHUB_TOKEN, and the push is rejected because a protected branch requires a pull request (unverified for rulesets with an Actions bypass).
  - D-025 treats a rejected push as a red run that reconciles next time. The run goes red every week, and the state, ledger and generation never advance.
  - A rotated Spotify token is never saved, giving `invalid_grant` (if A-023 holds), and unknown rows accumulate.
- **Root cause:** D-028 protects all of main to protect `.github/workflows`, while D-030 and D-035 need an unattended writer on main. Branch protection cannot be scoped by path. Whether a ruleset can exempt GitHub Actions on a public repository is unverified.
- **Controls:** D-025, D-028, D-030 and T-030, T-058. **Not sufficient.** The contradiction is not stated anywhere.
- **Amendment:**
  - Keep the encrypted state on a dedicated `state` branch with no review rule but a ruleset that allows only the Actions bot to push (S-000a verifies this), or verify an Actions bypass in S-000a.
  - D-042's ref check stays on the workflow ref.
  - T-058 asserts that the protection covers main and the state branch is push-limited.

**PM5-003: Rehearsal state and secrets leak into production (High).**
- **Story:** At G-002a the owner fills the gate-rehearsal Environment with the disposable playlist IDs under the fixed secret names of D-040, such as SPOTIFY_ROCK_PLAYLIST_ID. T-040 runs on main, and the commit job commits encrypted state with (release, target) rows and confirmed-URI sets for "master", "rock" and so on.
  - For the first G-002b run the owner swaps those secrets to the real IDs. The engine loads the rehearsal state, finds the rehearsed releases "confirmed", and under D-034's never-re-add rule skips them on the real playlists.
  - It also inherits the rehearsal shrink baseline (D-024), the Recently Added snapshot and the first-run cap progress.
  - If real IDs are entered during rehearsal, D-023's privacy rule cannot fire: the engine has no rehearsal signal.
- **Root cause:**
  - The ledger key is "target", not playlist ID.
  - The state file is shared across stages.
  - The rehearsal/live mode is never defined as an input the engine can check.
- **Controls:** D-023, D-029, D-034, D-040 and T-040, T-051. **Not sufficient.**
- **Amendment:**
  - Key ledger rows and confirmed-URI sets by provider playlist ID.
  - Rehearsal uses its own state file and key, or the state is discarded and re-anchored at G-002b.
  - Add an explicit `mode` (rehearsal|live), bound to the Environment. In rehearsal mode every target must be private and differ from the recorded real-ID fingerprints. In live mode no target may be a known rehearsal ID.
  - T-051 and T-060 add these cases.

**PM5-004: The gate-evidence rule is impossible as written, and T-058 can never pass honestly (High, feasibility).**
- **Story:** D-028 and GATES require each GATE file to be "added through a PR approved by the owner account", and T-058 asserts it.
  - The agent runs as the owner account (R-043), so every PR it opens is authored by the owner. GitHub does not let an author approve their own PR (documented behaviour, unverified here).
  - The agent therefore merges with admin bypass or weakens T-058. Criterion 10 ("all frozen tests pass") or criterion 11 is then met only by dishonesty or not at all.
  - The same applies to the gate-rehearsal required reviewer. With "prevent self-review" on, the owner can never approve runs that the agent dispatched as the owner. With it off, the gate is one click by the same identity.
- **Root cause:** The R5 text records that the agent "can approve its own gate", but it keeps a test that presumes two identities.
- **Controls:** D-028, T-058, R-043. **Not sufficient** (self-contradictory).
- **Amendment:**
  - While R-043 stands, D-028 and GATES record the actual approval channel (for example "owner, in conversation, date") as G-001 already does.
  - T-058 drops the PR-approval and self-review assertions and lists them as "untestable under R-043".
  - Criterion 11 is reworded to "owner approval recorded", not "verified".

**PM5-005: A dry-run kills the live refresh token (High; depends on unverified A-023).**
- **Story:** The owner runs a local dry-run with the .env refresh token (D-042 allows only dry-runs locally), or dispatches an Actions dry-run.
  - Spotipy refreshes, and Spotify returns a new refresh token, invalidating the old one (unverified).
  - The dry-run may not mutate durable state (criterion 6, T-023), so the new token is dropped.
  - On Sunday both the secret and the state token are dead: `invalid_grant`, red runs and a reauth. The same happens to any read-only canary run outside the commit path.
- **Root cause:** D-035 makes the state the token's home, while criterion 6 forbids dry-runs from writing it. The two rules are never reconciled, and a local .env shares the production token.
- **Controls:** D-035, D-042 and T-023, T-053. **Not sufficient.**
- **Amendment:**
  - Measure rotation in S-002. If it occurs:
    - (a) dry-runs persist the token only, through the commit job, as a stated exception to criterion 6 with its own generation bump; or
    - (b) local dry-runs use a separate Spotify authorisation (a different refresh token) and never the production one.
  - T-023 and T-053 cover "dry-run refresh does not orphan the production token".

### Medium

**PM5-006: Live YouTube leftovers despite D-043 (Medium).**
- **Stale text:** D-030 still mandates the YouTube auth file, and T-064 (*not* deferred) asserts it, so it is vacuous or unpassable. D-036 still requires a YouTube probe.
- **No removal step:** nothing deletes setup_ytmusic_auth.py, `ytmusicapi`, or the YTMUSIC_* names in config.py and weekly_sync.yml. Worse, nothing deletes the YTMUSIC_AUTH_JSON secret or revokes the whole Google-account session it holds (D-038).
- **Amendment:**
  - S-000a deletes the YTMUSIC_* secrets, and the owner signs out the session that produced the headers.
  - S-007/S-008 delete the script, the dependency and the config entries.
  - T-064's clause becomes "no YouTube secret, file or step exists".
  - The checker flags YouTube text outside a [D-043]/[deferred] mark.
- **Register:** R-013 should stay Medium until the secret is revoked.

**PM5-007: Legacy residue that no decision covers (Medium).**
`@google/genai`, `GEMINI_API_KEY` in .env.example, metadata.json (AI Studio Gemini capability), the Firebase project and OAuth client (Drive scope), and the express/tsx/jszip dependencies are not covered. D-016 and D-039 cover the code only, not the cloud-side Firebase/OAuth client or the Gemini key. The browser token-exchange modal also means the Spotify client secret may have been typed into the deployed app. *Amend:* S-001 inventories these items, S-007 deletes them, and OPERATIONS adds "rotate the Spotify client secret; delete or restrict the Firebase OAuth client".

**PM5-008: T-066 fails on itself (Medium, untestable as written).** "No `listen(` anywhere in the repository" matches:
- DECISIONS.md D-039 and TEST_PLAN.md;
- INDEPENDENT_PREMORTEM_R4.md;
- the T-066 test file itself;
- node_modules/vite once `npm ci` runs in the checkout.

*Amend:* scope T-066 to tracked source files (`*.ts`, `*.tsx`, `*.py`, `*.js`) outside plan/, premortem/, reviews/ and tests/, with node_modules excluded, and use an AST or regex on code only.

**PM5-009: T-058 cannot run in CI, and the Environment switch is unspecified (Medium).**
Listing repository secrets, reviewers and branch rules needs an admin token, which CI must not hold (GITHUB_TOKEN cannot list secrets; unverified). And "the first G-002b run uses gate-rehearsal" while "the scheduled job references sync" leaves the switch undefined; an `environment:` expression would defeat T-058's static check.

*Amend:* classify T-058 as an operational check run with the owner's token, with its output attached to G-002a. Use a separate `rehearsal.yml` (workflow_dispatch only, gate-rehearsal); sync.yml hard-codes `sync`.

**PM5-010: gate-rehearsal is not main-only and keeps real secrets (Medium).** D-028 restricts only `sync` to main. gate-rehearsal holds the real secrets for the first G-002b run and is approved by the same account (R-043). A branch workflow can therefore request it. *Amend:* restrict both Environments to main, and clear the gate-rehearsal secrets after the first G-002b run.

**PM5-011: Signals that tests depend on are undefined (Medium).** "First run after G-002b" (D-035), the "reauth marker" (storage unspecified), the "token rotated" flag that lets commit run after exit 1 (needs a job output from an `if: always()` step) and the rehearsal/live mode have no defined mechanism, so T-053, T-056 and T-059 can be satisfied by any implementation. *Amend:* name each one: a state field, the `SPOTIFY_REAUTH_AT` Environment secret, the `rotated` job output, and the `mode` input.

**PM5-012: Deferred-test handling is informal (Medium).**
PLAN criterion 10 excludes deferred tests, but TRACEABILITY row 10 says "All 70 frozen tests". Nothing says how CI treats T-007, T-022 and half of T-063; S-002 lists T-022 unmarked; and the checker knows nothing about deferral, so any test could be deferred silently.

*Amend:* add a machine-readable deferred list to TEST_PLAN. The checker asserts that the list equals {T-007, T-022, T-063(YouTube part)}, that each deferred test has a skip marker citing D-043, and that no criterion relies only on deferred tests. Align TRACEABILITY row 10.

**PM5-013: S-000b red tests make main red (Medium, feasibility).**
Red tests committed before implementation keep CI red for weeks; with required checks this blocks merges and invites admin bypass (R-043). D-036 also says "before any source change", yet S-000b writes stubs first. *Amend:* mark red tests `xfail(strict=True)` by T-ID, unmarked as behaviour lands, with T-065 asserting the set only shrinks; reword D-036 as "stubs, tests, freeze".

**PM5-014: The checker misses real drift (Medium).** These are mechanical facts, detailed in §2:
- Manifest coverage scans only top-level tests/, so the S-002 recorded fixtures (D-036's second freeze point) are never verified.
- S/G/A IDs are not checked, and AMENDMENTS and RISK_REGISTER still cite the deleted step S-000.
- Criterion texts are not compared.
- Stale text: the register preamble says "R5 changes are not yet applied" while PLAN calls the residuals "after R5"; A-012 and OPERATIONS still forbid collection details; HANDOFF still lists "YT Music master".

*Amend:* recurse into tests/**, check every ID family, and fix the texts.

**PM5-015: Spotify contract drift (Medium, unverified).** Reported 2026 Web API changes for development-mode apps (renamed playlist-item endpoints, lower search limits) could break the Spotipy calls (D-017) and cap K. S-000a does not probe the endpoint contract. *Amend:* S-000a makes a read-only probe of every endpoint the engine uses, pins a matching Spotipy version, and caps K by the measured limit.

**PM5-016: The year rule fails open (Medium).**
- **Silent skip:** D-032 skips the master-year check "when the call is unavailable". Under a 429 storm on the bulk first run, precision drops silently, which is exactly when owner oversight is lowest.
- **Undefined case:** releases without a master (`master_id` 0, which is common) have no defined rule.

*Amend:* a skipped check leaves the release *pending* (retried next run, counted in the report), never matched. Releases with no master use the release year.

**PM5-017: The deploy job is not conditional on the commit (Medium).** D-031 orders "state commit precedes status deploy" but never says that deploy is skipped when the commit fails. A rejected push (D-025, and PM5-002 every week) followed by a deploy puts status ahead of state. Every later run then aborts until an owner re-anchor, which is PM4-004 again. *Amend:* `deploy: needs: commit, if: needs.commit.result == 'success'`, asserted statically by T-059.

**PM5-018: R-043's consequences are recorded too narrowly (Medium, honesty).**
D-028 says only that the agent "can approve its own gate and bypass branch protection". Under the owner's credential it can also dispatch the D-035 re-anchor and D-024 override with its own "logged reason", edit Environment secrets, reviewers and branch policies, re-enable the schedule, and record "owner approval" of frozen-test amendments (D-036). Every "owner-only" control is agent-executable, and the plan never says plainly that G-002a/b are procedural, not enforced.

*Amend:* enumerate these consequences in R-043, D-028 and GATES. State that gate evidence proves process, not identity.

### Low

**PM5-019: The Recently Added snapshot is durable only after the commit job (Low).** If the runner dies between replace and upload, the "persisted" snapshot is lost. *Amend:* upload the encrypted snapshot artefact before calling replace.

**PM5-020: The setup-script token path is unspecified (Low).** "Written to the secret or encrypted state" is the wrong path for local use. Writing the encrypted state locally is a durable mutation outside Actions (conflicting with D-042 and the generation counter). Writing a secret needs `gh secret set --env sync` from stdin with an admin token. *Amend:* state the stdin `gh secret set` route plus the reauth marker, and never write state locally.

**PM5-021: The D-027 relaxation rests on unchecked facts (Low).** A-030 says the collection and playlists are public but "not independently checked". *Amend:* S-000a verifies, read-only, Discogs collection visibility and each playlist's `public` flag, recording counts only.

## 2. Mechanical verification

- **Checker:** `check_plan_consistency.py` prints `tests=70 (unit 49, other 21) steps=13 decisions=43 risks=43 criteria=13`, then `OK`, and exits 0.
- **Manifest:** `sha256sum tests/TEST_PLAN.md` gives 4617247578da…1265ca934, which equals FROZEN_MANIFEST.sha256. The manifest lists only TEST_PLAN.md, and legacy tests/test_sync.py is allow-listed. The checker uses `iterdir()` with `is_file()`, so files in tests/fixtures/ or any subdirectory will never be checked (PM5-014).
- **Cited IDs:** every cited D, T, G, R and A ID exists, except D-900/D-901 in the legacy ADDENDUM (harmless). The deleted step **S-000** is still cited in AMENDMENTS (six rows), in register rows R-007, R-012, R-016, R-017, R-021, R-030 and R-034, and in PLAN's title. The checker does not check S-IDs.
- **Criteria against tests:** the TRACEABILITY criterion rows and test rows agree in both directions (my script). No criterion depends only on deferred tests: criterion 5 has 6 live tests besides T-007, and criterion 9 has 12 besides T-022.
- **YouTube text not covered by a D-043 mark:** D-030 (auth file), D-036 (probe), **T-064** (not deferred), HANDOFF line 1; harmless in D-034 and A-025. The checker misses all of these.

- **Register totals:** 43 rows, inherent 3/20/15/5 and residual 0/3/18/22. These equal the totals line and the PLAN header. The preamble contradicts the header on whether R5 is reflected (PM5-014).
- **Text contradictions the checker misses:** TRACEABILITY row 10 against PLAN criterion 10; A-012 and OPERATIONS against D-027; D-036 against the S-000b stubs; T-058 against R-043.

## 3. Round-4 High narratives

| Finding | Verdict | Reason |
|---|---|---|
| PM4-001 Environment reviewer blocks schedule | **PARTIAL** | The two-Environment split fixes the unattended schedule. It introduces rehearsal-to-production state and secret contamination (PM5-003), an undefined Environment switch and a T-058 that CI cannot run (PM5-009), and gate-rehearsal is not main-only (PM5-010). |
| PM4-002 agent indistinguishable (accepted, R-043) | **PARTIAL (honesty)** | The acceptance is recorded openly in D-028, R-043, GATE-G-001 and the PLAN header, which is good. It understates the consequences: every "owner-only" control (re-anchor, override, schedule re-enable, Environment edits, test-amendment approval) is agent-executable (PM5-018). T-058 still asserts an owner-approved PR, which cannot exist when the PR author is the owner (PM5-004). |
| PM4-003 branch guard, repository-level secrets | **PARTIAL** | All secrets are Environment-scoped and pull_request CI reads none. This closes the core. Open: gate-rehearsal is not main-only and holds real secrets (PM5-010), and the empty-secret-list assertion needs an admin token, not CI (PM5-009). |
| PM4-004 rollback counter wedges | **PARTIAL** | The order, source and re-anchor are now defined. A new wedge or fail-open path comes from deploy-pages.yml overwriting status.json and the undefined "first run" (PM5-001). Deploy is not conditioned on commit success (PM5-017). |
| PM4-005 exit 2 skips commit, token lost | **PARTIAL** | `if: always()` and the generation check are specified. The "token rotated after exit 1" signal is undefined (PM5-011), weekly push rejection by branch protection reopens the loss (PM5-002), and dry-runs can orphan the token (PM5-005). |
| PM4-006 raw evidence in public artefacts | **CLOSED** | Closed by the owner fact A-030; secrets and account data stay excluded, state artefact ciphertext. Residual Low (PM5-021, stale A-012). |
| PM4-010 reissue duplicates | **CLOSED** (for its scope) | A per-target, alias-aware confirmed-URI set with a Recently Added exemption, covered by T-060. The new adjacent defect is that the ledger is keyed by logical target, not playlist ID (PM5-003). |
| PM4-014 matching recall | **CLOSED** (spec), Medium residual | Track, year and Various rules, lookup budget and floor at G-002b stated. Residual: fail-open year check (PM5-016), unverified K cap (PM5-015), unmeasured constants. |

**Planner residual ratings that are too optimistic:**

| Risk | Planner | Mine | Reason |
|---|---|---|---|
| R-001 fake Pages success | Low | Medium | PM5-001 |
| R-007 workflow failure | Medium | **High** | PM5-002 |
| R-011 encryption/counter | Medium | **High** | PM5-001, PM5-017 |
| R-013 YouTube account risk | Low | Medium | Secret not revoked (PM5-006) |
| R-016 controls mis-mapped | Low | Medium | PM5-012, PM5-014 |
| R-018 target collision | Low | Medium | PM5-003 |
| R-023 token persistence | Medium | **High** | PM5-005, PM5-002 |
| R-026 read-back identity | Medium | **High** | PM5-003 |
| R-035 dry-run side effects | Low | Medium | PM5-005 |
| R-041 status deploy race | Medium | **High** | PM5-001 |

R-020 (High) and R-043 (High, accepted) are honestly rated.

## 4. Verdict

- **My PM5 findings (21):** Critical 0, **High 5** (PM5-001 status overwrite and counter, PM5-002 branch protection against the state commit, PM5-003 rehearsal contamination, PM5-004 an impossible gate-evidence test, PM5-005 a dry-run orphaning the token), Medium 13, Low 3.
- **Convergence criterion** (0 Critical/High residual after mitigation, excluding owner-only and already accepted decisions): **NOT met.** None of the 5 Highs is an owner-only decision or the accepted R-043 itself. PM5-004 is a consequence of R-043 that the plan records wrongly, not the acceptance. All five are fixable by plan amendment. PM5-005's severity depends on unverified A-023.
- **Remaining amendments needed:**
  1. One Pages deployer. The status counter is also committed, and "first run" is defined as generation 0 plus a recorded G-002b. Deploy runs `needs: commit` with success (PM5-001, PM5-017).
  2. State on a push-restricted `state` branch, or an Actions bypass verified in S-000a (PM5-002).
  3. Ledger keyed by playlist ID; separate or reset rehearsal state; explicit `mode` with privacy and ID-fingerprint preflight; a separate rehearsal workflow; both Environments main-only, and gate-rehearsal secrets cleared after the first G-002b run (PM5-003, PM5-009, PM5-010).
  4. Rewrite D-028, GATES, T-058 and criterion 11 to record the actual approval channel under R-043, and list every agent-executable "owner-only" control in R-043 (PM5-004, PM5-018).
  5. Measure token rotation in S-002, and adopt dry-run token persistence or a separate dry-run authorisation (PM5-005).
  6. YouTube cleanup and revocation of YTMUSIC_AUTH_JSON. Fix T-064, D-030 and D-036 (PM5-006).
  7. Fix T-066's scope, the deferred-test mechanism and TRACEABILITY row 10, xfail-strict red tests, the checker's recursion and ID families, and stale texts (PM5-008, PM5-012, PM5-013, PM5-014).
  8. Define the named signals (reauth marker, rotated output) and the pending rule for the year check (PM5-011, PM5-016).

  Items 1–5 are mandatory for convergence. Items 6–8 are Medium, but cheap.
- **Recommendation: BLOCKED — HUMAN DECISION REQUIRED.** This was the last permitted round, so the plan cannot converge by review. It could become READY for implementation only if all of the following hold:
  - (a) the owner directs amendments 1–5 to be applied, and the planner applies them together with 6–8;
  - (b) the checker, extended as in item 7, passes, and someone other than the planner mechanically confirms each amendment against this list;
  - (c) the owner explicitly accepts, as recorded decisions, the residual Highs R-020 and R-043 and any amendment they decline. Each must be named, not covered by a blanket acceptance;
  - (d) S-000a's probes of A-022, A-023, A-029, branch-protection behaviour and the Spotify contract are completed before S-001. Any falsification returns the plan to the owner.
