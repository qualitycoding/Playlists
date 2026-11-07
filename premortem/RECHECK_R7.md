# Round 7 targeted re-check of the round-6 fixes (D-050..D-056)

- **Reviewer:** fresh-context independent subagent. Read-only; nothing in the repository was changed.
- **Repository:** /home/claude/playlists, branch gen-20261107T154700Z-playlists-app-reliability, commit 7065f8b.
- **Inputs read:** premortem/round-6.md and INDEPENDENT_PREMORTEM_R6.md; the 7065f8b diff of DECISIONS, GATES, PLAN, OPERATIONS, ASSUMPTIONS, AMENDMENTS, TRACEABILITY, RISK_REGISTER and TEST_PLAN; grep sweeps for stale wording.
- **Mechanical checks:** `python3 -I plan/tools/check_plan_consistency.py` printed OK (tests=72, decisions=56, risks=55). `sha256sum -c tests/FROZEN_MANIFEST.sha256` printed OK.
- **Not raised, as instructed:** R-043, D-043, A-030, and the owner's lack of Spotify Premium (D-050, A-032, R-055).

## GitHub facts the fixes rely on

| Fact | Result | Source |
|---|---|---|
| workflow_run fires whatever the conclusion of the upstream run | Verified. "A workflow run is triggered regardless of the conclusion of the previous workflow." | [GitHub docs, events that trigger workflows](https://docs.github.com/en/enterprise-server@3.5/actions/using-workflows/events-that-trigger-workflows) |
| workflow_run fires only from the default branch | Verified. The workflow file must be on the default branch. GITHUB_REF is the default branch and GITHUB_SHA is its last commit. Chaining is limited to three levels. | same page |
| workflow_run runs after a scheduled or dispatched sync | Supported. The GITHUB_TOKEN rule stops *events made by the token* (such as pushes) from starting workflows. Completion of a scheduled run is not such an event. | same page |
| Reading another branch's files | `actions/checkout` with `ref: state` and `contents: read` works in any workflow, including one started by workflow_run. Standard behaviour; not separately fetched. | — |
| A Pages deploy from a workflow_run run passes the github-pages Environment branch policy | Yes, because the run's ref is the default branch. | — |
| State-branch pushes by GITHUB_TOKEN under the D-054 ruleset | Verified. "Restrict deletions" limits deletion to bypass actors. "Block force pushes" stops force pushes. Neither blocks an ordinary fast-forward push by GITHUB_TOKEN. | [GitHub docs, available rules for rulesets](https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) |
| The 60-day rule | Verified. "In a public repository, scheduled workflows are automatically disabled when no repository activity has occurred in 60 days." The page does not define "repository activity". | [GitHub docs, disable and enable workflows](https://docs.github.com/en/enterprise-server@3.15/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows) |

## Per-finding status

| ID | Status | Evidence |
|---|---|---|
| PM6-001 | **CLOSED** | D-051 adds a workflow_run trigger (any conclusion) and reads the state branch. D-030, D-031 and D-044 now point to D-051, and the deploy job lives in pages.yml. T-064 says "no cross-workflow needs", and T-055 says pages.yml runs "including partial runs". No "needs commit" wording remains. Low nit: D-051 says "failed runs are shown", but an exit-1 run without a token rotation commits no status, so its generation does not change and nothing new is published. STALE still covers that case. |
| PM6-002 | **PARTIAL** (residual Medium) | D-052 supplies the mechanism: RUN_MODE, a temporary reviewer on `sync`, committed ID lists and gate-readonly. The fix's first item, "drop 'first G-002b run uses gate-rehearsal'", was not applied everywhere. The stale wording is listed after this table. Followed literally, the stale text fails closed (rehearsal mode refuses real IDs), so no harm results, but go-live still faces contradictory instructions. gate-readonly also has no defined RUN_MODE, no main-only restriction and no reviewer, and its token holds modify scopes. |
| PM6-003 | **PARTIAL** (residual Medium; Premium excluded) | D-050 and T-061 set read-back by URI or ISRC, a search page of at most 10, /items endpoints, individual fetches and Development Mode fixtures. The stale and missing pieces are listed after this table. |
| PM6-004 | **PARTIAL** (residual Medium) | D-053 adds an alarm in "another active repository". The gaps are listed after this table. The alarm exists outside this repository, so the most likely failure (both dying silently together) is reduced but not closed. |
| PM6-005 | **CLOSED** | D-054 limits the ruleset to blocking deletion and non-fast-forward pushes. D-045 is annotated as superseded, and A-031 is superseded. Low nits: R-045 still cites A-031, and PLAN S-000a [R6] still says "check ruleset or Actions bypass". |
| PM6-006 | **CLOSED** | D-054 subtracts the remote URIs before every add, makes a missing state after G-002b fatal, and applies the first-run cap to any empty ledger. T-057 asserts all three. Low nits: D-035 and T-056 still claim "rollback detected via generation counter" and were not reworded. The subtraction works by URI only (see PM6-003). |
| PM6-007 | **CLOSED** | D-052 puts rehearsal status under `state:rehearsal/` (never published), uses the shared concurrency group `sync`, and writes generation 0 with no status.json. T-071 asserts this, and the D-035 first-run rule is consistent with it. |
| PM6-008 | **CLOSED** | D-036 moves the list to tests/xfail_ids.txt outside the manifest. T-065 checks that the list only shrinks against the previous commit. Low nit: PLAN S-000b (line 32) still says "removes its markers". |
| PM6-009 | **PARTIAL** (residual Low/Medium) | D-055 and T-053 add `--env <name>`, an atomic SPOTIFY_REAUTH_AT *variable*, a single fallback to the secret token, and state/token.enc. Stale wording, not marked as superseded: D-049 still says "the Environment **secret** SPOTIFY_REAUTH_AT" and "`gh secret set --env sync`". D-035 still says `--env sync` and keeps the token "inside the encrypted state". T-053 says both "inside encrypted state" and "state/token.enc". |
| PM6-010 | **PARTIAL** (residual Low) | D-055 defines K_search and T_rel, and T-057 and T-061 test them separately. Bare "K" remains: D-024 still says "new matched releases x K tracks … K is set … starting value 40". D-032, D-049 ("caps K"), T-006 ("K>1") and A-026 also use a bare K. D-055 maps the names explicitly, so the collision risk is low. |
| PM6-011 | **CLOSED** | D-054 adds the quarantine exit (D-041 report and a dispatch input with a reason), per-target last-success and STALE, and a capacity check that fails only its own target (exit 2). T-057 and T-055 assert them. |
| PM6-012 | **CLOSED** | GATES line 2 now records the approval channel. D-028 and D-055 require status checks and zero approvals, and T-064 asserts that. No "PR approved" or "reviewed PR" text remains. |
| PM6-013 | **CLOSED** | D-052 and PLAN S-006 [R7] say S-006 builds the code only. The migration and G-004 run after the S-008 commit job, or in a one-off dispatch workflow under gate-readonly. |

**PM6-002: stale text still saying the first G-002b run uses gate-rehearsal**
- GATES.md line 5: "the first G-002b run also uses the gate-rehearsal Environment".
- GATES.md line 11 and D-046: "gate-rehearsal secrets are cleared after the first G-002b run".
- D-028: gate-rehearsal "serves G-002a and the first G-002b run".
- T-058 repeats the clearing clause.
- G-002b in GATES does not mention the temporary reviewer on `sync`.

**PM6-003: stale and missing pieces**
- D-034 still says "identity follows provider aliases (Spotify linked_from…)" and is not marked as superseded.
- T-016 ("relinked-URI fixture") and T-060 ("relinked URI") still imply synthetic linked_from fixtures. The fix asked for a recorded response from after the 2026 change.
- The plan does not say "no market parameter on read-back".
- D-054 subtracts by URI only, not by URI or ISRC, so a relinked remote copy could still be re-added.
- T-047 (30-minute budget) does not count the extra search pages or the individual fetches.

**PM6-004: gaps in the outside alarm (D-053)**
- The other repository is not named.
- That repository's own scheduled check is subject to the same 60-day rule.
- Where the issue is opened, and with which token, is unspecified. GITHUB_TOKEN cannot open issues in the Playlists repository.
- T-055 still asserts only "the check workflow opens an issue". Nothing tests or operationally checks the outside alarm.
- "S-000a tests whether state-branch commits reset the 60-day timer" cannot finish inside S-000a: it takes 60 days, and GitHub does not define "activity".
- The "monthly keepalive commit on main" fallback has no owner. Under D-055, main requires status checks, so a bot push would need a bypass.
- OPERATIONS does not record `gh workflow enable` as the recovery step.

## New Critical or High problems introduced by the fixes

**None.** The new gaps I found are Medium or lower:
- **N-1 (Medium): gate-readonly is underspecified.** It has no RUN_MODE value, no main-only restriction and no reviewer. It holds a Spotify token that has modify scopes, and nothing says it is cleared after G-002b. If it shares an authorisation with `sync`, token rotation (A-023) could invalidate the other copy. Under R-043 this is advisory in any case.
- **N-2 (Medium):** the D-053 keepalive fallback conflicts with D-055's required status checks on main, and no actor is named for it.
- **N-3 (Low):** the RISK_REGISTER header still lists R-041 as a residual High. D-051 now addresses it, and the R-051..R-054 residuals need re-rating after this check.

## Verdict

**Converged.** Counting the round-6 findings and anything the fixes introduced, there are 0 Critical and 0 High residuals, excluding R-043 and the Spotify Premium prerequisite.
- **Closed:** PM6-001, 005, 006, 007, 008, 011, 012 and 013.
- **Partial, with Medium residuals:** PM6-002, 003 and 004.
- **Partial, with Low residuals:** PM6-009 and 010.

Recommended cleanup in one commit, none of it blocking:
1. Strike the "first G-002b run uses gate-rehearsal" text in GATES (lines 5 and 11), D-028, D-046 and T-058.
2. Mark D-034's linked_from clause, D-049's "secret"/`--env sync` and D-024's bare K as superseded.
3. Make the D-054 subtraction work by URI or ISRC.
4. Name the alarm repository, and say where its issue is opened and with which token. Update T-055 to cover it.
5. Specify gate-readonly.
6. Re-rate the register.

The planner's register still lists R-020, R-021 and R-023 as residual High. Round 6 agreed with those ratings as pre-existing risks, not as new findings. They need the owner's named acceptance before the plan is READY.
