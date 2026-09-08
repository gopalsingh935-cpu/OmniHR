import React from 'react';
import {
  CalendarCheck,
  PlusCircle,
  Coffee,
  HeartPulse,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  User,
  ShieldCheck,
} from 'lucide-react';
import { Employee, LeaveType } from '../types';

interface EmployeeLeaveBalanceBarProps {
  currentUser: Employee;
  selectedEmployee: Employee;
  allEmployees?: Employee[];
  onSelectEmployee?: (employeeId: string) => void;
  onApplyForLeave: (preselectedCategory?: LeaveType) => void;
}

interface CategoryConfig {
  name: string;
  code: LeaveType;
  subtitle: string;
  tag: string;
  icon: React.ComponentType<{ className?: string }>;
  policyNote: string;
  colors: {
    cardBg: string;
    cardBorder: string;
    iconBg: string;
    iconText: string;
    titleText: string;
    tagBadge: string;
    percentBadge: string;
    progressTrack: string;
    progressBar: string;
    glowColor: string;
    btnStyle: string;
  };
}

const LEAVE_CONFIGS: Record<LeaveType, CategoryConfig> = {
  EL: {
    name: 'Earned Leave',
    code: 'EL',
    subtitle: 'Annual Vacation',
    tag: 'Annual',
    icon: CalendarCheck,
    policyNote: 'Max 10 days carry-over allowed into next year',
    colors: {
      cardBg: 'bg-indigo-50/60 dark:bg-indigo-950/25',
      cardBorder: 'border-indigo-100 dark:border-indigo-900/40 hover:border-indigo-300 dark:hover:border-indigo-700',
      iconBg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300',
      iconText: 'text-indigo-700 dark:text-indigo-300',
      titleText: 'text-indigo-950 dark:text-indigo-200',
      tagBadge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      percentBadge: 'bg-indigo-600 text-white',
      progressTrack: 'bg-indigo-100/80 dark:bg-indigo-950/80 border-indigo-200/50 dark:border-indigo-900/50',
      progressBar: 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 shadow-xs shadow-indigo-500/30',
      glowColor: 'bg-indigo-500',
      btnStyle: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow-indigo-500/25',
    },
  },
  CL: {
    name: 'Casual Leave',
    code: 'CL',
    subtitle: 'Short Notice & Personal',
    tag: 'Short Notice',
    icon: Coffee,
    policyNote: 'Available on short notice for unforeseen personal duties',
    colors: {
      cardBg: 'bg-emerald-50/60 dark:bg-emerald-950/25',
      cardBorder: 'border-emerald-100 dark:border-emerald-900/40 hover:border-emerald-300 dark:hover:border-emerald-700',
      iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
      iconText: 'text-emerald-700 dark:text-emerald-300',
      titleText: 'text-emerald-950 dark:text-emerald-200',
      tagBadge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      percentBadge: 'bg-emerald-600 text-white',
      progressTrack: 'bg-emerald-100/80 dark:bg-emerald-950/80 border-emerald-200/50 dark:border-emerald-900/50',
      progressBar: 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 shadow-xs shadow-emerald-500/30',
      glowColor: 'bg-emerald-500',
      btnStyle: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-emerald-500/25',
    },
  },
  SL: {
    name: 'Sick Leave',
    code: 'SL',
    subtitle: 'Medical & Wellness',
    tag: 'Medical',
    icon: HeartPulse,
    policyNote: 'Medical documentation required for absences > 2 consecutive days',
    colors: {
      cardBg: 'bg-blue-50/60 dark:bg-blue-950/25',
      cardBorder: 'border-blue-100 dark:border-blue-900/40 hover:border-blue-300 dark:hover:border-blue-700',
      iconBg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300',
      iconText: 'text-blue-700 dark:text-blue-300',
      titleText: 'text-blue-950 dark:text-blue-200',
      tagBadge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      percentBadge: 'bg-blue-600 text-white',
      progressTrack: 'bg-blue-100/80 dark:bg-blue-950/80 border-blue-200/50 dark:border-blue-900/50',
      progressBar: 'bg-gradient-to-r from-blue-500 via-sky-600 to-blue-700 shadow-xs shadow-blue-500/30',
      glowColor: 'bg-blue-500',
      btnStyle: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow-blue-500/25',
    },
  },
  PL: {
    name: 'Privilege Leave',
    code: 'PL',
    subtitle: 'Parental & Extended',
    tag: 'Extended',
    icon: Sparkles,
    policyNote: 'Extended parental, sabbatical, or bereavement allocation',
    colors: {
      cardBg: 'bg-purple-50/60 dark:bg-purple-950/25',
      cardBorder: 'border-purple-100 dark:border-purple-900/40 hover:border-purple-300 dark:hover:border-purple-700',
      iconBg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300',
      iconText: 'text-purple-700 dark:text-purple-300',
      titleText: 'text-purple-950 dark:text-purple-200',
      tagBadge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      percentBadge: 'bg-purple-600 text-white',
      progressTrack: 'bg-purple-100/80 dark:bg-purple-950/80 border-purple-200/50 dark:border-purple-900/50',
      progressBar: 'bg-gradient-to-r from-purple-500 via-purple-600 to-fuchsia-600 shadow-xs shadow-purple-500/30',
      glowColor: 'bg-purple-500',
      btnStyle: 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs hover:shadow-purple-500/25',
    },
  },
};

