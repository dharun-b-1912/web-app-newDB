import fetch from 'node-fetch';

async function listDomains() {
  const apiKey = 're_mock_dummy_resend_api_key_sanitized';
  const res = await fetch('https://api.resend.com/domains', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const data = await res.json();
  console.log('Domains on Resend account:', res.status, data);
}

listDomains();
