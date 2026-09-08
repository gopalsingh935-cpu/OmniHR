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
import { BiometricModal } from './components/BiometricModal';
import { OAuthModal } from './components/OAuthModal';
import { NotificationsModal } from './components/NotificationsModal';

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [autoOpenApplyLeave, setAutoOpenApplyLeave] = useState(false);

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

            {activeTab === 'employees' && <EmployeeDirectory />}

            {activeTab === 'leaves' && (
              <LeaveManagement initialApplyOpen={autoOpenApplyLeave} />
            )}

            {activeTab === 'reviews' && <PerformanceReviews />}

            {activeTab === 'reports' && <MonthlyReports />}

            {activeTab === 'payroll' && <PayrollAndDocuments />}

            {activeTab === 'drive' && <GoogleDriveWorkspace />}

            {activeTab === 'audit' && <AuditLogViewer />}
          </div>
        </main>

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
