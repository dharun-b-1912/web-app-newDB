// src/types/storage.ts
// ============================================================================
// JOY PeopleHR — Enterprise Storage & Document Vault Architecture Types
// ============================================================================

export type StorageDocumentCategory =
  | 'PROFILE_PHOTO'
  | 'IDENTITY_DOCUMENT'
  | 'STATUTORY_DOCUMENT'
  | 'BANK_DOCUMENT'
  | 'CONTRACT'
  | 'COMPLIANCE_PROOF'
  | 'PAYSLIP'
  | 'BILLING_EXPORT'
  | 'TAX_INVOICE'
  | 'LETTER'
  | 'OTHER_APPROVED';

export type StorageEntityType =
  | 'EMPLOYEE'
  | 'VENDOR'
  | 'CLIENT'
  | 'BILLING'
  | 'SYSTEM'
  | 'HR_INTERNAL';

export type StorageVerificationStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED';

export type StorageObjectStatus =
  | 'ACTIVE'
  | 'REPLACED'
  | 'ARCHIVED'
  | 'DELETED';

export type CanonicalStorageBucket =
  // Canonical production buckets (primary targets)
  | 'peoplehr-profile-media'
  | 'peoplehr-employee-documents'
  | 'peoplehr-vendor-documents'
  | 'peoplehr-payslips'
  // Legacy buckets (maintained for zero-downtime fallback — deprecated)
  | 'vendor-private-documents'
  | 'employee-private-documents'
  | 'employee-profile-media'
  | 'payslips-private'
  | 'peoplehr-private-documents'
  | 'peoplehr-private-profile-media'
  | 'employee-documents'
  | 'employee_documents'
  | 'documents'
  | 'payslips'
  | 'avatars';


export interface StorageDocumentRecord {
  id: string;
  tenant_id: string;
  organization_id: string;
  bucket_id: CanonicalStorageBucket | string;
  object_path: string;
  original_file_name: string;
  display_file_name: string;
  file_category: StorageDocumentCategory;
  document_type: string;
  entity_type: StorageEntityType;
  entity_id: string;
  employee_id?: string;
  vendor_id?: string;
  client_company_id?: string;
  site_id?: string;
  uploaded_by: string;
  uploaded_at: string;
  mime_type: string;
  file_size_bytes: number;
  checksum_sha256?: string;
  verification_status: StorageVerificationStatus;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  expiry_date?: string;
  metadata_version: number;
  status: StorageObjectStatus;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  // Human readable UI enrichment
  entity_display_name?: string;
  entity_code?: string;
  signed_url?: string;
}

export interface StorageUploadPayload {
  tenantId?: string;
  organizationId: string;
  entityType: StorageEntityType;
  entityId: string;
  employeeId?: string;
  vendorId?: string;
  clientCompanyId?: string;
  siteId?: string;
  fileCategory: StorageDocumentCategory;
  documentType: string;
  fileName: string;
  file: File | Blob;
  uploadedBy?: string;
  expiryDate?: string;
}

export interface StorageSignedUrlResult {
  signedUrl: string;
  expiresAt: string;
  bucketId: string;
  objectPath: string;
}

export interface StorageHierarchyNode {
  id: string;
  label: string;
  type: 'TENANT' | 'ORGANIZATION' | 'SECTION' | 'ENTITY_GROUP' | 'ENTITY' | 'CATEGORY';
  icon?: string;
  count?: number;
  children?: StorageHierarchyNode[];
  metadata?: {
    tenantId?: string;
    organizationId?: string;
    entityType?: StorageEntityType;
    entityId?: string;
    category?: StorageDocumentCategory;
    status?: string;
  };
}
