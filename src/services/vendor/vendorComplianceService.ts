// src/services/vendor/vendorComplianceService.ts
// ============================================================================
// Joy People HR — Vendor Compliance & Statutory Document Management Service
// Multi-Tenant, Period-Scoped Document Governance Engine
// ============================================================================

import {
  VendorComplianceDocument,
  ComplianceDocumentCategory,
  DocumentLifecycleStatus,
  CompliancePeriodType,
} from '../../types/vendorPortal';

export interface DocumentRequirementDefinition {
  documentType: string;
  category: ComplianceDocumentCategory;
  periodType: CompliancePeriodType;
  title: string;
  description: string;
  isMandatory: boolean;
  officialPortalUrl?: string;
  externalRefLabel?: string;
}

export const STANDARD_COMPLIANCE_REQUIREMENTS: DocumentRequirementDefinition[] = [
  // 1. Company Registration (One-time)
  {
    documentType: 'GSTIN_CERTIFICATE',
    category: 'COMPANY_REGISTRATION',
    periodType: 'ONE_TIME',
    title: 'GSTIN Registration Certificate',
    description: 'Valid GST Registration Certificate (Form REG-06)',
    isMandatory: true,
  },
  {
    documentType: 'PAN_CARD',
    category: 'COMPANY_REGISTRATION',
    periodType: 'ONE_TIME',
    title: 'Company PAN Card',
    description: 'Permanent Account Number Card copy',
    isMandatory: true,
  },
  {
    documentType: 'MSME_UDYAM',
    category: 'COMPANY_REGISTRATION',
    periodType: 'ONE_TIME',
    title: 'MSME / Udyam Registration',
    description: 'Udyam Registration Certificate',
    isMandatory: false,
  },
  {
    documentType: 'CANCELLED_CHEQUE',
    category: 'COMPANY_REGISTRATION',
    periodType: 'ONE_TIME',
    title: 'Cancelled Cheque',
    description: 'Cancelled Cheque for registered bank account verification',
    isMandatory: true,
  },
  {
    documentType: 'INCORPORATION_CERTIFICATE',
    category: 'COMPANY_REGISTRATION',
    periodType: 'ONE_TIME',
    title: 'Certificate of Incorporation / MOA / AOA',
    description: 'MCA Certificate of Incorporation, MOA/AOA or Partnership Deed',
    isMandatory: true,
  },
  {
    documentType: 'SEZ_LUTC_COPY',
    category: 'COMPANY_REGISTRATION',
    periodType: 'ONE_TIME',
    title: 'SEZ-Related LUTC Copy',
    description: 'Letter of Undertaking and Compliance for SEZ clients',
    isMandatory: false,
  },

  // 2. Monthly Statutory & Payroll Documents
  {
    documentType: 'MONTHLY_INVOICE',
    category: 'PAYROLL_INVOICE',
    periodType: 'MONTHLY',
    title: 'Monthly Tax Invoice',
    description: 'Monthly service invoice with GST & service charge breakdown',
    isMandatory: true,
  },
  {
    documentType: 'ESI_CHALLAN',
    category: 'STATUTORY_ESI_PF',
    periodType: 'MONTHLY',
    title: 'ESI Monthly Challan',
    description: 'ESIC Monthly Paid Challan with CPIN/Challan Reference',
    isMandatory: true,
    officialPortalUrl: 'https://www.esic.gov.in',
    externalRefLabel: 'ESI Challan Number',
  },
  {
    documentType: 'ESI_STATEMENT_SUMMARY',
    category: 'STATUTORY_ESI_PF',
    periodType: 'MONTHLY',
    title: 'ESI Contribution Statement & Summary',
    description: 'Detailed IP-wise ESI contribution summary sheet (Excel/PDF)',
    isMandatory: true,
    officialPortalUrl: 'https://www.esic.gov.in',
  },
  {
    documentType: 'PF_CHALLAN_TRRN',
    category: 'STATUTORY_ESI_PF',
    periodType: 'MONTHLY',
    title: 'PF Electronic Challan Return (ECR) / TRRN',
    description: 'EPFO Monthly Challan with TRRN number and bank confirmation',
    isMandatory: true,
    officialPortalUrl: 'https://unifiedportal-epfo.epfindia.gov.in',
    externalRefLabel: 'TRRN Number',
  },
  {
    documentType: 'PF_STATEMENT_SUMMARY',
    category: 'STATUTORY_ESI_PF',
    periodType: 'MONTHLY',
    title: 'PF UAN Contribution Statement',
    description: 'UAN-wise monthly PF contribution list (Excel / PDF)',
    isMandatory: true,
    officialPortalUrl: 'https://unifiedportal-epfo.epfindia.gov.in',
  },
  {
    documentType: 'SALARY_PAID_STATEMENT',
    category: 'PAYROLL_INVOICE',
    periodType: 'MONTHLY',
    title: 'Bank Salary Paid Statement / Disbursal Proof',
    description: 'Bank NEFT/RTGS transaction reference showing wages disbursed',
    isMandatory: true,
  },
  {
    documentType: 'SALARY_SLIP_ACKNOWLEDGEMENT',
    category: 'PAYROLL_INVOICE',
    periodType: 'MONTHLY',
    title: 'Salary Slip Acknowledgement / Register Form XXVI',
    description: 'Signed/Acknowledged worker salary register or slip receipts',
    isMandatory: true,
  },
  {
    documentType: 'DEDUCTION_VOUCHERS',
    category: 'PAYROLL_INVOICE',
    periodType: 'MONTHLY',
    title: 'Deduction & Recovery Vouchers',
    description: 'Supporting documents for canteen, room rent, damages, or fines',
    isMandatory: false,
  },

  // 3. Yearly & Half-Yearly Compliance Documents
  {
    documentType: 'CONTRACT_LABOUR_LICENSE',
    category: 'LABOUR_LICENSE',
    periodType: 'ANNUAL',
    title: 'Contract Labour (CLRA) License (Form VI)',
    description: 'Valid CLRA License issued by the Licensing Officer for client site',
    isMandatory: true,
    officialPortalUrl: 'https://shramsuvidha.gov.in',
  },
  {
    documentType: 'MIGRANT_LABOUR_LICENSE',
    category: 'LABOUR_LICENSE',
    periodType: 'ANNUAL',
    title: 'Inter-State Migrant Workmen License',
    description: 'ISMW License under Interstate Migrant Workmen Act',
    isMandatory: false,
    officialPortalUrl: 'https://shramsuvidha.gov.in',
  },
  {
    documentType: 'HALF_YEARLY_ANNUAL_RETURNS',
    category: 'RETURNS_AND_REPORTS',
    periodType: 'ANNUAL',
    title: 'Half-Yearly / Annual Statutory Returns',
    description: 'Form XXIV / Form XXV Returns submitted to the Labour Dept',
    isMandatory: true,
  },
  {
    documentType: 'PT_LWF_COMPLIANCE_PROOF',
    category: 'RETURNS_AND_REPORTS',
    periodType: 'ANNUAL',
    title: 'Professional Tax & Labour Welfare Fund Proof',
    description: 'State PT returns and annual LWF contribution challan (e.g. TN LWF)',
    isMandatory: true,
  },
  {
    documentType: 'LEAVE_WAGE_PAID_STATEMENT',
    category: 'LEAVE_WAGE_STATEMENT',
    periodType: 'ANNUAL',
    title: 'Leave With Wages Paid Statement',
    description: 'Annual accumulated leave wage payment statement / Register Form XV',
    isMandatory: true,
  },
];

