# Pre-mortem round 4: amended Discogs playlist synchroniser plan

- **Reviewer:** fresh-context independent subagent (model opus). I did not write the plan or the R4 amendments.
- **Date:** 2026-11-07
- **Working tree:** /home/claude/playlists, with the R4 amendments uncommitted. Nothing was modified, installed or fetched.
- **Files read, in order:**
  1. plan/PLAN.md, DECISIONS.md, GATES.md, OPERATIONS.md, ASSUMPTIONS.md, CI-MATRIX.md, tests/TEST_PLAN.md, plan/TRACEABILITY.md, premortem/RISK_REGISTER.md, plan/ENVIRONMENT.md, plan/PROFILE.md, tests/FROZEN_MANIFEST.sha256
  2. sync_playlists.py, config.py, .github/workflows/{ci,deploy-pages,weekly_sync}.yml, .gitignore, .env.example, requirements.txt, package.json, the heads of cache/ and logs/, metadata.json, index.html
  3. tests/test_sync.py, server.ts (route list plus lines 1–30, 300–420 and 525–595), a grep of scripts/*.py, a grep of src/ for secrets
  4. plan/tools/check_plan_consistency.py, premortem/ASSUMPTION_AUDIT.md
  5. **Only after the narratives and the checks were written:** plan/AMENDMENTS.md, premortem/INDEPENDENT_PREMORTEM.md, reviews/INDEPENDENT_ADVERSARIAL_REVIEW.md

  I did not read premortem/round-1..3.md.
- **Commands run (all read-only):**
  - `ls`, `cat`, `sed`, `grep`
  - `git log --oneline`, `git log -- cache/collection_cache.json`, `git status --short`
  - `python3 -I plan/tools/check_plan_consistency.py /home/claude/playlists`, which returned OK
  - `sha256sum tests/TEST_PLAN.md`
  - `python3 -I /tmp/pm4/chk.py`, my own cross-reference checker, kept outside the repository
  - a count of claims.json
- **Unverified:** anything that depends on GitHub, Spotify, Discogs or YouTube behaviour is marked *(unverified)*. I made no network calls.

## 1. Failure narratives (six months after full implementation)

Each narrative gives the plan control meant to prevent the failure and whether it is sufficient.

**PM4-001: Environment required reviewers stop every scheduled run (High).** The weekly job pauses at 03:00 each Sunday waiting for the owner's approval. It runs only when the owner clicks, and otherwise times out *(documented GitHub behaviour, unverified here)*. As a result:
- the "unsupervised" runs that D-024 is built around never happen;
- the dashboard goes STALE within weeks;
- the owner either stops approving or removes the reviewer, and the second option dissolves the gate model.

D-028 requires the live-write secrets to sit in an Environment with the owner as required reviewer, while D-024, D-031 and A-004 assume an unattended weekly schedule. The two decisions contradict each other. Control: D-028, T-058. **Not sufficient.**

*Amend:* use two Environments:
- `gate-rehearsal`: a required reviewer, used only for G-002a and the first G-002b run;
- `sync`: restricted to deployment from main, no reviewer, holding the secrets only after G-002b is recorded.

Integrity after G-002b then rests on branch protection of main plus review of workflow-file changes. T-058 should assert the scheduled job references `sync`, not the reviewer Environment.

**PM4-002: Gate approval cannot be told apart from the agent (High).** ENVIRONMENT.md records that the implementing credential has admin and push rights on the repository. That gap shows up in three places:
- **Commit authorship:** D-028 ("added by a commit authored or approved by the owner") cannot tell the owner from an agent that uses the owner's token. Git author fields can be forged.
- **Environment approvals:** the REST pending-deployments endpoint can approve them with a reviewer's token *(unverified)*.
- **Frozen-test amendments:** D-036 records "owner approval recorded here" in DECISIONS.md, a file the agent edits.

Control: D-028, D-036, T-058. **Not sufficient**, because the property being tested is not checkable.

*Amend:*
- The agent runs under a separate identity, a fine-grained token or a GitHub App with no admin rights and no reviewer role.
- Gate files need commits signed with a key the agent's host never holds, or a PR approval by the owner account. Branch protection on main requires this.
- "Prevent self-review" is enabled.
- S-000 records the agent identity.

**PM4-003: The main-only guard can be edited away, and repository-level secrets stay exposed (High).** `workflow_dispatch` and same-repository `pull_request` runs execute the *branch's* copy of the workflow. A branch can delete the `github.ref == refs/heads/main` guard. D-028 moves only "live-write and deploy" secrets into the Environment. The state key, the HMAC key (inside the state) and the Discogs token can therefore stay repository-level, where a branch workflow can decrypt the state and print it. Decrypted plaintext is not masked in logs. Control: D-028, T-058 (it greps for the guard, which is the wrong property). **Not sufficient.**

*Amend:*
- Every secret moves to the main-only Environment, with no repository-level secrets.
- `pull_request` CI reads no secret.
- T-058 asserts that the repository-level secret list is empty *(the secret list is checked via the API, unverified)*, rather than checking that a guard string is present.

**PM4-004: The rollback counter wedges the system (High).** D-035 publishes the generation counter in the public status and checks state against it. Two orderings are possible, and both fail:
- **Status deployed before the state commit lands:** a rejected push (D-025) or a skipped commit job (PM4-005) leaves the published generation above the committed one. Every later run reports "rollback detected" and aborts forever.
- **Status deployed after the commit:** a crash between the two opens an undetected window.

The plan also never says where the engine reads the published counter (the Pages URL? the previous deployment?) or what happens when Pages is unreachable. No recovery path for a false positive exists. Control: D-035, T-056. **Not sufficient.**

*Amend:*
- Fix the order: commit state, then deploy status.
- The engine reads the counter from a defined source and fails closed when that source is unreachable.
- Define an owner-approved re-anchor procedure.
- T-056 adds the case "status ahead of state".

**PM4-005: Partial exit codes skip the commit job, and the rotated token is lost (High).** With D-026's exit 2 or 1, the sync job fails. Unless the steps carry `if: always()`, the encrypted-state artefact upload and the separate commit job (D-030) are skipped. The verified writes are then not recorded, so the next run reconciles them, which is acceptable. The Spotify refresh token rotated during that run, however, existed only in that state, so the next run hits `invalid_grant` *(if rotation happens, A-023)*. That re-opens PM-003. Control: D-026, D-030, D-035. **Not sufficient**, because the cross-job failure semantics are unspecified.

*Amend:*
- Upload and commit run on exit 0 or 2, and also on exit 1 once a token has rotated. The commit job checks the artefact's generation.
- T-053 and T-059 cover a "sync exits 2, state still committed" case.

**PM4-006: Raw evidence in a "short-retention artefact" is public (High).** D-027 and the GATES preamble allow raw evidence (artists, titles, dry-run diffs, duplicate reports) in a short-retention artefact. In a public repository, workflow artefacts can be downloaded by anyone with read access *(unverified)*. Retention limits only how long the window stays open. Control: D-027, T-052. **Not sufficient:** T-052 checks artefacts for the canary row, but D-027 explicitly permits raw evidence there, so the two contradict each other.

*Amend:* raw evidence goes only into the encrypted state, or into an artefact encrypted with the state key. T-052 asserts that every artefact is ciphertext.

**PM4-007: D-039 covers 3 of the 10 local server routes (Medium).** server.ts binds to 0.0.0.0 and still exposes:
- `/api/unmatched/resolve`, which writes arbitrary URIs into the ledger as "resolved_manually". This injects an override that bypasses T-033 provenance.
- `/api/discogs/collection`, which takes `token` in the query string.
- `/api/sync/run`.
- `/api/download-zip`, which bundles the cache and unmatched files.
- `/api/cache` and `/api/unmatched`.

Control: D-016, D-039, T-066. **Partial.**

*Amend:* delete server.ts and the `dev`/`start` scripts. Pages is static (D-002). T-066 asserts that no `listen(` exists anywhere in the repository.

**PM4-008: The owner's reauth path is broken (Medium).** D-013 relies on owner reauth, but scripts/setup_spotify_auth.py:
- uses Spotipy's default file cache, which writes `.cache` containing the refresh token into the repository root, and `.gitignore` does not list `.cache`;
- prints the token to the terminal;
- requests `playlist-modify-public`, against D-023;
- uses an `http://localhost` redirect, which Spotify no longer accepts for apps, requiring `127.0.0.1` *(unverified)*.

D-035's "no .cache file" applies to the engine only. Control: none for the scripts. **Not sufficient.**

*Amend:* D-035 also covers the setup script: in-memory cache, `127.0.0.1` loopback, reduced scopes, and the token written straight into the encrypted state or a secret. `.gitignore` gains `.cache*`. Add a test.

**PM4-009: Token precedence is undefined after reauth (Medium).** After the owner reauthorises and updates `SPOTIFY_REFRESH_TOKEN`, the encrypted state still holds the old rotated token. D-035 does not say which one wins. If the state wins, `invalid_grant` repeats forever. *Amend:* the newer of the two wins, by an issued-at stamp, or a reauth marker secret forces the secret to win. T-021 covers this.

**PM4-010: New releases that resolve to an already-synced album duplicate it (High).** The owner buys a second pressing, a reissue, or a box set containing an album already synced. The new release ID has no ledger row. D-034 reconciles only "unknown" rows, and D-025 deduplicates only *within* a batch, so the album's tracks are appended again to master and genre lists, which are add-only and never cleaned. For collectors this is a routine event. Control: D-025, D-034, T-060. **Not sufficient.**

*Amend:* keep a per-target set of confirmed provider URIs (alias-aware). Skip any URI already confirmed in the target by any release. T-060 adds a case where a new release shares an album with one synced earlier.

**PM4-011: The shrink breaker trips permanently on legitimate changes (Medium).** The breaker trips when the owner removes a track by hand, or when a provider drops unavailable items from playlist reads *(unverified)*. D-024 then aborts every scheduled run, and the override exists only on manual dispatch. Control: D-024, T-057. **Over-tight.**

*Amend:* after an override with a logged reason, set the baseline to the current remote count. Report shrinks of at most a stated number of items without aborting. T-057 covers re-anchoring.

**PM4-012: The private fixture conflicts with public CI and the freeze (Medium).**
- **Private fixture:** T-061 (precision and recall) needs a labelled fixture "from the owner's collection", which D-032 makes private. It cannot run in public CI or be committed (D-027), yet it is counted among the "66 frozen tests" in criterion 10.
- **Recorded fixtures:** D-036's recorded provider fixtures can only be captured with live read access (S-002). That comes after the S-000 freeze, so every recording needs an owner-approved amendment.

*Amend:*
- Split T-061 into a public synthetic test and an owner-run private report whose encrypted fixture is hashed.
- Define a second, batched freeze point at the end of S-002 for the recorded fixtures.

**PM4-013: S-000 is overloaded and partly infeasible (Medium).** S-000 now holds about 15 actions. Three of them conflict with each other or with other documents:
- **Red tests before interfaces:** it must write executable red tests for D-032, D-034 and D-035 before any interface exists. The rule "fail by assertion, not import error" then needs stub modules, which is a source change before the freeze.
- **Failed-run diagnosis:** it must diagnose the failed runs, although ENVIRONMENT.md says job details are unavailable. From the code, `if: ${{ secrets.YTMUSIC_AUTH_JSON != '' }}` is almost certainly a workflow-validation error, so diagnosis can be static.
- **CI replacement:** CI-MATRIX.md says S-000 replaces CI, but PLAN puts D-030 in S-008.

*Amend:* split S-000 into S-000a (probes, disabling the schedule, the diagnosis) and S-000b (an interface skeleton with `NotImplementedError` stubs, then the red tests and the full-file manifest). Make CI-MATRIX and PLAN agree on which step replaces CI.

**PM4-014: The D-032 matching rules still produce a recall collapse (High).** Five problems remain:
- D-032 keeps D-008's "track conflict" rejection, and vinyl and digital track lists routinely differ (AB-008's point stands).
- "Master release year" is compared with the provider's album date, which is often a remaster date *(unverified)*.
- The master year is not in the collection page's `basic_information` *(unverified)*, which means one extra Discogs call per release. The rate and runtime budgets (T-047, D-024 first-run cap) do not count that call.
- The "Various" rule is still unstated.
- K is unmeasured, and current search-limit caps are unverified.

The recall floor is assigned to both G-006 and G-002b. Control: D-032, T-061. **Partial.**

*Amend:*
- State the track rule: tolerate bonus or missing tracks up to a stated count or ratio.
- State the year rule: accept when the provider date is at or after the master year, or within a tolerance.
- Write out the Various rule.
- Budget the master lookups, or make the year check optional.
- Set the floor at G-002b only.

**PM4-015: Genre routing is undecided (Medium).** No decision governs GENRE_MAP. In the legacy code the Hip-Hop key derives to `SPOTIFY_HIP-HOP_PLAYLIST_ID`, while the workflow sets `SPOTIFY_HIP_HOP_PLAYLIST_ID`, so Hip-Hop is never written today. Some keywords are ambiguous: "Contemporary", "Trip Hop" listed under Hip-Hop, and "Disco" under Funk/Soul. D-026's "configured target" is not defined, so it is unclear whether an absent genre ID is fatal or skipped. No test covers routing. *Amend:* add a decision with an explicit map, multi-genre membership, the secret names, and a definition of "configured". Add a test.

**PM4-016: The concurrency group drops queued runs, and local runs bypass it (Medium).** GitHub keeps one pending run per group, and a newer queued run cancels the older pending one *(unverified)*. A manual dispatch can therefore silently cancel the Sunday run. Separately, A-003 still allows a local `.env` run, which no concurrency group covers, while D-001 says Actions is the only executor. *Amend:* the engine refuses live mode unless `GITHUB_ACTIONS` is set, the ref is main, and the expected Environment is present. Local runs are dry-run only. Document the pending-run behaviour.

**PM4-017: D-033 edge cases remain (Low).**
- A single matched release with more than 100 tracks fits no whole album. Whether that aborts or empties the list is undefined.
- With 1 of 20 matched, the list is replaced by one album; AB-007's minimum fill was not adopted.
- D-034's "never re-added" rule needs an explicit exemption for Recently Added.

*Amend:* state each rule and add cases to T-018.

**PM4-018: The D-023 checks rest on provider fields of uncertain reliability (Low).** These fields are the Spotify `public` flag, YouTube ownership via ytmusicapi, and the capacity limits (A-025). Dropping `playlist-modify-public` also forces a re-consent and reauth, which nobody has scheduled. *Amend:* schedule the reauth in S-002, and treat an unknown privacy state as non-private.

**PM4-019: The owner cannot see what to fix (Medium).** D-027 rightly removes titles from every public channel. The owner still needs the unmatched list, the G-004 disagreement report and release IDs to write overrides (T-033), and no decryption or report tool is specified. Unmatched releases are also never re-searched later, which AB-017 suggested. *Amend:* add a local, read-only report command that decrypts the state, plus a periodic re-search of unmatched releases.

**PM4-020: Consistency gaps the checker misses (Low).** See section 2.

**PM4-021: The ciphertext and counter leak metadata (Low).** Each weekly commit reveals the ciphertext length, and so the approximate collection size, as well as the run cadence. *Amend:* pad to size buckets, or accept the leak explicitly in D-027.

**PM4-022: The schedule's survival depends on a manual monthly check (Medium).** D-031 relies on the owner checking monthly. No automated keepalive or alert exists, and STALE is visible only to someone who looks. Whether bot commits count as activity is still unverified (A-024). *Amend:* add a keepalive, or a failing check that opens an issue (the owner gets an email) when the last success is more than 8 days old.

**PM4-023: The status deploy brings Pages privileges and Node into the sync workflow (Medium).** D-031 has the sync workflow deploy the status. That needs `pages:write`, `id-token:write`, the `github-pages` Environment and, under the current build, `npm ci` and a Vite build. D-030 names only a sync job and a commit job. deploy-pages.yml also deploys on every push, so the two deployers race and can overwrite each other's status. The G-002a/b split between preview and production deploys is not reflected in the workflow design. *Amend:* add a third deploy job that copies a prebuilt dashboard plus `status.json` (no Node at sync time), and give both workflows one shared Pages concurrency group.

## 2. Mechanical verification

- **Checker:** `check_plan_consistency.py` printed `tests=66 steps=12 decisions=39 risks=37 criteria=13 OK`.
- **Manifest:** the sha256 of tests/TEST_PLAN.md is `d21962bf…6de25b`, which matches FROZEN_MANIFEST.sha256.
- **My own script** (/tmp/pm4/chk.py) expands ranges and checks every T-, D-, S-, G- and A-ID across plan/*.md, TEST_PLAN and RISK_REGISTER. All cited IDs exist, apart from D-900 and D-901 in plan/ADDENDUM-V3.9-GAP.md, a legacy file.
- **Register severities match PLAN.md:** inherent Critical 4, High 18, Medium 13, Low 2; residual High 2, Medium 14, Low 21. Every criterion row and test row in TRACEABILITY.md agrees in both directions.

Mismatches the checker misses:
1. **The manifest does not cover every test file.** tests/test_sync.py exists but is not hashed, while D-036 and T-065 claim "every test file". The checker only verifies the hashes that are listed. It also states "executable red tests do not exist yet", even though test_sync.py exists and contains a test that D-036 says must be rewritten.
2. **T-009, T-019, T-020, T-021 and T-022 map to no success criterion**, so missing-ID errors and authentication failures have no criterion behind them.
3. **PLAN.md cites a file that does not exist.** It says the round-4 result is "in premortem/round-4.md"; this report is at /home/claude/artefacts/.
4. **The checker does not verify** the register severity totals, the unit/integration split (46/20, which I verified by hand), D-/G-IDs cited outside AMENDMENTS, or the step-to-test lists in PLAN.md against TRACEABILITY.md. Only S-RETRO's re-run of T-065 differs, and that is acceptable.
5. **Wrong references:**
   - Criterion 6 (dry-run) cites D-031 (status), and no decision covers dry-run.
   - T-063 (the unmatched-rate breaker) sits in S-002 rather than S-005.
6. **Stale assumption:** A-020 ("independent reviewer unavailable") is still classed as confirmed, although independent reviews now exist.

## 3. Adjudication of earlier Critical and High findings

| ID | Verdict | Reason |
|---|---|---|
| PM-001 | CLOSED | D-023 and T-051 cover distinctness, ownership and the Recently Added size check. |
| PM-002 | PARTIAL | Logs are fixed, but D-027 still allows raw evidence in public artefacts (PM4-006). |
| PM-003 | PARTIAL | The token persists in state, but it is lost when the commit job is skipped; precedence is undefined; the reauth script is broken (PM4-005, -008, -009). |
| PM-004 | PARTIAL | The group exists, but pending runs get cancelled and local runs bypass it (PM4-016); cross-run duplicates remain (PM4-010). |
| PM-005 | PARTIAL | STALE is added, but the reviewer Environment makes staleness near-certain (PM4-001) and the schedule check is manual (PM4-022). |
| PM-006 | PARTIAL | The rules are written down, but the track and year rules still cut recall and the fixture conflicts with public CI (PM4-014, -012). |
| PM-010 | PARTIAL | The AEAD and key lifecycle are good; the rollback ordering is broken (PM4-004). |
| PM-015 | PARTIAL | The breaker exists but false-trips permanently (PM4-011); K is unmeasured. |
| PM-020 | OPEN (owner) | G-001 decision pending; excluded from convergence. |
| AB-001 | CLOSED | D-034 and T-001 specify every check. |
| AB-003 | PARTIAL | The exit codes are defined, but their interaction with the job split is not (PM4-005). |
| AB-004 | PARTIAL | As PM-004. |
| AB-005 | PARTIAL | Completeness and aliasing are specified; read-after-write lag is not addressed; N is unmeasured; aliasing is unverified. |
| AB-006 | PARTIAL | Within-run duplicates are fixed; cross-run duplicates from another release are not (PM4-010). |
| AB-007 | PARTIAL | Semantics are defined; minimum fill was not adopted and the box-set edge is undefined (PM4-017). |
| AB-008 | PARTIAL | Normalisation is specified, but the track-conflict rejection is retained and the Various rule is unstated (PM4-014). |
| AB-009 | CLOSED | D-032 and D-037 re-match the legacy rows; T-062 covers this. |
| AB-010 | PARTIAL | Gate evidence is redacted, but raw evidence goes to public artefacts; the store copies remain until G-003. |
| AB-011 (Critical) | PARTIAL | Logs and summaries are fixed; artefacts are not (PM4-006). |
| AB-012 (Critical) | OPEN | Authorship and approval cannot be verified while the agent holds owner/admin credentials (PM4-002). |
| AB-013 | CLOSED | The G-002a/b split removes the circularity. "Green CI" at G-002a must exclude T-040 and T-049-production; this should be stated. |
| AB-014 | PARTIAL | The scheme is sound; the rollback counter ordering is not (PM4-004). |
| AB-015 | PARTIAL | The ref guard can be edited on a branch; non-write secrets stay repository-level (PM4-003). |
| AB-016 | CLOSED | D-030 and T-064 cover it. |
| AB-017 | PARTIAL | The probe and typed errors are added; unmatched releases are never re-searched (PM4-019). |
| AB-018 | PARTIAL | As PM-005. |
| AB-020 (Critical) | PARTIAL | Acknowledged by the planner. The test_sync.py hash is still missing, and the fixtures fall outside the freeze (PM4-012, -013). |

In total, of 26 Critical/High items: CLOSED 5, PARTIAL 19, OPEN 2. One of the two OPEN items (PM-020) is owner-only.

### Residual ratings I consider too optimistic

| Risk | Planner | Mine | Reason |
|---|---|---|---|
| R-020 gates | Medium | **High** | PM4-001, -002, -003 |
| R-021 hollow tests | Medium | **High** | Zero executable tests exist; the manifest is partial. |
| R-014 staleness | Low | **High** | PM4-001, -022 |
| R-019 log/artefact leak | Medium | **High** | PM4-006 |
| R-022 duplicates | Low | **High** | PM4-010, -016 |
| R-023 token persistence | Medium | **High** | PM4-005, -009 |
| R-011 encryption | Medium | **High** | PM4-004 |
| R-024 recall | Medium | **High** | PM4-014 |
| R-005 OAuth | Low | Medium | PM4-008 |
| R-025 breaker | Low | Medium | PM4-011 |
| R-033 server | Low | Medium | PM4-007 |
| R-012 runtime | Low | Medium | Master-year calls; A-028 unmeasured |

All of these residuals are planner estimates built on 0 of 66 executable tests. "Low" should not be granted to any risk whose only control is an unwritten test.

## 4. Verdict

- **My PM4 findings (23):** Critical 0, **High 8** (PM4-001, -002, -003, -004, -005, -006, -010, -014), Medium 11, Low 4.
- **Convergence criterion** (0 Critical/High residual after mitigation, excluding items only the owner can decide): **NOT MET.**
  - My 8 Highs are all fixable by plan amendment; none is owner-only. PM4-001 and PM4-002 need owner configuration, but the plan has to specify it.
  - On top of those, 8 register residuals are, in my view, High rather than Medium or Low.
- **What must change (R5), in priority order:**
  1. Redesign gate integrity:
     - the agent gets a separate, non-admin identity;
     - gate approvals are signed or made by PR approval;
     - two Environments, so the schedule needs no reviewer after G-002b;
     - every secret is Environment-scoped;
     - T-058 tests real properties.
  2. Specify the cross-job failure semantics (`always()`, generation check) and the status/counter ordering with a re-anchor procedure. Define token precedence.
  3. Encrypt every artefact.
  4. Add a URI-level, cross-release ledger per target.
  5. Relax and state the D-032 track and year rules, the Various rule and the Discogs call budget. Split T-061 into a public test and a private report.
  6. Delete server.ts, and fix the auth scripts and `.gitignore`.
  7. Add a genre-routing decision.
  8. Re-anchor the breaker.
  9. Engine refuses live mode outside Actions on main.
  10. Split S-000, and add a fixture freeze point at S-002.
  11. Extend the checker: full test-file coverage of the manifest, severity totals, criterion coverage for T-009 and T-019..T-022, the non-existent round-4 path.
- **Recommendation:** run **R5 amendments, then an independent pre-mortem round 5.** Implementation stays BLOCKED in any case on the owner decisions (G-001/PM-020, visibility versus Pages, the recall floor, Environment availability). The plan should not be labelled converged.
