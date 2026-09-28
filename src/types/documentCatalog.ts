// src/types/documentCatalog.ts
// ============================================================================
// JOY PeopleHR — Configurable Document Types Catalog
// Replaces hardcoded frontend category lists with a database-driven model.
// Frontend can render from EMPLOYEE_DOCUMENT_CATALOG constant (local fallback)
// and merge with live data from the Supabase document_types table.
// ============================================================================

export type DocumentCatalogCategory =
  | 'IDENTITY_ADDRESS'
  | 'EMPLOYMENT_JOINING'
  | 'EDUCATION_SKILLS'
  | 'STATUTORY_PAYROLL'
  | 'EMERGENCY_OTHER'
  | 'VENDOR_COMPLIANCE'
  | 'WORKFORCE_PROOF'
  | 'PROFILE_PHOTO'
  | 'PAYSLIP';

export type DocumentCatalogApplicableTo = 'EMPLOYEE' | 'VENDOR' | 'BOTH';

export interface DocumentTypeDefinition {
  /** Short code used as document_type_id in metadata (e.g. 'AADHAAR', 'PAN_CARD') */
  code: string;
  /** Human-readable display name for the UI */
  displayName: string;
  /** Optional helper description */
  description?: string;
  /** Top-level grouping category */
  category: DocumentCatalogCategory;
  /** Which entity type this applies to */
  applicableTo: DocumentCatalogApplicableTo[];
  /** Whether the document is strictly required (for that employment type/jurisdiction) */
  isMandatory: boolean;
  /** Whether HR review is needed after upload */
  isReviewRequired: boolean;
  /** Allowed MIME types for this document */
  allowedMimeTypes?: string[];
  /** Max file size in bytes */
  maxSizeBytes?: number;
  /** Filter by employment type (null = all types) */
  employmentTypeFilter?: string[];
  /** Sort order within category */
  displayOrder: number;
}

export interface DocumentCatalogGroup {
  category: DocumentCatalogCategory;
  label: string;
  icon: string;
  description: string;
  documents: DocumentTypeDefinition[];
}

// ============================================================================
// LOCAL FALLBACK CATALOG
// Used when Supabase document_types table is unavailable.
// Mirror of what is seeded in migration 127.
// ============================================================================

export const EMPLOYEE_DOCUMENT_CATALOG: DocumentTypeDefinition[] = [
  // Identity & Address
  { code: 'AADHAAR',            displayName: 'Aadhaar Card',                category: 'IDENTITY_ADDRESS',   applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: true,  displayOrder: 10 },
  { code: 'PAN_CARD',           displayName: 'PAN Card',                    category: 'IDENTITY_ADDRESS',   applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: true,  displayOrder: 11 },
  { code: 'PASSPORT',           displayName: 'Passport',                    category: 'IDENTITY_ADDRESS',   applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: true,  displayOrder: 12 },
  { code: 'VOTER_ID',           displayName: 'Voter ID Card',               category: 'IDENTITY_ADDRESS',   applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: true,  displayOrder: 13 },
  { code: 'DRIVING_LICENCE',    displayName: 'Driving Licence',             category: 'IDENTITY_ADDRESS',   applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: true,  displayOrder: 14 },
  { code: 'ADDRESS_PROOF',      displayName: 'Address Proof',               category: 'IDENTITY_ADDRESS',   applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: true,  displayOrder: 15 },
  { code: 'PROFILE_PHOTO',      displayName: 'Profile Photograph',          category: 'IDENTITY_ADDRESS',   applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: false, displayOrder: 16 },

  // Employment & Joining
  { code: 'OFFER_LETTER',         displayName: 'Offer / Appointment Letter',  category: 'EMPLOYMENT_JOINING', applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: true,  displayOrder: 20 },
  { code: 'EMPLOYMENT_AGREEMENT', displayName: 'Employment Agreement',        category: 'EMPLOYMENT_JOINING', applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: true,  displayOrder: 21 },
  { code: 'RELIEVING_LETTER',     displayName: 'Relieving / Experience Letter', category: 'EMPLOYMENT_JOINING', applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: true, displayOrder: 22 },
  { code: 'JOINING_DECLARATION',  displayName: 'Joining Declaration',         category: 'EMPLOYMENT_JOINING', applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: true,  displayOrder: 23 },
  { code: 'NOC_LETTER',           displayName: 'No Objection Certificate',    category: 'EMPLOYMENT_JOINING', applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: true,  displayOrder: 24 },

  // Education & Skills
  { code: 'HIGHEST_DEGREE',   displayName: 'Highest Degree Certificate',    category: 'EDUCATION_SKILLS', applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: true, displayOrder: 30 },
  { code: 'MARKSHEET',        displayName: 'Marksheet / Transcript',        category: 'EDUCATION_SKILLS', applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: true, displayOrder: 31 },
  { code: 'PROFESSIONAL_CERT', displayName: 'Professional Certification',   category: 'EDUCATION_SKILLS', applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: true, displayOrder: 32 },

  // Statutory & Payroll
  { code: 'UAN_CARD',            displayName: 'UAN / PF Passbook',           category: 'STATUTORY_PAYROLL', applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: true, displayOrder: 40 },
  { code: 'ESIC_CARD',           displayName: 'ESIC Card',                   category: 'STATUTORY_PAYROLL', applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: true, displayOrder: 41 },
  { code: 'BANK_ACCOUNT_PROOF',  displayName: 'Bank Account Proof',          category: 'STATUTORY_PAYROLL', applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: true, displayOrder: 42 },
  { code: 'FORM_16',             displayName: 'Form 16 (Previous Employer)', category: 'STATUTORY_PAYROLL', applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: true, displayOrder: 43 },
  { code: 'NOMINEE_DECLARATION', displayName: 'Nominee Declaration',         category: 'STATUTORY_PAYROLL', applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: true, displayOrder: 44 },

  // Emergency & Other
  { code: 'EMERGENCY_CONTACT',  displayName: 'Emergency Contact Form',       category: 'EMERGENCY_OTHER', applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: false, displayOrder: 50 },
  { code: 'MEDICAL_CERTIFICATE', displayName: 'Medical Fitness Certificate', category: 'EMERGENCY_OTHER', applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: true,  displayOrder: 51 },
  { code: 'DISABILITY_CERT',    displayName: 'Disability Certificate',       category: 'EMERGENCY_OTHER', applicableTo: ['EMPLOYEE'], isMandatory: false, isReviewRequired: true,  displayOrder: 52 },
];

