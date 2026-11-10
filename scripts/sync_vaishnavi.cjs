const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const url = 'https://ysiajemrqakfngasehhi.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';
const admin = createClient(url, serviceKey);

async function run() {
  const authUserId = '96708a9d-37b2-4e1b-b3c1-d9b277cb139b';
  const orgId = '0c621892-e938-4707-9957-13534ea32c19';
  const userProfileId = crypto.randomUUID();
  const employeeId = crypto.randomUUID();

  // 1. Check or Insert user_profiles
  let { data: up } = await admin.from('user_profiles').select('*').eq('auth_user_id', authUserId).maybeSingle();
  if (!up) {
    const { data: newUp, error: upErr } = await admin.from('user_profiles').insert([{
      id: userProfileId,
      auth_user_id: authUserId,
      organization_id: orgId,
      email: 'vaishnavir@joyglobalcorp.com',
      full_name: 'Vaishnavi R',
      phone: '+919840209900',
      status: 'ACTIVE',
      role: 'EMPLOYEE'
    }]).select().single();
    if (upErr) {
      console.error('user_profiles insert error:', upErr);
      return;
    }
    up = newUp;
    console.log('user_profiles created:', up.id);
  } else {
    console.log('user_profiles already exists:', up.id);
  }

  // 2. Insert into employees
  const empPayload = {
    id: employeeId,
    organization_id: orgId,
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    branch_id: 'e666748e-8e0f-4d24-ae6a-e1cf85822a0f',
    department_id: '2a5f0b0b-7262-4894-9a5e-51ea09694bbf',
    designation_id: '2c03e78b-be67-416a-849b-bb5b1a0abfb6',
    reporting_manager_id: '55f486f8-e3aa-4133-9e85-dfc519ed2825',
    user_id: up.id,
    employee_code: 'JCS-027',
    first_name: 'Vaishnavi',
    last_name: 'R',
    display_name: 'Vaishnavi R',
    work_email: 'vaishnavir@joyglobalcorp.com',
    personal_email: 'vaishnavir@joyglobalcorp.com',
    phone: '9840209900',
    gender: 'FEMALE',
    doj: '2026-11-10',
    employment_type: 'FULL_TIME',
    employment_status: 'ACTIVE',
    whatsapp_enabled: true,
    sms_enabled: true,
    communication_preference: 'WHATSAPP_SMS',
    phone_type: 'SMARTPHONE_WHATSAPP'
  };

  const { data: savedEmp, error: empErr } = await admin.from('employees').insert([empPayload]).select().single();
  if (empErr) {
    console.error('employees insert error:', empErr);
    return;
  }
  console.log('employees insert SUCCESS:', savedEmp.id, savedEmp.employee_code);

  // 3. Link employee_id back to user_profiles
  await admin.from('user_profiles').update({ employee_id: savedEmp.id }).eq('id', up.id);
  console.log('Linked employee_id to user_profile');

  // 4. Verify Total Employee count in Supabase
  const { count } = await admin.from('employees').select('*', { count: 'exact', head: true });
  console.log('=== TOTAL EMPLOYEES IN SUPABASE NOW ===:', count);
}

run().catch(console.error);
