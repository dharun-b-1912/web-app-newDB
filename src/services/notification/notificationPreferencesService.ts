// src/services/notification/notificationPreferencesService.ts
// ============================================================
// WorkForceOS — Notification Preferences & Quiet Hours Service
// ============================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { NotificationCategory, NotificationChannel, NotificationPreferenceItem } from '../../types/notification';

const DEFAULT_CATEGORIES: NotificationCategory[] = [
  'APPROVAL',
  'SECURITY',
  'INTEGRATION',
  'PLATFORM',
  'BILLING',
  'SUPPORT',
  'SYSTEM',
];

const DEFAULT_CHANNELS: NotificationChannel[] = ['IN_APP', 'EMAIL', 'PUSH', 'WHATSAPP'];

export const notificationPreferencesService = {
  /**
   * Get all notification preferences for a user.
   */
  async getPreferences(userId: string): Promise<NotificationPreferenceItem[]> {
    let prefs: NotificationPreferenceItem[] = [];

    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', userId);

        if (data && !error && data.length > 0) {
          prefs = data.map((d: any) => ({
            id: d.id,
            user_id: d.user_id,
            organization_id: d.organization_id,
            category: d.category,
            channel: d.channel,
            enabled: d.enabled,
            quiet_hours_enabled: d.quiet_hours_enabled,
            quiet_hours_start: d.quiet_hours_start || '22:00',
            quiet_hours_end: d.quiet_hours_end || '08:00',
          }));
        }
      } catch (err) {
        console.warn('[NotificationPreferencesService] Supabase get fallback', err);
      }
    }

    // Default Matrix if unseeded
    if (prefs.length === 0) {
      DEFAULT_CATEGORIES.forEach((cat) => {
        DEFAULT_CHANNELS.forEach((ch) => {
          prefs.push({
            id: `pref-${cat}-${ch}`,
            user_id: userId,
            category: cat,
            channel: ch,
            enabled: ch === 'IN_APP' || (cat === 'SECURITY' && ch === 'EMAIL') || (cat === 'APPROVAL' && ch === 'EMAIL'),
            quiet_hours_enabled: false,
            quiet_hours_start: '22:00',
            quiet_hours_end: '08:00',
          });
        });
      });
    }

    return prefs;
  },

  /**
   * Update preference for a specific category and channel.
   */
  async updatePreference(params: {
    userId: string;
    category: NotificationCategory;
    channel: NotificationChannel;
    enabled: boolean;
  }): Promise<void> {
    if (isSupabaseEnabled) {
      try {
        await supabase.from('notification_preferences').upsert(
          [
            {
              user_id: params.userId,
              category: params.category,
              channel: params.channel,
              enabled: params.enabled,
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'user_id,category,channel' }
        );
      } catch (err) {
        console.warn('[NotificationPreferencesService] Supabase update fallback', err);
      }
    }
  },

  /**
   * Update quiet hours for a user.
   */
  async updateQuietHours(params: {
    userId: string;
    enabled: boolean;
    start: string;
    end: string;
  }): Promise<void> {
    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('notification_preferences')
          .update({
            quiet_hours_enabled: params.enabled,
            quiet_hours_start: params.start,
            quiet_hours_end: params.end,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', params.userId);
      } catch (err) {
        console.warn('[NotificationPreferencesService] Supabase update quiet hours fallback', err);
      }
    }
  },
};
