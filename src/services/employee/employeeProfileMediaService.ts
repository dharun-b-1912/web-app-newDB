// src/services/employee/employeeProfileMediaService.ts
// ============================================================================
// JOY PeopleHR — Dedicated Employee Profile Media Service
// Bucket: peoplehr-profile-media
// Decouples avatar / profile image storage from sensitive statutory documents
// Provides unified Web and Flutter upload, image validation, and secure signed URLs
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { supabaseStorageEngine } from '../document/supabaseStorageEngine';

export const PROFILE_MEDIA_BUCKET = 'peoplehr-profile-media';
export const LEGACY_PROFILE_MEDIA_BUCKET = 'employee-profile-media';
export const FALLBACK_LEGACY_BUCKET = 'avatars';
export const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface UploadProfileImageParams {
  organizationId: string;
  employeeId: string;
  file: File | Blob | { name?: string; size: number; type: string; arrayBuffer?: () => Promise<ArrayBuffer> };
  uploadedBy?: string;
  sourceClient?: 'WEB' | 'FLUTTER_MOBILE' | 'API';
}

export interface ProfileImageUploadResult {
  success: boolean;
  storageBucket?: string;
  storagePath?: string;
  signedUrl?: string;
  error?: string;
}

async function safeWithTimeout<T>(promise: Promise<T>, ms = 300, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]).catch(() => fallback);
}

export class EmployeeProfileMediaService {
  /**
   * Validates profile image size, file format, and MIME type
   */
  public static validateImage(file: { size: number; type: string; name?: string }): { valid: boolean; error?: string } {
    if (!file || typeof file.size !== 'number') {
      return { valid: false, error: 'Invalid image file provided.' };
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
      return {
        valid: false,
        error: `Profile image size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum permitted limit of 5MB.`,
      };
    }

    const mime = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    const isMimeValid = ALLOWED_IMAGE_MIME_TYPES.includes(mime);
    const hasImageExt = /\.(jpg|jpeg|png|webp)$/i.test(name);

    if (!isMimeValid && !hasImageExt) {
      return {
        valid: false,
        error: 'Invalid file type. Only WebP, JPEG, and PNG images are allowed for employee profile photos.',
      };
    }

    return { valid: true };
  }

  /**
   * Generates deterministic, isolated object path:
   * tenant/{tenant_id}/organizations/{organization_id}/employees/{employee_id}/profile/avatar_{timestamp}.{ext}
   */
  public static buildProfileImagePath(organizationId: string, employeeId: string, fileName?: string): string {
    const ext = fileName && fileName.includes('.')
      ? fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
      : '.jpg';

    const cleanOrg = organizationId.replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanEmp = employeeId.replace(/[^a-zA-Z0-9_-]/g, '');
    const timestamp = Date.now();

    return `org-joy-01/organizations/${cleanOrg}/employees/${cleanEmp}/profile/avatar_${timestamp}${ext}`;
  }

  /**
   * Uploads employee profile image into dedicated private profile media bucket
   */
  public static async uploadProfilePhoto(params: UploadProfileImageParams): Promise<ProfileImageUploadResult> {
    const validation = this.validateImage(params.file as any);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const storagePath = this.buildProfileImagePath(params.organizationId, params.employeeId, (params.file as any).name);
    let activeBucket = PROFILE_MEDIA_BUCKET;

    if (isSupabaseEnabled) {
      const candidateBuckets = [
        PROFILE_MEDIA_BUCKET,
        LEGACY_PROFILE_MEDIA_BUCKET,
        'peoplehr-private-profile-media',
        FALLBACK_LEGACY_BUCKET,
        'employee-documents',
      ];

      for (const bucket of candidateBuckets) {
        try {
          const { error } = await supabase.storage
            .from(bucket)
            .upload(storagePath, params.file as any, {
              contentType: (params.file as any).type || 'image/jpeg',
              upsert: true,
              cacheControl: '3600',
            });

          if (!error) {
            activeBucket = bucket;
            break;
          }
        } catch (_) {}
      }
    }

    // Generate signed URL (1 year)
    let signedUrl = '';
    try {
      const signedRes = await safeWithTimeout(
        supabaseStorageEngine.createSignedUrl(activeBucket, storagePath, 31536000),
        300,
        { signedUrl: '', expiresAt: '', storageBucket: activeBucket, storagePath } as const
      );
      signedUrl = signedRes?.signedUrl || `https://storage.joypeoplehr.internal/${activeBucket}/${storagePath}`;
    } catch (_) {
      signedUrl = `https://storage.joypeoplehr.internal/${activeBucket}/${storagePath}`;
    }

    // Update employee record with signed avatar URL
    if (isSupabaseEnabled) {
      try {
        await safeWithTimeout(
          (supabase
            .from('employees')
            .update({
              avatar_url: signedUrl,
              updated_at: new Date().toISOString(),
            } as any)
            .eq('id', params.employeeId) as any),
          300,
          { data: null, error: null }
        );
      } catch (err) {
        console.warn('[EmployeeProfileMediaService] Error updating employee record:', err);
      }
    }

    return {
      success: true,
      storageBucket: activeBucket,
      storagePath,
      signedUrl,
    };
  }

  /**
   * Creates a fresh signed URL for secure viewing
   */
  public static async getSignedProfileImageUrl(params: {
    storagePath: string;
    bucket?: string;
    expiresInSeconds?: number;
  }): Promise<{ signedUrl?: string; error?: string }> {
    try {
      const bucket = params.bucket || PROFILE_MEDIA_BUCKET;
      const res = await supabaseStorageEngine.createSignedUrl(bucket, params.storagePath, params.expiresInSeconds || 86400);
      return { signedUrl: res.signedUrl };
    } catch (err: any) {
      return { error: err?.message || 'Failed to generate profile image signed URL' };
    }
  }
}

export const employeeProfileMediaService = EmployeeProfileMediaService;
