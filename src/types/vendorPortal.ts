// src/types/vendorPortal.ts
// ============================================================================
// Joy People HR — Vendor Portal & HR Payroll Ecosystem Data Contracts
// Multi-Tenant, Compliance, Attendance Dual Ingestion & Daily OT Engine
// ============================================================================

export type DocumentLifecycleStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'UNDER_REVIEW' 
  | 'VERIFIED' 
  | 'REJECTED' 
  | 'EXPIRED';

export type CompliancePeriodType = 'MONTHLY' | 'HALF_YEARLY' | 'ANNUAL' | 'ONE_TIME';

export type VendorDocumentCategory =
  | 'COMPANY_REGISTRATION'
  | 'PAN'
  | 'GSTIN'
  | 'MSME_UDYAM'
  | 'EPFO'
  | 'ESIC'
  | 'CLRA'
  | 'BANK_DOCUMENT'
  | 'CLIENT_CONTRACT'
  | 'COMPLIANCE_CHALLAN'
  | 'OTHER_AUTHORIZED';

export type VendorDocumentStatus =
  | 'UPLOADED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'RESUBMISSION_REQUIRED'
  | 'EXPIRED'
  | 'ARCHIVED';

export type ComplianceDocumentCategory =
  | 'COMPANY_REGISTRATION'
  | 'STATUTORY_ESI_PF'
  | 'LABOUR_LICENSE'
  | 'MONTHLY_CHALLAN_STATEMENT'
  | 'RETURNS_AND_REPORTS'
  | 'PAYROLL_INVOICE'
  | 'LEAVE_WAGE_STATEMENT'
  | VendorDocumentCategory;

export interface VendorCompanyProfile {
  id: string;
  organizationId: string;
  vendorCode: string;
  legalName: string;
  tradeName?: string;
  pan: string;
  gstin: string;
  msmeNumber?: string;
  incorporationNumber?: string;
  companyType: 'PRIVATE_LIMITED' | 'PARTNERSHIP' | 'PROPRIETORSHIP' | 'LLP' | 'OTHER';
  esiRegistrationNumber?: string;
  pfRegistrationNumber?: string;
  sezLutcCopyNumber?: string;
  bankAccount: {
    accountNumber: string;
    bankName: string;
    ifscCode: string;
    branch: string;
    accountHolderName: string;
    isVerified: boolean;
    verifiedAt?: string;
  };
  authorizedContact: {
    fullName: string;
    email: string;
    phone: string;
    designation: string;
  };
  complianceContact: {
    fullName: string;
    email: string;
    phone: string;
  };
  status: 'ACTIVE' | 'ONBOARDING' | 'SUSPENDED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface ClientSiteContractMapping {
  id: string;
  vendorId: string;
  organizationId: string;
  companyId: string; // Client Company ID (e.g. comp-joy-che, comp-joy-cbe)
  companyName: string;
  siteName: string;
  contractCode: string;
  sowNumber?: string;
  masterPoNumber?: string;
  clraFormVNumber?: string;
  maxWorkforceCapacity: number;
  activeWorkforceCount: number;
  serviceChargePercentage: number;
  contractStartDate: string;
  contractEndDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
}

export interface VendorComplianceDocument {
  id: string;
  organizationId: string;
  vendorId: string;
  clientSiteContractId?: string;
  category: ComplianceDocumentCategory;
  documentType: string; // e.g., 'ESI_CHALLAN', 'PF_STATEMENT', 'LABOUR_LICENSE', 'INVOICE'
  reportingPeriod: string; // e.g., '2026-09' or '2026-FY'
  periodType: CompliancePeriodType;
  title: string;
  fileName: string;
  fileStoragePath: string;
  fileSizeBytes: number;
  mimeType: string;
  version: number;
  status: DocumentLifecycleStatus;
  uploadedBy: string;
  uploadedAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
  reviewerRemarks?: string;
  officialPortalUrl?: string; // Quick link to EPFO/ESIC/Labour portal
  externalReferenceNumber?: string; // TRRN for PF, Challan No for ESI
  dueDate?: string;
}

export interface VendorAttendanceRow {
  rowNumber: number;
  employeeCode: string;
  employeeName?: string;
  date: string; // YYYY-MM-DD
  shiftCode: string; // e.g. 'GENERAL', 'NIGHT', 'DAY_SHIFT'
  inTime: string; // HH:mm
  outTime: string; // HH:mm
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_DUTY' | 'WEEK_OFF';
  breakDurationMinutes: number;
  regularWorkingHours: number;
  rawOtHours: number;
  approvedOtHours: number;
  source: 'VENDOR_UPLOAD' | 'BIOMETRIC_PUNCH' | 'MANUAL_ENTRY';
  validationErrors?: string[];
}

