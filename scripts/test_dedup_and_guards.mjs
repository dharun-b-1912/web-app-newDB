import 'dotenv/config';
import { processInboundWhatsAppMessage } from '../server_whatsapp_bot.js';

async function runTests() {
  console.log('=== Test 1: Empty input (should be skipped silently) ===');
  const res1 = await processInboundWhatsAppMessage({ from: '919384125278' });
  console.log('Result 1 (expected null):', res1);

  console.log('\n=== Test 2: Rapid second call within debounce window ===');
  const res2 = await processInboundWhatsAppMessage({ from: '919384125278', text: 'Hi' });
  console.log('Result 2 (expected null debounced):', res2);

  // Wait 1.3 seconds for debounce window to expire
  console.log('\nWaiting 1.3s for debounce window...');
  await new Promise(r => setTimeout(r, 1300));

  console.log('\n=== Test 3: Unrecognized text (e.g. "thanks") ===');
  // First confirm identity
  await processInboundWhatsAppMessage({ from: '919384125278', buttonPayload: 'CONFIRM_IDENTITY_YES' });
  await new Promise(r => setTimeout(r, 1300));
  
  const res3 = await processInboundWhatsAppMessage({ from: '919384125278', text: 'thanks a lot' });
  console.log('Result 3:', res3 ? 'Handled with helper' : 'null');
}

runTests();
