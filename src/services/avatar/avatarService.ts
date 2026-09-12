import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { hrEventBus } from '../hrEventBus';
import { api } from '../api';
import { supabaseStorageEngine } from '../document/supabaseStorageEngine';

export type AvatarVariant = 'small' | 'medium' | 'large' | 'master';

export interface ProcessedImageResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
}

export interface MultiVariantProcessedResult {
  master: ProcessedImageResult;
  large: ProcessedImageResult;  // 512x512
  medium: ProcessedImageResult; // 256x256
  small: ProcessedImageResult;  // 96x96
}

export class AvatarService {
  private static instance: AvatarService;
  private readonly STORAGE_BUCKET = 'employee-documents';
  private readonly FALLBACK_BUCKET = 'employee-documents';

  public static getInstance(): AvatarService {
    if (!AvatarService.instance) {
      AvatarService.instance = new AvatarService();
    }
    return AvatarService.instance;
  }

  /**
   * One-Time Master Processing + Derived Multi-Variants:
   * Generates Master (1024x1024), 512, 256, 96 directly from the original crop canvas
   */
  public async processMultiVariants(input: File | Blob | string): Promise<MultiVariantProcessedResult> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const originalWidth = img.width;
          const originalHeight = img.height;

          if (originalWidth < 64 || originalHeight < 64) {
            return reject(new Error('Photo resolution is too low. Please choose a clearer photo.'));
          }

          const cropSize = Math.min(originalWidth, originalHeight);
          const startX = (originalWidth - cropSize) / 2;
          const startY = originalHeight > originalWidth
            ? Math.max(0, (originalHeight - cropSize) * 0.12)
            : (originalHeight - cropSize) / 2;

          const masterDim = Math.min(cropSize, 1024);

          const helper = (targetDim: number, quality: number): ProcessedImageResult => {
            const finalDim = Math.min(masterDim, targetDim);
            const canvas = document.createElement('canvas');
            canvas.width = finalDim;
            canvas.height = finalDim;

            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) throw new Error('Canvas 2D context unavailable');

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(
              img,
              startX,
              startY,
              cropSize,
              cropSize,
              0,
              0,
              finalDim,
              finalDim
            );

            const mimeType = 'image/jpeg';
            const dataUrl = canvas.toDataURL(mimeType, quality);
            const byteString = atob(dataUrl.split(',')[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mimeType });

