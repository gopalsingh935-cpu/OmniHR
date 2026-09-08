import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Users,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  FileSpreadsheet,
  Download,
  Check,
  Zap,
  Clock,
  Briefcase,
  HelpCircle,
  BarChart3,
  HardDrive,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storageService';
import {
  predictiveAnalyticsService,
  ForecastRequestOptions,
} from '../services/predictiveAnalyticsService';
import {
  StaffingForecastResult,
  DepartmentForecast,
  CriticalRoleVulnerability,
  ActionableMitigation,
} from '../types';

interface PredictiveStaffingAnalyticsProps {
  onNavigateToLeaves?: () => void;
  onNavigateToDrive?: () => void;
}

export const PredictiveStaffingAnalytics: React.FC<PredictiveStaffingAnalyticsProps> = ({
  onNavigateToLeaves,
  onNavigateToDrive,
}) => {
  const { currentUser } = useAuth();

  // State controls
  const [horizonDays, setHorizonDays] = useState<number>(30);
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [forecast, setForecast] = useState<StaffingForecastResult | null>(null);
  const [appliedMitigations, setAppliedMitigations] = useState<string[]>([]);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // What-if scenario controls
  const [isSimulationOpen, setIsSimulationOpen] = useState<boolean>(false);
  const [extraSickLeave, setExtraSickLeave] = useState<boolean>(false);
  const [simulateLeadAbsence, setSimulateLeadAbsence] = useState<boolean>(false);
  const [minimumFloor, setMinimumFloor] = useState<number>(70);

  // Available departments from current employees
  const employees = storageService.getEmployees();
  const allDepartments = ['All', ...Array.from(new Set(employees.map((e) => e.department)))];

  // Load initial forecast on mount
  useEffect(() => {
    const cached = predictiveAnalyticsService.getCachedForecast();
    if (cached) {
      setForecast(cached);
    } else {
      handleRunForecast();
    }
  }, []);

  const handleRunForecast = async (customOptions?: Partial<ForecastRequestOptions>) => {
    setIsLoading(true);
    try {
      const options: ForecastRequestOptions = {
        lookaheadDays: customOptions?.lookaheadDays ?? horizonDays,
        departmentFilter: customOptions?.departmentFilter ?? departmentFilter,
        simulationModifiers: {
          extraSickLeaveProbability: extraSickLeave,
          criticalRoleAbsence: simulateLeadAbsence ? ['emp-2', 'emp-4'] : [],
        },
        currentUser: currentUser ? {
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
        } : undefined,
      };

      const res = await predictiveAnalyticsService.runStaffingForecast(options);
      setForecast(res);
    } catch (err) {
      console.error('Failed to run forecast', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyMitigation = (mitigation: ActionableMitigation) => {
    if (!currentUser) return;
    if (appliedMitigations.includes(mitigation.title)) return;

    predictiveAnalyticsService.recordMitigationAction(
      mitigation.title,
      mitigation.department,
      {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      }
    );

    setAppliedMitigations((prev) => [...prev, mitigation.title]);
  };

  const handleExportToGoogleDrive = () => {
    if (!forecast) return;

    // Format comprehensive report document
    const reportTitle = `Staffing-Shortage-Forecast-${forecast.analysisDate}-${forecast.forecastHorizonDays}d.json`;
    const reportContent = JSON.stringify(forecast, null, 2);

    try {
      // Store in Google Drive sync queue or download
      const blob = new Blob([reportContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = reportTitle;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (currentUser) {
        storageService.logAudit({
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          actionType: 'DRIVE_SYNC',
          description: `Exported AI Predictive Staffing Shortage Forecast report (${forecast.forecastHorizonDays}-day horizon) for Google Drive sync.`,
        });
      }

      setExportNotice('Forecast report downloaded and staged for Google Drive synchronization.');
      setTimeout(() => setExportNotice(null), 4000);
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'bg-rose-500/10 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60';
      case 'High':
        return 'bg-amber-500/10 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60';
      case 'Moderate':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-900/60';
      default:
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Control Deck */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Predictive Staffing Analytics
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                    <Zap className="h-3 w-3" />
                    {forecast?.aiGenerated ? 'Gemini 3.8 Flash' : 'Workforce Algorithmic Engine'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Forecasting departmental capacity bottlenecks, concurrent leave overlaps, and single points of failure.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsSimulationOpen(!isSimulationOpen)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                isSimulationOpen
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500/50 dark:bg-indigo-950/40 dark:text-indigo-300'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>What-If Simulator</span>
            </button>

            <button
              onClick={handleExportToGoogleDrive}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <HardDrive className="h-3.5 w-3.5 text-indigo-500" />
              <span>Export Report</span>
            </button>

            <button
              onClick={() => handleRunForecast()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Analyzing...' : 'Run Forecast'}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Forecast Horizon:</span>
            {[14, 30, 60, 90].map((days) => (
              <button
                key={days}
                onClick={() => {
                  setHorizonDays(days);
                  handleRunForecast({ lookaheadDays: days });
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  horizonDays === days
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Filter Unit:</span>
            <select
              value={departmentFilter}
              onChange={(e) => {
                const val = e.target.value;
                setDepartmentFilter(val);
                handleRunForecast({ departmentFilter: val });
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {allDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === 'All' ? 'All Departments' : dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {exportNotice && (
          <div className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{exportNotice}</span>
          </div>
        )}
      </div>

      {/* What-If Scenario Simulator Card */}
      {isSimulationOpen && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 dark:border-indigo-900/60 dark:bg-indigo-950/20 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Workforce Stress-Test & Scenario Simulation
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">Recalculates risk impact with hypothetical variables</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 cursor-pointer dark:border-slate-800 dark:bg-slate-900 hover:border-indigo-300 transition-colors">
              <input
                type="checkbox"
                checked={extraSickLeave}
                onChange={(e) => setExtraSickLeave(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                  Simulate Seasonal Viral Wave
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Adds +1 concurrent unplanned sick leave per team to test shock resilience.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 cursor-pointer dark:border-slate-800 dark:bg-slate-900 hover:border-indigo-300 transition-colors">
              <input
                type="checkbox"
                checked={simulateLeadAbsence}
                onChange={(e) => setSimulateLeadAbsence(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                  Simulate Lead Absence (Director & Lead)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tests operational continuity if engineering leadership is simultaneously unavailable.
                </span>
              </div>
            </label>

            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-white mb-1.5">
                <span>Minimum Staffing Floor SLA</span>
                <span className="text-indigo-600 dark:text-indigo-400">{minimumFloor}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                step="5"
                value={minimumFloor}
                onChange={(e) => setMinimumFloor(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-indigo-600"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Threshold below which high-severity warnings trigger.
              </span>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => handleRunForecast()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Apply Simulation Parameters</span>
            </button>
          </div>
        </div>
      )}

      {/* Executive Key Risk Cards Grid */}
      {forecast && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Overall Risk Score */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Overall Risk Index</span>
              <AlertTriangle className={`h-4 w-4 ${forecast.overallRiskScore > 50 ? 'text-rose-500' : 'text-emerald-500'}`} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {forecast.overallRiskScore}/100
              </span>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${getRiskBadgeColor(forecast.overallRiskLevel)}`}>
                {forecast.overallRiskLevel} Risk
              </span>
            </div>
            <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  forecast.overallRiskScore > 65
                    ? 'bg-rose-500'
                    : forecast.overallRiskScore > 40
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${forecast.overallRiskScore}%` }}
              />
            </div>
          </div>

          {/* Average Staffed Capacity */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Average Capacity Rate</span>
              <Users className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {Math.round(
                  forecast.departmentForecasts.reduce((a, b) => a + b.avgCapacityPercentage, 0) /
                    (forecast.departmentForecasts.length || 1)
                )}%
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Over {forecast.forecastHorizonDays} days</span>
            </div>
            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Minimum capacity drops to{' '}
              {Math.min(...forecast.departmentForecasts.map((d) => d.minStaffedHeadcount))} staff during peaks.
            </p>
          </div>

          {/* Vulnerable Roles Count */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Critical Role Vulnerabilities</span>
              <Briefcase className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {forecast.criticalRoleVulnerabilities.length}
              </span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Single Points of Failure</span>
            </div>
            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {forecast.criticalRoleVulnerabilities.length > 0
                ? `${forecast.criticalRoleVulnerabilities[0].role} missing coverage`
                : 'All key roles have coverage'}
            </p>
          </div>

          {/* Actionable Mitigations */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Enacted Mitigations</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {appliedMitigations.length}/{forecast.actionableMitigations.length}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Protections Active</span>
            </div>
            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {forecast.actionableMitigations.length - appliedMitigations.length} actionable measures pending
            </p>
          </div>
        </div>
      )}

      {/* AI Executive Summary Card */}
      {forecast && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Executive AI Staffing Diagnostic
            </h3>
            <span className="text-[11px] text-slate-400">
              Analyzed on {forecast.analysisDate}
            </span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {forecast.summary}
          </p>

          {/* Historical Insights bullets */}
          {forecast.historicalPatternInsights && forecast.historicalPatternInsights.length > 0 && (
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Historical Trend Corroboration & Pattern Recognition:
              </span>
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                {forecast.historicalPatternInsights.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-indigo-500 font-bold">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Departmental Forecast & Capacity Heatmap */}
      {forecast && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Departmental Capacity Forecast & Bottleneck Windows
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Staff availability projection and detected concurrent leave overlap windows.
              </p>
            </div>
            {onNavigateToLeaves && (
              <button
                onClick={onNavigateToLeaves}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                <span>View All Leaves</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-4">
            {forecast.departmentForecasts.map((dept) => {
              const hasHighRisk = dept.riskLevel === 'Critical' || dept.riskLevel === 'High';

              return (
                <div
                  key={dept.department}
                  className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 dark:bg-slate-800/30 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {dept.department}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${getRiskBadgeColor(
                            dept.riskLevel
                          )}`}
                        >
                          {dept.riskLevel} Risk ({dept.riskScore}/100)
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>Total Team: {dept.totalHeadcount}</span>
                        <span>•</span>
                        <span>
                          Min Available: <strong className="text-slate-800 dark:text-slate-200">{dept.minStaffedHeadcount}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Avg Capacity: <strong className="text-slate-800 dark:text-slate-200">{dept.avgCapacityPercentage}%</strong>
                        </span>
                      </div>
                    </div>

                    {/* Quick Capacity Bar */}
                    <div className="w-full sm:w-48">
                      <div className="flex justify-between text-[11px] mb-1 font-medium">
                        <span className="text-slate-500">Peak Capacity</span>
                        <span className={dept.avgCapacityPercentage < 65 ? 'text-rose-600 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                          {dept.avgCapacityPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            dept.avgCapacityPercentage < 50
                              ? 'bg-rose-500'
                              : dept.avgCapacityPercentage < 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${dept.avgCapacityPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Daily Capacity Matrix Track if present */}
                  {dept.dailyCapacities && dept.dailyCapacities.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>Daily Capacity Timeline</span>
                        <span>Green: &ge;80% | Amber: 60-79% | Red: &lt;60%</span>
                      </div>
                      <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-30 gap-1">
                        {dept.dailyCapacities.slice(0, 30).map((day, idx) => {
                          const isRed = day.percent < 60;
                          const isYellow = day.percent >= 60 && day.percent < 80;
                          const dateObj = new Date(day.date);
                          const dateLabel = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

                          return (
                            <div
                              key={idx}
                              title={`${day.date}: ${day.percent}% capacity (${day.onLeave} on leave)`}
                              className={`h-7 rounded-sm flex flex-col items-center justify-center text-[9px] font-mono font-medium transition-all ${
                                isRed
                                  ? 'bg-rose-500 text-white'
                                  : isYellow
                                  ? 'bg-amber-400 text-amber-950'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              }`}
                            >
                              <span>{dateLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* High Risk Periods Callout */}
                  {dept.highRiskPeriods && dept.highRiskPeriods.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {dept.highRiskPeriods.map((period, pIdx) => (
                        <div
                          key={pIdx}
                          className="rounded-lg bg-rose-50/70 p-2.5 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                        >
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-rose-900 dark:text-rose-200">
                                Conflict Window ({period.startDate} to {period.endDate}):
                              </span>{' '}
                              <span className="text-rose-800 dark:text-rose-300">{period.reason}</span>
                            </div>
                          </div>
                          {period.missingRoles && period.missingRoles.length > 0 && (
                            <span className="text-[11px] text-rose-700 dark:text-rose-400 font-medium shrink-0">
                              Absent: {period.missingRoles.join(', ')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recommendations */}
                  {dept.recommendations && dept.recommendations.length > 0 && (
                    <div className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 shrink-0">Action:</span>
                      <span>{dept.recommendations.join(' ')}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Critical Role Vulnerabilities (Single Points of Failure) */}
      {forecast && forecast.criticalRoleVulnerabilities && forecast.criticalRoleVulnerabilities.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="h-4 w-4 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Critical Role Vulnerabilities (Single Points of Failure)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Identified sole custodians or department heads scheduled on leave without verified backup delegations.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {forecast.criticalRoleVulnerabilities.map((vuln, vIdx) => (
              <div
                key={vIdx}
                className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 dark:border-amber-900/50 dark:bg-amber-950/20 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {vuln.employeeName}
                    </span>
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                      {vuln.vulnerabilityLevel} Vulnerability
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    {vuln.role} • {vuln.department}
                  </div>
                  <p className="mt-2 text-xs text-slate-700 dark:text-slate-300">
                    {vuln.explanation}
                  </p>
                </div>

                <div className="mt-3 rounded-lg border border-amber-200/60 bg-white/80 p-2.5 text-[11px] text-slate-700 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                  <strong className="text-amber-800 dark:text-amber-400">Contingency Recommendation:</strong>{' '}
                  {vuln.contingencyPlan}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actionable AI Mitigations Deck */}
      {forecast && forecast.actionableMitigations && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Actionable AI Mitigation Playbook
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Executable steps to prevent operational disruptions and maintain SOC2 service level agreements.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {appliedMitigations.length} of {forecast.actionableMitigations.length} enacted
            </span>
          </div>

          <div className="space-y-3">
            {forecast.actionableMitigations.map((mitigation, mIdx) => {
              const isApplied = appliedMitigations.includes(mitigation.title);

              return (
                <div
                  key={mIdx}
                  className={`rounded-xl border p-4 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                    isApplied
                      ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          mitigation.priority === 'Immediate'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : mitigation.priority === 'High'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {mitigation.priority} Priority
                      </span>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {mitigation.title}
                      </span>
                      <span className="text-xs text-slate-400">({mitigation.department})</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {mitigation.action}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <span className="text-[10px] text-slate-400 block">Risk Reduction</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        +{mitigation.impactScore}% resilience
                      </span>
                    </div>

                    <button
                      onClick={() => handleApplyMitigation(mitigation)}
                      disabled={isApplied}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                        isApplied
                          ? 'bg-emerald-600 text-white cursor-default'
                          : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Enacted</span>
                        </>
                      ) : (
                        <span>Enact Plan</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
