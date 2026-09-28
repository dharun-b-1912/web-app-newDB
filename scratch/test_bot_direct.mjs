import { processInboundWhatsAppMessage } from '../server_whatsapp_bot.js';

async function main() {
  console.log('Testing processInboundWhatsAppMessage with MENU_PAYSLIP...');
  const res = await processInboundWhatsAppMessage({
    from: '919384125278',
    buttonPayload: 'MENU_PAYSLIP'
  });
  console.log('Result:', res);
}

main().catch(console.error);
