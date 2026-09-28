const { createClient } = require('@supabase/supabase-js');

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, ANON_KEY);

async function sendRealNotification() {
  console.log('1. Signing in as Super Admin...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912',
  });

  if (authErr) {
    console.error('Login failed:', authErr.message);
    return;
  }

  console.log('✓ Authenticated as:', authData.user.email, '(ID:', authData.user.id, ')');

  // Insert real live notification into notification_events
  const liveNotification = {
    organization_id: '0c621892-e938-4707-9957-13534ea32c19',
    channel: 'IN_APP',
    title: '📢 Realtime Push Notification Verification',
    message: 'Hello! Your JOY PeopleHR v1.0.5 notification tray & live push synchronization are active.',
    action_url: 'announcements',
    is_read: false,
    is_sent: true,
  };

  console.log('2. Inserting live notification into notification_events...');
  const { data: notifData, error: notifErr } = await supabase
    .from('notification_events')
    .insert([liveNotification])
    .select();

  if (notifErr) {
    console.error('Failed to insert notification:', notifErr.message);
  } else {
    console.log('✓ Successfully dispatched live notification event:');
    console.log(JSON.stringify(notifData, null, 2));
  }
}

sendRealNotification().catch(console.error);
