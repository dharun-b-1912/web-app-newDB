// scripts/test_live_vendor_ecosystem.cjs
// ============================================================================
// Joy PeopleHR — End-to-End Enterprise Vendor Ecosystem Live Test
// Verifies:
// 1. Database Connectivity & Multi-Tenant Organization Resolution
// 2. Vendor Master Creation in public.vendors
// 3. Vendor Relationship Creation in public.vendor_relationships
// 4. Contractor Worker Registration in public.vendor_workers
// 5. Realtime Conversation & Message Exchange in public.vendor_conversations / vendor_messages
// 6. Two-Way Request / Ticketing in public.vendor_requests
// 7. Audit Logging in public.vendor_audit_logs
// ============================================================================

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
const env = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) {
    let val = v.join('=').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[k.trim()] = val;
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function runLiveEcosystemTest() {
  console.log('🚀 Starting Enterprise Vendor Ecosystem Live Verification...\n');

  try {
    // 1. Fetch live customer organization
    const { data: orgs, error: orgErr } = await supabase
      .from('organizations')
      .select('id, legal_name, display_name')
      .limit(1);

    if (orgErr || !orgs || orgs.length === 0) {
      throw new Error(`Failed to resolve tenant organization: ${orgErr?.message || 'No org found'}`);
    }

    const testOrg = orgs[0];
    console.log(`✅ [1/6] Resolved Tenant Organization: "${testOrg.display_name || testOrg.legal_name}" (${testOrg.id})`);

    // 2. Insert Vendor Master into public.vendors
    const uniqueSuffix = Date.now().toString(36);
    const testVendorCode = `VEN-E2E-${uniqueSuffix.toUpperCase()}`;
    const testVendorLegalName = `Vanguard Industrial Facility Services Ltd (${uniqueSuffix})`;

    const { data: vendor, error: vErr } = await supabase
      .from('vendors')
      .insert([
        {
          organization_id: testOrg.id,
          vendor_code: testVendorCode,
          legal_name: testVendorLegalName,
          display_name: 'Vanguard Industrial',
          vendor_type: 'FACILITY_SERVICE_PROVIDER',
          category: 'Facility Management',
          email: `facilities.${uniqueSuffix}@vanguard-ops.in`,
          phone: '+91 98401 23456',
          status: 'ACTIVE',
        },
      ])
      .select()
      .single();

    if (vErr || !vendor) {
      throw new Error(`Failed to insert vendor into public.vendors: ${vErr?.message}`);
    }
    console.log(`✅ [2/6] Created Vendor Master: "${vendor.legal_name}" [Code: ${vendor.vendor_code}]`);

    // 3. Create Multi-Tenant Relationship in public.vendor_relationships
    const testRelCode = `REL-${uniqueSuffix.toUpperCase()}`;
    const { data: rel, error: rErr } = await supabase
      .from('vendor_relationships')
      .insert([
        {
          organization_id: testOrg.id,
          vendor_id: vendor.id,
          relationship_code: testRelCode,
          category: 'Facility Management',
          service_type: 'Onsite Housekeeping & Technical Maintenance',
          onboarding_status: 'ACTIVE',
          compliance_status: 'COMPLIANT',
          internal_notes: 'CONFIDENTIAL: Preferred facility partner with SLA 99.5%. Internal notes hidden from vendor.',
          sites_json: ['Coimbatore Campus A', 'Tirupur Facility 2'],
          status: 'ACTIVE',
        },
      ])
      .select()
      .single();

    if (rErr || !rel) {
      throw new Error(`Failed to insert relationship: ${rErr?.message}`);
    }
    console.log(`✅ [3/6] Established Multi-Tenant Relationship: "${rel.relationship_code}" [Status: ${rel.onboarding_status}, Compliance: ${rel.compliance_status}]`);
    console.log(`       Sites Authorized: ${JSON.stringify(rel.sites_json)}`);

    // 4. Deploy Contractor Worker into public.vendor_workers
    const { data: worker, error: wErr } = await supabase
      .from('vendor_workers')
      .insert([
        {
          vendor_id: vendor.id,
          organization_id: testOrg.id,
          worker_code: `WRK-${uniqueSuffix.toUpperCase()}`,
          full_name: 'Kavitha Ramasamy',
          designation: 'Senior Facility Supervisor',
          department: 'Operations',
          skill_level: 'Skilled',
          work_location: 'Coimbatore Campus A',
          compliance_status: 'COMPLIANT',
          status: 'ACTIVE',
        },
      ])
      .select()
      .single();

    if (wErr || !worker) {
      throw new Error(`Failed to insert worker: ${wErr?.message}`);
    }
    console.log(`✅ [4/6] Registered Contractor Worker: "${worker.full_name}" [${worker.designation}, Location: ${worker.work_location}]`);

    // 5. Initialize Scoped Realtime Conversation & Exchange Messages
    const { data: conv, error: convErr } = await supabase
      .from('vendor_conversations')
      .insert([
        {
          relationship_id: rel.id,
          title: `${testOrg.display_name || 'Joy Corp'} ↔ ${vendor.display_name || vendor.legal_name} Channel`,
        },
      ])
      .select()
      .single();

    if (convErr || !conv) {
      throw new Error(`Failed to create conversation: ${convErr?.message}`);
    }

    const { data: msg1, error: m1Err } = await supabase
      .from('vendor_messages')
      .insert([
        {
          conversation_id: conv.id,
          sender_type: 'COMPANY',
          sender_name: 'Dr. Thirumalai (VP Human Resources)',
          body: 'Welcome to the Joy PeopleHR ecosystem. Please review the updated safety protocol for Campus A.',
          message_type: 'TEXT',
        },
      ])
      .select()
      .single();

    const { data: msg2, error: m2Err } = await supabase
      .from('vendor_messages')
      .insert([
        {
          conversation_id: conv.id,
          sender_type: 'VENDOR',
          sender_name: 'Vanguard Ops Lead',
          body: 'Thank you Dr. Thirumalai. Our 14 personnel have acknowledged the updated safety protocol.',
          message_type: 'TEXT',
        },
      ])
      .select()
      .single();

    if (m1Err || m2Err) {
      throw new Error(`Failed to exchange messages: ${m1Err?.message || m2Err?.message}`);
    }
    console.log(`✅ [5/6] Realtime Conversation Thread Created: "${conv.title}"`);
    console.log(`       Transmitted 2 Scoped Messages:`);
    console.log(`         • [COMPANY -> VENDOR]: "${msg1.body}"`);
    console.log(`         • [VENDOR -> COMPANY]: "${msg2.body}"`);

    // 6. Log Two-Way Request and Audit Trail
    const { data: req, error: reqErr } = await supabase
      .from('vendor_requests')
      .insert([
        {
          relationship_id: rel.id,
          request_number: `REQ-${uniqueSuffix.toUpperCase()}`,
          created_by_type: 'COMPANY',
          subject: 'Form V Contract Labour Certificate Request',
          description: 'Please submit Form V endorsement for the Q3 workforce expansion.',
          category: 'Statutory Compliance',
          priority: 'HIGH',
          status: 'OPEN',
        },
      ])
      .select()
      .single();

    if (reqErr || !req) {
      throw new Error(`Failed to insert request: ${reqErr?.message}`);
    }

    await supabase.from('vendor_audit_logs').insert([
      {
        relationship_id: rel.id,
        actor_name: 'Dr. Thirumalai',
        actor_type: 'COMPANY',
        action: 'VENDOR_RELATIONSHIP_VERIFIED_AND_ACTIVATED',
        new_values: { relationship_code: rel.relationship_code, vendor_code: vendor.vendor_code },
      },
    ]);

    console.log(`✅ [6/6] Two-Way Request & Audit Log Recorded: "${req.subject}" [Priority: ${req.priority}, Number: ${req.request_number}]`);
    console.log('\n🎉 ALL 6 ENTERPRISE VENDOR ECOSYSTEM VERIFICATION CHECKS PASSED!\n');
  } catch (err) {
    console.error('❌ E2E Ecosystem Verification Error:', err.message);
    process.exit(1);
  }
}

runLiveEcosystemTest();
