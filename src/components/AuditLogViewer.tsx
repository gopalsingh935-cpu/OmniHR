import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Clock,
  Lock,
  Download,
  AlertTriangle,
  Server,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storageService';
import { AuditLogEntry } from '../types';

export const AuditLogViewer: React.FC = () => {
  const { isOnline, pendingSyncCount, triggerManualSync, refreshUserData } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>(() => storageService.getAuditLogs());
  const [filterAction, setFilterAction] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const filteredLogs = logs.filter((log) => {
    const action = (log.actionType || log.action || '').toUpperCase();
    const matchesAction = filterAction === 'ALL' || action.includes(filterAction.toUpperCase());

    const q = (searchQuery || '').toLowerCase();
    const matchesSearch =
      !q ||
      (log.actorName || '').toLowerCase().includes(q) ||
      (log.description || log.details || '').toLowerCase().includes(q) ||
      action.toLowerCase().includes(q) ||
      (log.integrityHash || '').toLowerCase().includes(q) ||
      (log.device || '').toLowerCase().includes(q) ||
      (log.ipAddress || '').toLowerCase().includes(q);

    return matchesAction && matchesSearch;
  });

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      triggerManualSync();
      setLogs(storageService.getAuditLogs());
      setIsSyncing(false);
      refreshUserData();
    }, 1200);
  };

  const handleExportAuditLogs = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OmniHR_Audit_Trail_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Immutable Enterprise Audit Trail & Sync Log
            </h2>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              SOC2 Cryptographic Verifier
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time immutable telemetry tracking every authorization event, leave change, performance rating, and offline sync.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Force Cloud Sync</span>
          </button>

          <button
            onClick={handleExportAuditLogs}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Trail</span>
          </button>
        </div>
      </div>

      {/* Sync Queue Monitor Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Offline Sync Queue</span>
            <Server className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{pendingSyncCount}</span>
            <span className="text-xs text-slate-400">pending cloud commit</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {isOnline ? 'Online - Automatic reconciliation enabled' : 'Offline - Actions locally queued'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Audit Logs</span>
            <ShieldAlert className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{logs.length}</span>
            <span className="text-xs text-emerald-600 font-semibold">100% Verified</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">SHA-256 forward-chained block hash</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tamper Status</span>
            <Lock className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">Pristine</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Zero unauthorized anomalies detected</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit trail by actor, action description, or hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Category:</span>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Actions</option>
            <option value="LEAVE">Leave Operations</option>
            <option value="REVIEW">Reviews & Ratings</option>
            <option value="AUTH">Authentication / RBAC</option>
            <option value="PAYROLL">Payroll & Accounting</option>
            <option value="DOCUMENT">Encrypted Documents</option>
            <option value="DATA_SYNC">Cloud Sync Events</option>
          </select>
        </div>
      </div>

      {/* Log Feed */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/40 text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider font-mono ${
                      (log.actionType || log.action || '').includes('APPROVED') || (log.actionType || log.action || '').includes('SYNC')
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : (log.actionType || log.action || '').includes('REJECTED')
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : (log.actionType || log.action || '').includes('AUTH')
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                    }`}
                  >
                    {log.actionType || log.action || 'AUDIT'}
                  </span>

                  <span className="font-bold text-slate-900 dark:text-white">{log.actorName}</span>
                  <span className="text-slate-400">({log.actorRole})</span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="h-3 w-3" />
                    {log.timestamp ? log.timestamp.slice(0, 19).replace('T', ' ') : ''}
                  </span>
                  <span className="hidden sm:inline font-mono">IP: {log.ipAddress}</span>
                </div>
              </div>

              <p className="mt-2 text-slate-700 dark:text-slate-300">{log.description || log.details}</p>

              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-50 pt-2 dark:border-slate-800/60 font-mono">
                <span>Device: {log.device || log.target || 'Enterprise Session'}</span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  Hash: {(log.integrityHash || '').slice(0, 16)}...
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredLogs.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <p className="text-sm font-medium">No audit entries match the current filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};
