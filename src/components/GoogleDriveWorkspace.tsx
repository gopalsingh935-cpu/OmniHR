import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  HardDrive,
  Folder,
  FileText,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  FolderPlus,
  FilePlus2,
  ChevronRight,
  Home,
  Shield,
  Clock,
  Sparkles,
  Download,
  Database,
  ArrowUpRight,
  Info,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storageService';
import {
  signInWithGoogle,
  logoutGoogle,
  getGoogleAccessToken,
  initGoogleAuth,
} from '../services/googleAuthService';
import {
  googleDriveService,
  GoogleDriveFile,
  DriveAboutInfo,
} from '../services/googleDriveService';

interface FolderCrumb {
  id: string;
  name: string;
}

export const GoogleDriveWorkspace: React.FC = () => {
  const { currentUser } = useAuth();

  // Authentication states
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Drive explorer states
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [aboutInfo, setAboutInfo] = useState<DriveAboutInfo | null>(null);

  // Navigation & Filtering
  const [breadcrumbs, setBreadcrumbs] = useState<FolderCrumb[]>([
    { id: 'root', name: 'My Drive' },
  ]);
  const currentFolder = breadcrumbs[breadcrumbs.length - 1];
  const [searchQuery, setSearchQuery] = useState('');
  const [mimeFilter, setMimeFilter] = useState<'all' | 'folders' | 'docs' | 'sheets' | 'pdfs' | 'images'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal dialog states
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<'document' | 'spreadsheet'>('document');
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mandatory Delete Confirmation Modal (Required by Workspace Integration Skill)
  const [fileToDelete, setFileToDelete] = useState<GoogleDriveFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Export HR summary to Drive state
  const [isExportingHR, setIsExportingHR] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Initialize Auth state listener
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch Drive Files and Account Quota
  const loadDriveContents = useCallback(
    async (token: string, folderId: string, search: string, filter: string) => {
      setIsLoadingFiles(true);
      setDriveError(null);
      try {
        const [filesResult, aboutResult] = await Promise.allSettled([
          googleDriveService.listFiles(token, {
            folderId,
            searchQuery: search,
            mimeFilter: filter,
          }),
          googleDriveService.getAbout(token),
        ]);

        if (filesResult.status === 'fulfilled') {
          setFiles(filesResult.value.files);
        } else {
          setDriveError(filesResult.reason?.message || 'Failed to list files from Google Drive.');
        }

        if (aboutResult.status === 'fulfilled') {
          setAboutInfo(aboutResult.value);
        }
      } catch (err: any) {
        setDriveError(err?.message || 'An unexpected error occurred while communicating with Google Drive.');
      } finally {
        setIsLoadingFiles(false);
      }
    },
    []
  );

  useEffect(() => {
    if (accessToken) {
      loadDriveContents(accessToken, currentFolder.id, searchQuery, mimeFilter);
    }
  }, [accessToken, currentFolder.id, mimeFilter, loadDriveContents]);

  // Trigger search on debounce or Enter
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessToken) {
      loadDriveContents(accessToken, currentFolder.id, searchQuery, mimeFilter);
    }
  };

  // Sign In handler
  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const result = await signInWithGoogle();
      if (result) {
        setGoogleUser(result.user);
        setAccessToken(result.accessToken);
        storageService.logAudit({
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          actionType: 'AUTH',
          description: `Connected Google Drive session for ${result.user.email} with Drive Workspace Scopes.`,
        });
      }
    } catch (err: any) {
      setAuthError(
        err?.message || 'Google authentication was cancelled or could not be completed.'
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Sign Out handler
  const handleSignOut = async () => {
    await logoutGoogle();
    setAccessToken(null);
    setGoogleUser(null);
    setFiles([]);
    setAboutInfo(null);
    setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
  };

  // Folder navigation
  const navigateIntoFolder = (folder: GoogleDriveFile) => {
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSearchQuery('');
  };

  const navigateToBreadcrumb = (index: number) => {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setSearchQuery('');
  };

  // Folder creation
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      await googleDriveService.createFolder(
        accessToken,
        newFolderName.trim(),
        currentFolder.id
      );
      setNewFolderName('');
      setIsNewFolderModalOpen(false);
      loadDriveContents(accessToken, currentFolder.id, searchQuery, mimeFilter);
      storageService.logAudit({
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        actionType: 'DRIVE_SYNC',
        description: `Created new Google Drive folder "${newFolderName}" in ${currentFolder.name}.`,
      });
    } catch (err: any) {
      alert(`Could not create folder: ${err.message}`);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Document creation
  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newDocTitle.trim()) return;

    setIsCreatingDoc(true);
    try {
      const created = await googleDriveService.createGoogleDoc(
        accessToken,
        newDocTitle.trim(),
        newDocType,
        currentFolder.id
      );
      setNewDocTitle('');
      setIsNewDocModalOpen(false);
      loadDriveContents(accessToken, currentFolder.id, searchQuery, mimeFilter);
      if (created.webViewLink) {
        window.open(created.webViewLink, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      alert(`Could not create document: ${err.message}`);
    } finally {
      setIsCreatingDoc(false);
    }
  };

  // File upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedUploadFile) return;

    setIsUploading(true);
    try {
      await googleDriveService.uploadFile(
        accessToken,
        selectedUploadFile,
        selectedUploadFile.name,
        selectedUploadFile.type,
        currentFolder.id
      );
      setSelectedUploadFile(null);
      setIsUploadModalOpen(false);
      loadDriveContents(accessToken, currentFolder.id, searchQuery, mimeFilter);
      storageService.logAudit({
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        actionType: 'DRIVE_SYNC',
        description: `Uploaded file "${selectedUploadFile.name}" to Google Drive in folder ${currentFolder.name}.`,
      });
    } catch (err: any) {
      alert(`Upload to Google Drive failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Mandatory Confirmation Delete Action
  const handleConfirmDelete = async () => {
    if (!accessToken || !fileToDelete) return;

    setIsDeleting(true);
    try {
      await googleDriveService.deleteFile(accessToken, fileToDelete.id);
      storageService.logAudit({
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        actionType: 'DRIVE_SYNC',
        description: `Permanently removed file "${fileToDelete.name}" (${fileToDelete.id}) from Google Drive after explicit user confirmation.`,
      });
      setFileToDelete(null);
      loadDriveContents(accessToken, currentFolder.id, searchQuery, mimeFilter);
    } catch (err: any) {
      alert(`Failed to delete file from Google Drive: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Export OmniHR Records directly to Google Drive
  const handleExportHRDigestToDrive = async () => {
    if (!accessToken) return;
    setIsExportingHR(true);
    setExportNotice(null);
    try {
      const employees = storageService.getEmployees();
      const leaves = storageService.getLeaves();
      const timestamp = new Date().toISOString().split('T')[0];

      const reportContent = `OMNIHR ENTERPRISE COMPLIANCE & PERSONNEL DIGEST
Generated: ${new Date().toLocaleString()}
Generated by: ${currentUser.name} (${currentUser.role.toUpperCase()}) - ${currentUser.designation}

=========================================
1. PERSONNEL SUMMARY (${employees.length} Active Records)
=========================================
${employees
  .map(
    (e) =>
      `[${e.employeeCode}] ${e.name} | ${e.department} | ${e.designation} | ${e.workMode} | ${e.email}`
  )
  .join('\n')}

=========================================
2. LEAVE STATUS DIGEST (${leaves.length} Submissions)
=========================================
${leaves
  .map(
    (l) =>
      `• ${l.employeeName} (${l.leaveType}): ${l.startDate} to ${l.endDate} [${l.daysCount} days] -> STATUS: ${l.status.toUpperCase()}`
  )
  .join('\n')}

=========================================
3. SECURITY & SOC2 AUDIT HIGHLIGHT
=========================================
Storage: Google Drive Workspace Certified
OAuth 2.0 PKCE Enforced.
`;

      const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
      const fileName = `OmniHR_Personnel_Report_${timestamp}.txt`;

      await googleDriveService.uploadFile(
        accessToken,
        blob,
        fileName,
        'text/plain',
        currentFolder.id
      );

      setExportNotice(`Successfully exported ${fileName} to Google Drive!`);
      loadDriveContents(accessToken, currentFolder.id, searchQuery, mimeFilter);
      setTimeout(() => setExportNotice(null), 5000);
    } catch (err: any) {
      alert(`Export to Google Drive failed: ${err.message}`);
    } finally {
      setIsExportingHR(false);
    }
  };

  // Helper for MIME icons
  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className="h-5 w-5 text-amber-500 fill-amber-500/20" />;
    }
    if (mimeType.includes('document')) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    }
    if (mimeType.includes('spreadsheet')) {
      return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
    }
    if (mimeType.includes('pdf')) {
      return <FileCode className="h-5 w-5 text-rose-500" />;
    }
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-purple-500" />;
    }
    return <FileText className="h-5 w-5 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20 shrink-0">
            <HardDrive className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Google Drive Storage & Workspace
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <Sparkles className="h-3 w-3" /> OAuth 2.0 Connected
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Directly synchronize, browse, upload, and organize corporate HR documents,
              compliance files, and employee dossiers with Google Drive.
            </p>
          </div>
        </div>

        {/* Auth Status / Sign-in / Disconnect */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          {accessToken && googleUser ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-800/60">
                {googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || 'Google User'}
                    className="h-6 w-6 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                    {googleUser.displayName?.[0] || 'G'}
                  </div>
                )}
                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                    {googleUser.displayName || 'Google User'}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-tight truncate max-w-[140px]">
                    {googleUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                title="Disconnect Google Drive"
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Disconnect</span>
              </button>
            </div>
          ) : (
            <div>
              {/* Official Google Sign-in button */}
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="gsi-material-button shadow-xs"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      style={{ display: 'block' }}
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      ></path>
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      ></path>
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      ></path>
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      ></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">
                    {isAuthenticating ? 'Connecting to Drive...' : 'Sign in with Google'}
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {authError && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{authError}</span>
        </div>
      )}

      {exportNotice && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* When NOT signed in: Welcome & Feature Overview Card */}
      {!accessToken && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mb-4">
            <HardDrive className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Connect your Google Drive Account
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Sign in with Google to grant permission to browse, upload, create folders,
            and export employee compliance records directly to your Google Drive cloud workspace.
          </p>

          <div className="mx-auto mt-6 flex justify-center">
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isAuthenticating}
              className="gsi-material-button shadow-md"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  {isAuthenticating ? 'Connecting...' : 'Sign in with Google to Connect Drive'}
                </span>
              </div>
            </button>
          </div>

          {/* Feature Highlights Grid */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <Folder className="h-5 w-5 text-amber-500 mb-2" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Folder Hierarchy & Organization
              </h3>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Navigate your folders seamlessly, create subfolders for HR departments, and inspect sub-directories.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <Upload className="h-5 w-5 text-blue-500 mb-2" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Secure File Uploads
              </h3>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Upload PDFs, spreadsheets, resumes, and identification documents straight into Google Drive with multipart safety.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <Shield className="h-5 w-5 text-emerald-500 mb-2" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Explicit Confirmation Controls
              </h3>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Mandatory confirmation dialogs protect your team against accidental deletion of user data in Google Drive.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* When Signed In: Drive Management Dashboard */}
      {accessToken && (
        <div className="space-y-4">
          {/* Storage Bar & Quick Actions Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
            {/* Storage Quota info */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Google Drive Storage
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {aboutInfo?.storageQuota?.usage
                    ? `${googleDriveService.formatBytes(aboutInfo.storageQuota.usage)} of ${
                        aboutInfo.storageQuota.limit
                          ? googleDriveService.formatBytes(aboutInfo.storageQuota.limit)
                          : 'Unlimited'
                      } used`
                    : 'Storage details loaded'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload to Drive</span>
              </button>

              <button
                onClick={() => setIsNewFolderModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
              >
                <FolderPlus className="h-3.5 w-3.5 text-amber-500" />
                <span>New Folder</span>
              </button>

              <button
                onClick={() => setIsNewDocModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
              >
                <FilePlus2 className="h-3.5 w-3.5 text-blue-500" />
                <span>New Doc / Sheet</span>
              </button>

              <button
                onClick={handleExportHRDigestToDrive}
                disabled={isExportingHR}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{isExportingHR ? 'Exporting...' : 'Export HR Digest'}</span>
              </button>

              <button
                onClick={() =>
                  loadDriveContents(accessToken, currentFolder.id, searchQuery, mimeFilter)
                }
                title="Refresh Drive Files"
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingFiles ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Breadcrumbs & Search & View controls */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.id}>
                  <button
                    onClick={() => navigateToBreadcrumb(idx)}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 font-medium transition-colors ${
                      idx === breadcrumbs.length - 1
                        ? 'bg-slate-100 text-slate-900 font-bold dark:bg-slate-800 dark:text-white'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:text-slate-300'
                    }`}
                  >
                    {idx === 0 && <Home className="h-3.5 w-3.5" />}
                    <span>{crumb.name}</span>
                  </button>
                  {idx < breadcrumbs.length - 1 && (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Search Input & Type Filter */}
            <div className="flex items-center gap-2">
              <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-60">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search in Drive..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </form>

              <select
                value={mimeFilter}
                onChange={(e) => setMimeFilter(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <option value="all">All Files</option>
                <option value="folders">Folders</option>
                <option value="docs">Google Docs</option>
                <option value="sheets">Sheets</option>
                <option value="pdfs">PDFs</option>
                <option value="images">Images</option>
              </select>
            </div>
          </div>

          {/* Drive Error Banner if any */}
          {driveError && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>{driveError}</span>
            </div>
          )}

          {/* Files Loading Skeleton */}
          {isLoadingFiles && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/60 dark:border-slate-800 dark:bg-slate-800/40"
                />
              ))}
            </div>
          )}

          {/* Empty Folder State */}
          {!isLoadingFiles && files.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-500 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
                <Folder className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                This Google Drive folder is empty
              </h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                Upload files, create new Google Docs, or add subfolders to start organizing
                your cloud workspace.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  Upload File
                </button>
                <button
                  onClick={() => setIsNewFolderModalOpen(true)}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  New Folder
                </button>
              </div>
            </div>
          )}

          {/* Files Grid View */}
          {!isLoadingFiles && files.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {files.map((file) => {
                const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

                return (
                  <div
                    key={file.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                  >
                    <div>
                      {/* Top icon and delete button */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div
                          onClick={() => (isFolder ? navigateIntoFolder(file) : null)}
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            isFolder
                              ? 'bg-amber-50 cursor-pointer hover:bg-amber-100 dark:bg-amber-950/40'
                              : 'bg-slate-100 dark:bg-slate-800'
                          }`}
                        >
                          {getFileIcon(file.mimeType)}
                        </div>

                        <div className="flex items-center gap-1">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open in Google Drive"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}

                          {/* Delete Trigger - Opens mandatory confirmation dialog */}
                          <button
                            onClick={() => setFileToDelete(file)}
                            title="Delete from Google Drive"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* File Name */}
                      <h4
                        onClick={() => {
                          if (isFolder) navigateIntoFolder(file);
                          else if (file.webViewLink) window.open(file.webViewLink, '_blank');
                        }}
                        title={file.name}
                        className={`text-xs font-bold line-clamp-2 transition-colors ${
                          isFolder
                            ? 'text-slate-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400'
                            : 'text-slate-800 dark:text-slate-200 cursor-pointer hover:text-blue-600'
                        }`}
                      >
                        {file.name}
                      </h4>
                    </div>

                    {/* Metadata Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>{isFolder ? 'Folder' : googleDriveService.formatBytes(file.size)}</span>
                      <span>
                        {file.modifiedTime
                          ? new Date(file.modifiedTime).toLocaleDateString()
                          : 'Updated'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MANDATORY EXPLICIT CONFIRMATION DIALOG FOR DELETE OPERATIONS */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/60">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete File from Google Drive?
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  Explicit user confirmation required
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300 mb-4">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {fileToDelete.name}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Type: {fileToDelete.mimeType} • Size:{' '}
                {googleDriveService.formatBytes(fileToDelete.size)}
              </p>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              Are you sure you want to delete this file from Google Drive? This action will
              permanently remove the file from your Google Drive cloud storage and cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Confirm & Delete File'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              Create New Folder in {currentFolder.name}
            </h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Folder Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Employee Contracts 2026"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder || !newFolderName.trim()}
                  className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Doc / Sheet Modal */}
      {isNewDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              Create Google Workspace Document
            </h3>
            <form onSubmit={handleCreateDoc} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Document Type
                </label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewDocType('document')}
                    className={`flex items-center justify-center gap-2 rounded-xl p-2 text-xs font-semibold border transition-all ${
                      newDocType === 'document'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span>Google Doc</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDocType('spreadsheet')}
                    className={`flex items-center justify-center gap-2 rounded-xl p-2 text-xs font-semibold border transition-all ${
                      newDocType === 'spreadsheet'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                    <span>Google Sheet</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Document Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q3 Performance Review Outline"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  autoFocus
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewDocModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingDoc || !newDocTitle.trim()}
                  className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  {isCreatingDoc ? 'Creating...' : 'Create & Open'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload File to Drive Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Upload File to Google Drive
              </h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Destination: <strong className="text-slate-700 dark:text-slate-200">{currentFolder.name}</strong>
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center cursor-pointer hover:border-indigo-500 dark:border-slate-700 dark:hover:border-indigo-400 transition-colors"
              >
                <Upload className="h-8 w-8 text-slate-400 mb-2" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {selectedUploadFile
                    ? selectedUploadFile.name
                    : 'Click or drag file here to upload'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Supports PDFs, Docs, Images, Spreadsheets, and Text files
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedUploadFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </div>

              {selectedUploadFile && (
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-800">
                  <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                    {selectedUploadFile.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {googleDriveService.formatBytes(selectedUploadFile.size)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedUploadFile}
                  className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  {isUploading ? 'Uploading to Drive...' : 'Upload Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
