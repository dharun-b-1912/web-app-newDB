import fetch from 'node-fetch';

async function test() {
  const apiKey = 're_mock_dummy_resend_api_key_sanitized';
  const email = 'dharunjoysolutions@gmail.com';

  console.log(`Sending test to: ${email}...`);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Joy PeopleHR <onboarding@resend.dev>',
      to: [email],
      subject: 'Joy PeopleHR — Attendance & Overtime Reconciliation Report (Test Delivery)',
      html: `<p>Testing Resend delivery to ${email}</p>`,
    }),
  });

  const data = await res.json();
  console.log(`Result for ${email}:`, res.status, data);
}

test();
