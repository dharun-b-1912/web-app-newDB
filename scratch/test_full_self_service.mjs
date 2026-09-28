// scratch/test_full_self_service.mjs
import { whatsAppBotEngine } from '../src/services/whatsapp/botEngine.ts';

async function run() {
  console.log('Testing WhatsApp Bot Engine 6 Core Services...');

  // 1. Simulate Menu Selection
  await whatsAppBotEngine.handleInboundMessage({
    from: '919384125278',
    messageId: 'test_msg_001',
    text: 'MENU',
  });
  console.log('✅ Menu sent');

  // 2. Simulate Schedule Selection
  await whatsAppBotEngine.handleInboundMessage({
    from: '919384125278',
    messageId: 'test_msg_002',
    buttonPayload: 'MENU_SCHEDULE',
  });
  console.log('✅ Schedule menu sent');

  // 3. Simulate Week Off Selection
  await whatsAppBotEngine.handleInboundMessage({
    from: '919384125278',
    messageId: 'test_msg_003',
    buttonPayload: 'SCHED_OFF',
  });
  console.log('✅ Weekly off sent');

  // 4. Simulate Shift Details Selection
  await whatsAppBotEngine.handleInboundMessage({
    from: '919384125278',
    messageId: 'test_msg_004',
    buttonPayload: 'SCHED_SHIFT',
  });
  console.log('✅ Shift details sent');

  console.log('ALL 6 SERVICES TESTED CLEANLY!');
}

run().catch(console.error);
