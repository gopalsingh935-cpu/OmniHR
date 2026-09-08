import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Star,
  FileBarChart,
  DollarSign,
  ShieldCheck,
  HardDrive,
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingLeavesCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  pendingLeavesCount,
}) => {
  const tabs = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'employees', label: 'Directory', icon: Users },
    {
      id: 'leaves',
      label: 'Leaves',
      icon: CalendarDays,
      badge: pendingLeavesCount > 0 ? pendingLeavesCount : undefined,
    },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    { id: 'drive', label: 'Drive', icon: HardDrive },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'audit', label: 'Audit', icon: ShieldCheck },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 px-2 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 no-print safe-area-bottom">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex flex-col items-center justify-center p-1.5 transition-colors ${
              isActive
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {tab.badge !== undefined && (
                <span className="absolute -top-1 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
