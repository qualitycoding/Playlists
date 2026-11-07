# Risk register
Rebuilt 2026-11-07 (R4) and updated after independent round 4. Severity is a combined likelihood-and-impact judgement. Inherent = before the plan's controls; residual = after the R4 amendments, planner estimate adjusted to the round-4 reviewer's ratings where they were higher; R5 changes are not yet applied. Ratings of R-001, R-003, R-010, R-011, R-014 follow the independent pre-mortem. Source IDs (PM4 = round-4 narratives): C claims, CR code review, PM independent pre-mortem, AB independent adversarial.
Totals: 43 risks. Inherent Critical 4, High 19, Medium 18, Low 2. Residual Critical 0, High 3, Medium 21, Low 19.
Convergence criterion 0 Critical/High residual: NOT met. High residuals: R-020 (Environment availability unverified; agent identity not separated), R-021 (no executable tests until S-000b) and R-043 (admin credential accepted by the owner 2026-11-07). R-006 and R-013 closed for release 1 by D-043. Residual ratings are planner estimates; no risk whose only control is an unwritten test deserves Low.

| ID | Risk | Inherent | Residual | Controls (decision, tests, steps, gates) | Sources |
|---|---|---|---|---|---|
| R-001 | Fake Pages success | High | Low | D-001,D-031 T-025,T-055 S-007 | C-009 CR-001 PM-005 |
| R-002 | False cache/ledger success after write failure | Critical | Medium | D-006,D-034 T-014,T-016,T-060 S-005 | C-008 CR-003 AB-005 |
| R-003 | Public collection exposure in repo, state or cache | High | Medium | D-004,D-035,D-038 T-045,T-056 S-001,S-006 G-005 | C-011 CR-002 |
| R-004 | Discogs partial or drifting data | High | Low | D-012,D-034 T-001..T-004,T-044 S-003 | CR-004 AB-001 AB-002 |
| R-005 | Spotify OAuth startup failure | High | Medium | D-013,D-035 T-020,T-021,T-053 S-002; D-035 T-068 | CR-005 PM4-008 |
| R-006 | YouTube Music unofficial auth fragility | High | Low | D-018,D-038 T-022,T-063 S-002 G-001; CLOSED for release 1 by D-043 (YouTube Music removed, G-001 decided 2026-11-07) | AB-017 |
| R-007 | Weekly workflow failure or silent skip | High | Medium | D-030,D-026,D-037 T-027,T-028,T-059,T-064 S-000,S-008 | CR-006 AB-003 AB-016 PM-019 |
| R-008 | Wrong album match | High | Medium | D-008,D-032 T-005..T-009,T-061 S-004 G-006 | CR-007 AB-008 |
| R-009 | Recently Added data loss | High | Low | D-010,D-033,D-023 T-018,T-051 S-005 | PM-001 PM-007 AB-007 |
| R-010 | Public git history retains rows | Medium | Medium | D-019,D-038 S-001 G-005 | PM-016 |
| R-011 | Encryption flaws, no key lifecycle | High | Medium | D-035 T-056 S-001; D-035 R5 | PM-010 AB-014 PM4-004 |
| R-012 | Quota, runtime or first-run overrun | Medium | Medium | D-024 T-044,T-047,T-048 S-000,S-005 | PM-017 PM4-014 |
| R-013 | YouTube terms or account risk | High | Low | D-038 G-001; CLOSED for release 1 by D-043 (YouTube Music removed, G-001 decided 2026-11-07) | PM-020 |
| R-014 | Stale status or silently disabled schedule | High | Medium | D-031 T-032,T-055 S-007; D-031 R5 | PM-005 AB-018 PM4-001 PM4-022 |
| R-015 | Stale cache IDs | Medium | Low | D-005,D-037 T-011,T-034,T-062 S-006 G-004 |  |
| R-016 | Plan controls omitted or mis-mapped | Medium | Low | D-036 T-065 S-000 | PM-018 AB-021 |
| R-017 | Unverified pins and floating versions | Medium | Low | D-030 T-036,T-064 S-000,S-008 | AB-022 |
| R-018 | Target-ID collision, ownership or capacity | High | Low | D-023 T-051 S-005 | PM-001 AB-024 |
| R-019 | Collection rows leak through logs, artefacts or gate evidence | Critical | Medium | D-027 T-045,T-052 S-001,S-008; D-027 R5 | PM-002 AB-010 AB-011 PM4-006 PM4-021 |
| R-020 | Gates bypassable, circular or runnable from any branch | Critical | High | D-028,D-029 T-058,T-040 S-008,S-009 G-002a,G-002b; D-028 R5 (agent identity accepted, see R-043) | AB-012 AB-013 AB-015 PM4-001 PM4-002 PM4-003 |
| R-021 | Frozen tests hollow or tautological | Critical | High | D-036 T-065 S-000; S-000b T-065 | AB-020 PM4-012 PM4-013 |
| R-022 | Concurrent runs or in-run duplicates | High | Medium | D-025 T-054,T-060 S-005; D-034 R5 | PM-004 AB-004 AB-006 PM4-010 PM4-016 |
| R-023 | Spotify refresh-token persistence | High | Medium | D-035 T-053 S-002; D-035 R5 | PM-003 PM4-005 PM4-009 |
| R-024 | Matching recall collapse or legacy mis-matches kept | High | Medium | D-032,D-037 T-061,T-062 S-004,S-006 G-006; D-032 R5 T-067 | PM-006 AB-008 AB-009 PM4-014 |
| R-025 | No guard on unsupervised additions after go-live | High | Medium | D-024 T-057 S-005; D-024 R5 | PM-015 PM4-011 |
| R-026 | Read-back aliasing and idempotency drift | High | Medium | D-034 T-016,T-060 S-005 | PM-008 AB-005 |
| R-027 | Recently Added semantics or chunk order | Medium | Low | D-033 T-009,T-018 S-004,S-005 | AB-007 AB-027 |
| R-028 | Job privilege and supply chain | Medium | Low | D-030 T-064 S-008 | PM-009 AB-022 |
| R-029 | Provider contract drift not caught by mocks | Medium | Medium | D-036 T-037,T-063 S-002,S-009 | PM-013 |
| R-030 | Legacy workflow fires during rebuild | Medium | Low | D-030 T-029 S-000 | PM-014 |
| R-031 | Off-repository state evicted | Medium | Low | D-035 T-056 S-001 | PM-011 |
| R-032 | Private visibility conflicts with free Pages | Medium | Medium | D-038 G-005 | PM-016 |
| R-033 | Open local Express server | High | Low | D-039 T-066 S-007; D-039 R5 | CR-010 AB-023 PM4-007 |
| R-034 | Legacy cache is demo data or failed-run cause unknown | Low | Low | D-037 T-062 S-000,S-006 | PM-012 PM-019 |
| R-035 | Dry-run side effects | Medium | Low | D-031 T-023,T-039 S-005,S-008 | AB-019 |
| R-036 | Public playlists defeat privacy | Medium | Low | D-023 G-002a | AB-025 |
| R-037 | Process documents contradict each other | Low | Low | D-014 noted, not edited | AB-026 |
| R-038 | Genre routing undefined (Hip-Hop never written; ambiguous keywords) | Medium | Medium | D-040 T-069 | PM4-015 |
| R-039 | Owner cannot see unmatched or disagreement reports; unmatched never re-searched | Medium | Low | D-041 T-070 | PM4-019 AB-017 |
| R-040 | S-000 overloaded; recorded fixtures fall outside the freeze | Medium | Medium | S-000a,S-000b D-036 | PM4-012 PM4-013 |
| R-041 | Status deploy needs Pages privileges and Node and races deploy-pages.yml | Medium | Medium | D-030 D-031 | PM4-023 |
| R-042 | Local live runs bypass concurrency; queued runs are dropped | Medium | Medium | D-042 | PM4-016 |
| R-043 | Agent runs under the owner's admin credential, so it can approve its own gate and bypass branch protection | High | High | D-028 partial; separation deferred by owner 2026-11-07 (ACCEPTED RISK) | PM4-002 AB-012 |
