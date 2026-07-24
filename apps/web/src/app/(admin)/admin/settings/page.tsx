'use client';

import { useState, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:10000/api/v1';

interface DriveTestResult {
  enabled: boolean;
  message?: string;
  error?: string;
  connectivity?: {
    ok: boolean;
    rootFolderName: string;
    folders: string[];
  };
  uploadTest?: {
    ok: boolean;
    fileId?: string;
    viewUrl?: string;
  };
}

export default function AdminSettingsPage() {
  const [driveResult, setDriveResult] = useState<DriveTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');

  const testDrive = useCallback(async () => {
    setTesting(true);
    setError('');
    setDriveResult(null);
    try {
      // Fetch CSRF token first
      let csrfToken: string | null = null;
      try {
        const csrfRes = await fetch(`${API_BASE}/auth/csrf`, { credentials: 'include' });
        if (csrfRes.ok) {
          const data = await csrfRes.json();
          csrfToken = data.csrfToken;
        }
      } catch { /* ignore */ }

      const headers: Record<string, string> = {};
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

      const res = await fetch(`${API_BASE}/admin/drive/test`, {
        headers,
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Drive test failed' }));
        setDriveResult(err);
      } else {
        const data = await res.json();
        setDriveResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to test Drive connection');
    } finally {
      setTesting(false);
    }
  }, []);

  return (
    <div className="space-y-8 max-w-2xl">
      {/* ── Header ────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">Platform configuration</p>
      </div>

      {/* ── Google Drive Configuration ────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden">
        {/* Header */}
        <div className="border-b border-[var(--color-border)] bg-surface-elevated px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Google Drive — Payment Proof Storage</h3>
              <p className="text-xs text-text-secondary">
                Payment proof screenshots are uploaded here for admin verification
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Status indicator */}
          {driveResult && (
            <div className={`rounded-lg border p-4 ${
              driveResult.enabled && driveResult.connectivity?.ok
                ? 'border-success/20 bg-success/5'
                : 'border-error/20 bg-error/5'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
                  driveResult.enabled && driveResult.connectivity?.ok
                    ? 'bg-success/10'
                    : 'bg-error/10'
                }`}>
                  {driveResult.enabled && driveResult.connectivity?.ok ? (
                    <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${
                    driveResult.enabled && driveResult.connectivity?.ok
                      ? 'text-success'
                      : 'text-error'
                  }`}>
                    {driveResult.enabled && driveResult.connectivity?.ok
                      ? 'Drive Connected'
                      : driveResult.enabled
                        ? 'Drive Connection Failed'
                        : 'Drive Not Enabled'}
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {driveResult.message || driveResult.error || 'Unknown status'}
                  </p>
                  {driveResult.enabled && driveResult.connectivity?.ok && (
                    <p className="mt-1 text-xs text-text-muted">
                      Root folder: <span className="font-mono text-text-secondary">{driveResult.connectivity.rootFolderName}</span>
                      {driveResult.connectivity.folders.length > 0 && (
                        <> &middot; {driveResult.connectivity.folders.length} subfolder(s)</>
                      )}
                    </p>
                  )}
                  {driveResult.uploadTest && (
                    <p className={`mt-1 text-xs ${driveResult.uploadTest.ok ? 'text-success' : 'text-warning'}`}>
                      Test upload: {driveResult.uploadTest.ok ? 'Successful' : 'Failed'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-error/10 border border-error/20 px-4 py-3">
              <p className="text-xs text-error">{error}</p>
            </div>
          )}

          {/* Test button */}
          <button
            onClick={testDrive}
            disabled={testing}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {testing ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Testing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Test Drive Connection
              </>
            )}
          </button>

          {/* Setup instructions */}
          <div className="rounded-lg bg-surface-elevated p-4 space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">How to Set Up</h4>
            <ol className="space-y-2 text-xs text-text-secondary list-decimal list-inside">
              <li>Go to <span className="text-primary">Google Cloud Console</span> → IAM &amp; Admin → Service Accounts</li>
              <li>Create a new service account (or use existing)</li>
              <li>Go to Keys tab → Add Key → Create New Key → <span className="font-mono text-white">JSON</span></li>
              <li>Copy the entire JSON content</li>
              <li>Go to <span className="text-primary">Railway Dashboard</span> → your API project → Variables</li>
              <li>Set these env vars and Redeploy:</li>
            </ol>
            <div className="mt-2 rounded-lg bg-surface p-3 font-mono text-xs text-text-secondary">
              <p><span className="text-success">GOOGLE_DRIVE_ENABLED</span>=true</p>
              <p className="mt-1"><span className="text-warning">GOOGLE_SERVICE_ACCOUNT_KEY_JSON</span>={'{"type":"service_account",...}'}</p>
              <p className="mt-2 text-text-muted">— OR individual vars (recommended) —</p>
              <p className="mt-1"><span className="text-warning">GOOGLE_PROJECT_ID</span>=your-project-id</p>
              <p><span className="text-warning">GOOGLE_SERVICE_ACCOUNT_EMAIL</span>=your-sa@project.iam.gserviceaccount.com</p>
              <p><span className="text-warning">GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</span>=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----</p>
            </div>
            <div className="mt-2 rounded-lg bg-warning/5 border border-warning/10 p-3">
              <p className="text-xs text-warning font-medium">Important: Enable the Google Drive API</p>
              <p className="mt-0.5 text-xs text-text-muted">
                Go to Google Cloud Console → APIs &amp; Services → Library → search &quot;Google Drive API&quot; → Enable.
                The service account does NOT need domain-wide delegation for this setup.
              </p>
            </div>
            <div className="mt-2 rounded-lg bg-surface-elevated border border-[var(--color-border)] p-3">
              <p className="text-xs font-medium text-white">How to get a private key (pasted exactly)</p>
              <p className="mt-0.5 text-xs text-text-muted">
                When pasting the private key into a single Railway env var, keep the <span className="font-mono text-white">\n</span> characters as literal newlines.
                The service handles <span className="font-mono text-white">\\n</span> → <span className="font-mono text-white">\n</span> conversion automatically.
              </p>
            </div>
            <p className="mt-3 text-xs text-text-muted">
              After setting the vars, click <strong>Test Drive Connection</strong> above to verify.
            </p>
          </div>
        </div>
      </div>

      {/* ── Other settings placeholder ────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-12 text-center">
        <p className="text-text-muted text-sm">More settings coming soon.</p>
      </div>
    </div>
  );
}
