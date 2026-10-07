import React, { useState } from 'react';
import { KeyRound, Copy, Check, ExternalLink, X, AlertCircle, ArrowRight, Smartphone } from 'lucide-react';

interface SpotifyTokenGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClientId?: string;
  initialClientSecret?: string;
}

export const SpotifyTokenGeneratorModal: React.FC<SpotifyTokenGeneratorModalProps> = ({
  isOpen,
  onClose,
  initialClientId = '',
  initialClientSecret = '',
}) => {
  const [clientId, setClientId] = useState(initialClientId);
  const [clientSecret, setClientSecret] = useState(initialClientSecret);
  const [redirectUri, setRedirectUri] = useState('https://qualitycoding.github.io/Playlists/');
  const [codeOrUrl, setCodeOrUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const scopes = 'playlist-modify-public playlist-modify-private playlist-read-private';
  const authorizeUrl = clientId
    ? `https://accounts.spotify.com/authorize?client_type=app&response_type=code&client_id=${encodeURIComponent(
        clientId.trim()
      )}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri.trim())}`
    : '';

  const handleExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setRefreshToken(null);

    if (!clientId.trim() || !clientSecret.trim()) {
      setErrorMsg('Please enter both your Spotify Client ID and Client Secret.');
      return;
    }

    if (!codeOrUrl.trim()) {
      setErrorMsg('Please paste the redirect URL or authorization code from Spotify.');
      return;
    }

    setLoading(true);
    try {
      // 1. Extract code if full URL was pasted
      let authCode = codeOrUrl.trim();
      if (authCode.includes('code=')) {
        try {
          const parsed = new URL(authCode.startsWith('http') ? authCode : `https://dummy.com/${authCode}`);
          const extracted = parsed.searchParams.get('code');
          if (extracted) authCode = extracted;
        } catch {
          const match = authCode.match(/[?&]code=([^&#]+)/);
          if (match) authCode = decodeURIComponent(match[1]);
        }
      }

      // 2. Call Spotify OAuth token endpoint directly (works on GitHub Pages and mobile)
      const basicAuth = btoa(`${clientId.trim()}:${clientSecret.trim()}`);
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: redirectUri.trim(),
      });

      let tokenData: { refresh_token?: string; refreshToken?: string; error_description?: string; error?: string } | null = null;

      try {
        const directRes = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        tokenData = await directRes.json();
        if (!directRes.ok) {
          throw new Error(tokenData?.error_description || tokenData?.error || 'Spotify rejected the token exchange.');
        }
      } catch (directErr) {
        // Fallback to local server if direct request was blocked
        try {
          const backendRes = await fetch('/api/spotify/exchange-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId: clientId.trim(),
              clientSecret: clientSecret.trim(),
              redirectUri: redirectUri.trim(),
              codeOrUrl: authCode,
            }),
          });
          if (backendRes.ok && backendRes.headers.get('content-type')?.includes('application/json')) {
            tokenData = await backendRes.json();
          } else {
            throw directErr;
          }
        } catch {
          throw directErr;
        }
      }

      const receivedToken = tokenData?.refresh_token || tokenData?.refreshToken;
      if (!receivedToken) {
        throw new Error('Spotify did not return a refresh token. Make sure the code is freshly generated.');
      }

      setRefreshToken(receivedToken);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Token exchange failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!refreshToken) return;
    navigator.clipboard.writeText(refreshToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-xl rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Generate Spotify Refresh Token</h3>
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-800 px-1.5 py-0.5 rounded">
                  <Smartphone className="w-3 h-3" />
                  <span>Mobile & Android Friendly</span>
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Generate your token directly in the browser without running Python
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleExchange} className="space-y-4">
          {/* Step 1: Client ID & Secret */}
          <div className="space-y-3">
            <span className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              1. Your Spotify App Credentials
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  Spotify Client ID
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Paste Spotify Client ID"
                  className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  Spotify Client Secret
                </label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Paste Spotify Client Secret"
                  className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                Redirect URI (matches what is saved in Spotify App Settings)
              </label>
              <input
                type="text"
                value={redirectUri}
                onChange={(e) => setRedirectUri(e.target.value)}
                placeholder="https://qualitycoding.github.io/Playlists/"
                className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-emerald-400 focus:outline-none"
              />
              <span className="block text-[11px] text-neutral-500 mt-1">
                Tip: Enter <code className="text-emerald-400">https://qualitycoding.github.io/Playlists/</code> in your Spotify App Settings (Spotify accepts this public HTTPS URL without warning).
              </span>
            </div>
          </div>

          {/* Step 2: Open Auth Link */}
          <div className="space-y-2 pt-2 border-t border-neutral-900">
            <span className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              2. Authorize in Spotify
            </span>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Tap the button below. Spotify will ask you to approve playlist access. Tap &quot;Agree&quot;.
            </p>

            {clientId.trim() ? (
              <a
                href={authorizeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#1DB954] hover:bg-[#1AA34A] text-black font-semibold text-xs transition-colors"
              >
                <span>Authorize with Spotify</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <div className="text-xs text-amber-400 italic">
                Enter your Client ID above to generate the authorization link.
              </div>
            )}
          </div>

          {/* Step 3: Paste Code or Full Redirect URL */}
          <div className="space-y-2 pt-2 border-t border-neutral-900">
            <span className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              3. Paste the Redirect URL
            </span>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              After you tap Agree, Spotify redirects you. Even if the page says &quot;Can&apos;t connect&quot; or doesn&apos;t load, <strong>copy the entire address from your browser bar</strong> and paste it here:
            </p>

            <textarea
              rows={2}
              value={codeOrUrl}
              onChange={(e) => setCodeOrUrl(e.target.value)}
              placeholder="e.g. https://localhost/callback?code=AQD... (or just the code)"
              className="w-full rounded border border-neutral-800 bg-neutral-900 p-2.5 text-xs font-mono text-white placeholder-neutral-500 focus:border-emerald-400 focus:outline-none"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading ? 'Exchanging with Spotify...' : 'Generate Refresh Token'}
            </button>
          </div>
        </form>

        {/* Error message */}
        {errorMsg && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/40 border border-red-800 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success / Refresh Token Result */}
        {refreshToken && (
          <div className="rounded-lg bg-emerald-950/40 border border-emerald-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-300">
                SUCCESS! Your SPOTIFY_REFRESH_TOKEN:
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-400 text-black rounded hover:bg-emerald-300 transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy Token'}</span>
              </button>
            </div>

            <div className="p-2.5 rounded bg-black/60 border border-neutral-800 font-mono text-[11px] text-neutral-200 break-all select-all">
              {refreshToken}
            </div>

            <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/80 flex items-center justify-between">
              <span>Next: Add this to your GitHub Secrets</span>
              <a
                href="https://github.com/qualitycoding/Playlists/settings/secrets/actions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Open GitHub Secrets</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Close */}
        <div className="pt-2 border-t border-neutral-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-neutral-300 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
