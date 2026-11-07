# BLOCKED — HUMAN DECISION REQUIRED

Profiles: software. Claims 14 (verified 7, corroborated 0, single-source 7, inferred 0). Tests 50 (36 unit, 14 integration/operational/security/performance/deployment). Steps 11. Gates 6. Risks Critical 3, High 6, Medium 5, Low 2. Assumption audit 0 confirmed/0 falsified/21 unverifiable. Code review 3 Critical, 4 High, 3 Medium. Independent adversarial review not run. Mutation testing opted out (D-014).

## Goal
Reliable private-by-default Discogs sync to Spotify master + six genres, Spotify Recently Added, YT Music master; weekly Sunday 03:00 UTC + manual; static read-only Pages; no paid hosting.

## Scope
In: Python sync/provider adapters, OAuth, full Discogs ingestion, conservative matching, per-target ledger, idempotent writes, guarded Recently Added replacement, encrypted state, Actions, static dashboard, tests/operations/rollback.
Out: public multi-user service, paid hosting, public API server, playlist creation, broad fuzzy matching, YT Recently Added, live writes/deploy during planning, history rewrite without G-005.

## Success
1. Fetch all Discogs pages or fail closed.
2. Per-target completion only after verified write/read-back.
3. Reruns create no duplicates.
4. Master/genre add-only; Recently Added only replaced after top20/max100 validation.
5. Ambiguous matches unmatched.
6. Dry-run zero writes and durable-state mutation.
7. Pages cannot fake sync or expose secrets/collection rows.
8. State encrypted or outside public repo.
9. Workflow least privilege and visible failure.
10. All 50 tests + scans + Pages smoke/rollback pass.
11. Owner approves adapter, migration, history and live writes at gates.

## Steps
S-000 complete R0, probe hosts, pins, permissions and credentials by name only.
S-001 map trust boundaries/public outputs, inventory public tree/history, design encryption/state location; G-005 evidence.
S-002 supported Spotipy token cache/refresh, owner reauth, YT auth probe/G-001; no writes.
S-003 Discogs pagination, bounded 429, typed errors/schema/empty distinction; T-001..004.
S-004 normalization, unique exact match, edition/year/track conflict rejection, manual overrides; T-005..009/T-033; G-006.
S-005 per-target ledger, remote membership reconcile, bounded retries, max100 Spotify; add-only master/genre, separate guarded Recently Added; T-010/T-014..024/T-035.
S-006 encrypted backup, legacy rows unknown, read-back/migration report; G-004; T-011..013/T-034.
S-007 remove fake sync/secret entry/token exchange/Firebase/Drive paths; read-only actual Actions status; T-025/026/031..033/043.
S-008 fix secrets-in-if, least privilege, failure semantics, lockfiles/pins, encryption, postconditions; preserve schedule/dispatch; T-027..030/T-036/T-041.
S-009 50 tests, code/adversarial review, scans, Pages smoke/rollback, operations; G-002 before live write/deploy.
S-RETRO diff/log/deviation completeness. S-KNOW prepare items/register, schema+secret scan; G-003 before store publication.

## Blockers
R0 incomplete (223 indexed lessons/298 knowledge; only 13/8 read fully); R5 independent review unavailable; R6 live provider/registry tests not run; R7 licence/completeness review incomplete; no independent Phase 4/4.7 audit. Critical/High risks remain. Do not implement until resolved. Not protocol-v3.15 READY.
