const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc'
);

async function check() {
  const tables = [
    'users', 'employees', 'notification_events', 'notifications', 
    'device_tokens', 'user_devices', 'push_tokens', 'app_notifications',
    'announcements', 'attendance_records', 'leave_requests'
  ];
  for (const t of tables) {
    const res = await supabase.from(t).select('*').limit(1);
    console.log(t, res.error ? 'ERR: ' + res.error.message : 'OK');
  }
}
check();
