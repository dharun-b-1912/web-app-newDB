import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function findBankData() {
  const tables = [
    'employee_bank_details',
    'employee_statutory_details',
    'payroll_employees',
    'payroll_records',
    'employee_profiles',
    'user_profiles',
    'payroll_salary_structures'
  ];

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(5);
    console.log(`Table ${t}:`, data?.length ? data : (error?.message || 'empty'));
  }
}

findBankData();
