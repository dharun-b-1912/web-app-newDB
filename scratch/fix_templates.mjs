/**
 * Final clean submission - new unique names to avoid the deletion lock.
 * Variables confirmed correct: Unicode escaped {{1}} {{2}} etc.
 * Using UTILITY for all (welcome included) as Meta forces UTILITY for this WABA.
 */
const TOKEN = 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
const WABA  = '1550382319749383';
const PHONE = '1352826481241407';
const G     = 'https://graph.facebook.com/v20.0';

// Properly encoded WhatsApp template variables
const v1 = '\u007b\u007b1\u007d\u007d';
const v2 = '\u007b\u007b2\u007d\u007d';
const v3 = '\u007b\u007b3\u007d\u007d';
const v4 = '\u007b\u007b4\u007d\u007d';

const H = { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' };

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: H, body: JSON.stringify(body) });
  return { ok: r.ok, s: r.status, j: await r.json() };
}

async function sendTemplate(to, name, comps) {
  return post(G + '/' + PHONE + '/messages', {
    messaging_product: 'whatsapp', to,
    type: 'template',
    template: { name, language: { code: 'en_US' }, components: comps }
  });
}

async function submit(payload) {
  const r = await post(G + '/' + WABA + '/message_templates', payload);
  const ok = r.ok && r.j.status !== 'REJECTED';
  console.log('  ' + (ok ? '✅' : '❌') + ' ' + r.s + ' | id=' + (r.j.id || '-') + ' status=' + (r.j.status || r.j.error?.message?.substring(0,80) || ''));
  return r;
}

async function main() {
  console.log('Variables sanity check:', v1, v2, v3, v4);

  console.log('\n=== Submitting templates (new names v2) ===\n');

  // 1. Welcome template
  console.log('1. joy_hr_welcome_v2 (UTILITY)');
  const w = await submit({
    name: 'joy_hr_welcome_v2',
    language: 'en_US',
    category: 'UTILITY',
    components: [
      { type: 'HEADER', format: 'TEXT', text: 'Joy PeopleHR - Onboarding Complete' },
      { type: 'BODY', text: 'Hi ' + v1 + ', welcome to the team!\n\nEmployee Code: ' + v2 + '\nPortal: app.joypeoplehr.com\n\nReply Hi for payslips, leave and attendance on WhatsApp.' },
      { type: 'FOOTER', text: 'Joy Corporate Solutions' }
    ]
  });

  // 2. Payslip template
  console.log('\n2. joy_hr_payslip_v2 (UTILITY)');
  const p = await submit({
    name: 'joy_hr_payslip_v2',
    language: 'en_US',
    category: 'UTILITY',
    components: [
      { type: 'HEADER', format: 'TEXT', text: 'Payslip Ready' },
      { type: 'BODY', text: 'Dear ' + v1 + ', your salary for ' + v2 + ' is ready.\n\nNet Pay: Rs.' + v3 + '\nDate: ' + v4 + '\n\nDownload at app.joypeoplehr.com' },
      { type: 'FOOTER', text: 'Joy Corporate Solutions' }
    ]
  });

  // 3. Leave template
  console.log('\n3. joy_hr_leave_v2 (UTILITY)');
  const l = await submit({
    name: 'joy_hr_leave_v2',
    language: 'en_US',
    category: 'UTILITY',
    components: [
      { type: 'HEADER', format: 'TEXT', text: 'Leave Update' },
      { type: 'BODY', text: 'Hi ' + v1 + ', your ' + v2 + ' leave has been ' + v3 + '.\n\nCheck your portal for details.' },
      { type: 'FOOTER', text: 'Joy Corporate Solutions' }
    ]
  });

  // Show final state
  const lst = await fetch(G + '/' + WABA + '/message_templates?fields=name,status,category&limit=50', { headers: H });
  const data = (await lst.json()).data || [];
  console.log('\n=== All templates now ===');
  data.forEach(t => console.log('[' + t.status + '] ' + t.name + ' (' + t.category + ')'));

  // Try to send the welcome template to Thirumalai immediately
  const welcomeTpl = data.find(t => t.name === 'joy_hr_welcome_v2' && ['APPROVED','PENDING'].includes(t.status));
  if (welcomeTpl) {
    console.log('\n=== Sending ' + welcomeTpl.name + ' [' + welcomeTpl.status + '] to 919384125278 ===');
    const r = await sendTemplate('919384125278', welcomeTpl.name, [
      { type: 'body', parameters: [
        { type: 'text', text: 'Thirumalai R K' },
        { type: 'text', text: 'WF-1001' }
      ]}
    ]);
    console.log(r.ok ? '✅ Sent! ' + r.j.messages?.[0]?.id : '❌ ' + r.j.error?.message);
  }

  console.log('\n=== What this means for any new employee ===');
  console.log('Once templates are APPROVED (after Business Verification):');
  console.log('  HR creates employee → enters phone → wizard completes');
  console.log('  System auto-calls: sendTemplate("joy_hr_welcome_v2", employeePhone)');
  console.log('  Employee receives WhatsApp INSTANTLY — zero 24hr window restriction');
  console.log('  Works even if employee has NEVER messaged +91 90430 22330 before');
}

main().catch(console.error);
