# S-000 — Intake and preflight

**Status: BLOCKED — HUMAN DECISION REQUIRED.** Active profile: software. Claims: 14 (verified 8, corroborated 0, single-source 6, inferred 0). Tests: 50 (36 unit, 14 integration/operational/security/performance/deployment). Steps: 12. Gates: 6. Risks: Critical 3, High 8, Medium 6, Low 0. Assumption audit: 3 confirmed, 0 falsified, 18 unverifiable. Code review: 3 Critical, 4 High, 3 Medium. Independent pre-mortem (R3, 2026-11-07): 20 risks, 0 Critical/9 High/8 Medium/3 Low residual. Independent adversarial review (2026-11-07): 27 breaks, 3 Critical/15 High/7 Medium/2 Low. Independent reports not yet reconciled into the register or plan; amendments pending owner approval. Mutation testing opted out (D-014).

## Goal and scope

Deliver a reliable, honest, private-by-default Discogs synchroniser for Spotify master + six genre playlists, Spotify Recently Added and YouTube Music master; weekly Sunday 03:00 UTC and manual; static read-only GitHub Pages; no paid hosting.

In scope: Python engine/provider adapters, safe OAuth, complete Discogs ingestion, conservative matching, per-target ledger, idempotent writes, guarded Recently Added replacement, encrypted state, Actions workflow, static dashboard, tests, operations and rollback.

Out of scope: public multi-user service, paid hosting, public API server, playlist creation, broad fuzzy matching, YouTube Music Recently Added, live writes/deploy during planning, history rewrite without G-005.

## Success criteria

1. Fetch every Discogs page or fail closed.
2. Per-target completion only after verified provider write/read-back.
3. Reruns create no duplicates.
4. Master/genre playlists remain add-only; Recently Added alone is replaced after top-20/max-100 validation.
5. Ambiguous matches remain unmatched.
6. Dry-run performs zero writes and no durable-state mutation.
7. Pages cannot fake sync or expose secrets/collection rows.
8. State is encrypted or stored outside the public repository.
9. Workflow uses least privilege and fails visibly.
10. All 50 frozen tests and security scans pass; Pages smoke/rollback pass.
11. Owner approves adapter, migration, history and live writes at the gates.

## Execution steps

- **S-000 Intake/preflight:** complete R0; probe hosts, pins, permissions and credential presence by name only. Done when prior knowledge, state, host probes and exact tool pins are complete.
- **S-001 Architecture/security:** map trust boundaries/public outputs; inventory public tree/history; design authenticated encryption/private state. Produce threat model and G-005 evidence.
- **S-002 Authentication:** supported Spotipy token cache/refresh and owner reauth; YouTube Music auth probe and G-001 choice; no writes.
- **S-003 Discogs ingestion:** complete pagination, bounded 429 handling, typed errors, schema validation and valid-empty distinction. T-001..T-004.
- **S-004 Matching:** deterministic normalization, unique exact artist/title, edition/year/track conflict rejection and manual overrides. T-005..T-009/T-033; G-006 for expanded rules.
- **S-005 Publisher/ledger:** per-target state, remote membership reconciliation, bounded retries, max-100 Spotify chunks; add-only master/genre; separate guarded Recently Added replacement. T-010/T-014..T-024/T-035.
- **S-006 Legacy migration:** encrypted backup, legacy rows unknown until read-back, migration report and G-004. T-011..T-013/T-034.
- **S-007 Dashboard:** remove fake sync and browser secret/token-exchange/Firebase/Drive paths; show actual Actions run status only. T-025/T-026/T-031..T-033/T-043.
- **S-008 Actions:** fix secrets-in-if, least privilege, failure semantics, lockfiles/pins, encryption and artifact postconditions; preserve schedule/manual dispatch. T-027..T-030/T-036/T-041.
- **S-009 Verification/release:** 50 tests, code/adversarial review, scans, Pages smoke/rollback and operations. G-002 before live write or production deploy.
- **S-RETRO:** compare final diff to plan, execution log and deviations; verify every control was delivered and no unlogged substitution remains.
- **S-KNOW:** prepare lesson/knowledge items, validate schema and secret scan, compile/review R7 source register; halt at G-003 before publishing to the separate stores.

## Blockers

R0 incomplete (223 indexed lessons/298 knowledge entries; only 13/8 read fully); R5 independent review run 2026-11-07 (27 breaks open); R6 live provider/registry tests not run; R7 licence/completeness review incomplete; independent Phase 4 pre-mortem run once (convergence not met; no amended round yet); 4.7 assumption audit still not independent. Critical/High risks remain. Do not implement until resolved. This plan is not protocol-v3.15 READY.