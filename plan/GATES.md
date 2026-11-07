# Gates
Six gate IDs; G-002 has stages a and b (D-029). Each gate halts and requires a committed GATE-<id>.md that holds redacted evidence only (counts, hashes, run URLs; D-027) and was added by a commit authored or approved by the owner (D-028). Raw evidence stays in encrypted state or a short-retention artefact.

G-001 before YT Music writes: compare ytmusicapi (unofficial) and the official YouTube Data API; owner chooses, accepts or removes. Evidence states the blast radius of the credential (whole Google-account session) and requires a dedicated or Brand account, or removal (D-038).
G-002a before any live provider write (disposable private playlists only) and before a preview Pages deploy: green CI, redacted dry-run diff, targets distinct, owned and private (D-023), idempotency and rollback evidence, circuit-breaker caps (D-024), Environment and required-reviewer configuration verified (D-028); owner approves. T-040 and the preview Pages smoke run after this gate.
G-002b before the first write to the real playlists, the production Pages deploy and re-enabling of the schedule: G-002a evidence, T-040 and preview smoke passed, matching precision and recall report meeting the agreed floor (D-032), owner approves.
G-003 before lesson/knowledge push: schema/secret scan, R7 register; owner confirms stores and decides whether the planning-run copies in the product repository are removed (D-038).
G-004 before cache migration: backup/checksum, remote read-back, duplicate report, legacy-match disagreement report (D-032, D-037); owner approves.
G-005 before history rewrite/force push/purge/visibility change: exposure inventory (including Actions logs and artefacts), impact of each option including the Pages and separate-private-state-repository trade-offs (D-038), backup; owner approves.
G-006 before matching beyond exact unique: labelled fixture precision and recall report; owner approves.
