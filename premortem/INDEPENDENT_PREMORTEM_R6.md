# Pre-mortem round 6 (owner-authorised extra round): Discogs → Spotify playlist synchroniser plan

- **Reviewer:** fresh-context independent subagent. I did not write the plan or any of its amendments.
- **Date:** 2026-11-07
- **Repository:** /home/claude/playlists, branch gen-20261107T154700Z-playlists-app-reliability, commit 47a039c. I made no changes to the repository.
- **Files read:**
  - plan/PLAN.md, DECISIONS.md (D-001..D-049), GATES.md, ASSUMPTIONS.md, OPERATIONS.md, TRACEABILITY.md, AMENDMENTS.md, CI-MATRIX.md and ENVIRONMENT.md
  - tests/TEST_PLAN.md and FROZEN_MANIFEST.sha256
  - premortem/RISK_REGISTER.md, round-5.md and INDEPENDENT_PREMORTEM_R5.md
  - GATE-G-001.md, HANDOFF.md, EXECUTION_LOG.md and DEVIATIONS.md
  - the legacy .github/workflows/*.yml, sync_playlists.py (Spotify calls only), requirements.txt and .gitignore
- **Commands run (read-only):**
  - `python3 -I plan/tools/check_plan_consistency.py`: tests=72 (unit 51, other 21), steps=13, decisions=49, risks=50, criteria=13, OK.
  - `sha256sum tests/TEST_PLAN.md`: matches the manifest (1ade30f4…c5ab).
  - grep cross-checks.
- **External facts:** checked by web search and fetch, cited inline.
- **Accepted and not re-raised:** R-043, D-043, A-030 and D-027.

## 1. Do the R6 amendments close PM5-001..005?

| Round-5 High | R6 answer | Verdict | Why |
|---|---|---|---|
| PM5-001: a second Pages deployer overwrites status.json, so the counter wedges or fails open | D-044, D-035 (counter read from the state branch), "first run" defined | **PARTIAL** | The overwrite path is closed: status.json is no longer read from the live site. What is new is that nothing defines how pages.yml is triggered after a sync run. D-030, D-031 and T-064 still describe a deploy job inside the sync workflow, so the decisions contradict each other (PM6-001). PM5-017, "deploy only after commit success", cannot be written as `needs:` across workflows. The counter is now stored beside the state, so it is no longer an independent witness (PM6-006). |
| PM5-002: branch protection rejects the bot's weekly state commit | D-045 state branch, A-031 | **PARTIAL** | Moving the state off main is right. The specific mechanism, "a ruleset allowing only the Actions bot", is not available: GITHUB_TOKEN cannot be added to a ruleset bypass list (PM6-005), so S-000a will bounce the plan back to the owner. The fix is simpler than the plan assumes. The move also removes the weekly default-branch activity, which feeds PM6-004. |
| PM5-003: rehearsal contaminates production | D-046, T-071, T-051 and T-060 | **PARTIAL** | Keying the ledger by playlist ID and binding the mode to the Environment fix the core. Three gaps are new. (a) The first G-002b run is specified to run under gate-rehearsal, which is bound to rehearsal mode, and rehearsal mode refuses real IDs. (b) The real-ID fingerprints and the recorded rehearsal IDs have no storage location. (c) Rehearsal and live share status.json, the counter and the branch. See PM6-002 and PM6-007. |
| PM5-004: the gate-evidence test is impossible under R-043 | D-028 R6, T-058 | **PARTIAL** | T-058 and D-028 are fixed. GATES.md line 2 still requires each GATE file to be "added through a PR approved by the owner account", which GitHub forbids for the PR's own author. D-028 still requires "a reviewed PR to main (CODEOWNERS)" in a repository with one account (PM6-012). |
| PM5-005: a dry-run orphans the rotated token | D-047, T-023, T-053, A-023 measurement | **CLOSED** for the dry-run path | Spotify documents that rotation depends on the grant and that the existing refresh token stays in use when none is returned ([Spotify, refreshing tokens](https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens)), so the S-002 measurement is meaningful. New gaps in the reauthorisation path are recorded as PM6-009 (Medium) and PM6-014 (Low). |

**Net:** of the five, 1 is closed and 4 are partial. The partial residues are rated individually below.

## 2. Findings

### High

**PM6-001: The status deploy has no defined trigger, and the decisions contradict each other (High).** Cites D-030, D-031, D-044, T-055 and T-064.

- **The contradiction:**
  - D-044 says "the sync workflow no longer deploys", and pages.yml is the only publisher.
  - D-031 (unchanged) still says "the sync workflow deploys the status itself (a push made with GITHUB_TOKEN does not trigger other workflows)".
  - D-030 R5 still lists the sync workflow's jobs as "sync, commit **and deploy**", and its R6 clause says "the deploy job needs the commit job".
  - T-064 asserts both "deploy job has no Node" and "deploy needs commit success". `needs:` only works within one workflow, so pages.yml cannot `needs:` sync.yml's commit job.
- **Story:**
  - The implementer follows D-044 and gives pages.yml a `push: branches: [state]` trigger. The commit job pushes with GITHUB_TOKEN, and events from GITHUB_TOKEN do not create workflow runs; only workflow_dispatch and repository_dispatch are exempt ([GitHub docs, triggering a workflow](https://docs.gitHub.com/en/actions/using-workflows/triggering-a-workflow)). pages.yml therefore never runs after a sync.
  - The dashboard stays on the status from the last main push and shows STALE after 8 days while the playlists update correctly. The owner learns to ignore STALE.
  - If the implementer instead uses `workflow_run` with `conclusion == 'success'`, then every exit-2 (partial) run and every exit-1 run with a rotated token is never published. The dashboard keeps showing the last full success, which misrepresents a partial run (criteria 7 and 9).
- **Minimal fix:**
  - Delete the deploy-job text from D-030 and D-031.
  - pages.yml is triggered by `workflow_run: workflows: [sync, rehearsal] types: [completed]` plus push to main.
  - It deploys whenever the state branch's status.json generation has changed. It reads that file from the state branch, so a failed commit simply publishes nothing new.
  - T-064 asserts the workflow_run trigger and the absence of a push-to-state trigger. T-055 asserts that a partial (exit 2) run is published as partial.

**PM6-002: The first G-002b run is impossible under the R6 stage binding, and real IDs have no home before G-002b (High).** Cites D-023, D-028, D-046, GATES G-002a/G-002b and T-051, T-058 and T-071.

- **The contradiction:**
  - D-028 and GATES line 5 say "the first G-002b run also uses the gate-rehearsal Environment".
  - D-046 binds gate-rehearsal to rehearsal.yml and rehearsal mode.
  - D-023 R6 and T-051 make rehearsal mode refuse public playlists and real-ID fingerprints. The real playlists are public (A-030) and are the real IDs.
  - sync.yml hard-codes Environment `sync`. That Environment has no reviewer and "holds the live secrets only after G-002b is recorded".
  - So the first write to the real playlists is either refused by preflight (under rehearsal.yml) or runs unreviewed (under sync.yml).
- **Related gaps:**
  - The "real-ID fingerprints" that rehearsal compares against, and the "IDs recorded as rehearsal" that live mode refuses, have no defined storage. The rehearsal state is discarded at G-002b and the gate-rehearsal secrets are cleared, so the live run has nothing to compare against.
  - S-006's read-back of the real playlists (D-005, G-004) also needs real IDs and a token before G-002b. No Environment is allowed to hold them then.
  - D-042's "the expected Environment is present" has no runtime signal: Actions exposes no built-in Environment-name variable that I can confirm. Unverified.
- **Story:** At go-live the agent finds the conflict and resolves it ad hoc under time pressure. It either weakens the mode check or loads real IDs into `sync` early, which starts the unreviewed schedule. That is exactly the go-live control R6 meant to harden.
- **Minimal fix:**
  - Drop "first G-002b run uses gate-rehearsal".
  - Give `sync` a required reviewer from G-002b until the first live run is verified, then remove it as a recorded step before the schedule is re-enabled.
  - Store the mode as an Environment **variable** (`RUN_MODE`) in each Environment, so the engine reads the mode from the Environment and not only from the workflow file.
  - Commit `config/real_playlist_ids` and `config/rehearsal_playlist_ids` (both lists are public per A-030) as the fingerprint sources.
  - Add a read-only `sync-readonly` Environment, or allow read-only use of `sync` before G-002b, for S-006 and S-000a probes. T-051, T-058 and T-071 assert these.

**PM6-003: Spotify's February/March 2026 Development Mode contract breaks the plan's identity and search design (High).** Cites D-017, D-024, D-032, D-034, T-016, T-060, T-061 and T-063.

- **What changed:** From 11 February 2026 for new apps and 9 March 2026 for existing ones, Development Mode apps changed as follows ([Spotify migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)):
  - Track **`linked_from` is removed**.
  - Search `limit` maximum falls from 50 to **10** (default 5); more results need `offset` pagination.
  - Batch `GET /albums` and `GET /tracks` are removed.
  - Playlist `/tracks` endpoints are renamed `/items`, and playlist fields are renamed from `tracks` to `items`.
  - The app owner must hold **active Premium**, or the app stops working.
  - A hobby app is almost certainly in Development Mode.
- **Story:**
  - D-034's identity rule ("identity follows provider aliases (Spotify linked_from)") is tested by T-016 and T-060 with synthetic relinked fixtures, and those tests pass.
  - In production a relinked track comes back from read-back under a different URI with no `linked_from`. It counts as a mismatch, the row stays unconfirmed, and the next run re-adds it. Spotify accepts duplicate items.
  - After N runs the target is quarantined (D-034). That makes every later run exit 2 (PM6-011), with N duplicates already in a public add-only playlist.
  - Separately, K>1 judged "over all K" (D-032) with K above 10 either returns HTTP 400 or silently caps at 10. Neither is caught by the fixture tests.
- **Why existing controls miss it:** S-000a's "probe the Spotify endpoints" will find renamed endpoints. It will not find a removed *optional* field, because a 200 response without `linked_from` looks identical to an un-relinked track.
- **Minimal fix:**
  - Rewrite D-034's identity rule: no `market` parameter on read-back, and confirmation by exact URI or by ISRC from `external_ids` (reinstated per the guide's March note).
  - D-032 caps the search page at 10 and states whether K paginates. Count the extra calls in T-047.
  - Record the S-002 fixtures from a Development Mode app.
  - Add "owner Premium active" to OPERATIONS and the status failure reasons.
  - T-060's relinked case uses a recorded post-2026 response, not a synthetic `linked_from`.

**PM6-004: The schedule and its alarm both die at about day 60 (High, the most likely 3-month failure).** Cites D-031, D-045, A-024 and T-055.

- **The rule:** "In a public repository, scheduled workflows are automatically disabled when no repository activity has occurred in 60 days" ([GitHub docs](https://docs.github.com/actions/managing-workflow-runs/disabling-and-enabling-a-workflow)).
  - The legacy design committed weekly to main. R6 moves every bot commit to the non-default `state` branch.
  - Whether non-default-branch commits or GITHUB_TOKEN commits count as activity is unverified (A-024). The community keep-alive actions work by committing to the **default** branch ([efrecon/gh-action-keepalive](https://github.com/efrecon/gh-action-keepalive)). The best-known one, gautamkrishnar/keepalive-workflow, has been disabled by GitHub for a terms-of-service violation ([repository page](https://github.com/gautamkrishnar/keepalive-workflow)). Dummy-commit keep-alives are therefore not a safe fix.
- **Story:**
  - The owner's last main commit is at launch. Around day 60, sync.yml is disabled.
  - D-031's safeguard is "a separate **scheduled** check workflow" that opens an issue. It is disabled by the same rule at the same moment.
  - Only the dashboard's STALE label, which needs a visit, and a procedural monthly owner check remain. At month 3 the playlists have been frozen for about 4 weeks without any alert.
- **Minimal fix:** add an alarm that does not depend on this repository's schedule. For example:
  - a free dead-man's-switch ping (such as healthchecks.io) sent by each verified run, which e-mails the owner when the ping is missing; or
  - the staleness check hosted in another repository that is active.

  Then:
  - S-000a verifies whether state-branch commits reset the timer.
  - T-055 asserts that the external ping is sent only after exit 0 or 2.
  - OPERATIONS records `gh workflow enable` as the recovery step.

### Medium

**PM6-005: "Only the Actions bot may push to `state`" cannot be configured (Medium).** Cites D-045, A-031 and S-000a.
- **Fact:** GITHUB_TOKEN cannot be added to a ruleset bypass list. The documented workaround is a GitHub App token ([example PR citing GitHub's design](https://github.com/aliasunder/vault-cortex/pull/52)). The September 2025 "exempt" bypass type lists only roles, teams and Apps ([GitHub changelog](https://github.blog/changelog/2025-09-10-github-ruleset-exemptions-and-repository-insights-updates/)). Classic "restrict who can push" is limited to organisation repositories.
- **Story:** S-000a cannot verify A-031. Under D-045 the plan returns to the owner and the work stalls. Alternatively, the agent adds a GitHub App, which brings a new private-key secret and a new identity, contrary to the owner's deferral under R-043.
- **Minimal fix:**
  - Give `state` a ruleset with only **restrict deletions** and **block force pushes**. Ordinary fast-forward pushes by GITHUB_TOKEN are unaffected, and these rules also block the rollback and deletion paths in PM6-006.
  - Make sure no main ruleset targets `~ALL`.
  - Under R-043 the only other pusher is the owner/agent anyway.
  - Amend A-031 accordingly.

**PM6-006: The counter is stored beside the state, so ledger loss produces mass duplicates (Medium).** Cites D-007, D-034, D-035, D-044, D-046 and T-056.

- **Why the counter no longer detects rollback:** status.json, its counter and the state now share one branch and usually one commit. Resetting or reverting the branch rolls both back consistently, so T-056's "rollback detected via generation counter" detects only artificial split-commit cases.
- **Why duplicates follow:** reconciliation against the remote playlist happens only for *unknown* rows (D-007 R4). Any path that loses ledger rows turns them into *new* rows, which are added blind. Spotify accepts duplicates. The paths are:
  - a branch rollback;
  - deletion of the `state` branch, where a missing state is plausibly read as generation 0 and passes D-044's "first run" test, because GATE-G-002b is recorded permanently;
  - D-046's "a retargeted ID starts empty";
  - a re-anchor.
- **Why the circuit breaker does not help:** the addition cap scales with "new matched releases", which in this case is every release, and the first-run cap applies only "after migration".
- **Minimal fix:**
  - Before every add to an add-only target, subtract the URIs present in the complete remote read. The engine already performs that read for shrink detection, so this costs nothing extra.
  - Treat a missing state file after GATE-G-002b as fatal, not as generation 0.
  - Apply the first-run cap to any target whose ledger is empty.
  - T-060 and T-056 assert each of these.
  - Reword D-035 so that it claims only what the counter can now detect.

**PM6-007: Rehearsal and live share status.json, the counter and the branch, and the counter bootstrap is undefined (Medium).** Cites D-031, D-035, D-044, D-046 and T-055, T-056 and T-071.

- **What D-046 leaves open:** it gives rehearsal "its own state and key", but not its own status file, counter, branch path or concurrency group.
- **Story:**
  - Rehearsal runs commit status.json to `state`. pages.yml publishes them, so the public dashboard shows disposable-playlist runs as the sync status.
  - The counter advances to N.
  - The first live run starts from the migrated state at generation 0 (or whatever S-006 wrote). It sees "status counter ahead of state", aborts, and needs an owner re-anchor at go-live. Re-anchoring then becomes routine.
  - If rehearsal.yml does not share concurrency group `sync`, two commit jobs can rebase the same binary file concurrently.
- **Minimal fix:**
  - Rehearsal writes to `state:rehearsal/` (or a `state-rehearsal` branch) with its own status file, which pages.yml never publishes.
  - Both workflows use concurrency group `sync`.
  - S-006 writes the migrated state at generation 0 with no status.json.
  - T-071 asserts all three.

**PM6-008: xfail markers inside frozen files make every step an owner-approved refreeze (Medium).** Cites D-036, S-000b and T-065.

- **The conflict:** D-036 marks red tests `xfail(strict=True)` "by T-ID" in the test files, hashes every test file into the manifest, and requires owner approval for any amendment. Each step that "removes its own markers" changes a hashed file, so `sha256sum -c` fails.
- **Story:** About 10 steps each need an owner-approved refreeze. Alternatively, the agent moves the markers into an unhashed conftest, where nothing stops them being re-added. T-065's "only shrinks" also needs a committed baseline that is not specified. Under R-043 this tends towards hollow tests (R-021).
- **Minimal fix:**
  - Keep the xfail set in a separate `tests/xfail_ids.txt`, not in the manifest but checked by T-065 against the previous commit's copy: lines may be removed, never added.
  - Hash only the test bodies.

**PM6-009: The reauthorisation path contradicts the Environment rules and is undertested (Medium).** Cites D-028, D-035, D-047, D-049 and T-053, T-059 and T-068.

- **Environment conflict:** D-049 writes the setup token with `gh secret set --env sync`, scheduled in S-002 (D-035). D-028 says `sync` holds live secrets only after G-002b. Rehearsal needs the token in gate-rehearsal instead.
- **Undefined precedence:** "the newer of secret and state token wins" is undefined unless the marker is set, because a secret carries no issued-at. The setup script is not required to write SPOTIFY_REAUTH_AT, and T-068 does not check it.
- **Story:** The owner reauthorises after an `invalid_grant` but forgets the marker. The engine keeps preferring the dead state token, every run fails, and repeated reauthorisations change nothing.
- **Marker as a secret:** it is masked, so the owner cannot see the stored value or check it later.
- **Minimal fix:**
  - The setup script takes `--env <name>` and atomically sets both the token and SPOTIFY_REAUTH_AT, the latter as an Environment *variable*.
  - On `invalid_grant` from the state token, try the secret token once before failing.
  - T-068 asserts the marker, and T-053 asserts the fallback.

**PM6-010: "K" names two different constants (Medium).** Cites D-024, D-032, D-049 and A-026.
- **The collision:** D-024 uses K for tracks per release in the circuit breaker (starting value 40). D-032 uses K for search results. D-049 says S-000a "caps K", meaning the search limit, which is now 10 (PM6-003). A-026 does keep the two apart.
- **Story:** The implementer uses one constant. The breaker becomes "releases × 10 tracks" and aborts on any deluxe edition, or the search asks for 40 results and gets HTTP 400.
- **Minimal fix:** rename the constants K_search (at most 10 per page) and T_rel, and give each its own test (T-057, T-061).

**PM6-011: Quarantine has no exit, and one full target aborts every target (Medium).** Cites D-006, D-023, D-026, D-031 and D-034.

- **Story:**
  - One target is quarantined after N read-back mismatches; PM6-003 makes this likely.
  - From then on every run exits 2, the "last success" never advances, the dashboard shows STALE permanently, and the check opens an issue every day.
  - The owner stops reading the alerts, and a later real failure is missed.
  - In the same way, D-023's "target not full against provider capacity" aborts the whole run when the master fills (A-025, A-028 unmeasured), which contradicts per-destination completion (D-006).
- **Minimal fix:**
  - Define the unquarantine procedure: inspection by the owner report command (D-041), then a dispatch input with a logged reason.
  - Track a per-target last-success, so STALE applies per target.
  - Make the capacity check fail only its own target (exit 2).

**PM6-012: Leftover impossible-review rules from PM5-004 (Medium, honesty).** Cites GATES.md line 2, D-028 and T-058.

- **What remains:** GATES still requires GATE files "added through a PR approved by the owner account". D-028 still requires "a reviewed PR to main (CODEOWNERS and branch protection)".
- **Why it cannot be met:** the repository has one account (A-002), and GitHub does not let a PR's author approve it. Every merge of S-001..S-009, not just the gates, therefore needs an admin bypass.
- **Consequence:** bypass becomes routine and indistinguishable from abuse. This is a consequence that R-043 does not state, not the accepted risk itself.
- **Minimal fix:**
  - Require status checks (T-064, T-065) and zero approvals on main.
  - Align the GATES preamble with the R6 approval-channel wording.

**PM6-013: S-006 migration cannot complete before S-008 (Medium, ordering).** Cites S-006, S-008, D-042, D-045 and G-004.
- **The dependency:** S-006 must produce the encrypted, migrated state. Local runs may not write state (D-042, PM5-020), and only the commit job (S-008) pushes to `state`. The read-back also needs the real IDs (PM6-002).
- **Story:** G-004 is requested before the writer exists, and the agent writes the state locally "just this once".
- **Minimal fix:** move the S-006 execution and G-004 after S-008's commit job exists; S-006 builds only the code. Or define a one-off migration workflow (workflow_dispatch, read-only Environment) inside S-006.

### Low

**PM6-014: A rotated token is lost on cancellation, and "dry-run persists only the token" is fragile (Low, depends on A-023).**
- **Loss:** a timeout, cancellation or OOM after the refresh but before the artefact upload loses the token. The dashboard then shows `invalid_grant` the next week.
- **Fragility:** "a dry-run persists only the token" (D-047) means re-encrypting the whole state blob from dry-run memory. A bug could commit simulated ledger rows, which the never-re-add rule would then make permanent.
- **Fix:** keep the token in a separate encrypted file, `state/token.enc`, and upload it immediately after any refresh. The dry-run commit job may then touch only that file, which T-023 asserts byte for byte on the ledger.

**PM6-015: Operational loose ends (Low).**
- **Premium lapse:** the Spotify app stops working if the owner's Premium lapses (PM6-003).
- **Client-secret rotation:** D-048's rotation is not in any step's done-criteria and has no ordering against both Environments' copies.
- **Repository-level secrets:** no step moves the existing secrets (SPOTIFY_*, DISCOGS_*) into Environments and deletes them. Their values cannot be read back, so the owner must re-source them. T-058 will fail at G-002a until this is done.
- **Fix:** add these to S-000a and S-008 and to OPERATIONS.

**PM6-016: Mechanical staleness the checker misses (Low).**
- **PLAN:** the header still says "amendments 1-5 of its report are not applied and need owner direction", and the Blockers paragraph lists the round-5 Highs as open.
- **TEST_PLAN:** line 2 still says "last action of S-000".
- **TRACEABILITY:** D-044, D-045, D-048 and D-049 appear in no criterion row, and T-071 is mapped to S-005 although its Environment binding is built in S-008.
- **RISK_REGISTER:** D-049 is cited nowhere, and R-044..R-048 carry planner-only residual ratings of Medium. I would rate R-041/R-044 High (PM6-001), R-046 High (PM6-002), R-045 Medium and R-048 Low.
- **Fix:** correct the texts, and extend the checker to require every D-ID to appear in TRACEABILITY or the register.

## 3. Fresh pre-mortem summary (project failed 3 months after launch)

Most likely causes, in order:

1. The schedule and its alarm are silently disabled at about day 60, and the playlists have been frozen for weeks (PM6-004).
2. Duplicate tracks appear in public add-only playlists. Causes are Spotify's removal of `linked_from` (PM6-003) and blind adds after any ledger loss (PM6-006).
3. The dashboard is permanently STALE or stale-but-green because pages.yml never runs after sync (PM6-001), or because a quarantined target pins every run at exit 2 (PM6-011). Either way the owner learns to ignore it.
4. Go-live is improvised because the first G-002b run contradicts the stage binding (PM6-002) and the rehearsal counter wedges the first live run (PM6-007).

## 4. Findings table

| ID | Severity | One line |
|---|---|---|
| PM6-001 | High | No defined trigger for pages.yml after sync. D-030 and D-031 contradict D-044, and T-064 asserts a cross-workflow `needs`. |
| PM6-002 | High | The first G-002b run must use gate-rehearsal, whose rehearsal mode refuses real IDs. Real IDs and fingerprints have no home before G-002b. |
| PM6-003 | High | Spotify's 2026 Development Mode removes `linked_from`, caps search at 10, removes batch GETs and requires Premium. D-034 identity and D-032 K break. |
| PM6-004 | High | The 60-day inactivity rule disables both sync.yml and the scheduled staleness alarm; state commits no longer touch main. |
| PM6-005 | Medium | GITHUB_TOKEN cannot be a ruleset bypass actor, so D-045's push restriction cannot be configured. |
| PM6-006 | Medium | The counter beside the state is no witness. Ledger loss, retargeting or branch deletion leads to blind re-adds and duplicates. |
| PM6-007 | Medium | Rehearsal shares status.json, the counter and the branch; the counter bootstrap is undefined, so go-live is wedged. |
| PM6-008 | Medium | xfail markers inside hashed files mean every step needs an owner-approved refreeze. |
| PM6-009 | Medium | The setup writes to `sync` before G-002b, the reauth marker is not set by setup, and token precedence is undefined. |
| PM6-010 | Medium | K means both search depth and tracks per release. |
| PM6-011 | Medium | Quarantine is terminal and a full target aborts every target, leading to permanent STALE and ignored alerts. |
| PM6-012 | Medium | GATES and D-028 still require PR approvals that a single-account repository cannot give. |
| PM6-013 | Medium | S-006 and G-004 need the S-008 commit job and the real-ID access. |
| PM6-014 | Low | The token is lost on cancellation, and a dry-run re-encrypts the whole ledger. |
| PM6-015 | Low | Premium lapse, client-secret rotation timing, and migration of the repository-level secrets. |
| PM6-016 | Low | Stale PLAN and TEST_PLAN text, untraced D-IDs, and unreviewed register ratings. |

**Totals:** Critical 0, High 4, Medium 9, Low 3.

## 5. Residual counts and convergence

- **Residual Critical/High after the R6 amendments (excluding R-043):** Critical **0**, High **4** (PM6-001, PM6-002, PM6-003, PM6-004).
- **Risk-register residual Highs I agree with:** R-020 (gates procedural under R-043, acceptable only if the owner names it), R-021 (sharpened by PM6-008) and R-023 (PM6-009). These are not new findings.
- **Verdict:**
  - **Convergence is NOT met.** There are 4 new High findings. None of them is an owner-only decision or the accepted R-043.
  - All four can be fixed by plan amendment plus one S-000a probe (the inactivity timer).
  - PM6-003 is a fact-driven defect that no earlier round could have seen without the 2026 Spotify change.
  - With these four applied, a mechanical re-check of the five fixes (not a full round) would be sufficient. The Mediums are cheap and should go in the same commit.
