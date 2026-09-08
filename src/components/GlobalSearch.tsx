import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Users,
  Calendar,
  Star,
  ShieldAlert,
  ArrowRight,
  X,
  Sparkles,
  Command,
  CornerDownLeft,
  Briefcase,
  FileText,
  Clock,
  TrendingUp,
  DollarSign,
  HardDrive,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { Employee, LeaveRequest, PerformanceReview, AuditLogEntry } from '../types';
import { multiFieldFuzzyMatch, getHighlightSegments } from '../utils/fuzzySearch';

export interface GlobalSearchNavigationTarget {
  tab: 'overview' | 'assistant' | 'employees' | 'leaves' | 'forecast' | 'reviews' | 'reports' | 'payroll' | 'drive' | 'audit';
  employeeId?: string;
  leaveId?: string;
  reviewId?: string;
  searchQuery?: string;
}

interface GlobalSearchProps {
  onNavigate: (target: GlobalSearchNavigationTarget) => void;
  isOpenModal?: boolean;
  onCloseModal?: () => void;
  isEmbeddedNavbar?: boolean;
}

// Sub-component to highlight matched characters in search dropdown
const SearchHighlight: React.FC<{ text: string; ranges?: [number, number][] }> = ({
  text,
  ranges = [],
}) => {
  if (!ranges || ranges.length === 0 || !text) {
    return <span>{text}</span>;
  }
  const segments = getHighlightSegments(text, ranges);
  return (
    <span>
      {segments.map((seg, i) =>
        seg.isHighlighted ? (
          <mark
            key={i}
            className="rounded-xs bg-amber-200/90 font-bold text-amber-950 px-0.5 dark:bg-amber-500/30 dark:text-amber-200"
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </span>
  );
};

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  onNavigate,
  isOpenModal = false,
  onCloseModal,
  isEmbeddedNavbar = false,
}) => {
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'employees' | 'leaves' | 'reviews' | 'audit' | 'pages'>('all');
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened in modal mode
  useEffect(() => {
    if (isOpenModal && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpenModal]);

  // Click outside listener to dismiss dropdown in navbar mode
  useEffect(() => {
    if (!isEmbeddedNavbar) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEmbeddedNavbar]);

  // Load data for multi-entity search
  const employees = useMemo(() => storageService.getEmployees(), [query, isDropdownOpen, isOpenModal]);
  const leaves = useMemo(() => storageService.getLeaves(), [query, isDropdownOpen, isOpenModal]);
  const reviews = useMemo(() => storageService.getReviews(), [query, isDropdownOpen, isOpenModal]);
  const auditLogs = useMemo(() => storageService.getAuditLogs().slice(0, 50), [query, isDropdownOpen, isOpenModal]);

  // Static Navigation Pages
  const pages = useMemo(
    () => [
      { id: 'overview', title: 'Dashboard Overview', desc: 'KPI metrics, headcounts, live workforce status', tab: 'overview' as const, icon: TrendingUp },
      { id: 'employees', title: 'Employee Directory', desc: 'Search employee profiles, contact info, and encrypted dossiers', tab: 'employees' as const, icon: Users },
      { id: 'leaves', title: 'Leave Management & Calendar', desc: 'Leave requests, quota balances, team overlap calendar', tab: 'leaves' as const, icon: Calendar },
      { id: 'forecast', title: 'Predictive Staffing Analytics', desc: 'AI forecast models, department capacity simulation', tab: 'forecast' as const, icon: TrendingUp },
      { id: 'reviews', title: 'Performance Evaluations', desc: 'Talent reviews, quarterly competency scores, feedback', tab: 'reviews' as const, icon: Star },
      { id: 'reports', title: 'Reports & Export Center', desc: 'Headcount breakdowns, CSV/PDF enterprise audits', tab: 'reports' as const, icon: FileText },
      { id: 'payroll', title: 'Payroll Records & Compensation', desc: 'Salary bands, bonuses, direct deposit status', tab: 'payroll' as const, icon: DollarSign },
      { id: 'drive', title: 'Google Drive Enterprise Docs', desc: 'Google Workspace cloud file storage and verification', tab: 'drive' as const, icon: HardDrive },
      { id: 'audit', title: 'Audit Trail & SOC2 Log Viewer', desc: 'Cryptographic tamper-evident activity ledger', tab: 'audit' as const, icon: ShieldAlert },
    ],
    []
  );

  // Compute matches across all categories
  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q) {
      return {
        employees: [],
        leaves: [],
        reviews: [],
        auditLogs: [],
        pages: pages.slice(0, 5),
        totalCount: 5,
      };
    }

    // 1. Match Employees
    const matchedEmployees = employees
      .map((emp) => {
        const match = multiFieldFuzzyMatch(
          [
            { key: 'name', label: 'Name', text: emp.name, weight: 1.3 },
            { key: 'role', label: 'Role', text: emp.designation, weight: 1.2 },
            { key: 'dept', label: 'Department', text: emp.department, weight: 1.15 },
            { key: 'code', label: 'ID', text: emp.employeeCode, weight: 1.1 },
            { key: 'email', label: 'Email', text: emp.email, weight: 1.0 },
            { key: 'loc', label: 'Location', text: emp.location, weight: 0.9 },
          ],
          q
        );
        return {
          emp,
          match,
        };
      })
      .filter((item) => item.match.isMatch)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 6);

    // 2. Match Leaves
    const matchedLeaves = leaves
      .map((leave) => {
        const match = multiFieldFuzzyMatch(
          [
            { key: 'name', label: 'Employee', text: leave.employeeName, weight: 1.3 },
            { key: 'type', label: 'Type', text: leave.leaveType, weight: 1.2 },
            { key: 'status', label: 'Status', text: leave.status, weight: 1.2 },
            { key: 'reason', label: 'Reason', text: leave.reason, weight: 1.0 },
            { key: 'dept', label: 'Department', text: leave.department, weight: 1.0 },
            { key: 'dates', label: 'Dates', text: `${leave.startDate} to ${leave.endDate}`, weight: 0.9 },
            { key: 'id', label: 'Leave ID', text: leave.id, weight: 1.1 },
          ],
          q
        );
        return {
          leave,
          match,
        };
      })
      .filter((item) => item.match.isMatch)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 5);

    // 3. Match Reviews
    const matchedReviews = reviews
      .map((rev) => {
        const match = multiFieldFuzzyMatch(
          [
            { key: 'emp', label: 'Employee', text: rev.employeeName, weight: 1.3 },
            { key: 'cycle', label: 'Cycle', text: rev.cycle, weight: 1.2 },
            { key: 'reviewer', label: 'Reviewer', text: rev.reviewerName, weight: 1.1 },
            { key: 'rating', label: 'Rating', text: `${rev.overallRating} ${rev.ratingLabel}`, weight: 1.1 },
            { key: 'feedback', label: 'Feedback', text: rev.reviewerFeedback, weight: 0.9 },
          ],
          q
        );
        return {
          rev,
          match,
        };
      })
      .filter((item) => item.match.isMatch)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 5);

    // 4. Match Audit Logs
    const matchedAudit = auditLogs
      .map((log) => {
        const match = multiFieldFuzzyMatch(
          [
            { key: 'actor', label: 'Actor', text: log.actorName, weight: 1.2 },
            { key: 'action', label: 'Action', text: log.actionType || log.action, weight: 1.2 },
            { key: 'desc', label: 'Description', text: log.description || log.details, weight: 1.0 },
            { key: 'hash', label: 'Hash', text: log.integrityHash, weight: 0.8 },
          ],
          q
        );
        return {
          log,
          match,
        };
      })
      .filter((item) => item.match.isMatch)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 5);

    // 5. Match Pages
    const matchedPages = pages
      .map((page) => {
        const match = multiFieldFuzzyMatch(
          [
            { key: 'title', label: 'Title', text: page.title, weight: 1.3 },
            { key: 'desc', label: 'Description', text: page.desc, weight: 1.0 },
          ],
          q
        );
        return {
          page,
          match,
        };
      })
      .filter((item) => item.match.isMatch)
      .sort((a, b) => b.match.score - a.match.score);

    const totalCount =
      matchedEmployees.length +
      matchedLeaves.length +
      matchedReviews.length +
      matchedAudit.length +
      matchedPages.length;

    return {
      employees: matchedEmployees,
      leaves: matchedLeaves,
      reviews: matchedReviews,
      auditLogs: matchedAudit,
      pages: matchedPages,
      totalCount,
    };
  }, [query, employees, leaves, reviews, auditLogs, pages]);

  // Flatten currently visible filtered items for keyboard navigation
  const flatItems = useMemo(() => {
    const list: {
      type: 'page' | 'employee' | 'leave' | 'review' | 'audit';
      id: string;
      item: any;
      action: () => void;
    }[] = [];

    const showPages = categoryFilter === 'all' || categoryFilter === 'pages';
    const showEmployees = categoryFilter === 'all' || categoryFilter === 'employees';
    const showLeaves = categoryFilter === 'all' || categoryFilter === 'leaves';
    const showReviews = categoryFilter === 'all' || categoryFilter === 'reviews';
    const showAudit = categoryFilter === 'all' || categoryFilter === 'audit';

    if (showPages) {
      for (const p of searchResults.pages) {
        list.push({
          type: 'page',
          id: `page-${p.page.id}`,
          item: p,
          action: () => {
            onNavigate({ tab: p.page.tab });
            closeSearch();
          },
        });
      }
    }

    if (showEmployees) {
      for (const e of searchResults.employees) {
        list.push({
          type: 'employee',
          id: `emp-${e.emp.id}`,
          item: e,
          action: () => {
            onNavigate({ tab: 'employees', employeeId: e.emp.id });
            closeSearch();
          },
        });
      }
    }

    if (showLeaves) {
      for (const l of searchResults.leaves) {
        list.push({
          type: 'leave',
          id: `leave-${l.leave.id}`,
          item: l,
          action: () => {
            onNavigate({ tab: 'leaves', leaveId: l.leave.id, searchQuery: l.leave.employeeName });
            closeSearch();
          },
        });
      }
    }

    if (showReviews) {
      for (const r of searchResults.reviews) {
        list.push({
          type: 'review',
          id: `rev-${r.rev.id}`,
          item: r,
          action: () => {
            onNavigate({ tab: 'reviews', reviewId: r.rev.id });
            closeSearch();
          },
        });
      }
    }

    if (showAudit) {
      for (const a of searchResults.auditLogs) {
        list.push({
          type: 'audit',
          id: `audit-${a.log.id}`,
          item: a,
          action: () => {
            onNavigate({ tab: 'audit' });
            closeSearch();
          },
        });
      }
    }

    return list;
  }, [searchResults, categoryFilter]);

  // Keep active index within bounds
  useEffect(() => {
    setActiveIndex(0);
  }, [query, categoryFilter]);

  const closeSearch = () => {
    setIsDropdownOpen(false);
    if (onCloseModal) {
      onCloseModal();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (flatItems.length > 0 ? (prev + 1) % flatItems.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (flatItems.length > 0 ? (prev - 1 + flatItems.length) % flatItems.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems.length > 0 && flatItems[activeIndex]) {
        flatItems[activeIndex].action();
      } else if (query.trim()) {
        // Default jump: open Employee Directory with current search query
        onNavigate({ tab: 'employees', searchQuery: query.trim() });
        closeSearch();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeSearch();
    }
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const contentUI = (
    <div className="flex flex-col h-full">
      {/* Search Input Bar */}
      <div className="relative flex items-center border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <Search className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search employees, departments, leave records, reviews, logs..."
          className="w-full bg-transparent px-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden dark:text-slate-100 dark:placeholder-slate-500"
        />

        {query && (
          <button
            onClick={handleClear}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            title="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {isOpenModal && (
          <button
            onClick={closeSearch}
            className="ml-2 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
          >
            ESC
          </button>
        )}
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-xs font-semibold dark:border-slate-800/80 dark:bg-slate-900/40">
        {[
          { id: 'all', label: 'All Results', count: searchResults.totalCount },
          { id: 'employees', label: 'Employees', count: searchResults.employees.length },
          { id: 'leaves', label: 'Leaves', count: searchResults.leaves.length },
          { id: 'reviews', label: 'Reviews', count: searchResults.reviews.length },
          { id: 'audit', label: 'Audit Trail', count: searchResults.auditLogs.length },
          { id: 'pages', label: 'Sections', count: searchResults.pages.length },
        ].map((chip) => (
          <button
            key={chip.id}
            onClick={() => setCategoryFilter(chip.id as any)}
            className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1 transition-colors ${
              categoryFilter === chip.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <span>{chip.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                categoryFilter === chip.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              }`}
            >
              {chip.count}
            </span>
          </button>
        ))}
      </div>

      {/* Results Body */}
      <div className="flex-1 overflow-y-auto max-h-[460px] p-2 space-y-4">
        {flatItems.length === 0 ? (
          <div className="p-8 text-center">
            <Search className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No results found for &ldquo;{query}&rdquo;
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Try searching by employee name (e.g. &ldquo;Elena Vance&rdquo;), role (&ldquo;Staff Software Engineer&rdquo;), department (&ldquo;Engineering&rdquo;), leave ID (&ldquo;#leave-1&rdquo;), or keywords.
            </p>
          </div>
        ) : (
          <>
            {/* Quick Pages / Navigation */}
            {(categoryFilter === 'all' || categoryFilter === 'pages') && searchResults.pages.length > 0 && (
              <div>
                <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Application Modules
                </div>
                <div className="space-y-1">
                  {searchResults.pages.map((p) => {
                    const idx = flatItems.findIndex((fi) => fi.id === `page-${p.page.id}`);
                    const isSelected = activeIndex === idx;
                    const Icon = p.page.icon;
                    return (
                      <div
                        key={p.page.id}
                        onClick={() => {
                          onNavigate({ tab: p.page.tab });
                          closeSearch();
                        }}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                              <SearchHighlight text={p.page.title} ranges={p.match.fieldRanges.title} />
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              <SearchHighlight text={p.page.desc} ranges={p.match.fieldRanges.desc} />
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Employees */}
            {(categoryFilter === 'all' || categoryFilter === 'employees') && searchResults.employees.length > 0 && (
              <div>
                <div className="px-3 py-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <span>Employees ({searchResults.employees.length})</span>
                  {query && (
                    <button
                      onClick={() => {
                        onNavigate({ tab: 'employees', searchQuery: query.trim() });
                        closeSearch();
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                    >
                      View all in Directory &rarr;
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {searchResults.employees.map(({ emp, match }) => {
                    const idx = flatItems.findIndex((fi) => fi.id === `emp-${emp.id}`);
                    const isSelected = activeIndex === idx;
                    return (
                      <div
                        key={emp.id}
                        onClick={() => {
                          onNavigate({ tab: 'employees', employeeId: emp.id });
                          closeSearch();
                        }}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={emp.avatarUrl}
                            alt={emp.name}
                            className="h-9 w-9 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                <SearchHighlight text={emp.name} ranges={match.fieldRanges.name} />
                              </span>
                              <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                                <SearchHighlight text={emp.employeeCode} ranges={match.fieldRanges.code} />
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                                  emp.role === 'admin'
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                    : emp.role === 'manager'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                }`}
                              >
                                {emp.role}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>
                                <SearchHighlight text={emp.designation} ranges={match.fieldRanges.role} />
                              </span>
                              <span>•</span>
                              <span>
                                <SearchHighlight text={emp.department} ranges={match.fieldRanges.dept} />
                              </span>
                              <span>•</span>
                              <span className="text-slate-400 truncate max-w-[120px] sm:max-w-none">
                                <SearchHighlight text={emp.email} ranges={match.fieldRanges.email} />
                              </span>
                            </div>
                          </div>
                        </div>

                        {query && match.score > 0 && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                            <span>{match.score}%</span>
                            <ArrowRight className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Leaves */}
            {(categoryFilter === 'all' || categoryFilter === 'leaves') && searchResults.leaves.length > 0 && (
              <div>
                <div className="px-3 py-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <span>Leave Requests ({searchResults.leaves.length})</span>
                  {query && (
                    <button
                      onClick={() => {
                        onNavigate({ tab: 'leaves', searchQuery: query.trim() });
                        closeSearch();
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                    >
                      View all in Leaves &rarr;
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {searchResults.leaves.map(({ leave, match }) => {
                    const idx = flatItems.findIndex((fi) => fi.id === `leave-${leave.id}`);
                    const isSelected = activeIndex === idx;
                    return (
                      <div
                        key={leave.id}
                        onClick={() => {
                          onNavigate({ tab: 'leaves', leaveId: leave.id, searchQuery: leave.employeeName });
                          closeSearch();
                        }}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white ${
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
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                <SearchHighlight text={leave.employeeName} ranges={match.fieldRanges.name} />
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                                  leave.status === 'approved'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                    : leave.status === 'rejected'
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {leave.status}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {leave.daysCount} {leave.daysCount === 1 ? 'day' : 'days'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                              <span className="italic">
                                &ldquo;
                                <SearchHighlight text={leave.reason} ranges={match.fieldRanges.reason} />
                                &rdquo;
                              </span>
                              <span className="ml-1 text-slate-400">
                                ({leave.startDate} to {leave.endDate})
                              </span>
                            </div>
                          </div>
                        </div>

                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reviews */}
            {(categoryFilter === 'all' || categoryFilter === 'reviews') && searchResults.reviews.length > 0 && (
              <div>
                <div className="px-3 py-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <span>Performance Evaluations ({searchResults.reviews.length})</span>
                  {query && (
                    <button
                      onClick={() => {
                        onNavigate({ tab: 'reviews', searchQuery: query.trim() });
                        closeSearch();
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                    >
                      View all in Reviews &rarr;
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {searchResults.reviews.map(({ rev, match }) => {
                    const idx = flatItems.findIndex((fi) => fi.id === `rev-${rev.id}`);
                    const isSelected = activeIndex === idx;
                    return (
                      <div
                        key={rev.id}
                        onClick={() => {
                          onNavigate({ tab: 'reviews', reviewId: rev.id });
                          closeSearch();
                        }}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/20">
                            ★ {rev.overallRating}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                <SearchHighlight text={rev.employeeName} ranges={match.fieldRanges.emp} />
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                <SearchHighlight text={rev.cycle} ranges={match.fieldRanges.cycle} />
                              </span>
                              <span className="rounded bg-indigo-50 px-1.5 py-0.2 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                {rev.ratingLabel}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 italic">
                              &ldquo;
                              <SearchHighlight text={rev.reviewerFeedback} ranges={match.fieldRanges.feedback} />
                              &rdquo;
                            </div>
                          </div>
                        </div>

                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Audit Logs */}
            {(categoryFilter === 'all' || categoryFilter === 'audit') && searchResults.auditLogs.length > 0 && (
              <div>
                <div className="px-3 py-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <span>Audit Trail ({searchResults.auditLogs.length})</span>
                </div>
                <div className="space-y-1">
                  {searchResults.auditLogs.map(({ log, match }) => {
                    const idx = flatItems.findIndex((fi) => fi.id === `audit-${log.id}`);
                    const isSelected = activeIndex === idx;
                    const actionName = log.actionType || log.action || 'EVENT';
                    return (
                      <div
                        key={log.id}
                        onClick={() => {
                          onNavigate({ tab: 'audit' });
                          closeSearch();
                        }}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            <ShieldAlert className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.2 rounded">
                                <SearchHighlight text={actionName} ranges={match.fieldRanges.action} />
                              </span>
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                <SearchHighlight text={log.actorName} ranges={match.fieldRanges.actor} />
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                              <SearchHighlight text={log.description || log.details || ''} ranges={match.fieldRanges.desc} />
                            </div>
                          </div>
                        </div>

                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Keyboard Shortcuts Hint Footer */}
      <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-[9px] shadow-2xs dark:border-slate-700 dark:bg-slate-800">
              &uarr; &darr;
            </kbd>{' '}
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-[9px] shadow-2xs dark:border-slate-700 dark:bg-slate-800 flex items-center">
              <CornerDownLeft className="h-2.5 w-2.5" />
            </kbd>{' '}
            Open Record
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-[9px] shadow-2xs dark:border-slate-700 dark:bg-slate-800">
              ESC
            </kbd>{' '}
            Dismiss
          </span>
        </div>
        <span className="hidden sm:inline font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
          OmniHR OmniSearch
        </span>
      </div>
    </div>
  );

  // Modal Mode (triggered by Cmd+K or mobile search icon)
  if (isOpenModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-16 sm:pt-24 backdrop-blur-sm animate-in fade-in duration-150">
        <div
          ref={containerRef}
          className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
        >
          {contentUI}
        </div>
      </div>
    );
  }

  // Embedded Navbar Mode
  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative w-full">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search employees, reviews, leave records..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-1.5 pl-9 pr-14 text-xs text-slate-800 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:focus:bg-slate-800"
        />
        <div className="absolute right-2.5 top-2 flex items-center gap-1">
          {query ? (
            <button
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono text-slate-400 dark:border-slate-700 dark:bg-slate-800">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown Floating Popover */}
      {isDropdownOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden min-w-[320px] sm:min-w-[500px]">
          {contentUI}
        </div>
      )}
    </div>
  );
};
