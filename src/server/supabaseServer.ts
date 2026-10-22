// src/server/supabaseServer.ts
// ============================================================
// Joy PeopleHR Enterprise — Supabase Server Integration
// Powered by @supabase/server for modern, zero-boilerplate
// server-side auth, credential verification, and client context.
// ============================================================

export {
  withSupabase,
  createSupabaseContext,
} from '@supabase/server';

export type {
  SupabaseContext,
  WithSupabaseConfig,
  AuthMode,
} from '@supabase/server';
