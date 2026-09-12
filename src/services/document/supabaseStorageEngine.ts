// src/services/document/supabaseStorageEngine.ts
// ============================================================================
// Joy PeopleHR — Enterprise Private Supabase Storage Engine
// Multi-Tenant Isolation, Private Buckets, Deterministic Paths & Signed URLs
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { DocumentClassification } from '../../types';

export type StorageBucketDomain =
  | 'employee-documents'
  | 'employee-letters'
  | 'employee-profile-pictures';

export interface StorageUploadParams {
  tenantId?: string;
  organizationId: string;
  employeeId: string;
  documentId?: string;
  category?: 'documents' | 'letters' | 'profile';
  fileName: string;
  file: Blob | File;
  classification?: DocumentClassification;
  isCompanyDoc?: boolean;
}

export interface StorageUploadResponse {
  storageBucket: StorageBucketDomain;
  storagePath: string;
  fileSizeBytes: number;
  uploadedAt: string;
  idempotencyKey: string;
}

export interface SignedUrlResponse {
  signedUrl: string;
  expiresAt: string;
  storageBucket: StorageBucketDomain;
  storagePath: string;
}

class SupabaseStorageEngine {
  /**
   * Determine the canonical private storage bucket based on category
   */
  resolveStorageBucket(category: 'documents' | 'letters' | 'profile' = 'documents'): StorageBucketDomain {
    if (category === 'letters') return 'employee-letters';
    if (category === 'profile') return 'employee-documents';
    return 'employee-documents';
  }

  /**
   * Generate canonical deterministic tenant-isolated path
   * Format: <organization_uuid>/<employee_uuid>/<category>/<file_uuid>.<extension>
   */
  buildStoragePath(params: {
    organizationId: string;
    employeeId: string;
    category?: 'documents' | 'letters' | 'profile';
    fileUuid?: string;
    fileName: string;
  }): string {
    const org = params.organizationId;
    const emp = params.employeeId;
    const isProfile = params.category === 'profile';
    const isLetter = params.category === 'letters';
    const storageCategory = isLetter ? 'letters' : 'documents';

    // Generate UUID filename with proper extension
    const ext = params.fileName.includes('.')
      ? params.fileName.substring(params.fileName.lastIndexOf('.'))
      : (isProfile ? '.jpg' : '.pdf');

    const fileId = params.fileUuid || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `file-${Date.now()}`);
    const prefix = isProfile ? 'avatar_' : '';
    return `${org}/${emp}/${storageCategory}/${prefix}${fileId}${ext}`;
  }

  /**
   * Upload binary file to canonical private Supabase Storage bucket
   */
  async uploadFile(params: StorageUploadParams): Promise<StorageUploadResponse> {
    const category = params.category || 'documents';
    const bucket = this.resolveStorageBucket(category);
    const storagePath = this.buildStoragePath({
      organizationId: params.organizationId,
      employeeId: params.employeeId,
      category,
      fileName: params.fileName,
    });

    const idempotencyKey = `up-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    if (isSupabaseEnabled) {
      const { error } = await supabase.storage
        .from(bucket)
        .upload(storagePath, params.file, {
          cacheControl: '3600',
          upsert: true,
          contentType: params.file.type || (category === 'profile' ? 'image/jpeg' : 'application/pdf')
        });

      if (error) {
        // If specific letters/profile bucket not yet active, fallback to canonical employee-documents
        if (bucket !== 'employee-documents') {
          const { error: fallbackErr } = await supabase.storage
            .from('employee-documents')
            .upload(storagePath, params.file, {
              cacheControl: '3600',
              upsert: true,
              contentType: params.file.type || 'application/pdf'
            });

          if (fallbackErr) {
            console.error('[SupabaseStorageEngine] Storage upload error:', fallbackErr.message);
            throw fallbackErr;
          }
          return {
            storageBucket: 'employee-documents',
            storagePath,
            fileSizeBytes: params.file.size,
            uploadedAt: new Date().toISOString(),
            idempotencyKey,
          };
        }
        console.error('[SupabaseStorageEngine] Storage upload error:', error.message);
        throw error;
      }
    }

    return {
      storageBucket: bucket,
      storagePath,
      fileSizeBytes: params.file.size,
      uploadedAt: new Date().toISOString(),
      idempotencyKey,
    };
  }

  /**
   * Create short-lived signed URL for authorized viewing or downloading (default: 1 hour / 3600 seconds)
   */
  async createSignedUrl(
    bucket: StorageBucketDomain | string = 'employee-documents',
    storagePath: string,
    expiresInSeconds: number = 3600
  ): Promise<SignedUrlResponse> {
    const expiryDate = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    if (!storagePath) {
      throw new Error('storagePath is required to create a signed URL');
    }

    const cleanPath = storagePath.replace(/^[/\\]+/, '').replace(/^storage\//, '');

    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(cleanPath, expiresInSeconds);

        if (!error && data?.signedUrl) {
          return {
            signedUrl: data.signedUrl,
            expiresAt: expiryDate,
            storageBucket: bucket as StorageBucketDomain,
            storagePath: cleanPath,
          };
        }

        // Try fallback canonical bucket employee-documents
        if (bucket !== 'employee-documents') {
          const { data: fallbackData, error: fallbackError } = await supabase.storage
            .from('employee-documents')
            .createSignedUrl(cleanPath, expiresInSeconds);

          if (!fallbackError && fallbackData?.signedUrl) {
            return {
              signedUrl: fallbackData.signedUrl,
              expiresAt: expiryDate,
              storageBucket: 'employee-documents',
              storagePath: cleanPath,
            };
          }
        }
      } catch (err) {
        console.error('[SupabaseStorageEngine] Error creating signed URL:', err);
        throw err;
      }
    }

    throw new Error('Supabase Storage client is not enabled or file is unavailable.');
  }

  /**
   * Delete object from Supabase Storage safely
   */
  async deleteFile(bucket: StorageBucketDomain | string = 'employee-documents', storagePath: string): Promise<boolean> {
    if (isSupabaseEnabled && storagePath) {
      try {
        const cleanPath = storagePath.replace(/^[/\\]+/, '').replace(/^storage\//, '');
        const { error } = await supabase.storage
          .from(bucket)
          .remove([cleanPath]);

        if (error) {
          console.warn('[SupabaseStorageEngine] Error removing object from storage:', error.message);
          return false;
        }
        return true;
      } catch (err) {
        console.warn('[SupabaseStorageEngine] Exception deleting storage object:', err);
        return false;
      }
    }
    return true;
  }
}

export const supabaseStorageEngine = new SupabaseStorageEngine();
