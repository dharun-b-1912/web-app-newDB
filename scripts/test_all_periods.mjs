// scripts/test_all_periods.mjs
const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

async function testSlot(slotName) {
  console.log(`\n======================================================`);
  console.log(`🧪 TESTING SLOT: ${slotName}`);
  console.log(`======================================================`);

  const response = await fetch(`${SUPABASE_URL}/functions/v1/attendance-report-dispatcher`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      slot: slotName,
      mode: 'MANUAL_TEST',
      organization_id: '0c621892-e938-4707-9957-13534ea32c19',
      date: '2026-10-28',
      recipients: ['thirumalai@joyglobalcorp.com', 'praveen.b@joyglobalcorp.com'],
      whatsAppRecipients: ['919840209900', '917825906580'],
    }),
  });

  const status = response.status;
  const data = await response.json();

  console.log(`HTTP Status: ${status}`);
  console.log(`Success: ${data.success}`);
  console.log(`Headcount: ${data.headcount}`);
  console.log(`Turnout:`, data.turnout);
  console.log(`Summary:`, data.summary);
  if (data.weeklyMetrics) {
    console.log(`Weekly Metrics:`, data.weeklyMetrics);
  }
  if (data.monthlyMetrics) {
    console.log(`Monthly Metrics:`, data.monthlyMetrics);
  }
  console.log(`Attachments:`, data.attachments);
  console.log(`Email Result:`, data.email);
  console.log(`WhatsApp Result:`, { successCount: data.whatsapp?.successCount, count: data.whatsapp?.results?.length });

  // Validate PDF base64
  if (data.pdfBase64) {
    const pdfBuffer = Buffer.from(data.pdfBase64, 'base64');
    const header = pdfBuffer.slice(0, 5).toString('ascii');
    console.log(`PDF Buffer Size: ${pdfBuffer.length} bytes, Header: "${header}"`);
    if (header !== '%PDF-') {
      throw new Error(`Invalid PDF header: ${header}`);
    }
  }

  if (!data.success) {
    throw new Error(`Slot ${slotName} failed: ${data.error}`);
  }

  if (data.turnout?.present <= 0) {
    throw new Error(`CRITICAL: 0 present turnout in ${slotName}!`);
  }

  console.log(`✅ SLOT ${slotName} PASSED PERFECTLY!`);
}

async function runAll() {
  try {
    await testSlot('DAILY');
    await testSlot('WEEKLY');
    await testSlot('MONTHLY');
    console.log(`\n🎉 ALL 3 SLOTS (DAILY, WEEKLY, MONTHLY) PASSED WITH FLYING COLORS!`);
  } catch (err) {
    console.error(`\n❌ TEST FAILED:`, err.message);
    process.exit(1);
  }
}

runAll();
