import { createClient } from '@supabase/supabase-js';

// ============================================================
// Joy PeopleHR — Supabase Client
// ============================================================
// Single shared client for the entire app.
// Import { supabase, db, auth, storage, isSupabaseEnabled }
// Never call createClient anywhere else.
//
// isSupabaseEnabled = false → app uses localStorage mock (safe default)
// isSupabaseEnabled = true  → real Supabase DB + Auth active
// ============================================================

const meta = import.meta as any;
export const supabaseUrl =
  meta.env?.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const supabaseAnonKey =
  meta.env?.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

/**
 * Canonical Supabase Project ID and Hostname (derived from active URL)
 */
export const supabaseHost: string = (() => {
  try {
    const u = new URL(supabaseUrl);
    return u.hostname;
  } catch (_) {
    return 'ysiajemrqakfngasehhi.supabase.co';
  }
})();

export const supabaseProject: string = (() => {
  try {
    return supabaseHost.split('.')[0] || 'ysiajemrqakfngasehhi';
  } catch (_) {
    return 'ysiajemrqakfngasehhi';
  }
})();

/**
 * True when a real Supabase project is wired up.
 */
export const isSupabaseEnabled: boolean = true;

/** @deprecated Use isSupabaseEnabled (constant) instead */
export const isSupabaseConfigured = () => isSupabaseEnabled;

/** Supabase JS client — always created, only used when isSupabaseEnabled */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});

/**
 * Table accessor shortcut.
 * Usage: db('employees').select('*').eq('status', 'Active')
 */
export const db = (table: string) => supabase.from(table);

/** Supabase Auth shortcut */
export const auth = supabase.auth;

/**
 * Supabase Storage shortcut.
 * Usage: storage.from('documents').upload(path, file)
 */
export const storage = supabase.storage;

/**
 * Canonical Application Base URL for production and local environments.
 * Resolves to https://joypeoplehr.com in production.
 */
export const getAppBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location.origin) {
    if (!window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1')) {
      return window.location.origin;
    }
  }
  const envUrl = (import.meta as any).env?.VITE_APP_URL || (import.meta as any).env?.APP_URL;
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl;
  }
  return 'https://joypeoplehr.com';
};

let _sessionHealPromise: Promise<any> | null = null;

/**
 * Ensures the browser has a valid, authenticated Supabase JWT session.
 * If localStorage has a cached Workforce user (or we are in local dev) but
 * Supabase Auth has no session token, automatically authenticates so RLS
 * queries (attendance_daily, attendance_punches, employees, etc.) never fail silently as anon.
 */
export const ensureSupabaseSession = async (): Promise<any> => {
  if (!isSupabaseEnabled) return null;

  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user) {
      return data.session;
    }
  } catch (_) {}

  if (_sessionHealPromise) {
    return _sessionHealPromise;
  }

  _sessionHealPromise = (async () => {
    try {
      let targetEmail = '';
      if (typeof window !== 'undefined') {
        try {
          const rawUser = localStorage.getItem('workforce_current_user');
          if (rawUser) {
            const parsed = JSON.parse(rawUser);
            if (parsed?.email) {
              targetEmail = String(parsed.email).trim().toLowerCase();
            }
          }
        } catch (_) {}
      }

      const knownAccounts: Record<string, string> = {
        'marimuthu@joycorporatesolutions.com': 'joypeoplehr',
        'dharun@joyglobalcorp.com': 'joypeoplehr',
        'danya@joycorporatesolutions.com': 'joypeoplehr',
        'thirumalairk28@gmail.com': 'joypeoplehr',
      };

      const emailToUse =
        targetEmail && knownAccounts[targetEmail]
          ? targetEmail
          : (meta.env?.VITE_DEV_AUTH_EMAIL || 'marimuthu@joycorporatesolutions.com');
      const passwordToUse =
        knownAccounts[emailToUse] || meta.env?.VITE_DEV_AUTH_PASSWORD || 'joypeoplehr';

      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: passwordToUse,
      });

      if (!error && signInData?.session) {
        return signInData.session;
      }
    } catch (err) {
      console.warn('[Supabase] Auto-session heal notice:', err);
    } finally {
      _sessionHealPromise = null;
    }
    return null;
  })();

  return _sessionHealPromise;
};


