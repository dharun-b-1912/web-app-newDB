import fs from 'fs';
import path from 'path';

const FLUTTER_LIB = path.resolve('flutter_app/lib');
const CANONICAL_TABLES = new Set([
  'approval_actions', 'approval_instances', 'approval_workflows', 'asset_assignments', 'assets',
  'attendance_daily', 'attendance_punches', 'attendance_regularizations', 'attendance_exceptions',
  'attendance_calculation_policies', 'attendance_location_events', 'attendance_long_absences',
  'audit_logs', 'background_jobs', 'bank_payment_batches', 'bank_utr_records',
  'biometric_devices', 'biometric_device_users', 'biometric_raw_punches', 'branches', 'companies',
  'company_announcements', 'company_announcement_reads', 'communications', 'communication_recipients',
  'daily_wage_payroll_entries', 'departments', 'designations', 'digital_letters',
  'document_categories', 'document_folders', 'document_master', 'document_requirements',
  'document_type_master', 'document_types', 'document_versions',
  'employee_addresses', 'employee_avatar_assets', 'employee_bank_details', 'employee_device_tokens',
  'employee_documents', 'employee_documents_master', 'employee_emergency_contacts',
  'employee_id_rules', 'employee_lifecycle_events', 'employee_onboarding', 'employee_profiles',
  'employee_requests', 'employee_salary_assignments', 'employee_separations',
  'employee_service_configs', 'employee_shift_assignments', 'employee_statutory_details',
  'employee_work_location_assignments', 'employees', 'expense_claims',
  'holidays', 'job_applicants', 'job_openings', 'leave_balances', 'leave_ledger_entries',
  'leave_requests', 'leave_types', 'lms_courses', 'lms_enrollments', 'manpower_requisitions',
  'notification_events', 'notification_templates_master', 'organizations', 'organization_policies',
  'overtime_policies', 'overtime_requests', 'payroll_line_items', 'payroll_runs', 'payslips',
  'performance_cycles', 'performance_goals', 'performance_reviews', 'performance_review_cycles',
  'permissions', 'platform_plans', 'platform_users', 'posh_and_grievance_cases',
  'realtime_outbox', 'role_permissions', 'roles', 'saas_subscriptions', 'salary_components',
  'salary_structure_components', 'salary_structures', 'service_definitions', 'service_requests',
  'shift_rosters', 'shift_rotation_assignments', 'shift_rotation_patterns', 'shifts',
  'storage_nodes', 'storage_pools', 'user_profiles', 'user_roles', 'vendor_5way_reconciliations',
  'vendor_commercial_agreements', 'vendor_compliance_scores', 'vendor_invoices',
  'vendor_portal_document_requests', 'vendor_portal_licenses', 'vendor_portal_organizations',
  'vendor_workers', 'vendors', 'webhook_deliveries', 'webhook_endpoints', 'work_locations',
  'workforce_employment_relationships', 'workforce_identity_aliases'
]);

