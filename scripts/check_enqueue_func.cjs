const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function check() {
  const { data: outboxSample } = await supabase.from('notification_outbox').select('*').limit(3);
  console.log('Recent notification_outbox records:', outboxSample);

  const { data: eventsSample } = await supabase.from('notification_events').select('*').limit(3);
  console.log('Recent notification_events records:', eventsSample);
}
check();