export const VENDOR_DOCUMENT_CATALOG: DocumentTypeDefinition[] = [
  { code: 'VENDOR_REGISTRATION', displayName: 'Vendor Registration Certificate', category: 'VENDOR_COMPLIANCE', applicableTo: ['VENDOR'], isMandatory: true,  isReviewRequired: true, displayOrder: 60 },
  { code: 'VENDOR_PAN',          displayName: 'Vendor PAN Card',                 category: 'VENDOR_COMPLIANCE', applicableTo: ['VENDOR'], isMandatory: true,  isReviewRequired: true, displayOrder: 61 },
  { code: 'VENDOR_GST',          displayName: 'GST Registration Certificate',    category: 'VENDOR_COMPLIANCE', applicableTo: ['VENDOR'], isMandatory: true,  isReviewRequired: true, displayOrder: 62 },
  { code: 'PF_REGISTRATION',     displayName: 'PF Registration Certificate',     category: 'VENDOR_COMPLIANCE', applicableTo: ['VENDOR'], isMandatory: false, isReviewRequired: true, displayOrder: 63 },
  { code: 'ESIC_REGISTRATION',   displayName: 'ESIC Registration Certificate',   category: 'VENDOR_COMPLIANCE', applicableTo: ['VENDOR'], isMandatory: false, isReviewRequired: true, displayOrder: 64 },
  { code: 'VENDOR_AGREEMENT',    displayName: 'Vendor / Service Agreement',      category: 'VENDOR_COMPLIANCE', applicableTo: ['VENDOR'], isMandatory: true,  isReviewRequired: true, displayOrder: 65 },
  { code: 'VENDOR_BANK_PROOF',   displayName: 'Vendor Bank Account Proof',       category: 'VENDOR_COMPLIANCE', applicableTo: ['VENDOR'], isMandatory: true,  isReviewRequired: true, displayOrder: 66 },
  { code: 'WORKER_ID_PROOF',     displayName: 'Worker Identity Proof',           category: 'WORKFORCE_PROOF',   applicableTo: ['VENDOR'], isMandatory: true,  isReviewRequired: true, displayOrder: 70 },
  { code: 'WORKER_PF_CHALLAN',   displayName: 'PF Challan',                      category: 'WORKFORCE_PROOF',   applicableTo: ['VENDOR'], isMandatory: false, isReviewRequired: true, displayOrder: 71 },
  { code: 'WORKER_ESIC_CHALLAN', displayName: 'ESIC Challan',                    category: 'WORKFORCE_PROOF',   applicableTo: ['VENDOR'], isMandatory: false, isReviewRequired: true, displayOrder: 72 },
];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCatalogCategory, { label: string; description: string }> = {
  IDENTITY_ADDRESS:   { label: 'Identity & Address',     description: 'Government-issued ID and address proof documents' },
  EMPLOYMENT_JOINING: { label: 'Employment & Joining',   description: 'Offer letters, agreements, and joining documents' },
  EDUCATION_SKILLS:   { label: 'Education & Skills',     description: 'Degree certificates, marksheets, and certifications' },
  STATUTORY_PAYROLL:  { label: 'Statutory & Payroll',    description: 'PF, ESIC, PAN, bank account, and tax documents' },
  EMERGENCY_OTHER:    { label: 'Emergency & Other',      description: 'Emergency contacts, medical certificates, and policy documents' },
  VENDOR_COMPLIANCE:  { label: 'Vendor Compliance',      description: 'Registration, GST, agreements, and compliance proofs' },
  WORKFORCE_PROOF:    { label: 'Workforce Proof',        description: 'Worker identity and statutory contribution challans' },
  PROFILE_PHOTO:      { label: 'Profile Photo',          description: 'Employee profile photograph' },
  PAYSLIP:            { label: 'Payslip',                description: 'Monthly payroll statements' },
};

