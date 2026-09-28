const { createClient } = require('@supabase/supabase-js');

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(URL, ANON_KEY);

async function testRealtimeBroadcast() {
  console.log('1. Subscribing to notification_events on supabase_realtime...');
  
  let received = false;

  const channel = supabase
    .channel('test-notifications-mesh')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notification_events' },
      (payload) => {
        console.log('🔥 REALTIME EVENT RECEIVED OVER WEBSOCKET:', payload.eventType, payload.new);
        received = true;
      }
    )
    .subscribe((status, err) => {
      console.log('Channel subscription status:', status, err ? err : '');
    });

  // Wait 3 seconds for channel to connect
  await new Promise(r => setTimeout(r, 3000));

  console.log('2. Signing in and inserting a row to test WebSocket broadcast...');
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'dharun@joyglobalcorp.com',
    password: 'joypeoplehr'
  });

  const { data, error } = await supabase.from('notification_events').insert([{
    organization_id: '0c621892-e938-4707-9957-13534ea32c19',
    channel: 'IN_APP',
    title: 'Realtime Probe ' + Date.now(),
    message: 'Testing if Supabase Realtime emits over WebSocket to client',
    is_sent: true,
    is_read: false
  }]).select();

  console.log('Inserted row:', data?.[0]?.id, error ? error.message : 'OK');

  // Wait 5 seconds to see if received
  await new Promise(r => setTimeout(r, 5000));

  console.log('Result: Realtime event was ' + (received ? 'RECEIVED!' : 'NOT RECEIVED (Table not in publication or RLS blocking realtime)!'));
  await supabase.removeChannel(channel);
}

testRealtimeBroadcast().catch(console.error);
