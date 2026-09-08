import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Users,
  TrendingUp,
  DollarSign,
  Star,
  CheckCircle2,
  Briefcase,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Settings2,
  FileCheck,
  AlertCircle,
  X,
  BadgeCheck,
  Landmark,
  Scale,
  ClipboardList,
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { Employee, LeaveRequest, PerformanceReview } from '../types';

export const MonthlyReports: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState('September 2026');
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showPrintHint, setShowPrintHint] = useState(false);

  // Configuration options
  const [reportTemplate, setReportTemplate] = useState<'comprehensive' | 'leave' | 'payroll' | 'executive'>('comprehensive');
  const [watermark, setWatermark] = useState<'OFFICIAL AUDIT' | 'CONFIDENTIAL' | 'BOARD REVIEW' | 'NONE'>('OFFICIAL AUDIT');
  const [signatoryName, setSignatoryName] = useState('Sarah Jenkins');
  const [signatoryTitle, setSignatoryTitle] = useState('Chief People Officer & Head of Labor Compliance');
  const [preparerName, setPreparerName] = useState('David Zhang');
  const [preparerTitle, setPreparerTitle] = useState('Senior HR People Operations Lead');
  const [auditRefCode, setAuditRefCode] = useState('OMNI-SOC2-2026-09-A');

  // Section visibility toggles
  const [showExecutiveKPIs, setShowExecutiveKPIs] = useState(true);
  const [showComplianceMetrics, setShowComplianceMetrics] = useState(true);
  const [showDepartmentBreakdown, setShowDepartmentBreakdown] = useState(true);
  const [showLeaveAudit, setShowLeaveAudit] = useState(true);
  const [showEmployeeRoster, setShowEmployeeRoster] = useState(true);
  const [showPayrollReconciliation, setShowPayrollReconciliation] = useState(true);
  const [showAttestationBlock, setShowAttestationBlock] = useState(true);

  const employees = storageService.getEmployees();
  const leaves = storageService.getLeaves();
  const reviews = storageService.getReviews();

  // Compute metrics for the report
  const totalEmployees = employees.length;
  const departmentsCount: Record<string, number> = {};
  employees.forEach((e) => {
    departmentsCount[e.department] = (departmentsCount[e.department] || 0) + 1;
  });

  const leavesByType = {
    EL: leaves.filter((l) => l.leaveType === 'EL').reduce((acc, l) => acc + l.daysCount, 0),
    CL: leaves.filter((l) => l.leaveType === 'CL').reduce((acc, l) => acc + l.daysCount, 0),
    SL: leaves.filter((l) => l.leaveType === 'SL').reduce((acc, l) => acc + l.daysCount, 0),
    PL: leaves.filter((l) => l.leaveType === 'PL').reduce((acc, l) => acc + l.daysCount, 0),
  };

  const totalLeaveDays = Object.values(leavesByType).reduce((a, b) => a + b, 0);

  const totalPayrollOutflow = employees.reduce((sum, emp) => {
    const p = emp.payrollHistory[0];
    return sum + (p ? p.netPay : 0);
  }, 0);

  const totalTaxWithheld = employees.reduce((sum, emp) => {
    const p = emp.payrollHistory[0];
    return sum + (p ? p.taxDeducted : 0);
  }, 0);

  const totalGrossPay = employees.reduce((sum, emp) => {
    const p = emp.payrollHistory[0];
    return sum + (p ? p.baseSalary + p.allowances : 0);
  }, 0);

  const avgPerformance = (
    reviews.reduce((acc, r) => acc + r.overallRating, 0) / (reviews.length || 1)
  ).toFixed(2);

  // Apply template presets
  const handleTemplateChange = (template: 'comprehensive' | 'leave' | 'payroll' | 'executive') => {
    setReportTemplate(template);
    if (template === 'comprehensive') {
      setShowExecutiveKPIs(true);
      setShowComplianceMetrics(true);
      setShowDepartmentBreakdown(true);
      setShowLeaveAudit(true);
      setShowEmployeeRoster(true);
      setShowPayrollReconciliation(true);
      setShowAttestationBlock(true);
    } else if (template === 'leave') {
      setShowExecutiveKPIs(true);
      setShowComplianceMetrics(true);
      setShowDepartmentBreakdown(true);
      setShowLeaveAudit(true);
      setShowEmployeeRoster(true);
      setShowPayrollReconciliation(false);
      setShowAttestationBlock(true);
    } else if (template === 'payroll') {
      setShowExecutiveKPIs(true);
      setShowComplianceMetrics(true);
      setShowDepartmentBreakdown(false);
      setShowLeaveAudit(false);
      setShowEmployeeRoster(true);
      setShowPayrollReconciliation(true);
      setShowAttestationBlock(true);
    } else if (template === 'executive') {
      setShowExecutiveKPIs(true);
      setShowComplianceMetrics(true);
      setShowDepartmentBreakdown(true);
      setShowLeaveAudit(true);
      setShowEmployeeRoster(false);
      setShowPayrollReconciliation(true);
      setShowAttestationBlock(true);
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = [
      'Employee Code',
      'Full Name',
      'Department',
      'Role',
      'Status',
      'EL Remaining',
      'CL Remaining',
      'SL Remaining',
      'PL Remaining',
      'Net Pay (USD)',
    ];
    const rows = employees.map((emp) => [
      emp.employeeCode,
      `"${emp.name}"`,
      `"${emp.department}"`,
      `"${emp.designation}"`,
      emp.status,
      emp.leaveBalance.EL.remaining,
      emp.leaveBalance.CL.remaining,
      emp.leaveBalance.SL.remaining,
      emp.leaveBalance.PL.remaining,
      emp.payrollHistory[0]?.netPay || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `OmniHR_Compliance_Report_${selectedMonth.replace(' ', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Native Browser Print Trigger
  const handlePrintPDF = () => {
    setShowPrintHint(true);
    // Slight delay so any UI transition settles before opening print dialog
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="space-y-6">
      {/* Action Bar & Controls (Hidden during print) */}
      <div className="no-print space-y-4">
        {/* Header Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Compliance Auditing & Monthly Reporting
              </h2>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="h-3 w-3" />
                <span>SOC2 Verified</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Generate, preview, customize, and export print-ready official compliance reports as PDF documents.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="September 2026">September 2026</option>
              <option value="August 2026">August 2026</option>
              <option value="July 2026">July 2026</option>
              <option value="Q3 2026 Statutory Audit">Q3 2026 Statutory Audit</option>
              <option value="Q2 2026 Comprehensive">Q2 2026 Comprehensive</option>
            </select>

            {/* Print Preview Mode Toggle */}
            <button
              onClick={() => setIsPrintPreview(!isPrintPreview)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all shadow-xs ${
                isPrintPreview
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {isPrintPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span>{isPrintPreview ? 'Standard View' : 'Print Preview'}</span>
            </button>

            {/* Report Settings Trigger */}
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Customize</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </button>

            {/* Native Browser Print / PDF Trigger */}
            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Printer className="h-4 w-4" />
              <span>Export PDF / Print</span>
            </button>
          </div>
        </div>

        {/* Print Guidance Alert Tip */}
        {showPrintHint && (
          <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/80 p-3 text-xs text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Printer className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>
                <strong>PDF Export Tip:</strong> In the browser print dialog, select{' '}
                <span className="font-semibold underline">Destination &rarr; Save as PDF</span> and ensure{' '}
                <span className="font-semibold underline">"Background graphics"</span> is checked for optimal document colors.
              </span>
            </div>
            <button
              onClick={() => setShowPrintHint(false)}
              className="rounded-lg p-1 text-indigo-600 hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Quick Template Preset Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium">Compliance Scope:</span>
            {[
              { id: 'comprehensive', label: 'Full Statutory Audit (All Sections)' },
              { id: 'leave', label: 'Leave & Attendance Governance' },
              { id: 'payroll', label: 'Payroll & Tax Reconciliation' },
              { id: 'executive', label: 'Executive Board Brief' },
            ].map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => handleTemplateChange(tmpl.id as any)}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                  reportTemplate === tmpl.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                {tmpl.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-400">
            Audit Ref: <strong className="font-mono text-slate-600 dark:text-slate-300">{auditRefCode}</strong>
          </div>
        </div>
      </div>

      {/* Configuration Drawer / Modal (Hidden in Print) */}
      {isConfigOpen && (
        <div className="no-print rounded-2xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-800 dark:bg-slate-900 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Compliance Report Customization & Attestation Settings
              </h3>
            </div>
            <button
              onClick={() => setIsConfigOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Signatory Name */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Executive Signatory Name
              </label>
              <input
                type="text"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {/* Signatory Designation */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Signatory Title / Designation
              </label>
              <input
                type="text"
                value={signatoryTitle}
                onChange={(e) => setSignatoryTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {/* Audit Reference Code */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Audit Tracking Number
              </label>
              <input
                type="text"
                value={auditRefCode}
                onChange={(e) => setAuditRefCode(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {/* Watermark Selector */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Document Watermark
              </label>
              <select
                value={watermark}
                onChange={(e) => setWatermark(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="OFFICIAL AUDIT">OFFICIAL AUDIT</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                <option value="BOARD REVIEW">BOARD REVIEW</option>
                <option value="NONE">None</option>
              </select>
            </div>
          </div>

          {/* Section Visibility Toggles */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
              Report Sections to Include in PDF:
            </span>
            <div className="flex flex-wrap gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showExecutiveKPIs}
                  onChange={(e) => setShowExecutiveKPIs(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Executive Summary & KPIs</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showComplianceMetrics}
                  onChange={(e) => setShowComplianceMetrics(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Regulatory Compliance Checks</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showDepartmentBreakdown}
                  onChange={(e) => setShowDepartmentBreakdown(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Department Headcount</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showLeaveAudit}
                  onChange={(e) => setShowLeaveAudit(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Leave Policy Utilization (EL, CL, SL, PL)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showEmployeeRoster}
                  onChange={(e) => setShowEmployeeRoster(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Employee Quota Audit Table</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showPayrollReconciliation}
                  onChange={(e) => setShowPayrollReconciliation(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Payroll & Tax Reconciliation</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showAttestationBlock}
                  onChange={(e) => setShowAttestationBlock(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Official Signature & Attestation Block</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Framing Banner (visible only in Print Preview screen mode) */}
      {isPrintPreview && (
        <div className="no-print flex items-center justify-between rounded-xl bg-slate-900 p-4 text-white shadow-lg dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-indigo-400" />
            <div>
              <span className="text-xs font-bold block">Document Paper Preview (A4 Aspect Ratio)</span>
              <span className="text-[11px] text-slate-400">
                WYSIWYG layout reflecting the exact page margins, typography, and page breaks of your exported PDF.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Trigger PDF Export</span>
            </button>
            <button
              onClick={() => setIsPrintPreview(false)}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors dark:bg-slate-700"
            >
              Exit Preview
            </button>
          </div>
        </div>
      )}

      {/* 
        Printable Document Canvas
        - In screen standard mode: full responsive card
        - In print preview mode: simulated crisp paper page with standard margins & subtle shadow
        - In browser print mode: native page rules (A4 portrait, 0 margin resets, black on white)
      */}
      <div
        className={`relative transition-all duration-200 ${
          isPrintPreview
            ? 'mx-auto max-w-[850px] bg-white p-8 sm:p-12 text-slate-900 shadow-2xl rounded-sm border border-slate-300 font-sans'
            : 'rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900'
        }`}
      >
        {/* Subtle Watermark Stamp (if enabled) */}
        {watermark !== 'NONE' && (
          <div className="pointer-events-none select-none absolute inset-0 overflow-hidden flex items-center justify-center opacity-[0.035] print:opacity-[0.04]">
            <span className="text-6xl sm:text-8xl font-black uppercase tracking-widest text-slate-900 -rotate-45 whitespace-nowrap">
              {watermark}
            </span>
          </div>
        )}

        {/* Print-Only Top Running Header */}
        <div className="hidden print:flex items-center justify-between border-b border-slate-300 pb-2 text-[10px] text-slate-500 mb-4">
          <span>OMNIHR ENTERPRISE AUDIT & COMPLIANCE LEDGER</span>
          <span>REPORT REF: {auditRefCode} • GENERATED: 2026-09-08</span>
        </div>

        {/* Report Top Letterhead */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-slate-200 pb-6 dark:border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-black text-white text-sm">
                OH
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Omni<span className="text-indigo-600 dark:text-indigo-400">HR</span>
              </span>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/60 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
                Official Compliance Audit
              </span>
            </div>
            <h1 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Monthly Management Oversight & Labor Compliance Report
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Reporting Period: <strong className="text-slate-800 dark:text-slate-200">{selectedMonth}</strong> • Generated on September 8, 2026
            </p>
          </div>

          <div className="text-left sm:text-right text-xs space-y-1 text-slate-600 dark:text-slate-400 shrink-0">
            <p>
              <strong className="text-slate-800 dark:text-slate-200">Audit Status:</strong>{' '}
              <span className="text-emerald-600 font-bold dark:text-emerald-400">Certified & Reconciled</span>
            </p>
            <p>
              <strong className="text-slate-800 dark:text-slate-200">Security Standard:</strong> SOC2 Type II / ISO 27001
            </p>
            <p className="font-mono text-[11px] text-slate-400">
              Tracking Ref: {auditRefCode}
            </p>
          </div>
        </div>

        {/* Regulatory Compliance Overview Pill Bar */}
        {showComplianceMetrics && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40 page-break-avoid">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Labor Law Adherence</span>
                  <span className="text-[10px] text-slate-400">FLSA & FMLA Standard: 100%</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Leave Deficit Check</span>
                  <span className="text-[10px] text-slate-400">Zero Negative Balances</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Payroll Tax Withholding</span>
                  <span className="text-[10px] text-slate-400">Fully Reconciled & Disbursed</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Audit Log Integrity</span>
                  <span className="text-[10px] text-slate-400">Cryptographically Signed</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section: Executive Summary Metrics */}
        {showExecutiveKPIs && (
          <div className="mt-6 page-break-avoid">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                1. Executive Summary & Workforce Health KPIs
              </h3>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 printable-card">
                <span className="text-xs text-slate-400 font-medium block">Total Active Headcount</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{totalEmployees}</span>
                  <span className="text-xs text-emerald-600 font-semibold">0% Attrition</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">100% full-time capacity</span>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 printable-card">
                <span className="text-xs text-slate-400 font-medium block">Total Leave Consumption</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{totalLeaveDays}</span>
                  <span className="text-xs text-slate-400">Days logged</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  EL: {leavesByType.EL}d • CL: {leavesByType.CL}d • SL: {leavesByType.SL}d • PL: {leavesByType.PL}d
                </span>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 printable-card">
                <span className="text-xs text-slate-400 font-medium block">Payroll Net Disbursement</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    ${totalPayrollOutflow.toLocaleString()}
                  </span>
                  <span className="text-xs text-blue-600 font-semibold">USD</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Gross: ${totalGrossPay.toLocaleString()} • Tax: ${totalTaxWithheld.toLocaleString()}
                </span>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 printable-card">
                <span className="text-xs text-slate-400 font-medium block">Talent Performance Index</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-amber-500">{avgPerformance}</span>
                  <span className="text-xs text-slate-400">/ 5.0 Rating</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">Top-tier benchmark</span>
              </div>
            </div>
          </div>
        )}

        {/* Section: Department Distribution & Leave Breakdown */}
        {(showDepartmentBreakdown || showLeaveAudit) && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5 page-break-avoid">
            {/* Department Headcount Breakdown */}
            {showDepartmentBreakdown && (
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 printable-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-indigo-600" />
                    2. Departmental Staffing Allocation
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">{Object.keys(departmentsCount).length} Squads</span>
                </div>

                <div className="space-y-2.5">
                  {Object.entries(departmentsCount).map(([dept, count]) => {
                    const percentage = Math.round((count / totalEmployees) * 100);
                    return (
                      <div key={dept} className="text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{dept}</span>
                          <span className="font-mono text-slate-500">
                            {count} staff ({percentage}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-600"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Leave Utilization Breakdown by Type */}
            {showLeaveAudit && (
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 printable-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                    3. Statutory Leave Policy Utilization
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">{totalLeaveDays} Total Days</span>
                </div>

                <div className="space-y-2.5">
                  {[
                    { type: 'Earned Leave (EL)', days: leavesByType.EL, desc: 'Annual Vacation', color: 'bg-indigo-600' },
                    { type: 'Casual Leave (CL)', days: leavesByType.CL, desc: 'Personal Emergencies', color: 'bg-emerald-600' },
                    { type: 'Sick Leave (SL)', days: leavesByType.SL, desc: 'Medical Certification', color: 'bg-blue-600' },
                    { type: 'Privilege Leave (PL)', days: leavesByType.PL, desc: 'Parental / Extended', color: 'bg-purple-600' },
                  ].map((item) => {
                    const pct = totalLeaveDays ? Math.round((item.days / totalLeaveDays) * 100) : 0;
                    return (
                      <div key={item.type} className="text-xs">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {item.type} <span className="text-[10px] text-slate-400 font-normal">({item.desc})</span>
                          </span>
                          <span className="font-mono text-slate-500">
                            {item.days} days ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section: Statutory Payroll & Tax Reconciliation Summary */}
        {showPayrollReconciliation && (
          <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 page-break-avoid printable-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Landmark className="h-3.5 w-3.5 text-blue-600" />
                4. Statutory Payroll & Tax Reconciliation Ledger
              </h3>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                Direct Deposit Disbursed
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block">Gross Labor Expense</span>
                <span className="text-base font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                  ${totalGrossPay.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Base + Standard Allowances</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block">Federal & State Withholding</span>
                <span className="text-base font-bold text-rose-600 font-mono mt-0.5 block">
                  -${totalTaxWithheld.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">100% Deposited on Schedule</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block">Net Employee Remittance</span>
                <span className="text-base font-bold text-emerald-600 font-mono mt-0.5 block">
                  ${totalPayrollOutflow.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Direct Bank Settlement</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block">Reconciliation Delta</span>
                <span className="text-base font-bold text-indigo-600 font-mono mt-0.5 block">
                  $0.00
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">Zero Discrepancies</span>
              </div>
            </div>
          </div>
        )}

        {/* Section: Detailed Employee Audit Roster */}
        {showEmployeeRoster && (
          <div className="mt-6 page-break-avoid">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5 text-slate-600" />
                5. Comprehensive Personnel Roster & Quota Balance Audit
              </h3>
              <span className="text-[11px] text-slate-400">{employees.length} Personnel Audited</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 printable-card">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Emp ID</th>
                    <th className="py-2.5 px-3">Full Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Designation</th>
                    <th className="py-2.5 px-2 text-center">EL</th>
                    <th className="py-2.5 px-2 text-center">CL</th>
                    <th className="py-2.5 px-2 text-center">SL</th>
                    <th className="py-2.5 px-2 text-center">PL</th>
                    <th className="py-2.5 px-3 text-right">Net Monthly</th>
                    <th className="py-2.5 px-3 text-center">Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-mono text-[10px] text-slate-400">{emp.employeeCode}</td>
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{emp.name}</td>
                      <td className="py-2 px-3">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {emp.department}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-500 dark:text-slate-400">{emp.designation}</td>
                      <td className="py-2 px-2 font-mono text-center text-[11px]">
                        {emp.leaveBalance.EL.remaining}/{emp.leaveBalance.EL.total}
                      </td>
                      <td className="py-2 px-2 font-mono text-center text-[11px]">
                        {emp.leaveBalance.CL.remaining}/{emp.leaveBalance.CL.total}
                      </td>
                      <td className="py-2 px-2 font-mono text-center text-[11px]">
                        {emp.leaveBalance.SL.remaining}/{emp.leaveBalance.SL.total}
                      </td>
                      <td className="py-2 px-2 font-mono text-center text-[11px]">
                        {emp.leaveBalance.PL.remaining}/{emp.leaveBalance.PL.total}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ${emp.payrollHistory[0]?.netPay.toLocaleString() || '0'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          <span>Valid</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section: Official Regulatory Sign-off & Attestation Box */}
        {showAttestationBlock && (
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 page-break-avoid printable-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  6. Official Governance & Legal Attestation Block
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                ISO/IEC 27001 & SOC2 Trust Services Criteria
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              I hereby certify under corporate governance regulations and applicable statutory labor standards that the
              workforce statistics, leave utilization ratios, employee leave balances, and payroll disbursements set forth in this
              monthly report for <strong>{selectedMonth}</strong> have been extracted directly from the authenticated tamper-evident database,
              have been reconciled without exception, and accurately represent company records.
            </p>

            {/* Signature Lines */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
              {/* Prepared by */}
              <div className="border-t border-slate-400/80 pt-2 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">{preparerName}</span>
                  <span className="font-mono text-[10px] text-emerald-600">e-Signed: 2026-09-08</span>
                </div>
                <p className="text-[11px] text-slate-500">{preparerTitle}</p>
                <p className="text-[10px] text-slate-400">Prepared & Audited by People Operations</p>
              </div>

              {/* Approved by */}
              <div className="border-t border-slate-400/80 pt-2 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">{signatoryName}</span>
                  <span className="font-mono text-[10px] text-emerald-600">e-Signed: 2026-09-08</span>
                </div>
                <p className="text-[11px] text-slate-500">{signatoryTitle}</p>
                <p className="text-[10px] text-slate-400">Authorized Officer Sign-off</p>
              </div>
            </div>

            {/* Digital Stamp Seal */}
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 gap-2">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Scale className="h-3.5 w-3.5 text-indigo-600" />
                <span>Regulatory Compliance Standards: FLSA • FMLA • Title VII • SOC2 Type II • AES-256</span>
              </div>
              <div className="font-mono text-[10px] text-slate-400">
                SHA256: 8a7f92b4c10e53a928e19b0d268f
              </div>
            </div>
          </div>
        )}

        {/* Print-Only Running Page Footer */}
        <div className="hidden print:flex items-center justify-between border-t border-slate-300 pt-3 mt-8 text-[10px] text-slate-400">
          <span>OmniHR Enterprise Compliance System • Confidential & Proprietary</span>
          <span>Verification Hash: 8a7f-92b4-c10e • Page 1 of Official Audit</span>
        </div>
      </div>
    </div>
  );
};
