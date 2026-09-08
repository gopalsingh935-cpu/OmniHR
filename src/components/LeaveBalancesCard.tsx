import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  PlusCircle,
  ArrowUpRight,
  UserCheck,
  Calendar,
  Coffee,
  HeartPulse,
  Info,
  ChevronDown,
} from 'lucide-react';
import { Employee } from '../types';

interface LeaveBalancesCardProps {
  currentUser: Employee;
  employees: Employee[];
  onOpenApplyLeave: () => void;
  onNavigateTab: (tab: string) => void;
}

interface CircularProgressProps {
  remaining: number;
  total: number;
  used: number;
  label: string;
  categoryCode: string;
  colorScheme: 'indigo' | 'emerald' | 'sky';
  icon: React.ComponentType<{ className?: string }>;
  policyNote: string;
}

const CircularProgressRing: React.FC<CircularProgressProps> = ({
  remaining,
  total,
  used,
  label,
  categoryCode,
  colorScheme,
  icon: Icon,
  policyNote,
}) => {
  const percentage = total > 0 ? Math.round((remaining / total) * 100) : 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  // Calculate offset so ring fills corresponding to remaining proportion
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  const colorStyles = {
    indigo: {
      stroke: 'stroke-indigo-600 dark:stroke-indigo-400',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60',
      iconContainer: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',
      textAccent: 'text-indigo-600 dark:text-indigo-400',
      subtleBg: 'bg-indigo-500/5',
    },
    emerald: {
      stroke: 'stroke-emerald-500 dark:stroke-emerald-400',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
      iconContainer: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
      textAccent: 'text-emerald-600 dark:text-emerald-400',
      subtleBg: 'bg-emerald-500/5',
    },
    sky: {
      stroke: 'stroke-sky-500 dark:stroke-sky-400',
      badge: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60',
      iconContainer: 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400',
      textAccent: 'text-sky-600 dark:text-sky-400',
      subtleBg: 'bg-sky-500/5',
    },
  };

  const style = colorStyles[colorScheme];

  return (
    <div className={`relative flex flex-col items-center rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all duration-200 hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-800/40 dark:hover:border-slate-700`}>
      {/* Category Header */}
      <div className="w-full flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${style.iconContainer}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
              {label}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Code: {categoryCode}
            </span>
          </div>
        </div>
        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${style.badge}`}>
          {percentage}% left
        </span>
      </div>

      {/* Circular Progress Ring */}
      <div className="relative my-2 flex items-center justify-center">
        <svg className="h-28 w-28 -rotate-90 transform" viewBox="0 0 104 104" aria-hidden="true">
          {/* Background track */}
          <circle
            cx="52"
            cy="52"
            r={radius}
            className="stroke-slate-200/70 dark:stroke-slate-700/60"
            strokeWidth="8"
            fill="transparent"
          />
          {/* Active progress arc */}
          <circle
            cx="52"
            cy="52"
            r={radius}
            className={`${style.stroke} transition-all duration-700 ease-out`}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {remaining}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 -mt-0.5">
            Days Left
          </span>
        </div>
      </div>

      {/* Details Breakdown */}
      <div className="w-full mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Used / Quota</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {used} <span className="text-slate-400 font-normal">/ {total} days</span>
          </span>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight truncate">
          {policyNote}
        </p>
      </div>
    </div>
  );
};

export const LeaveBalancesCard: React.FC<LeaveBalancesCardProps> = ({
  currentUser,
  employees,
  onOpenApplyLeave,
  onNavigateTab,
}) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(currentUser.id);

  // Synchronize when the global user switches
  useEffect(() => {
    setSelectedEmployeeId(currentUser.id);
  }, [currentUser.id]);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId) || currentUser;
  const isViewingSelf = selectedEmployee.id === currentUser.id;
  const balance = selectedEmployee.leaveBalance;

  // Aggregate stats
  const totalDays = balance.EL.total + balance.CL.total + balance.SL.total + balance.PL.total;
  const totalRemaining =
    balance.EL.remaining + balance.CL.remaining + balance.SL.remaining + balance.PL.remaining;
  const totalUsed = balance.EL.used + balance.CL.used + balance.SL.used + balance.PL.used;

  return (
    <div
      id="leave-balances-card"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-all"
    >
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 shrink-0">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Leave Balances
              </h3>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                2026 Policy Year
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live entitlement allowances and remaining days visualized with circular progress rings
            </p>
          </div>
        </div>

        {/* Action Controls & Team Member Selector (for Managers/Admins) */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {currentUser.role !== 'employee' && employees.length > 1 && (
            <div className="relative inline-flex items-center">
              <select
                id="leave-balance-employee-select"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                aria-label="Select employee leave balance"
              >
                <option value={currentUser.id}>Viewing: {currentUser.name} (You)</option>
                {employees
                  .filter((e) => e.id !== currentUser.id)
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department})
                    </option>
                  ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          )}

          <button
            id="leave-balance-apply-btn"
            onClick={onOpenApplyLeave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Apply Leave</span>
          </button>

          <button
            id="leave-balance-view-all-btn"
            onClick={() => onNavigateTab('leaves')}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            <span>History</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Team Member Switch Notice (if viewing someone else) */}
      {!isViewingSelf && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-indigo-50/60 p-2.5 px-3 border border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900/40">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
              Showing leave records for {selectedEmployee.name} ({selectedEmployee.designation})
            </span>
          </div>
          <button
            onClick={() => setSelectedEmployeeId(currentUser.id)}
            className="text-[11px] font-bold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Reset to Me
          </button>
        </div>
      )}

      {/* Aggregate Balance Bar */}
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-[10px] font-medium text-slate-400 block">Total Quota</span>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {totalDays} <span className="text-xs font-normal text-slate-400">days</span>
          </span>
        </div>
        <div>
          <span className="text-[10px] font-medium text-slate-400 block">Total Remaining</span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {totalRemaining} <span className="text-xs font-normal text-emerald-500">days</span>
          </span>
        </div>
        <div>
          <span className="text-[10px] font-medium text-slate-400 block">Total Utilized</span>
          <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
            {totalUsed} <span className="text-xs font-normal text-slate-400">days</span>
          </span>
        </div>
      </div>

      {/* 3 Circular Progress Rings: Annual Leave, Casual Leave, Sick Leave */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Annual Leave (Earned Leave / EL) */}
        <CircularProgressRing
          remaining={balance.EL.remaining}
          total={balance.EL.total}
          used={balance.EL.used}
          label="Annual Leave"
          categoryCode="EL"
          colorScheme="indigo"
          icon={Calendar}
          policyNote="Carryover up to 10 days • Paid time off"
        />

        {/* Casual Leave (CL) */}
        <CircularProgressRing
          remaining={balance.CL.remaining}
          total={balance.CL.total}
          used={balance.CL.used}
          label="Casual Leave"
          categoryCode="CL"
          colorScheme="emerald"
          icon={Coffee}
          policyNote="Short notice personal leave • Zero carryover"
        />

        {/* Sick Leave (SL) */}
        <CircularProgressRing
          remaining={balance.SL.remaining}
          total={balance.SL.total}
          used={balance.SL.used}
          label="Sick Leave"
          categoryCode="SL"
          colorScheme="sky"
          icon={HeartPulse}
          policyNote="Medical certificate required for >2 days"
        />
      </div>

      {/* Card Footer: Privilege / Parental Leave Reference & Policy Period */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>
            Privilege/Parental Leave (PL):{' '}
            <strong className="text-slate-700 dark:text-slate-300">
              {balance.PL.remaining} of {balance.PL.total} days remaining
            </strong>
          </span>
        </div>
        <div className="text-slate-400 text-[10px]">
          Cycle: Jan 1 – Dec 31, 2026 • Accruals calculated monthly
        </div>
      </div>
    </div>
  );
};
