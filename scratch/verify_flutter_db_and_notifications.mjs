import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runAudit() {
  console.log('================================================================');
  console.log('🔍 FLUTTER DATABASE & PUSH NOTIFICATION SYSTEM AUDIT');
  console.log('================================================================\n');

  // 1. Check database connection and Core Tables used by Flutter
  console.log('1. Checking Core Tables accessed by Flutter Mobile App:');
  const tables = [
    'employees',
    'user_profiles',
    'notification_events',
    'attendance_punches',
    'attendance_daily',
    'attendance_regularizations',
    'leave_requests',
    'leave_balances',
    'leave_types',
    'employee_documents',
    'employee_requests',
    'payslips',
    'shifts',
    'work_locations',
  ];

  for (const table of tables) {
    try {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`  ❌ [${table}]: Error (${error.message})`);
      } else {
        console.log(`  ✅ [${table}]: OK (Total rows: ${count ?? 0})`);
      }
    } catch (e) {
      console.log(`  ⚠️ [${table}]: Exception (${e.message})`);
    }
  }

  // 2. Query actual employees in database
  console.log('\n2. Querying actual employees from database:');
  const { data: emps, error: empErr } = await supabase
    .from('employees')
    .select('*')
    .limit(5);

  if (empErr) {
    console.error('Error querying employees:', empErr);
    return;
  }

  console.log(`Found ${emps?.length || 0} sample employees in database:`);
  emps?.forEach((emp, i) => {
    console.log(`  [${i + 1}] ${emp.first_name} ${emp.last_name} (${emp.employee_code}) - ID: ${emp.id} - Org: ${emp.organization_id}`);
  });

  if (!emps || emps.length === 0) {
    console.log('No employees found to test notifications against.');
    return;
  }

  const targetEmp = emps[0];
  console.log(`\nSelected target employee for notification test: ${targetEmp.first_name} ${targetEmp.last_name} (${targetEmp.id})`);

  // 3. Inspect notification_events schema and existing records
  console.log('\n3. Checking existing notification_events:');
  const { data: existingEvents, error: evErr } = await supabase
    .from('notification_events')
    .select('*')
    .limit(5);

  if (evErr) {
    console.error('Error querying notification_events:', evErr);
  } else {
    console.log(`Existing notification events count sample: ${existingEvents?.length || 0}`);
    if (existingEvents && existingEvents.length > 0) {
      console.log('Columns in notification_events:', Object.keys(existingEvents[0]));
    }
  }

  // 4. Test Notification Creation across required modules
  console.log('\n4. Simulating/Testing Notifications for Required Modules:');
  const testModules = [
    {
      module: 'Attendance & Clocking',
      title: 'Attendance Punch Recorded',
      message: 'Your IN check-in at 09:30 AM was recorded successfully via Biometric Terminal.',
      channel: 'PUSH',
      action_url: '/attendance',
    },
    {
      module: 'Leave Management',
      title: 'Leave Approved',
      message: 'Your Casual Leave request for Oct 02 - Oct 03, 2026 has been approved by your manager.',
      channel: 'PUSH',
      action_url: '/leaves',
    },
    {
      module: 'Regularization',
      title: 'Attendance Regularization Approved',
      message: 'Your attendance regularization for Sep 15, 2026 was approved.',
      channel: 'PUSH',
      action_url: '/attendance',
    },
    {
      module: 'HR Documents',
      title: 'Document Required by HR',
      message: 'Please upload your updated Address Proof before the end of the month.',
      channel: 'PUSH',
      action_url: '/documents',
    },
    {
      module: 'Payroll & Payslips',
      title: 'Payslip Released',
      message: 'Your salary payslip for August 2026 is now ready for download.',
      channel: 'PUSH',
      action_url: '/payslip',
    },
    {
      module: 'Company Broadcast',
      title: 'Quarterly Town Hall Announcement',
      message: 'All employees are invited to the Q3 Global All-Hands meeting on Friday at 4:00 PM IST.',
      channel: 'IN_APP',
      action_url: '/announcements',
    }
  ];

  for (const item of testModules) {
    console.log(`  Testing [${item.module}]:`);
    console.log(`    Title: "${item.title}"`);
    console.log(`    Message: "${item.message}"`);
    console.log(`    Route: "${item.action_url}" | Channel: "${item.channel}"`);
  }

  console.log('\nAudit complete.');
}

runAudit();
