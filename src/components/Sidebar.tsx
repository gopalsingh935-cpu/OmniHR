import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Star,
  FileBarChart,
  DollarSign,
  ShieldCheck,
  Lock,
  DownloadCloud,
  HardDrive,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storageService';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingLeavesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingLeavesCount,
}) => {
  const { currentUser, triggerManualSync, isSyncing } = useAuth();
  const lastBackup = storageService.getLastBackupTime();

  const navItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'employees', label: 'Employee Records', icon: Users },
    {
      id: 'leaves',
      label: 'Leave Management',
      icon: CalendarDays,
      badge: pendingLeavesCount > 0 ? pendingLeavesCount : undefined,
    },
    { id: 'forecast', label: 'Predictive Staffing', icon: Sparkles },
    { id: 'reviews', label: 'Performance Reviews', icon: Star },
    { id: 'reports', label: 'Monthly Reports', icon: FileBarChart },
    { id: 'payroll', label: 'Payroll & Documents', icon: DollarSign },
    { id: 'drive', label: 'Google Drive', icon: HardDrive },
    { id: 'audit', label: 'Audit Log & Security', icon: ShieldCheck },
  ];

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shrink-0 no-print">
      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Core Workspaces
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isActive
                      ? 'bg-white text-indigo-600'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Security & Backup Panel in sidebar footer */}
      <div className="border-t border-slate-200 p-3.5 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        <div className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-emerald-500" /> AES-256 Vault
            </span>
            <span className="text-[10px] text-emerald-600 font-bold dark:text-emerald-400">Encrypted</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            Last Cloud Backup: {lastBackup.split(' ')[0]}
          </div>

          <button
            onClick={triggerManualSync}
            disabled={isSyncing}
            className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            <DownloadCloud className={`h-3 w-3 ${isSyncing ? 'animate-bounce' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Cloud Vault'}</span>
          </button>
        </div>

        {/* Current User Quick Info */}
        <div className="mt-3 flex items-center gap-2.5 px-1">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {currentUser.name}
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
              {currentUser.role}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
