import React, { useState } from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  RefreshCw,
  Fingerprint,
  ChevronDown,
  Shield,
  UserCheck,
  Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storageService';
import { Role } from '../types';

interface NavbarProps {
  onSearchChange?: (term: string) => void;
  onOpenNotifications: () => void;
  unreadNotifsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSearchChange,
  onOpenNotifications,
  unreadNotifsCount,
}) => {
  const {
    currentUser,
    setCurrentUser,
    isDarkMode,
    toggleDarkMode,
    isOnline,
    isSimulatedOffline,
    toggleSimulatedOffline,
    pendingSyncCount,
    triggerManualSync,
    isSyncing,
    openBiometricModal,
    openOAuthModal,
  } = useAuth();

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const allEmployees = storageService.getEmployees();

  const handleRoleSwitch = (empId: string) => {
    const selected = allEmployees.find((e) => e.id === empId);
    if (selected) {
      setCurrentUser(selected);
      setIsUserDropdownOpen(false);
    }
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'manager':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6 dark:border-slate-800 dark:bg-slate-900/95 no-print">
      {/* Brand & Mobile Hamburger space */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-md shadow-indigo-500/20">
          <Shield className="h-5 w-5" />
        </div>
        <div className="hidden sm:block">
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
              Omni<span className="text-indigo-600 dark:text-indigo-400">HR</span>
            </span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Enterprise v2.4
            </span>
          </div>
          <p className="text-[10px] text-slate-400">RBAC • Leave Management • SOC2 Compliance</p>
        </div>
      </div>

      {/* Center Search (Optional Quick Filter) */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search employees, reviews, leave records..."
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-1.5 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:focus:bg-slate-800"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Offline / Online indicator & Switcher */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleSimulatedOffline}
            title={isOnline ? 'Click to simulate Offline Mode' : 'Click to restore Online status'}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
              isOnline
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
                <span>Offline Mode</span>
              </>
            )}
          </button>

          {/* Sync Trigger button if there are pending items */}
          {pendingSyncCount > 0 && (
            <button
              onClick={triggerManualSync}
              disabled={isSyncing || !isOnline}
              title="Synchronize offline changes with cloud"
              className="flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync ({pendingSyncCount})</span>
            </button>
          )}
        </div>

        {/* Biometrics Quick Icon */}
        <button
          onClick={openBiometricModal}
          title="Verify Biometric Passkey"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        >
          <Fingerprint className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </button>

        {/* OAuth SSO Icon */}
        <button
          onClick={openOAuthModal}
          title="Manage Enterprise SSO (OAuth 2.0)"
          className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        >
          <Globe className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        >
          {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notifications Bell */}
        <button
          onClick={onOpenNotifications}
          title="Notifications"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
        >
          <Bell className="h-4 w-4" />
          {unreadNotifsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
              {unreadNotifsCount}
            </span>
          )}
        </button>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-0.5"></div>

        {/* User Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-1.5 pr-2.5 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-all"
          >
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="h-7 w-7 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
            />
            <div className="text-left hidden lg:block">
              <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-slate-400 capitalize">
                {currentUser.role} • {currentUser.department}
              </div>
            </div>
            <span
              className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm border ${getRoleBadge(
                currentUser.role
              )}`}
            >
              {currentUser.role}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {/* User Switcher Menu */}
          {isUserDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-50 dark:border-slate-800 dark:bg-slate-900">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Switch Active Persona (RBAC)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Test the application as HR Admin, Manager, or Employee to view permission constraints in real-time.
                </p>
              </div>

              <div className="mt-1 space-y-1">
                {allEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleRoleSwitch(emp.id)}
                    className={`w-full flex items-center justify-between rounded-xl p-2 text-left transition-colors ${
                      currentUser.id === emp.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={emp.avatarUrl}
                        alt={emp.name}
                        className="h-8 w-8 rounded-lg object-cover"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{emp.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{emp.designation}</div>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-sm border shrink-0 ${getRoleBadge(
                        emp.role
                      )}`}
                    >
                      {emp.role}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-2 border-t border-slate-100 pt-2 px-2 text-[10px] text-slate-400 dark:border-slate-800">
                Logged in with AES-256 encrypted session.
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
