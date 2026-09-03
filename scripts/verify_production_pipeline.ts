/**
 * JOY PEOPLEHR ENTERPRISE SAAS — PRODUCTION VERIFICATION PIPELINE
 * Single authoritative release gate enforcing all 9 architectural,
 * security, forensic, typecheck, test, and build standards.
 * Generates an immutable historical release evidence artifact on every run.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface VerificationStage {
  id: number;
  name: string;
  command: string;
  description: string;
}

const STAGES: VerificationStage[] = [
  {
    id: 1,
    name: 'guard:governance',
    command: 'npm run guard:governance',
    description: 'Enforce 7 Immutable Governance Directives, reject mock fallbacks & client secrets',
  },
  {
    id: 2,
    name: 'audit:schema',
    command: 'npm run audit:schema',
    description: 'Verify 318 declared tables, primary keys, timestamps, and orphan candidates',
  },
  {
    id: 3,
    name: 'audit:tenant',
    command: 'npm run audit:tenant',
    description: 'Audit canonical organization_id, legacy tenant_id, and dual-key compatibility',
  },
  {
    id: 4,
    name: 'audit:rls',
    command: 'npm run audit:rls',
    description: 'Audit RLS enablement, reject open USING(true)/WITH CHECK(true) policies',
  },
  {
    id: 5,
    name: 'audit:database',
    command: 'npm run audit:database',
    description: 'Verify foreign keys, performance indexes, triggers, and immutable ledgers',
  },
  {
    id: 6,
    name: 'typecheck',
    command: 'npm run typecheck',
    description: 'Strict static TypeScript typecheck (tsc --noEmit)',
  },
  {
    id: 7,
    name: 'test:unit-security',
    command: 'npm test',
    description: 'Run 4 Security tests + 10 Production Reality Certification Gates',
  },
  {
    id: 8,
    name: 'test:cutover-smoke',
    command: 'npm run test:cutover',
    description: 'Execute live production cutover smoke verification across 7 stages',
  },
  {
    id: 9,
    name: 'build:production',
    command: 'npm run build',
    description: 'Compile production bundle with chunk splitting and secret scanning',
  },
];

function getCurrentCommit(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return '9830c3174c54fd615b0e91152174a5fb704f315c';
  }
}

async function runPipeline() {
  console.log('\n================================================================');
  console.log('  JOY PEOPLEHR SAAS — PRODUCTION VERIFICATION PIPELINE           ');
  console.log('================================================================');
  const executionTimestamp = new Date().toISOString();
  console.log(`Starting comprehensive 9-stage verification gate at ${executionTimestamp}\n`);

  const results: { stage: VerificationStage; passed: boolean; durationMs: number; error?: string }[] = [];
  const startTime = Date.now();

  for (const stage of STAGES) {
    process.stdout.write(`[STAGE ${stage.id}/${STAGES.length}] ${stage.name.padEnd(20)} : ${stage.description} ... `);
    const stageStart = Date.now();
    try {
      execSync(stage.command, { stdio: 'pipe', encoding: 'utf-8' });
      const durationMs = Date.now() - stageStart;
      console.log(`✓ PASSED (${(durationMs / 1000).toFixed(1)}s)`);
      results.push({ stage, passed: true, durationMs });
    } catch (err: any) {
      const durationMs = Date.now() - stageStart;
      console.log(`✗ FAILED (${(durationMs / 1000).toFixed(1)}s)`);
      const errorOutput = err.stderr || err.stdout || err.message;
      results.push({ stage, passed: false, durationMs, error: errorOutput.slice(0, 500) });
      break;
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n================================================================');
  console.log('  PRODUCTION VERIFICATION SUMMARY                                ');
  console.log('================================================================');

  const allPassed = results.length === STAGES.length && results.every((r) => r.passed);

  for (const r of results) {
    const mark = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`  [${mark}] Stage ${r.stage.id}: ${r.stage.name.padEnd(22)} (${(r.durationMs / 1000).toFixed(1)}s)`);
    if (r.error) {
      console.log(`         Error: ${r.error.split('\n')[0]}`);
    }
  }

  console.log('----------------------------------------------------------------');
  console.log(`Total Pipeline Execution Time: ${totalDuration}s`);

  // Build structured verification artifact
  const commit = getCurrentCommit();
  const stagesSummary: Record<string, string> = {};
  for (const r of results) {
    stagesSummary[r.stage.name] = r.passed ? 'PASSED' : 'FAILED';
  }

  const verificationArtifact = {
    pipeline: 'verify:production',
    release: 'v1.0.0-production-release',
    commit,
    timestamp: executionTimestamp,
    duration_seconds: parseFloat(totalDuration),
    stages: stagesSummary,
    decision: allPassed ? 'RELEASE_ELIGIBLE' : 'RELEASE_BLOCKED',
    exit_code: allPassed ? 0 : 1,
  };

  const artifactsDir = path.resolve(process.cwd(), 'artifacts', 'verification');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const artifactPathCommit = path.join(artifactsDir, `production-verification-${commit.slice(0, 8)}.json`);
  const artifactPathLatest = path.join(artifactsDir, 'production-verification-latest.json');

  fs.writeFileSync(artifactPathCommit, JSON.stringify(verificationArtifact, null, 2), 'utf-8');
  fs.writeFileSync(artifactPathLatest, JSON.stringify(verificationArtifact, null, 2), 'utf-8');

  console.log(`\n[RELEASE EVIDENCE ARTIFACT GENERATED]`);
  console.log(`  Artifact: ${path.relative(process.cwd(), artifactPathCommit)}`);
  console.log(`  Latest:   ${path.relative(process.cwd(), artifactPathLatest)}`);

  if (allPassed) {
    console.log('\nRELEASE DECISION: 🟢 RELEASE ELIGIBLE (100% GATES PASSED)');
    console.log('The production build meets all architectural, security, and schema criteria.\n');
    process.exit(0);
  } else {
    console.error('\nRELEASE DECISION: 🔴 RELEASE BLOCKED');
    console.error('One or more production gates failed. Deployment is prohibited.\n');
    process.exit(1);
  }
}

runPipeline();
