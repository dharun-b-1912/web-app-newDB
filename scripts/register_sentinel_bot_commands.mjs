const TELEGRAM_BOT_TOKEN = '9137821052:AAH40OpD041tLdmC0_fheiZbk9_AxGs2TQ0';

async function registerCommands() {
  const commands = [
    { command: 'status', description: 'Overall SaaS health & platform vitals' },
    { command: 'critical', description: 'Active P0 & P1 production incidents' },
    { command: 'incidents', description: 'Open incidents registry & counts' },
    { command: 'airtel', description: 'Airtel SMS delivery & DLT telemetry' },
    { command: 'devices', description: 'Biometric hardware terminals status' },
    { command: 'errors', description: 'Recent outbound communication errors' },
    { command: 'nightwatch', description: 'On-call engineers directory & SLAs' },
    { command: 'help', description: 'Command directory & incident runbooks' }
  ];

  console.log('Registering commands with Telegram API...');
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commands })
  });

  const data = await res.json();
  console.log('Registration response:', data);
}

registerCommands();

