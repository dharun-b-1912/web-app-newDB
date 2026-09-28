import fetch from 'node-fetch';

async function testMailCom() {
  const apiKey = 're_mock_dummy_resend_api_key_sanitized';
  const targetEmail = 'thirumalairk28@mail.com';

  console.log(`Sending to ${targetEmail}...`);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Joy PeopleHR <noreply@joypeoplehr.com>',
      to: [targetEmail],
      subject: 'Joy PeopleHR — Verification Test to mail.com',
      html: '<p>Testing verified domain dispatch to thirumalairk28@mail.com</p>',
    }),
  });

  const data = await res.json();
  console.log('Result for mail.com:', res.status, data);
}

testMailCom();
