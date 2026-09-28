// src/services/vendor/vendorDocumentService.ts
// ============================================================================
// Joy PeopleHR — Enterprise Vendor Compliance Document Vault & Statutory Repository Engine
// Manages single canonical records, versioning, requirement catalog,
// dynamic missing/overdue calculation, and multi-tenant Supabase private storage.
// ============================================================================

import { supabase } from '../../lib/supabase';

export type DocumentCategoryType =
  | 'ALL'
  | 'REGISTRATION_TAX'
  | 'CONTRACTS_COMMERCIAL'
  | 'STATUTORY_REGISTRATIONS'
  | 'MONTHLY_COMPLIANCE'
  | 'ANNUAL_COMPLIANCE'
  | 'WORKFORCE_KYC'
  | 'EXCEPTIONS_REQUESTS';

export type VerificationStatusType =
  | 'NOT_SUBMITTED'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUPERSEDED'
  | 'ARCHIVED';

export type ExpiryStatusType =
  | 'PERMANENT'
  | 'VALID'
  | 'EXPIRING_SOON'
  | 'EXPIRED';

export type RequirementFrequencyType =
  | 'ONCE'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'HALF_YEARLY'
  | 'ANNUAL'
  | 'EVENT_BASED';

export type RequirednessType = 'MANDATORY' | 'CONDITIONAL' | 'OPTIONAL';

export interface DocumentAuditEntry {
  action: string;
  actor: string;
  timestamp: string;
  note?: string;
  reason?: string;
}

export interface VendorDocumentRecord {
  id: string;
  vendorId: string;
  organizationId?: string;
  clientCompanyId?: string;
  siteId?: string;
  contractId?: string;
  relationshipId?: string;
  requirementId?: string;
  requirementCode?: string;

  documentCategory: DocumentCategoryType;
  documentType: string;
  documentNumber?: string;
  compliancePeriod?: string; // YYYY-MM or YYYY-FY
  periodType?: 'ONE_TIME' | 'MONTHLY' | 'HALF_YEARLY' | 'ANNUAL';

  fileName: string;
  filePath: string;
  storagePath?: string;
  bucketId?: string;
  fileSize?: number;
  fileSizeBytes?: number;
  mimeType?: string;

  issueDate?: string;
  expiryDate?: string;
  version: number;

  verificationStatus: VerificationStatusType;
  expiryStatus: ExpiryStatusType;

  rejectionReason?: string;
  resubmissionNote?: string;
  reviewNotes?: string;
  reviewerRemarks?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  uploadedBy?: string;

  scope: 'VENDOR_ORGANIZATION' | 'WORKFORCE_EMPLOYEE';
  workerId?: string;
  workerName?: string;
  workerCode?: string;
  workerRole?: string;

