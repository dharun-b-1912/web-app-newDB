// src/services/platform/platformProfileService.ts
// ============================================================
// Joy PeopleHR — Platform Admin Profile & Identity Service
// ============================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { platformAuditService } from './platformAuditService';

export interface PlatformAdminProfile {
  id: string;
  auth_user_id?: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  job_title: string;
  department: string;
  phone: string;
  avatar_url: string;
  timezone: string;
  locale: string;
  is_primary_email_verified: boolean;
  last_profile_update_at: string;
  created_at: string;
}

export interface PlatformUserPreferences {
  theme: 'system' | 'light' | 'dark';
  language: string;
  timezone_mode: 'auto' | 'manual';
  date_format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  notify_security_alerts: boolean;
  notify_incidents: boolean;
  notify_integration_failures: boolean;
  notify_job_failures: boolean;
  notify_support_escalations: boolean;
  realtime_updates_enabled: boolean;
  reduced_motion: boolean;
}

let cachedProfile: PlatformAdminProfile = {
  id: 'prof-superadmin-01',
  email: 'superadmin@workforceos.com',
  first_name: 'THIRUMALAI',
  last_name: 'R K',
  display_name: 'THIRUMALAI R K',
  job_title: 'Chief Platform Architect & Super Admin',
  department: 'Platform Core & Infrastructure',
  phone: '+91 9384125278',
  avatar_url: '',
  timezone: 'Asia/Kolkata (IST, UTC+05:30)',
  locale: 'en-US',
  is_primary_email_verified: true,
  last_profile_update_at: new Date().toISOString(),
  created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
};

let cachedPreferences: PlatformUserPreferences = {
  theme: 'system',
  language: 'en',
  timezone_mode: 'auto',
  date_format: 'DD/MM/YYYY',
  notify_security_alerts: true,
  notify_incidents: true,
  notify_integration_failures: true,
  notify_job_failures: true,
  notify_support_escalations: true,
  realtime_updates_enabled: true,
  reduced_motion: false,
};

// --- Client-side High-Fidelity Image Compression Helper ---
async function compressProfileImage(file: File, maxDimension: number = 512, quality: number = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to obtain canvas 2D context'));
          return;
        }

        // Apply bicubic image smoothing for crisp text and retina fidelity
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              canvas.toBlob(
                (fallbackBlob) => {
                  if (fallbackBlob) resolve(fallbackBlob);
                  else reject(new Error('Image compression failed'));
                },
                'image/jpeg',
                quality
              );
            }
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to decode image file'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image source'));
    reader.readAsDataURL(file);
  });
}

