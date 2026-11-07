# Amendments R4
Maps each finding of the independent pre-mortem (PM) and adversarial review (AB) to the plan change that answers it. Date 2026-11-07. A mapping is a claim that the plan text addresses the finding, not evidence it works; round 4 re-checks it.

| Finding | Decision | Tests | Step/Gate | Note |
|---|---|---|---|---|
| PM-001 | D-023 | T-051 | S-005 |  |
| PM-002 | D-027 | T-052,T-045 | S-001,S-008 |  |
| PM-003 | D-035 | T-053 | S-002 | A-023 unverified |
| PM-004 | D-025 | T-054,T-027 | S-005,S-008 |  |
| PM-005 | D-031 | T-055,T-032 | S-007 | A-024 unverified |
| PM-006 | D-032 | T-061 | S-004 | recall floor value is an owner decision at G-006 |
| PM-007 | D-033 | T-018 | S-005 |  |
| PM-008 | D-034 | T-016,T-060 | S-005 |  |
| PM-009 | D-030 | T-064 | S-008 |  |
| PM-010 | D-035 | T-056 | S-001 |  |
| PM-011 | D-035 | T-056 | S-001 |  |
| PM-012 | D-037 | T-062 | S-006 |  |
| PM-013 | D-036 | T-063,T-037 | S-009 |  |
| PM-014 | D-030 | T-029 | S-000 |  |
| PM-015 | D-024 | T-057 | S-005 | K unmeasured (A-026) |
| PM-016 | D-038 | — | G-005 | OWNER DECISION open (visibility versus free Pages) |
| PM-017 | D-024 | T-047 | S-000,S-005 | A-028 unmeasured |
| PM-018 | D-030,D-036 | T-065 | S-000 | traceability rebuilt; Python version chosen in S-000 |
| PM-019 | D-037 | — | S-000 | diagnosis performed in S-000 |
| PM-020 | D-038 | T-022 | G-001 | OWNER DECISION open (dedicated account or removal) |
| AB-001 | D-034 | T-001,T-002 | S-003 |  |
| AB-002 | D-034 | T-004 | S-003 |  |
| AB-003 | D-026 | T-028,T-059 | S-005,S-008 |  |
| AB-004 | D-025 | T-054 | S-005 |  |
| AB-005 | D-034 | T-060 | S-005 | provider relinking behaviour unverified |
| AB-006 | D-025 | T-060 | S-005 |  |
| AB-007 | D-033 | T-018 | S-005 |  |
| AB-008 | D-032 | T-005,T-006,T-061 | S-004 |  |
| AB-009 | D-032,D-037 | T-062 | S-006 |  |
| AB-010 | D-027,D-038 | T-052 | S-001 |  |
| AB-011 | D-027 | T-052,T-045 | S-008 |  |
| AB-012 | D-028 | T-058 | S-008 | A-022 unverified |
| AB-013 | D-029 | T-040 | S-009 |  |
| AB-014 | D-035 | T-056 | S-001 |  |
| AB-015 | D-028 | T-027,T-058 | S-008 |  |
| AB-016 | D-030 | T-064 | S-008 |  |
| AB-017 | D-036 | T-022,T-063 | S-002 |  |
| AB-018 | D-031 | T-055 | S-007 |  |
| AB-019 | D-031 | T-023,T-039 | S-005,S-008 |  |
| AB-020 | D-036 | T-065 | S-000 | PARTIAL: executable red tests are not written yet; they are the last action of S-000 |
| AB-021 | D-036 | T-065 | S-000 | counts corrected; T-035/T-043 clarified; ADDENDUM-V3.9-STATUS left unedited |
| AB-022 | D-030 | T-064 | S-008 |  |
| AB-023 | D-039 | T-066 | S-007 |  |
| AB-024 | D-023 | T-051 | S-005 | A-025 unverified |
| AB-025 | D-023 | — | G-002a |  |
| AB-026 | — | — | — | NOT ADDRESSED: noted only (D-014 stands; ADDENDUM-V3.9-STATUS and MUTATION.md unedited) |
| AB-027 | — | T-009 | S-004 |  |

