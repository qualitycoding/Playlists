# Traceability
Rebuilt 2026-11-07 (R4). Every success criterion has a row; every T-ID in tests/TEST_PLAN.md appears in the test table with exactly one step. Checked by plan/tools/check_plan_consistency.py (T-065).

## Success criteria

| # | Requirement | Tests | Steps | Decisions | Evidence | Gates |
|---|---|---|---|---|---|---|
| 1 | Fetch every Discogs page or fail closed | T-001,T-002,T-003,T-004,T-044 | S-003 | D-012,D-034 | C-007 CR-004 AB-001 AB-002 | — |
| 2 | Per-target completion only after verified write/read-back | T-009,T-010,T-014,T-015,T-024,T-035,T-038,T-043,T-060,T-063 | S-005 | D-006,D-007,D-034 | C-008 AB-005 AB-017 | G-001 |
| 3 | Reruns and overlapping runs create no duplicates | T-016,T-054,T-060,T-017 | S-005 | D-025,D-034 | PM-004 AB-004 AB-006 | — |
| 4 | Master/genre add-only; Recently Added alone replaced under D-033 | T-017,T-018,T-051,T-057 | S-005 | D-009,D-010,D-023,D-024,D-033 | PM-001 PM-007 PM-015 | — |
| 5 | Ambiguous matches remain unmatched | T-005,T-006,T-007,T-008,T-033,T-061 | S-004 | D-008,D-032 | A-007 CR-007 | G-006 |
| 6 | Dry-run performs zero writes and no durable-state mutation | T-023,T-039 | S-005,S-008 | D-026,D-031 | AB-019 | — |
| 7 | Pages, logs, artefacts and gate evidence cannot fake sync or expose secrets or collection rows | T-025,T-026,T-031,T-032,T-041,T-045,T-052,T-066 | S-001,S-007,S-009 | D-001,D-003,D-027,D-039 | C-004 C-009 PM-002 AB-011 | G-002a |
| 8 | State encrypted or outside the public repository, with key lifecycle | T-011,T-012,T-013,T-053,T-056 | S-001,S-002,S-006 | D-004,D-035 | C-011 PM-010 AB-014 | G-004,G-005 |
| 9 | Workflow uses least privilege and fails visibly | T-019,T-020,T-021,T-022,T-027,T-028,T-029,T-030,T-036,T-042,T-058,T-059,T-064 | S-008 | D-020,D-026,D-028,D-030 | C-003 C-010 C-013 AB-003 AB-016 | — |
| 10 | All 66 frozen tests and security scans pass; Pages smoke and rollback pass | T-037,T-045,T-046,T-047,T-048,T-049,T-050,T-065 | S-000,S-009 | D-036 | AB-020 AB-021 | G-002a,G-002b |
| 11 | Owner approves adapter, migration, history and live writes at the gates | T-034,T-040,T-058 | S-009 | D-028,D-029,D-038 | AB-012 AB-013 | G-001..G-006 |
| 12 | Matching precision and recall reported against a labelled fixture with an agreed floor | T-061,T-062 | S-004,S-006 | D-032 | PM-006 AB-008 | G-006,G-002b |
| 13 | A stale status is visible (STALE after 8 days) | T-055,T-032 | S-007 | D-031 | PM-005 AB-018 | — |

## Tests

| Test | Step | Criteria |
|---|---|---|
| T-001 | S-003 | 1 |
| T-002 | S-003 | 1 |
| T-003 | S-003 | 1 |
| T-004 | S-003 | 1 |
| T-005 | S-004 | 5 |
| T-006 | S-004 | 5 |
| T-007 | S-004 | 5 |
| T-008 | S-004 | 5 |
| T-009 | S-004 | 2 |
| T-010 | S-005 | 2 |
| T-011 | S-006 | 8 |
| T-012 | S-006 | 8 |
| T-013 | S-006 | 8 |
| T-014 | S-005 | 2 |
| T-015 | S-005 | 2 |
| T-016 | S-005 | 3 |
| T-017 | S-005 | 3,4 |
| T-018 | S-005 | 4 |
| T-019 | S-005 | 9 |
| T-020 | S-002 | 9 |
| T-021 | S-002 | 9 |
| T-022 | S-002 | 9 |
| T-023 | S-005 | 6 |
| T-024 | S-005 | 2 |
| T-025 | S-007 | 7 |
| T-026 | S-007 | 7 |
| T-027 | S-008 | 9 |
| T-028 | S-008 | 9 |
| T-029 | S-008 | 9 |
| T-030 | S-008 | 9 |
| T-031 | S-007 | 7 |
| T-032 | S-007 | 7,13 |
| T-033 | S-004 | 5 |
| T-034 | S-006 | 11 |
| T-035 | S-005 | 2 |
| T-036 | S-008 | 9 |
| T-037 | S-009 | 10 |
| T-038 | S-005 | 2 |
| T-039 | S-008 | 6 |
| T-040 | S-009 | 11 |
| T-041 | S-007 | 7 |
| T-042 | S-008 | 9 |
| T-043 | S-005 | 2 |
| T-044 | S-003 | 1 |
| T-045 | S-009 | 7,10 |
| T-046 | S-009 | 10 |
| T-047 | S-009 | 10 |
| T-048 | S-009 | 10 |
| T-049 | S-009 | 10 |
| T-050 | S-009 | 10 |
| T-051 | S-005 | 4 |
| T-052 | S-001 | 7 |
| T-053 | S-002 | 8 |
| T-054 | S-005 | 3 |
| T-055 | S-007 | 13 |
| T-056 | S-001 | 8 |
| T-057 | S-005 | 4 |
| T-058 | S-008 | 9,11 |
| T-059 | S-005 | 9 |
| T-060 | S-005 | 2,3 |
| T-061 | S-004 | 5,12 |
| T-062 | S-006 | 12 |
| T-063 | S-002 | 2 |
| T-064 | S-008 | 9 |
| T-065 | S-000 | 10 |
| T-066 | S-007 | 7 |

## Steps without tests

S-RETRO and S-KNOW own no tests; S-RETRO re-runs T-065 and the final mechanical check, S-KNOW is covered by T-045 and G-003.
