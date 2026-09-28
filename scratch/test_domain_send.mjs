import fetch from 'node-fetch';

async function testVerifiedDomainSend() {
  const apiKey = 're_mock_dummy_resend_api_key_sanitized';
  const targetEmail = 'thirumalairk28@gmail.com';

  console.log(`Sending from verified domain (noreply@joypeoplehr.com) to ${targetEmail}...`);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Joy PeopleHR <noreply@joypeoplehr.com>',
      to: [targetEmail],
      subject: 'Joy PeopleHR — Domain Verification Test',
      html: '<p>Testing verified domain dispatch to thirumalairk28@gmail.com</p>',
    }),
  });

  const data = await res.json();
  console.log('Result:', res.status, data);
}

testVerifiedDomainSend();
