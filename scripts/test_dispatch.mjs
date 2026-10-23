import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testDispatcher() {
  console.log('Testing attendance-report-dispatcher for Joy Corporate Solutions...');
  const edgeUrl = `${SUPABASE_URL}/functions/v1/attendance-report-dispatcher`;

  const resp = await fetch(edgeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      slot: 'MORNING',
      mode: 'MANUAL_DISPATCH',
      organization_id: '0c621892-e938-4707-9957-13534ea32c19',
      date: '2026-10-23',
    }),
  });

  const json = await resp.json().catch(() => null);
  console.log('Status HTTP:', resp.status);
  console.log('Response Payload:', JSON.stringify(json, null, 2));

  // Verify Audit Logs
  const { data: audit, error: auditErr } = await supabase
    .from('mis_delivery_audit_logs')
    .select('*')
    .eq('organization_id', '0c621892-e938-4707-9957-13534ea32c19')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Audit Logs (latest 5):', JSON.stringify(audit, null, 2));
}

testDispatcher();
