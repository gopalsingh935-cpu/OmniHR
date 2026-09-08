import React, { useState } from 'react';
import { Fingerprint, CheckCircle2, Shield, Smartphone, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storageService';

export const BiometricModal: React.FC = () => {
  const { showBiometricModal, closeBiometricModal, completeBiometricAuth, currentUser } = useAuth();
  const [step, setStep] = useState<'scan' | 'success' | 'failed'>('scan');
  const [scanning, setScanning] = useState<boolean>(false);

  if (!showBiometricModal) return null;

  const handleSimulateScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setStep('success');
      storageService.logAudit({
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        actionType: 'AUTH',
        description: 'FIDO2 / WebAuthn Biometric passkey verified successfully for session re-authentication',
      });
      setTimeout(() => {
        setStep('scan');
        completeBiometricAuth();
      }, 1000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Biometric Authentication</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">WebAuthn FIDO2 Security Standard</p>
            </div>
          </div>
          <button
            onClick={closeBiometricModal}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        <div className="my-8 flex flex-col items-center justify-center text-center">
          {step === 'scan' && (
            <>
              <div
                onClick={handleSimulateScan}
                className={`relative flex h-28 w-28 cursor-pointer items-center justify-center rounded-full border-2 transition-all ${
                  scanning
                    ? 'border-indigo-500 bg-indigo-50/70 shadow-lg shadow-indigo-500/20 dark:bg-indigo-950/40'
                    : 'border-slate-200 bg-slate-50 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800/80'
                }`}
              >
                <Fingerprint
                  className={`h-14 w-14 transition-transform duration-300 ${
                    scanning ? 'scale-110 text-indigo-600 dark:text-indigo-400 animate-pulse' : 'text-slate-600 dark:text-slate-300'
                  }`}
                />
                {scanning && (
                  <span className="absolute -inset-1 animate-ping rounded-full border border-indigo-400 opacity-60"></span>
                )}
              </div>
              <p className="mt-5 text-sm font-medium text-slate-800 dark:text-slate-200">
                {scanning ? 'Verifying Hardware Security Key...' : 'Touch Sensor or Look at Camera'}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                Authenticating <span className="font-semibold text-slate-700 dark:text-slate-300">{currentUser.name}</span> on this device with end-to-end hardware isolation.
              </p>
            </>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 className="h-14 w-14 animate-bounce" />
              </div>
              <p className="mt-4 text-base font-semibold text-emerald-600 dark:text-emerald-400">
                Biometrics Verified!
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Access token renewed for 12 hours.</p>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <Shield className="h-3.5 w-3.5 text-indigo-500" /> Passkey Status:
            </span>
            <span className="text-emerald-600 font-semibold dark:text-emerald-400">Active & Bound</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <Smartphone className="h-3.5 w-3.5 text-slate-400" /> Credential Type:
            </span>
            <span>Platform Authenticator</span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={closeBiometricModal}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSimulateScan}
            disabled={scanning}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            <Key className="h-3.5 w-3.5" />
            {scanning ? 'Verifying...' : 'Simulate Sensor Touch'}
          </button>
        </div>
      </div>
    </div>
  );
};
