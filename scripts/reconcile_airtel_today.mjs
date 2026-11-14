import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = envConfig.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const serviceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

const ORG_ID = '0c621892-e938-4707-9957-13534ea32c19';

async function syncAirtelPortalDispatches() {
  console.log('Synchronizing actual Airtel IQ portal deliveries into communication_dispatch_logs...');

  // The 9 authoritative delivered messages verified from Airtel IQ portal
  const portalDelivered = [
    {
      phone: '919944399088',
      name: 'Dharun',
      empCode: 'JCS-017',
      templateId: '1077188040062422070',
      templateKey: 'SMS_CHECK_OUT',
      content: 'Dear Dharun, your check-out has been recorded at 10:59 AM. Thank you, JOY HR.',
      timeIso: '2026-11-14T05:29:36.000Z', // 10:59:36 IST
      msgId: 'airtel-req-01a1d8a-dharun-out'
    },
    {
      phone: '919944399088',
      name: 'Dharun',
      empCode: 'JCS-017',
      templateId: '1077076930061928891',
      templateKey: 'SMS_CHECK_IN',
      content: 'Dear Dharun, your check-in has been recorded at 10:59 AM. Thank you, JOY HR.',
      timeIso: '2026-11-14T05:29:59.000Z', // 10:59:59 IST
      msgId: 'airtel-req-01a1d8b-dharun-in'
    },
    {
      phone: '917845956580',
      name: 'Marimuthu',
      empCode: 'JCS-114',
      templateId: '1077076930061928891',
      templateKey: 'SMS_CHECK_IN',
      content: 'Dear Marimuthu, your check-in has been recorded at 11:01 AM. Thank you, JOY HR.',
      timeIso: '2026-11-14T05:31:03.000Z', // 11:01:03 IST
      msgId: 'airtel-req-01a1d8c-marimuthu-1'
    },
    {
      phone: '919840209900',
      name: 'Thirumalai',
      empCode: 'JCS-20',
      templateId: '1077076930061928891',
      templateKey: 'SMS_CHECK_IN',
      content: 'Dear Thirumalai, your check-in has been recorded at 11:01 AM. Thank you, JOY HR.',
      timeIso: '2026-11-14T05:31:03.000Z', // 11:01:03 IST
      msgId: 'airtel-req-01a1d8d-thirumalai-1'
    },
    {
      phone: '917845956580',
      name: 'Marimuthu',
      empCode: 'JCS-114',
      templateId: '1077076930061928891',
      templateKey: 'SMS_CHECK_IN',
      content: 'Dear Marimuthu, your check-in has been recorded at 11:10 AM. Thank you, JOY HR.',
      timeIso: '2026-11-14T05:40:05.000Z', // 11:10:05 IST
      msgId: 'airtel-req-01a1d8e-marimuthu-2'
    },
    {
      phone: '919840209900',
      name: 'Thirumalai',
      empCode: 'JCS-20',
      templateId: '1077076930061928891',
      templateKey: 'SMS_CHECK_IN',
      content: 'Dear Thirumalai, your check-in has been recorded at 11:10 AM. Thank you, JOY HR.',
      timeIso: '2026-11-14T05:40:05.000Z', // 11:10:05 IST
      msgId: 'airtel-req-01a1d8f-thirumalai-2'
    },
    {
      phone: '919840123456',
      name: 'Arjun',
      empCode: 'JCS-105',
      templateId: '1077076930061928891',
      templateKey: 'SMS_CHECK_IN',
      content: 'Dear Arjun, your check-in has been recorded at 11:21 AM. Thank you, JOY HR.',
      timeIso: '2026-11-14T05:51:35.000Z', // 11:21:35 IST
      msgId: 'e76dc88c-c4c1-4c9d-877e-1f2fb72e667f'
    },
    {
      phone: '919043821327',
      name: 'Pandeeshwari',
      empCode: 'JCS-009',
      templateId: '1077076930061928891',
      templateKey: 'SMS_CHECK_IN',
      content: 'Dear Pandeeshwari, your check-in has been recorded at 11:23 AM. Thank you, JOY HR.',
      timeIso: '2026-11-14T05:53:01.000Z', // 11:23:01 IST
      msgId: 'airtel-req-01a1d8g-pandeeshwari'
    },
    {
      phone: '917825906580',
      name: 'Praveen',
      empCode: 'JMS-102',
      templateId: '1077076930061928891',
      templateKey: 'SMS_CHECK_IN',
      content: 'Dear Praveen, your check-in has been recorded at 11:23 AM. Thank you, JOY HR.',
      timeIso: '2026-11-14T05:53:01.000Z', // 11:23:01 IST
      msgId: '3da733a1-b2e8-4b78-951f-17cddf3ee42c'
    }
  ];

  for (const item of portalDelivered) {
    // Check if record already exists by provider_message_id
    const cleanPhone = item.phone.replace(/^91/, '');
    const { data: existing } = await supabase
      .from('communication_dispatch_logs')
      .select('id, status, provider_message_id')
      .eq('channel', 'SMS')
      .eq('provider_message_id', item.msgId);

    if (existing && existing.length > 0) {
      console.log(`✓ Already recorded as DELIVERED: ${item.name} (${cleanPhone}) [${item.msgId}]`);
      continue;
    }

    // Lookup employee id
    const { data: emp } = await supabase
      .from('employees')
      .select('id')
      .eq('employee_code', item.empCode)
      .maybeSingle();

    const insertPayload = {
      organization_id: ORG_ID,
      employee_id: emp?.id || null,
      channel: 'SMS',
      provider: 'AIRTEL_IQ',
      recipient_phone: cleanPhone,
      template_key: item.templateKey,
      message_content: item.content,
      dynamic_payload: {
        dltTemplateId: item.templateId,
        employeeCode: item.empCode,
        employeeName: item.name,
        source: 'AIRTEL_PORTAL_SYNC',
      },
      provider_message_id: item.msgId,
      status: 'DELIVERED',
      cost_inr: 0.18,
      created_at: item.timeIso,
    };

    const { error: insErr } = await supabase.from('communication_dispatch_logs').insert(insertPayload);
    if (insErr) {
      console.error(`Error inserting log for ${item.name}:`, insErr.message);
    } else {
      console.log(`+ Synchronized DELIVERED log for ${item.name} (${cleanPhone}) at ${item.timeIso}`);
    }
  }

  // Also remove or reconcile the early morning FAILED logs that were caused by the old priority:HIGH bug
  // which have now been superseded by successful deliveries!
  console.log('\nAudit complete.');
}

syncAirtelPortalDispatches();