            return {
              blob,
              dataUrl,
              width: finalDim,
              height: finalDim,
              sizeBytes: blob.size,
              mimeType,
            };
          };

          const master = helper(1024, 0.92);
          const large = helper(512, 0.90);
          const medium = helper(256, 0.88);
          const small = helper(96, 0.85);

          resolve({ master, large, medium, small });
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image for avatar processing'));

      if (typeof input === 'string') {
        img.src = input;
      } else {
        img.src = URL.createObjectURL(input);
      }
    });
  }

  /**
   * Process a single image to target dimensions and quality
   */
  public async processImage(
    input: File | Blob | string,
    targetDim: number = 1024,
    _quality: number = 0.92
  ): Promise<ProcessedImageResult> {
    const variants = await this.processMultiVariants(input);
    if (targetDim <= 96) return variants.small;
    if (targetDim <= 256) return variants.medium;
    if (targetDim <= 512) return variants.large;
    return variants.master;
  }

  /**
   * Synchronously resolve avatar variant URL or return source as-is
   */
  public getAvatarVariantUrl(urlOrPath?: string, _variant?: AvatarVariant): string {
    if (!urlOrPath) return '';
    return urlOrPath;
  }

  /**
   * Upload and activate employee profile picture
   * Canonical path: <org_id>/<employee_id>/profile/<file_uuid>.jpg
   */
  public async uploadAndActivateAvatar(params: {
    employeeId: string;
    imageInput: File | Blob | string;
    orgId: string;
  }): Promise<{ storagePath: string; url: string }> {
    const { employeeId, imageInput, orgId } = params;

    const variants = await this.processMultiVariants(imageInput);
    const fileUuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `avatar-${Date.now()}`;
    // Canonical 4-segment path: <org_id>/<employee_id>/documents/avatar_<file_uuid>.jpg
    const storagePath = `${orgId}/${employeeId}/documents/avatar_${fileUuid}.jpg`;

    let finalBucket = this.STORAGE_BUCKET;

    if (isSupabaseEnabled) {
      const uploadRes = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(storagePath, variants.large.blob, {
          contentType: 'image/jpeg',
          upsert: true,
          cacheControl: '3600',
        });

      if (uploadRes.error) {
        // Fallback to employee-documents
        finalBucket = this.FALLBACK_BUCKET;
        const fallbackRes = await supabase.storage
          .from(finalBucket)
          .upload(storagePath, variants.large.blob, {
            contentType: 'image/jpeg',
            upsert: true,
            cacheControl: '3600',
          });

        if (fallbackRes.error) {
          throw new Error(`Failed to upload avatar: ${fallbackRes.error.message}`);
        }
      }
    }

    // Generate long-lived signed URL (1 year = 31,536,000s)
    let signedUrl = variants.large.dataUrl;
    try {
      const signedRes = await supabaseStorageEngine.createSignedUrl(finalBucket, storagePath, 31536000);
      signedUrl = signedRes.signedUrl;
    } catch (_) {}

    if (isSupabaseEnabled) {
      // Update employee avatar_url with the signed URL for direct loading everywhere
      const { error: updateErr } = await supabase
        .from('employees')
        .update({
          avatar_url: signedUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employeeId);

      if (updateErr) {
        console.error('[AvatarService] Error updating employee avatar_url:', updateErr);
      }

      // Also update user_profiles table if there is an auth session or profile
      try {
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser?.user?.id) {
          await supabase
            .from('user_profiles')
            .update({
              avatar_url: signedUrl,
              updated_at: new Date().toISOString(),
            })
            .or(`auth_user_id.eq.${authUser.user.id},id.eq.${authUser.user.id},employee_id.eq.${employeeId}`);
        }
      } catch (_) {}
    }

    // Update current logged-in user in API if this is the active user
    try {
      const currentUser = api.getCurrentUser();
      if (currentUser && (currentUser.employee_id === employeeId || currentUser.id === employeeId)) {
        api.setCurrentUser({
          ...currentUser,
          avatar_url: signedUrl,
        });
      }
    } catch (_) {}

    // Update workforce_employees local cache if present
    try {
      const raw = localStorage.getItem('workforce_employees');
      if (raw) {
        const list = JSON.parse(raw);
        const updated = list.map((e: any) => e.id === employeeId ? { ...e, avatar_url: signedUrl } : e);
        localStorage.setItem('workforce_employees', JSON.stringify(updated));
      }
    } catch (_) {}

    hrEventBus.publish('employee.updated', {
      employeeId,
      id: employeeId,
      avatar_url: signedUrl,
    });

    return {
      storagePath,
      url: signedUrl,
    };
  }

  /**
   * Resolve an avatar_url or storage path to an active signed URL
   */
  public async getAvatarSignedUrl(avatarPathOrUrl?: string | null): Promise<string> {
    if (!avatarPathOrUrl) return '';

    // If it's already an HTTP URL or data URI, return as-is
    if (avatarPathOrUrl.startsWith('http') || avatarPathOrUrl.startsWith('data:')) {
      return avatarPathOrUrl;
    }

    // It's a canonical storage path: resolve signed URL
    try {
      const res = await supabaseStorageEngine.createSignedUrl(this.STORAGE_BUCKET, avatarPathOrUrl, 31536000);
      return res.signedUrl;
    } catch (_) {
      try {
        const res2 = await supabaseStorageEngine.createSignedUrl(this.FALLBACK_BUCKET, avatarPathOrUrl, 31536000);
        return res2.signedUrl;
      } catch (_) {
        return '';
      }
    }
  }

  /**
   * Remove avatar
   */
  public async removeAvatar(params: { employeeId: string; orgId?: string }): Promise<void> {
    const { employeeId } = params;

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('employees')
          .update({
            avatar_url: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', employeeId);
      } catch (err) {
        console.error('[AvatarService] Error removing avatar in database:', err);
      }
    }

    hrEventBus.publish('employee.updated', {
      employeeId,
      avatar_url: null,
    });
  }
}

export const avatarService = AvatarService.getInstance();
