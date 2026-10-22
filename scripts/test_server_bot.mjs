import 'dotenv/config';
import { processInboundWhatsAppMessage } from '../server_whatsapp_bot.js';

async function testScheduleFlow() {
  console.log('--- 1. Login user ---');
  await processInboundWhatsAppMessage({
    from: '919384125278',
    buttonPayload: 'CONFIRM_IDENTITY_YES',
  });

  console.log('\n--- 2. Taps "Shift & Roster" (MENU_SCHEDULE) ---');
  await processInboundWhatsAppMessage({
    from: '919384125278',
    listReplyId: 'MENU_SCHEDULE',
  });

  console.log('\n--- 3. Taps "📅 7-Day Roster" (SCHED_ROSTER) ---');
  await processInboundWhatsAppMessage({
    from: '919384125278',
    buttonPayload: 'SCHED_ROSTER',
  });

  console.log('\n--- 4. Taps "🌴 Weekly Off" (SCHED_OFF) ---');
  await processInboundWhatsAppMessage({
    from: '919384125278',
    buttonPayload: 'SCHED_OFF',
  });

  console.log('\n--- 5. Taps "⏰ Shift Timings" (SCHED_SHIFT) ---');
  await processInboundWhatsAppMessage({
    from: '919384125278',
    buttonPayload: 'SCHED_SHIFT',
  });
}

testScheduleFlow();
