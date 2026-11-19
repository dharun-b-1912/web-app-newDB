require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkWaLogs() {
  const { data, error } = await supabase
    .from('whatsapp_dispatch_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }

  console.log('Recent 10 WhatsApp logs:');
  for (const log of data) {
    console.log(`[${log.created_at}] Template: ${log.template_name} | To: ${log.recipient_phone} | Status: ${log.status} | Err: ${log.error_message || 'none'}`);
  }
}

checkWaLogs();

