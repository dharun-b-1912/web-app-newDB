async function main() {
  const r0 = await fetch('https://joypeoplehr.com');
  console.log('https://joypeoplehr.com Status:', r0.status);
  const rApp = await fetch('https://app.joypeoplehr.com');
  console.log('https://app.joypeoplehr.com Status:', rApp.status);
  const rAppHook = await fetch('https://app.joypeoplehr.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=joy_peoplehr_meta_webhook_secret_token&hub.challenge=test_12345');
  console.log('https://app.joypeoplehr.com/api/webhooks/whatsapp Status:', rAppHook.status);
  console.log('Body:', await rAppHook.text());
  const url = 'https://api.joypeoplehr.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=joy_peoplehr_meta_webhook_secret_token&hub.challenge=test_12345';
  console.log('Testing GET:', url);
  try {
    const res = await fetch(url);
    console.log('GET Status:', res.status);
    console.log('GET Body:', await res.text());
  } catch (err) {
    console.error('GET Error:', err.message);
  }

  // Also test POST
  console.log('\nTesting POST to https://api.joypeoplehr.com/api/webhooks/whatsapp ...');
  try {
    const res2 = await fetch('https://api.joypeoplehr.com/api/webhooks/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ object: 'whatsapp_business_account', entry: [] })
    });
    console.log('POST Status:', res2.status);
    console.log('POST Body:', await res2.text());
  } catch (err) {
    console.error('POST Error:', err.message);
  }
}

main().catch(console.error);
