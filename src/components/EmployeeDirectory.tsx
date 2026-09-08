import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Mail,
  Phone,
  GraduationCap,
  Briefcase,
  Award,
  FileText,
  Shield,
  MapPin,
  Lock,
  ChevronRight,
  X,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Eye,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storageService';
import { Employee, Role } from '../types';
import { multiFieldFuzzyMatch, getHighlightSegments, MultiFieldTarget } from '../utils/fuzzySearch';

// Sub-component to render highlighted matches in real-time
const HighlightedText: React.FC<{ text: string; ranges?: [number, number][] }> = ({
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

export interface EmployeeDirectoryProps {
  initialSearchQuery?: string;
  initialSelectedEmployeeId?: string | null;
  onClearInitialEmployee?: () => void;
}

export const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({
  initialSearchQuery = '',
  initialSelectedEmployeeId = null,
  onClearInitialEmployee,
}) => {
  const { currentUser, refreshUserData } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>(() => storageService.getEmployees());
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedWorkMode, setSelectedWorkMode] = useState('All');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(() => {
    if (initialSelectedEmployeeId) {
      return storageService.getEmployees().find((e) => e.id === initialSelectedEmployeeId) || null;
    }
    return null;
  });
  const [activeDossierTab, setActiveDossierTab] = useState<'profile' | 'education' | 'experience' | 'certs' | 'documents' | 'payroll'>('profile');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync external search query
  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Sync external selected employee
  useEffect(() => {
    if (initialSelectedEmployeeId) {
      const found = employees.find((e) => e.id === initialSelectedEmployeeId);
      if (found) {
        setSelectedEmployee(found);
      }
    }
  }, [initialSelectedEmployeeId, employees]);

  // Keyboard shortcut listener: Press "/" to focus fuzzy search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Subscribe to real-time storage updates
  useEffect(() => {
    const unsub = storageService.subscribe(() => {
      setEmployees(storageService.getEmployees());
    });
    return unsub;
  }, []);

  // New Employee Form State (For HR Admin)
  const [newEmp, setNewEmp] = useState({
    name: '',
    email: '',
    personalEmail: '',
    phone: '',
    designation: '',
    department: 'Engineering' as Employee['department'],
    role: 'employee' as Role,
    workMode: 'Hybrid' as Employee['workMode'],
    location: 'San Francisco, CA',
    joiningDate: new Date().toISOString().split('T')[0],
    emergencyName: '',
    emergencyRelationship: 'Spouse',
    emergencyPhone: '',
    bio: '',
  });

  const departments = ['All', 'Engineering', 'Product', 'Human Resources', 'Design', 'Finance', 'Marketing', 'Operations'];
  const workModes = ['All', 'Remote', 'Hybrid', 'On-site'];

  // Real-time fuzzy search results across Name, Department, Job Role, Code, Email, and Location
  const fuzzySearchResults = useMemo(() => {
    const q = searchQuery.trim();

    return employees
      .map((emp) => {
        const fields: MultiFieldTarget[] = [
          { key: 'name', label: 'Name', text: emp.name, weight: 1.35 },
          { key: 'role', label: 'Job Role', text: emp.designation, weight: 1.25 },
          { key: 'dept', label: 'Department', text: emp.department, weight: 1.2 },
          { key: 'code', label: 'ID', text: emp.employeeCode, weight: 1.15 },
          { key: 'email', label: 'Email', text: emp.email, weight: 1.0 },
          { key: 'location', label: 'Location', text: emp.location, weight: 0.95 },
          { key: 'workMode', label: 'Work Mode', text: emp.workMode, weight: 0.9 },
        ];

        const match = multiFieldFuzzyMatch(fields, q);

        return {
          emp,
          isMatch: match.isMatch,
          score: match.score,
          matchedFields: match.matchedFields,
          nameRanges: match.fieldRanges.name || [],
          deptRanges: match.fieldRanges.dept || [],
          roleRanges: match.fieldRanges.role || [],
          codeRanges: match.fieldRanges.code || [],
          emailRanges: match.fieldRanges.email || [],
        };
      })
      .filter(({ emp, isMatch }) => {
        const matchesDept = selectedDepartment === 'All' || emp.department === selectedDepartment;
        const matchesWorkMode = selectedWorkMode === 'All' || emp.workMode === selectedWorkMode;
        return isMatch && matchesDept && matchesWorkMode;
      })
      .sort((a, b) => {
        if (q) {
          return b.score - a.score;
        }
        return a.emp.name.localeCompare(b.emp.name);
      });
  }, [employees, searchQuery, selectedDepartment, selectedWorkMode]);

  const handleCloseDossier = () => {
    setSelectedEmployee(null);
    if (onClearInitialEmployee) {
      onClearInitialEmployee();
    }
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.name || !newEmp.email) return;

    const newRecord: Employee = {
      id: `emp-${Date.now()}`,
      employeeCode: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newEmp.name,
      email: newEmp.email,
      personalEmail: newEmp.personalEmail || newEmp.email,
      phone: newEmp.phone || '+1 (555) 000-0000',
      role: newEmp.role,
      designation: newEmp.designation || 'Specialist',
      department: newEmp.department,
      location: newEmp.location,
      workMode: newEmp.workMode,
      joiningDate: newEmp.joiningDate,
      status: 'Active',
      avatarUrl: `https://images.unsplash.com/photo-${1530000000000 + Math.floor(Math.random() * 100000000)}?w=150&auto=format&fit=crop&q=80`,
      bio: newEmp.bio || 'Recently onboarded to the organization.',
      emergencyContact: {
        name: newEmp.emergencyName || 'Primary Contact',
        relationship: newEmp.emergencyRelationship,
        phone: newEmp.emergencyPhone || '+1 (555) 000-1111',
      },
      leaveBalance: {
        EL: { total: 18, used: 0, remaining: 18 },
        CL: { total: 10, used: 0, remaining: 10 },
        SL: { total: 12, used: 0, remaining: 12 },
        PL: { total: 15, used: 0, remaining: 15 },
      },
      education: [],
      priorExperience: [],
      certifications: [],
      documents: [],
      payrollHistory: [],
    };

    storageService.addEmployee(newRecord, {
      id: currentUser.id,
      name: currentUser.name,
      role: currentUser.role,
    });

    setEmployees(storageService.getEmployees());
    setIsAddModalOpen(false);
    setNewEmp({
      name: '',
      email: '',
      personalEmail: '',
      phone: '',
      designation: '',
      department: 'Engineering',
      role: 'employee',
      workMode: 'Hybrid',
      location: 'San Francisco, CA',
      joiningDate: new Date().toISOString().split('T')[0],
      emergencyName: '',
      emergencyRelationship: 'Spouse',
      emergencyPhone: '',
      bio: '',
    });
    refreshUserData();
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Employee Directory & Comprehensive Records
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Centralized dossier management including education, experience, certifications, and encrypted documents.
          </p>
        </div>

        {currentUser.role === 'admin' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Employee</span>
          </button>
        )}
      </div>

      {/* Real-time Fuzzy Search & Advanced Filter Bar */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Fuzzy Search Input */}
          <div className="relative flex-1">
            <Search
              className={`absolute left-3.5 top-3 h-4 w-4 transition-colors ${
                searchQuery ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
              }`}
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Fuzzy search by name, department, or job role (e.g. 'elena', 'eng', 'designer')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-20 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-800 transition-all shadow-2xs"
            />

            {/* Clear Button & Keyboard Shortcut Badge */}
            <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  /
                </kbd>
              )}
            </div>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">Dept:</span>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === 'All' ? 'All Departments' : dept}
                </option>
              ))}
            </select>
          </div>

          {/* Work Mode Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">Work Mode:</span>
            <select
              value={selectedWorkMode}
              onChange={(e) => setSelectedWorkMode(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {workModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode === 'All' ? 'All Locations' : mode}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Real-time Status & Quick Filter Suggestions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Showing <strong className="text-slate-800 dark:text-slate-200">{fuzzySearchResults.length}</strong> of{' '}
              {employees.length} personnel
            </span>

            {searchQuery && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800">
                <Sparkles className="h-3 w-3" />
                <span>Fuzzy Match Active</span>
              </span>
            )}
          </div>

          {/* Quick Search Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400">Quick queries:</span>
            {['Engineering', 'Design', 'Product', 'Architect', 'Lead', 'Alex'].map((chip) => (
              <button
                key={chip}
                onClick={() => setSearchQuery(chip)}
                className={`rounded-lg px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  searchQuery.toLowerCase() === chip.toLowerCase()
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fuzzySearchResults.map(
          ({ emp, score, matchedFields, nameRanges, deptRanges, roleRanges, codeRanges, emailRanges }) => (
            <div
              key={emp.id}
              onClick={() => setSelectedEmployee(emp)}
              className="group relative cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={emp.avatarUrl}
                    alt={emp.name}
                    className="h-12 w-12 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      <HighlightedText text={emp.name} ranges={nameRanges} />
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      <HighlightedText text={emp.designation} ranges={roleRanges} />
                    </p>
                    <span className="inline-block mt-0.5 font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                      <HighlightedText text={emp.employeeCode} ranges={codeRanges} />
                    </span>
                  </div>
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
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

              {/* Matched Field Tag (shown when search is active) */}
              {searchQuery && matchedFields.length > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-amber-50/80 px-2.5 py-1 text-[11px] text-amber-900 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800/80">
                  <span className="font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Matched in: <strong>{matchedFields.map((f) => f.label).join(', ')}</strong></span>
                  </span>
                  <span className="font-mono font-bold text-[10px] text-amber-700 dark:text-amber-300">
                    {score}%
                  </span>
                </div>
              )}

              <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    <HighlightedText text={emp.department} ranges={deptRanges} />
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    <HighlightedText text={emp.email} ranges={emailRanges} />
                  </span>
                </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>
                  {emp.location} ({emp.workMode})
                </span>
              </div>
            </div>

            {/* Quick Record Counters */}
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400 dark:border-slate-800">
              <span>{emp.education.length} Degrees</span>
              <span>{emp.certifications.length} Certifications</span>
              <span>{emp.documents.length} Encrypted Docs</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center">
                Dossier &rarr;
              </span>
            </div>
          </div>
        ))}
      </div>

      {fuzzySearchResults.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No employees found matching your search
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery ? (
              <>
                No records matched "<strong className="text-slate-600 dark:text-slate-300">{searchQuery}</strong>". Try
                searching for partial names (e.g. "Alex"), departments (e.g. "Engineering"), or job roles (e.g.
                "Designer").
              </>
            ) : (
              'No employees matched the selected department or work mode filters.'
            )}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear Search Query</span>
              </button>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDepartment('All');
                setSelectedWorkMode('All');
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset All Filters</span>
            </button>
          </div>
        </div>
      )}

      {/* Employee Dossier Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] flex flex-col">
            {/* Dossier Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <img
                  src={selectedEmployee.avatarUrl}
                  alt={selectedEmployee.name}
                  className="h-16 w-16 rounded-2xl object-cover ring-2 ring-indigo-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedEmployee.name}
                    </h3>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-bold text-indigo-600 dark:bg-slate-800 dark:text-indigo-400">
                      {selectedEmployee.employeeCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedEmployee.designation} • {selectedEmployee.department}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Joined: {selectedEmployee.joiningDate} • {selectedEmployee.workMode} ({selectedEmployee.location})
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseDossier}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* Dossier Tabs */}
            <div className="flex gap-2 overflow-x-auto border-b border-slate-100 py-3 dark:border-slate-800 text-xs font-medium">
              {[
                { id: 'profile', label: 'Contact & Info', icon: Briefcase },
                { id: 'education', label: `Education (${selectedEmployee.education.length})`, icon: GraduationCap },
                { id: 'experience', label: `Prior Experience (${selectedEmployee.priorExperience.length})`, icon: Briefcase },
                { id: 'certs', label: `Certifications (${selectedEmployee.certifications.length})`, icon: Award },
                { id: 'documents', label: `Documents (${selectedEmployee.documents.length})`, icon: FileText },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeDossierTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDossierTab(tab.id as any)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Dossier Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {activeDossierTab === 'profile' && (
                <div className="space-y-4 text-xs">
                  <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 space-y-2">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">Contact Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                      <div><strong className="text-slate-800 dark:text-slate-200">Work Email:</strong> {selectedEmployee.email}</div>
                      <div><strong className="text-slate-800 dark:text-slate-200">Personal Email:</strong> {selectedEmployee.personalEmail}</div>
                      <div><strong className="text-slate-800 dark:text-slate-200">Phone:</strong> {selectedEmployee.phone}</div>
                      <div><strong className="text-slate-800 dark:text-slate-200">Location:</strong> {selectedEmployee.location}</div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 space-y-2">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">Emergency Contact (HR Records)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-600 dark:text-slate-400">
                      <div><strong className="text-slate-800 dark:text-slate-200">Name:</strong> {selectedEmployee.emergencyContact.name}</div>
                      <div><strong className="text-slate-800 dark:text-slate-200">Relationship:</strong> {selectedEmployee.emergencyContact.relationship}</div>
                      <div><strong className="text-slate-800 dark:text-slate-200">Emergency Phone:</strong> {selectedEmployee.emergencyContact.phone}</div>
                    </div>
                  </div>

                  {selectedEmployee.bio && (
                    <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Executive Biography</h4>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{selectedEmployee.bio}</p>
                    </div>
                  )}
                </div>
              )}

              {activeDossierTab === 'education' && (
                <div className="space-y-3">
                  {selectedEmployee.education.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No education records catalogued yet.</p>
                  ) : (
                    selectedEmployee.education.map((edu) => (
                      <div key={edu.id} className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">{edu.degree}</h4>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400">{edu.institution}</p>
                            <p className="text-[11px] text-slate-400">{edu.field} • Class of {edu.yearOfPassing}</p>
                          </div>
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            {edu.grade}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeDossierTab === 'experience' && (
                <div className="space-y-3">
                  {selectedEmployee.priorExperience.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No prior experience listed.</p>
                  ) : (
                    selectedEmployee.priorExperience.map((exp) => (
                      <div key={exp.id} className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">{exp.role}</h4>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400">{exp.company}</p>
                            <p className="text-[10px] text-slate-400">{exp.startDate} to {exp.endDate}</p>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{exp.highlights}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeDossierTab === 'certs' && (
                <div className="space-y-3">
                  {selectedEmployee.certifications.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No certifications logged.</p>
                  ) : (
                    selectedEmployee.certifications.map((cert) => (
                      <div key={cert.id} className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">{cert.title}</h4>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400">{cert.issuer}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Credential ID: {cert.credentialId}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-600 font-bold block">Verified Active</span>
                          <span className="text-[10px] text-slate-400">Issued: {cert.issueDate}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeDossierTab === 'documents' && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>All documents in this vault are encrypted with <strong>AES-256-GCM</strong> and verified via SHA-256 integrity checksums.</span>
                  </div>

                  {selectedEmployee.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-5 w-5 text-indigo-500" />
                        <div>
                          <h5 className="text-xs font-semibold text-slate-900 dark:text-white">{doc.title}</h5>
                          <p className="text-[10px] text-slate-400">{doc.category} • {doc.fileSize} • Uploaded {doc.uploadedOn}</p>
                        </div>
                      </div>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-emerald-600 dark:bg-slate-800 dark:text-emerald-400">
                        AES-256
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dossier Footer */}
            <div className="border-t border-slate-100 pt-3 flex justify-end dark:border-slate-800">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal (Admin Only) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Enroll New Employee Record</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Rivera"
                  value={newEmp.name}
                  onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 focus:bg-white focus:outline-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Corporate Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="alex.rivera@omnihr.internal"
                    value={newEmp.email}
                    onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 focus:bg-white focus:outline-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 345-6789"
                    value={newEmp.phone}
                    onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 focus:bg-white focus:outline-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Role Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Frontend Engineer"
                    value={newEmp.designation}
                    onChange={(e) => setNewEmp({ ...newEmp, designation: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 focus:bg-white focus:outline-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
                  <select
                    value={newEmp.department}
                    onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {departments.filter((d) => d !== 'All').map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">RBAC System Role</label>
                  <select
                    value={newEmp.role}
                    onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="employee">Employee (Standard Access)</option>
                    <option value="manager">Manager (Team Approval)</option>
                    <option value="admin">Admin (HR Oversight)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Work Mode</label>
                  <select
                    value={newEmp.workMode}
                    onChange={(e) => setNewEmp({ ...newEmp, workMode: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-indigo-600 py-2 font-semibold text-white hover:bg-indigo-700"
                >
                  Save & Encrypt Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
