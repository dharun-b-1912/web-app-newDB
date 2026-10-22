import 'dotenv/config';
import { processInboundWhatsAppMessage } from '../server_whatsapp_bot_phase1.js';

async function testInboundHi() {
  console.log('--- Simulating inbound "Hi" from 919384125278 ---');
  try {
    await processInboundWhatsAppMessage({
      from: '919384125278',
      messageId: `test_${Date.now()}`,
      text: 'Hi',
    });
    console.log('--- Inbound "Hi" processed successfully! ---');
  } catch (err) {
    console.error('Error during processing:', err);
  }
}

testInboundHi();
