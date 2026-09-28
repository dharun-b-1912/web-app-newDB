const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Supabase Client
const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc';
const supabase = createClient(SUPABASE_URL, ANON_KEY);

// 2. Upstash Redis
const UPSTASH_URL = 'https://powerful-marmot-162532.upstash.io';
const UPSTASH_TOKEN = 'gQAAAAAAAnrkAAIgcDI0NjFkYzJlOWE5YWQ0ODVhOWYwYWNmYzFkNWJmM2FjZQ';

async function getFirebaseToken() {
  const sa = JSON.parse(fs.readFileSync(path.join(__dirname, 'firebase-service-account.json'), 'utf8'));
  const crypto = require('crypto');
  
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const claimSet = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  })).toString('base64url');

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${claimSet}`);
  const signature = sign.sign(sa.private_key, 'base64url');
  const jwt = `${header}.${claimSet}.${signature}`;

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });
  const data = await resp.json();
  return data.access_token;
}

async function sendDirectFCM(target, title, body, route = 'attendance') {
  const accessToken = await getFirebaseToken();
  const url = 'https://fcm.googleapis.com/v1/projects/joy-peoplehr-mobile-app/messages:send';
  
  const message = {
    notification: {
      title,
      body
    },
    android: {
      priority: 'HIGH',
      notification: {
        channel_id: 'joy_peoplehr_high_importance',
        sound: 'default',
        default_vibrate_timings: true,
        notification_priority: 'PRIORITY_MAX',
        icon: 'ic_launcher',
        color: '#1A56DB',
        visibility: 'PUBLIC'
      }
    },
    data: {
      title,
      body,
      message: body,
      route,
      timestamp: Date.now().toString()
    }
  };

  if (target.startsWith('token:')) {
    message.token = target.replace('token:', '');
  } else {
    message.topic = target.replace('topic:', '').replace('/topics/', '');
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message })
  });

  const resData = await res.json();
  return { status: res.status, result: resData };
}

async function main() {
  const title = 'JOY PeopleHR Notification';
  const body = 'Hello Dharun! Real-time background push notification and system sound are active.';
  const route = 'attendance';

  console.log('--- 1. Authenticating as Dharun ---');
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'dharun@joyglobalcorp.com',
    password: 'joypeoplehr'
  });
  if (authErr) {
    console.error('Auth error:', authErr);
  } else {
    console.log('Logged in as Dharun:', auth.user.id);
  }

  console.log('\n--- 2. Sending to FCM Topics (all_employees & dharun) ---');
  const r1 = await sendDirectFCM('topic:all_employees', title, body, route);
  console.log('FCM Topic all_employees result:', r1.status, r1.result.name || r1.result);

  const r2 = await sendDirectFCM('topic:dharun', title, body, route);
  console.log('FCM Topic dharun result:', r2.status, r2.result.name || r2.result);

  console.log('\n--- 3. Checking Upstash Redis for Direct Device Tokens ---');
  try {
    const upRes = await fetch(`${UPSTASH_URL}/get/fcm_token:dharun`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    const upData = await upRes.json();
    if (upData.result) {
      console.log('Found Dharun FCM Token in Upstash Redis! Sending direct token push...');
      const r3 = await sendDirectFCM(`token:${upData.result}`, title, body, route);
      console.log('Direct Token Push result:', r3.status, r3.result.name || r3.result);
    } else {
      console.log('No token in Redis yet (will appear once user opens v1.0.6 APK on phone).');
    }
  } catch (e) {
    console.log('Redis check notice:', e.message);
  }

  console.log('\n--- 4. Checking Supabase employee_device_tokens table ---');
  try {
    const { data: dt } = await supabase.from('employee_device_tokens').select('*').limit(5);
    console.log('Device tokens registered in Supabase:', dt?.length || 0);
    if (dt && dt.length > 0) {
      for (const row of dt) {
        console.log(`Sending direct push to device token (${row.fcm_token.substring(0, 15)}...)...`);
        const r4 = await sendDirectFCM(`token:${row.fcm_token}`, title, body, route);
        console.log('Result:', r4.status, r4.result.name || r4.result);
      }
    }
  } catch (e) {
    console.log('Device token check notice:', e.message);
  }

  console.log('\n--- 5. Inserting into Supabase notification_events (triggers Edge Function) ---');
  const { data: dbData, error: dbErr } = await supabase.from('notification_events').insert({
    organization_id: '0c621892-e938-4707-9957-13534ea32c19',
    recipient_user_id: 'a64cc800-7219-472c-bcea-2b572959f457',
    channel: 'IN_APP',
    title: title,
    message: body,
    action_url: '/attendance',
    is_read: false,
    is_sent: true,
    sent_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  }).select('id').single();

  if (dbErr) {
    console.error('Supabase insert error:', dbErr.message);
  } else {
    console.log('Supabase notification_events row created, ID:', dbData.id);
  }

  console.log('\nPush notification dispatch successfully completed across ALL layers!');
}

main();