export interface VendorAttendanceBatch {
  id: string;
  organizationId: string;
  vendorId: string;
  clientSiteContractId: string;
  batchName: string;
  periodMonth: string; // e.g., '2026-09'
  uploadedAt: string;
  uploadedBy: string;
  totalRecords: number;
  validRecords: number;
  errorRecords: number;
  status: 'STAGED' | 'VALIDATED' | 'APPROVED' | 'INGESTED' | 'REJECTED';
  records: VendorAttendanceRow[];
}

export interface DailyOvertimeRecord {
  id: string;
  organizationId: string;
  vendorId: string;
  clientSiteContractId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  date: string;
  shiftHours: number;
  actualWorkedHours: number;
  breakDurationMinutes: number;
  potentialOtHours: number;
  approvedOtHours: number;
  otHourlyRate: number;
  otPayableAmount: number;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED';
  approvedBy?: string;
  approvedAt?: string;
  remarks?: string;
}

export interface AttendanceMissException {
  id: string;
  organizationId: string;
  vendorId: string;
  clientSiteContractId: string;
  siteName: string;
  managerId: string;
  managerName: string;
  tlSupervisorId?: string;
  tlSupervisorName?: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  date: string;
  exceptionType: 'MISSING_IN_PUNCH' | 'MISSING_OUT_PUNCH' | 'ABSENT_WITHOUT_LEAVE' | 'LATE_ARRIVAL' | 'SHORT_HOURS';
  inTime?: string;
  outTime?: string;
  standardHours: number;
  actualHours: number;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'ESCALATED';
  escalationLevel: number; // 0: TL, 1: Manager, 2: HR Admin
  lastNotifiedAt?: string;
  resolutionRemarks?: string;
  resolvedBy?: string;
}

export interface VendorPayrollAdjustmentConfig {
  id: string;
  organizationId: string;
  vendorId: string;
  periodMonth: string;
  earnings: {
    attendanceBonusAmount: number;
    hundredPercentAttendanceBonusAmount: number;
    dayShiftAllowancePerDay: number;
    nightShiftAllowancePerDay: number;
    leaveWageAmount: number;
  };
  deductions: {
    canteenDeduction: number;
    teaSnacksDeduction: number;
    roomRentDeduction: number;
    mealDeduction: number;
    transportDeduction: number;
    shortHoursDeduction: number;
    insuranceDeduction: number;
  };
  recoveries: {
    physicalDamages: number;
    disciplinaryFines: number;
    assetLossRecovery: number;
    remarks?: string;
  };
}

// ----------------------------------------------------------------------------
// VENDOR ONBOARDING WORKFLOW TYPES
// ----------------------------------------------------------------------------

export type VendorOnboardingStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ACTION_REQUIRED'
  | 'APPROVED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REJECTED';

export type VendorCompanyStructure = 'PRIVATE_LIMITED' | 'PARTNERSHIP' | 'PROPRIETORSHIP' | 'LLP' | 'PUBLIC_LIMITED' | 'OTHER';

export interface VendorOnboardingStep1Company {
  legalName: string;
  tradeName?: string;
  vendorCode: string;
  companyStructure: VendorCompanyStructure;
  pan: string;
  gstin: string;
  msmeNumber?: string;
  registeredAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  authorizedContact: {
    fullName: string;
    email: string;
    phone: string;
    designation: string;
  };
}

export interface VendorOnboardingStep2Statutory {
  esiRegistrationNumber: string;
  pfRegistrationNumber: string;
  laborLicenseNumber?: string;
  migrantLabourLicenseNumber?: string;
  msmeRegistrationNumber?: string;
  professionalTaxNumber?: string;
  isoCertificationNumber?: string;
  sezLutcCopyNumber?: string;
  nonPanDeclaration?: boolean;
  nonTanDeclaration?: boolean;
  irnDeclaration?: boolean;
  conflictOfInterestDeclaration?: boolean;
  lutCopyNumber?: string;
  panDocStoragePath?: string;
  gstDocStoragePath?: string;
  esiDocStoragePath?: string;
  pfDocStoragePath?: string;
  laborDocStoragePath?: string;
  statutoryExpiryDates?: Record<string, string>;
  statutoryDocStoragePaths?: Record<string, string>;
}

export interface VendorOnboardingStep3Banking {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  cancelledChequeStoragePath?: string;
  authorizedContact?: {
    fullName: string;
    email: string;
    phone: string;
  };
  financeBillingContact?: {
    fullName: string;
    email: string;
    phone: string;
  };
  complianceContact: {
    fullName: string;
    email: string;
    phone: string;
  };
}