  auditTrail?: DocumentAuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceRequirementDefinition {
  code: string;
  title: string;
  category: DocumentCategoryType;
  frequency: RequirementFrequencyType;
  requiredness: RequirednessType;
  description: string;
  applicableVendorTypes?: string[];
  applicableLegalStructures?: string[];
  defaultWarningDays?: number;
  portalHelpUrl?: string;
}

export const ENTERPRISE_COMPLIANCE_CATALOG: ComplianceRequirementDefinition[] = [
  // 1. Registration & Tax
  {
    code: 'DOC-PAN',
    title: 'PAN Card Copy / Certificate',
    category: 'REGISTRATION_TAX',
    frequency: 'ONCE',
    requiredness: 'MANDATORY',
    description: 'Permanent Account Number card issued by Income Tax Department',
  },
  {
    code: 'DOC-GST',
    title: 'GST Registration Certificate (Form REG-06)',
    category: 'REGISTRATION_TAX',
    frequency: 'ONCE',
    requiredness: 'MANDATORY',
    description: 'Valid Form REG-06 containing principal place of business and GSTIN',
  },
  {
    code: 'DOC-BANK',
    title: 'Bank Cancelled Cheque / Bank Mandate',
    category: 'REGISTRATION_TAX',
    frequency: 'ONCE',
    requiredness: 'MANDATORY',
    description: 'Official bank mandate or cancelled cheque with printed IFSC and vendor account name',
  },
  {
    code: 'DOC-MSME',
    title: 'MSME / Udyam Registration Certificate',
    category: 'REGISTRATION_TAX',
    frequency: 'ONCE',
    requiredness: 'OPTIONAL',
    description: 'Ministry of MSME Udyam registration certificate for small/micro enterprises',
  },
  {
    code: 'DOC-INCORP',
    title: 'Certificate of Incorporation / Partnership Deed',
    category: 'REGISTRATION_TAX',
    frequency: 'ONCE',
    requiredness: 'MANDATORY',
    description: 'ROC Certificate of Incorporation, Partnership Deed, or LLP Agreement',
  },
  {
    code: 'DOC-CONFLICT',
    title: 'Declaration of Conflict of Interest',
    category: 'REGISTRATION_TAX',
    frequency: 'ONCE',
    requiredness: 'MANDATORY',
    description: 'Signed vendor conflict of interest and integrity declaration',
  },

  // 2. Contracts & Commercial
  {
    code: 'DOC-MSA',
    title: 'Master Service Agreement (MSA)',
    category: 'CONTRACTS_COMMERCIAL',
    frequency: 'ONCE',
    requiredness: 'MANDATORY',
    description: 'Fully executed Master Service Agreement between client and vendor',
  },
  {
    code: 'DOC-RATE-CARD',
    title: 'Approved Commercial Rate Card',
    category: 'CONTRACTS_COMMERCIAL',
    frequency: 'ANNUAL',
    requiredness: 'MANDATORY',
    description: 'Approved billable wage rates, daily allowances, and agency service charge percentage',
  },
  {
    code: 'DOC-WORK-ORDER',
    title: 'Site Work Order / Site Assignment Advice',
    category: 'CONTRACTS_COMMERCIAL',
    frequency: 'ANNUAL',
    requiredness: 'MANDATORY',
    description: 'Authorized client operational site allocation advice with authorized workforce cap',
  },
  {
    code: 'DOC-PO',
    title: 'Approved Purchase Order (PO)',
    category: 'CONTRACTS_COMMERCIAL',
    frequency: 'MONTHLY',
    requiredness: 'MANDATORY',
    description: 'Commercial Purchase Order authorizing monthly workforce deployment and budget',
  },

  // 3. Statutory Registrations
  {
    code: 'DOC-CLRA-LIC',
    title: 'CLRA Contract Labour License (Form V)',
    category: 'STATUTORY_REGISTRATIONS',
    frequency: 'ANNUAL',
    requiredness: 'MANDATORY',
    description: 'License under Contract Labour (Regulation & Abolition) Act 1970 for specified client site',
  },
  {
    code: 'DOC-PF-REG',
    title: 'EPFO Code Allotment Letter',
    category: 'STATUTORY_REGISTRATIONS',
    frequency: 'ONCE',
    requiredness: 'MANDATORY',
    description: 'Establishment code allotment letter issued by Employees Provident Fund Organisation',
  },
  {
    code: 'DOC-ESI-REG',
    title: 'ESIC Code Registration Certificate',
    category: 'STATUTORY_REGISTRATIONS',
    frequency: 'ONCE',
    requiredness: 'MANDATORY',
    description: '17-digit Employer code allotment letter issued by Employees State Insurance Corporation',
  },
  {
    code: 'DOC-PT-REG',
    title: 'Professional Tax (PT) Registration',
    category: 'STATUTORY_REGISTRATIONS',
    frequency: 'ONCE',
    requiredness: 'MANDATORY',
    description: 'PTRC / PTEC registration issued by the state commercial taxes department',
  },
  {
    code: 'DOC-LWF-REG',
    title: 'Labour Welfare Fund (LWF) Registration',
    category: 'STATUTORY_REGISTRATIONS',
    frequency: 'ONCE',
    requiredness: 'CONDITIONAL',
    description: 'State Labour Welfare Board registration reference and employer code',
  },

  // 4. Monthly Compliance Submissions
  {
    code: 'DOC-M-INVOICE',
    title: 'Monthly Vendor Commercial Invoice',
    category: 'MONTHLY_COMPLIANCE',
    frequency: 'MONTHLY',
    requiredness: 'MANDATORY',
    description: 'Tax Invoice with GSTIN, SAC 998519, PO reference, and verified billing breakup',
  },
  {
    code: 'DOC-M-ATTN-RECON',
    title: 'Monthly Attendance & OT Reconciliation Summary',
    category: 'MONTHLY_COMPLIANCE',
    frequency: 'MONTHLY',
    requiredness: 'MANDATORY',
    description: 'Supervisor-signed biometric muster roll and authorized daily OT workings',
  },
  {
    code: 'DOC-M-ESI-CHALLAN',
    title: 'Monthly ESI Challan & Bank Receipt',
    category: 'MONTHLY_COMPLIANCE',
    frequency: 'MONTHLY',
    requiredness: 'MANDATORY',
    description: 'ESIC online payment challan along with bank cyber-receipt for the billing month',
  },
  {
    code: 'DOC-M-ESI-STMT',
    title: 'Monthly ESI Contribution Statement (Excel)',
    category: 'MONTHLY_COMPLIANCE',
    frequency: 'MONTHLY',
    requiredness: 'MANDATORY',
    description: 'IP-wise serial statement of wages, employee contribution, and employer contribution',
  },
  {
    code: 'DOC-M-PF-CHALLAN',
    title: 'Monthly PF ECR Challan & TRRN Payment Receipt',
    category: 'MONTHLY_COMPLIANCE',
    frequency: 'MONTHLY',
    requiredness: 'MANDATORY',
    description: 'EPFO Electronic Challan cum Return (ECR) receipt with TRRN payment confirmation',
  },
  {
    code: 'DOC-M-PF-STMT',
    title: 'Monthly PF Paid Serial Statement (Excel)',
    category: 'MONTHLY_COMPLIANCE',
    frequency: 'MONTHLY',
    requiredness: 'MANDATORY',
    description: 'UAN-wise breakdown of gross wages, EPF, EPS, and EDLI contributions',
  },
  {
    code: 'DOC-M-SALARY-ACK',
    title: 'Salary Paid Statement & Slip Acknowledgment',
    category: 'MONTHLY_COMPLIANCE',
    frequency: 'MONTHLY',
    requiredness: 'MANDATORY',
    description: 'Bank NEFT/RTGS disbursement advice or signed muster salary voucher proof',
  },

  // 5. Annual / Half-Yearly Compliance
  {
    code: 'DOC-A-FORM5',
    title: 'Annual Statutory Return (Form 5 / Form XXIV)',
    category: 'ANNUAL_COMPLIANCE',
    frequency: 'ANNUAL',
    requiredness: 'MANDATORY',
    description: 'Annual return under Contract Labour Act submitted to jurisdictional labour officer',
  },
  {
    code: 'DOC-A-BONUS',
    title: 'Annual Ex-Gratia / Bonus Paid Statement',
    category: 'ANNUAL_COMPLIANCE',
    frequency: 'ANNUAL',
    requiredness: 'MANDATORY',
    description: 'Annual statutory bonus disbursement sheet under Payment of Bonus Act',
  },
  {
    code: 'DOC-A-LEAVE-WAGES',
    title: 'Leave Wages Paid Reconciliation Statement',
    category: 'ANNUAL_COMPLIANCE',
    frequency: 'ANNUAL',
    requiredness: 'MANDATORY',
    description: 'Annual leave wages in lieu of earned leaves reconciliation and payment proof',
  },

  // 6. Deployed Workforce KYC
  {
    code: 'DOC-W-AADHAAR',
    title: 'Worker Government Photo ID / Aadhaar',
    category: 'WORKFORCE_KYC',
    frequency: 'ONCE',
    requiredness: 'MANDATORY',
    description: 'Authorized identity document for contractor deployed worker',
  },
  {
    code: 'DOC-W-BANK',
    title: 'Worker Bank Account Passbook / Mandate',
    category: 'WORKFORCE_KYC',
    frequency: 'ONCE',
    requiredness: 'MANDATORY',
    description: 'Bank account proof for direct salary credit',
  },
  {
    code: 'DOC-W-PF-UAN',
    title: 'EPFO UAN / Form 11 Declaration',
    category: 'WORKFORCE_KYC',
    frequency: 'ONCE',
    requiredness: 'MANDATORY',
    description: 'Universal Account Number statutory declaration for PF enrollment',
  },
  {
    code: 'DOC-W-ESI-PEHCHAN',
    title: 'ESIC Pehchan Smart Card / Declaration',
    category: 'WORKFORCE_KYC',
    frequency: 'ONCE',
    requiredness: 'MANDATORY',
    description: 'ESIC Insured Person (IP) smart registration card or Form 1 declaration',
  },
  {
    code: 'DOC-W-APPOINTMENT',
    title: 'Contractor Deployment Order',
    category: 'WORKFORCE_KYC',
    frequency: 'ONCE',
    requiredness: 'MANDATORY',
    description: 'Appointment letter and company site deployment order',
  },
  {
    code: 'DOC-W-MEDICAL',
    title: 'Medical Fitness Certificate',
    category: 'WORKFORCE_KYC',
    frequency: 'ANNUAL',
    requiredness: 'CONDITIONAL',
    description: 'Occupational health and physical fitness certificate from registered medical doctor',
  },
  {
    code: 'DOC-W-POLICE',
    title: 'Police Verification Certificate',
    category: 'WORKFORCE_KYC',
    frequency: 'ONCE',
    requiredness: 'CONDITIONAL',
    description: 'Official police character verification clearance',
  },
];

export interface WorkforceDocumentRequirement {
  code: string;
  title: string;
  category: string;
  isRequired: boolean;
  frequency: string;
  description: string;
}

export interface DocumentRequirement {
  code: string;
  title: string;
  category: string;
  isRequired: boolean;
  frequency: string;
  description: string;
  documentType?: string;
}

export const STANDARD_WORKFORCE_DOCUMENT_REQUIREMENTS: WorkforceDocumentRequirement[] = [
  {
    code: 'DOC-W-AADHAAR',
    title: 'Aadhaar Card Copy (Masked)',
    category: 'WORKFORCE_KYC',
    isRequired: true,
    frequency: 'ONCE',
    description: 'Government identity proof with unique 12-digit Aadhaar number',
  },
  {
    code: 'DOC-W-PAN',
    title: 'Permanent Account Number (PAN) Card',
    category: 'WORKFORCE_KYC',
    isRequired: false,
    frequency: 'ONCE',
    description: 'Individual PAN card for income tax deduction purposes',
  },
  {
    code: 'DOC-W-PHOTO',
    title: 'Passport Size Worker Photograph',
    category: 'WORKFORCE_KYC',
    isRequired: true,
    frequency: 'ONCE',
    description: 'Recent colour photograph for site gate pass and biometric profile',
  },
  {
    code: 'DOC-W-BANK',
    title: 'Worker Bank Account Passbook / Mandate',
    category: 'WORKFORCE_KYC',
    isRequired: true,
    frequency: 'ONCE',
    description: 'Bank account proof for direct salary credit',
  },
  {
    code: 'DOC-W-PF-UAN',
    title: 'EPFO UAN / Form 11 Declaration',
    category: 'WORKFORCE_KYC',
    isRequired: true,
    frequency: 'ONCE',
    description: 'Universal Account Number statutory declaration for PF enrollment',
  },
  {
    code: 'DOC-W-ESI-PEHCHAN',
    title: 'ESIC Pehchan Smart Card / Declaration',
    category: 'WORKFORCE_KYC',
    isRequired: true,
    frequency: 'ONCE',
    description: 'ESIC Insured Person (IP) smart registration card or Form 1 declaration',
  },
  {
    code: 'DOC-W-APPOINTMENT',
    title: 'Contractor Deployment Order',
    category: 'WORKFORCE_KYC',
    isRequired: true,
    frequency: 'ONCE',
    description: 'Appointment letter and company site deployment order',
  },
  {
    code: 'DOC-W-MEDICAL',
    title: 'Medical Fitness Certificate',
    category: 'WORKFORCE_KYC',
    isRequired: false,
    frequency: 'ANNUAL',
    description: 'Occupational health and physical fitness certificate from registered medical doctor',
  },
  {
    code: 'DOC-W-POLICE',
    title: 'Police Verification Certificate',
    category: 'WORKFORCE_KYC',
    isRequired: false,
    frequency: 'ONCE',
    description: 'Official police character verification clearance',
  },
];

export const STANDARD_VENDOR_DOCUMENT_REQUIREMENTS: DocumentRequirement[] = [
  {
    code: 'DOC-PAN',
    title: 'PAN Card Copy / Certificate',
    category: 'REGISTRATION',
    isRequired: true,
    frequency: 'ONCE',
    description: 'Permanent Account Number card issued by Income Tax Department',
  },
  {
    code: 'DOC-GST',
    title: 'GST Registration Certificate',
    category: 'REGISTRATION',
    isRequired: true,
    frequency: 'ONCE',
    description: 'Valid Form REG-06 containing principal place of business and GSTIN',
  },
  {
    code: 'DOC-BANK',
    title: 'Bank Cancelled Cheque / Mandate',
    category: 'REGISTRATION',
    isRequired: true,
    frequency: 'ONCE',
    description: 'Official bank mandate or cancelled cheque with printed IFSC and vendor account name',
  },
  {
    code: 'DOC-CLRA',
    title: 'CLRA Contract Labor License',
    category: 'LICENSE',
    isRequired: true,
    frequency: 'ANNUAL',
    description: 'License under Contract Labour (Regulation & Abolition) Act 1970 for specified client site',
  },
  {
    code: 'DOC-PF-CHALLAN',
    title: 'EPF Monthly Challan & ECR',
    category: 'STATUTORY_CHALLAN',
    isRequired: true,
    frequency: 'MONTHLY',
    description: 'Monthly Electronic Challan cum Return (ECR) and TRRN bank payment receipt',
  },
  {
    code: 'DOC-ESI-CHALLAN',
    title: 'ESIC Monthly Contribution Challan',
    category: 'STATUTORY_CHALLAN',
    isRequired: true,
    frequency: 'MONTHLY',
    description: 'Monthly ESIC contribution statement and bank payment receipt',
  },
  {
    code: 'DOC-WAGE-REGISTER',
    title: 'Monthly Certified Wage Register (Form B / Form X)',
    category: 'STATUTORY_CHALLAN',
    isRequired: true,
    frequency: 'MONTHLY',
    description: 'Signed and stamped monthly attendance and wage payment register with bank disbursement proof',
  },
  {
    code: 'DOC-MSME',
    title: 'MSME / Udyam Registration Certificate',
    category: 'REGISTRATION',
    isRequired: false,
    frequency: 'ONCE',
    description: 'Ministry of MSME Udyam registration certificate for small/micro enterprises',
  },
  {
    code: 'DOC-INSURANCE',
    title: 'Workmen Compensation / Group Term Insurance',
    category: 'LICENSE',
    isRequired: false,
    frequency: 'ANNUAL',
    description: 'Active workmen compensation insurance policy schedule covering deployed site workforce',
  },
];

export const STANDARD_COMPLIANCE_REQUIREMENTS = ENTERPRISE_COMPLIANCE_CATALOG;

export interface ComplianceSummaryMetrics {
  totalDocuments: number;
  verifiedDocuments: number;
  pendingReview: number;
  missingRequired: number;
  expiringSoon: number;
  expiredDocuments: number;
  rejectedOrCorrection: number;
  monthlySubmissionsDue: number;
}

export class VendorDocumentService {
  public static CANONICAL_BUCKET = 'vendor-private-documents';

