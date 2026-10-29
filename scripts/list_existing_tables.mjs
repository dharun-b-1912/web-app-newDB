import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function listTables() {
  // Let's test attendance-related tables
  const testNames = [
    'attendance',
    'attendance_logs',
    'attendance_events',
    'attendance_daily',
    'attendance_master',
    'employee_attendance',
    'biometric_logs',
    'biometric_punches',
    'biometric_devices',
    'permissions',
    'requests',
    'employee_requests',
    'leave_requests',
    'employees',
    'organizations'
  ];

  for (const name of testNames) {
    const { data, error } = await supabase.from(name).select('*').limit(1);
    if (!error) {
      console.log(`[FOUND] ${name}`);
    }
  }
}

listTables();
