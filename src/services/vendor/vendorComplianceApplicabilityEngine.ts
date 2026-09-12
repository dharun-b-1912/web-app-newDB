// src/services/vendor/vendorComplianceApplicabilityEngine.ts
// ============================================================================
// JOY PeopleHR — Configurable Vendor Compliance & Applicability Engine
// Strictly enforces mandatory vs conditional requirements (Proprietorships, MSME,
// GST exemptions, RC transport, Form V, ESI/EPF conditional rules)
// ============================================================================

import {
  VendorConstitutionType,
  MSMEStatus,
  VendorComplianceRequirement,
  VendorOnboardingSubmission,
} from '../../types/vendorEcosystem';

export interface VendorEvaluationContext {
  vendor_type: string;
  constitution_type: VendorConstitutionType;
  is_gst_applicable: boolean;
  gst_exemption_reason?: string;
  msme_registered: MSMEStatus;
  udyam_registration_number?: string;
  has_vehicles?: boolean;
  has_epf?: boolean;
  has_esi?: boolean;
  requires_clra_form_v?: boolean;
  has_labour_licence?: boolean;
}

export interface ComplianceEvaluationResult {
  isCompliant: boolean;
  isReadyForSubmission: boolean;
  isReadyForActivation: boolean;
  applicableRequirements: string[];
  missingRequirements: string[];
  satisfiedRequirements: string[];
  warnings: string[];
}

export class VendorComplianceApplicabilityEngine {
  /**
   * Authoritative registry of all potential compliance requirements with conditional applicability rules
   */
  public static readonly REQUIREMENTS: VendorComplianceRequirement[] = [
    {
      document_type: 'PAN_CARD',
      label: 'Permanent Account Number (PAN)',
      mandatory: true,
      conditional: false,
      condition_description: 'Universally mandatory for all business entities and proprietorships',
      is_applicable: () => true,
      requires_expiry: false,
      issuing_authority: 'Income Tax Department of India',
    },
    {
      document_type: 'GST_CERTIFICATE',
      label: 'Goods & Services Tax (GSTIN) Certificate',
      mandatory: false,
      conditional: true,
      condition_description: 'Mandatory unless turnover is below statutory threshold or exempted',
      is_applicable: (ctx) => ctx.is_gst_applicable === true,
      requires_expiry: false,
      issuing_authority: 'CBIC / GSTN',
    },
    {
      document_type: 'MSME_CERTIFICATE',
      label: 'Udyam MSME Certificate',
      mandatory: false,
      conditional: true,
      condition_description: 'Mandatory only if vendor indicates Udyam MSME registration',
      is_applicable: (ctx) => ctx.msme_registered === 'YES',
      requires_expiry: false,
      issuing_authority: 'Ministry of Micro, Small and Medium Enterprises',
    },
    {
      document_type: 'COMMERCIAL_AGREEMENT',
      label: 'Service Level Agreement / Contract (MSA)',
      mandatory: true,
      conditional: false,
      condition_description: 'Mandatory for commercial engagement before operational activation',
      is_applicable: () => true,
      requires_expiry: true,
      issuing_authority: 'Principal Employer & Vendor Mutual Execution',
    },
    {
      document_type: 'BANK_CANCELLED_CHEQUE',
      label: 'Bank Cancelled Cheque / Passbook',
      mandatory: true,
      conditional: false,
      condition_description: 'Mandatory before financial payout and payment mandate activation',
      is_applicable: () => true,
      requires_expiry: false,
      issuing_authority: 'Scheduled Commercial Bank',
    },
    {
      document_type: 'LABOUR_LICENCE',
      label: 'Contract Labour (Regulation & Abolition) Licence',
      mandatory: false,
      conditional: true,
      condition_description: 'Applicable only to contract labour and security manpower providers exceeding worker thresholds',
      is_applicable: (ctx) =>
        ctx.has_labour_licence === true ||
        (ctx.has_labour_licence !== false &&
          ['Contract Labour', 'Security', 'MANPOWER_PROVIDER', 'MANPOWER_STAFFING'].includes(ctx.vendor_type)),
      requires_expiry: true,
      issuing_authority: 'State / Central Labour Commissioner',
    },
    {
      document_type: 'FORM_V',
      label: 'Principal Employer Form V Certificate',
      mandatory: false,
      conditional: true,
      condition_description: 'Applicable when Principal Employer issues statutory Form V under CLRA',
      is_applicable: (ctx) => Boolean(ctx.requires_clra_form_v),
      requires_expiry: true,
      issuing_authority: 'Principal Employer',
    },
    {
      document_type: 'VEHICLE_RC',
      label: 'Vehicle Registration Certificate (RC)',
      mandatory: false,
      conditional: true,
      condition_description: 'Applicable strictly to transport, logistics, and vehicle fleet vendors',
      is_applicable: (ctx) =>
        ['Transport', 'Logistics', 'Fleet Management'].includes(ctx.vendor_type) || Boolean(ctx.has_vehicles),
      requires_expiry: true,
      issuing_authority: 'Regional Transport Office (RTO)',
    },
    {
      document_type: 'EPF_REGISTRATION',
      label: 'Employees Provident Fund (EPF) Registration Certificate',
      mandatory: false,
      conditional: true,
      condition_description: 'Applicable when vendor workforce is covered under EPFO provisions',
      is_applicable: (ctx) => Boolean(ctx.has_epf),
      requires_expiry: false,
      issuing_authority: 'Employees Provident Fund Organisation (EPFO)',
    },
    {
      document_type: 'ESI_REGISTRATION',
      label: 'Employees State Insurance (ESI) Registration Certificate',
      mandatory: false,
      conditional: true,
      condition_description: 'Applicable when vendor operates in ESI notified industrial areas with eligible staff',
      is_applicable: (ctx) => Boolean(ctx.has_esi),
      requires_expiry: false,
      issuing_authority: 'Employees State Insurance Corporation (ESIC)',
    },
  ];

