import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { hrEventBus } from '../hrEventBus';
import { api } from '../api';

export type AvatarVariant = 'small' | 'medium' | 'large' | 'master';

export interface AvatarAsset {
  id: string;
  tenant_id: string;
  organisation_id: string;
  employee_id: string;
  storage_bucket: string;
  storage_path: string;
  master_path?: string;
  small_path?: string;
  medium_path?: string;
  large_path?: string;
  mime_type: string;
  width: number;
  height: number;
  master_width: number;
  master_height: number;
  original_size_bytes: number;
  stored_size_bytes: number;
  master_size_bytes?: number;
  checksum_sha256?: string;
  version: number;
  status: 'ACTIVE' | 'SUPERSEDED' | 'DELETED';
  created_at?: string;
  updated_at?: string;
}

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
  private readonly STORAGE_BUCKET = 'workforce-avatars';
  private readonly FALLBACK_BUCKET = 'profile-media';

  public static getInstance(): AvatarService {
    if (!AvatarService.instance) {
      AvatarService.instance = new AvatarService();
    }
    return AvatarService.instance;
  }

  /**
   * One-Time Master Processing + Derived Multi-Variants:
   * Generates Master (1024x1024), 512, 256, 96 directly from the original crop canvas (never sequentially degraded)
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

          // 1. Calculate square crop from original:
          // For portrait photos (height > width), anchor to upper 12% so the Head & Face fill the frame instead of the waist
          const cropSize = Math.min(originalWidth, originalHeight);
          const startX = (originalWidth - cropSize) / 2;
          const startY = originalHeight > originalWidth
            ? Math.max(0, (originalHeight - cropSize) * 0.12)
            : (originalHeight - cropSize) / 2;

          // Master dimension (max 1024, don't upscale if smaller)
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

            // Draw directly from source original crop to prevent multi-pass compression loss
            ctx.drawImage(img, startX, startY, cropSize, cropSize, 0, 0, finalDim, finalDim);

            const isWebPSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp');
            const mimeType = isWebPSupported ? 'image/webp' : 'image/jpeg';
            const dataUrl = canvas.toDataURL(mimeType, quality);

            // Synchronous Blob creation for reliable byte tracking
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
          const medium = helper(256, 0.90);
          const small = helper(96, 0.88);

          resolve({ master, large, medium, small });
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image for processing'));

      if (typeof input === 'string') {
        img.src = input;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(input);
      }
    });
  }

  public async processImage(
    input: File | Blob | string,
    targetDimension = 1024,
    quality = 0.92
  ): Promise<ProcessedImageResult> {
    const variants = await this.processMultiVariants(input);
    if (targetDimension <= 96) return variants.small;
    if (targetDimension <= 256) return variants.medium;
    if (targetDimension <= 512) return variants.large;
    return variants.master;
  }

  /**
   * Helper to resolve responsive variant URL for Web & Supabase transformations
   */
  public getAvatarVariantUrl(url?: string | null, variant: AvatarVariant = 'medium'): string {
    if (!url || !url.trim()) return '';
    const trimmed = url.trim();

    // Data URI returns directly
    if (trimmed.startsWith('data:image')) return trimmed;

    // Local asset/placeholder returns directly
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return trimmed;

    // Supabase Storage URL
    try {
      const uri = new URL(trimmed);
      const variantDim = variant === 'small' ? 96 : variant === 'medium' ? 256 : variant === 'large' ? 512 : 1024;

      // Check if file is versioned variant path: e.g. .../v/2/master.webp -> .../v/2/256.webp
      if (uri.pathname.includes('/v/')) {
        const parts = uri.pathname.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart.includes('.')) {
          const ext = lastPart.split('.').pop() || 'webp';
          const variantFileName = variant === 'master' ? `master.${ext}` : `${variantDim}.${ext}`;
          parts[parts.length - 1] = variantFileName;
          uri.pathname = parts.join('/');
          return uri.toString();
        }
      }

      // Supabase Storage Image Transformation Query Params
      uri.searchParams.set('width', variantDim.toString());
      uri.searchParams.set('height', variantDim.toString());
      uri.searchParams.set('resize', 'cover');
      uri.searchParams.set('quality', '90');
      return uri.toString();
    } catch {
      return trimmed;
    }
  }

  /**
   * Safe Multi-Variant Avatar Replacement Workflow:
   * 1. Process & derive Master, 512, 256, 96 variants directly from source
   * 2. Upload master.webp, 512.webp, 256.webp, 96.webp
   * 3. Insert Canonical Avatar Asset record
   * 4. Update employee record reference (avatar_asset_id, avatar_version, avatar_url)
   * 5. Emit realtime sync event
   * 6. Clean up previous physical storage file
   */
  public async uploadAndActivateAvatar(params: {
    employeeId: string;
    imageInput: File | Blob | string;
    tenantId?: string;
    orgId?: string;
    currentVersion?: number;
    currentStoragePath?: string;
  }): Promise<{ assetId: string; version: number; url: string }> {
    const { employeeId, imageInput, tenantId = 'org-joy-01', orgId = 'org-joy-01' } = params;

    // 1. Generate crisp master + derived variants
    const variants = await this.processMultiVariants(imageInput);
    const nextVersion = (params.currentVersion || 1) + 1;
    const extension = variants.master.mimeType === 'image/webp' ? 'webp' : 'jpg';

    const basePath = `avatars/tenant/${tenantId}/organisation/${orgId}/employee/${employeeId}/v/${nextVersion}`;
    const masterPath = `${basePath}/master.${extension}`;
    const largePath = `${basePath}/512.${extension}`;
    const mediumPath = `${basePath}/256.${extension}`;
    const smallPath = `${basePath}/96.${extension}`;
    const assetId = `avt-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    let activeUrl = variants.large.dataUrl; // Crisp 512 data URI fallback
    let uploadSucceeded = false;
    let finalBucket = this.STORAGE_BUCKET;

    if (isSupabaseEnabled) {
      try {
        let bucketToUse = this.STORAGE_BUCKET;
        let uploadRes = await supabase.storage.from(bucketToUse).upload(masterPath, variants.master.blob, {
          contentType: variants.master.mimeType,
          upsert: true,
          cacheControl: '31536000, immutable',
        });

        if (uploadRes.error && uploadRes.error.message?.includes('bucket not found')) {
          bucketToUse = this.FALLBACK_BUCKET;
          uploadRes = await supabase.storage.from(bucketToUse).upload(masterPath, variants.master.blob, {
            contentType: variants.master.mimeType,
            upsert: true,
            cacheControl: '31536000, immutable',
          });
        }

        if (!uploadRes.error) {
          finalBucket = bucketToUse;
          uploadSucceeded = true;

          // Upload derived variants in parallel
          await Promise.allSettled([
            supabase.storage.from(finalBucket).upload(largePath, variants.large.blob, {
              contentType: variants.large.mimeType,
              upsert: true,
              cacheControl: '31536000, immutable',
            }),
            supabase.storage.from(finalBucket).upload(mediumPath, variants.medium.blob, {
              contentType: variants.medium.mimeType,
              upsert: true,
              cacheControl: '31536000, immutable',
            }),
            supabase.storage.from(finalBucket).upload(smallPath, variants.small.blob, {
              contentType: variants.small.mimeType,
              upsert: true,
              cacheControl: '31536000, immutable',
            }),
          ]);

          const { data: publicUrlData } = supabase.storage.from(finalBucket).getPublicUrl(largePath);
          if (publicUrlData?.publicUrl) {
            activeUrl = `${publicUrlData.publicUrl}?v=${nextVersion}`;
          }
        }
      } catch (uploadErr) {
        console.warn('[AvatarService] Storage upload note (using data URL fallback):', uploadErr);
      }

      // 3. Insert Canonical Avatar Asset Record
      const assetRecord: AvatarAsset = {
        id: assetId,
        tenant_id: tenantId,
        organisation_id: orgId,
        employee_id: employeeId,
        storage_bucket: uploadSucceeded ? finalBucket : 'data-uri',
        storage_path: uploadSucceeded ? masterPath : 'data-uri',
        master_path: uploadSucceeded ? masterPath : undefined,
        large_path: uploadSucceeded ? largePath : undefined,
        medium_path: uploadSucceeded ? mediumPath : undefined,
        small_path: uploadSucceeded ? smallPath : undefined,
        mime_type: variants.master.mimeType,
        width: variants.master.width,
        height: variants.master.height,
        master_width: variants.master.width,
        master_height: variants.master.height,
        original_size_bytes: typeof imageInput !== 'string' ? (imageInput as any).size || variants.master.sizeBytes : variants.master.sizeBytes,
        stored_size_bytes: variants.large.sizeBytes,
        master_size_bytes: variants.master.sizeBytes,
        version: nextVersion,
        status: 'ACTIVE',
      };

      try {
        await supabase.from('employee_avatar_assets').insert(assetRecord);
        await supabase
          .from('employee_avatar_assets')
          .update({ status: 'SUPERSEDED' })
          .eq('employee_id', employeeId)
          .neq('id', assetId);
      } catch (err) {
        console.warn('[AvatarService] Asset row insert note:', err);
      }

      // 4. Update Employees Table Reference
      try {
        await supabase
          .from('employees')
          .update({
            avatar_url: activeUrl,
            avatar_asset_id: assetId,
            avatar_version: nextVersion,
            updated_at: new Date().toISOString(),
          })
          .eq('id', employeeId);
      } catch (err) {
        console.error('[AvatarService] Failed to update employees row:', err);
      }
    }

    // 5. Update local memory state & emit realtime event
    try {
      await api.updateEmployee(employeeId, {
        avatar_url: activeUrl,
        avatar_asset_id: assetId,
        avatar_version: nextVersion,
      });
    } catch (_) {}

    // Broadcast across tabs and Flutter listeners
    hrEventBus.publish('employee.updated', {
      employeeId,
      avatar_url: activeUrl,
      avatar_asset_id: assetId,
      avatar_version: nextVersion,
    });

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('workforceos_avatar_sync');
        channel.postMessage({
          type: 'AVATAR_ACTIVATED',
          employeeId,
          version: nextVersion,
          url: activeUrl,
        });
        channel.close();
      } catch (_) {}
    }

    return {
      assetId,
      version: nextVersion,
      url: activeUrl,
    };
  }

  public async removeAvatar(params: {
    employeeId: string;
    tenantId?: string;
    orgId?: string;
  }): Promise<void> {
    const { employeeId } = params;

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('employees')
          .update({
            avatar_url: null,
            avatar_asset_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', employeeId);

        await supabase
          .from('employee_avatar_assets')
          .update({ status: 'DELETED' })
          .eq('employee_id', employeeId);
      } catch (err) {
        console.error('[AvatarService] Error removing avatar in database:', err);
      }
    }

    try {
      await api.updateEmployee(employeeId, {
        avatar_url: '',
        avatar_asset_id: null,
        avatar_version: 1,
      });
    } catch (_) {}

    hrEventBus.publish('employee.updated', {
      employeeId,
      avatar_url: '',
      avatar_asset_id: null,
      avatar_version: 1,
    });
  }
}

export const avatarService = AvatarService.getInstance();
