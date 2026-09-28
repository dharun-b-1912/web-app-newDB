async function checkWaTables() {
  const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

  for (const t of ['whatsapp_integrations', 'whatsapp_sender_numbers', 'whatsapp_employee_identity_links', 'whatsapp_message_status_events', 'whatsapp_conversations']) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${t}?limit=1`, { headers });
      console.log(t, 'Status:', res.status);
      if (!res.ok) console.log(await res.text());
    } catch (e) {
      console.log(t, 'Error:', e.message);
    }
  }
}

checkWaTables();
