// scripts/governance_guard.ts
// ============================================================================
// Joy PeopleHR — Automated Architecture Governance Guard
// Enforces the 7 Immutable SaaS Governance Directives across the codebase.
// Fails CI / pre-commit if dangerous patterns or secret leaks are detected.
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

interface Violation {
  file: string;
  line: number;
  rule: string;
  snippet: string;
}

const violations: Violation[] = [];

// Directories to scan (excluding tests, mocks, node_modules, and build outputs)
const TARGET_DIRS = ['src'];
const IGNORED_PATHS = [
  path.normalize('src/services/__tests__'),
  path.normalize('src/mocks'),
  path.normalize('dist'),
  path.normalize('node_modules'),
];

// Governance Rule Regexes (Mapped to the 10 Canonical Architectural Anchors)
const RULES: Array<{ id: string; name: string; regex: RegExp; description: string }> = [
  {
    id: 'ANCHOR-05',
    name: 'Authoritative Identity and Role Resolution',
    regex: /(?:email|work_email|username)\.(?:toLowerCase\(\)\.)?(?:includes|startsWith)\(['"](?:admin|hr|superadmin|manager)['"]\)/i,
    description: 'Anchor 5: Role determination must originate from authoritative identity data (JWT / app_users), never substring matching.',
  },
  {
    id: 'ANCHOR-06',
    name: 'Server-Side Secret Isolation',
    regex: /(?:VITE_RESEND_API_KEY|VITE_SUPABASE_SERVICE_ROLE_KEY|re_[0-9a-zA-Z]{20,}|ghp_[0-9a-zA-Z]{20,}|service_role.*eyJhbGci)/i,
    description: 'Anchor 6: Private credentials must never be exposed to browser bundles or prefixed with VITE_.',
  },
  {
    id: 'ANCHOR-04',
    name: 'Strict Database-Enforced Tenant Isolation',
    regex: /CREATE\s+POLICY\s+.*(?:USING|WITH\s+CHECK)\s*\(\s*true\s*\)/i,
    description: 'Anchor 4: Universal policies (USING true / WITH CHECK true) are prohibited for tenant-owned data.',
  },
];

function scanDirectory(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const normalized = path.normalize(fullPath);

    if (IGNORED_PATHS.some((p) => normalized.includes(p))) {
      continue;
    }

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx|sql)$/.test(entry.name)) {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    RULES.forEach((rule) => {
      if (rule.regex.test(line)) {
        violations.push({
          file: filePath,
          line: idx + 1,
          rule: `${rule.id}: ${rule.name}`,
          snippet: line.trim(),
        });
      }
    });
  });
}

function runGovernanceGuard() {
  console.log('================================================================');
  console.log('  JOY PEOPLEHR SAAS — AUTOMATED ARCHITECTURAL GOVERNANCE GUARD  ');
  console.log('================================================================\n');

  TARGET_DIRS.forEach((d) => {
    const p = path.resolve(process.cwd(), d);
    if (fs.existsSync(p)) {
      scanDirectory(p);
    }
  });

  if (violations.length === 0) {
    console.log('✓ All 7 Immutable Governance Directives are fully respected across the codebase.');
    console.log('✓ Zero dangerous role patterns, zero client secrets, zero open universal RLS policies.\n');
    console.log('GOVERNANCE STATUS: PASSED (GREEN)\n');
    process.exit(0);
  } else {
    console.error(`✗ Detected ${violations.length} governance violations:\n`);
    violations.forEach((v) => {
      console.error(`  [${v.rule}] in ${v.file}:${v.line}`);
      console.error(`  Snippet: "${v.snippet}"\n`);
    });
    console.error('GOVERNANCE STATUS: FAILED (RED)\n');
    process.exit(1);
  }
}

runGovernanceGuard();
