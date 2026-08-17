// src/services/platform/platformProfileService.ts
// ============================================================
// WorkForceOS — Platform Admin Profile & Identity Service
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
  first_name: 'Arun',
  last_name: 'Kumar',
  display_name: 'Arun Kumar',
  job_title: 'Chief Platform Architect & Super Admin',
  department: 'Platform Core & Infrastructure',
  phone: '+91 98765 43210',
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

export const platformProfileService = {
  // --- Profile Retrieval ---
  async getProfile(): Promise<PlatformAdminProfile> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('platform_profiles')
          .select('*')
          .limit(1)
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
        }
      } catch (err) {
        console.warn('[PlatformProfileService] Error reading from platform_profiles table:', err);
      }
    }
    return cachedProfile;
  },

  // --- Profile Update ---
  async updateProfile(updates: Partial<PlatformAdminProfile>): Promise<PlatformAdminProfile> {
    const prev = { ...cachedProfile };
    const updated: PlatformAdminProfile = {
      ...cachedProfile,
      ...updates,
      display_name: updates.display_name || `${updates.first_name || cachedProfile.first_name} ${updates.last_name || cachedProfile.last_name}`.trim(),
      last_profile_update_at: new Date().toISOString(),
    };

    cachedProfile = updated;

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('platform_profiles')
          .upsert({
            id: updated.id,
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
          });
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

    return updated;
  },

  // --- Avatar Storage & Management ---
  async uploadAvatar(file: File): Promise<string> {
    // Validate file type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      throw new Error('Unsupported image format. Please upload a JPEG, PNG, or WebP image.');
    }

    // Validate size (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      throw new Error('Avatar image size must be under 3MB.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        cachedProfile.avatar_url = dataUrl;
        cachedProfile.last_profile_update_at = new Date().toISOString();

        if (isSupabaseEnabled) {
          try {
            await supabase
              .from('platform_profiles')
              .update({ avatar_url: dataUrl, updated_at: new Date().toISOString() })
              .eq('id', cachedProfile.id);
          } catch (err) {
            console.warn('[PlatformProfileService] Supabase avatar save warning:', err);
          }
        }

        await platformAuditService.logEvent({
          action: 'profile.avatar_changed',
          category: 'Security',
          resource_type: 'Profile',
          resource_id: cachedProfile.id,
          resource_name: cachedProfile.display_name,
          severity: 'Normal',
          reason: `Platform Admin updated profile avatar photo (${file.name}, ${(file.size / 1024).toFixed(1)} KB)`,
        });

        resolve(dataUrl);
      };
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    });
  },

  async removeAvatar(): Promise<void> {
    cachedProfile.avatar_url = '';
    cachedProfile.last_profile_update_at = new Date().toISOString();

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('platform_profiles')
          .update({ avatar_url: '', updated_at: new Date().toISOString() })
          .eq('id', cachedProfile.id);
      } catch (err) {
        console.warn('[PlatformProfileService] Supabase remove avatar warning:', err);
      }
    }

    await platformAuditService.logEvent({
      action: 'profile.avatar_removed',
      category: 'Security',
      resource_type: 'Profile',
      resource_id: cachedProfile.id,
      resource_name: cachedProfile.display_name,
      severity: 'Normal',
      reason: `Platform Admin removed profile avatar photo`,
    });
  },

  // --- Preferences ---
  async getPreferences(): Promise<PlatformUserPreferences> {
    if (isSupabaseEnabled) {
      try {
        const { data } = await supabase
          .from('platform_user_preferences')
          .select('*')
          .limit(1)
          .maybeSingle();
        if (data) {
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
        console.warn('[PlatformProfileService] Error reading user preferences:', err);
      }
    }
    return cachedPreferences;
  },

  async updatePreferences(updates: Partial<PlatformUserPreferences>): Promise<PlatformUserPreferences> {
    cachedPreferences = { ...cachedPreferences, ...updates };

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('platform_user_preferences')
          .upsert({
            user_id: cachedProfile.id,
            ...cachedPreferences,
            updated_at: new Date().toISOString(),
          });
      } catch (err) {
        console.warn('[PlatformProfileService] Error saving user preferences:', err);
      }
    }

    return cachedPreferences;
  },
};
