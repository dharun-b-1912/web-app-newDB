const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('1. Checking push_subscriptions...');
  const { data: subs, error: subErr } = await supabase
    .from('push_subscriptions')
    .select('*')
    .order('last_seen_at', { ascending: false })
    .limit(10);
  
  if (subErr) {
    console.log('push_subscriptions error:', subErr.message);
  } else {
    console.log('push_subscriptions count:', subs?.length);
    console.log(JSON.stringify(subs, null, 2));
  }

  console.log('\n2. Checking employee_device_tokens...');
  const { data: devTokens, error: devErr } = await supabase
    .from('employee_device_tokens')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (devErr) {
    console.log('employee_device_tokens error:', devErr.message);
  } else {
    console.log('employee_device_tokens count:', devTokens?.length);
    console.log(JSON.stringify(devTokens, null, 2));
  }

  console.log('\n3. Checking recent notification_events...');
  const { data: notifs, error: notifErr } = await supabase
    .from('notification_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (notifErr) {
    console.log('notification_events error:', notifErr.message);
  } else {
    console.log('Recent notification_events:', notifs?.length);
    console.log(JSON.stringify(notifs?.map(n => ({ id: n.id, title: n.title, message: n.message, created_at: n.created_at, recipient_user_id: n.recipient_user_id })), null, 2));
  }
}

main().catch(console.error);
