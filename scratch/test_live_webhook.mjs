async function test() {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: '1477770540837429',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: '919043022330', phone_number_id: '439708915897148' },
          messages: [{
            from: '919840209900',
            id: 'wamid.test_' + Date.now(),
            timestamp: String(Math.floor(Date.now() / 1000)),
            type: 'interactive',
            interactive: {
              type: 'button_reply',
              button_reply: { id: 'SCHED_ROSTER', title: '7-Day Roster' }
            }
          }]
        },
        field: 'messages'
      }]
    }]
  };

  const res = await fetch('https://app.joypeoplehr.com/api/webhooks/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log('Status:', res.status, await res.text());
}
test();
