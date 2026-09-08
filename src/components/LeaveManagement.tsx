import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  PlusCircle,
  MessageSquare,
  UserCheck,
  Send,
  CalendarCheck,
  Shield,
  Ban,
  ArrowRight,
  CalendarDays,
  ListOrdered,
  Layers,
  Search,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storageService';
import { LeaveRequest, LeaveType, LeaveStatus, Employee } from '../types';
import { TeamLeaveCalendar } from './TeamLeaveCalendar';
import { EmployeeLeaveBalanceBar } from './EmployeeLeaveBalanceBar';

interface LeaveManagementProps {
  initialApplyOpen?: boolean;
  initialSearchQuery?: string;
  initialSelectedLeaveId?: string | null;
}

export const LeaveManagement: React.FC<LeaveManagementProps> = ({
  initialApplyOpen = false,
  initialSearchQuery = '',
  initialSelectedLeaveId = null,
}) => {
  const { currentUser, isOnline, refreshUserData } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>(() => storageService.getLeaves());
  const [allEmployees, setAllEmployees] = useState<Employee[]>(() => storageService.getEmployees());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(currentUser.id);
  const [activeViewTab, setActiveViewTab] = useState<'calendar' | 'requests'>(
    initialSelectedLeaveId || initialSearchQuery ? 'requests' : 'calendar'
  );
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(initialApplyOpen);
  const [selectedFilter, setSelectedFilter] = useState<'all' | LeaveStatus>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | LeaveType>('all');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [highlightedLeaveId, setHighlightedLeaveId] = useState<string | null>(initialSelectedLeaveId);
  const [commentModalLeave, setCommentModalLeave] = useState<LeaveRequest | null>(null);
  const [newCommentText, setNewCommentText] = useState('');

  // Sync external search query
  useEffect(() => {
    if (initialSearchQuery !== undefined && initialSearchQuery !== '') {
      setSearchQuery(initialSearchQuery);
      setActiveViewTab('requests');
    }
  }, [initialSearchQuery]);

  // Sync external selected leave ID
  useEffect(() => {
    if (initialSelectedLeaveId) {
      setHighlightedLeaveId(initialSelectedLeaveId);
      setActiveViewTab('requests');
      setSelectedFilter('all');
      setSelectedTypeFilter('all');
    }
  }, [initialSelectedLeaveId]);

  // Keep selectedEmployeeId in sync if logged-in currentUser changes
  useEffect(() => {
    setSelectedEmployeeId(currentUser.id);
  }, [currentUser.id]);

  const selectedEmployee =
    allEmployees.find((e) => e.id === selectedEmployeeId) || currentUser;

  // Form state
  const [leaveType, setLeaveType] = useState<LeaveType>('EL');
  const [startDate, setStartDate] = useState('2026-09-21');
  const [endDate, setEndDate] = useState('2026-09-23');
  const [reason, setReason] = useState('');
  const [daysCount, setDaysCount] = useState(3);

  const balance = currentUser.leaveBalance;

  // Calculate total overlapping days in current month (September 2026)
  const currentMonthOverlapsCount = useMemo(() => {
    let count = 0;
    for (let day = 1; day <= 30; day++) {
      const dateStr = `2026-09-${String(day).padStart(2, '0')}`;
      const onDay = leaves.filter(
        (l) =>
          l.status !== 'rejected' &&
          l.status !== 'cancelled' &&
          l.startDate <= dateStr &&
          l.endDate >= dateStr
      );
      if (onDay.length >= 2) count++;
    }
    return count;
  }, [leaves]);

  // Calculate cross-department overlapping days in current month (September 2026)
  const currentMonthCrossDeptOverlapsCount = useMemo(() => {
    let count = 0;
    for (let day = 1; day <= 30; day++) {
      const dateStr = `2026-09-${String(day).padStart(2, '0')}`;
      const onDay = leaves.filter(
        (l) =>
          l.status !== 'rejected' &&
          l.status !== 'cancelled' &&
          l.startDate <= dateStr &&
          l.endDate >= dateStr
      );
      const depts = new Set(onDay.map((l) => l.department));
      if (depts.size >= 2) count++;
    }
    return count;
  }, [leaves]);

  // Auto-subscribe to real-time storage mutations
  useEffect(() => {
    const unsub = storageService.subscribe(() => {
      setLeaves(storageService.getLeaves());
      setAllEmployees(storageService.getEmployees());
    });
    return unsub;
  }, []);

  const handleDateChange = (start: string, end: string) => {
    let effectiveEnd = end;
    if (start && end && end < start) {
      effectiveEnd = start;
    }
    setStartDate(start);
    setEndDate(effectiveEnd);
    const d1 = new Date(start);
    const d2 = new Date(effectiveEnd);
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      const diffDays = Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      setDaysCount(diffDays);
    }
  };

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    const remainingAvailable = balance[leaveType]?.remaining ?? 0;
    if (daysCount > remainingAvailable) {
      alert(`Insufficient leave balance: You requested ${daysCount} days, but only ${remainingAvailable} days are remaining for ${leaveType}.`);
      return;
    }

    storageService.applyLeave(
      {
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        employeeEmail: currentUser.email,
        employeeRole: currentUser.designation,
        department: currentUser.department,
        leaveType,
        startDate,
        endDate,
        daysCount,
        reason: reason.trim(),
      },
      {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      }
    );

    setLeaves(storageService.getLeaves());
    setIsApplyModalOpen(false);
    setReason('');
    refreshUserData();
  };

  const handleStatusChange = (
    leaveId: string,
    newStatus: 'approved' | 'rejected' | 'cancelled',
    remark?: string
  ) => {
    storageService.updateLeaveStatus(
      leaveId,
      newStatus,
      {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      },
      remark
    );

    setLeaves(storageService.getLeaves());
    refreshUserData();
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentModalLeave || !newCommentText.trim()) return;

    const list = storageService.getLeaves();
    const target = list.find((l) => l.id === commentModalLeave.id);
    if (target) {
      if (!target.comments) target.comments = [];
      target.comments.push({
        id: `c-${Date.now()}`,
        authorName: currentUser.name,
        authorRole: currentUser.role,
        text: newCommentText.trim(),
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('omnihr_leaves_v1', JSON.stringify(list));
      setLeaves(list);
      setCommentModalLeave({ ...target });
      setNewCommentText('');
    }
  };

  // Filter leaves based on user role, status/type filters, and search query
  const visibleLeaves = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);

    return leaves.filter((l) => {
      const roleMatch =
        currentUser.role === 'admin'
          ? true // Admin sees all leaves
          : currentUser.role === 'manager'
          ? l.department === currentUser.department || l.employeeId === currentUser.id
          : l.employeeId === currentUser.id; // Employee only sees own leaves

      const statusMatch = selectedFilter === 'all' || l.status === selectedFilter;
      const typeMatch = selectedTypeFilter === 'all' || l.leaveType === selectedTypeFilter;

      if (!roleMatch || !statusMatch || !typeMatch) return false;

      if (tokens.length === 0) return true;

      const searchableString = `${l.employeeName} ${l.department} ${l.leaveType} ${l.reason} ${l.status} ${l.id} ${l.startDate} ${l.endDate}`.toLowerCase();
      return tokens.every((token) => searchableString.includes(token));
    });
  }, [leaves, currentUser, selectedFilter, selectedTypeFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Leave Management & Real-Time Approval Tracker
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Apply for Earned (EL), Casual (CL), Sick (SL), and Privilege (PL) leaves with instant multi-tier approval routing.
          </p>
        </div>

        <button
          onClick={() => setIsApplyModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Apply For Leave</span>
        </button>
      </div>

      {/* Leave Quotas & Available Balance Progress Bars */}
      <EmployeeLeaveBalanceBar
        currentUser={currentUser}
        selectedEmployee={selectedEmployee}
        allEmployees={allEmployees}
        onSelectEmployee={setSelectedEmployeeId}
        onApplyForLeave={(cat) => {
          if (cat) {
            setLeaveType(cat);
          }
          setIsApplyModalOpen(true);
        }}
      />

      {/* Primary View Navigation Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
          <button
            onClick={() => setActiveViewTab('calendar')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeViewTab === 'calendar'
                ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            <span>Cross-Dept Calendar & Overlap Matrix</span>
            {currentMonthCrossDeptOverlapsCount > 0 ? (
              <span
                className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white shadow-2xs"
                title={`${currentMonthCrossDeptOverlapsCount} days with concurrent cross-department leaves`}
              >
                ⚡ {currentMonthCrossDeptOverlapsCount} Overlaps
              </span>
            ) : currentMonthOverlapsCount > 0 ? (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white shadow-2xs">
                {currentMonthOverlapsCount} Overlaps
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveViewTab('requests')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeViewTab === 'requests'
                ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <ListOrdered className="h-4 w-4" />
            <span>Requests Feed & Log</span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
              {visibleLeaves.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500">
          Viewing schedule as:{' '}
          <strong className="text-slate-800 dark:text-slate-200">{currentUser.name}</strong>{' '}
          <span className="text-slate-400">({currentUser.role} • {currentUser.department})</span>
        </div>
      </div>

      {/* Main View Content */}
      {activeViewTab === 'calendar' ? (
        <TeamLeaveCalendar
          leaves={leaves}
          onApplyLeaveClick={(defaultDate) => {
            if (defaultDate) {
              setStartDate(defaultDate);
              setEndDate(defaultDate);
              setDaysCount(1);
            }
            setIsApplyModalOpen(true);
          }}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <>
          {/* Search Bar & Filter Tabs */}
          <div className="space-y-3 border-b border-slate-200 pb-4 dark:border-slate-800">
            {/* Search Input for Leave Requests */}
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search leave requests by employee, reason, dates, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-8 text-xs text-slate-800 placeholder-slate-400 shadow-2xs transition-colors focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedFilter(status)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                      selectedFilter === status
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                    }`}
                  >
                    {status === 'all' ? 'All Applications' : status}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">Type:</span>
                {(['all', 'EL', 'CL', 'SL', 'PL'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedTypeFilter(type)}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                      selectedTypeFilter === type
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {type === 'all' ? 'Any' : type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Leave Application Feed */}
          <div className="space-y-3">
            {visibleLeaves.map((leave) => {
              const isOwner = leave.employeeId === currentUser.id;
              const canApprove =
                (currentUser.role === 'admin' || currentUser.role === 'manager') &&
                leave.status === 'pending' &&
                !isOwner;
              const isHighlighted = highlightedLeaveId === leave.id;

              return (
                <div
                  key={leave.id}
                  className={`rounded-2xl border bg-white p-4 shadow-xs dark:bg-slate-900 transition-all ${
                    isHighlighted
                      ? 'border-indigo-500 ring-2 ring-indigo-500/30 dark:border-indigo-400'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white shadow-xs ${
                          leave.leaveType === 'EL'
                            ? 'bg-indigo-600'
                            : leave.leaveType === 'CL'
                            ? 'bg-emerald-600'
                            : leave.leaveType === 'SL'
                            ? 'bg-blue-600'
                            : 'bg-purple-600'
                        }`}
                      >
                        {leave.leaveType}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {leave.employeeName}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ({leave.employeeRole} • {leave.department})
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">#{leave.id}</span>
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                          <span>
                            {leave.startDate} <span className="text-slate-400">&rarr;</span> {leave.endDate}
                          </span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {leave.daysCount} {leave.daysCount === 1 ? 'Day' : 'Days'}
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <strong className="text-slate-700 dark:text-slate-200">Reason:</strong> {leave.reason}
                        </p>

                        {leave.rejectionReason && (
                          <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl border border-rose-100 dark:border-rose-900">
                            <strong>Rejection Note:</strong> {leave.rejectionReason}
                          </p>
                        )}

                        {leave.approvedBy && (
                          <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Approved by: {leave.approvedBy} on {leave.approvedOn?.slice(0, 10)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status Badge & Action Controls */}
                    <div className="flex flex-col sm:items-end gap-2 shrink-0">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider self-start sm:self-auto ${
                          leave.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                            : leave.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                        }`}
                      >
                        {leave.status === 'pending' ? 'Pending Real-Time Approval' : leave.status}
                      </span>

                      {/* Manager/Admin Approvals */}
                      {canApprove && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <button
                            onClick={() => handleStatusChange(leave.id, 'approved', 'Approved by authorized manager/HR.')}
                            className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => {
                              const reasonPrompt = prompt('Enter rejection reason for employee records:') || 'Operational constraints';
                              handleStatusChange(leave.id, 'rejected', reasonPrompt);
                            }}
                            className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}

                      {/* Employee Self-Cancel */}
                      {isOwner && leave.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange(leave.id, 'cancelled', 'Cancelled by employee.')}
                          className="text-xs text-rose-600 hover:text-rose-700 font-semibold underline flex items-center gap-1"
                        >
                          <Ban className="h-3 w-3" />
                          <span>Cancel Request</span>
                        </button>
                      )}

                      {/* Discussion Comments button */}
                      <button
                        onClick={() => setCommentModalLeave(leave)}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 mt-1"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Audit Notes ({leave.comments?.length || 0})</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {visibleLeaves.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400 dark:border-slate-800">
                <CalendarCheck className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No leave requests found</p>
                <p className="text-xs text-slate-400 mt-1">There are no applications matching the active filters.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Apply Leave Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Apply for Leave</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Applicant: <strong className="text-slate-800 dark:text-slate-200">{currentUser.name}</strong> ({currentUser.department})
                </p>
              </div>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                &times;
              </button>
            </div>

            {!isOnline && (
              <div className="mt-3 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 flex items-center gap-2 border border-amber-200 dark:border-amber-900">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>You are currently in Offline Mode. This application will be queued and securely synchronized once connectivity is restored.</span>
              </div>
            )}

            <form onSubmit={handleApplyLeave} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Leave Type Category *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['EL', 'CL', 'SL', 'PL'] as const).map((type) => {
                    const cat = balance[type];
                    const availPct = cat.total > 0 ? Math.round((cat.remaining / cat.total) * 100) : 0;
                    const isExhausted = cat.remaining <= 0;
                    const isLow = cat.remaining > 0 && cat.remaining <= 2;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setLeaveType(type)}
                        className={`flex flex-col items-center justify-center rounded-xl border p-2.5 transition-all text-center ${
                          leaveType === type
                            ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-bold ring-2 ring-indigo-500/20'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold">{type}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({type === 'EL' ? 'Earned' : type === 'CL' ? 'Casual' : type === 'SL' ? 'Sick' : 'Privilege'})
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-semibold mt-0.5 ${
                            isExhausted
                              ? 'text-rose-600 dark:text-rose-400 font-bold'
                              : isLow
                              ? 'text-amber-600 dark:text-amber-400 font-bold'
                              : 'text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          {cat.remaining} of {cat.total}d left
                        </span>
                        {/* Mini Available Balance progress bar */}
                        <div
                          className="w-full mt-1.5 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
                          title={`Available Balance: ${cat.remaining} / ${cat.total} days (${availPct}%)`}
                        >
                          <div
                            className={`h-full rounded-full transition-all ${
                              isExhausted
                                ? 'bg-rose-500'
                                : isLow
                                ? 'bg-amber-500'
                                : 'bg-indigo-600 dark:bg-indigo-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, availPct))}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                          {availPct}% available
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => handleDateChange(e.target.value, endDate)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 focus:bg-white focus:outline-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => handleDateChange(startDate, e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 focus:bg-white focus:outline-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <span>Calculated Working Days:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                  {daysCount} {daysCount === 1 ? 'Day' : 'Days'}
                </span>
              </div>

              {daysCount > (balance[leaveType]?.remaining ?? 0) && (
                <div className="rounded-xl bg-rose-50 p-2.5 text-xs text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 flex items-center gap-2 border border-rose-200 dark:border-rose-900">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>
                    Insufficient balance: Requesting <strong>{daysCount} days</strong>, but only{' '}
                    <strong>{balance[leaveType]?.remaining ?? 0} days</strong> remain for {leaveType}.
                  </span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Reason for Leave & Handoff Notes *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide concise details for your manager and mention coverage or sprint handoffs..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 focus:bg-white focus:outline-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={daysCount > (balance[leaveType]?.remaining ?? 0)}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-opacity"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comment / Audit Notes Modal */}
      {commentModalLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Application Audit & Discussion Notes
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  #{commentModalLeave.id} • {commentModalLeave.employeeName} ({commentModalLeave.leaveType})
                </p>
              </div>
              <button
                onClick={() => setCommentModalLeave(null)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
              {(!commentModalLeave.comments || commentModalLeave.comments.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-6">No discussion notes recorded for this request.</p>
              )}
              {commentModalLeave.comments?.map((c) => (
                <div key={c.id} className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                    <span>{c.authorName} ({c.authorRole})</span>
                    <span className="text-[10px] text-slate-400 font-normal">{c.timestamp.slice(0, 16).replace('T', ' ')}</span>
                  </div>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">{c.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment} className="mt-3 border-t border-slate-100 pt-3 flex gap-2 dark:border-slate-800">
              <input
                type="text"
                placeholder="Add official remark or note..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 flex items-center gap-1"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Post</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
