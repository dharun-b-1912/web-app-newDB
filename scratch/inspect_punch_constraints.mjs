import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE5Mzg3NywiZXhwIjoyMDg3NzY5ODc3fQ.0N2vLpms1s4F7qL_eOsnOecbT0AdVz29r54qC0198qE';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function inspect() {
  const { data, error } = await admin.rpc('exec_sql', {
    sql_query: `
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'public.attendance_punches'::regclass;
    `
  });
  console.log('Constraints:', data, error);
}

inspect();