  /**
   * Resolves the list of active requirements applicable to a specific vendor
   */
  public static getApplicableRequirements(context: VendorEvaluationContext): VendorComplianceRequirement[] {
    return this.REQUIREMENTS.filter((req) => req.is_applicable(context));
  }

  /**
   * Evaluates a complete vendor onboarding submission against applicable rules
   */
  public static evaluateSubmission(submission: VendorOnboardingSubmission): ComplianceEvaluationResult {
    const context: VendorEvaluationContext = {
      vendor_type: submission.business_profile.vendor_type,
      constitution_type: submission.business_profile.constitution_type,
      is_gst_applicable: submission.tax_details.is_gst_applicable,
      gst_exemption_reason: submission.tax_details.gst_exemption_reason,
      msme_registered: submission.msme_details.msme_registered,
      udyam_registration_number: submission.msme_details.udyam_registration_number,
      has_vehicles: submission.statutory_details.rc_applicable,
      has_epf: submission.statutory_details.epf_applicable,
      has_esi: submission.statutory_details.esi_applicable,
      requires_clra_form_v: submission.statutory_details.form_v_applicable,
      has_labour_licence: submission.statutory_details.labour_licence_applicable,
    };

    const applicable = this.getApplicableRequirements(context);
    const uploadedTypes = new Set(submission.uploaded_documents.map((d) => d.document_type));

    // Also check dedicated URL fields
    if (submission.tax_details.pan) uploadedTypes.add('PAN_CARD');
    if (submission.tax_details.gstin) uploadedTypes.add('GST_CERTIFICATE');
    if (submission.msme_details.msme_certificate_url) uploadedTypes.add('MSME_CERTIFICATE');
    if (submission.commercial_agreement.agreement_document_url) uploadedTypes.add('COMMERCIAL_AGREEMENT');
    if (submission.bank_details.cancelled_cheque_document_url) uploadedTypes.add('BANK_CANCELLED_CHEQUE');
    if (submission.statutory_details.labour_licence_document_url) uploadedTypes.add('LABOUR_LICENCE');
    if (submission.statutory_details.epf_certificate_url) uploadedTypes.add('EPF_REGISTRATION');
    if (submission.statutory_details.esi_certificate_url) uploadedTypes.add('ESI_REGISTRATION');
    if (submission.statutory_details.rc_document_url) uploadedTypes.add('VEHICLE_RC');

    const applicableList: string[] = [];
    const missingList: string[] = [];
    const satisfiedList: string[] = [];
    const warnings: string[] = [];

    for (const req of applicable) {
      applicableList.push(req.document_type);
      if (uploadedTypes.has(req.document_type)) {
        satisfiedList.push(req.document_type);
      } else {
        missingList.push(req.document_type);
      }
    }

    // Proprietary vendor warning check
    if (context.constitution_type === 'PROPRIETORSHIP' && !submission.business_profile.contact_person) {
      warnings.push('Proprietorship requires proprietor name in contact person');
    }

    // GST consistency check
    if (!context.is_gst_applicable && !context.gst_exemption_reason) {
      missingList.push('GST_EXEMPTION_REASON');
      warnings.push('GST is marked not applicable, but no exemption reason was provided');
    }

    // Bank completeness check
    const hasValidBank =
      Boolean(submission.bank_details.account_holder_name) &&
      Boolean(submission.bank_details.account_number) &&
      Boolean(submission.bank_details.ifsc_code) &&
      Boolean(submission.bank_details.bank_name);

    if (!hasValidBank) {
      missingList.push('BANK_ACCOUNT_DETAILS');
    }

    // Agreement completeness check
    const hasValidAgreement =
      Boolean(submission.commercial_agreement.agreement_number) &&
      Boolean(submission.commercial_agreement.contract_start_date) &&
      Boolean(submission.commercial_agreement.contract_end_date);

    if (!hasValidAgreement) {
      missingList.push('COMMERCIAL_AGREEMENT_METADATA');
    }

    const isCompliant = missingList.length === 0;
    const isReadyForSubmission =
      uploadedTypes.has('PAN_CARD') &&
      Boolean(submission.business_profile.legal_name) &&
      Boolean(submission.business_profile.email);

    const isReadyForActivation = isCompliant && hasValidBank && hasValidAgreement;

    return {
      isCompliant,
      isReadyForSubmission,
      isReadyForActivation,
      applicableRequirements: applicableList,
      missingRequirements: missingList,
      satisfiedRequirements: satisfiedList,
      warnings,
    };
  }
}
