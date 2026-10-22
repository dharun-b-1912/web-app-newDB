import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkDetails() {
  const thirumalaiId = '0dc8993f-c0cc-4143-aedc-d4893e41b001';

  // Check manager
  const { data: manager } = await supabase
    .from('employees')
    .select('id, employee_code, first_name, last_name, display_name')
    .eq('id', '55f486f8-e3aa-4133-9e85-dfc519ed2825')
    .single();
  console.log('Manager of Thirumalai:', manager);

  // Check statutory
  const { data: stat } = await supabase
    .from('employee_statutory_details')
    .select('*')
    .eq('employee_id', thirumalaiId);
  console.log('Statutory for Thirumalai:', stat);

  // Check bank
  const { data: bank } = await supabase
    .from('employee_bank_details')
    .select('*')
    .eq('employee_id', thirumalaiId);
  console.log('Bank for Thirumalai:', bank);

  // Check emergency contacts
  const { data: contacts } = await supabase
    .from('employee_emergency_contacts')
    .select('*')
    .eq('employee_id', thirumalaiId);
  console.log('Emergency contacts for Thirumalai:', contacts);

  // Check attendance_punches & attendance_daily for all employees
  const { data: punches, count: pCount } = await supabase
    .from('attendance_punches')
    .select('*', { count: 'exact' })
    .limit(10);
  console.log('Total attendance_punches:', pCount, punches);

  const { data: daily, count: dCount } = await supabase
    .from('attendance_daily')
    .select('*', { count: 'exact' })
    .limit(10);
  console.log('Total attendance_daily:', dCount, daily);

  // Check attendance_events
  const { data: events, count: eCount } = await supabase
    .from('attendance_events')
    .select('*', { count: 'exact' })
    .limit(10);
  console.log('Total attendance_events:', eCount);

  // Check shifts & shift assignments
  const { data: shiftAssignments } = await supabase
    .from('employee_shift_assignments')
    .select('*')
    .eq('employee_id', thirumalaiId);
  console.log('Shift assignments for Thirumalai:', shiftAssignments);

  // Check work location assignments
  const { data: locAssignments } = await supabase
    .from('employee_work_location_assignments')
    .select('*, work_locations(*)')
    .eq('employee_id', thirumalaiId);
  console.log('Work location assignments for Thirumalai:', JSON.stringify(locAssignments, null, 2));
}

checkDetails();
