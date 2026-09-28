const https = require('https');
const path = require('path');
const fs = require('fs');

// Read .env directly
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) {
    let val = v.join('=').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[k.trim()] = val;
  }
});

const RESEND_KEY = env.VITE_RESEND_API_KEY || 're_mock_dummy_resend_api_key_sanitized';
const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON = env.VITE_SUPABASE_ANON_KEY;

const { createClient } = require('@supabase/supabase-js');

async function checkEmailStatus(id) {
  return new Promise((resolve) => {
    https.get({
      hostname: 'api.resend.com',
      path: `/emails/${id}`,
      headers: { 'Authorization': `Bearer ${RESEND_KEY}` }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const detail = JSON.parse(data);
          console.log(`[Status for ${id}]: Subject: "${detail.subject}" | Event: "${detail.last_event}" | From: ${detail.from} | To: ${detail.to}`);
        } catch(e) {
          console.log('Status error:', data);
        }
        resolve();
      });
    });
  });
}

async function checkResendLogs() {
  console.log('\n=============================================');
  console.log('📬 1. Checking Live Resend Outbox Activity...');
  console.log('=============================================');
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.data && json.data.length > 0) {
            json.data.slice(0, 5).forEach(item => {
              console.log(`[Resend Event] ID: ${item.id} | To: ${item.to} | Subject: "${item.subject}" | Created: ${item.created_at}`);
            });
          } else {
            console.log('Response:', json);
          }
        } catch (err) {
          console.log('Resend response:', data);
        }
        resolve();
      });
    });
    req.on('error', err => {
      console.error('Resend log check error:', err.message);
      resolve();
    });
    req.end();
  });
}

async function sendSupabaseOtpTest() {
  console.log('\n=============================================');
  console.log('🔐 2. Testing Supabase Auth Mailer to thirumalairk27@gmail.com...');
  console.log('=============================================');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
  const targetEmail = 'thirumalairk27@gmail.com';
  
  const { data, error } = await supabase.auth.signInWithOtp({
    email: targetEmail,
    options: {
      shouldCreateUser: false
    }
  });
  
  if (error) {
    console.error('❌ Supabase Auth OTP Error:', error.message, '| status:', error.status);
  } else {
    console.log('✅ Supabase Auth OTP successfully handed off to SMTP mailer!');
    console.log('Recipient:', targetEmail);
    console.log('Response:', data);
  }
}

async function run() {
  console.log('--- Checking Status of Recent Emails ---');
  await checkEmailStatus('a1f57d6b-7431-4846-b6de-c5365655dbfc'); // Supabase OTP
  await checkEmailStatus('7a415627-5bb4-4be0-bf67-cdea2ab80d18'); // Direct
  await checkResendLogs();
}

run();
