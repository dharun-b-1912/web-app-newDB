const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL\s*=\s*([^\r\n]+)/)[1].trim().replace(/['"]/g, '');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const list = [
  'notifications', 'notification_logs', 'notification_queue', 'notification_events',
  'user_notifications', 'employee_notifications', 'push_notifications', 'push_subscriptions',
  'in_app_notifications', 'alerts', 'system_notifications', 'messages'
];

async function run() {
  for (const t of list) {
    const res = await fetch(`${url}/rest/v1/${t}?select=*&limit=1`, {
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
    });
    if (res.status === 200) {
      console.log(`EXISTS: ${t}`);
      const rows = await res.json();
      if (rows.length > 0) console.log(t, 'sample row:', Object.keys(rows[0]));
    }
  }
}

run();
