export type Role = 'admin' | 'manager' | 'employee';

export type LeaveType = 'EL' | 'CL' | 'SL' | 'PL';
// EL: Earned Leave, CL: Casual Leave, SL: Sick Leave, PL: Privilege/Parental Leave

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveBalance {
  EL: { total: number; used: number; remaining: number };
  CL: { total: number; used: number; remaining: number };
  SL: { total: number; used: number; remaining: number };
  PL: { total: number; used: number; remaining: number };
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeeRole: string;
  department: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
  approvedBy?: string;
  approvedOn?: string;
  rejectionReason?: string;
  comments?: {
    id: string;
    authorName: string;
    authorRole: Role;
    text: string;
    timestamp: string;
  }[];
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: string;
  cycle: string; // e.g. 'Q2 2026', 'Annual 2025'
  reviewDate: string;
  overallRating: number; // 1 to 5
  ratingLabel: 'Exceptional' | 'Exceeds Expectations' | 'Meets Expectations' | 'Needs Improvement' | 'Unsatisfactory';
  metrics: {
    technicalSkills: number; // 1-5
    communication: number;
    teamwork: number;
    productivity: number;
    initiative: number;
  };
  achievements: string[];
  growthAreas: string[];
  reviewerFeedback: string;
  employeeNotes?: string;
  isPublished: boolean;
  status: 'Draft' | 'Finalized' | 'Acknowledged';
}

export interface EducationRecord {
  id: string;
  degree: string;
  institution: string;
  yearOfPassing: number;
  field: string;
  grade: string;
}

export interface PriorExperience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  highlights: string;
}

export interface Certification {
  id: string;
  title: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId: string;
  verificationUrl?: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  category: 'Contract' | 'NDA' | 'Tax' | 'ID Proof' | 'Certification' | 'Offer Letter';
  uploadedOn: string;
  fileSize: string;
  fileType: string;
  isEncrypted: boolean;
  encryptionStandard: string; // 'AES-256'
  accessLevel: Role[];
  checksum: string;
}

export interface PayrollRecord {
  id: string;
  month: string; // 'August 2026'
  payDate: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
  taxDeducted: number;
  currency: string;
  status: 'Processed' | 'Pending' | 'Synced';
  accountingSyncStatus: 'synced' | 'pending' | 'failed';
  syncedTo?: string; // e.g. 'QuickBooks Online' | 'Xero'
}

export interface Employee {
  id: string;
  employeeCode: string; // e.g., 'EMP-1042'
  name: string;
  email: string;
  personalEmail: string;
  phone: string;
  role: Role;
  designation: string;
  department: 'Engineering' | 'Product' | 'Human Resources' | 'Design' | 'Finance' | 'Marketing' | 'Operations';
  reportsTo?: string;
  managerName?: string;
  location: string;
  workMode: 'Remote' | 'Hybrid' | 'On-site';
  joiningDate: string;
  status: 'Active' | 'On Leave' | 'Probation';
  avatarUrl: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  leaveBalance: LeaveBalance;
  education: EducationRecord[];
  priorExperience: PriorExperience[];
  certifications: Certification[];
  documents: DocumentRecord[];
  payrollHistory: PayrollRecord[];
  bio?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  actionType: 'AUTH' | 'LEAVE_APPLIED' | 'LEAVE_STATUS_CHANGED' | 'REVIEW_CREATED' | 'RECORD_UPDATED' | 'DOCUMENT_ACCESSED' | 'PAYROLL_SYNC' | 'SYSTEM_BACKUP';
  description: string;
  ipAddress: string;
  device: string;
  integrityHash: string;
  action?: string;
  details?: string;
  target?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'leave' | 'review' | 'security' | 'system' | 'payroll';
  targetUserId?: string; // If specific to an employee, or broadcast
  actionLink?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncedAt: string;
  pendingItemsCount: number;
  isSyncing: boolean;
}