// ============================================================================
// DOCUMENT STATUS STATE MACHINE
// Defines valid transitions to enforce controlled workflow.
// ============================================================================

export type DocumentWorkflowStatus =
  | 'PENDING'
  | 'REQUESTED'
  | 'UPLOADED'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED';

export const VALID_STATUS_TRANSITIONS: Record<DocumentWorkflowStatus, DocumentWorkflowStatus[]> = {
  PENDING:      ['REQUESTED'],
  REQUESTED:    ['UPLOADED', 'EXPIRED'],
  UPLOADED:     ['SUBMITTED', 'REQUESTED'],
  SUBMITTED:    ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['VERIFIED', 'REJECTED'],
  VERIFIED:     [],                           // Terminal — requires new request to replace
  REJECTED:     ['REQUESTED', 'UPLOADED'],    // Can be re-requested or directly re-uploaded
  EXPIRED:      ['REQUESTED'],
};

export const STATUS_LABELS: Record<DocumentWorkflowStatus, string> = {
  PENDING:      'Pending',
  REQUESTED:    'Requested',
  UPLOADED:     'Uploaded',
  SUBMITTED:    'Submitted',
  UNDER_REVIEW: 'Under Review',
  VERIFIED:     'Verified',
  REJECTED:     'Rejected',
  EXPIRED:      'Expired',
};

export const STATUS_COLORS: Record<DocumentWorkflowStatus, string> = {
  PENDING:      'text-gray-500',
  REQUESTED:    'text-blue-600',
  UPLOADED:     'text-indigo-600',
  SUBMITTED:    'text-purple-600',
  UNDER_REVIEW: 'text-amber-600',
  VERIFIED:     'text-emerald-600',
  REJECTED:     'text-red-600',
  EXPIRED:      'text-gray-400',
};

/**
 * Validate whether a status transition is permitted.
 */
export function isValidStatusTransition(
  from: DocumentWorkflowStatus,
  to: DocumentWorkflowStatus
): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Load document types from Supabase with local catalog fallback.
 * Call once on app load and cache the result.
 */
export async function loadDocumentCatalog(
  supabaseClient: any,
  applicableTo: DocumentCatalogApplicableTo = 'EMPLOYEE'
): Promise<DocumentTypeDefinition[]> {
  try {
    const { data, error } = await supabaseClient
      .from('document_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (!error && data && data.length > 0) {
      return (data as any[]).map((row: any): DocumentTypeDefinition => ({
        code: row.code,
        displayName: row.display_name,
        description: row.description,
        category: row.category,
        applicableTo: row.applicable_to || [applicableTo],
        isMandatory: row.is_mandatory,
        isReviewRequired: row.is_review_required,
        allowedMimeTypes: row.allowed_mime_types,
        maxSizeBytes: row.max_size_bytes,
        employmentTypeFilter: row.employment_type_filter,
        displayOrder: row.display_order ?? 100,
      })).filter(d => d.applicableTo.includes(applicableTo) || d.applicableTo.includes('BOTH'));
    }
  } catch (_) {
    // Silently fall through to local catalog
  }

  // Local fallback
  const local = applicableTo === 'VENDOR' ? VENDOR_DOCUMENT_CATALOG : EMPLOYEE_DOCUMENT_CATALOG;
  return local.filter(d => d.applicableTo.includes(applicableTo) || d.applicableTo.includes('BOTH'));
}

/**
 * Group a flat list of document type definitions by category.
 */
export function groupDocumentCatalogByCategory(
  docs: DocumentTypeDefinition[]
): Map<DocumentCatalogCategory, DocumentTypeDefinition[]> {
  const map = new Map<DocumentCatalogCategory, DocumentTypeDefinition[]>();
  for (const doc of docs.sort((a, b) => a.displayOrder - b.displayOrder)) {
    if (!map.has(doc.category)) {
      map.set(doc.category, []);
    }
    map.get(doc.category)!.push(doc);
  }
  return map;
}
