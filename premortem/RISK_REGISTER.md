# Risk register
Rebuilt 2026-11-07 (R4) and updated after independent round 4. Severity is a combined likelihood-and-impact judgement. Inherent = before the plan's controls; residual = after the R4 amendments, planner estimate adjusted to the round-4 reviewer's ratings where they were higher; R5 changes are not yet applied. Ratings of R-001, R-003, R-010, R-011, R-014 follow the independent pre-mortem. Source IDs (PM4 = round-4 narratives): C claims, CR code review, PM independent pre-mortem, AB independent adversarial.
Totals: 66 risks. Inherent Critical 4, High 39, Medium 18, Low 5. Residual Critical 1, High 17, Medium 25, Low 23.
Convergence criterion 0 Critical/High residual: NOT met after the final permitted round (round 5, premortem/round-5.md). Residual Critical/High after round 7 (planner estimate plus the reviewer's findings): R-007, R-011, R-020, R-021, R-023, R-026, R-041, R-043, R-047, R-056, R-059, R-060, R-061, R-062, R-063, R-064, R-065, R-066. Convergence NOT met (premortem/round-7-replan.md). R-053 and R-055 are Spotify risks deferred with Spotify (D-057). R-043 is an accepted risk; R-020 and R-043 must be accepted by name before READY. Residual ratings are planner estimates adjusted to the round-5 reviewer's ratings.

| ID | Risk | Inherent | Residual | Controls (decision, tests, steps, gates) | Sources |
|---|---|---|---|---|---|
| R-001 | Fake Pages success | High | Medium | D-001,D-031 T-025,T-055 S-007 | C-009 CR-001 PM-005 PM5-001 |
| R-002 | False cache/ledger success after write failure | Critical | Medium | D-006,D-034 T-014,T-016,T-060 S-005 | C-008 CR-003 AB-005 |
| R-003 | Public exposure of secrets or account data in repo, state or cache | High | Low | D-004,D-035,D-038 T-045,T-056 S-001,S-006 G-005; relaxed by owner facts A-030 (D-027) | C-011 CR-002 |
| R-004 | Discogs partial or drifting data | High | Low | D-012,D-034 T-001..T-004,T-044 S-003 | CR-004 AB-001 AB-002 |
| R-005 | Spotify OAuth startup failure | High | Medium | D-013,D-035 T-020,T-021,T-053 S-002; D-035 T-068 | CR-005 PM4-008 |
| R-006 | YouTube Music unofficial auth fragility | High | Low | D-018,D-038 T-022,T-063 S-002 G-001; CLOSED for release 1 by D-043 (YouTube Music removed, G-001 decided 2026-11-07) | AB-017 |
| R-007 | Weekly workflow failure or silent skip | High | High | D-030,D-026,D-037 T-027,T-028,T-059,T-064 S-000a,S-008 | CR-006 AB-003 AB-016 PM-019 PM5-002 |
| R-008 | Wrong album match | High | Medium | D-008,D-032 T-005..T-009,T-061 S-004 G-006 | CR-007 AB-008 |
| R-009 | Recently Added data loss | High | Low | D-010,D-033,D-023 T-018,T-051 S-005 | PM-001 PM-007 AB-007 |
| R-010 | Public git history retains secrets or account data | Low | Low | D-019,D-038 S-001 G-005; relaxed by owner facts A-030 (D-027) | PM-016 |
| R-011 | Encryption flaws, no key lifecycle | High | High | D-035 T-056 S-001; D-035 R5 | PM-010 AB-014 PM4-004 PM5-001 PM5-017 |
| R-012 | Quota, runtime or first-run overrun | Medium | Medium | D-024 T-044,T-047,T-048 S-000a,S-005 | PM-017 PM4-014 |
| R-013 | YouTube terms or account risk | High | Medium | D-038 G-001; CLOSED for release 1 by D-043 (YouTube Music removed, G-001 decided 2026-11-07) | PM-020 PM5-006 |
| R-014 | Stale status or silently disabled schedule | High | Medium | D-031 T-032,T-055 S-007; D-031 R5 | PM-005 AB-018 PM4-001 PM4-022 |
| R-015 | Stale cache IDs | Medium | Low | D-005,D-037 T-011,T-034,T-062 S-006 G-004 |  |
| R-016 | Plan controls omitted or mis-mapped | Medium | Medium | D-036 T-065 S-000b | PM-018 AB-021 PM5-012 PM5-014 |
| R-017 | Unverified pins and floating versions | Medium | Low | D-030 T-036,T-064 S-000a,S-008 | AB-022 |
| R-018 | Target-ID collision, ownership or capacity | High | Medium | D-023 T-051 S-005 | PM-001 AB-024 PM5-003 |
| R-019 | Secrets or account data leak through logs, artefacts or gate evidence | High | Medium | D-027 T-045,T-052 S-001,S-008; D-027 R5; relaxed by owner facts A-030 (D-027) | PM-002 AB-010 AB-011 PM4-006 PM4-021 |
| R-020 | Gates bypassable, circular or runnable from any branch | Critical | High | D-028,D-029 T-058,T-040 S-008,S-009 G-002a,G-002b; D-028 R5 (agent identity accepted, see R-043) | AB-012 AB-013 AB-015 PM4-001 PM4-002 PM4-003 |
| R-021 | Frozen tests hollow or tautological | Critical | High | D-036 T-065 S-000b; S-000b T-065 | AB-020 PM4-012 PM4-013 |
| R-022 | Concurrent runs or in-run duplicates | High | Medium | D-025 T-054,T-060 S-005; D-034 R5 | PM-004 AB-004 AB-006 PM4-010 PM4-016 |
| R-023 | Spotify refresh-token persistence | High | High | D-035 T-053 S-002; D-035 R5 | PM-003 PM4-005 PM4-009 PM5-005 PM5-002 |
| R-024 | Matching recall collapse or legacy mis-matches kept | High | Medium | D-032,D-037 T-061,T-062 S-004,S-006 G-006; D-032 R5 T-067 | PM-006 AB-008 AB-009 PM4-014 |
| R-025 | No guard on unsupervised additions after go-live | High | Medium | D-024 T-057 S-005; D-024 R5 | PM-015 PM4-011 |
| R-026 | Read-back aliasing and idempotency drift | High | High | D-034 T-016,T-060 S-005 | PM-008 AB-005 PM5-003 |
| R-027 | Recently Added semantics or chunk order | Medium | Low | D-033 T-009,T-018 S-004,S-005 | AB-007 AB-027 |
| R-028 | Job privilege and supply chain | Medium | Low | D-030 T-064 S-008 | PM-009 AB-022 |
| R-029 | Provider contract drift not caught by mocks | Medium | Medium | D-036 T-037,T-063 S-002,S-009 | PM-013 |
| R-030 | Legacy workflow fires during rebuild | Medium | Low | D-030 T-029 S-000a | PM-014 |
| R-031 | Off-repository state evicted | Medium | Low | D-035 T-056 S-001 | PM-011 |
| R-032 | Visibility choice (decided: repository stays public) | Low | Low | D-038 G-005; relaxed by owner facts A-030 (D-027) | PM-016 |
| R-033 | Open local Express server | High | Low | D-039 T-066 S-007; D-039 R5 | CR-010 AB-023 PM4-007 |
| R-034 | Legacy cache is demo data or failed-run cause unknown | Low | Low | D-037 T-062 S-000a,S-006 | PM-012 PM-019 |
| R-035 | Dry-run side effects | Medium | Medium | D-031 T-023,T-039 S-005,S-008 | AB-019 PM5-005 |
| R-036 | Public playlists (accepted by owner; they are public by choice) | Low | Low | D-023 G-002a; relaxed by owner facts A-030 (D-027) | AB-025 |
| R-037 | Process documents contradict each other | Low | Low | D-014 noted, not edited | AB-026 |
| R-038 | Genre routing undefined (Hip-Hop never written; ambiguous keywords) | Medium | Medium | D-040 T-069 | PM4-015 |
| R-039 | Owner cannot see unmatched or disagreement reports; unmatched never re-searched | Medium | Low | D-041 T-070 | PM4-019 AB-017 |
| R-040 | S-000a overloaded; recorded fixtures fall outside the freeze | Medium | Medium | S-000a,S-000b D-036 | PM4-012 PM4-013 |
| R-041 | Status deploy needs Pages privileges and Node and races deploy-pages.yml | Medium | High | D-030 D-031 | PM4-023 PM5-001 |
| R-042 | Local live runs bypass concurrency; queued runs are dropped | Medium | Medium | D-042 | PM4-016 |
| R-043 | Agent runs under the owner's admin credential, so it can approve its own gate and bypass branch protection | High | High | D-028 partial; separation deferred by owner 2026-11-07 (ACCEPTED RISK) | PM4-002 AB-012 |
| R-044 | Two Pages deployers overwrite status.json; rollback counter wedges or fails open | High | Medium | D-044 T-055,T-056,T-064 S-007,S-008 | PM5-001 PM5-017 |
| R-045 | Branch protection on main rejects the unattended state commit | High | Medium | D-045 T-030,T-064 S-000a,S-008; A-031 | PM5-002 |
| R-046 | Rehearsal state and secrets contaminate production; ledger keyed by target not playlist ID | High | Medium | D-046 T-051,T-060,T-071 S-005,S-008 | PM5-003 PM5-009 PM5-010 |
| R-047 | Gate-evidence test impossible while the agent acts as the owner; owner-only controls are agent-executable | High | High | D-028 R6 (honest approval channel; R-043 consequences enumerated) T-058 S-009 | PM5-004 PM5-018 |
| R-048 | Dry-run or canary refresh orphans the rotated Spotify token | High | Medium | D-047 T-023,T-053 S-002 | PM5-005 |
| R-049 | Legacy residue: Gemini key, Firebase/OAuth client, unrevoked YouTube secret | Medium | Low | D-048 T-064 S-001,S-008 | PM5-006 PM5-007 |
| R-050 | Test and checker mechanics: deferred handling, T-066 scope, red tests turn main red, checker blind spots | Medium | Low | D-036 T-064,T-065,T-066 S-000b | PM5-008 PM5-012 PM5-013 PM5-014 |
| R-051 | Nothing triggers the Pages deploy after a sync (cross-workflow needs, GITHUB_TOKEN pushes start no workflows) | High | Medium | D-051 T-055,T-064 S-008 | PM6-001 |
| R-052 | First live write to real playlists impossible: gate-rehearsal Environment bound to rehearsal mode | High | Medium | D-052 T-058,T-071 S-006,S-008,S-009 | PM6-002 |
| R-053 | Spotify Development Mode changes (linked_from removed, search cap 10, batch albums removed, Premium needed) break matching and identity | High | Low | D-050 T-061 S-000a,S-004 (fixtures from a Development Mode app; Premium needed); deferred with Spotify (D-057) | PM6-003 |
| R-054 | Scheduled workflows and their staleness alarm are disabled after 60 days of repository inactivity | High | Medium | D-053 T-055 S-000a,S-008 | PM6-004 |
| R-055 | Owner has no Spotify Premium, which Development Mode requires, so no live Spotify run is possible | High | Low | D-050 (hard prerequisite; owner must obtain Premium or decide otherwise) S-000a; deferred with Spotify (D-057) | PM6-003 A-032 |
| R-056 | TIDAL developer access, approval, cost or refresh-token behaviour differs from what the plan assumes | High | High | D-059,D-061 T-073 S-000a,S-002 | A-034 A-035 |
| R-057 | Apple Music needs a paid developer membership, a subscription and owner reauthorisation about every 180 days, so unattended runs stop | High | Low | D-060,D-061 T-074 S-000a,S-002; deferred with Apple Music (D-062) | A-036 A-037 |
| R-058 | Apple Music cannot remove playlist items, so Recently Added replacement cannot be done there | Medium | Low | D-060 T-074 S-000a; deferred with Apple Music (D-062) | A-038 |
| R-059 | Replan to two new providers is unreviewed and the provider-neutral interface hides provider differences | High | High | D-057,D-058 T-075 S-005 | R8 replan |
| R-060 | YouTube Data API quota, OAuth refresh-token expiry and weak matching (no ISRC or barcode lookup) make the YouTube target unreliable | High | High | D-063,D-064 T-074 S-000a,S-002,S-004 | A-039 A-040 |
| R-061 | YouTube first sync cannot finish on a weekly schedule at 50 quota units per insert | Critical | Critical | D-065 T-074 (fix applied R10, unreviewed) | PM7-001 |
| R-062 | A free TIDAL account probably cannot write playlists (free tier withdrawn), so TIDAL needs a paid plan | High | High | D-066 T-074 (fix applied R10, unreviewed) | PM7-002 |
| R-063 | No workable YouTube matching rule: no album, date, ISRC or barcode, so releases stay pending and burn search quota | High | High | D-067 T-074 (fix applied R10, unreviewed) | PM7-003 |
| R-064 | Weekly STALE alarms during the quota backlog train the owner to ignore alerts | High | High | D-068 T-074 (fix applied R10, unreviewed) | PM7-004 |
| R-065 | Circuit breaker allowance trips on queue draining | High | High | D-069 T-074 (fix applied R10, unreviewed) | PM7-005 |
| R-066 | Exit codes contradict provider isolation, so one provider's credential failure loses the other's progress | High | High | D-070 T-074 (fix applied R10, unreviewed) | PM7-006 |
