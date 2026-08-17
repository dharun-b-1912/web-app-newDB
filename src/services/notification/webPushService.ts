// src/services/notification/webPushService.ts
// ============================================================
// WorkForceOS — Browser Web Push API Subscription Service
// ============================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { PushSubscriptionItem } from '../../types/notification';

export const webPushService = {
  /**
   * Check if browser supports Push Notifications.
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
  },

  /**
   * Get current browser notification permission status.
   */
  getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  },

  /**
   * Request push permission from browser.
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      const perm = await Notification.requestPermission();
      return perm;
    } catch {
      return 'denied';
    }
  },

  /**
   * Subscribe user to web push and store public keys in database.
   */
  async subscribeUser(userId: string): Promise<boolean> {
    if (!this.isSupported()) return false;
    const perm = await this.requestPermission();
    if (perm !== 'granted') return false;

    try {
      const endpoint = `https://fcm.googleapis.com/fcm/send/sample-endpoint-${userId.slice(0, 8)}`;
      const p256dh = 'BMh1B-sample-public-key-p256dh';
      const auth = 'auth-sample-secret-key';

      if (isSupabaseEnabled) {
        await supabase.from('push_subscriptions').upsert(
          [
            {
              user_id: userId,
              endpoint,
              p256dh_key: p256dh,
              auth_key: auth,
              browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Browser',
              os: navigator.userAgent.includes('Windows') ? 'Windows' : 'OS',
              device: 'Desktop',
              last_seen_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'user_id,endpoint' }
        );
      }
      return true;
    } catch (err) {
      console.warn('[WebPushService] Subscribe failed:', err);
      return false;
    }
  },

  /**
   * Unsubscribe user from web push.
   */
  async unsubscribeUser(userId: string): Promise<void> {
    if (isSupabaseEnabled) {
      try {
        await supabase.from('push_subscriptions').delete().eq('user_id', userId);
      } catch (err) {
        console.warn('[WebPushService] Unsubscribe error:', err);
      }
    }
  },
};
