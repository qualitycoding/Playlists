#!/usr/bin/env python3
"""Read-only plan consistency check (supports T-065). Run: python3 -I plan/tools/check_plan_consistency.py <repo-root>"""
import hashlib, json, re, sys
from collections import Counter
from pathlib import Path
root = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
def rd(p): return (root / p).read_text(encoding="utf-8")
errs = []
def expand(s):
    out = set()
    for a, b in re.findall(r"T-(\d{3})\.\.T?-?(\d{3})", s): out |= {f"{i:03d}" for i in range(int(a), int(b) + 1)}
    out |= set(re.findall(r"T-(\d{3})", re.sub(r"T-\d{3}\.\.T?-?\d{3}", "", s)))
    return out
tp = rd("tests/TEST_PLAN.md"); plan = rd("plan/PLAN.md"); tr = rd("plan/TRACEABILITY.md")
ids = sorted(set(re.findall(r"\bT-(\d{3})\b", tp)))
rows = re.findall(r"^\| T-(\d{3}) \| (S-[A-Za-z0-9]+) \| ([^|]+) \|", tr, re.M)
mapped = [i for i, _, _ in rows]
for i in ids:
    if mapped.count(i) != 1: errs.append(f"T-{i} mapped {mapped.count(i)} times in TRACEABILITY")
for i in set(mapped) - set(ids): errs.append(f"T-{i} in TRACEABILITY but not TEST_PLAN")
for i, _, crit in rows:
    if crit.strip() == "—": errs.append(f"T-{i} maps to no success criterion")
steps = re.findall(r"^- \*\*(S-[A-Za-z0-9]+)", plan, re.M)
for _, s, _ in rows:
    if s not in steps: errs.append(f"unknown step {s}")
# step test lists in PLAN equal TRACEABILITY
for m in re.finditer(r"^- \*\*(S-\d{3}[ab]?)[^\n]*", plan, re.M):
    listed = expand(m.group(0)); actual = {i for i, s, _ in rows if s == m.group(1)}
    if listed != actual: errs.append(f"{m.group(1)} tests differ: PLAN-only {sorted(listed-actual)} TRACEABILITY-only {sorted(actual-listed)}")
# criteria
crit_plan = len(re.findall(r"^\d+\. ", plan.split("## Success criteria")[1].split("## Execution")[0], re.M))
crit_tr = len(re.findall(r"^\| \d+ \|", tr, re.M))
if crit_plan != crit_tr: errs.append(f"criteria PLAN {crit_plan} vs TRACEABILITY {crit_tr}")
# header counts
m = re.search(r"Tests: (\d+) \((\d+) unit, (\d+) ", plan)
seg = lambda a, b: set(re.findall(r"T-(\d{3})", tp[tp.index(a):tp.index(b)]))
unit = seg("Unit T-001", "Integration/ops") | seg("R4 new unit", "R4/R5 new integration")
other = seg("Integration/ops", "R4 new unit") | seg("R4/R5 new integration", "All provider tests")
if not m or (int(m[1]), int(m[2]), int(m[3])) != (len(ids), len(unit), len(other)): errs.append(f"PLAN test split {m and m.groups()} vs derived {(len(ids), len(unit), len(other))}")
m = re.search(r"Steps: (\d+)", plan)
if not m or int(m[1]) != len(steps): errs.append(f"PLAN steps header {m and m[1]} vs {len(steps)}")
dec = rd("plan/DECISIONS.md"); dids = sorted(set(re.findall(r"^D-(\d{3})", dec, re.M)))
m = re.search(r"Decisions: (\d+)", plan)
if not m or int(m[1]) != len(dids): errs.append(f"PLAN decisions header {m and m[1]} vs {len(dids)}")
reg = rd("premortem/RISK_REGISTER.md")
tab = [[c.strip() for c in l.strip("|").split("|")] for l in reg.splitlines() if re.match(r"^\| R-\d{3} \|", l)]
inh = Counter(r[2] for r in tab); res = Counter(r[3] for r in tab)
fmt = lambda c: f"Critical {c['Critical']}, High {c['High']}, Medium {c['Medium']}, Low {c['Low']}"
m = re.search(r"Totals: (\d+) risks\. Inherent (.*?)\. Residual (.*?)\.", reg)
if not m or (int(m[1]), m[2], m[3]) != (len(tab), fmt(inh), fmt(res)): errs.append("register totals line differs from table")
m = re.search(r"Risks: (\d+); inherent (.*?); residual .*?\) (Critical .*?)\. Assumption", plan)
if not m or (int(m[1]), m[2], m[3]) != (len(tab), fmt(inh), fmt(res)): errs.append("PLAN risk header differs from register table")
claims = json.loads(rd("research/claims.json")); conf = [c["confidence"] for c in claims]
m = re.search(r"verified (\d+), corroborated (\d+), single-source (\d+)", plan)
if not m or (int(m[1]), int(m[3])) != (conf.count("verified"), conf.count("single-source")): errs.append("PLAN claims header differs from claims.json")
# cited IDs exist
am = rd("plan/AMENDMENTS.md")
for d in set(re.findall(r"\bD-(\d{3})\b", am + reg + tr)):
    if d not in dids: errs.append(f"cites missing D-{d}")
