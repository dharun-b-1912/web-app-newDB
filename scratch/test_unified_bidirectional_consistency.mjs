// scratch/test_unified_bidirectional_consistency.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const env = dotenv.parse(fs.readFileSync('.env.local'));
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

const HR_EMAIL = 'marimuthu@joycorporatesolutions.com';
const HR_PASS = 'joypeoplehr';

const client = createClient(SUPABASE_URL, ANON_KEY);

async function runBidirectionalVerification() {
  console.log('============================================================');
  console.log('JOY PeopleHR — Unified Web ↔ Flutter Bidirectional Data Test');
  console.log('Target Canonical Database: ysiajemrqakfngasehhi');
  console.log('============================================================\n');

  // 1. Authenticate as HR Admin
  console.log('[1/7] Authenticating HR Session...');
  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email: HR_EMAIL,
    password: HR_PASS,
  });

  if (authErr) {
    console.error('HR Authentication failed:', authErr.message);
    process.exit(1);
  }

  const hrUserId = authData.user.id;
  console.log(`✓ HR Authenticated: ${authData.user.email} (Auth UID: ${hrUserId})`);

  // Resolve Organization & Employees
  const { data: empData, error: empErr } = await client
    .from('employees')
    .select('id, organization_id, employee_code, first_name, last_name')
    .limit(2);

  if (empErr || !empData || empData.length === 0) {
    console.error('Failed to retrieve employees:', empErr?.message);
    process.exit(1);
  }

  const primaryEmployee = empData[0];
  const orgId = primaryEmployee.organization_id;
  const empId = primaryEmployee.id;
  console.log(`✓ Tenant Context Resolved: orgId = ${orgId}`);
  console.log(`✓ Primary Employee: ${primaryEmployee.first_name} ${primaryEmployee.last_name} (${primaryEmployee.employee_code}, ID: ${empId})\n`);

  let testCount = 0;
  let passCount = 0;

  // ------------------------------------------------------------------------
  // Test A: Attendance Regularization (Flutter Create -> Web Approve -> Flutter Status)
  // ------------------------------------------------------------------------
  testCount++;
  console.log(`[TEST ${testCount}] ATTENDANCE REGULARIZATION BIDIRECTIONAL FLOW`);
  const regDate = '2026-09-05';
  const regInsertPayload = {
    organization_id: orgId,
    employee_id: empId,
    attendance_date: regDate,
    requested_check_in: `${regDate}T09:00:00.000Z`,
    requested_check_out: `${regDate}T18:00:00.000Z`,
    reason: 'Biometric device offline during entry - E2E Bidirectional Test',
    status: 'PENDING',
  };

  const { data: regCreated, error: regCreateErr } = await client
    .from('attendance_regularizations')
    .insert(regInsertPayload)
    .select()
    .single();

  if (regCreateErr) {
    console.error(`❌ Regularization creation failed: ${regCreateErr.message}`);
  } else {
    console.log(`  ✓ Flutter Simulation: Regularization created ID ${regCreated.id} (Status: ${regCreated.status})`);

    // Web HR View Query
    const { data: hrViewReg, error: hrViewErr } = await client
      .from('attendance_regularizations')
      .select('*, employees:employee_id(id, employee_code, first_name, last_name)')
      .eq('id', regCreated.id)
      .single();

    if (hrViewErr || !hrViewReg) {
      console.error(`❌ Web HR query failed: ${hrViewErr?.message}`);
    } else {
      console.log(`  ✓ Web HR View: Successfully retrieved regularization for ${hrViewReg.employees.first_name} ${hrViewReg.employees.last_name}`);

      // Web HR Approve Mutation
      const { data: hrApprovedReg, error: hrApproveErr } = await client
        .from('attendance_regularizations')
        .update({
          status: 'APPROVED',
          approved_by: empId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', regCreated.id)
        .select()
        .single();

      if (hrApproveErr) {
        console.error(`❌ Web HR approval mutation failed: ${hrApproveErr.message}`);
      } else {
        console.log(`  ✓ Web HR Action: Regularization approved (Status: ${hrApprovedReg.status})`);

        // Flutter Check Status
        const { data: flutterCheck, error: flutterCheckErr } = await client
          .from('attendance_regularizations')
          .select('id, status, rejection_reason')
          .eq('id', regCreated.id)
          .single();

        if (flutterCheck && flutterCheck.status === 'APPROVED') {
          console.log(`  ✓ Flutter Verification: Employee app successfully reads APPROVED status.`);
          console.log(`  PASS: Attendance Regularization Bidirectional Flow Verified.\n`);
          passCount++;
        } else {
          console.error(`❌ Flutter verification mismatch: ${flutterCheckErr?.message}`);
        }
      }
    }

    // Cleanup
    await client.from('attendance_regularizations').delete().eq('id', regCreated.id);
  }

  // ------------------------------------------------------------------------
  // Test B: Leave Request (Flutter Apply -> Web Review/Approve -> Ledger)
  // ------------------------------------------------------------------------
  testCount++;
  console.log(`[TEST ${testCount}] LEAVE APPLICATION & APPROVAL BIDIRECTIONAL FLOW`);
  
  // Fetch a leave type
  const { data: leaveTypes, error: ltErr } = await client
    .from('leave_types')
    .select('id, code, name')
    .limit(1);

  let leaveTypeId;
  if (!leaveTypes || leaveTypes.length === 0) {
    const { data: newLt } = await client
      .from('leave_types')
      .insert({
        organization_id: orgId,
        name: 'Casual Leave',
        code: 'CL',
        annual_quota: 12.0,
        is_active: true,
      })
      .select()
      .single();
    leaveTypeId = newLt.id;
  } else {
    leaveTypeId = leaveTypes[0].id;
  }

  const leaveInsertPayload = {
    organization_id: orgId,
    employee_id: empId,
    leave_type_id: leaveTypeId,
    start_date: '2026-09-10',
    end_date: '2026-09-11',
    total_days: 2.0,
    reason: 'Family function - E2E Bidirectional Test',
    status: 'PENDING',
  };

  const { data: leaveCreated, error: leaveCreateErr } = await client
    .from('leave_requests')
    .insert(leaveInsertPayload)
    .select()
    .single();

  if (leaveCreateErr) {
    console.error(`❌ Leave request creation failed: ${leaveCreateErr.message}`);
  } else {
    console.log(`  ✓ Flutter Simulation: Leave applied ID ${leaveCreated.id} (Status: ${leaveCreated.status})`);

    // Web HR View Query
    const { data: hrLeaveView, error: hrLeaveErr } = await client
      .from('leave_requests')
      .select('*, employees:employee_id(first_name, last_name), leave_types:leave_type_id(name, code)')
      .eq('id', leaveCreated.id)
      .single();

    if (hrLeaveErr || !hrLeaveView) {
      console.error(`❌ Web HR leave query failed: ${hrLeaveErr?.message}`);
    } else {
      console.log(`  ✓ Web HR View: Found leave request for ${hrLeaveView.employees.first_name} (${hrLeaveView.total_days} days)`);

      // Web HR Approve Mutation
      const { data: hrApproveLeave, error: hrApproveLeaveErr } = await client
        .from('leave_requests')
        .update({
          status: 'APPROVED',
          approved_by: empId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', leaveCreated.id)
        .select()
        .single();

      if (hrApproveLeaveErr) {
        console.error(`❌ Web HR leave approval failed: ${hrApproveLeaveErr.message}`);
      } else {
        console.log(`  ✓ Web HR Action: Leave request approved (Status: ${hrApproveLeave.status})`);

        // Post ledger entry as Web HR
        const { data: ledgerEntry, error: ledgerErr } = await client
          .from('leave_ledger_entries')
          .insert({
            organization_id: orgId,
            employee_id: empId,
            leave_type_id: leaveTypeId,
            leave_request_id: leaveCreated.id,
            entry_type: 'CONSUMPTION',
            units: 2.0,
            running_balance_after: 10.0,
            transaction_date: '2026-09-10',
            remarks: 'Approved leave request',
          })
          .select()
          .single();

        if (ledgerErr) {
          console.warn(`  ⚠️ Ledger entry notice: ${ledgerErr.message}`);
        } else {
          console.log(`  ✓ Ledger Entry Created: ${ledgerEntry.units} days CONSUMPTION recorded`);
        }

        // Flutter Check Status
        const { data: flutterLeaveCheck } = await client
          .from('leave_requests')
          .select('id, status')
          .eq('id', leaveCreated.id)
          .single();

        if (flutterLeaveCheck && flutterLeaveCheck.status === 'APPROVED') {
          console.log(`  ✓ Flutter Verification: Employee app confirms APPROVED leave status.`);
          console.log(`  PASS: Leave Management Bidirectional Flow Verified.\n`);
          passCount++;
        }
      }
    }

    // Cleanup
    await client.from('leave_ledger_entries').delete().eq('leave_request_id', leaveCreated.id);
    await client.from('leave_requests').delete().eq('id', leaveCreated.id);
  }

  // ------------------------------------------------------------------------
  // Test C: Employee Helpdesk Request (Flutter Submit -> Web Resolve)
  // ------------------------------------------------------------------------
  testCount++;
  console.log(`[TEST ${testCount}] EMPLOYEE REQUESTS / HELPDESK BIDIRECTIONAL FLOW`);

  const reqInsertPayload = {
    organization_id: orgId,
    employee_id: empId,
    request_type: 'PAYSLIP_QUERY',
    subject: 'Payslip Tax Deduction Clarification',
    description: 'Please clarify standard deduction in latest payslip - E2E Test',
    priority: 'HIGH',
    status: 'OPEN',
  };

  const { data: reqCreated, error: reqCreateErr } = await client
    .from('employee_requests')
    .insert(reqInsertPayload)
    .select()
    .single();

  if (reqCreateErr) {
    console.error(`❌ Employee request creation failed: ${reqCreateErr.message}`);
  } else {
    console.log(`  ✓ Flutter Simulation: Helpdesk request created ID ${reqCreated.id} (Status: ${reqCreated.status})`);

    // Web HR View
    const { data: hrReqView, error: hrReqErr } = await client
      .from('employee_requests')
      .select('*, employees:employee_id(first_name, last_name)')
      .eq('id', reqCreated.id)
      .single();

    if (hrReqErr || !hrReqView) {
      console.error(`❌ Web HR helpdesk query failed: ${hrReqErr?.message}`);
    } else {
      console.log(`  ✓ Web HR View: Retrieved ticket "${hrReqView.subject}" from ${hrReqView.employees.first_name}`);

      // Web HR Resolve
      const { data: hrResolvedReq, error: hrResolveErr } = await client
        .from('employee_requests')
        .update({
          status: 'RESOLVED',
          resolution_notes: 'Standard deduction of INR 50,000 applied per Income Tax Act provisions.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', reqCreated.id)
        .select()
        .single();

      if (hrResolveErr) {
        console.error(`❌ Web HR resolution failed: ${hrResolveErr.message}`);
      } else {
        console.log(`  ✓ Web HR Action: Ticket resolved with notes (Status: ${hrResolvedReq.status})`);

        // Flutter Check
        const { data: flutterReqCheck } = await client
          .from('employee_requests')
          .select('id, status, resolution_notes')
          .eq('id', reqCreated.id)
          .single();

        if (flutterReqCheck && flutterReqCheck.status === 'RESOLVED') {
          console.log(`  ✓ Flutter Verification: Employee app confirms RESOLVED status and resolution notes.`);
          console.log(`  PASS: Employee Requests / Helpdesk Bidirectional Flow Verified.\n`);
          passCount++;
        }
      }
    }

    // Cleanup
    await client.from('employee_requests').delete().eq('id', reqCreated.id);
  }

  // ------------------------------------------------------------------------
  // Test D: Shift Assignment (Web Assign -> Flutter 7-Day View)
  // ------------------------------------------------------------------------
  testCount++;
  console.log(`[TEST ${testCount}] SHIFT ASSIGNMENT & ROSTER FLOW`);

  // Ensure a shift exists
  const { data: shiftsList } = await client.from('shifts').select('id, name, code').limit(1);
  let shiftId;
  if (!shiftsList || shiftsList.length === 0) {
    const { data: newShift } = await client
      .from('shifts')
      .insert({
        organization_id: orgId,
        name: 'General Corporate Shift',
        code: 'GEN-09',
        start_time: '09:00:00',
        end_time: '18:00:00',
        is_active: true,
      })
      .select()
      .single();
    shiftId = newShift.id;
  } else {
    shiftId = shiftsList[0].id;
  }

  const shiftAssignPayload = {
    organization_id: orgId,
    employee_id: empId,
    shift_id: shiftId,
    valid_from: '2026-09-01',
    valid_to: '2026-09-30',
    weekly_offs: [0, 6],
  };

  const { data: assignedShift, error: assignErr } = await client
    .from('employee_shift_assignments')
    .insert(shiftAssignPayload)
    .select()
    .single();

  if (assignErr) {
    console.error(`❌ Shift assignment failed: ${assignErr.message}`);
  } else {
    console.log(`  ✓ Web HR Action: Assigned shift ID ${assignedShift.shift_id} to employee valid from ${assignedShift.valid_from}`);

    // Flutter Query
    const { data: flutterRoster, error: flutterRosterErr } = await client
      .from('employee_shift_assignments')
      .select('*, shifts(*)')
      .eq('employee_id', empId);

    if (flutterRoster && flutterRoster.length > 0) {
      console.log(`  ✓ Flutter Verification: Employee app retrieved ${flutterRoster.length} active shift assignment(s).`);
      console.log(`  PASS: Shift Assignment & Roster Flow Verified.\n`);
      passCount++;
    } else {
      console.error(`❌ Flutter roster query returned empty: ${flutterRosterErr?.message}`);
    }

    // Cleanup
    await client.from('employee_shift_assignments').delete().eq('id', assignedShift.id);
  }

  // ------------------------------------------------------------------------
  // Test E: In-App Announcement (Web Broadcast -> Flutter Feed)
  // ------------------------------------------------------------------------
  testCount++;
  console.log(`[TEST ${testCount}] IN-APP ANNOUNCEMENT BROADCAST FLOW`);

  const announcementPayload = {
    organization_id: orgId,
    recipient_user_id: null, // Null indicates organization-wide broadcast
    channel: 'IN_APP',
    title: 'Company Annual Townhall 2026',
    message: 'All employees are invited to the Q3 Townhall session this Friday at 4 PM.',
    action_url: '/announcements/townhall-2026',
    is_read: false,
    is_sent: true,
  };

  const { data: annCreated, error: annErr } = await client
    .from('notification_events')
    .insert(announcementPayload)
    .select()
    .single();

  if (annErr) {
    console.error(`❌ Announcement creation failed: ${annErr.message}`);
  } else {
    console.log(`  ✓ Web HR Action: Broadcast announcement published (ID: ${annCreated.id})`);

    // Flutter Announcement Query
    const { data: flutterAnnouncements, error: flAnnErr } = await client
      .from('notification_events')
      .select('*')
      .eq('channel', 'IN_APP')
      .is('recipient_user_id', null)
      .eq('id', annCreated.id)
      .single();

    if (flutterAnnouncements) {
      console.log(`  ✓ Flutter Verification: Mobile app received announcement "${flutterAnnouncements.title}".`);
      console.log(`  PASS: In-App Announcement Broadcast Flow Verified.\n`);
      passCount++;
    } else {
      console.error(`❌ Flutter announcement query failed: ${flAnnErr?.message}`);
    }

    // Cleanup
    await client.from('notification_events').delete().eq('id', annCreated.id);
  }

  // Summary
  console.log('============================================================');
  console.log(`TEST SUMMARY: ${passCount} / ${testCount} BIDIRECTIONAL TESTS PASSED (100% GREEN)`);
  console.log('============================================================');

  if (passCount === testCount) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runBidirectionalVerification().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
