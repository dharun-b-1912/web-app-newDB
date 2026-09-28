import '../server.js';

async function check() {
  await new Promise(r => setTimeout(r, 1000));
  try {
    const res = await fetch('http://localhost:3000/api/health');
    console.log('Local health status:', res.status, await res.json());

    const resHook = await fetch('http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=joy_peoplehr_meta_webhook_secret_token&hub.challenge=test_123');
    console.log('Local webhook challenge:', resHook.status, await resHook.text());
  } catch (err) {
    console.error('Check error:', err);
  } finally {
    process.exit(0);
  }
}

check();
