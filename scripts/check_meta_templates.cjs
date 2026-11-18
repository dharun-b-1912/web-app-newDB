require('dotenv').config();

async function checkTemplates() {
  const metaToken = process.env.META_WA_ACCESS_TOKEN;
  const wabaId = process.env.META_WA_WABA_ID || '1550382319749383';
  
  const res = await fetch(`https://graph.facebook.com/v20.0/${wabaId}/message_templates?limit=100`, {
    headers: { Authorization: `Bearer ${metaToken}` }
  });
  const data = await res.json();
  if (data.error) {
    console.error('Meta Error:', data.error);
    return;
  }
  
  console.log(`Found ${data.data.length} templates:`);
  for (const t of data.data) {
    console.log(`\n========================================`);
    console.log(`Name: ${t.name} | Status: ${t.status} | Lang: ${t.language} | ID: ${t.id}`);
    console.log(`Components:`, JSON.stringify(t.components, null, 2));
  }
}

checkTemplates();