## Open after amendment
- Owner decisions: PM-016 (repository visibility versus free Pages), PM-020 (ytmusicapi account or removal), recall floor value, Environment alternative if unavailable (A-022).
- Partial: AB-020 (executable red tests and full-file manifest happen in S-000).
- Not addressed: AB-026.
- Unverified assumptions A-022..A-028 are carried as risks, not facts.

## R5 (answers to round 4; applied 2026-11-07, not yet reviewed)

| Finding | Decision | Tests | Step/Gate | Note |
|---|---|---|---|---|
| PM4-001 | D-028,D-029 | T-058 | S-008 | two Environments; schedule runs unattended after G-002b |
| PM4-002 | D-028 | — | — | DEFERRED BY OWNER: admin credential kept; ACCEPTED RISK R-043; AB-012 stays open |
| PM4-003 | D-028 | T-058 | S-008 | all secrets Environment-scoped; guard no longer the control |
| PM4-004 | D-035,D-031 | T-056,T-055 | S-001,S-007 | order and counter source defined; re-anchor procedure |
| PM4-005 | D-030,D-035 | T-053,T-059 | S-008 | if: always() and generation check |
| PM4-006 | D-027 | T-052 | S-001,S-008 | relaxed 2026-11-07: collection and playlists are public (A-030), so only secrets and account data are kept out; the state artefact stays ciphertext |
| PM4-007 | D-039 | T-066 | S-007 | server.ts deleted |
| PM4-008 | D-035 | T-068 | S-002 | setup scripts |
| PM4-009 | D-035 | T-053 | S-002 | token precedence |
| PM4-010 | D-034 | T-060 | S-005 | cross-release URI ledger |
| PM4-011 | D-024 | T-057 | S-005 | re-anchor baseline |
| PM4-012 | D-032,D-036 | T-061,T-067 | S-002,S-004 | private report split; fixture freeze point at end of S-002 |
| PM4-013 | D-036 | T-065 | S-000a,S-000b | S-000 split |
| PM4-014 | D-032 | T-061,T-067 | S-004 | track, year and Various rules; master-lookup budget; floor at G-002b only |
| PM4-015 | D-040 | T-069 | S-004 | explicit genre map |
| PM4-016 | D-042 | T-058 | S-008 | live mode only in Actions on main; pending-run behaviour documented |
| PM4-017 | D-033,D-034 | T-018 | S-005 | over-100-track albums; minimum fill; Recently Added exemption |
| PM4-018 | D-023,D-035 | T-051 | S-002 | unknown privacy is non-private; reauth scheduled |
| PM4-019 | D-041 | T-070 | S-006 | owner report command; periodic re-search |
| PM4-020 | D-036 | T-065 | S-000b | checker extended in R4 commit |
| PM4-021 | D-027 | — | — | metadata leak accepted by design |
| PM4-022 | D-031 | T-055 | S-007 | issue-opening check workflow |
| PM4-023 | D-030,D-031 | T-064,T-055 | S-008 | deploy job without Node; shared Pages concurrency group |

Open after R5: PM4-002/AB-012 (agent identity, accepted risk R-043), owner decisions (G-001 account, visibility versus Pages, recall floor, Environment availability), executable red tests (S-000b), independent assumption audit, round 5.

## G-001 (2026-11-07)
PM-020 and R-006/R-013 resolved for release 1 by D-043 (YouTube Music removed); see GATE-G-001.md. AB-017 YouTube parts, PM4-018 YouTube ownership check and T-007/T-022 are deferred with it.

## Privacy facts (2026-11-07)
Owner stated the Discogs collection and Spotify playlists are public; the repository is public (API-verified). D-027 relaxed, D-023 and D-035 scope wording corrected (playlist-modify-public must stay for public playlists), PM-016 resolved (repository stays public; no visibility change planned), R-003/R-010/R-019/R-032/R-036 re-rated.
