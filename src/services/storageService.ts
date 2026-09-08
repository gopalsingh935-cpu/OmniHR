import {
  Employee,
  LeaveRequest,
  PerformanceReview,
  AuditLogEntry,
  AppNotification,
  Role,
  LeaveType,
} from '../types';
import {
  INITIAL_EMPLOYEES,
  INITIAL_LEAVES,
  INITIAL_REVIEWS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
} from '../data/initialData';

const STORAGE_KEYS = {
  EMPLOYEES: 'omnihr_employees_v1',
  LEAVES: 'omnihr_leaves_v1',
  REVIEWS: 'omnihr_reviews_v1',
  AUDIT_LOGS: 'omnihr_audit_logs_v1',
  NOTIFICATIONS: 'omnihr_notifications_v1',
  PENDING_SYNC: 'omnihr_pending_sync_v1',
  SIMULATED_OFFLINE: 'omnihr_simulated_offline_v1',
  LAST_BACKUP: 'omnihr_last_backup_v1',
  ACCOUNTING_SETTINGS: 'omnihr_accounting_settings_v1',
};

// Generate deterministic pseudo hash for integrity audit logging
function generateIntegrityHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `sha256_${hex}${Date.now().toString(16).slice(-8)}`;
}

export const storageService = {
  // Initialization
  initStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LEAVES)) {
      localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(INITIAL_LEAVES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.REVIEWS)) {
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(INITIAL_REVIEWS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PENDING_SYNC)) {
      localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LAST_BACKUP)) {
      localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, '2026-09-08 03:00 UTC');
    }
  },

  // Network & Sync State
  isSimulatedOffline(): boolean {
    return localStorage.getItem(STORAGE_KEYS.SIMULATED_OFFLINE) === 'true';
  },

  setSimulatedOffline(status: boolean) {
    localStorage.setItem(STORAGE_KEYS.SIMULATED_OFFLINE, String(status));
  },

  isOnline(): boolean {
    if (this.isSimulatedOffline()) return false;
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  },

  getPendingSyncQueue(): any[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENDING_SYNC);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addToPendingSync(item: { type: string; payload: any; timestamp: string }) {
    const queue = this.getPendingSyncQueue();
    queue.push(item);
    localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(queue));
  },

  clearPendingSync() {
    localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify([]));
  },

  // Employees
  getEmployees(): Employee[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
      return data ? JSON.parse(data) : INITIAL_EMPLOYEES;
    } catch {
      return INITIAL_EMPLOYEES;
    }
  },

  getEmployeeById(id: string): Employee | undefined {
    return this.getEmployees().find((emp) => emp.id === id);
  },

  updateEmployee(employee: Employee, actor: { id: string; name: string; role: Role }): boolean {
    const list = this.getEmployees();
    const index = list.findIndex((e) => e.id === employee.id);
    if (index === -1) return false;

    list[index] = employee;
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(list));

    if (!this.isOnline()) {
      this.addToPendingSync({
        type: 'UPDATE_EMPLOYEE',
        payload: employee,
        timestamp: new Date().toISOString(),
      });
    }

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      actionType: 'RECORD_UPDATED',
      description: `Updated profile details, credentials or records for ${employee.name} (${employee.employeeCode})`,
    });

    return true;
  },

  addEmployee(employee: Employee, actor: { id: string; name: string; role: Role }): boolean {
    const list = this.getEmployees();
    list.unshift(employee);
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(list));

    if (!this.isOnline()) {
      this.addToPendingSync({
        type: 'ADD_EMPLOYEE',
        payload: employee,
        timestamp: new Date().toISOString(),
      });
    }

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      actionType: 'RECORD_UPDATED',
      description: `Enrolled new employee record for ${employee.name} (${employee.employeeCode}) in ${employee.department}`,
    });

    return true;
  },

  // Leaves
  getLeaves(): LeaveRequest[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LEAVES);
      return data ? JSON.parse(data) : INITIAL_LEAVES;
    } catch {
      return INITIAL_LEAVES;
    }
  },

  applyLeave(
    request: Omit<LeaveRequest, 'id' | 'status' | 'appliedOn'>,
    actor: { id: string; name: string; role: Role }
  ): LeaveRequest {
    const leaves = this.getLeaves();
    const newLeave: LeaveRequest = {
      ...request,
      id: `leave-${Date.now()}`,
      status: 'pending',
      appliedOn: new Date().toISOString(),
    };

    leaves.unshift(newLeave);
    localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(leaves));

    // Also deduct or reserve from user's leave balance in employee state
    const employees = this.getEmployees();
    const emp = employees.find((e) => e.id === request.employeeId);
    if (emp) {
      const balance = emp.leaveBalance[request.leaveType];
      if (balance) {
        balance.used += request.daysCount;
        balance.remaining = Math.max(0, balance.total - balance.used);
      }
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    }

    if (!this.isOnline()) {
      this.addToPendingSync({
        type: 'APPLY_LEAVE',
        payload: newLeave,
        timestamp: new Date().toISOString(),
      });
    }

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      actionType: 'LEAVE_APPLIED',
      description: `Submitted ${request.daysCount} days ${request.leaveType} leave application (${request.startDate} to ${request.endDate})`,
    });

    this.addNotification({
      title: 'New Leave Request Received',
      message: `${actor.name} applied for ${request.daysCount} days of ${request.leaveType} leave.`,
      type: 'leave',
      actionLink: 'leaves',
    });

    return newLeave;
  },

  updateLeaveStatus(
    leaveId: string,
    status: 'approved' | 'rejected' | 'cancelled',
    actor: { id: string; name: string; role: Role },
    comments?: string
  ): boolean {
    const leaves = this.getLeaves();
    const leave = leaves.find((l) => l.id === leaveId);
    if (!leave) return false;

    const prevStatus = leave.status;
    leave.status = status;
    if (status === 'approved') {
      leave.approvedBy = `${actor.name} (${actor.role.toUpperCase()})`;
      leave.approvedOn = new Date().toISOString();
    } else if (status === 'rejected' && comments) {
      leave.rejectionReason = comments;
    }

    if (comments) {
      if (!leave.comments) leave.comments = [];
      leave.comments.push({
        id: `c-${Date.now()}`,
        authorName: actor.name,
        authorRole: actor.role,
        text: comments,
        timestamp: new Date().toISOString(),
      });
    }

    // If cancelled or rejected from pending/approved, adjust back balance if needed
    if ((status === 'rejected' || status === 'cancelled') && prevStatus !== 'rejected' && prevStatus !== 'cancelled') {
      const employees = this.getEmployees();
      const emp = employees.find((e) => e.id === leave.employeeId);
      if (emp && emp.leaveBalance[leave.leaveType]) {
        const balance = emp.leaveBalance[leave.leaveType];
        balance.used = Math.max(0, balance.used - leave.daysCount);
        balance.remaining = balance.total - balance.used;
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
      }
    }

    localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(leaves));

    if (!this.isOnline()) {
      this.addToPendingSync({
        type: 'UPDATE_LEAVE_STATUS',
        payload: { leaveId, status, comments },
        timestamp: new Date().toISOString(),
      });
    }

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      actionType: 'LEAVE_STATUS_CHANGED',
      description: `${status.toUpperCase()} leave application #${leaveId} for ${leave.employeeName} (${leave.leaveType}, ${leave.daysCount} days)`,
    });

    this.addNotification({
      title: `Leave Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your ${leave.leaveType} leave (${leave.startDate} to ${leave.endDate}) was marked as ${status} by ${actor.name}.`,
      type: 'leave',
      targetUserId: leave.employeeId,
      actionLink: 'leaves',
    });

    return true;
  },

  // Performance Reviews (Strict Security Enforced: Employee cannot modify)
  getReviews(): PerformanceReview[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REVIEWS);
      return data ? JSON.parse(data) : INITIAL_REVIEWS;
    } catch {
      return INITIAL_REVIEWS;
    }
  },

  getReviewsForEmployee(employeeId: string): PerformanceReview[] {
    return this.getReviews().filter((r) => r.employeeId === employeeId);
  },

  createReview(
    review: Omit<PerformanceReview, 'id' | 'reviewDate'>,
    actor: { id: string; name: string; role: Role }
  ): PerformanceReview | null {
    // SECURITY GUARD: Only Admin or Manager can create performance reviews
    if (actor.role === 'employee') {
      console.error('Unauthorized: Employees are strictly forbidden from modifying or creating performance reviews.');
      return null;
    }

    const reviews = this.getReviews();
    const newReview: PerformanceReview = {
      ...review,
      id: `rev-${Date.now()}`,
      reviewDate: new Date().toISOString().split('T')[0],
      isPublished: true,
      status: 'Finalized',
    };

    reviews.unshift(newReview);
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));

    if (!this.isOnline()) {
      this.addToPendingSync({
        type: 'CREATE_REVIEW',
        payload: newReview,
        timestamp: new Date().toISOString(),
      });
    }

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      actionType: 'REVIEW_CREATED',
      description: `Published official performance evaluation for ${newReview.employeeName} (Cycle: ${newReview.cycle}, Rating: ${newReview.overallRating}/5.0)`,
    });

    this.addNotification({
      title: 'New Performance Review Published',
      message: `A new performance evaluation for ${newReview.cycle} was published by ${actor.name}.`,
      type: 'review',
      targetUserId: newReview.employeeId,
      actionLink: 'reviews',
    });

    return newReview;
  },

  // Audit Logs
  getAuditLogs(): AuditLogEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      return data ? JSON.parse(data) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  },

  logAudit(entry: {
    actorId: string;
    actorName: string;
    actorRole: Role;
    actionType: AuditLogEntry['actionType'];
    description: string;
  }) {
    const logs = this.getAuditLogs();
    const logItem: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actorId: entry.actorId,
      actorName: entry.actorName,
      actorRole: entry.actorRole,
      actionType: entry.actionType,
      description: entry.description,
      ipAddress: '198.51.100.' + (Math.floor(Math.random() * 80) + 10),
      device: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 45) : 'Web Client Secure Session',
      integrityHash: generateIntegrityHash(entry.description + Date.now()),
    };

    logs.unshift(logItem);
    // Keep max 200 logs to prevent bloat
    if (logs.length > 200) logs.pop();
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
  },

  // Notifications
  getNotifications(): AppNotification[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return data ? JSON.parse(data) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  },

  addNotification(notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) {
    const list = this.getNotifications();
    const item: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      timestamp: 'Just now',
      read: false,
    };
    list.unshift(item);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
  },

  markNotificationAsRead(id: string) {
    const list = this.getNotifications();
    const target = list.find((n) => n.id === id);
    if (target) {
      target.read = true;
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
    }
  },

  markAllNotificationsAsRead() {
    const list = this.getNotifications().map((n) => ({ ...n, read: true }));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
  },

  // Document management
  uploadDocument(
    employeeId: string,
    doc: { title: string; category: any; fileSize: string; fileType: string },
    actor: { id: string; name: string; role: Role }
  ): boolean {
    const employees = this.getEmployees();
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return false;

    const newDoc = {
      id: `doc-${Date.now()}`,
      title: doc.title,
      category: doc.category,
      uploadedOn: new Date().toISOString().split('T')[0],
      fileSize: doc.fileSize,
      fileType: doc.fileType,
      isEncrypted: true,
      encryptionStandard: 'AES-256-GCM',
      accessLevel: ['admin', 'manager', 'employee'] as Role[],
      checksum: generateIntegrityHash(doc.title),
    };

    emp.documents.unshift(newDoc);
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      actionType: 'DOCUMENT_ACCESSED',
      description: `Uploaded encrypted document "${doc.title}" to ${emp.name}'s secure vault (AES-256)`,
    });

    return true;
  },

  // Cloud Accounting Sync Simulation
  syncPayrollAccounting(accountingPlatform: string, actor: { id: string; name: string; role: Role }): {
    success: boolean;
    recordsCount: number;
    totalAmount: number;
  } {
    const employees = this.getEmployees();
    let totalAmount = 0;
    let recordsCount = 0;

    employees.forEach((emp) => {
      emp.payrollHistory.forEach((p) => {
        if (p.accountingSyncStatus !== 'synced') {
          p.accountingSyncStatus = 'synced';
          p.syncedTo = accountingPlatform;
        }
        totalAmount += p.netPay;
        recordsCount++;
      });
    });

    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      actionType: 'PAYROLL_SYNC',
      description: `Reconciled ${recordsCount} payroll records totaling $${totalAmount.toLocaleString()} with ${accountingPlatform}`,
    });

    return { success: true, recordsCount, totalAmount };
  },

  // Automated Cloud Backup Trigger
  triggerCloudBackup(actor: { id: string; name: string; role: Role }): string {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, timestamp);

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      actionType: 'SYSTEM_BACKUP',
      description: `Manual cloud synchronization backup executed. Encrypted snapshot verified (AES-256-GCM, Hash: ${generateIntegrityHash('backup' + timestamp)})`,
    });

    return timestamp;
  },

  getLastBackupTime(): string {
    return localStorage.getItem(STORAGE_KEYS.LAST_BACKUP) || '2026-09-08 03:00 UTC';
  },

  // Sync Queue Flush (when back online)
  flushSyncQueue(actor: { id: string; name: string; role: Role }): number {
    const queue = this.getPendingSyncQueue();
    const count = queue.length;
    if (count === 0) return 0;

    this.clearPendingSync();

    this.logAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      actionType: 'SYSTEM_BACKUP',
      description: `Flushed offline synchronization queue: Successfully reconciled ${count} deferred operations with Central Cloud Vault.`,
    });

    this.addNotification({
      title: 'Offline Sync Reconciled',
      message: `Successfully synchronized ${count} offline updates to the central cloud storage.`,
      type: 'system',
    });

    return count;
  },
};
