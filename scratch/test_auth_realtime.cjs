const { createClient } = require('@supabase/supabase-js');

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, ANON_KEY);

async function testAuthRealtime() {
  console.log('1. Signing in first as dharun@joyglobalcorp.com...');
  await supabase.auth.signInWithPassword({
    email: 'dharun@joyglobalcorp.com',
    password: 'joypeoplehr'
  });

  let received = false;

  console.log('2. Subscribing to notification_events with authenticated JWT...');
  const channel = supabase
    .channel('auth-notifications-mesh')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notification_events' },
      (payload) => {
        console.log('🔥 REALTIME EVENT RECEIVED OVER WEBSOCKET:', payload.eventType, payload.new?.title);
        received = true;
      }
    )
    .subscribe((status, err) => {
      console.log('Channel subscription status:', status, err ? err : '');
    });

  await new Promise(r => setTimeout(r, 3000));

  console.log('3. Inserting a test broadcast row into notification_events...');
  const { data, error } = await supabase.from('notification_events').insert([{
    organization_id: '0c621892-e938-4707-9957-13534ea32c19',
    channel: 'IN_APP',
    title: 'Authenticated Realtime Test ' + Date.now(),
    message: 'Testing if Supabase Realtime emits over WebSocket to authenticated client',
    is_sent: true,
    is_read: false
  }]).select();

  console.log('Inserted row:', data?.[0]?.id, error ? error.message : 'OK');

  await new Promise(r => setTimeout(r, 6000));
  console.log('Authenticated Realtime result: ' + (received ? 'SUCCESS!' : 'FAILED!'));
  await supabase.removeChannel(channel);
}

testAuthRealtime().catch(console.error);
