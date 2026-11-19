const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findConnectedSerial() {
  console.log('=== CHECKING SENTINEL INCIDENTS & TELEMETRY ===');
  const { data: incs, error: incErr } = await supabase
    .from('sentinel_incidents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log('Sentinel Incidents:', JSON.stringify(incs, null, 2), incErr);

  const { data: events, error: evErr } = await supabase
    .from('sentinel_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log('Sentinel Events:', JSON.stringify(events, null, 2), evErr);

  // Check communication_dispatch_logs or telegram_messages
  const { data: logs } = await supabase
    .from('communication_dispatch_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log('Dispatch logs:', logs);
}

findConnectedSerial();