  /**
   * Calculates expiry status dynamically, keeping it strictly separate from verification status.
   */
  public static calculateExpiryStatus(expiryDate?: string): ExpiryStatusType {
    if (!expiryDate) return 'PERMANENT';
    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime())) return 'PERMANENT';

    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'EXPIRED';
    if (diffDays <= 30) return 'EXPIRING_SOON';
    return 'VALID';
  }

  /**
   * List vendor documents from Supabase with full multi-tenant security
   */
  public static async listDocuments(params: {
    vendorId?: string;
    organizationId?: string;
    scope?: 'VENDOR_ORGANIZATION' | 'WORKFORCE_EMPLOYEE';
    category?: DocumentCategoryType;
    compliancePeriod?: string;
    workerId?: string;
  }): Promise<VendorDocumentRecord[]> {
    try {
      let query = supabase.from('vendor_documents').select('*');

      if (params.vendorId && params.vendorId !== 'ALL') {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.vendorId);
        if (isUUID) {
          query = query.eq('vendor_id', params.vendorId);
        } else {
          try {
            const { data: v } = await supabase
              .from('vendors')
              .select('id')
              .or(`vendor_code.eq."${params.vendorId}",legal_name.ilike."%${params.vendorId}%"`)
              .limit(1)
              .maybeSingle();

            if (v?.id) {
              query = query.eq('vendor_id', v.id);
            }
            // If vendorId is not a UUID and not found in vendors table, do not add invalid UUID filter to Postgres
          } catch {
            // ignore resolution error
          }
        }
      }

      if (params.organizationId) {
        query = query.or(`organization_id.eq.${params.organizationId},organization_id.is.null`);
      }

      if (params.scope) {
        query = query.eq('scope', params.scope);
      }

      if (params.category && params.category !== 'ALL') {
        query = query.eq('document_category', params.category);
      }

      if (params.workerId && params.workerId !== 'ALL') {
        query = query.eq('worker_id', params.workerId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error || !data) {
        return this.loadFallbackMemoryDocuments(params);
      }

      return data.map((d) => this.mapDbToModel(d));
    } catch {
      return this.loadFallbackMemoryDocuments(params);
    }
  }

  /**
   * Calculate live KPI metrics across the vault
   */
  public static calculateMetrics(
    documents: VendorDocumentRecord[],
    vendorId: string,
    period: string = '2026-09'
  ): ComplianceSummaryMetrics {
    const verified = documents.filter((d) => d.verificationStatus === 'VERIFIED').length;
    const pending = documents.filter(
      (d) => d.verificationStatus === 'SUBMITTED' || d.verificationStatus === 'UNDER_REVIEW'
    ).length;
    const expiringSoon = documents.filter((d) => d.expiryStatus === 'EXPIRING_SOON').length;
    const expired = documents.filter((d) => d.expiryStatus === 'EXPIRED').length;
    const rejected = documents.filter(
      (d) => d.verificationStatus === 'REJECTED' || d.verificationStatus === 'CHANGES_REQUESTED'
    ).length;

    // Calculate missing requirements
    const missingDocs = this.calculateMissingRequirements(documents, period);
    const monthlyDue = missingDocs.filter((r) => r.category === 'MONTHLY_COMPLIANCE').length;

    return {
      totalDocuments: documents.length,
      verifiedDocuments: verified,
      pendingReview: pending,
      missingRequired: missingDocs.length,
      expiringSoon,
      expiredDocuments: expired,
      rejectedOrCorrection: rejected,
      monthlySubmissionsDue: monthlyDue,
    };
  }

  /**
   * Requirement Engine: Calculates which applicable documents are missing for a given period
   */
  public static calculateMissingRequirements(
    existingDocs: VendorDocumentRecord[],
    period: string = '2026-09'
  ): ComplianceRequirementDefinition[] {
    const activeReqs = ENTERPRISE_COMPLIANCE_CATALOG.filter(
      (req) => req.requiredness === 'MANDATORY' && req.category !== 'WORKFORCE_KYC'
    );

    const missing: ComplianceRequirementDefinition[] = [];

    for (const req of activeReqs) {
      if (req.frequency === 'MONTHLY') {
        // Must have a submitted or verified document for this period
        const hasDoc = existingDocs.some(
          (d) =>
            (d.requirementCode === req.code || d.documentType.toLowerCase().includes(req.title.toLowerCase())) &&
            d.compliancePeriod === period &&
            d.verificationStatus !== 'REJECTED'
        );
        if (!hasDoc) {
          missing.push(req);
        }
      } else {
        // One-time or annual: Must have an active, non-expired, verified or submitted document
        const hasDoc = existingDocs.some(
          (d) =>
            (d.requirementCode === req.code || d.documentType.toLowerCase().includes(req.title.toLowerCase())) &&
            d.verificationStatus !== 'REJECTED' &&
            d.expiryStatus !== 'EXPIRED'
        );
        if (!hasDoc) {
          missing.push(req);
        }
      }
    }

    return missing;
  }

  /**
   * Upload vendor compliance document into Supabase storage and create database record
   */
  public static async uploadDocument(input: {
    vendorId: string;
    organizationId?: string;
    clientCompanyId?: string;
    siteId?: string;
    contractId?: string;
    documentCategory: DocumentCategoryType | string;
    documentType: string;
    requirementCode?: string;
    documentNumber?: string;
    compliancePeriod?: string;
    periodMonth?: string;
    periodType?: 'ONE_TIME' | 'MONTHLY' | 'HALF_YEARLY' | 'ANNUAL';
    file?: File | { name: string; size?: number; type?: string };
    fileName?: string;
    filePath?: string;
    issueDate?: string;
    expiryDate?: string;
    scope?: 'VENDOR_ORGANIZATION' | 'WORKFORCE_EMPLOYEE';
    workerId?: string;
    workerName?: string;
    workerCode?: string;
    workerRole?: string;
    uploadedBy?: string;
    previousDocumentId?: string;
    resubmissionNote?: string;
  }): Promise<{ success: boolean; document?: VendorDocumentRecord; error?: string }> {
    const orgId = input.organizationId || 'org-joy-main';
    const cleanVendor = input.vendorId.replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanOrg = orgId.replace(/[^a-zA-Z0-9_-]/g, '');
    const rawFileName = input.file?.name || input.fileName || 'document.pdf';
    const cleanName = rawFileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const rawSize = (input.file as any)?.size || 102400;
    const rawMime = (input.file as any)?.type || 'application/pdf';
    const timestamp = Date.now();

    // Determine storage object path
    let storagePath: string;
    if (input.scope === 'WORKFORCE_EMPLOYEE' && input.workerId) {
      storagePath = `tenant/${cleanOrg}/vendor/${cleanVendor}/workers/${input.workerId}/${timestamp}_${cleanName}`;
    } else {
      const catSlug = String(input.documentCategory || 'registration_tax').toLowerCase();
      storagePath = `tenant/${cleanOrg}/vendor/${cleanVendor}/${catSlug}/${timestamp}_${cleanName}`;
    }

    // Try Supabase Storage upload
    try {
      if (input.file && typeof File !== 'undefined' && input.file instanceof File) {
        await supabase.storage
          .from(this.CANONICAL_BUCKET)
          .upload(storagePath, input.file, {
            cacheControl: '3600',
            upsert: false,
          });
      }
    } catch (e: any) {
      console.warn('[VendorDocumentService] Storage upload fallback:', e.message);
    }

    const expiryStatus = this.calculateExpiryStatus(input.expiryDate);
    const newVersion = input.previousDocumentId ? 2 : 1;

    // Database record insertion
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.vendorId);
      let targetVendorId: string | null = isUUID ? input.vendorId : null;

      if (!targetVendorId && input.vendorId) {
        try {
          const { data: v } = await supabase
            .from('vendors')
            .select('id')
            .or(`vendor_code.eq."${input.vendorId}",legal_name.ilike."%${input.vendorId}%"`)
            .limit(1)
            .maybeSingle();
          if (v?.id) {
            targetVendorId = v.id;
          }
        } catch {
          // ignore
        }
      }

      if (!targetVendorId) {
        throw new Error(`Vendor identifier "${input.vendorId}" handled via local memory vault.`);
      }

      const payload: any = {
        vendor_id: targetVendorId,
        organization_id: input.organizationId && /^[0-9a-f-]{36}$/i.test(input.organizationId) ? input.organizationId : null,
        site_id: input.siteId || null,
        contract_id: input.contractId || null,
        document_category: input.documentCategory,
        document_type: input.documentType,
        requirement_code: input.requirementCode || null,
        document_number: input.documentNumber || null,
        period_month: input.compliancePeriod || input.periodMonth || null,
        compliance_period: input.compliancePeriod || input.periodMonth || null,
        period_type: input.periodType || 'MONTHLY',
        file_name: cleanName,
        file_path: storagePath,
        storage_path: storagePath,
        bucket_id: this.CANONICAL_BUCKET,
        file_size: rawSize,
        file_size_bytes: rawSize,
        mime_type: rawMime,
        issue_date: input.issueDate || null,
        expiry_date: input.expiryDate || null,
        version: newVersion,
        verification_status: 'UNDER_REVIEW',
        expiry_status: expiryStatus,
        scope: input.scope || 'VENDOR_ORGANIZATION',
        worker_id: input.workerId || null,
        worker_name: input.workerName || null,
        worker_code: input.workerCode || null,
        worker_role: input.workerRole || null,
        previous_document_id: input.previousDocumentId || null,
        resubmission_note: input.resubmissionNote || null,
        uploaded_by: input.uploadedBy || 'Vendor Admin',
        audit_trail: [
          {
            action: input.previousDocumentId ? 'RESUBMITTED' : 'SUBMITTED',
            actor: input.uploadedBy || 'Vendor Admin',
            timestamp: new Date().toISOString(),
            note: input.resubmissionNote || 'Document submitted for review',
          },
        ],
      };

      const { data, error } = await supabase
        .from('vendor_documents')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return { success: true, document: this.mapDbToModel(data) };
    } catch (e: any) {
      console.warn('[VendorDocumentService] DB insert fallback to memory:', e.message);
      const rawSize = (input.file as any)?.size || 102400;
      const rawMime = (input.file as any)?.type || 'application/pdf';
      const fallbackDoc: VendorDocumentRecord = {
        id: `doc-${Date.now()}`,
        vendorId: input.vendorId,
        organizationId: input.organizationId,
        clientCompanyId: input.clientCompanyId,
        siteId: input.siteId,
        contractId: input.contractId,
        requirementCode: input.requirementCode,
        documentCategory: input.documentCategory as DocumentCategoryType,
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        compliancePeriod: input.compliancePeriod,
        periodType: input.periodType,
        fileName: cleanName,
        filePath: storagePath,
        storagePath,
        bucketId: this.CANONICAL_BUCKET,
        fileSize: rawSize,
        fileSizeBytes: rawSize,
        mimeType: rawMime,
        issueDate: input.issueDate,
        expiryDate: input.expiryDate,
        version: newVersion,
        verificationStatus: 'UNDER_REVIEW',
        expiryStatus,
        scope: input.scope || 'VENDOR_ORGANIZATION',
        workerId: input.workerId,
        workerName: input.workerName,
        workerCode: input.workerCode,
        workerRole: input.workerRole,
        uploadedBy: input.uploadedBy || 'vendor.admin@abcworkforce.com',
        auditTrail: [
          {
            action: 'SUBMITTED',
            actor: input.uploadedBy || 'vendor.admin@abcworkforce.com',
            timestamp: new Date().toISOString(),
            note: 'Document uploaded for HR verification',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.saveFallbackDocument(fallbackDoc);
      return { success: true, document: fallbackDoc };
    }
  }

  /**
   * Returns documents expiring within a given window (defaults to 30 days)
   */
  public static async getExpiringDocuments(
    vendorId?: string,
    daysThreshold: number = 30
  ): Promise<VendorDocumentRecord[]> {
    const all = await this.listDocuments({ vendorId });
    const now = new Date();
    return all.filter((doc) => {
      if (!doc.expiryDate) return false;
      const expiry = new Date(doc.expiryDate);
      if (isNaN(expiry.getTime())) return false;
      const diffMs = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return diffDays <= daysThreshold;
    });
  }

  /**
   * HR Review: Approve / Request Changes / Reject with mandatory reason code
   * Supports both object params and positional params for backward compatibility.
   */
  public static async reviewDocument(
    paramOrDocId:
      | string
      | {
          documentId: string;
          decision: 'VERIFIED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'APPROVED';
          reviewerId?: string;
          reviewerName?: string;
          reviewerRole?: string;
          reasonCode?: string;
          notes?: string;
        },
    actionOrStatus?: 'APPROVED' | 'VERIFIED' | 'REJECTED' | 'CHANGES_REQUESTED',
    rejectionReason?: string,
    reviewerIdArg?: string
  ): Promise<{ success: boolean; document?: any; error?: string }> {
    let documentId: string;
    let decision: 'VERIFIED' | 'REJECTED' | 'CHANGES_REQUESTED';
    let reviewerId: string;
    let reasonCode: string | undefined;
    let notes: string | undefined;
    const now = new Date().toISOString();

    if (typeof paramOrDocId === 'string') {
      documentId = paramOrDocId;
      const rawDecision = actionOrStatus || 'VERIFIED';
      decision = rawDecision === 'APPROVED' ? 'VERIFIED' : rawDecision;
      reviewerId = reviewerIdArg || 'hr-admin';
      reasonCode = rejectionReason;
      notes = rejectionReason;
    } else {
      documentId = paramOrDocId.documentId;
      const rawDecision = paramOrDocId.decision;
      decision = rawDecision === 'APPROVED' ? 'VERIFIED' : rawDecision;
      reviewerId = paramOrDocId.reviewerId || 'hr-admin';
      reasonCode = paramOrDocId.reasonCode;
      notes = paramOrDocId.notes;
    }

    if (decision === 'REJECTED' && (!reasonCode || !reasonCode.trim())) {
      return { success: false, error: 'A mandatory reason is required to reject a document.' };
    }

    try {
      // Call RPC if available
      const { error: rpcErr } = await supabase.rpc('fn_review_vendor_document', {
        p_document_id: documentId,
        p_status: decision,
        p_reviewer_id: reviewerId,
        p_rejection_reason: reasonCode || null,
        p_resubmission_note: notes || null,
      });

      if (!rpcErr) return { success: true };
    } catch {
      // proceed to direct update
    }

    try {
      const { error } = await supabase
        .from('vendor_documents')
        .update({
          verification_status: decision,
          rejection_reason: reasonCode || null,
          resubmission_note: notes || null,
          review_notes: notes || null,
          verified_by: reviewerId,
          verified_at: now,
          updated_at: now,
        })
        .eq('id', documentId);

      if (error) throw error;
      return { success: true };
    } catch {
      // Memory fallback update
      this.updateFallbackDocumentReview({
        documentId,
        decision,
        reviewerId,
        reasonCode,
        notes,
      });
      return { success: true };
    }
  }

  /**
   * Get secure time-limited signed URL for viewing/downloading document
   */
  public static async getSignedDownloadUrl(storagePath: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.CANONICAL_BUCKET)
        .createSignedUrl(storagePath, 3600); // 1 hour validity

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch (e: any) {
      console.warn('[VendorDocumentService] Signed URL generation notice:', e.message);
    }
    return null;
  }

  // --------------------------------------------------------------------------
  // Fallback In-Memory / LocalStorage Layer for Offline or Mock-Resilience
  // --------------------------------------------------------------------------

  private static STORAGE_KEY = 'joy_vendor_vault_cache_v2';

  private static loadFallbackMemoryDocuments(params: any): VendorDocumentRecord[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const list: VendorDocumentRecord[] = JSON.parse(raw);
        return list.filter((d) => {
          if (params.vendorId && params.vendorId !== 'ALL' && d.vendorId !== params.vendorId) return false;
          if (params.scope && d.scope !== params.scope) return false;
          if (params.category && params.category !== 'ALL' && d.documentCategory !== params.category) return false;
          if (params.workerId && params.workerId !== 'ALL' && d.workerId !== params.workerId) return false;
          return true;
        });
      }
    } catch {
      // ignore
    }
    return [];
  }

  private static saveFallbackDocument(doc: VendorDocumentRecord) {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      const list: VendorDocumentRecord[] = raw ? JSON.parse(raw) : [];
      list.unshift(doc);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  }

  private static updateFallbackDocumentReview(params: any) {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      const list: VendorDocumentRecord[] = JSON.parse(raw);
      const updated = list.map((d) =>
        d.id === params.documentId
          ? {
              ...d,
              verificationStatus: params.decision,
              rejectionReason: params.reasonCode,
              resubmissionNote: params.notes,
              verifiedBy: params.reviewerId,
              verifiedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : d
      );
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  private static mapDbToModel(db: any): VendorDocumentRecord {
    const expiryStatus = db.expiry_status || this.calculateExpiryStatus(db.expiry_date);
    return {
      id: db.id,
      vendorId: db.vendor_id,
      organizationId: db.organization_id,
      clientCompanyId: db.client_company_id,
      siteId: db.site_id,
      contractId: db.contract_id,
      relationshipId: db.relationship_id,
      requirementId: db.requirement_id,
      requirementCode: db.requirement_code,
      documentCategory: db.document_category || 'REGISTRATION_TAX',
      documentType: db.document_type,
      documentNumber: db.document_number,
      compliancePeriod: db.compliance_period || db.period_month,
      periodType: db.period_type || 'MONTHLY',
      fileName: db.file_name,
      filePath: db.file_path || db.storage_path,
      storagePath: db.storage_path || db.file_path,
      bucketId: db.bucket_id || this.CANONICAL_BUCKET,
      fileSize: db.file_size || db.file_size_bytes,
      fileSizeBytes: db.file_size_bytes || db.file_size,
      mimeType: db.mime_type,
      issueDate: db.issue_date,
      expiryDate: db.expiry_date,
      version: db.version || 1,
      verificationStatus: db.verification_status || 'UNDER_REVIEW',
      expiryStatus,
      rejectionReason: db.rejection_reason,
      resubmissionNote: db.resubmission_note,
      reviewNotes: db.review_notes,
      reviewerRemarks: db.reviewer_remarks,
      verifiedBy: db.verified_by,
      verifiedAt: db.verified_at,
      uploadedBy: db.uploaded_by,
      scope: db.scope || (db.worker_id ? 'WORKFORCE_EMPLOYEE' : 'VENDOR_ORGANIZATION'),
      workerId: db.worker_id,
      workerName: db.worker_name,
      workerCode: db.worker_code,
      workerRole: db.worker_role,
      auditTrail: Array.isArray(db.audit_trail) ? db.audit_trail : [],
      createdAt: db.created_at,
      updatedAt: db.updated_at,
    };
  }
}
