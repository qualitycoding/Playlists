#!/usr/bin/env python3
"""S-000a / A-041 probe: can a free TIDAL account create a playlist and add and remove a track via the official API v2?
Run on your own machine. Reads TIDAL_CLIENT_ID from the environment (no secret is needed for PKCE).
Writes tidal_probe_result.txt with status codes only (no tokens). Endpoint shapes are from memory of the v2 docs and are
unverified; every response status and the first 300 characters of each body are printed so a failure shows what to change."""
import base64, hashlib, http.server, json, os, secrets, sys, threading, urllib.parse, urllib.request, webbrowser

CID = os.environ["TIDAL_CLIENT_ID"]
REDIRECT = "http://localhost:8080/callback"
SCOPES = "playlists.read playlists.write"
API = "https://openapi.tidal.com/v2"
out = []

def log(s):
    print(s); out.append(s)

verifier = base64.urlsafe_b64encode(secrets.token_bytes(48)).rstrip(b"=").decode()
challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
state = secrets.token_urlsafe(12)
url = "https://login.tidal.com/authorize?" + urllib.parse.urlencode({
    "response_type": "code", "client_id": CID, "redirect_uri": REDIRECT, "scope": SCOPES,
    "code_challenge_method": "S256", "code_challenge": challenge, "state": state})
box = {}
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        box.update({k: v[0] for k, v in q.items()})
        self.send_response(200); self.end_headers(); self.wfile.write(b"Done. You can close this tab.")
    def log_message(self, *a): pass
srv = http.server.HTTPServer(("localhost", 8080), H)
t = threading.Thread(target=srv.handle_request); t.start()
print("Opening browser for TIDAL login..."); webbrowser.open(url); print(url)
t.join(300)
if box.get("state") != state or "code" not in box:
    log("login: FAILED " + json.dumps({k: v for k, v in box.items() if k != "code"})); sys.exit(1)

def call(method, path, body=None, token=None, form=None, ctype="application/vnd.api+json"):
    data = urllib.parse.urlencode(form).encode() if form else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(path if path.startswith("http") else API + path, data=data, method=method)
    if token: req.add_header("Authorization", "Bearer " + token)
    if form: req.add_header("Content-Type", "application/x-www-form-urlencoded")
    elif body is not None: req.add_header("Content-Type", ctype)
    req.add_header("Accept", "application/vnd.api+json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            txt = r.read().decode(); return r.status, txt
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

s, txt = call("POST", "https://auth.tidal.com/v1/oauth2/token", form={
    "grant_type": "authorization_code", "code": box["code"], "client_id": CID,
    "redirect_uri": REDIRECT, "code_verifier": verifier})
log(f"token exchange: {s}")
if s != 200: log(txt[:300]); open("tidal_probe_result.txt", "w").write("\n".join(out)); sys.exit(1)
tok = json.loads(txt); at = tok["access_token"]
log("granted scopes: " + str(tok.get("scope")) + "; refresh token present: " + str("refresh_token" in tok))

s, txt = call("GET", "/tracks?countryCode=GB&filter%5Bisrc%5D=GBAYE0601498", token=at)  # ISRC lookup (a well-known recording)
log(f"ISRC lookup: {s}"); log(txt[:300])
track_id = None
try: track_id = json.loads(txt)["data"][0]["id"]
except Exception: pass

s, txt = call("POST", "/playlists", token=at, body={"data": {"type": "playlists", "attributes": {
    "name": "S-000a probe (delete me)", "description": "temporary", "accessType": "UNLISTED"}}})
log(f"create playlist: {s}"); log(txt[:300])
pid = None
try: pid = json.loads(txt)["data"]["id"]
except Exception: pass
if pid and track_id:
    s, txt = call("POST", f"/playlists/{pid}/relationships/items", token=at, body={"data": [{"id": track_id, "type": "tracks"}]})
    log(f"add item: {s}"); log(txt[:300])
    s, txt = call("GET", f"/playlists/{pid}/relationships/items", token=at)
    log(f"read items: {s}"); log(txt[:300])
    s, txt = call("DELETE", f"/playlists/{pid}/relationships/items", token=at, body={"data": [{"id": track_id, "type": "tracks"}]})
    log(f"remove item: {s}"); log(txt[:300])
if pid:
    s, txt = call("DELETE", f"/playlists/{pid}", token=at)
    log(f"delete playlist: {s}")
open("tidal_probe_result.txt", "w").write("\n".join(out))
print("\nWrote tidal_probe_result.txt (no tokens in it). Paste its contents back to me.")
