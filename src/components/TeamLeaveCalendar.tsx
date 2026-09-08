import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Users,
  CheckCircle2,
  Clock,
  Filter,
  PlusCircle,
  X,
  Building2,
  Layers,
  LayoutGrid,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  GitMerge,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { LeaveRequest, LeaveType } from '../types';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storageService';

interface TeamLeaveCalendarProps {
  leaves: LeaveRequest[];
  onApplyLeaveClick: (defaultStartDate?: string) => void;
  onStatusChange?: (
    leaveId: string,
    status: 'approved' | 'rejected',
    remark?: string
  ) => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DEPARTMENT_THEMES: Record<
  string,
  {
    name: string;
    tag: string;
    badgeBg: string;
    badgeText: string;
    bgLight: string;
    border: string;
    text: string;
    dot: string;
  }
> = {
  Engineering: {
    name: 'Engineering',
    tag: 'ENG',
    badgeBg: 'bg-indigo-600',
    badgeText: 'text-white',
    bgLight: 'bg-indigo-50 dark:bg-indigo-950/50',
    border: 'border-indigo-200 dark:border-indigo-800',
    text: 'text-indigo-800 dark:text-indigo-200',
    dot: 'bg-indigo-500',
  },
  Design: {
    name: 'Design',
    tag: 'DES',
    badgeBg: 'bg-purple-600',
    badgeText: 'text-white',
    bgLight: 'bg-purple-50 dark:bg-purple-950/50',
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-800 dark:text-purple-200',
    dot: 'bg-purple-500',
  },
  Finance: {
    name: 'Finance',
    tag: 'FIN',
    badgeBg: 'bg-emerald-600',
    badgeText: 'text-white',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/50',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-800 dark:text-emerald-200',
    dot: 'bg-emerald-500',
  },
  'Human Resources': {
    name: 'Human Resources',
    tag: 'HR',
    badgeBg: 'bg-rose-600',
    badgeText: 'text-white',
    bgLight: 'bg-rose-50 dark:bg-rose-950/50',
    border: 'border-rose-200 dark:border-rose-800',
    text: 'text-rose-800 dark:text-rose-200',
    dot: 'bg-rose-500',
  },
  Product: {
    name: 'Product',
    tag: 'PRD',
    badgeBg: 'bg-sky-600',
    badgeText: 'text-white',
    bgLight: 'bg-sky-50 dark:bg-sky-950/50',
    border: 'border-sky-200 dark:border-sky-800',
    text: 'text-sky-800 dark:text-sky-200',
    dot: 'bg-sky-500',
  },
  Marketing: {
    name: 'Marketing',
    tag: 'MKT',
    badgeBg: 'bg-amber-600',
    badgeText: 'text-white',
    bgLight: 'bg-amber-50 dark:bg-amber-950/50',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-200',
    dot: 'bg-amber-500',
  },
  Operations: {
    name: 'Operations',
    tag: 'OPS',
    badgeBg: 'bg-teal-600',
    badgeText: 'text-white',
    bgLight: 'bg-teal-50 dark:bg-teal-950/50',
    border: 'border-teal-200 dark:border-teal-800',
    text: 'text-teal-800 dark:text-teal-200',
    dot: 'bg-teal-500',
  },
};

export const getDeptTheme = (dept: string) => {
  return (
    DEPARTMENT_THEMES[dept] || {
      name: dept,
      tag: dept.slice(0, 3).toUpperCase(),
      badgeBg: 'bg-slate-700',
      badgeText: 'text-white',
      bgLight: 'bg-slate-100 dark:bg-slate-800',
      border: 'border-slate-200 dark:border-slate-700',
      text: 'text-slate-800 dark:text-slate-200',
      dot: 'bg-slate-500',
    }
  );
};

export const TeamLeaveCalendar: React.FC<TeamLeaveCalendarProps> = ({
  leaves,
  onApplyLeaveClick,
  onStatusChange,
}) => {
  const { currentUser } = useAuth();

  // Current display month & year (defaulting to September 2026, aligned with system timeline)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(8); // 0-indexed: 8 = September

  // Filter states
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [activeViewMode, setActiveViewMode] = useState<'dept-matrix' | 'month-grid' | 'timeline-grid'>(
    'dept-matrix'
  );
  const [onlyOverlapsFilter, setOnlyOverlapsFilter] = useState<boolean>(false);

  // Day inspector modal state
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  // All distinct departments available across employees and leaves
  const allDepartments = useMemo(() => {
    const depts = new Set<string>();
    leaves.forEach((l) => {
      if (l.department) depts.add(l.department);
    });
    try {
      const emps = storageService.getEmployees();
      emps.forEach((e) => {
        if (e.department) depts.add(e.department);
      });
    } catch {
      // ignore
    }
    return Array.from(depts).sort();
  }, [leaves]);

  const departmentsFilterList = useMemo(() => {
    return ['All', ...allDepartments];
  }, [allDepartments]);

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToCurrentMonth = () => {
    setCurrentYear(2026);
    setCurrentMonth(8);
  };

  const formatDayString = (year: number, month: number, day: number): string => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  // Filter active leaves (exclude rejected or cancelled)
  const eligibleLeaves = useMemo(() => {
    return leaves.filter((leave) => {
      if (leave.status === 'rejected' || leave.status === 'cancelled') return false;
      if (selectedDepartment !== 'All' && leave.department !== selectedDepartment) return false;
      if (statusFilter === 'approved' && leave.status !== 'approved') return false;
      if (statusFilter === 'pending' && leave.status !== 'pending') return false;
      return true;
    });
  }, [leaves, selectedDepartment, statusFilter]);

  // Days in active month
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  // First day of month (0 = Mon, 6 = Sun)
  const firstDayOfWeekIndex = useMemo(() => {
    const day = new Date(currentYear, currentMonth, 1).getDay();
    return (day + 6) % 7;
  }, [currentYear, currentMonth]);

  const daysInPrevMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

  // Map leaves by date string
  const dayLeavesMap = useMemo(() => {
    const map: Record<string, LeaveRequest[]> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDayString(currentYear, currentMonth, day);
      const matches = eligibleLeaves.filter(
        (l) => l.startDate <= dateStr && l.endDate >= dateStr
      );
      map[dateStr] = matches;
    }
    return map;
  }, [currentYear, currentMonth, daysInMonth, eligibleLeaves]);

