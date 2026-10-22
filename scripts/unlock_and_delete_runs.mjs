import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function unlockAndDelete() {
  const runId = '9bce8b31-e175-4a93-9eca-d277cbf54e26';
  // Try updating status to DRAFT
  const { error: updErr } = await admin
    .from('payroll_runs')
    .update({ status: 'DRAFT' })
    .eq('id', runId);
  console.log('Update to DRAFT error:', updErr);

  // Now delete
  const { error: delErr } = await admin
    .from('payroll_runs')
    .delete()
    .eq('id', runId);
  console.log('Delete error:', delErr);

  // Also delete other 6-employee runs (month 7 and 8)
  const { error: delOtherErr } = await admin
    .from('payroll_runs')
    .delete()
    .eq('total_employees', 6);
  console.log('Delete other 6-employee runs:', delOtherErr);

  // Check remaining runs
  const { data: remaining } = await admin.from('payroll_runs').select('*');
  console.log('Remaining runs count:', remaining?.length);
}

unlockAndDelete();
