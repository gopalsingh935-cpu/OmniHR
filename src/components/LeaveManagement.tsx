import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PlusCircle,
  MessageSquare,
  UserCheck,
  Send,
  CalendarCheck,
  Shield,
  Ban,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storageService';
import { LeaveRequest, LeaveType, LeaveStatus } from '../types';

interface LeaveManagementProps {
  initialApplyOpen?: boolean;
}

export const LeaveManagement: React.FC<LeaveManagementProps> = ({ initialApplyOpen = false }) => {
  const { currentUser, isOnline, refreshUserData } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>(() => storageService.getLeaves());
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(initialApplyOpen);
  const [selectedFilter, setSelectedFilter] = useState<'all' | LeaveStatus>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | LeaveType>('all');
  const [commentModalLeave, setCommentModalLeave] = useState<LeaveRequest | null>(null);
  const [newCommentText, setNewCommentText] = useState('');

  // Form state
  const [leaveType, setLeaveType] = useState<LeaveType>('EL');
  const [startDate, setStartDate] = useState('2026-09-21');
  const [endDate, setEndDate] = useState('2026-09-23');
  const [reason, setReason] = useState('');
  const [daysCount, setDaysCount] = useState(3);

  const balance = currentUser.leaveBalance;

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    const d1 = new Date(start);
    const d2 = new Date(end);
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      const diffDays = Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      setDaysCount(diffDays);
    }
  };

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;

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
        reason,
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

  // Filter leaves based on user role and filters
  const visibleLeaves = leaves.filter((l) => {
    const roleMatch =
      currentUser.role === 'admin'
        ? true // Admin sees all leaves
        : currentUser.role === 'manager'
        ? l.department === currentUser.department || l.employeeId === currentUser.id
        : l.employeeId === currentUser.id; // Employee only sees own leaves

    const statusMatch = selectedFilter === 'all' || l.status === selectedFilter;
    const typeMatch = selectedTypeFilter === 'all' || l.leaveType === selectedTypeFilter;

    return roleMatch && statusMatch && typeMatch;
  });

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

      {/* Leave Quota Cards for Current User */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-950/60 dark:bg-indigo-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">Earned Leave (EL)</span>
            <span className="rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">Annual</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700 dark:text-indigo-400">
              {balance.EL.remaining}
            </span>
            <span className="text-xs text-slate-500">/ {balance.EL.total} Days Left</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Used: {balance.EL.used} days</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-950/60 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Casual Leave (CL)</span>
            <span className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">Short Notice</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {balance.CL.remaining}
            </span>
            <span className="text-xs text-slate-500">/ {balance.CL.total} Days Left</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Used: {balance.CL.used} days</p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-950/60 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 dark:text-blue-300">Sick Leave (SL)</span>
            <span className="rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">Medical</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700 dark:text-blue-400">
              {balance.SL.remaining}
            </span>
            <span className="text-xs text-slate-500">/ {balance.SL.total} Days Left</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Used: {balance.SL.used} days</p>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4 dark:border-purple-950/60 dark:bg-purple-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900 dark:text-purple-300">Privilege Leave (PL)</span>
            <span className="rounded-md bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold text-white">Parental/Extended</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700 dark:text-purple-400">
              {balance.PL.remaining}
            </span>
            <span className="text-xs text-slate-500">/ {balance.PL.total} Days Left</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Used: {balance.PL.used} days</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
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

      {/* Leave Application Feed */}
      <div className="space-y-3">
        {visibleLeaves.map((leave) => {
          const isOwner = leave.employeeId === currentUser.id;
          const canApprove =
            (currentUser.role === 'admin' || currentUser.role === 'manager') &&
            leave.status === 'pending' &&
            !isOwner;

          return (
            <div
              key={leave.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-all hover:border-slate-300 dark:hover:border-slate-700"
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
                  {(['EL', 'CL', 'SL', 'PL'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setLeaveType(type)}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2.5 transition-all ${
                        leaveType === type
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-sm">{type}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {type === 'EL' ? 'Earned' : type === 'CL' ? 'Casual' : type === 'SL' ? 'Sick' : 'Privilege'}
                      </span>
                      <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                        {balance[type].remaining}d remaining
                      </span>
                    </button>
                  ))}
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
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 shadow-sm"
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
