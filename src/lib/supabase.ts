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
const supabaseUrl =
  meta.env?.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const supabaseAnonKey =
  meta.env?.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

/**
 * True when a real Supabase project is wired up.
 */
export const isSupabaseEnabled: boolean = true;

/** @deprecated Use isSupabaseEnabled (constant) instead */
export const isSupabaseConfigured = () => isSupabaseEnabled;

/** Supabase JS client — always created, only used when isSupabaseEnabled */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

