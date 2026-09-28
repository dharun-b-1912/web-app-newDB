async function checkLogs() {
  const apiKey = 're_mock_dummy_resend_api_key_sanitized';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json();
    console.log('Recent Resend Emails:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

checkLogs();