export interface VendorOnboardingStep4ClientAssignment {
  clientCompanyId: string;
  clientCompanyName: string;
  businessUnit?: string;
  siteName: string;
  serviceCategory?: string;
  contractCode: string;
  masterPoNumber?: string;
  clraFormVNumber?: string;
  maxWorkforceCapacity: number;
  serviceChargePercentage: number;
  contractStartDate: string;
  contractEndDate: string;
  rateCardReference?: string;
  billingConfiguration?: string;
  workforceAllocationRules?: string;
}

export interface VendorActivationAuditLog {
  action: string;
  performedBy: string;
  timestamp: string;
  details?: string;
}

export interface VendorAccountActivationDetails {
  invitationStatus:
    | 'DRAFT'
    | 'PENDING_REVIEW'
    | 'APPROVED'
    | 'INVITATION_PENDING'
    | 'INVITATION_SENT'
    | 'EMAIL_DELIVERY_FAILED'
    | 'ACTIVATION_PENDING'
    | 'ACTIVATED'
    | 'SUSPENDED'
    | 'DEACTIVATED';
  authorizedContactEmail: string;
  invitationToken?: string;
  invitationCreatedAt?: string;
  invitationSentAt?: string;
  invitationExpiresAt?: string;
  activationCompletedAt?: string;
  lastResendAt?: string;
  resendCount: number;
  lastDeliveryError?: string;
  auditTrail: VendorActivationAuditLog[];
}

