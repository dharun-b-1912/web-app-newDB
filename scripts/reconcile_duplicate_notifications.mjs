// scripts/reconcile_duplicate_notifications.mjs
import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function reconcile() {
  console.log('=== JOY PeopleHR Safe Notification & Device Token Reconciliation ===');

  // 1. Audit duplicate notification_events
  const { data: allNotifs, error: notifErr } = await supabase
    .from('notification_events')
    .select('id, recipient_user_id, title, message, channel, is_read, created_at')
    .order('created_at', { ascending: true });

  if (notifErr) {
    console.error('Failed to query notification_events:', notifErr);
    return;
  }

  const groups = new Map();
  for (const n of allNotifs || []) {
    const key = `${n.recipient_user_id || 'broadcast'}|${n.title.trim()}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(n);
  }

  let duplicateCount = 0;
  const duplicateIdsToRemove = [];

  for (const [key, records] of groups.entries()) {
    if (records.length > 1) {
      console.log(`Found ${records.length} duplicate notifications for [${key}]`);
      // Keep the first (authoritative) record
      const [primary, ...duplicates] = records;
      
      // If any duplicate was read, ensure primary is marked read
      const anyRead = records.some(r => r.is_read);
      if (anyRead && !primary.is_read) {
        await supabase
          .from('notification_events')
          .update({ is_read: true })
          .eq('id', primary.id);
      }

      for (const d of duplicates) {
        duplicateIdsToRemove.push(d.id);
        duplicateCount++;
      }
    }
  }

  console.log(`Identified ${duplicateCount} duplicate notification records to clean up.`);

  if (duplicateIdsToRemove.length > 0) {
    // Safely remove duplicates in batches
    for (let i = 0; i < duplicateIdsToRemove.length; i += 50) {
      const batch = duplicateIdsToRemove.slice(i, i + 50);
      const { error: delErr } = await supabase
        .from('notification_events')
        .delete()
        .in('id', batch);

      if (delErr) {
        console.warn('Error deleting duplicate batch:', delErr);
      } else {
        console.log(`✓ Cleaned batch of ${batch.length} duplicate notification rows.`);
      }
    }
  } else {
    console.log('✓ No duplicate notification records found.');
  }

  // 2. Audit and deduplicate employee_device_tokens
  const { data: tokens, error: tokErr } = await supabase
    .from('employee_device_tokens')
    .select('id, employee_id, auth_user_id, fcm_token, platform, updated_at')
    .order('updated_at', { ascending: false });

  if (tokErr) {
    console.error('Failed to query employee_device_tokens:', tokErr);
    return;
  }

  const tokenGroups = new Map();
  for (const t of tokens || []) {
    const empKey = t.employee_id || t.auth_user_id;
    const key = `${empKey}|${t.platform || 'android'}`;
    if (!tokenGroups.has(key)) {
      tokenGroups.set(key, []);
    }
    tokenGroups.get(key).push(t);
  }

  let staleTokensCount = 0;
  const staleTokenIds = [];

  for (const [key, tList] of tokenGroups.entries()) {
    if (tList.length > 1) {
      console.log(`Employee [${key}] has ${tList.length} device tokens. Retaining latest active token.`);
      const [latest, ...stale] = tList;
      for (const s of stale) {
        staleTokenIds.push(s.id);
        staleTokensCount++;
      }
    }
  }

  console.log(`Identified ${staleTokensCount} stale/duplicate device tokens.`);
  if (staleTokenIds.length > 0) {
    const { error: delTokErr } = await supabase
      .from('employee_device_tokens')
      .delete()
      .in('id', staleTokenIds);

    if (delTokErr) {
      console.warn('Error deleting stale tokens:', delTokErr);
    } else {
      console.log(`✓ Cleaned ${staleTokenIds.length} stale device tokens.`);
    }
  } else {
    console.log('✓ No stale device tokens found.');
  }

  console.log('=== Reconciliation Completed Successfully ===');
}

reconcile();
