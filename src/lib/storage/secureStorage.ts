// src/lib/storage/secureStorage.ts
// ============================================================
// Joy PeopleHR Enterprise — Secure Private Storage Access Utility
// Generates short-lived Expiring Signed URLs for Private Storage Buckets
// ============================================================

import { supabase, isSupabaseEnabled } from '../supabase';

const DEFAULT_EXPIRY_SECONDS = 300; // 5 minutes

/**
 * Resolves a secure accessible URL for a file in Supabase Storage.
 * Attempts to generate a short-lived Signed URL for private buckets;
 * falls back to getPublicUrl if signed URL fails or for public buckets.
 */
export async function getSecureDocumentUrl(
  bucketName: string,
  storagePath: string,
  expiresInSeconds: number = DEFAULT_EXPIRY_SECONDS
): Promise<string> {
  if (!storagePath) return '';
  if (!isSupabaseEnabled) return storagePath;

  // Clean path formatting
  const cleanPath = storagePath.replace(/^[/\\]+/, '').replace(/^storage\//, '');

  try {
    // 1. Try creating a secure signed URL
    const { data: signedData, error: signedErr } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(cleanPath, expiresInSeconds);

    if (!signedErr && signedData?.signedUrl) {
      return signedData.signedUrl;
    }

    // 2. Fallback to public URL if bucket is configured as public or signed creation failed
    const { data: pubData } = supabase.storage.from(bucketName).getPublicUrl(cleanPath);
    return pubData?.publicUrl || storagePath;
  } catch (err) {
    console.warn(`[SecureStorage] Error generating signed URL for ${bucketName}/${cleanPath}:`, err);
    const { data: pubData } = supabase.storage.from(bucketName).getPublicUrl(cleanPath);
    return pubData?.publicUrl || storagePath;
  }
}

/**
 * Downloads a file from private storage as a local Blob or triggers download
 */
export async function downloadSecureDocument(
  bucketName: string,
  storagePath: string
): Promise<{ blob?: Blob; error?: string }> {
  if (!isSupabaseEnabled) {
    return { error: 'Supabase storage is disabled' };
  }

  const cleanPath = storagePath.replace(/^[/\\]+/, '').replace(/^storage\//, '');

  try {
    const { data, error } = await supabase.storage.from(bucketName).download(cleanPath);
    if (error) throw error;
    return { blob: data };
  } catch (err: any) {
    console.error(`[SecureStorage] Failed to download document ${bucketName}/${cleanPath}:`, err);
    return { error: err.message || 'Download failed' };
  }
}
