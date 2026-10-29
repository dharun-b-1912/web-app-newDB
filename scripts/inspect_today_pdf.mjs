import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

async function inspectPdf() {
  const { data, error } = await sb.storage.from('attendance-reports').download('JOY_Evening_2026-10-28.pdf');
  if (error) {
    console.error('Download error:', error);
    return;
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  fs.writeFileSync('temp_evening_2026-10-28.pdf', buffer);
  console.log('Saved temp_evening_2026-10-28.pdf, size:', buffer.length);

  // Search for null or 0 in the pdf stream text
  const text = buffer.toString('latin1');
  console.log('Contains "null"?', text.includes('null'));
  console.log('Contains "0h 00m"?', text.includes('0h 00m'));
  console.log('Contains "0 Staff"?', text.includes('0 Staff'));

  // Also check audit logs
  const { data: logs } = await sb.from('mis_delivery_audit_logs')
    .select('*')
    .eq('reporting_date', '2026-10-28')
    .order('created_at', { ascending: false })
    .limit(5);
  console.log('Audit logs for today:', JSON.stringify(logs, null, 2));
}

inspectPdf();
