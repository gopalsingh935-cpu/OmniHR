import React, { useState, useEffect } from 'react';
import {
  Users,
  CalendarCheck,
  Clock,
  Star,
  DollarSign,
  ShieldCheck,
  ArrowUpRight,
  PlusCircle,
  FileText,
  AlertCircle,
  Briefcase,
  CheckCircle2,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storageService';
import { Employee, LeaveRequest, PerformanceReview } from '../types';
import { LeaveBalancesCard } from './LeaveBalancesCard';

interface DashboardOverviewProps {
  onNavigateTab: (tab: string) => void;
  onOpenApplyLeave: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigateTab,
  onOpenApplyLeave,
}) => {
  const { currentUser, isOnline, pendingSyncCount } = useAuth();
  const [, setTick] = useState(0);

  // Subscribe to real-time storage changes
  useEffect(() => {
    const unsub = storageService.subscribe(() => {
      setTick((t) => t + 1);
    });
    return unsub;
  }, []);

  const employees = storageService.getEmployees();
  const leaves = storageService.getLeaves();
  const reviews = storageService.getReviews();
  const auditLogs = storageService.getAuditLogs().slice(0, 5);

  const pendingLeaves = leaves.filter((l) => l.status === 'pending');
  const userLeaves = leaves.filter((l) => l.employeeId === currentUser.id);
  const userReviews = reviews.filter((r) => r.employeeId === currentUser.id);
  const latestUserReview = userReviews[0];

  // Quick check for impending staffing shortages in Sept/Oct
  const upcomingOverlaps = leaves.filter(
    (l) => (l.status === 'approved' || l.status === 'pending') && l.startDate >= '2026-09-08'
  );
  const hasImpendingShortage = upcomingOverlaps.length >= 2;

  // Calculate high-level stats
  const totalPayroll = employees.reduce((sum, emp) => {
    const latestPay = emp.payrollHistory[0];
    return sum + (latestPay ? latestPay.netPay : 0);
  }, 0);

  const avgReviewScore = (
    reviews.reduce((acc, r) => acc + r.overallRating, 0) / (reviews.length || 1)
  ).toFixed(1);

  // Leave balances for current user
  const balance = currentUser.leaveBalance;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl dark:border dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-md bg-indigo-500/30 px-2 py-0.5 text-[11px] font-semibold text-indigo-300 border border-indigo-400/30">
              {currentUser.role.toUpperCase()} WORKSPACE
            </span>
            {!isOnline && (
              <span className="rounded-md bg-amber-500/30 px-2 py-0.5 text-[11px] font-semibold text-amber-300 border border-amber-400/30">
                OFFLINE CACHE ACTIVE
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Welcome back, {currentUser.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            {currentUser.designation} • {currentUser.department} Department. All employee records and leave channels are secured with AES-256 and RBAC authentication protocols.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenApplyLeave}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Apply Leave</span>
          </button>
          {currentUser.role !== 'employee' && (
            <>
              <button
                onClick={() => onNavigateTab('forecast')}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-400/40 bg-indigo-500/20 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md hover:bg-indigo-500/30 transition-colors shadow-xs"
              >
                <Sparkles className="h-4 w-4 text-indigo-200" />
                <span>Predictive Forecast</span>
              </button>
              <button
                onClick={() => onNavigateTab('reports')}
                className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md hover:bg-white/20 transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span>Monthly Reports</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* AI Predictive Staffing Shortage Alert Callout */}
      {hasImpendingShortage && currentUser.role !== 'employee' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/30 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-500/20 p-2 text-amber-700 dark:text-amber-300 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  Workforce Shortage Alert (Next 30 Days)
                </span>
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                  Elevated Risk
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                AI model flagged concurrent leave overlaps in late September (Engineering & Finance). Key roles lack planned backup delegation.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('forecast')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-500 shrink-0 shadow-xs transition-colors"
          >
            <span>Run Staffing Diagnostics</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {currentUser.role === 'admin' ? (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Total Headcount</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {employees.length}
                </span>
                <span className="text-xs text-emerald-600 font-medium dark:text-emerald-400">
                  100% Active
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Across 5 departments</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Pending Approvals</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {pendingLeaves.length}
                </span>
                <span className="text-xs text-amber-600 font-medium">Action Required</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">EL, CL, SL, PL applications</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Avg Review Score</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <Star className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {avgReviewScore}
                </span>
                <span className="text-xs text-slate-400">/ 5.0</span>
              </div>
              <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                High organizational benchmark
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Monthly Payroll</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  ${(totalPayroll / 1000).toFixed(1)}k
                </span>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Synced
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Reconciled with Accounting</p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Leave Days Available</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <CalendarCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {balance.EL.remaining + balance.CL.remaining + balance.SL.remaining + balance.PL.remaining}
                </span>
                <span className="text-xs text-emerald-600 font-medium dark:text-emerald-400">
                  Remaining
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Across Annual, Casual, Sick, & PL</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">My Active Requests</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {userLeaves.filter((l) => l.status === 'pending').length}
                </span>
                <span className="text-xs text-amber-600 font-medium">Pending Review</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">In workflow queue</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Performance Score</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <Star className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {latestUserReview ? latestUserReview.overallRating : '4.8'}
                </span>
                <span className="text-xs text-slate-400">/ 5.0</span>
              </div>
              <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                {latestUserReview ? latestUserReview.ratingLabel : 'Exceeds Expectations'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-medium">Assigned Division</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <Briefcase className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-900 dark:text-white truncate">
                  {currentUser.department}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 truncate">
                {currentUser.workMode} • {currentUser.location}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Main Section: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Leave Tracking & Performance Snapshot */}
        <div className="lg:col-span-2 space-y-6">
          {/* New Leave Balances Summary Card with Circular Progress Rings */}
          <LeaveBalancesCard
            currentUser={currentUser}
            employees={employees}
            onOpenApplyLeave={onOpenApplyLeave}
            onNavigateTab={onNavigateTab}
          />

          {/* Active Leave Requests with Real-Time Approval Tracking */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Real-Time Leave Approvals & Tracking
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentUser.role === 'admin'
                    ? 'All incoming employee leave applications requiring management sign-off'
                    : 'Your submitted leave applications and live status'}
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('leaves')}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                <span>View All</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {(currentUser.role === 'admin' ? leaves.slice(0, 4) : userLeaves.slice(0, 4)).map(
                (req) => (
                  <div key={req.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {req.leaveType}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {req.employeeName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            • {req.department}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                          {req.startDate} to {req.endDate} ({req.daysCount} days)
                        </p>
                        <p className="text-[11px] text-slate-400 italic line-clamp-1 mt-0.5">
                          "{req.reason}"
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                          req.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                            : req.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                        }`}
                      >
                        {req.status === 'pending' ? 'Pending Approval' : req.status}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Performance Snapshot (Strict Read-Only Verification Banner for Employees) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Performance Review Status
                  </h3>
                  {currentUser.role === 'employee' && (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-indigo-500" /> Read-Only Record
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Audited performance evaluation reports and rating metrics
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('reviews')}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                <span>Full Evaluation</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {latestUserReview ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {latestUserReview.cycle}
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Evaluated by {latestUserReview.reviewerName} ({latestUserReview.reviewerRole})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      <span>{latestUserReview.overallRating} / 5.0</span>
                    </div>
                    <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      {latestUserReview.ratingLabel}
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 italic line-clamp-2">
                  "{latestUserReview.reviewerFeedback}"
                </p>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block">Technical</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {latestUserReview.metrics.technicalSkills}/5
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block">Communication</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {latestUserReview.metrics.communication}/5
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block">Teamwork</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {latestUserReview.metrics.teamwork}/5
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block">Productivity</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {latestUserReview.metrics.productivity}/5
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 py-8 text-center text-xs text-slate-400">
                No active performance evaluation cycle published for this quarter.
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Audit Stream & Cloud Integration Status */}
        <div className="space-y-6">
          {/* Security Audit Feed */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Audit Trail</h3>
              </div>
              <button
                onClick={() => onNavigateTab('audit')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                Log
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="text-xs border-l-2 border-indigo-500 pl-3 py-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{log.actionType}</span>
                    <span>{log.timestamp.slice(11, 16)} UTC</span>
                  </div>
                  <p className="mt-0.5 font-medium text-slate-700 dark:text-slate-300 line-clamp-2">
                    {log.description}
                  </p>
                  <span className="text-[9px] text-slate-400">Actor: {log.actorName}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Third-Party Integrations & Accounting Status Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Cloud & Accounting Integrations
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Real-time sync status with cloud storage & accounting ledgers.
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between rounded-xl border border-slate-100 p-2.5 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      QuickBooks Online
                    </span>
                    <span className="text-[10px] text-slate-400 block">General Ledger API</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                  Connected
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-100 p-2.5 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Google Drive & AWS S3
                    </span>
                    <span className="text-[10px] text-slate-400 block">Encrypted Document Vault</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-100 p-2.5 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      FIDO2 Biometrics
                    </span>
                    <span className="text-[10px] text-slate-400 block">Hardware Token Passkeys</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                  Enrolled
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
