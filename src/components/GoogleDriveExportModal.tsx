import React, { useState } from 'react';
import { Cloud, CheckCircle2, ExternalLink, Loader2, X, AlertCircle } from 'lucide-react';
import { User } from 'firebase/auth';
import { googleSignIn, logout } from '../lib/auth';
import { getOrCreateFolder, uploadZipToDrive, DriveFileResponse } from '../lib/drive';

interface GoogleDriveExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  accessToken: string | null;
  onAuthSuccess: (user: User, token: string) => void;
  onAuthSignOut: () => void;
}

export const GoogleDriveExportModal: React.FC<GoogleDriveExportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  accessToken,
  onAuthSuccess,
  onAuthSignOut,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<DriveFileResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMsg(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onAuthSuccess(res.user, res.accessToken);
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Google sign-in was interrupted or failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleUploadToDrive = async () => {
    if (!accessToken) {
      setErrorMsg('No active Google authentication token. Please sign in first.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setUploadedFile(null);

    try {
      // 1. Fetch current zip package from backend
      const zipRes = await fetch('/api/download-zip');
      if (!zipRes.ok) {
        throw new Error('Failed to assemble zip package on server.');
      }
      const zipBlob = await zipRes.blob();

      // 2. Ensure folder in user's Drive
      const folderId = await getOrCreateFolder(accessToken, 'Discogs Streaming Sync');

      // 3. Upload file
      const uploaded = await uploadZipToDrive(
        accessToken,
        zipBlob,
        'discogs-streaming-sync.zip',
        folderId
      );

      setUploadedFile(uploaded);
    } catch (err: unknown) {
      console.error('Upload to Drive error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save file to Google Drive.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-lg rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-400">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Save to Google Drive</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Export project scripts & configuration directly to your Drive
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

        {/* State 1: Not Authenticated */}
        {!currentUser || !accessToken ? (
          <div className="py-4 space-y-4 text-center">
            <p className="text-xs text-neutral-300 leading-relaxed max-w-sm mx-auto">
              Connect your Google Account with permission to save the project package directly to a dedicated folder in your Google Drive.
            </p>

            <div className="flex justify-center pt-2">
              {/* Official Google Sign-In Button */}
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="flex items-center gap-3 px-4 py-2.5 rounded-md bg-white text-neutral-800 font-medium text-xs shadow hover:bg-neutral-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isSigningIn ? 'Connecting to Google...' : 'Sign in with Google'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* State 2: Authenticated - Confirmation Dialog for Saving to Drive */
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                  {currentUser.email ? currentUser.email[0].toUpperCase() : 'G'}
                </div>
                <div>
                  <div className="font-medium text-white">{currentUser.displayName || 'Google User'}</div>
                  <div className="text-[11px] text-neutral-400">{currentUser.email}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await logout();
                  onAuthSignOut();
                }}
                className="text-[11px] text-neutral-400 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </div>

            {/* Mandatory Confirmation Details */}
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 space-y-2 text-xs">
              <div className="font-semibold text-white">Confirm Export Action:</div>
              <p className="text-neutral-300 leading-relaxed text-[11px]">
                The application will save <code className="text-emerald-400">discogs-streaming-sync.zip</code> into your Google Drive inside the folder <code className="text-neutral-200">&quot;Discogs Streaming Sync&quot;</code>, with permission from your account.
              </p>
              <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-800">
                Package includes: <code className="text-neutral-300">sync_playlists.py</code>, <code className="text-neutral-300">config.py</code>, <code className="text-neutral-300">weekly_sync.yml</code>, setup scripts, cache, and logs.
              </div>
            </div>

            {/* Success Card */}
            {uploadedFile && (
              <div className="rounded-lg bg-emerald-950/40 border border-emerald-800 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>File successfully saved to Google Drive!</span>
                </div>
                <div className="text-[11px] text-neutral-300">
                  File: <span className="font-mono text-white">{uploadedFile.name}</span>
                </div>
                {uploadedFile.webViewLink && (
                  <a
                    href={uploadedFile.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 underline"
                  >
                    <span>Open in Google Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadToDrive}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-black bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving to Drive...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Confirm & Save to Google Drive</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/40 border border-red-800 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};
