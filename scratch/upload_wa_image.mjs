/**
 * Upload welcome image to Meta WhatsApp Media API using native Node.js fetch + Blob
 * Then send welcome message with the media_id to both employees
 */
import fs from 'fs';
import path from 'path';
import { Blob } from 'node:buffer';

const META_TOKEN = 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
const PHONE_ID   = '1352826481241407';
const IMG_PATH   = 'D:\\web-app (2)\\Joy PeopleHR\\scratch\\welcome_banner_wa.jpg';

async function uploadToMeta() {
  console.log('Uploading to Meta WhatsApp Media API...');
  const buf = fs.readFileSync(IMG_PATH);
  const blob = new Blob([buf], { type: 'image/jpeg' });

  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', 'image/jpeg');
  form.append('file', blob, 'welcome-banner.jpg');

  const r = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/media`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + META_TOKEN },
    body: form
  });

  const j = await r.json();
  console.log('Status:', r.status);
  console.log(JSON.stringify(j, null, 2));

  if (r.ok && j.id) {
    console.log('\n✅ Media ID:', j.id);
    return j.id;
  }
  return null;
}

async function sendWelcome(phone, name, code, role, mediaId) {
  const caption =
    `🎉 *Welcome to Joy Corporate Solutions Pvt Ltd!*\n\n` +
    `Dear *${name}*, your onboarding is now complete! 🌟\n\n` +
    `🪪 *Employee Code:* ${code}\n` +
    `💼 *Role:* ${role}\n\n` +
    `*Your WhatsApp HR Assistant is now ACTIVE:*\n` +
    `📄 Reply *PAYSLIP* — Get latest payslip\n` +
    `🌴 Reply *LEAVE* — Leave balance & apply\n` +
    `⏰ Reply *ATTENDANCE* — Attendance status\n` +
    `📢 Reply *NEWS* — Company announcements\n\n` +
    `🌐 Portal: https://app.joypeoplehr.com\n\n` +
    `_Save this number as Joy PeopleHR HR Assistant_`;

  const body = mediaId
    ? { messaging_product: 'whatsapp', to: phone, type: 'image', image: { id: mediaId, caption } }
    : { messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: caption } };

  console.log(`\nSending to ${name} (${phone})...`);
  const r = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + META_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const j = await r.json();
  if (r.ok) console.log('✅ Sent! ID:', j.messages?.[0]?.id);
  else console.log('❌', j.error?.code, j.error?.message);
}

async function main() {
  console.log('=== Joy PeopleHR WhatsApp Welcome Image Upload ===');
  console.log('Image: 1200x446 JPEG, 95.2 KB\n');

  const mediaId = await uploadToMeta();

  if (mediaId) {
    // Save to .env for reuse
    console.log('\n--- Save this in .env ---');
    console.log('VITE_WA_WELCOME_IMAGE_MEDIA_ID=' + mediaId);
    console.log('-------------------------');

    await sendWelcome('919384125278', 'Thirumalai R K', 'WF-1001', 'Software Engineer', mediaId);
    await sendWelcome('919840209900', 'HR Admin',       'HR-001',  'HR Head',           mediaId);
  } else {
    console.log('\nFalling back to text messages...');
    await sendWelcome('919384125278', 'Thirumalai R K', 'WF-1001', 'Software Engineer', null);
    await sendWelcome('919840209900', 'HR Admin',       'HR-001',  'HR Head',           null);
  }
}

main().catch(console.error);
