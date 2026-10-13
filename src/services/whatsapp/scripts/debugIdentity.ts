// src/services/whatsapp/scripts/debugIdentity.ts
// ============================================================================
// JOY PeopleHR / WorkforceOS — WhatsApp Identity Debugger CLI
// Usage: npx tsx src/services/whatsapp/scripts/debugIdentity.ts -- <phone>
// ============================================================================

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { whatsAppIdentityService, ALL_WHATSAPP_PERMISSIONS } from '../whatsappIdentityService';
import { whatsAppLogger } from '../whatsappLogger';
import { normalizeIndianPhone, formatDisplayPhone } from '../phoneUtils';

async function run() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const targetPhone = args[0] || '9876543210';
  const correlationId = whatsAppLogger.generateCorrelationId();

  console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║       WORKFORCEOS WHATSAPP IDENTITY & PERMISSION DEBUGGER             ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝');
  console.log(`Target Input:   ${targetPhone}`);
  console.log(`Correlation ID: ${correlationId}\n`);

  let cleanPhone = '';
  try {
    cleanPhone = normalizeIndianPhone(targetPhone);
    console.log(`[1] Phone Normalization:  ✓ Canonical E.164: ${cleanPhone} (${formatDisplayPhone(cleanPhone)})`);
  } catch (err: any) {
    console.error(`[1] Phone Normalization:  ✗ FAILED: ${err.message}`);
    process.exit(1);
  }

  console.log(`[2] Querying Supabase Database (public.employees)...`);
  const accounts = await whatsAppIdentityService.lookupEmployeeByPhone(cleanPhone, correlationId);

  if (accounts.length === 0) {
    console.log(`\n❌ Result: NO ACTIVE EMPLOYEE RECORD FOUND for ${whatsAppLogger.maskPhone(cleanPhone)}`);
    console.log(`   Next UX Step: Prompt user to enter registered mobile or Contact HR support.`);
    console.log('─────────────────────────────────────────────────────────────────────────\n');
    return;
  }

  console.log(`\n✓ Result: ${accounts.length} Active Employee Account(s) Resolved\n`);

  accounts.forEach((acc, index) => {
    const denied = ALL_WHATSAPP_PERMISSIONS.filter((p) => !acc.permissions.includes(p));

    console.log(`─────────────────── [ Account ${index + 1} of ${accounts.length} ] ───────────────────`);
    console.log(`👤 Employee:      ${acc.fullName} (${acc.employeeCode})`);
    console.log(`🏢 Company:       ${acc.companyName}`);
    console.log(`🏛️ Department:    ${acc.department}`);
    console.log(`💼 Designation:   ${acc.designation}`);
    console.log(`📊 Status:        ${acc.employmentStatus}`);
    console.log(`👥 Direct Reports:${acc.directReportsCount}`);
    console.log(`👔 Manager:       ${acc.managerName || 'Not assigned'}`);
    console.log(`🎯 Role Context:  ${acc.roleContext}`);
    console.log(`\n🔐 Permissions (${acc.permissions.length} Granted / ${denied.length} Denied):`);
    console.log(`   Granted: ${acc.permissions.map((p) => `✓ ${p}`).join(', ')}`);
    console.log(`   Denied:  ${denied.map((d) => `✗ ${d}`).join(', ')}`);
    console.log(`\n📱 Role Menu:     ${acc.roleContext}_HOME_MENU`);
    console.log('─────────────────────────────────────────────────────────────────────────\n');
  });
}

run().catch((err) => {
  console.error('[IdentityDebugger] Fatal error:', err);
  process.exit(1);
});
