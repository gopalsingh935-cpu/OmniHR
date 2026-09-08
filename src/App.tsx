import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { storageService } from './services/storageService';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { DashboardOverview } from './components/DashboardOverview';
import { EmployeeDirectory } from './components/EmployeeDirectory';
import { LeaveManagement } from './components/LeaveManagement';
import { PerformanceReviews } from './components/PerformanceReviews';
import { MonthlyReports } from './components/MonthlyReports';
import { PayrollAndDocuments } from './components/PayrollAndDocuments';
import { GoogleDriveWorkspace } from './components/GoogleDriveWorkspace';
import { AuditLogViewer } from './components/AuditLogViewer';
import { PredictiveStaffingAnalytics } from './components/PredictiveStaffingAnalytics';
import { GeminiChatbot } from './components/GeminiChatbot';
import { BiometricModal } from './components/BiometricModal';
import { OAuthModal } from './components/OAuthModal';
import { NotificationsModal } from './components/NotificationsModal';
import { GlobalSearchNavigationTarget } from './components/GlobalSearch';
import { Bot } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [autoOpenApplyLeave, setAutoOpenApplyLeave] = useState(false);
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false);

  // Search and selection deep-linking state
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [leaveSearchQuery, setLeaveSearchQuery] = useState('');
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [reviewSearchQuery, setReviewSearchQuery] = useState('');
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  // Compute pending leaves count for badges
  const leaves = storageService.getLeaves();
  const pendingLeavesCount = leaves.filter((l) => l.status === 'pending').length;

  // Unread notifications count
  const unreadNotifsCount = storageService
    .getNotifications()
    .filter((n) => !n.read).length;

  const handleOpenApplyLeave = () => {
    setActiveTab('leaves');
    setAutoOpenApplyLeave(true);
  };

  const handleGlobalNavigate = (target: GlobalSearchNavigationTarget) => {
    setActiveTab(target.tab);
    setAutoOpenApplyLeave(false);

    if (target.tab === 'employees') {
      if (target.employeeId) setSelectedEmployeeId(target.employeeId);
      if (target.searchQuery !== undefined) setEmployeeSearchQuery(target.searchQuery);
    } else if (target.tab === 'leaves') {
      if (target.leaveId) setSelectedLeaveId(target.leaveId);
      if (target.searchQuery !== undefined) setLeaveSearchQuery(target.searchQuery);
    } else if (target.tab === 'reviews') {
      if (target.reviewId) setSelectedReviewId(target.reviewId);
      if (target.searchQuery !== undefined) setReviewSearchQuery(target.searchQuery);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
      {/* Sidebar (Desktop / Tablet Large) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setAutoOpenApplyLeave(false);
        }}
        pendingLeavesCount={pendingLeavesCount}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <Navbar
          unreadNotifsCount={unreadNotifsCount}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onNavigate={handleGlobalNavigate}
        />

        {/* Dynamic Workspace Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
          <div className="mx-auto max-w-7xl">
            {activeTab === 'overview' && (
              <DashboardOverview
                onNavigateTab={(tab) => {
                  setActiveTab(tab);
                  setAutoOpenApplyLeave(false);
                }}
                onOpenApplyLeave={handleOpenApplyLeave}
              />
            )}

            {activeTab === 'employees' && (
              <EmployeeDirectory
                initialSearchQuery={employeeSearchQuery}
                initialSelectedEmployeeId={selectedEmployeeId}
                onClearInitialEmployee={() => setSelectedEmployeeId(null)}
              />
            )}

            {activeTab === 'leaves' && (
              <LeaveManagement
                initialApplyOpen={autoOpenApplyLeave}
                initialSearchQuery={leaveSearchQuery}
                initialSelectedLeaveId={selectedLeaveId}
              />
            )}

            {activeTab === 'forecast' && (
              <PredictiveStaffingAnalytics
                onNavigateToLeaves={() => setActiveTab('leaves')}
                onNavigateToDrive={() => setActiveTab('drive')}
              />
            )}

            {activeTab === 'assistant' && (
              <GeminiChatbot onNavigateTab={(tab) => setActiveTab(tab)} />
            )}

            {activeTab === 'reviews' && (
              <PerformanceReviews
                initialSearchQuery={reviewSearchQuery}
                initialSelectedReviewId={selectedReviewId}
              />
            )}

            {activeTab === 'reports' && <MonthlyReports />}

            {activeTab === 'payroll' && <PayrollAndDocuments />}

            {activeTab === 'drive' && <GoogleDriveWorkspace />}

            {activeTab === 'audit' && <AuditLogViewer />}
          </div>
        </main>

        {/* Floating Quick Gemini Assistant Trigger Button (when not already in assistant tab) */}
        {activeTab !== 'assistant' && (
          <div className="fixed bottom-20 md:bottom-6 right-6 z-40 no-print">
            <button
              onClick={() => setIsFloatingChatOpen(true)}
              className="group flex items-center gap-2.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-105 active:scale-95 transition-all border border-white/20"
              title="Open Gemini AI Assistant"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="tracking-tight">Ask Gemini HR</span>
              <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[9px] font-mono uppercase">
                AI
              </span>
            </button>
          </div>
        )}

        {/* Floating Gemini Chat Modal Overlay */}
        {isFloatingChatOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs no-print">
            <div className="w-full max-w-4xl animate-in fade-in zoom-in-95 duration-200">
              <GeminiChatbot
                isModal
                onCloseModal={() => setIsFloatingChatOpen(false)}
                onNavigateTab={(tab) => {
                  setActiveTab(tab);
                  setIsFloatingChatOpen(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Bottom Navigation Bar for Mobile Devices */}
        <BottomNav
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setAutoOpenApplyLeave(false);
          }}
          pendingLeavesCount={pendingLeavesCount}
        />
      </div>

      {/* Global Security & Notification Modals */}
      <BiometricModal />
      <OAuthModal />
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsNotificationsOpen(false);
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
