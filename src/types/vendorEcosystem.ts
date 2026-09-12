// src/types/vendorEcosystem.ts
// ============================================================================
// JOY PeopleHR — Vendor Ecosystem & Onboarding Domain Types
// Authoritative Definitions for Lifecycle State Machine, Compliance & Invitations
// ============================================================================

export type VendorOnboardingStatus =
  | 'INVITED'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CORRECTION_REQUIRED'
  | 'RESUBMITTED'
  | 'APPROVED'
  | 'ACTIVE'
  | 'PENDING_VERIFICATION'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'TERMINATED'
  | 'INACTIVE';

export type VendorConstitutionType =
  | 'PRIVATE_LIMITED'
  | 'PUBLIC_LIMITED'
  | 'LLP'
  | 'PARTNERSHIP'
  | 'PROPRIETORSHIP'
  | 'OTHER';

export type MSMEStatus = 'YES' | 'NO' | 'NOT_APPLICABLE';

export type VendorServiceCategory =
  | 'Contract Labour'
  | 'Security'
  | 'Housekeeping'
  | 'Facility Management'
  | 'Transport'
  | 'Canteen'
  | 'Technical & Engineering'
  | 'Other';

export interface VendorInvitation {
  id: string;
  vendor_id: string;
  organization_id: string;
  company_id: string;
  target_email: string;
  target_phone?: string;
  target_name: string;
  invitation_token: string;
  token?: string;
  invite_url: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expires_at: string;
  accepted_at?: string;
  created_by?: string;
  created_at: string;
}

export interface VendorComplianceRequirement {
  document_type: string;
  label: string;
  mandatory: boolean;
  conditional: boolean;
  condition_description: string;
  is_applicable: (vendor: {
    vendor_type: string;
    constitution_type: VendorConstitutionType;
    is_gst_applicable: boolean;
    msme_registered: MSMEStatus;
    has_vehicles?: boolean;
    has_epf?: boolean;
    has_esi?: boolean;
    requires_clra_form_v?: boolean;
    has_labour_licence?: boolean;
  }) => boolean;
  requires_expiry: boolean;
  issuing_authority?: string;
}

export interface VendorBusinessProfilePayload {
  legal_name: string;
  trade_name?: string;
  vendor_type: string;
  constitution_type: VendorConstitutionType;
  registered_address: string;
  communication_address?: string;
  city: string;
  state: string;
  postal_code: string;
  contact_person: string;
  email: string;
  mobile: string;
}

export interface VendorTaxPayload {
  pan: string;
  gstin?: string;
  is_gst_applicable: boolean;
  gst_exemption_reason?: string;
  business_registration_number?: string;
  state: string;
  district?: string;
  postal_code: string;
}

export interface VendorMSMEPayload {
  msme_registered: MSMEStatus;
  udyam_registration_number?: string;
  msme_certificate_url?: string;
  exemption_reason?: string;
}

export interface VendorCommercialAgreementPayload {
  agreement_number: string;
  contract_start_date: string;
  contract_end_date: string;
  service_category: VendorServiceCategory;
  contract_scope: string;
  rate_card_type: string;
  billing_frequency: string;
  payment_terms: string;
  service_charge_percentage: number;
  max_workforce_capacity: number;
  agreement_document_url?: string;
}

export interface VendorBankDetailsPayload {
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  bank_branch: string;
  cancelled_cheque_document_url?: string;
}

export interface VendorStatutoryPayload {
  epf_applicable: boolean;
  epf_registration_number?: string;
  epf_certificate_url?: string;
  esi_applicable: boolean;
  esi_registration_number?: string;
  esi_certificate_url?: string;
  labour_licence_applicable: boolean;
  labour_licence_number?: string;
  labour_licence_document_url?: string;
  form_v_applicable: boolean;
  rc_applicable: boolean;
  rc_document_url?: string;
}

export interface VendorOnboardingSubmission {
  vendor_id: string;
  business_profile: VendorBusinessProfilePayload;
  tax_details: VendorTaxPayload;
  msme_details: VendorMSMEPayload;
  commercial_agreement: VendorCommercialAgreementPayload;
  bank_details: VendorBankDetailsPayload;
  statutory_details: VendorStatutoryPayload;
  uploaded_documents: Array<{
    document_type: string;
    document_name: string;
    file_name: string;
    file_url: string;
    file_size_bytes?: number;
    expiry_date?: string;
  }>;
}

export interface VendorCorrectionRequest {
  vendor_id: string;
  reason: string;
  requested_by: string;
  requested_at: string;
  fields_to_correct?: string[];
}
