// src/services/document/enterpriseStorageService.ts
// ============================================================================
// JOY PeopleHR — Enterprise Storage & Unified Document Vault Service
// Multi-Tenant Private-by-Default Architecture with Human-Readable UI Resolution
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import {
  StorageDocumentCategory,
  StorageEntityType,
  StorageDocumentRecord,
  StorageUploadPayload,
  StorageSignedUrlResult,
  StorageHierarchyNode,
  CanonicalStorageBucket,
} from '../../types/storage';

const STORAGE_DOCS_LOCAL_KEY = 'joy_peoplehr_storage_documents_v3';
const SIGNED_URL_TTL_SECONDS = 3600; // 1 hour

class EnterpriseStorageService {
  private signedUrlCache: Map<string, { url: string; expiresAt: number }> = new Map();

  /**
   * Local storage fallback store
   */
  private getLocalStore(): StorageDocumentRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_DOCS_LOCAL_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private setLocalStore(items: StorageDocumentRecord[]): void {
    try {
      localStorage.setItem(STORAGE_DOCS_LOCAL_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('[EnterpriseStorageService] Failed to persist local store:', e);
    }
  }

  /**
   * Determine canonical private bucket — always returns peoplehr-* canonical names.
   * Legacy bucket names (employee-profile-media, payslips-private, vendor-private-documents,
   * employee-private-documents) are deprecated. New uploads target the canonical buckets only.
   */
  public resolveBucket(category: StorageDocumentCategory, entityType?: StorageEntityType): CanonicalStorageBucket {
    if (category === 'PROFILE_PHOTO') {
      return 'peoplehr-profile-media';
    }
    if (category === 'PAYSLIP') {
      return 'peoplehr-payslips';
    }
    if (entityType === 'VENDOR' || category === 'CONTRACT' || category === 'COMPLIANCE_PROOF') {
      return 'peoplehr-vendor-documents';
    }
    return 'peoplehr-employee-documents';
  }

  /**
   * Build deterministic canonical object path
   * Format:
   * Employee: tenant/{tenant_id}/organization/{organization_id}/employee/{employee_id}/documents/{category}/{uuid}.{ext}
   * Profile:  tenant/{tenant_id}/organization/{organization_id}/employee/{employee_id}/profile/{uuid}.webp
   * Vendor:   tenant/{tenant_id}/vendor/{vendor_id}/documents/{category}/{uuid}.{ext}
   */
  public buildObjectPath(params: {
    tenantId: string;
    organizationId: string;
    entityType: StorageEntityType;
    entityId: string;
    category: StorageDocumentCategory;
    fileName: string;
  }): string {
    const cleanTenant = (params.tenantId || 'org-joy-01').replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanOrg = (params.organizationId || 'org-joy-01').replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanEntity = params.entityId.replace(/[^a-zA-Z0-9_-]/g, '');
    const ext = params.fileName.includes('.')
      ? params.fileName.substring(params.fileName.lastIndexOf('.'))
      : (params.category === 'PROFILE_PHOTO' ? '.webp' : '.pdf');

    const fileUniqueId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (params.category === 'PROFILE_PHOTO') {
      return `tenant/${cleanTenant}/organization/${cleanOrg}/employee/${cleanEntity}/profile/${fileUniqueId}${ext}`;
    }

    if (params.entityType === 'VENDOR') {
      return `tenant/${cleanTenant}/vendor/${cleanEntity}/documents/${params.category.toLowerCase()}/${fileUniqueId}${ext}`;
    }

    if (params.entityType === 'CLIENT') {
      return `tenant/${cleanTenant}/client/${cleanEntity}/documents/${params.category.toLowerCase()}/${fileUniqueId}${ext}`;
    }

    return `tenant/${cleanTenant}/organization/${cleanOrg}/employee/${cleanEntity}/documents/${params.category.toLowerCase()}/${fileUniqueId}${ext}`;
  }

  /**
   * Uploads file to private Supabase Storage bucket and creates metadata entry
   */
  public async uploadDocument(payload: StorageUploadPayload): Promise<{
    success: boolean;
    record?: StorageDocumentRecord;
    error?: string;
  }> {
    try {
      const tenantId = payload.tenantId || 'org-joy-01';
      const orgId = payload.organizationId || 'org-joy-01';
      const bucket = this.resolveBucket(payload.fileCategory);

      const objectPath = this.buildObjectPath({
        tenantId,
        organizationId: orgId,
        entityType: payload.entityType,
        entityId: payload.entityId,
        category: payload.fileCategory,
        fileName: payload.fileName,
      });

      const mimeType = payload.file.type || (payload.fileCategory === 'PROFILE_PHOTO' ? 'image/webp' : 'application/pdf');
      const fileSize = payload.file.size || 0;
      const recordId = `sdoc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      // 1. Upload to Supabase Storage Bucket
      if (isSupabaseEnabled) {
        try {
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(objectPath, payload.file, {
              contentType: mimeType,
              cacheControl: '3600',
              upsert: true,
            });

          if (uploadError) {
            // Backward compatibility fallback to legacy employee-documents bucket
            await supabase.storage
              .from('employee-documents')
              .upload(objectPath, payload.file, {
                contentType: mimeType,
                upsert: true,
              });
          }
        } catch (e) {
          console.warn('[EnterpriseStorageService] Storage binary upload fallback notice:', e);
        }
      }

      // 2. Construct Canonical Metadata Record
      const record: StorageDocumentRecord = {
        id: recordId,
        tenant_id: tenantId,
        organization_id: orgId,
        bucket_id: bucket,
        object_path: objectPath,
        original_file_name: payload.fileName,
        display_file_name: payload.fileName.replace(/^[0-9]+_/, '').replace(/\.[^/.]+$/, ''),
        file_category: payload.fileCategory,
        document_type: payload.documentType,
        entity_type: payload.entityType,
        entity_id: payload.entityId,
        employee_id: payload.employeeId || (payload.entityType === 'EMPLOYEE' ? payload.entityId : undefined),
        vendor_id: payload.vendorId || (payload.entityType === 'VENDOR' ? payload.entityId : undefined),
        client_company_id: payload.clientCompanyId,
        site_id: payload.siteId,
        uploaded_by: payload.uploadedBy || 'Authenticated User',
        uploaded_at: now,
        mime_type: mimeType,
        file_size_bytes: fileSize,
        verification_status: 'PENDING',
        status: 'ACTIVE',
        metadata_version: 1,
        created_at: now,
        updated_at: now,
      };

      // 3. Save to database table storage_documents
      if (isSupabaseEnabled) {
        try {
          const { error: dbError } = await supabase
            .from('storage_documents')
            .upsert(record);

          if (dbError) {
            console.warn('[EnterpriseStorageService] DB metadata upsert notice:', dbError.message);
          }
        } catch (err) {
          console.warn('[EnterpriseStorageService] DB metadata error:', err);
        }
      }

      // 4. Update local cache
      const localStore = this.getLocalStore();
      localStore.unshift(record);
      this.setLocalStore(localStore);

      return { success: true, record };
    } catch (err: any) {
      console.error('[EnterpriseStorageService] uploadDocument failed:', err);
      return { success: false, error: err.message || 'Upload failed' };
    }
  }

  /**
   * Generates a short-lived signed URL for secure private download/preview
   */
  public async getSignedUrl(
    bucketId: string,
    objectPath: string,
    expiresInSeconds: number = SIGNED_URL_TTL_SECONDS
  ): Promise<StorageSignedUrlResult | null> {
    const cacheKey = `${bucketId}:${objectPath}`;
    const cached = this.signedUrlCache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now + 60000) {
      return {
        signedUrl: cached.url,
        expiresAt: new Date(cached.expiresAt).toISOString(),
        bucketId,
        objectPath,
      };
    }

    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.storage
          .from(bucketId)
          .createSignedUrl(objectPath, expiresInSeconds);

        if (!error && data?.signedUrl) {
          const expiresAtMs = now + (expiresInSeconds * 1000);
          this.signedUrlCache.set(cacheKey, { url: data.signedUrl, expiresAt: expiresAtMs });
          return {
            signedUrl: data.signedUrl,
            expiresAt: new Date(expiresAtMs).toISOString(),
            bucketId,
            objectPath,
          };
        }

        // Fallback check on employee-documents if custom bucket failed
        if (bucketId !== 'employee-documents') {
          const { data: fallbackData } = await supabase.storage
            .from('employee-documents')
            .createSignedUrl(objectPath, expiresInSeconds);

          if (fallbackData?.signedUrl) {
            const expiresAtMs = now + (expiresInSeconds * 1000);
            return {
              signedUrl: fallbackData.signedUrl,
              expiresAt: new Date(expiresAtMs).toISOString(),
              bucketId: 'employee-documents',
              objectPath,
            };
          }
        }
      } catch (e) {
        console.warn('[EnterpriseStorageService] Error creating signed URL:', e);
      }
    }

    return null;
  }

  /**
   * Fetch all registered documents matching filter criteria with human-readable entity names
   */
  public async listDocuments(filters?: {
    tenantId?: string;
    organizationId?: string;
    entityType?: StorageEntityType;
    entityId?: string;
    employeeId?: string;
    vendorId?: string;
    fileCategory?: StorageDocumentCategory;
    verificationStatus?: string;
    searchQuery?: string;
  }): Promise<StorageDocumentRecord[]> {
    let records: StorageDocumentRecord[] = [];

    // 1. Fetch from database table if available
    if (isSupabaseEnabled) {
      try {
        let query = supabase
          .from('storage_documents')
          .select('*')
          .order('created_at', { ascending: false });

        if (filters?.entityType) query = query.eq('entity_type', filters.entityType);
        if (filters?.entityId) query = query.eq('entity_id', filters.entityId);
        if (filters?.employeeId) query = query.eq('employee_id', filters.employeeId);
        if (filters?.vendorId) query = query.eq('vendor_id', filters.vendorId);
        if (filters?.fileCategory) query = query.eq('file_category', filters.fileCategory);
        if (filters?.verificationStatus) query = query.eq('verification_status', filters.verificationStatus);

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          records = data as StorageDocumentRecord[];
        }
      } catch (err) {
        console.warn('[EnterpriseStorageService] Fetch DB documents warning:', err);
      }
    }

    // 2. Merge with local store if records are empty
    if (records.length === 0) {
      records = this.getLocalStore();
      if (filters?.entityType) records = records.filter(r => r.entity_type === filters.entityType);
      if (filters?.entityId) records = records.filter(r => r.entity_id === filters.entityId);
      if (filters?.employeeId) records = records.filter(r => r.employee_id === filters.employeeId);
      if (filters?.vendorId) records = records.filter(r => r.vendor_id === filters.vendorId);
      if (filters?.fileCategory) records = records.filter(r => r.file_category === filters.fileCategory);
      if (filters?.verificationStatus) records = records.filter(r => r.verification_status === filters.verificationStatus);
    }

    // 3. Search query filter
    if (filters?.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      records = records.filter(r =>
        r.display_file_name.toLowerCase().includes(q) ||
        r.original_file_name.toLowerCase().includes(q) ||
        r.document_type.toLowerCase().includes(q) ||
        (r.entity_id && r.entity_id.toLowerCase().includes(q))
      );
    }

    return records;
  }

  /**
   * Update document verification status (e.g. HR Admin or Auditor review)
   */
  public async updateVerificationStatus(
    documentId: string,
    status: 'VERIFIED' | 'REJECTED' | 'PENDING',
    verifiedBy: string,
    rejectionReason?: string
  ): Promise<boolean> {
    const now = new Date().toISOString();

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('storage_documents')
          .update({
            verification_status: status,
            verified_by: verifiedBy,
            verified_at: now,
            rejection_reason: rejectionReason || null,
            updated_at: now,
          })
          .eq('id', documentId);
      } catch (e) {
        console.warn('[EnterpriseStorageService] DB verification update notice:', e);
      }
    }

    // Update local cache
    const store = this.getLocalStore();
    const target = store.find(s => s.id === documentId);
    if (target) {
      target.verification_status = status;
      target.verified_by = verifiedBy;
      target.verified_at = now;
      target.rejection_reason = rejectionReason;
      target.updated_at = now;
      this.setLocalStore(store);
    }

    return true;
  }

  /**
   * Soft deletes or archives a document
   */
  public async deleteDocument(documentId: string): Promise<boolean> {
    const now = new Date().toISOString();

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('storage_documents')
          .update({
            status: 'DELETED',
            deleted_at: now,
            updated_at: now,
          })
          .eq('id', documentId);
      } catch (e) {
        console.warn('[EnterpriseStorageService] DB soft delete notice:', e);
      }
    }

    const store = this.getLocalStore().filter(s => s.id !== documentId);
    this.setLocalStore(store);
    return true;
  }
}

export const enterpriseStorageService = new EnterpriseStorageService();