export interface VendorOnboardingSubmission {
  id: string;
  organizationId: string;
  vendorId?: string;
  currentStep: number; // 1 to 5
  status: VendorOnboardingStatus;
  company: VendorOnboardingStep1Company;
  statutory: VendorOnboardingStep2Statutory;
  banking: VendorOnboardingStep3Banking;
  clientAssignment: VendorOnboardingStep4ClientAssignment;
  activationDetails?: VendorAccountActivationDetails;
  reviewerRemarks?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// WORKFORCE ONBOARDING & DEPLOYMENT TYPES
// ----------------------------------------------------------------------------

export interface EmployeeDeploymentMapping {
  id: string;
  organizationId: string;
  employeeId: string;
  vendorId: string;
  clientCompanyId: string;
  clientCompanyName: string;
  siteName: string;
  contractCode: string;
  department: string;
  assignedShift: string;
  reportingManagerId: string;
  reportingManagerName: string;
  teamLeaderId?: string;
  teamLeaderName?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  status: 'ACTIVE' | 'TRANSFERRED' | 'RELIEVED';
}

export interface WorkforceOnboardingPayload {
  organizationId: string;
  vendorId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: string;
  joiningDate: string;
  designation: string;
  skillCategory: 'SKILLED' | 'SEMI_SKILLED' | 'UNSKILLED' | 'HIGHLY_SKILLED';
  mobileNumber: string;
  email?: string;
  aadhaarNumberMasked: string;
  panMasked?: string;
  esiNumber?: string;
  uanNumber?: string;
  sourcingChannel?: string;
  deployment: {
    clientCompanyId: string;
    clientCompanyName: string;
    siteName: string;
    contractCode: string;
    department: string;
    assignedShift: string;
    reportingManagerId: string;
    reportingManagerName: string;
    teamLeaderId?: string;
    teamLeaderName?: string;
  };
  banking: {
    accountNumber: string;
    bankName: string;
    ifscCode: string;
    branch: string;
  };
}

// ----------------------------------------------------------------------------
// PRIVATE OBJECT STORAGE TYPES
// ----------------------------------------------------------------------------

export interface PrivateDocumentStorageMetadata {
  id: string;
  organizationId: string;
  vendorId: string;
  clientCompanyId?: string;
  siteId?: string;
  employeeId?: string;
  bucket: string;
  storagePath: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  documentCategory: ComplianceDocumentCategory | 'ONBOARDING' | 'IDENTITY' | 'PAYROLL';
  accessLevel: 'VENDOR_CONFIDENTIAL' | 'ORGANIZATION_RESTRICTED' | 'PUBLIC_DENIED';
  uploadedBy: string;
  uploadedAt: string;
}

export interface VendorDocumentRecord {
  id: string;
  organizationId: string;
  vendorId: string;
  vendorCode?: string;
  vendorName?: string;
  clientCompanyId?: string;
  siteId?: string;
  category: VendorDocumentCategory;
  documentType: string;
  title: string;
  fileName: string;
  bucket: string;
  storagePath: string;
  fileSizeBytes: number;
  mimeType: string;
  version: number;
  status: VendorDocumentStatus;
  uploadedBy: string;
  uploadedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  resubmissionNote?: string;
  expiresAt?: string;
  auditTrail?: {
    action: string;
    actor: string;
    timestamp: string;
    note?: string;
  }[];
}

// ----------------------------------------------------------------------------
// ATTENDANCE MISS EMAIL ESCALATION TYPES
// ----------------------------------------------------------------------------

export type EmailDeliveryStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'PARTIALLY_SENT' | 'CANCELLED';

export interface AttendanceMissEmailRecipient {
  role: 'TL_SUPERVISOR' | 'OPERATIONS_MANAGER' | 'VENDOR_HR' | 'CLIENT_HR' | 'PLATFORM_ADMIN';
  email: string;
  fullName: string;
  assignedScopeDescription: string;
  deliveryStatus: 'PENDING' | 'DELIVERED' | 'FAILED';
}

export interface AttendanceMissEmailRun {
  runId: string;
  idempotencyKey: string;
  organizationId: string;
  vendorId: string;
  clientCompanyName: string;
  siteName: string;
  reportingDate: string;
  totalExceptions: number;
  openCount: number;
  escalatedCount: number;
  recipients: AttendanceMissEmailRecipient[];
  hierarchySummary: {
    managerName: string;
    tlName: string;
    workerCount: number;
  }[];
  emailSubject: string;
  htmlBodyPreview: string;
  status: EmailDeliveryStatus;
  triggeredBy: string;
  triggeredAt: string;
}

// ----------------------------------------------------------------------------
// PURCHASE ORDER & 3-WAY MATCH TYPES
// ----------------------------------------------------------------------------

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'SENT_TO_VENDOR'
  | 'VENDOR_VIEWED'
  | 'ACKNOWLEDGED'
  | 'ACCEPTED'
  | 'PARTIALLY_FULFILLED'
  | 'FULFILLED'
  | 'CHANGE_REQUESTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'CLOSED';

export interface PurchaseOrderItem {
  id: string;
  poId: string;
  description: string;
  category?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discountPct?: number;
  taxRatePct?: number;
  lineTotal: number;
  servicePeriod?: string;
  notes?: string;
}

export interface PurchaseOrderRevision {
  id: string;
  poId: string;
  revisionNumber: number;
  changeCategory: string;
  changeDescription: string;
  requestedByType: 'COMPANY' | 'VENDOR';
  actorName: string;
  previousSnapshot?: Record<string, any>;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export interface PurchaseOrderApprovalRecord {
  id: string;
  poId: string;
  approverId?: string;
  approverName: string;
  approverRole: string;
  action: 'APPROVED' | 'REJECTED' | 'DELEGATED';
  comments?: string;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  organizationId: string;
  vendorId: string;
  vendorName?: string;
  vendorCode?: string;
  relationshipId?: string;
  poNumber: string;
  contractReference?: string;
  servicePeriod: string;
  poDate: string;
  validFrom?: string;
  validUntil?: string;
  currency: string;
  paymentTerms: string;
  deliveryLocation?: string;
  costCenter?: string;
  department?: string;
  requestingManager?: string;
  subtotalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
  status: PurchaseOrderStatus;
  vendorResponseNote?: string;
  vendorRespondedAt?: string;
  notes?: string;
  items: PurchaseOrderItem[];
  lineItems?: PurchaseOrderItem[];
  revisions?: PurchaseOrderRevision[];
  approvals?: PurchaseOrderApprovalRecord[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice3WayMatchResult {
  invoiceId: string;
  poId: string;
  poNumber: string;
  isMatched: boolean;
  quantityVariance: number;
  rateVariance: number;
  taxVariance: number;
  amountVariance: number;
  matchingStatus: 'MATCHED' | 'VARIANCE_FLAGGED' | 'DISCREPANCY_REJECTED';
  overallRemarks?: string;
  lineDetails: {
    description: string;
    poQty: number;
    fulfillmentQty: number;
    invoiceQty: number;
    poUnitPrice: number;
    invoiceUnitPrice: number;
    isQtyMatch: boolean;
    isRateMatch: boolean;
    varianceReason?: string;
    attendanceVerifiedQuantity?: number;
    invoiceLineTotal?: number;
    matchStatus?: string;
  }[];
  // Compatibility Aliases
  matchStatus?: 'MATCHED' | 'VARIANCE_FLAGGED' | 'DISCREPANCY_REJECTED';
  totalVarianceAmount?: number;
  itemMatches?: {
    description: string;
    poUnitPrice: number;
    invoiceUnitPrice: number;
    attendanceVerifiedQuantity?: number;
    invoiceLineTotal?: number;
    matchStatus?: string;
  }[];
}

// Re-export Vendor Invoice types for centralized access
export type { VendorInvoiceRecord, VendorInvoiceItem } from '../services/vendor/vendorInvoiceService';



