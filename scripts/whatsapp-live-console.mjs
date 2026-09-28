// scripts/whatsapp-live-console.mjs
// ============================================================================
// Joy PeopleHR — Interactive Terminal Console & Test Harness for WhatsApp API
// Tests Live Dispatch from +91 90430 22330, Validates Delivery & Inspects Webhooks
// ============================================================================

import 'dotenv/config';
import readline from 'readline';

const TOKEN = process.env.META_WA_ACCESS_TOKEN || 'EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD';
const PHONE_NUMBER_ID = process.env.META_WA_PHONE_NUMBER_ID || '1352826481241407';
const WABA_ID = process.env.META_WA_WABA_ID || '1550382319749383';
const DEFAULT_RECIPIENT = '919840209900';

function formatHeader() {
  console.clear();
  console.log('╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║       JOY PEOPLEHR — WHATSAPP BUSINESS PLATFORM LIVE CONSOLE          ║');
  console.log('║           Company: Joy Corporate Solutions Private Limited            ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  console.log(`📱 Sender Phone:       +91 90430 22330 (ID: ${PHONE_NUMBER_ID})`);
  console.log(`🏢 Business Account:   JoypeopleHR (WABA: ${WABA_ID})`);
  console.log(`🌐 Live Webhook URL:   https://api.joypeoplehr.com/api/webhooks/whatsapp`);
  console.log(`🎯 Test Recipient:     +91 98402 09900`);
  console.log('─────────────────────────────────────────────────────────────────────────\n');
}

async function sendWhatsAppMessage(payload, description) {
  console.log(`\n🚀 [DISPATCH] ${description}...`);
  console.log(`📦 Payload:\n`, JSON.stringify(payload, null, 2));

  const start = Date.now();
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const elapsed = Date.now() - start;
    const data = await res.json();

    console.log(`\n📡 [META API RESPONSE] Status: ${res.status} (${elapsed}ms)`);
    console.log(JSON.stringify(data, null, 2));

    if (res.ok && data.messages && data.messages.length > 0) {
      console.log(`\n✅ SUCCESS! Message sent to ${payload.to}`);
      console.log(`   WAMID: ${data.messages[0].id}`);
    } else {
      console.log(`\n❌ DISPATCH FAILED:`, data.error?.message || 'Unknown error');
    }
  } catch (err) {
    console.error(`\n💥 Network Error:`, err.message);
  }
}

async function runTest(option, targetPhone = DEFAULT_RECIPIENT) {
  const phone = targetPhone.replace(/\D/g, '').replace(/^0+/, '');
  const to = phone.startsWith('91') ? phone : `91${phone}`;

  switch (option) {
    case '1': {
      // 1. Live Text Notification
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
          preview_url: true,
          body: `🔔 *Joy PeopleHR System Notification*\n\nHello Team Member,\nThis is a live verified test message from Joy Corporate Solutions HRMS platform.\n\n🌐 ESS Portal: https://app.joypeoplehr.com\n⏰ Time: ${new Date().toLocaleTimeString('en-IN')}`
        }
      };
      await sendWhatsAppMessage(payload, 'Live System Text Notification');
      break;
    }

    case '2': {
      // 2. Interactive Menu / Action Buttons
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          header: {
            type: 'text',
            text: 'Joy PeopleHR Self-Service'
          },
          body: {
            text: 'Welcome to your Employee Self-Service Assistant. Please select an action below:'
          },
          footer: {
            text: 'Joy Corporate Solutions Pvt Ltd'
          },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: {
                  id: 'btn_payslip_latest',
                  title: '📄 View Payslip'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: 'btn_leave_balance',
                  title: '🌴 Leave Balances'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: 'btn_clockin_status',
                  title: '⏰ Attendance Status'
                }
              }
            ]
          }
        }
      };
      await sendWhatsAppMessage(payload, 'Interactive Employee Self-Service Menu Buttons');
      break;
    }

    case '3': {
      // 3. Attendance Miss Alert Trigger
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          header: {
            type: 'text',
            text: 'Attendance Alert: Missed Punch'
          },
          body: {
            text: `Dear Employee,\n\nOur biometric system detected an attendance exception today (${new Date().toLocaleDateString('en-IN')}):\n- Shift: General Shift (09:00 AM - 06:00 PM)\n- Status: Missing Morning Clock-In\n\nIf you are present at the client location, please regularize your punch.`
          },
          footer: {
            text: 'Joy PeopleHR Automated Attendance'
          },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: {
                  id: 'btn_punch_regularize',
                  title: '📍 Regularize Punch'
                }
              }
            ]
          }
        }
      };
      await sendWhatsAppMessage(payload, 'Attendance Anomaly Alert');
      break;
    }

    case '4': {
      // 4. Query Meta Templates Status
      console.log(`\n🔍 Querying Meta Approval Status for WABA ${WABA_ID}...`);
      const res = await fetch(`https://graph.facebook.com/v20.0/${WABA_ID}/message_templates?access_token=${TOKEN}`);
      const data = await res.json();
      console.log('\nRegistered Templates in Meta:');
      for (const t of data.data || []) {
        console.log(`- [${t.status}] ${t.name} (Category: ${t.category}, Lang: ${t.language}, ID: ${t.id})`);
      }
      break;
    }

    case '5': {
      // 5. Test Live Webhook Health
      console.log('\n🌐 Testing Live Webhook Endpoints...');
      const urls = [
        'https://api.joypeoplehr.com/api/webhooks/whatsapp',
        'https://app.joypeoplehr.com/api/webhooks/whatsapp'
      ];
      for (const u of urls) {
        const checkUrl = `${u}?hub.mode=subscribe&hub.verify_token=joy_peoplehr_meta_webhook_secret_token&hub.challenge=test_live_verify`;
        try {
          const res = await fetch(checkUrl);
          const text = await res.text();
          console.log(`  ✓ ${u} -> HTTP ${res.status} (Challenge Echo: "${text}")`);
        } catch (e) {
          console.log(`  ✗ ${u} -> Error: ${e.message}`);
        }
      }
      break;
    }

    default:
      console.log('Invalid option.');
  }
}

async function main() {
  const arg = process.argv[2];
  const targetPhone = process.argv[3] || DEFAULT_RECIPIENT;

  if (arg) {
    await runTest(arg, targetPhone);
    process.exit(0);
  }

  formatHeader();
  console.log('Select a test to execute:');
  console.log(' [1] Send Live Text Notification (+91 98402 09900)');
  console.log(' [2] Send Interactive ESS Menu Buttons (Payslip, Leave, Attendance)');
  console.log(' [3] Send Attendance Exception Alert with 1-Click Action');
  console.log(' [4] Check Meta HSM Template Approvals (Live Status)');
  console.log(' [5] Verify Live Webhook Health');
  console.log(' [Q] Quit\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Enter option (1-5): ', async (ans) => {
    rl.close();
    if (ans.toLowerCase() === 'q') return;
    await runTest(ans.trim(), DEFAULT_RECIPIENT);
  });
}

main();
