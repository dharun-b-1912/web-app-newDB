const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
const env = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) {
    let val = v.join('=').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    env[k.trim()] = val;
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function probeVendorTables() {
  const candidateTables = [
    'vendors',
    'vendor_relationships',
    'vendor_organizations',
    'vendor_categories',
    'vendor_users',
    'vendor_workers',
    'vendor_employees',
    'vendor_contracts',
    'vendor_documents',
    'vendor_document_versions',
    'vendor_compliance_records',
    'vendor_compliance_requirements',
    'vendor_requests',
    'vendor_request_comments',
    'vendor_tasks',
    'vendor_conversations',
    'vendor_conversation_participants',
    'vendor_messages',
    'vendor_message_attachments',
    'vendor_message_reads',
    'vendor_notifications',
    'vendor_invoices',
    'vendor_purchase_orders',
    'vendor_assignments',
    'vendor_invitations',
    'vendor_activity',
    'vendor_audit_logs',
    'vendor_credentials'
  ];

  const existing = [];
  const missing = [];

  for (const t of candidateTables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      missing.push({ table: t, error: error.message });
    } else {
      existing.push({ table: t, rowCount: data ? data.length : 0 });
    }
  }

  console.log('--- EXISTING VENDOR TABLES IN REMOTE SUPABASE ---');
  console.table(existing);
  console.log('\n--- MISSING VENDOR TABLES ---');
  console.log(missing.map(m => m.table).join(', '));
}

probeVendorTables();
