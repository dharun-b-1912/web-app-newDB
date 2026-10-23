import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

async function testBotSelfService() {
  console.log('Testing WhatsApp Bot Self-Service MIS request for Manager Praveen (917825906580)...');
  const edgeUrl = `${SUPABASE_URL}/functions/v1/attendance-report-dispatcher`;

  const resp = await fetch(edgeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      slot: 'EVENING',
      mode: 'BOT_SELF_SERVICE',
      organization_id: '0c621892-e938-4707-9957-13534ea32c19',
      whatsAppRecipients: ['917825906580'],
      requesterPhone: '917825906580',
      requesterName: 'Praveen B',
      date: '2026-10-23',
    }),
  });

  const json = await resp.json().catch(() => null);
  console.log('Status HTTP:', resp.status);
  console.log('Bot Response:', JSON.stringify(json, null, 2));
}

testBotSelfService();
