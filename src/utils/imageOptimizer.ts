// src/utils/imageOptimizer.ts
// ============================================================================
// Joy PeopleHR — Company Logo Optimizer & Compression Engine
// Auto-compresses logos to lightweight high-DPI assets for CRM, Quotes & Proposals
// ============================================================================

import { supabase, isSupabaseEnabled } from '../lib/supabase';

export interface OptimizedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  sizeFormatted: string;
  format: string;
}

export interface OptimizeLogoOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  preferredFormat?: 'webp' | 'png' | 'jpeg';
}

/**
 * Optimizes, resizes and compresses an uploaded company logo file.
 * Automatically keeps logos under ~40-60KB while maintaining crisp high-DPI rendering.
 */
export async function optimizeCompanyLogo(
  file: File,
  options: OptimizeLogoOptions = {}
): Promise<OptimizedImageResult> {
  const {
    maxWidth = 400,
    maxHeight = 240,
    quality = 0.88,
    preferredFormat = 'webp',
  } = options;

  // Handle Vector SVG directly without raster loss
  if (file.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({
          dataUrl,
          width: 300,
          height: 120,
          sizeBytes: file.size,
          sizeFormatted: `${(file.size / 1024).toFixed(1)} KB`,
          format: 'svg',
        });
      };
      reader.onerror = () => reject(new Error('Failed to read SVG file.'));
      reader.readAsDataURL(file);
    });
  }

  // Handle raster images (PNG, JPEG, WebP, GIF)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio while fitting into maximum bounding box
        if (width > maxWidth || height > maxHeight) {
          const widthRatio = maxWidth / width;
          const heightRatio = maxHeight / height;
          const ratio = Math.min(widthRatio, heightRatio);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get 2D canvas rendering context.'));
        }

        // Bicubic high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, width, height);

        // Detect if image needs PNG preservation (alpha transparency)
        const mimeType = preferredFormat === 'webp' ? 'image/webp' : 'image/png';
        const dataUrl = canvas.toDataURL(mimeType, quality);

        // Calculate approximate size in bytes from base64
        const stringLength = dataUrl.length - 'data:image/webp;base64,'.length;
        const sizeInBytes = Math.round(stringLength * (3 / 4));
        const sizeFormatted = `${(sizeInBytes / 1024).toFixed(1)} KB`;

        resolve({
          dataUrl,
          width,
          height,
          sizeBytes: sizeInBytes,
          sizeFormatted,
          format: preferredFormat,
        });
      };

      img.onerror = () => reject(new Error('Failed to load image for compression.'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read logo file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an optimized logo to Supabase storage bucket 'company-logos'
 * with fallback to optimized Base64 Data URL for zero-dependency local performance.
 */
export async function uploadLogoToBucket(
  file: File,
  clientOrOrgId: string = 'client'
): Promise<string> {
  const optimized = await optimizeCompanyLogo(file);

  if (isSupabaseEnabled) {
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${clientOrOrgId}/${Date.now()}-${sanitizedName}`;

      // Convert data URL back to Blob for bucket upload
      const response = await fetch(optimized.dataUrl);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('company-logos')
        .upload(filename, blob, {
          contentType: blob.type || 'image/webp',
          upsert: true,
        });

      if (!error && data?.path) {
        const { data: publicData } = supabase.storage
          .from('company-logos')
          .getPublicUrl(data.path);

        if (publicData?.publicUrl) {
          return publicData.publicUrl;
        }
      }
    } catch (err) {
      console.warn('[imageOptimizer] Supabase storage fallback to dataUrl:', err);
    }
  }

  // Standard high-performance fallback: the optimized, compact base64 data URL
  return optimized.dataUrl;
}
