async function test() {
  const RESEND_API_KEY = 're_48vKshK9_CujUhsn56MPkviPGPUXoacin';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Joy PeopleHR <noreply@joypeoplehr.com>',
      to: ['thirumalairk27@gmail.com'],
      subject: 'Test Email from Joy PeopleHR Domain',
      html: '<p>Testing domain delivery</p>',
    }),
  });
  const data = await res.json();
  console.log('Status:', res.status, data);
}
test();
