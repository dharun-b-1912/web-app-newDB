import { whatsAppBotEngine } from '../src/services/whatsapp/botEngine.ts';

async function test() {
  console.log('Simulating MENU_PAYSLIP from 919384125278...');
  await whatsAppBotEngine.handleInboundMessage({
    from: '919384125278',
    messageId: 'test_payslip_click',
    buttonPayload: 'MENU_PAYSLIP',
  });
  console.log('✅ MENU_PAYSLIP handled successfully!');
}

test().catch(console.error);
