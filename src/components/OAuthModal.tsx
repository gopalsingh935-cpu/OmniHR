import React, { useState } from 'react';
import { ShieldCheck, Lock, Globe, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const OAuthModal: React.FC = () => {
  const { showOAuthModal, closeOAuthModal, handleOAuthLogin, currentUser } = useAuth();
  const [selectedProvider, setSelectedProvider] = useState<string>('google');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!showOAuthModal) return null;

  const handleConnect = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      handleOAuthLogin(
        selectedProvider === 'google'
          ? 'Google Workspace Identity'
          : selectedProvider === 'microsoft'
          ? 'Microsoft Entra ID (Azure AD)'
          : 'Okta Enterprise SSO'
      );
    }, 1100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Enterprise Single Sign-On (OAuth 2.0)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Federated Identity with PKCE & Hardware Token Bindings</p>
            </div>
          </div>
          <button
            onClick={closeOAuthModal}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        <div className="mt-4">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
            Select your corporate identity provider to securely bind or refresh credentials for <span className="font-semibold text-slate-800 dark:text-slate-200">{currentUser.email}</span>.
          </p>

          <div className="space-y-2.5">
            {/* Google */}
            <div
              onClick={() => setSelectedProvider('google')}
              className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
                selectedProvider === 'google'
                  ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30'
                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Google Workspace SSO</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">omnihr.internal Google Apps Domain</p>
                </div>
              </div>
              {selectedProvider === 'google' && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </div>

            {/* Microsoft Entra */}
            <div
              onClick={() => setSelectedProvider('microsoft')}
              className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
                selectedProvider === 'microsoft'
                  ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30'
                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                  <svg className="h-5 w-5" viewBox="0 0 23 23">
                    <path fill="#f35325" d="M1 1h10v10H1z" />
                    <path fill="#81bc06" d="M12 1h10v10H12z" />
                    <path fill="#05a6f0" d="M1 12h10v10H1z" />
                    <path fill="#ffba08" d="M12 12h10v10H12z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Microsoft Entra ID (Azure AD)</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Office 365 Enterprise Directory</p>
                </div>
              </div>
              {selectedProvider === 'microsoft' && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </div>

            {/* Okta */}
            <div
              onClick={() => setSelectedProvider('okta')}
              className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
                selectedProvider === 'okta'
                  ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30'
                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                  <Globe className="h-5 w-5 text-sky-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Okta Universal Directory</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">SAML 2.0 / OIDC Verified Tenant</p>
                </div>
              </div>
              {selectedProvider === 'okta' && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <Lock className="h-3.5 w-3.5 text-indigo-500" /> Authorized OAuth Scopes:
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            openid, profile, email, Directory.Read.All, Calendars.ReadWrite
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={closeOAuthModal}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConnect}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {isProcessing ? 'Exchanging OAuth Tokens...' : 'Authorize & Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};