export const EmployeeLeaveBalanceBar: React.FC<EmployeeLeaveBalanceBarProps> = ({
  currentUser,
  selectedEmployee,
  allEmployees = [],
  onSelectEmployee,
  onApplyForLeave,
}) => {
  const balance = selectedEmployee.leaveBalance;
  const isViewingSelf = selectedEmployee.id === currentUser.id;
  const canSwitchEmployee =
    (currentUser.role === 'manager' || currentUser.role === 'admin') &&
    allEmployees.length > 0 &&
    Boolean(onSelectEmployee);

  // Compute aggregate quota stats
  const totalDays = balance.EL.total + balance.CL.total + balance.SL.total + balance.PL.total;
  const totalRemaining =
    balance.EL.remaining + balance.CL.remaining + balance.SL.remaining + balance.PL.remaining;
  const totalUsed = balance.EL.used + balance.CL.used + balance.SL.used + balance.PL.used;
  const totalAvailablePercent = totalDays > 0 ? Math.round((totalRemaining / totalDays) * 100) : 0;

  return (
    <div id="employee-leave-balance-section" className="space-y-4">
      {/* Overview Top Header & Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            {selectedEmployee.avatarUrl ? (
              <img
                src={selectedEmployee.avatarUrl}
                alt={selectedEmployee.name}
                className="h-10 w-10 rounded-xl object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User className="h-5 w-5" />
            )}
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                selectedEmployee.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {selectedEmployee.name}
              </span>
              {isViewingSelf ? (
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  My Balances
                </span>
              ) : (
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                  Inspecting Team Member
                </span>
              )}
              <span className="text-xs text-slate-400">
                {selectedEmployee.designation} • {selectedEmployee.department}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              2026 Annual Entitlement: <strong className="text-slate-700 dark:text-slate-200">{totalRemaining}</strong> days available out of <strong className="text-slate-700 dark:text-slate-200">{totalDays}</strong> allocated days ({totalAvailablePercent}% remaining)
            </p>
          </div>
        </div>

        {/* Manager/Admin Team Switcher & Quick Reset */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
          {canSwitchEmployee && onSelectEmployee && (
            <div className="flex items-center gap-2">
              <label htmlFor="employee-balance-select" className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                Inspect:
              </label>
              <select
                id="employee-balance-select"
                value={selectedEmployee.id}
                onChange={(e) => onSelectEmployee(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value={currentUser.id}>Myself ({currentUser.name})</option>
                <optgroup label="Team & Organization">
                  {allEmployees
                    .filter((e) => e.id !== currentUser.id)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department})
                      </option>
                    ))}
                </optgroup>
              </select>

              {!isViewingSelf && (
                <button
                  type="button"
                  onClick={() => onSelectEmployee(currentUser.id)}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                  title="Return to your personal leave balances"
                >
                  My View
                </button>
              )}
            </div>
          )}

          {isViewingSelf && (
            <button
              type="button"
              onClick={() => onApplyForLeave()}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Apply For Leave</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Category Cards with 'Available Balance' Progress Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(['EL', 'CL', 'SL', 'PL'] as const).map((catCode) => {
          const cfg = LEAVE_CONFIGS[catCode];
          const cat = balance[catCode];
          const IconComponent = cfg.icon;

          const remaining = cat.remaining;
          const total = cat.total;
          const used = cat.used;
          const availablePercentage = total > 0 ? Math.round((remaining / total) * 100) : 0;

          const isExhausted = remaining <= 0;
          const isLow = remaining > 0 && remaining <= 2;

          return (
            <div
              key={catCode}
              id={`leave-balance-card-${catCode.toLowerCase()}`}
              className={`group relative flex flex-col justify-between rounded-2xl border ${cfg.colors.cardBorder} ${cfg.colors.cardBg} p-4 transition-all duration-200 shadow-2xs`}
            >
              {/* Top Row: Icon + Title + Category Tag */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cfg.colors.iconBg}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold ${cfg.colors.titleText} leading-tight`}>
                        {cfg.name} ({cfg.code})
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {cfg.subtitle}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${cfg.colors.tagBadge}`}
                  >
                    {cfg.tag}
                  </span>
                </div>

                {/* Main Days Available Readout */}
                <div className="mt-3 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {remaining}
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Days Left
                    </span>
                  </div>

                  {/* Available Percentage Badge */}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                      isExhausted
                        ? 'bg-rose-600 text-white'
                        : isLow
                        ? 'bg-amber-500 text-white'
                        : cfg.colors.percentBadge
                    }`}
                  >
                    {availablePercentage}% Avail.
                  </span>
                </div>

                {/* 'Available Balance' Progress Bar Header */}
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Available Balance
                  </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {remaining} / {total} days
                  </span>
                </div>

                {/* Progress Bar Track & Fill */}
                <div
                  className={`mt-1.5 h-2.5 w-full overflow-hidden rounded-full border ${cfg.colors.progressTrack} relative shadow-inner`}
                  role="progressbar"
                  aria-label={`Available Balance for ${cfg.name}`}
                  aria-valuenow={remaining}
                  aria-valuemin={0}
                  aria-valuemax={total}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      isExhausted
                        ? 'bg-rose-500'
                        : isLow
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                        : cfg.colors.progressBar
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(0, availablePercentage))}%`,
                    }}
                  />
                </div>

                {/* Sub-metrics: Used vs Total Quota */}
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span>
                    Used: <strong className="font-semibold text-slate-700 dark:text-slate-300">{used} days</strong>
                  </span>
                  <span>
                    Total Quota: <strong className="font-semibold text-slate-700 dark:text-slate-300">{total} days</strong>
                  </span>
                </div>
              </div>

              {/* Status Alert or Policy Note & Direct Apply Action */}
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2">
                <div className="flex-1 truncate">
                  {isExhausted ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>Quota exhausted</span>
                    </span>
                  ) : isLow ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span>Low balance ({remaining}d left)</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 truncate" title={cfg.policyNote}>
                      <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-500" />
                      <span className="truncate">{cfg.policyNote}</span>
                    </span>
                  )}
                </div>

                {/* Quick Apply Button with preselected category */}
                {isViewingSelf && (
                  <button
                    type="button"
                    onClick={() => onApplyForLeave(catCode)}
                    disabled={isExhausted}
                    className={`shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition-all ${
                      isExhausted
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                        : `${cfg.colors.btnStyle}`
                    }`}
                    title={`Apply for ${cfg.name}`}
                  >
                    <span>Apply {catCode}</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