export class VendorComplianceService {
  private inMemoryDocuments: Map<string, VendorComplianceDocument> = new Map();

  constructor() {
    // Zero-mock policy: In-memory document storage starts empty and stores only authentic uploaded records
  }

  /**
   * List documents with strict multi-tenant isolation
   */
  public listDocuments(params: {
    organizationId: string;
    vendorId: string;
    reportingPeriod?: string;
    category?: ComplianceDocumentCategory;
    status?: DocumentLifecycleStatus;
  }): VendorComplianceDocument[] {
    const results: VendorComplianceDocument[] = [];
    for (const doc of this.inMemoryDocuments.values()) {
      if (doc.organizationId !== params.organizationId || doc.vendorId !== params.vendorId) {
        continue;
      }
      if (params.reportingPeriod && doc.reportingPeriod !== params.reportingPeriod) {
        continue;
      }
      if (params.category && doc.category !== params.category) {
        continue;
      }
      if (params.status && doc.status !== params.status) {
        continue;
      }
      results.push(doc);
    }
    return results;
  }

  /**
   * Submit or upload a compliance document
   */
  public submitDocument(
    doc: Omit<VendorComplianceDocument, 'id' | 'version' | 'status' | 'uploadedAt'>
  ): VendorComplianceDocument {
    const id = `doc-${doc.vendorId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newDoc: VendorComplianceDocument = {
      ...doc,
      id,
      version: 1,
      status: 'SUBMITTED',
      uploadedAt: new Date().toISOString(),
    };
    this.inMemoryDocuments.set(newDoc.id, newDoc);
    return newDoc;
  }

  /**
   * Maker-Checker Verification Action by Client HR / Auditor
   */
  public verifyDocument(params: {
    documentId: string;
    organizationId: string;
    reviewerId: string;
    action: 'VERIFY' | 'REJECT';
    remarks: string;
  }): VendorComplianceDocument {
    const doc = this.inMemoryDocuments.get(params.documentId);
    if (!doc) {
      throw new Error(`Compliance document ${params.documentId} not found`);
    }
    if (doc.organizationId !== params.organizationId) {
      throw new Error(`Cross-tenant document verification attempt blocked`);
    }

    doc.status = params.action === 'VERIFY' ? 'VERIFIED' : 'REJECTED';
    doc.verifiedBy = params.reviewerId;
    doc.verifiedAt = new Date().toISOString();
    doc.reviewerRemarks = params.remarks;
    this.inMemoryDocuments.set(doc.id, doc);
    return doc;
  }

  /**
   * Get compliance health overview metrics
   */
  public getComplianceMetrics(organizationId: string, vendorId: string, reportingPeriod: string) {
    const docs = this.listDocuments({ organizationId, vendorId, reportingPeriod });
    const totalRequired = STANDARD_COMPLIANCE_REQUIREMENTS.filter(
      r => r.periodType === 'MONTHLY' || r.periodType === 'ONE_TIME'
    ).length;

    const verified = docs.filter(d => d.status === 'VERIFIED').length;
    const submitted = docs.filter(d => d.status === 'SUBMITTED' || d.status === 'UNDER_REVIEW').length;
    const rejected = docs.filter(d => d.status === 'REJECTED').length;
    const missing = Math.max(0, totalRequired - (verified + submitted));

    return {
      reportingPeriod,
      totalRequired,
      verified,
      submitted,
      rejected,
      missing,
      complianceScorePercentage: totalRequired > 0 ? Math.round((verified / totalRequired) * 100) : 100,
    };
  }
}

export const vendorComplianceService = new VendorComplianceService();
