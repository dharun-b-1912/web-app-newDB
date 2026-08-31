// src/services/platform/supabasePlatformClient.ts
// ============================================================
// Joy PeopleHR — Supabase & PostgreSQL Platform Client Adapter
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';

export function getSupabasePlatformClient(): SupabaseClient {
  return supabase;
}

export const isSupabaseConfigured = (): boolean => {
  return isSupabaseEnabled;
};

