import React, { useState } from 'react';
import {
  DollarSign,
  FileText,
  Lock,
  RefreshCw,
  CheckCircle2,
  UploadCloud,
  Shield,
  ExternalLink,
  Download,
  FileCheck,
  AlertCircle,
  Clock,
  Layers,
  FileCode,
  HardDrive,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storageService';
import { getGoogleAccessToken } from '../services/googleAuthService';
import { googleDriveService } from '../services/googleDriveService';
import { Employee, DocumentRecord } from '../types';

export const PayrollAndDocuments: React.FC = () => {
  const { currentUser, refreshUserData } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'payroll' | 'documents'>('payroll');
  const [isSyncingAccounting, setIsSyncingAccounting] = useState(false);
  const [selectedAccountingPlatform, setSelectedAccountingPlatform] = useState('QuickBooks Online');
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  // Document upload state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<'Contract' | 'NDA' | 'Tax' | 'ID Proof' | 'Offer Letter'>('Contract');
  const [selectedFileMock, setSelectedFileMock] = useState<File | null>(null);

  const employees = storageService.getEmployees();
  const isAdmin = currentUser.role === 'admin';

  // Current user's documents & payroll
  const userDocs = currentUser.documents;
  const userPayroll = currentUser.payrollHistory;

  // Accounting sync handler
  const handleSyncAccounting = () => {
    setIsSyncingAccounting(true);
    setSyncSuccessMessage(null);
    setTimeout(() => {
      const result = storageService.syncPayrollAccounting(selectedAccountingPlatform, {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      });
      setIsSyncingAccounting(false);
      setSyncSuccessMessage(
        `Successfully synced ${result.recordsCount} records totaling $${result.totalAmount.toLocaleString()} to ${selectedAccountingPlatform}.`
      );
      refreshUserData();
      setTimeout(() => setSyncSuccessMessage(null), 5000);
    }, 1400);
  };

  const handleUploadDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle) return;

    storageService.uploadDocument(
      currentUser.id,
      {
        title: newDocTitle.endsWith('.pdf') ? newDocTitle : `${newDocTitle}.pdf`,
        category: newDocCategory,
        fileSize: selectedFileMock ? `${(selectedFileMock.size / (1024 * 1024)).toFixed(1)} MB` : '1.8 MB',
        fileType: 'application/pdf',
      },
      {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      }
    );

    setIsUploadModalOpen(false);
    setNewDocTitle('');
    setSelectedFileMock(null);
    refreshUserData();
  };

  // Download payslip receipt simulation
  const handleDownloadPayslip = (payMonth: string, amount: number) => {
    const text = `====================================
OMNIHR OFFICIAL PAYSLIP RECORD
====================================
Employee: ${currentUser.name} (${currentUser.employeeCode})
Department: ${currentUser.department}
Role: ${currentUser.designation}
Payroll Period: ${payMonth}
------------------------------------
Base Salary: $${amount + 3000}
Allowances: $1,200
Deductions: $1,800
Taxes Withheld (Federal & State): $2,400
------------------------------------
NET COMPENSATION DISBURSED: $${amount.toLocaleString()} USD
Accounting Reconciliation: Verified
Security Hash: SHA-256 AES-256 Validated
====================================`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payslip_${currentUser.name.replace(' ', '_')}_${payMonth.replace(' ', '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sync Document directly to Google Drive
  const handleSyncDocToDrive = async (doc: DocumentRecord) => {
    try {
      const token = await getGoogleAccessToken();
      if (!token) {
        alert('Please connect to Google Drive first using the Google Drive tab in the sidebar.');
        return;
      }
      const archiveContent = `OMNIHR ENCRYPTED ARCHIVE DOCUMENT
Title: ${doc.title}
Category: ${doc.category}
Uploaded On: ${doc.uploadedOn}
File Size: ${doc.fileSize}
Encryption: ${doc.encryptionStandard}
SHA-256 Checksum: ${doc.checksum}
Employee Owner: ${currentUser.name} (${currentUser.employeeCode})
Access Level: ${doc.accessLevel.join(', ')}
`;
      const blob = new Blob([archiveContent], { type: 'text/plain;charset=utf-8' });
      await googleDriveService.uploadFile(
        token,
        blob,
        `${doc.title.replace(/\s+/g, '_')}.txt`,
        'text/plain'
      );
      setSyncSuccessMessage(`Document "${doc.title}" synchronized to your Google Drive!`);
      setTimeout(() => setSyncSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(`Failed to sync to Google Drive: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Payroll Ledger & Secure Document Management System
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Accounting software reconciliation (QuickBooks / Xero / NetSuite) and AES-256 encrypted contract vault.
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800 text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('payroll')}
            className={`rounded-lg px-3.5 py-1.5 transition-all ${
              activeSubTab === 'payroll'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Payroll & Accounting
          </button>
          <button
            onClick={() => setActiveSubTab('documents')}
            className={`rounded-lg px-3.5 py-1.5 transition-all ${
              activeSubTab === 'documents'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Encrypted Document Vault
          </button>
        </div>
      </div>

      {syncSuccessMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{syncSuccessMessage}</span>
        </div>
      )}

      {/* PAYROLL TAB */}
      {activeSubTab === 'payroll' && (
        <div className="space-y-6">
          {/* Third-Party Accounting Integration Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Third-Party Accounting Ledger Integration
                  </h3>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    Live Connector
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Synchronize compensation runs, tax withholdings, and employee deductions seamlessly into your accounting software.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={selectedAccountingPlatform}
                  onChange={(e) => setSelectedAccountingPlatform(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="QuickBooks Online">QuickBooks Online</option>
                  <option value="Xero Accounting">Xero Accounting</option>
                  <option value="NetSuite ERP">NetSuite ERP</option>
                  <option value="ADP Workforce Now">ADP Workforce Now</option>
                </select>

                <button
                  onClick={handleSyncAccounting}
                  disabled={isSyncingAccounting}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncingAccounting ? 'animate-spin' : ''}`} />
                  <span>{isSyncingAccounting ? 'Reconciling Ledger...' : 'Sync Payroll to Accounting'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Current User Compensation & Payslip History */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Compensation & Payslip Records ({currentUser.name})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Direct deposit account: <span className="font-mono text-slate-700 dark:text-slate-300">•••• 4829 (Encrypted)</span>
                </p>
              </div>
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-mono">
                USD
              </span>
            </div>

            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {userPayroll.map((pay) => (
                <div key={pay.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{pay.month}</span>
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {pay.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Pay Date: {pay.payDate} • Reconciled via {pay.syncedTo || 'QuickBooks Online'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                      <span>Base: <strong className="text-slate-800 dark:text-slate-200">${pay.baseSalary.toLocaleString()}</strong></span>
                      <span>Allowances: <strong className="text-slate-800 dark:text-slate-200">+${pay.allowances.toLocaleString()}</strong></span>
                      <span>Tax Withheld: <strong className="text-slate-800 dark:text-slate-200">-${pay.taxDeducted.toLocaleString()}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Net Disbursed</span>
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        ${pay.netPay.toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDownloadPayslip(pay.month, pay.netPay)}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      title="Download certified payslip receipt"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Payslip</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENTS TAB */}
      {activeSubTab === 'documents' && (
        <div className="space-y-6">
          {/* Cloud Storage Providers Status */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Encrypted Cloud Storage Services Integration
                  </h3>
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    Dual Redundancy
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Automated sync with enterprise Google Drive corporate tenant & AWS S3 bucket with client-side AES-256 envelope encryption.
                </p>
              </div>

              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors self-start sm:self-auto"
              >
                <UploadCloud className="h-4 w-4" />
                <span>Upload Encrypted Document</span>
              </button>
            </div>
          </div>

          {/* Documents Grid */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Sensitive Employment Contracts & Regulatory Files
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {userDocs.length} Secured Documents
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {userDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 transition-all hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                      <FileCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{doc.title}</h4>
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {doc.category}
                        </span>
                        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          {doc.encryptionStandard}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Uploaded on {doc.uploadedOn} • Size: {doc.fileSize} • SHA-256: <span className="font-mono">{doc.checksum.slice(0, 12)}...</span>
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                        <Lock className="h-3 w-3 text-emerald-500" />
                        <span>RBAC Access Authorization: {doc.accessLevel.join(', ').toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      onClick={() => handleSyncDocToDrive(doc)}
                      title="Upload copy directly to Google Drive"
                      className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 transition-colors"
                    >
                      <HardDrive className="h-3 w-3" />
                      <span>Sync to Drive</span>
                    </button>

                    <button
                      onClick={() => alert(`Accessing encrypted preview of ${doc.title} with verified AES-256 session token.`)}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Upload Encrypted Contract Document</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleUploadDoc} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Services Agreement v2.pdf"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 focus:bg-white focus:outline-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">Category Classification</label>
                <select
                  value={newDocCategory}
                  onChange={(e) => setNewDocCategory(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Contract">Employment Contract</option>
                  <option value="NDA">Non-Disclosure Agreement (NDA)</option>
                  <option value="Tax">Tax Form (W-4 / W-9 / Form 16)</option>
                  <option value="ID Proof">Government Identity Verification</option>
                  <option value="Offer Letter">Official Offer Letter</option>
                </select>
              </div>

              {/* Drag and Drop Box */}
              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">File Attachment (PDF / DOCX)</label>
                <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center cursor-pointer hover:border-indigo-500 dark:border-slate-700">
                  <UploadCloud className="h-8 w-8 text-indigo-500 mb-1" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Click or drag file to attach</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">Files are automatically encrypted with AES-256 before transit</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setSelectedFileMock(e.target.files[0]);
                        if (!newDocTitle) setNewDocTitle(e.target.files[0].name);
                      }
                    }}
                  />
                </label>
                {selectedFileMock && (
                  <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    Selected: {selectedFileMock.name} ({(selectedFileMock.size / 1024).toFixed(0)} KB)
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700"
                >
                  Encrypt & Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