const OLD_SUPABASE_PROJECT = 'wmqjmyzzamgxyeuotbki';
const CANONICAL_PROJECT = 'ysiajemrqakfngasehhi';

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.dart') || file.endsWith('.yaml') || file.endsWith('.json')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function auditFlutterApp() {
  console.log('====================================================');
  console.log('JOY PeopleHR — FLUTTER SUPABASE BINDINGS AUDIT');
  console.log('Target: flutter_app/lib');
  console.log('====================================================\n');

  const allFiles = getAllFiles(path.resolve('flutter_app'));
  console.log(`Discovered ${allFiles.length} files in flutter_app\n`);

  const results = {
    screens: [],
    models: [],
    repositories: [],
    services: [],
    supabaseFromCalls: [],
    tableUsage: {},
    oldSupabaseRefs: [],
    hardcodedData: [],
    localStorageUsage: [],
    realtimeChannels: [],
    enumMappings: [],
  };

  for (const filePath of allFiles) {
    const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // 1. Check old Supabase references
    if (content.includes(OLD_SUPABASE_PROJECT)) {
      lines.forEach((l, idx) => {
        if (l.includes(OLD_SUPABASE_PROJECT)) {
          results.oldSupabaseRefs.push({ file: relPath, line: idx + 1, content: l.trim() });
        }
      });
    }

    // 2. Classify file type
    if (relPath.includes('features/') && (relPath.endsWith('_screen.dart') || relPath.endsWith('_view.dart') || relPath.endsWith('_page.dart'))) {
      results.screens.push({ file: relPath });
    } else if (relPath.includes('models/')) {
      results.models.push({ file: relPath });
    } else if (relPath.includes('repositories/')) {
      results.repositories.push({ file: relPath });
    } else if (relPath.includes('services/')) {
      results.services.push({ file: relPath });
    }

    // 3. Check Supabase .from('...') calls
    const fromRegex = /\.from\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match;
    while ((match = fromRegex.exec(content)) !== null) {
      const table = match[1];
      const isCanonical = CANONICAL_TABLES.has(table);
      const lineNum = content.slice(0, match.index).split('\n').length;
      results.supabaseFromCalls.push({
        file: relPath,
        line: lineNum,
        table,
        isCanonical,
      });

      if (!results.tableUsage[table]) {
        results.tableUsage[table] = { isCanonical, count: 0, files: new Set() };
      }
      results.tableUsage[table].count++;
      results.tableUsage[table].files.add(relPath);
    }

    // 4. Local storage checks
    if (content.includes('SharedPreferences') || content.includes('shared_preferences')) {
      lines.forEach((l, idx) => {
        if (l.includes('SharedPreferences') || l.includes('shared_preferences')) {
          results.localStorageUsage.push({ file: relPath, line: idx + 1, type: 'SharedPreferences', snippet: l.trim() });
        }
      });
    }

    // 5. Hardcoded test data / fake names / test UUIDs
    const hardcodedPatterns = [
      /EMP001/i, /SMOKE001/i, /fake@example\.com/i, /dummy@example\.com/i,
      /John Doe/i, /Jane Doe/i, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    ];
    lines.forEach((l, idx) => {
      for (const p of hardcodedPatterns) {
        if (p.test(l) && !l.includes('SupabaseConfig') && !l.includes('test_') && !l.includes('.git') && !l.includes('// Example') && !l.includes('///')) {
          results.hardcodedData.push({ file: relPath, line: idx + 1, match: l.trim() });
          break;
        }
      }
    });

    // 6. Realtime channels
    if (content.includes('.channel(') || content.includes('postgres_changes') || content.includes('onPostgresChanges')) {
      lines.forEach((l, idx) => {
        if (l.includes('.channel(') || l.includes('postgres_changes') || l.includes('onPostgresChanges')) {
          results.realtimeChannels.push({ file: relPath, line: idx + 1, snippet: l.trim() });
        }
      });
    }
  }

  console.log('--- Summary Findings ---');
  console.log(`Screens Discovered: ${results.screens.length}`);
  console.log(`Models Discovered: ${results.models.length}`);
  console.log(`Repositories Discovered: ${results.repositories.length}`);
  console.log(`Services Discovered: ${results.services.length}`);
  console.log(`Total .from() calls: ${results.supabaseFromCalls.length}`);
  console.log(`Old Supabase Project References: ${results.oldSupabaseRefs.length}`);
  console.log(`Local Storage Occurrences: ${results.localStorageUsage.length}`);
  console.log(`Realtime Channel Usages: ${results.realtimeChannels.length}`);

  console.log('\n--- Table Usage Breakdown ---');
  for (const [table, data] of Object.entries(results.tableUsage)) {
    console.log(`- ${table}: ${data.count} calls across ${data.files.size} files [${data.isCanonical ? 'CANONICAL' : 'NON-CANONICAL / LEGACY'}]`);
  }

  if (results.oldSupabaseRefs.length > 0) {
    console.log('\n--- BLOCKER: Old Supabase References ---');
    results.oldSupabaseRefs.forEach(r => console.log(`  [${r.file}:${r.line}] ${r.content}`));
  }

  // Save report to scratch/flutter_audit_result.json
  fs.writeFileSync('scratch/flutter_audit_result.json', JSON.stringify({
    ...results,
    tableUsage: Object.fromEntries(
      Object.entries(results.tableUsage).map(([k, v]) => [k, { ...v, files: Array.from(v.files) }])
    )
  }, null, 2));

  console.log('\nDetailed JSON result saved to scratch/flutter_audit_result.json');
}

auditFlutterApp().catch(console.error);