export const platformProfileService = {
  // --- Profile Retrieval ---
  async getProfile(): Promise<PlatformAdminProfile> {
    try {
      const stored = localStorage.getItem('workforce_platform_profile');
      if (stored) {
        cachedProfile = { ...cachedProfile, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore localStorage read errors
    }

    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('platform_profiles')
          .select('*')
          .eq('email', cachedProfile.email)
          .maybeSingle();

        if (data && !error) {
          cachedProfile = {
            id: data.id,
            auth_user_id: data.auth_user_id,
            email: data.email || cachedProfile.email,
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            display_name: data.display_name || `${data.first_name} ${data.last_name}`.trim() || 'Platform Super Admin',
            job_title: data.job_title || 'Platform Administrator',
            department: data.department || 'Infrastructure',
            phone: data.phone || '',
            avatar_url: data.avatar_url || '',
            timezone: data.timezone || 'Asia/Kolkata (IST)',
            locale: data.locale || 'en-US',
            is_primary_email_verified: data.is_primary_email_verified ?? true,
            last_profile_update_at: data.last_profile_update_at || new Date().toISOString(),
            created_at: data.created_at || new Date().toISOString(),
          };
          localStorage.setItem('workforce_platform_profile', JSON.stringify(cachedProfile));
        }
      } catch (err) {
        console.warn('[PlatformProfileService] Supabase profile fetch warning:', err);
      }
    }

    return { ...cachedProfile };
  },

  // --- Profile Update ---
  async updateProfile(updates: Partial<PlatformAdminProfile>): Promise<PlatformAdminProfile> {
    const prev = { ...cachedProfile };
    const computedDisplayName = updates.display_name
      ? updates.display_name
      : updates.first_name || updates.last_name
      ? `${updates.first_name || cachedProfile.first_name} ${updates.last_name || cachedProfile.last_name}`.trim()
      : cachedProfile.display_name;

    const updated: PlatformAdminProfile = {
      ...cachedProfile,
      ...updates,
      display_name: computedDisplayName,
      last_profile_update_at: new Date().toISOString(),
    };

    cachedProfile = updated;
    try {
      localStorage.setItem('workforce_platform_profile', JSON.stringify(updated));
    } catch {
      // Ignore localStorage error
    }

    if (isSupabaseEnabled) {
      try {
        const payload: Record<string, any> = {
          email: updated.email,
          first_name: updated.first_name,
          last_name: updated.last_name,
          display_name: updated.display_name,
          job_title: updated.job_title,
          department: updated.department,
          phone: updated.phone,
          avatar_url: updated.avatar_url,
          timezone: updated.timezone,
          locale: updated.locale,
          last_profile_update_at: updated.last_profile_update_at,
          updated_at: new Date().toISOString(),
        };

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updated.id);
        if (isUuid) {
          payload.id = updated.id;
        }

        const { data: updateRes, error: updateErr } = await supabase
          .from('platform_profiles')
          .update(payload)
          .eq('email', updated.email)
          .select();

        if (updateErr || !updateRes || updateRes.length === 0) {
          await supabase.from('platform_profiles').upsert(payload, { onConflict: 'email' });
        }

        // Sync staff name
        await supabase
          .from('platform_staff')
          .update({ name: updated.display_name, updated_at: new Date().toISOString() })
          .eq('email', updated.email);
      } catch (err) {
        console.warn('[PlatformProfileService] Error persisting profile update:', err);
      }
    }

    await platformAuditService.logEvent({
      action: 'profile.updated',
      category: 'Security',
      resource_type: 'Profile',
      resource_id: updated.id,
      resource_name: updated.display_name,
      severity: 'Normal',
      before_value: JSON.stringify({ display_name: prev.display_name, job_title: prev.job_title }),
      after_value: JSON.stringify({ display_name: updated.display_name, job_title: updated.job_title }),
      reason: `Platform Admin profile details updated by ${updated.display_name}`,
    });

    // Notify all UI shells (Topbar, UserMenu, etc.)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('platform:profile_updated', { detail: { profile: updated } }));
    }

    return updated;
  },

  // --- Avatar Storage & Management ---
  async uploadAvatar(file: File): Promise<string> {
    // Validate file type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      throw new Error('Unsupported image format. Please upload a JPEG, PNG, or WebP image.');
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Avatar image size must be under 5MB.');
    }

    // 1. High-fidelity compression (retains pristine resolution while optimizing payload)
    const compressedBlob = await compressProfileImage(file, 512, 0.92);
    let finalAvatarUrl = '';

    // 2. Upload to Supabase Storage if enabled
    if (isSupabaseEnabled) {
      try {
        const fileExt = 'webp';
        const fileName = `${cachedProfile.id || 'superadmin'}_${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('platform-avatars')
          .upload(filePath, compressedBlob, {
            contentType: 'image/webp',
            upsert: true,
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('platform-avatars')
            .getPublicUrl(filePath);

          if (urlData?.publicUrl) {
            finalAvatarUrl = urlData.publicUrl;
          }
        } else {
          console.warn('[PlatformProfileService] Supabase storage upload warning:', uploadError);
        }
      } catch (storageErr) {
        console.warn('[PlatformProfileService] Storage service unreachable, using compressed data URL:', storageErr);
      }
    }

    // 3. Fallback to lightweight compressed data URL if storage upload was offline
    if (!finalAvatarUrl) {
      finalAvatarUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(compressedBlob);
      });
    }

    cachedProfile.avatar_url = finalAvatarUrl;
    cachedProfile.last_profile_update_at = new Date().toISOString();

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('platform_profiles')
          .update({
            avatar_url: finalAvatarUrl,
            last_profile_update_at: cachedProfile.last_profile_update_at,
            updated_at: new Date().toISOString(),
          })
          .eq('email', cachedProfile.email);
      } catch (err) {
        console.warn('[PlatformProfileService] Failed to update avatar_url column:', err);
      }
    }

    await platformAuditService.logEvent({
      action: 'profile.avatar_changed',
      category: 'Security',
      resource_type: 'Profile',
      resource_id: cachedProfile.id,
      resource_name: cachedProfile.display_name,
      severity: 'Normal',
      reason: 'Platform Admin uploaded compressed high-resolution profile avatar',
    });

    return finalAvatarUrl;
  },

  async removeAvatar(): Promise<void> {
    cachedProfile.avatar_url = '';
    cachedProfile.last_profile_update_at = new Date().toISOString();

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('platform_profiles')
          .update({ avatar_url: '', updated_at: new Date().toISOString() })
          .eq('email', cachedProfile.email);
      } catch (err) {
        console.warn('[PlatformProfileService] Failed to remove avatar:', err);
      }
    }

    await platformAuditService.logEvent({
      action: 'profile.avatar_removed',
      category: 'Security',
      resource_type: 'Profile',
      resource_id: cachedProfile.id,
      resource_name: cachedProfile.display_name,
      severity: 'Normal',
      reason: 'Platform Admin removed custom avatar',
    });
  },

  // --- Preferences Management ---
  async getPreferences(): Promise<PlatformUserPreferences> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('platform_user_preferences')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (data && !error) {
          cachedPreferences = {
            theme: data.theme || 'system',
            language: data.language || 'en',
            timezone_mode: data.timezone_mode || 'auto',
            date_format: data.date_format || 'DD/MM/YYYY',
            notify_security_alerts: data.notify_security_alerts ?? true,
            notify_incidents: data.notify_incidents ?? true,
            notify_integration_failures: data.notify_integration_failures ?? true,
            notify_job_failures: data.notify_job_failures ?? true,
            notify_support_escalations: data.notify_support_escalations ?? true,
            realtime_updates_enabled: data.realtime_updates_enabled ?? true,
            reduced_motion: data.reduced_motion ?? false,
          };
        }
      } catch (err) {
        console.warn('[PlatformProfileService] Supabase preferences fetch warning:', err);
      }
    }

    return { ...cachedPreferences };
  },

  async updatePreferences(updates: Partial<PlatformUserPreferences>): Promise<PlatformUserPreferences> {
    cachedPreferences = { ...cachedPreferences, ...updates };

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('platform_user_preferences')
          .upsert({
            ...cachedPreferences,
            updated_at: new Date().toISOString(),
          });
      } catch (err) {
        console.warn('[PlatformProfileService] Supabase preferences save warning:', err);
      }
    }

    return { ...cachedPreferences };
  },
};
