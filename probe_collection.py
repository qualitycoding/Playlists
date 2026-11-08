import json, sys, time, urllib.request, collections, random
U = "drboots"
H = {"User-Agent": "PlaylistsS000aProbe/1.0 +https://github.com/qualitycoding/Playlists"}
def get(url):
    for a in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=H), timeout=30) as r:
                return json.load(r)
        except Exception as e:
            err = str(e); time.sleep(5 * (a + 1))
    raise RuntimeError(err)
base = f"https://api.discogs.com/users/{U}/collection/folders/0/releases?per_page=100&page="
d = get(base + "1"); pages = d["pagination"]["pages"]; items = d["pagination"]["items"]
rel = list(d["releases"])
for p in range(2, pages + 1):
    time.sleep(2.6); rel += get(base + str(p))["releases"]
genres = collections.Counter(); fmts = collections.Counter(); masters = 0
for r in rel:
    bi = r["basic_information"]
    for g in bi.get("genres", []): genres[g] += 1
    for f in bi.get("formats", []): fmts[f["name"]] += 1
    if bi.get("master_id"): masters += 1
random.seed(1); samp = random.sample(rel, min(30, len(rel))); tc = []
for r in samp:
    time.sleep(2.6)
    try:
        rd = get(f"https://api.discogs.com/releases/{r['id']}")
        tc.append(len([t for t in rd.get("tracklist", []) if t.get("type_", "track") == "track"]))
    except Exception as e: tc.append(None)
ok = [t for t in tc if t]
res = {"items": items, "fetched": len(rel), "pages": pages, "distinct_release_ids": len({r["id"] for r in rel}),
       "with_master": masters, "genres": genres.most_common(), "formats": fmts.most_common(),
       "sample_track_counts": tc, "mean_tracks": round(sum(ok) / len(ok), 1) if ok else None,
       "est_total_tracks": round(len(rel) * sum(ok) / len(ok)) if ok else None}
json.dump(res, open("probe-results/collection.json", "w"), indent=1)
print(json.dumps(res)[:1500])
