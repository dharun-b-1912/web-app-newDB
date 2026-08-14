import { createClient } from '@supabase/supabase-js';

// ============================================================
// WorkforceOS — Supabase Client
// ============================================================
// Single shared client for the entire app.
// Import { supabase, db, auth, storage, isSupabaseEnabled }
// Never call createClient anywhere else.
//
// isSupabaseEnabled = false → app uses localStorage mock (safe default)
// isSupabaseEnabled = true  → real Supabase DB + Auth active
// ============================================================

const meta = import.meta as any;
const supabaseUrl     = meta.env?.VITE_SUPABASE_URL     || 'https://placeholder.supabase.co';
const supabaseAnonKey = meta.env?.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

/**
 * True when a real Supabase project is wired up in .env.local.
 * False when using placeholder values → mock/localStorage mode.
 */
export const isSupabaseEnabled: boolean =
  !!supabaseUrl &&
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  !!supabaseAnonKey &&
  supabaseAnonKey !== 'placeholder-anon-key';

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