for t in set(re.findall(r"\bT-(\d{3})\b", am + reg + plan + tr)):
    if t not in ids: errs.append(f"cites missing T-{t}")
# referenced files exist
for pth in set(re.findall(r"\b((?:premortem|reviews|plan|research|tests)/[\w./-]+\.(?:md|json|py|sha256))", plan + am + rd("HANDOFF.md"))):
    if not (root / pth).exists(): errs.append(f"missing referenced file {pth}")
# manifest: hashes match and every test file is covered, except allow-listed legacy files
listed = set()
for line in rd("tests/FROZEN_MANIFEST.sha256").splitlines():
    h, p = line.split(None, 1); p = p.strip().lstrip("*"); listed.add(p)
    if hashlib.sha256((root / p).read_bytes()).hexdigest() != h: errs.append(f"manifest mismatch {p}")
LEGACY = {"tests/test_sync.py"}  # hashed only after the S-000 rewrite (D-036)
for f in (root / "tests").rglob("*"):
    rel = f.relative_to(root).as_posix()
    if f.is_file() and rel not in listed and rel != "tests/FROZEN_MANIFEST.sha256" and rel not in LEGACY and "__pycache__" not in rel: errs.append(f"{rel} not in manifest")

# S and G IDs cited in plan documents must exist
step_ids = set(steps)
gate_ids = set(re.findall(r"\bG-\d{3}[ab]?\b", rd("plan/GATES.md")))
for f in ["plan/AMENDMENTS.md", "premortem/RISK_REGISTER.md", "plan/TRACEABILITY.md", "plan/PLAN.md", "plan/DECISIONS.md", "HANDOFF.md"]:
    txt = rd(f)
    for sid in set(re.findall(r"\bS-\d{3}[ab]?\b", txt)):
        if sid not in step_ids: errs.append(f"{f} cites missing step {sid}")
    for gid in set(re.findall(r"\bG-\d{3}[ab]?\b", txt)):
        if gid not in gate_ids: errs.append(f"{f} cites missing gate {gid}")
# deferred tests (D-043): declared lines exist, IDs valid, no criterion relies only on deferred tests
m1 = re.search(r"Deferred in full \(D-043\): ([^.]*)\.", tp); m2 = re.search(r"Partly deferred \(D-043\): ([^.]*)\.", tp)
full = set(re.findall(r"T-(\d{3})", m1.group(1))) if m1 else set()
part = set(re.findall(r"T-(\d{3})", m2.group(1))) if m2 else set()
if not m1 or not m2: errs.append("TEST_PLAN lacks the deferred-test lines")
for t in full | part:
    if t not in ids: errs.append(f"deferred T-{t} not in TEST_PLAN")
for l in tr.splitlines():
    mm = re.match(r"^\| (\d+) \| [^|]* \| ([^|]*) \|", l)
    if mm and not (expand(mm.group(2)) - full): errs.append(f"criterion {mm.group(1)} relies only on deferred tests")
# YouTube text must be marked (D-043 / deferred / removed) or sit in an allowed decision line
ALLOW = ("D-011", "D-018", "D-038", "D-043", "G-001", "A-006")
for f in ["plan/PLAN.md", "plan/DECISIONS.md", "plan/GATES.md", "plan/OPERATIONS.md", "plan/ASSUMPTIONS.md", "plan/TRACEABILITY.md", "tests/TEST_PLAN.md", "HANDOFF.md"]:
    for i, l in enumerate(rd(f).splitlines(), 1):
        if re.search(r"YouTube|ytmusic|YT Music|YTMUSIC", l) and not re.search(r"D-043|deferred|removed|moot", l) and not l.startswith(ALLOW):
            errs.append(f"{f}:{i} mentions YouTube without a D-043 mark")
# superseded phrases must not survive outside history files
STALE = ("SPOTIFY_REAUTH_AT", "serves G-002a and the first G-002b run", "first G-002b run also uses the gate-rehearsal", "request K results", "uniqueness over all K.", "over K results", "cap K,", "caps K.", "x K tracks", "added through a PR approved", "reviewed PR to main", "deploy needs commit success only", "Reauth marker secret", "is the Environment secret")
for f in ["plan/PLAN.md", "plan/DECISIONS.md", "plan/GATES.md", "plan/OPERATIONS.md", "plan/ASSUMPTIONS.md", "plan/TRACEABILITY.md", "tests/TEST_PLAN.md", "HANDOFF.md"]:
    for i, l in enumerate(rd(f).splitlines(), 1):
        for ph in STALE:
            if ph in l and "[superseded" not in l:
                errs.append(f"{f}:{i} stale phrase: {ph}")
print(f"tests={len(ids)} (unit {len(unit)}, other {len(other)}) steps={len(steps)} decisions={len(dids)} risks={len(tab)} criteria={crit_tr}")
print("OK" if not errs else "FAIL:\n" + "\n".join(errs)); sys.exit(1 if errs else 0)