  // Overlap statistics
  const overlapStats = useMemo(() => {
    const overlappingDays: {
      date: string;
      dayNumber: number;
      leaves: LeaveRequest[];
      isSameDept: boolean;
      isCrossDept: boolean;
      depts: string[];
    }[] = [];

    let totalOverlapDaysCount = 0;
    let sameDeptOverlapCount = 0;
    let crossDeptOverlapCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDayString(currentYear, currentMonth, day);
      const dayLeaves = dayLeavesMap[dateStr] || [];

      if (dayLeaves.length >= 2) {
        totalOverlapDaysCount++;
        const depts: string[] = Array.from(new Set(dayLeaves.map((l) => l.department)));
        const isSameDept = dayLeaves.length > depts.length;
        const isCrossDept = depts.length >= 2;

        if (isSameDept) sameDeptOverlapCount++;
        if (isCrossDept) crossDeptOverlapCount++;

        overlappingDays.push({
          date: dateStr,
          dayNumber: day,
          leaves: dayLeaves,
          isSameDept,
          isCrossDept,
          depts,
        });
      }
    }

    return {
      overlappingDays,
      totalOverlapDaysCount,
      sameDeptOverlapCount,
      crossDeptOverlapCount,
    };
  }, [currentYear, currentMonth, daysInMonth, dayLeavesMap]);

  // Cross-department overlapping days
  const crossDeptOverlappingDays = useMemo(() => {
    return overlapStats.overlappingDays.filter((item) => item.isCrossDept);
  }, [overlapStats.overlappingDays]);

  // Filtered days list for timeline/matrix view
  const displayDays = useMemo(() => {
    const days: number[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDayString(currentYear, currentMonth, d);
      const dayLeaves = dayLeavesMap[dateStr] || [];
      if (!onlyOverlapsFilter || dayLeaves.length >= 2) {
        days.push(d);
      }
    }
    return days;
  }, [daysInMonth, currentYear, currentMonth, dayLeavesMap, onlyOverlapsFilter]);

  // Group continuous overlap date ranges for the alert summary
  const overlapRanges = useMemo(() => {
    const items = overlapStats.overlappingDays;
    if (items.length === 0) return [];

    const ranges: {
      startDate: string;
      endDate: string;
      employees: string[];
      depts: string[];
      isSameDept: boolean;
      isCrossDept: boolean;
      totalDays: number;
    }[] = [];

    let currentRange: {
      startDay: number;
      endDay: number;
      startDate: string;
      endDate: string;
      employees: Set<string>;
      depts: Set<string>;
      isSameDept: boolean;
      isCrossDept: boolean;
    } | null = null;

    items.forEach((item) => {
      if (!currentRange) {
        currentRange = {
          startDay: item.dayNumber,
          endDay: item.dayNumber,
          startDate: item.date,
          endDate: item.date,
          employees: new Set(item.leaves.map((l) => l.employeeName)),
          depts: new Set(item.leaves.map((l) => l.department)),
          isSameDept: item.isSameDept,
          isCrossDept: item.isCrossDept,
        };
      } else if (item.dayNumber === currentRange.endDay + 1) {
        currentRange.endDay = item.dayNumber;
        currentRange.endDate = item.date;
        item.leaves.forEach((l) => {
          currentRange!.employees.add(l.employeeName);
          currentRange!.depts.add(l.department);
        });
        if (item.isSameDept) currentRange.isSameDept = true;
        if (item.isCrossDept) currentRange.isCrossDept = true;
      } else {
        ranges.push({
          startDate: currentRange.startDate,
          endDate: currentRange.endDate,
          employees: Array.from<string>(currentRange.employees),
          depts: Array.from<string>(currentRange.depts),
          isSameDept: currentRange.isSameDept,
          isCrossDept: currentRange.isCrossDept,
          totalDays: currentRange.endDay - currentRange.startDay + 1,
        });
        currentRange = {
          startDay: item.dayNumber,
          endDay: item.dayNumber,
          startDate: item.date,
          endDate: item.date,
          employees: new Set(item.leaves.map((l) => l.employeeName)),
          depts: new Set(item.leaves.map((l) => l.department)),
          isSameDept: item.isSameDept,
          isCrossDept: item.isCrossDept,
        };
      }
    });

    if (currentRange) {
      const cr = currentRange as {
        startDay: number;
        endDay: number;
        startDate: string;
        endDate: string;
        employees: Set<string>;
        depts: Set<string>;
        isSameDept: boolean;
        isCrossDept: boolean;
      };
      ranges.push({
        startDate: cr.startDate,
        endDate: cr.endDate,
        employees: Array.from<string>(cr.employees),
        depts: Array.from<string>(cr.depts),
        isSameDept: cr.isSameDept,
        isCrossDept: cr.isCrossDept,
        totalDays: cr.endDay - cr.startDay + 1,
      });
    }

    return ranges;
  }, [overlapStats.overlappingDays]);

  // Selected day leaves for Inspector modal
  const selectedDayLeaves = useMemo(() => {
    if (!selectedDayDate) return [];
    return eligibleLeaves.filter(
      (l) => l.startDate <= selectedDayDate && l.endDate >= selectedDayDate
    );
  }, [selectedDayDate, eligibleLeaves]);

  // Group selected day leaves by department for the Inspector modal
  const selectedDayDeptGroups = useMemo(() => {
    const groups: Record<string, LeaveRequest[]> = {};
    selectedDayLeaves.forEach((l) => {
      if (!groups[l.department]) {
        groups[l.department] = [];
      }
      groups[l.department].push(l);
    });
    return Object.entries(groups) as [string, LeaveRequest[]][];
  }, [selectedDayLeaves]);

  const isToday = (dateStr: string) => dateStr === '2026-09-08';

  // Distinct employees who have leaves in this month (for timeline grid)
  const monthEmployees = useMemo(() => {
    const empMap = new Map<string, { id: string; name: string; department: string; role: string }>();
    eligibleLeaves.forEach((leave) => {
      const monthStart = formatDayString(currentYear, currentMonth, 1);
      const monthEnd = formatDayString(currentYear, currentMonth, daysInMonth);
      if (leave.endDate >= monthStart && leave.startDate <= monthEnd) {
        if (!empMap.has(leave.employeeId)) {
          empMap.set(leave.employeeId, {
            id: leave.employeeId,
            name: leave.employeeName,
            department: leave.department,
            role: leave.employeeRole,
          });
        }
      }
    });
    return Array.from(empMap.values());
  }, [eligibleLeaves, currentYear, currentMonth, daysInMonth]);

  const getLeaveTypeBadgeColor = (type: LeaveType) => {
    switch (type) {
      case 'EL':
        return 'bg-indigo-600 text-white';
      case 'CL':
        return 'bg-emerald-600 text-white';
      case 'SL':
        return 'bg-blue-600 text-white';
      case 'PL':
        return 'bg-purple-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  return (
    <div className="space-y-4">
      {/* Calendar Control & Navigation Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Month Selector & Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={handlePrevMonth}
              title="Previous Month"
              className="rounded-lg p-1.5 text-slate-600 hover:bg-white hover:shadow-xs dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[150px] text-center font-bold text-sm text-slate-900 dark:text-white select-none">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              title="Next Month"
              className="rounded-lg p-1.5 text-slate-600 hover:bg-white hover:shadow-xs dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleGoToCurrentMonth}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Today (Sep 2026)
          </button>
        </div>

        {/* View Mode & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Primary View Mode Switcher */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800 text-xs">
            <button
              onClick={() => setActiveViewMode('dept-matrix')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold transition-all ${
                activeViewMode === 'dept-matrix'
                  ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-indigo-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <GitMerge className="h-3.5 w-3.5" />
              <span>Cross-Dept Matrix</span>
              {overlapStats.crossDeptOverlapCount > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[9px] font-black text-white">
                  ⚡ {overlapStats.crossDeptOverlapCount}d
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveViewMode('month-grid')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold transition-all ${
                activeViewMode === 'month-grid'
                  ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-indigo-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Month Grid</span>
            </button>

            <button
              onClick={() => setActiveViewMode('timeline-grid')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold transition-all ${
                activeViewMode === 'timeline-grid'
                  ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-700 dark:text-indigo-300'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Team Matrix</span>
            </button>
          </div>

          {/* Quick "Only Overlaps" Filter Toggle */}
          <button
            onClick={() => setOnlyOverlapsFilter(!onlyOverlapsFilter)}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold border transition-all ${
              onlyOverlapsFilter
                ? 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-200 shadow-xs ring-1 ring-amber-400'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
            title="Filter view to focus exclusively on dates with overlapping leave requests"
          >
            <AlertTriangle
              className={`h-3.5 w-3.5 ${
                onlyOverlapsFilter ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
              }`}
            />
            <span>Only Overlaps</span>
            {overlapStats.totalOverlapDaysCount > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[9px] font-black text-white">
                {overlapStats.totalOverlapDaysCount}
              </span>
            )}
          </button>

          {/* Department Filter */}
          <div className="flex items-center gap-1 text-xs">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {departmentsFilterList.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === 'All' ? 'All Departments' : dept}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">Approved & Pending</option>
              <option value="approved">Approved Only</option>
              <option value="pending">Pending Only</option>
            </select>
          </div>

          {/* Quick Apply button */}
          <button
            onClick={() => onApplyLeaveClick()}
            className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Apply</span>
          </button>
        </div>
      </div>

      {/* Overlapping Leave Conflicts & Coverage Alert Banner */}
      {overlapStats.totalOverlapDaysCount > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs dark:border-amber-900/60 dark:bg-amber-950/30">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-xs">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                    Cross-Department Overlapping Leave Alert ({overlapStats.totalOverlapDaysCount} Days with Concurrent Absence)
                  </h3>
                  {overlapStats.crossDeptOverlapCount > 0 && (
                    <span className="rounded-md bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                      ⚡ {overlapStats.crossDeptOverlapCount} Cross-Dept Days
                    </span>
                  )}
                  {overlapStats.sameDeptOverlapCount > 0 && (
                    <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                      ⚠️ {overlapStats.sameDeptOverlapCount} Same-Dept Days
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300/90">
                  Multiple team members share leave dates during {MONTH_NAMES[currentMonth]} {currentYear}. Review cross-functional capacity to prevent delivery bottlenecks:
                </p>

                {/* Overlap Range Badges with Department Chips */}
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {overlapRanges.map((range, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedDayDate(range.startDate)}
                      className={`group flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs text-left transition-all ${
                        range.isSameDept
                          ? 'border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200'
                          : 'border-amber-200 bg-white text-amber-900 hover:bg-amber-100/80 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200'
                      }`}
                    >
                      <span className="font-bold">
                        {range.startDate.slice(5)} &rarr; {range.endDate.slice(5)} ({range.totalDays}d):
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {range.employees.join(' & ')}
                      </span>
                      <div className="flex items-center gap-1">
                        {range.depts.map((d) => {
                          const theme = getDeptTheme(d);
                          return (
                            <span
                              key={d}
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${theme.badgeBg} ${theme.badgeText}`}
                            >
                              {theme.tag}
                            </span>
                          );
                        })}
                      </div>
                      <ArrowRight className="h-3 w-3 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start shrink-0 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <ShieldAlert className="h-4 w-4" />
              <span>Coverage Check Required</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            No overlapping leave requests detected for <strong>{MONTH_NAMES[currentMonth]} {currentYear}</strong> under active filters.
          </span>
        </div>
      )}

      {/* VIEW MODE 1: CROSS-DEPARTMENT OVERLAP MATRIX (PRIMARY AT-A-GLANCE VIEW) */}
      {activeViewMode === 'dept-matrix' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          {/* Header Strip with Metrics */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <GitMerge className="h-4 w-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cross-Department Leave Concurrency & Overlap Heatmap
                </h4>
                <span className="rounded-full bg-indigo-100 dark:bg-indigo-950/80 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Horizontal timeline mapping department absences. Highlighted columns indicate concurrent multi-department absences.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs flex-wrap">
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5">
                <span className="text-slate-400">Multi-Dept Overlaps:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {crossDeptOverlappingDays.length} Days
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5">
                <span className="text-slate-400">Same-Dept Overlaps:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {overlapStats.sameDeptOverlapCount} Days
                </span>
              </div>
              {onlyOverlapsFilter && (
                <span className="rounded-xl bg-amber-500 text-white font-bold px-2 py-1 text-[10px]">
                  Filtered to Overlaps
                </span>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    <th className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 p-2.5 text-left w-48 border-r border-slate-200 dark:border-slate-700 shadow-xs">
                      Department
                    </th>
                    {displayDays.map((dayNum) => {
                      const dateStr = formatDayString(currentYear, currentMonth, dayNum);
                      const dayLeaves = dayLeavesMap[dateStr] || [];
                      const dayDepts = Array.from(new Set(dayLeaves.map((l) => l.department)));
                      const isCrossDept = dayDepts.length >= 2;
                      const isSameDept = dayLeaves.length > dayDepts.length;
                      const isTodayDate = isToday(dateStr);
                      const d = new Date(currentYear, currentMonth, dayNum);
                      const dayName = DAYS_OF_WEEK[(d.getDay() + 6) % 7];
                      const isWeekend = (d.getDay() + 6) % 7 >= 5;

                      return (
                        <th
                          key={dayNum}
                          onClick={() => setSelectedDayDate(dateStr)}
                          className={`p-1.5 text-center min-w-[34px] border-r border-slate-200/70 dark:border-slate-800 cursor-pointer transition-colors ${
                            isTodayDate
                              ? 'bg-indigo-600 text-white font-extrabold'
                              : isCrossDept
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200'
                              : isSameDept
                              ? 'bg-rose-100 text-rose-900 dark:bg-rose-950/70 dark:text-rose-200'
                              : isWeekend
                              ? 'bg-slate-200/40 text-slate-400 dark:bg-slate-900/40 dark:text-slate-500'
                              : 'hover:bg-slate-200/80 dark:hover:bg-slate-700'
                          }`}
                          title={`${dateStr} (${dayName}): ${dayLeaves.length} absent across ${dayDepts.length} departments`}
                        >
                          <div className="text-[9px] uppercase font-semibold opacity-75">{dayName}</div>
                          <div className="text-xs font-black">{dayNum}</div>
                          {isCrossDept && (
                            <div className="text-[8px] font-extrabold text-amber-700 dark:text-amber-300">
                              ⚡
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {allDepartments
                    .filter((dept) => selectedDepartment === 'All' || dept === selectedDepartment)
                    .map((dept) => {
                      const theme = getDeptTheme(dept);
                      const deptLeavesThisMonth = eligibleLeaves.filter((l) => {
                        const mStart = formatDayString(currentYear, currentMonth, 1);
                        const mEnd = formatDayString(currentYear, currentMonth, daysInMonth);
                        return l.department === dept && l.endDate >= mStart && l.startDate <= mEnd;
                      });

                      return (
                        <tr
                          key={dept}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          {/* Sticky Department Label */}
                          <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 p-2.5 border-r border-slate-200 dark:border-slate-800 shadow-xs">
                            <div className="flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full ${theme.dot} shrink-0`} />
                              <div className="overflow-hidden">
                                <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {dept}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {deptLeavesThisMonth.length} {deptLeavesThisMonth.length === 1 ? 'leave' : 'leaves'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Day Cells */}
                          {displayDays.map((dayNum) => {
                            const dateStr = formatDayString(currentYear, currentMonth, dayNum);
                            const deptLeavesOnDay = (dayLeavesMap[dateStr] || []).filter(
                              (l) => l.department === dept
                            );
                            const allLeavesOnDay = dayLeavesMap[dateStr] || [];
                            const isCrossDept =
                              Array.from(new Set(allLeavesOnDay.map((l) => l.department))).length >= 2;
                            const hasDeptOverlap = deptLeavesOnDay.length >= 2;

                            return (
                              <td
                                key={dayNum}
                                onClick={() => setSelectedDayDate(dateStr)}
                                className={`p-1 border-r border-slate-100 dark:border-slate-800/80 text-center cursor-pointer transition-colors relative ${
                                  hasDeptOverlap
                                    ? 'bg-rose-50/60 dark:bg-rose-950/30'
                                    : isCrossDept && deptLeavesOnDay.length > 0
                                    ? 'bg-amber-50/50 dark:bg-amber-950/20'
                                    : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                                }`}
                              >
                                {deptLeavesOnDay.length === 0 ? (
                                  <span className="text-slate-200 dark:text-slate-800 select-none text-[10px]">
                                    ·
                                  </span>
                                ) : deptLeavesOnDay.length === 1 ? (
                                  <div
                                    className={`rounded px-1.5 py-1 text-[9px] font-bold truncate max-w-[80px] mx-auto border shadow-2xs ${
                                      deptLeavesOnDay[0].status === 'pending'
                                        ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200'
                                        : `${theme.bgLight} ${theme.text} ${theme.border}`
                                    }`}
                                    title={`${deptLeavesOnDay[0].employeeName} (${deptLeavesOnDay[0].leaveType}): ${deptLeavesOnDay[0].reason}`}
                                  >
                                    <div className="truncate">
                                      {deptLeavesOnDay[0].employeeName.split(' ')[0]}
                                    </div>
                                    <div className="text-[8px] font-black opacity-75">
                                      {deptLeavesOnDay[0].leaveType}
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    className="rounded bg-rose-600 text-white px-1 py-1 text-[9px] font-black mx-auto max-w-[80px] shadow-xs flex flex-col items-center animate-pulse"
                                    title={`Same Department Overlap: ${deptLeavesOnDay
                                      .map((l) => l.employeeName)
                                      .join(', ')}`}
                                  >
                                    <span className="flex items-center gap-0.5">
                                      <AlertTriangle className="h-2.5 w-2.5" />
                                      <span>{deptLeavesOnDay.length} Off</span>
                                    </span>
                                    <span className="text-[7.5px] truncate max-w-full font-medium">
                                      {deptLeavesOnDay.map((l) => l.employeeName.split(' ')[0]).join('+')}
                                    </span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                </tbody>

                {/* Cross-Department Concurrency Summary Footer */}
                <tfoot>
                  <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-xs">
                    <td className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 p-2.5 text-left border-r border-slate-300 dark:border-slate-700 shadow-xs">
                      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        <span>Cross-Dept Overlap</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        Depts concurrently absent
                      </div>
                    </td>
                    {displayDays.map((dayNum) => {
                      const dateStr = formatDayString(currentYear, currentMonth, dayNum);
                      const dayLeaves = dayLeavesMap[dateStr] || [];
                      const depts: string[] = Array.from(new Set(dayLeaves.map((l) => l.department)));
                      const isCrossDept = depts.length >= 2;

                      return (
                        <td
                          key={dayNum}
                          onClick={() => setSelectedDayDate(dateStr)}
                          className={`p-1.5 text-center cursor-pointer border-r border-slate-200 dark:border-slate-700 transition-colors ${
                            isCrossDept
                              ? 'bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 font-black'
                              : dayLeaves.length > 0
                              ? 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                              : 'text-slate-400'
                          }`}
                          title={
                            isCrossDept
                              ? `${depts.length} departments on leave: ${depts.join(', ')} (${dayLeaves.length} employees)`
                              : `${depts.length} department on leave`
                          }
                        >
                          {isCrossDept ? (
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-black rounded-full bg-amber-500 text-white px-1.5 py-0.2">
                                {depts.length}
                              </span>
                              <span className="text-[7.5px] uppercase font-bold text-amber-900 dark:text-amber-200 mt-0.5">
                                {depts.map((d) => getDeptTheme(d).tag).join('+')}
                              </span>
                            </div>
                          ) : depts.length === 1 ? (
                            <span className="text-[9px] text-slate-500 font-semibold">1</span>
                          ) : (
                            <span className="text-[9px] text-slate-300 dark:text-slate-600">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: MONTH GRID (CALENDAR VIEW WITH DEPARTMENT BADGES) */}
      {activeViewMode === 'month-grid' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          {/* Day Names Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
            {DAYS_OF_WEEK.map((day, idx) => (
              <div
                key={day}
                className={`py-2.5 ${idx >= 5 ? 'text-slate-400 dark:text-slate-500' : ''}`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800">
            {/* Previous month padding cells */}
            {Array.from({ length: firstDayOfWeekIndex }).map((_, index) => {
              const dayNum = daysInPrevMonth - firstDayOfWeekIndex + index + 1;
              return (
                <div
                  key={`prev-${index}`}
                  className="min-h-[105px] p-2 bg-slate-50/30 dark:bg-slate-900/40 text-slate-300 dark:text-slate-700 select-none"
                >
                  <span className="text-xs font-semibold">{dayNum}</span>
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const dayNumber = index + 1;
              const dateStr = formatDayString(currentYear, currentMonth, dayNumber);
              const dayLeaves = dayLeavesMap[dateStr] || [];
              const hasLeaves = dayLeaves.length > 0;
              const hasOverlap = dayLeaves.length >= 2;
              const depts: string[] = Array.from(new Set(dayLeaves.map((l) => l.department)));
              const hasSameDeptOverlap = hasOverlap && dayLeaves.length > depts.length;
              const isCrossDept = depts.length >= 2;
              const isTodayDate = isToday(dateStr);
              const isSelected = selectedDayDate === dateStr;

              const cellDayOfWeek = (index + firstDayOfWeekIndex) % 7;
              const isWeekend = cellDayOfWeek === 5 || cellDayOfWeek === 6;

              const isDimmed = onlyOverlapsFilter && !hasOverlap;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDayDate(dateStr)}
                  className={`min-h-[115px] p-2 transition-all cursor-pointer relative group flex flex-col justify-between ${
                    isSelected
                      ? 'ring-2 ring-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/40 z-10'
                      : isDimmed
                      ? 'opacity-30 bg-slate-50/20 dark:bg-slate-900/20'
                      : isCrossDept
                      ? 'bg-amber-50/40 hover:bg-amber-50/70 dark:bg-amber-950/20 dark:hover:bg-amber-950/30'
                      : hasSameDeptOverlap
                      ? 'bg-rose-50/40 hover:bg-rose-50/70 dark:bg-rose-950/25 dark:hover:bg-rose-950/35'
                      : isWeekend
                      ? 'bg-slate-50/50 hover:bg-slate-100/50 dark:bg-slate-900/40 dark:hover:bg-slate-800/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Top Bar: Date Number & Overlap Badge */}
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-xs font-bold leading-none ${
                          isTodayDate
                            ? 'flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xs'
                            : isWeekend
                            ? 'text-slate-400 dark:text-slate-500'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {dayNumber}
                      </span>
                      {isTodayDate && (
                        <span className="hidden sm:inline-block text-[9px] font-bold uppercase text-indigo-600 dark:text-indigo-400">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Overlap Indicator Badge with Department Tags */}
                    {hasOverlap && (
                      <div
                        title={`Overlap conflict: ${dayLeaves.length} on leave across ${depts.join(', ')}`}
                        className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold tracking-tight ${
                          isCrossDept
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800'
                            : 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800 animate-pulse'
                        }`}
                      >
                        <AlertTriangle className="h-2.5 w-2.5" />
                        <span>
                          {isCrossDept
                            ? `⚡ ${depts.map((d) => getDeptTheme(d).tag).join('+')}`
                            : `${dayLeaves.length} in ${getDeptTheme(depts[0]).tag}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Leave Request Pills with Department Tags */}
                  <div className="space-y-1 flex-1">
                    {dayLeaves.slice(0, 3).map((leave) => {
                      const isPending = leave.status === 'pending';
                      const theme = getDeptTheme(leave.department);

                      return (
                        <div
                          key={leave.id}
                          className={`flex items-center justify-between gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-transform group-hover:scale-[1.01] border shadow-2xs ${theme.bgLight} ${theme.text} ${theme.border}`}
                          title={`${leave.employeeName} (${leave.department}) - ${leave.leaveType} (${leave.status})`}
                        >
                          <div className="flex items-center gap-1 overflow-hidden">
                            <span
                              className={`rounded px-1 text-[8px] font-black uppercase ${theme.badgeBg} ${theme.badgeText}`}
                            >
                              {theme.tag}
                            </span>
                            <span className="truncate font-semibold text-slate-900 dark:text-slate-100">
                              {leave.employeeName.split(' ')[0]}
                            </span>
                          </div>

                          <div className="shrink-0">
                            {isPending ? (
                              <Clock className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {dayLeaves.length > 3 && (
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 pl-1">
                        +{dayLeaves.length - 3} more on leave
                      </div>
                    )}
                  </div>

                  {!hasLeaves && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 justify-end">
                      <PlusCircle className="h-3 w-3" />
                      <span>Apply</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Trailing cells */}
            {Array.from({
              length: (7 - ((daysInMonth + firstDayOfWeekIndex) % 7)) % 7,
            }).map((_, index) => (
              <div
                key={`next-${index}`}
                className="min-h-[105px] p-2 bg-slate-50/30 dark:bg-slate-900/40 text-slate-300 dark:text-slate-700 select-none"
              >
                <span className="text-xs font-semibold">{index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW MODE 3: TEAM MATRIX GRID (INDIVIDUAL EMPLOYEE GANTT) */}
      {activeViewMode === 'timeline-grid' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-x-auto">
          <div className="min-w-[850px] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Team Member Leave Timeline ({MONTH_NAMES[currentMonth]} {currentYear})
                </h4>
                <p className="text-xs text-slate-500">
                  Individual personnel schedules. Columns highlighted in amber indicate overlapping requests across the organization.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span>Overlap Column</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                  <span>Approved Leave</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span>Pending Leave</span>
                </span>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden dark:border-slate-800">
              {/* Header Days Row */}
              <div className="grid grid-cols-[180px_repeat(31,minmax(20px,1fr))] bg-slate-100 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <div className="p-2 border-r border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider">
                  Team Member
                </div>
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = formatDayString(currentYear, currentMonth, dayNum);
                  const isOverlap = (dayLeavesMap[dateStr] || []).length >= 2;
                  const isTodayCol = isToday(dateStr);

                  return (
                    <div
                      key={dayNum}
                      onClick={() => setSelectedDayDate(dateStr)}
                      title={`${dateStr}: ${(dayLeavesMap[dateStr] || []).length} on leave`}
                      className={`text-center py-2 cursor-pointer transition-colors ${
                        isTodayCol
                          ? 'bg-indigo-600 text-white font-extrabold'
                          : isOverlap
                          ? 'bg-amber-200 text-amber-900 font-extrabold dark:bg-amber-900/60 dark:text-amber-200'
                          : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {dayNum}
                    </div>
                  );
                })}
              </div>

              {/* Employees Rows */}
              {monthEmployees.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No employee leave records found for this month under active filters.
                </div>
              ) : (
                monthEmployees.map((emp) => {
                  const theme = getDeptTheme(emp.department);
                  return (
                    <div
                      key={emp.id}
                      className="grid grid-cols-[180px_repeat(31,minmax(20px,1fr))] border-b border-slate-100 dark:border-slate-800/80 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30 text-xs"
                    >
                      {/* Employee Meta */}
                      <div className="p-2 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-center">
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          {emp.name}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span
                            className={`rounded px-1 text-[8px] font-black uppercase ${theme.badgeBg} ${theme.badgeText}`}
                          >
                            {theme.tag}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">
                            {emp.department}
                          </span>
                        </div>
                      </div>

                      {/* Day Columns */}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const dateStr = formatDayString(currentYear, currentMonth, dayNum);
                        const dayLeave = eligibleLeaves.find(
                          (l) =>
                            l.employeeId === emp.id &&
                            l.startDate <= dateStr &&
                            l.endDate >= dateStr
                        );
                        const isDayOverlap = (dayLeavesMap[dateStr] || []).length >= 2;

                        return (
                          <div
                            key={dayNum}
                            onClick={() => setSelectedDayDate(dateStr)}
                            className={`h-9 flex items-center justify-center cursor-pointer border-r border-slate-100/60 dark:border-slate-800/40 relative ${
                              isDayOverlap ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''
                            }`}
                          >
                            {dayLeave && (
                              <div
                                title={`${emp.name} (${emp.department}): ${dayLeave.leaveType} (${dayLeave.status}) - ${dayLeave.reason}`}
                                className={`h-6 w-full mx-0.5 rounded flex items-center justify-center text-[9px] font-black text-white ${
                                  dayLeave.status === 'pending'
                                    ? 'bg-amber-500 shadow-2xs'
                                    : getLeaveTypeBadgeColor(dayLeave.leaveType)
                                }`}
                              >
                                {dayLeave.leaveType}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calendar Legend & Summary Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3 font-medium">
          <span className="font-bold text-slate-700 dark:text-slate-300">Department Tags:</span>
          {allDepartments.map((dept) => {
            const theme = getDeptTheme(dept);
            return (
              <span key={dept} className="flex items-center gap-1">
                <span className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${theme.badgeBg} ${theme.badgeText}`}>
                  {theme.tag}
                </span>
                <span className="text-[11px]">{dept}</span>
              </span>
            );
          })}
          <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300 font-bold ml-2">
            <span className="h-3 w-3 rounded-md bg-amber-400 border border-amber-500" />
            <span>Multi-Dept Overlap</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span>
            Total Absences this Month:{' '}
            <strong className="text-slate-900 dark:text-white">
              {(Object.values(dayLeavesMap) as LeaveRequest[][]).reduce((acc, arr) => acc + arr.length, 0)} days
            </strong>
          </span>
        </div>
      </div>

      {/* Interactive Day Inspector Modal / Drawer */}
      {selectedDayDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Day Leave Roster & Overlap Inspector
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {new Date(selectedDayDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  {isToday(selectedDayDate) && (
                    <span className="ml-2 rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      Today
                    </span>
                  )}
                </p>
              </div>

              <button
                onClick={() => setSelectedDayDate(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 text-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Overlap Warning Box in Modal */}
            {selectedDayLeaves.length >= 2 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">
                    Concurrent Absence Alert ({selectedDayLeaves.length} Team Members on Leave)
                  </strong>
                  <span>
                    {Array.from(new Set(selectedDayLeaves.map((l) => l.department))).length >= 2
                      ? `⚡ Multi-Department Overlap: Staff from ${Array.from(
                          new Set(selectedDayLeaves.map((l) => l.department))
                        ).join(' and ')} are off concurrently today.`
                      : '⚠️ Intra-Department Overlap: Multiple employees from the same department are off concurrently today.'}
                  </span>
                </div>
              </div>
            )}

            {/* Day Roster Body - Grouped by Department */}
            <div className="flex-1 overflow-y-auto py-3 space-y-4">
              {selectedDayLeaves.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Users className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No Scheduled Absences
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    All team members are scheduled to be working on this date.
                  </p>
                </div>
              ) : (
                selectedDayDeptGroups.map(([deptName, deptLeaves]) => {
                  const theme = getDeptTheme(deptName);
                  return (
                    <div
                      key={deptName}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 space-y-2.5"
                    >
                      {/* Department Section Header */}
                      <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700 pb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${theme.badgeBg} ${theme.badgeText}`}
                          >
                            {theme.tag}
                          </span>
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {deptName}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            ({deptLeaves.length} away)
                          </span>
                        </div>
                        {deptLeaves.length >= 2 && (
                          <span className="rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold px-1.5 py-0.5">
                            Capacity Risk
                          </span>
                        )}
                      </div>

                      {/* Leaves for this Department */}
                      {deptLeaves.map((leave) => {
                        const isPending = leave.status === 'pending';
                        const canApprove =
                          (currentUser.role === 'admin' || currentUser.role === 'manager') &&
                          isPending &&
                          leave.employeeId !== currentUser.id &&
                          onStatusChange;

                        return (
                          <div
                            key={leave.id}
                            className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                  {leave.employeeName}
                                </h4>
                                <p className="text-[10px] text-slate-500">
                                  {leave.employeeRole}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`rounded-lg px-2 py-0.5 text-xs font-black uppercase ${getLeaveTypeBadgeColor(
                                    leave.leaveType
                                  )}`}
                                >
                                  {leave.leaveType}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                    leave.status === 'approved'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  }`}
                                >
                                  {leave.status}
                                </span>
                              </div>
                            </div>

                            <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                                <span>
                                  Duration: {leave.startDate} &rarr; {leave.endDate} ({leave.daysCount} days)
                                </span>
                                <span className="font-mono text-[10px]">#{leave.id}</span>
                              </div>
                              <p className="text-slate-800 dark:text-slate-200">
                                <strong>Reason:</strong> {leave.reason}
                              </p>
                            </div>

                            {/* Manager Quick Action */}
                            {canApprove && (
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  onClick={() => {
                                    onStatusChange(leave.id, 'approved', 'Approved from Cross-Dept Calendar Inspector.');
                                  }}
                                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Approve Request</span>
                                </button>
                                <button
                                  onClick={() => {
                                    const reason =
                                      prompt('Enter rejection remark:') || 'Operational staffing overlap';
                                    onStatusChange(leave.id, 'rejected', reason);
                                  }}
                                  className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300"
                                >
                                  <span>Reject</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800 gap-2">
              <button
                type="button"
                onClick={() => {
                  const target = selectedDayDate;
                  setSelectedDayDate(null);
                  onApplyLeaveClick(target);
                }}
                className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Apply for Leave on this Date</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDayDate(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
