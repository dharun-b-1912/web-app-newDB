const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc'
);

async function testInsert() {
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'dharun@joyglobalcorp.com',
    password: 'joypeoplehr'
  });
  if (authErr) {
    console.error('Auth error:', authErr);
    return;
  }
  console.log('Authenticated as user:', auth.user.id);

  const { data, error } = await supabase.from('notification_events').insert({
    organization_id: '0c621892-e938-4707-9957-13534ea32c19',
    recipient_user_id: 'a64cc800-7219-472c-bcea-2b572959f457',
    channel: 'IN_APP',
    title: '🔔 JOY PeopleHR Live Notification',
    message: 'Hello Dharun! Real-time background push notification and system sound are active!',
    action_url: '/attendance',
    is_read: false,
    is_sent: true
  }).select('*').single();

  if (error) {
    console.error('Insert error:', error.message);
  } else {
    console.log('SUCCESS! Created notification_event:', data.id);
    console.log('All columns of row:', Object.keys(data));
  }
}

testInsert();
