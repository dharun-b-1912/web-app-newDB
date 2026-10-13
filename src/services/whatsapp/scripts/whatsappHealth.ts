import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { supabase } from '../../../lib/supabase';
import { whatsAppIdentityService } from '../whatsappIdentityService';
import { whatsAppLogger } from '../whatsappLogger';

async function runHealthCheck() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║        WORKFORCEOS WHATSAPP BOT HEALTH CHECK             ║
╚══════════════════════════════════════════════════════════╝
`);

  const results: { component: string; status: 'PASS' | 'FAIL' | 'WARN'; detail?: string }[] = [];

  // 1. Environment variables
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    results.push({
      component: 'Environment Variables',
      status: 'PASS',
      detail: `URL: ${supabaseUrl.substring(0, 25)}...`,
    });
  } else {
    results.push({ component: 'Environment Variables', status: 'FAIL', detail: 'Missing Supabase URL or Key' });
  }

  // 2. Supabase Connectivity & Tables
  if (!supabase) {
    results.push({ component: 'Supabase Client', status: 'FAIL', detail: 'Could not initialize client' });
  } else {
    results.push({ component: 'Supabase Client', status: 'PASS' });

    // Test employees table
    try {
      const startTime = performance.now();
      const { data: empData, error: empErr } = await supabase
        .from('employees')
        .select('id, employee_code, phone')
        .limit(1);

      const duration = Math.round(performance.now() - startTime);

      if (empErr) {
        results.push({ component: 'Employee Repository (employees)', status: 'FAIL', detail: empErr.message });
      } else {
        results.push({ component: 'Employee Repository (employees)', status: 'PASS', detail: `${duration}ms response time` });
      }
    } catch (e: any) {
      results.push({ component: 'Employee Repository (employees)', status: 'FAIL', detail: e.message });
    }

    // Test companies / organizations table
    try {
      const startTime = performance.now();
      const { data: compData, error: compErr } = await supabase
        .from('companies')
        .select('id, legal_name, company_code')
        .limit(1);

      const duration = Math.round(performance.now() - startTime);

      if (compErr) {
        // Fallback to organizations
        const { error: orgErr } = await supabase.from('organizations').select('id, name').limit(1);
        if (orgErr) {
          results.push({ component: 'Organization Resolver (companies/orgs)', status: 'FAIL', detail: compErr.message });
        } else {
          results.push({ component: 'Organization Resolver (organizations)', status: 'PASS', detail: `${duration}ms` });
        }
      } else {
        results.push({ component: 'Organization Resolver (companies)', status: 'PASS', detail: `${duration}ms` });
      }
    } catch (e: any) {
      results.push({ component: 'Organization Resolver', status: 'FAIL', detail: e.message });
    }
  }

  // 3. Identity Service
  try {
    const testNorm = whatsAppIdentityService.normalizePhone('+91 98765-43210');
    if (testNorm.isValid && testNorm.e164 === '+919876543210') {
      results.push({ component: 'Phone Normalizer', status: 'PASS', detail: 'E.164 + 10-digit standard' });
    } else {
      results.push({ component: 'Phone Normalizer', status: 'FAIL', detail: 'Failed normalization check' });
    }
  } catch (e: any) {
    results.push({ component: 'Phone Normalizer', status: 'FAIL', detail: e.message });
  }

  // 4. Permission Engine
  try {
    const empPerms = whatsAppIdentityService.resolvePermissions('EMPLOYEE', { isHR: false });
    const mgrPerms = whatsAppIdentityService.resolvePermissions('MANAGER', { isHR: false });
    const hrPerms = whatsAppIdentityService.resolvePermissions('HR', { isHR: true });

    if (
      empPerms.granted.includes('attendance.check_in') &&
      !empPerms.granted.includes('team.attendance.view') &&
      mgrPerms.granted.includes('team.attendance.view') &&
      hrPerms.granted.includes('reports.view')
    ) {
      results.push({ component: 'Permission Engine', status: 'PASS', detail: 'Granular RBAC mapped' });
    } else {
      results.push({ component: 'Permission Engine', status: 'FAIL', detail: 'Role permissions misaligned' });
    }
  } catch (e: any) {
    results.push({ component: 'Permission Engine', status: 'FAIL', detail: e.message });
  }

  // 5. WhatsApp Provider Configuration
  const waToken = process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_TOKEN || process.env.META_WA_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID;
  if (waToken && waPhoneId) {
    results.push({ component: 'WhatsApp Provider (Meta Cloud API)', status: 'PASS', detail: `Phone ID: ${waPhoneId}` });
  } else {
    results.push({ component: 'WhatsApp Provider (Meta Cloud API)', status: 'WARN', detail: 'Using development mock/simulator' });
  }

  // 6. Webhook Verification Secret
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (verifyToken) {
    results.push({ component: 'Webhook Security', status: 'PASS', detail: 'Verify token configured' });
  } else {
    results.push({ component: 'Webhook Security', status: 'WARN', detail: 'WHATSAPP_VERIFY_TOKEN not set' });
  }

  // 7. Structured Logger & Correlation Engine
  const testCid = whatsAppLogger.generateCorrelationId();
  if (testCid.startsWith('WA-')) {
    results.push({ component: 'Correlation & Audit Engine', status: 'PASS', detail: `Sample: ${testCid}` });
  } else {
    results.push({ component: 'Correlation & Audit Engine', status: 'FAIL', detail: 'Invalid correlation format' });
  }

  // Print results table
  console.log('════════════════════════════════════════════════════════════════════');
  console.log(' COMPONENT                        STATUS     DETAILS');
  console.log('════════════════════════════════════════════════════════════════════');
  let hasFailures = false;
  for (const r of results) {
    const symbol = r.status === 'PASS' ? '✓ PASS' : r.status === 'WARN' ? '⚠ WARN' : '✗ FAIL';
    console.log(` ${r.component.padEnd(32)} ${symbol.padEnd(10)} ${r.detail || ''}`);
    if (r.status === 'FAIL') hasFailures = true;
  }
  console.log('════════════════════════════════════════════════════════════════════');

  if (hasFailures) {
    console.log('\n❌ RESULT: UNHEALTHY — Correct identified issues before production deployment.\n');
    process.exit(1);
  } else {
    console.log('\n✅ RESULT: HEALTHY — All essential identity components verified.\n');
    process.exit(0);
  }
}

runHealthCheck().catch((err) => {
  console.error('Health check encountered fatal error:', err);
  process.exit(1);
});
