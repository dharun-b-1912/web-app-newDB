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

export const supabaseServiceKey =
  meta.env?.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

/** Admin client that bypasses RLS for enterprise core tables */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'sb-admin-none',
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
let _sessionVerifiedTimestamp: number = 0;
let _cachedActiveSession: any = null;

/**
 * Ensures the browser has a valid, authenticated Supabase JWT session.
 * Atomically single-flighted and cached for 60 seconds so parallel calls from
 * multiple components never spam redundant signInWithPassword or getSession calls.
 */
export const ensureSupabaseSession = async (): Promise<any> => {
  if (!isSupabaseEnabled) return null;

  const now = Date.now();
  if (_cachedActiveSession && now - _sessionVerifiedTimestamp < 60_000) {
    return _cachedActiveSession;
  }

  // FAST PATH: Read existing valid session from localStorage in 0.01ms (prevents waiting for GoTrue lock/network)
  if (typeof window !== 'undefined') {
    try {
      const rawSb = localStorage.getItem(`sb-${supabaseProject}-auth-token`);
      if (rawSb) {
        const parsed = JSON.parse(rawSb);
        const session = parsed?.currentSession || parsed;
        if (session?.access_token && session?.user) {
          const expSec = session.expires_at || 0;
          if (!expSec || expSec * 1000 > now + 30_000) {
            _cachedActiveSession = session;
            _sessionVerifiedTimestamp = now;
            return session;
          }
        }
      }
    } catch (_) {}
  }

  if (_sessionHealPromise) {
    return _sessionHealPromise;
  }

  _sessionHealPromise = (async () => {
    try {
      // Bounded getSession with 1500ms timeout
      const sessionPromise = supabase.auth.getSession();
      const sessionTimeout = new Promise<{ data: { session: any } }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null } }), 1500)
      );
      const { data } = await Promise.race([sessionPromise, sessionTimeout]);

      if (data?.session?.user) {
        _cachedActiveSession = data.session;
        _sessionVerifiedTimestamp = Date.now();
        return data.session;
      }

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

      const isLocalhost = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname === '0.0.0.0');

      // In production (e.g. app.joypeoplehr.com), never auto-sign-in with dev credentials
      if (!isLocalhost && !targetEmail) {
        return null;
      }

      const envDevEmail = isLocalhost ? (meta.env?.VITE_DEV_AUTH_EMAIL || 'marimuthu@joycorporatesolutions.com') : '';
      const envDevPass = isLocalhost ? (meta.env?.VITE_DEV_AUTH_PASSWORD || 'joypeoplehr') : '';
      const authEmail = (targetEmail && !targetEmail.includes('superadmin') && !targetEmail.includes('vguard'))
        ? targetEmail
        : envDevEmail;

      if (!authEmail || !envDevPass) {
        return null;
      }

      const signInPromise = supabase.auth.signInWithPassword({
        email: authEmail,
        password: envDevPass,
      });
      const signInTimeout = new Promise<{ data: any; error: any }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('Auth timeout') }), 8000)
      );
      let { data: signInData, error } = await Promise.race([signInPromise, signInTimeout]);

      // If targetEmail password failed, fallback to the guaranteed dev admin account
      if ((error || !signInData?.session) && authEmail !== envDevEmail) {
        try {
          const fallbackRes = await supabase.auth.signInWithPassword({
            email: envDevEmail,
            password: envDevPass,
          });
          if (!fallbackRes.error && fallbackRes.data?.session) {
            signInData = fallbackRes.data;
            error = null;
          }
        } catch (_) {}
      }

      if (!error && signInData?.session) {
        _cachedActiveSession = signInData.session;
        _sessionVerifiedTimestamp = Date.now();
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


