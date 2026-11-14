const WEBHOOK_URL = 'https://ysiajemrqakfngasehhi.supabase.co/functions/v1/telegram-webhook';
const CHAT_ID = '-5189746331'; // Joy PeopleHR Watchdog Grp

async function testCommand(text) {
  console.log(`\nTesting Command: "${text}"...`);
  const payload = {
    update_id: Date.now(),
    message: {
      message_id: Math.floor(Math.random() * 100000),
      from: { id: 9155594412, is_bot: false, first_name: 'Lead Cloud Architect' },
      chat: { id: CHAT_ID, type: 'group', title: 'Joy PeopleHR Watchdog Grp' },
      date: Math.floor(Date.now() / 1000),
      text: text
    }
  };

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const resText = await res.text();
  console.log(`Result: ${res.status} ${resText}`);
}

async function run() {
  await testCommand('/critical');
  await new Promise(r => setTimeout(r, 1200));
  await testCommand('/investigate INC-20261114-0001');
  await new Promise(r => setTimeout(r, 1200));
  await testCommand('/ack INC-20261114-0001');
  await new Promise(r => setTimeout(r, 1200));
  await testCommand('/nightwatch');
}

run();

