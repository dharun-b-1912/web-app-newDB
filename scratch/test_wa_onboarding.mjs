/**
 * Submit proper Meta-compliant templates (no emojis in HEADER)
 * and send live welcome messages to all 3 employees
 */

const META_TOKEN = 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
const PHONE_NUMBER_ID = '1352826481241407';
const WABA_ID = '1550382319749383';
const API_VERSION = 'v20.0';
const BASE = `https://graph.facebook.com/${API_VERSION}`;

async function submitTemplate(templatePayload) {
  const res = await fetch(`${BASE}/${WABA_ID}/message_templates`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${META_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(templatePayload)
  });
  const json = await res.json();
  return { ok: res.ok, status: res.status, data: json };
}

async function sendText(phone, text) {
  const res = await fetch(`${BASE}/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${META_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: { preview_url: false, body: text }
    })
  });
  const json = await res.json();
  return { ok: res.ok, status: res.status, data: json };
}

async function main() {
  console.log('=== Submitting Meta-Compliant Templates ===\n');

  // Template 1: Employee Welcome (no emojis in header per Meta rules)
  console.log('→ Submitting joy_employee_welcome_v1...');
  const welcomeResult = await submitTemplate({
    name: 'joy_employee_welcome_v1',
    language: 'en_US',
    category: 'UTILITY',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Welcome to {{1}}'  // No emoji, no asterisk in header
      },
      {
        type: 'BODY',
        text:
          'Hi {{2}},\n\n' +
          'Congratulations! Your onboarding at {{1}} is complete.\n\n' +
          'Employee Code: {{3}}\n' +
          'Role: {{4}}\n\n' +
          'Access your employee portal: app.joypeoplehr.com\n\n' +
          'Reply Hi or Menu anytime to use your WhatsApp HR Assistant:\n' +
          '- View Payslips\n' +
          '- Check Leave Balances\n' +
          '- Attendance Status'
      },
      {
        type: 'FOOTER',
        text: 'Joy Corporate Solutions HRMS'
      }
    ]
  });
  console.log(`  Status: ${welcomeResult.status} ${welcomeResult.ok ? '✅ Submitted for review' : '❌'}`);
  if (!welcomeResult.ok) console.log('  Error:', welcomeResult.data.error?.error_user_msg || welcomeResult.data.error?.message);
  else console.log('  Template ID:', welcomeResult.data.id, '| Review status:', welcomeResult.data.status);

  // Template 2: Monthly Payslip
  console.log('\n→ Submitting joy_monthly_payslip_v1...');
  const payslipResult = await submitTemplate({
    name: 'joy_monthly_payslip_v1',
    language: 'en_US',
    category: 'UTILITY',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Payslip Ready - {{1}}'
      },
      {
        type: 'BODY',
        text:
          'Dear {{2}},\n\n' +
          'Your salary for {{1}} has been processed.\n\n' +
          'Net Pay: Rs. {{3}}\n' +
          'Bank Account: {{4}}\n' +
          'Pay Date: {{5}}\n\n' +
          'Download your payslip from the Joy PeopleHR portal.'
      },
      {
        type: 'FOOTER',
        text: 'Joy Corporate Solutions HRMS'
      }
    ]
  });
  console.log(`  Status: ${payslipResult.status} ${payslipResult.ok ? '✅ Submitted for review' : '❌'}`);
  if (!payslipResult.ok) console.log('  Error:', payslipResult.data.error?.error_user_msg || payslipResult.data.error?.message);
  else console.log('  Template ID:', payslipResult.data.id, '| Review status:', payslipResult.data.status);

  // Template 3: Leave Status
  console.log('\n→ Submitting joy_leave_status_v1...');
  const leaveResult = await submitTemplate({
    name: 'joy_leave_status_v1',
    language: 'en_US',
    category: 'UTILITY',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Leave Request Update'
      },
      {
        type: 'BODY',
        text:
          'Dear {{1}},\n\n' +
          'Your {{2}} leave request for {{3}} to {{4}} has been {{5}}.\n\n' +
          'Reviewed by: {{6}}\n' +
          'Comments: {{7}}\n\n' +
          'Login to your portal for more details.'
      },
      {
        type: 'FOOTER',
        text: 'Joy Corporate Solutions HRMS'
      }
    ]
  });
  console.log(`  Status: ${leaveResult.status} ${leaveResult.ok ? '✅ Submitted for review' : '❌'}`);
  if (!leaveResult.ok) console.log('  Error:', leaveResult.data.error?.error_user_msg || leaveResult.data.error?.message);
  else console.log('  Template ID:', leaveResult.data.id, '| Review status:', leaveResult.data.status);

  // ─────────────────────────────────────────────────────────────────────────
  // SEND LIVE WELCOME MESSAGES (free-text, within 24hr window)
  // We already confirmed Thirumalai & 9840209900 are in 24hr window
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n=== Sending Live Welcome Messages (Free-Text via 24hr window) ===\n');

  const employees = [
    { phone: '919384125278', name: 'Thirumalai R K',  code: 'WF-1001', role: 'Software Engineer' },
    { phone: '919791755422', name: 'Danya R',         code: 'JCS-154', role: 'HR Operations Specialist' },
    { phone: '919840209900', name: 'HR Test',         code: 'TEST-01', role: 'HR Head' },
  ];

  for (const emp of employees) {
    const welcomeMsg =
      `🎉 *Welcome to Joy Corporate Solutions Pvt Ltd!*\n\n` +
      `Dear *${emp.name}*,\n\n` +
      `Your onboarding is now complete! Here's a quick overview of your Joy PeopleHR WhatsApp Assistant:\n\n` +
      `🪪 *Employee Code:* ${emp.code}\n` +
      `💼 *Role:* ${emp.role}\n\n` +
      `*What you can do right here on WhatsApp:*\n` +
      `📄 Reply *PAYSLIP* — Get latest payslip\n` +
      `🌴 Reply *LEAVE* — Check leave balance\n` +
      `⏰ Reply *ATTENDANCE* — View attendance log\n` +
      `📢 Reply *ANNOUNCEMENTS* — Company news\n\n` +
      `🌐 *Web Portal:* app.joypeoplehr.com\n\n` +
      `_Reply "Hi" or "Menu" anytime to interact!_\n\n` +
      `— Joy PeopleHR Team`;

    console.log(`→ Sending to ${emp.name} (${emp.phone})...`);
    const res = await sendText(emp.phone, welcomeMsg);
    if (res.ok) {
      console.log(`  ✅ Delivered! Message ID: ${res.data.messages?.[0]?.id}`);
    } else {
      const code = res.data.error?.code;
      const msg = res.data.error?.message;
      if (code === 131047 || code === 131026) {
        console.log(`  ⚠️  24-hr window closed — ${emp.name} needs to message us first`);
        console.log(`     Error: ${msg}`);
      } else {
        console.log(`  ❌ Error ${code}: ${msg}`);
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log('• Templates submitted to Meta for UTILITY category approval (~24hrs)');
  console.log('• Once approved: works WITHOUT 24-hr window (send anytime after onboarding)');
  console.log('• Free-text messages sent to numbers currently in window ✅');
}

main().catch(console.error);
