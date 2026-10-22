// scripts/test_employee_sms_dispatch.ts
import dotenv from 'dotenv';
dotenv.config();

import { whatsAppIdentityService } from '../src/services/whatsapp/whatsappIdentityService';
import { OFFICIAL_TEMPLATES, renderTemplate, validateDltVariables } from '../src/services/communications/templateRegistry';
import { AirtelSmsClient } from '../src/services/communications/airtelSmsClient';

async function run() {
  const targetPhone = '9384125278';
  console.log(`\n======================================================`);
  console.log(`🔎 SEARCHING EMPLOYEE BY PHONE: ${targetPhone}`);
  console.log(`======================================================\n`);

  const accounts = await whatsAppIdentityService.lookupEmployeeByPhone(targetPhone, 'TEST-SMS-SUITE');

  console.log(`Matched Records: ${accounts.length}`);
  if (accounts.length === 0) {
    console.log(`⚠️ No active employee found with phone: ${targetPhone} in primary query.`);
    console.log(`Attempting broad search across employees table without status filter...`);
    const { supabase } = await import('../src/lib/supabase');
    const { data: rawRows, error } = await supabase
      .from('employees')
      .select('id, employee_code, first_name, last_name, phone, employment_status, department_name, designation_title, organization_id')
      .or(`phone.ilike.%${targetPhone}%`);
    console.log('Broad search result:', rawRows, 'Error:', error?.message);
    return;
  }

  const emp = accounts[0];
  console.log(`✅ EMPLOYEE FOUND:`);
  console.log(`   ID:           ${emp.employeeId}`);
  console.log(`   Code:         ${emp.employeeCode}`);
  console.log(`   Name:         ${emp.fullName}`);
  console.log(`   Company:      ${emp.companyName}`);
  console.log(`   Department:   ${emp.department}`);
  console.log(`   Designation:  ${emp.designation}`);
  console.log(`   Role Context: ${emp.roleContext}`);
  console.log(`   Status:       ${emp.employmentStatus}`);
  console.log(`   Mobile:       ${emp.phone}\n`);

  console.log(`======================================================`);
  console.log(`📲 PREPARING ALL 11 AIRTEL DLT SMS TEMPLATES FOR ${emp.fullName.toUpperCase()}`);
  console.log(`======================================================\n`);

  const smsClient = AirtelSmsClient.getInstance();

  const templatesToTest = [
    {
      id: '1',
      name: 'JOYHR_LOGIN_OTP',
      key: 'SMS_OTP',
      dltId: '1077449880060256831',
      type: 'TRANSACTIONAL',
      vars: ['652419', '10'], // OTP, minutes
      desc: 'Employee Authentication OTP'
    },
    {
      id: '2',
      name: 'JOYHR_ATTENDANCE_CHECKIN',
      key: 'SMS_CHECK_IN',
      dltId: '1077076930061928891',
      type: 'SERVICE_IMPLICIT',
      vars: [emp.fullName, '09:15 AM', '12-Oct-2026'], // Name, Time, Date
      desc: 'Morning Shift Check-in Confirmation'
    },
    {
      id: '3',
      name: 'JOYHR_ATTENDANCE_CHECKOUT',
      key: 'SMS_CHECK_OUT',
      dltId: '1077188040062422070',
      type: 'SERVICE_IMPLICIT',
      vars: [emp.fullName, '06:30 PM', '8 hrs 45 mins'], // Name, Time, Working duration
      desc: 'Evening Shift Check-out Confirmation'
    },
    {
      id: '4',
      name: 'JOYHR_DAILY_ATTENDANCE_STATUS',
      key: 'SMS_DAILY_ATTENDANCE',
      dltId: '1077017600060238275',
      type: 'SERVICE_IMPLICIT',
      vars: [emp.fullName, '12-Oct-2026', 'Present'], // Name, Date, Status
      desc: 'End of Day Attendance Summary'
    },
    {
      id: '5',
      name: 'JOYHR_ABSENT_PUNCH_ALERT',
      key: 'SMS_ABSENT_ALERT',
      dltId: '1077182330060192197',
      type: 'SERVICE_IMPLICIT',
      vars: [emp.fullName, '12-Oct-2026'], // Name, Date
      desc: 'Missing Punch / Absent Alert'
    },
    {
      id: '6',
      name: 'JOYHR_LEAVE_STATUS_UPDATE',
      key: 'SMS_LEAVE_STATUS',
      dltId: '1077171710060293148',
      type: 'SERVICE_IMPLICIT',
      vars: [emp.fullName, '15-Oct to 16-Oct Casual Leave', 'Approved'], // Name, Leave info, Status
      desc: 'Leave Request Approved/Rejected Notice'
    },
    {
      id: '7',
      name: 'JOYHR_SALARY_PROCESSING_ALERT',
      key: 'SMS_SALARY_PROCESSING',
      dltId: '1077377200060159599',
      type: 'SERVICE_IMPLICIT',
      vars: [emp.fullName, 'October 2026'], // Name, Month
      desc: 'Monthly Payroll Processing Intimation'
    },
    {
      id: '8',
      name: 'JOYHR_SALARY_CREDITED_SUCCESS',
      key: 'SMS_SALARY_CREDITED',
      dltId: '1077195070060448349',
      type: 'SERVICE_IMPLICIT',
      vars: [emp.fullName, 'October 2026'], // Name, Month
      desc: 'Salary Disbursed / Payslip Ready'
    },
    {
      id: '9',
      name: 'Welcome JCS',
      key: 'SMS_WELCOME',
      dltId: '1007711994736460605',
      type: 'SERVICE_IMPLICIT',
      vars: [emp.fullName, 'Mr. Ramesh (Operations Head)'], // Name, Manager
      desc: 'New Employee Welcome & Reporting Manager Assignment'
    },
    {
      id: '10',
      name: 'Salary Credit (JCS)',
      key: 'SALARY_CREDIT_JCS',
      dltId: '1007998574229366726',
      type: 'SERVICE_IMPLICIT',
      vars: [emp.fullName, '42,500'], // Name, Amount
      desc: 'Corporate Salary Credit with Amount'
    },
    {
      id: '11',
      name: 'OTP for JCS',
      key: 'OTP_FOR_JCS',
      dltId: '1007961285745726410',
      type: 'SERVICE_IMPLICIT',
      vars: ['894102', '10'], // OTP, Minutes
      desc: 'Corporate Solution System OTP'
    }
  ];

  for (const t of templatesToTest) {
    const tmpl = OFFICIAL_TEMPLATES[t.key];
    if (!tmpl) {
      console.error(`❌ Template not found: ${t.key}`);
      continue;
    }

    const valResult = validateDltVariables(tmpl.dltTemplateId!, t.vars);
    if (!valResult.valid) {
      console.error(`❌ Validation failed for ${t.name}: ${valResult.error}`);
      continue;
    }

    const messageText = renderTemplate(tmpl.bodyPattern, t.vars);

    console.log(`------------------------------------------------------`);
    console.log(`[#${t.id}] ${t.name} (${t.desc})`);
    console.log(`Header:          ${tmpl.senderId}`);
    console.log(`DLT Template ID: ${tmpl.dltTemplateId}`);
    console.log(`Category:        ${tmpl.category}`);
    console.log(`Rendered Body:\n"${messageText}"`);

    // Test send via client
    const res = await smsClient.sendSms({
      destinationAddress: targetPhone,
      message: messageText,
      dltTemplateId: tmpl.dltTemplateId,
      senderId: tmpl.senderId,
      entityId: tmpl.dltPeId,
      messageType: t.type as any
    });

    console.log(`Gateway Response: Success=${res.success}, Status=${res.status}, MessageId=${res.messageId || 'N/A'}, Reason=${res.reason || 'Delivered / Queued'}`);
  }

  console.log(`\n======================================================`);
  console.log(`🎯 COMPLETED TEST OF ALL 11 TEMPLATES FOR ${emp.fullName}`);
  console.log(`======================================================\n`);
}

run().catch(err => {
  console.error('Fatal error:', err);
});
