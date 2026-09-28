import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createTestNotifications() {
  console.log('--- FETCHING ACTIVE ORGANIZATION & EMPLOYEES ---');
  const { data: emps, error: empErr } = await supabase
    .from('employees')
    .select('id, employee_code, first_name, last_name, organization_id, user_id')
    .limit(5);

  if (empErr || !emps || emps.length === 0) {
    console.error('Failed to fetch employees:', empErr);
    return;
  }

  const orgId = emps[0].organization_id;
  console.log(`Organization ID: ${orgId}`);
  console.log(`Employees found: ${emps.map(e => `${e.first_name} ${e.last_name} (${e.employee_code})`).join(', ')}`);

  // 1. Company Announcement Test Notification (Broadcast to entire org)
  console.log('\n--- 1. INSERTING TEST ANNOUNCEMENT NOTIFICATION ---');
  const announcementPayload = {
    organization_id: orgId,
    title: '📢 Q3 Company Town Hall & Strategy Update',
    message: 'All team members are cordially invited to our Q3 Town Hall meeting this Friday at 4:00 PM IST. Join via the link in Announcements.',
    channel: 'IN_APP',
    action_url: 'announcements',
    is_sent: true,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  const { data: annData, error: annErr } = await supabase
    .from('notification_events')
    .insert([announcementPayload])
    .select();

  if (annErr) {
    console.error('Failed to insert announcement notification:', annErr.message);
  } else {
    console.log('✅ Successfully inserted Announcement Notification:');
    console.log('   ID:', annData?.[0]?.id);
    console.log('   Title:', annData?.[0]?.title);
    console.log('   Action URL:', annData?.[0]?.action_url);
  }

  // 2. Payslip Released Test Notifications for each employee
  console.log('\n--- 2. INSERTING TEST PAYSLIP NOTIFICATIONS FOR ACTUAL EMPLOYEES ---');
  for (const emp of emps) {
    const payslipPayload = {
      organization_id: orgId,
      recipient_user_id: emp.user_id || null,
      title: '💳 August 2026 Salary Payslip Released',
      message: `Hello ${emp.first_name}, your salary payslip for August 2026 has been published and is ready for download. Net Pay credited.`,
      channel: 'PUSH',
      action_url: 'payslip',
      is_sent: true,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    const { data: payData, error: payErr } = await supabase
      .from('notification_events')
      .insert([payslipPayload])
      .select();

    if (payErr) {
      console.error(`Failed to insert payslip notification for ${emp.first_name}:`, payErr.message);
    } else {
      console.log(`✅ Successfully inserted Payslip Notification for ${emp.first_name} ${emp.last_name} (${emp.employee_code}):`);
      console.log('   ID:', payData?.[0]?.id);
      console.log('   Title:', payData?.[0]?.title);
      console.log('   Action URL:', payData?.[0]?.action_url);
    }
  }

  console.log('\n--- VERIFYING LATEST NOTIFICATIONS IN DATABASE ---');
  const { data: latestEvents } = await supabase
    .from('notification_events')
    .select('id, title, message, action_url, recipient_user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(6);

  console.log('Latest 6 notifications in Supabase notification_events:');
  latestEvents?.forEach((ev, idx) => {
    console.log(` [${idx + 1}] ${ev.title} -> Route: ${ev.action_url} (Created: ${ev.created_at})`);
  });
}

createTestNotifications();
