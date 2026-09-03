// scripts/forensic_auditor.ts
// ============================================================================
// Joy PeopleHR — Phase 11 Database Forensic Audit Engine
// Parses all migrations 001-093 and scans src/ for table usage & tenant keys.
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';

export interface TableAuditInfo {
  tableName: string;
  sourceMigration: string;
  primaryKey: string;
  hasOrgId: boolean;
  hasTenantId: boolean;
  hasCompanyId: boolean;
  timestampColumns: string[];
  rlsEnabled: boolean;
  policies: Array<{ name: string; command: string; using?: string; withCheck?: string; source: string }>;
  foreignKeys: Array<{ column: string; targetTable: string; targetColumn: string }>;
  indexes: string[];
  triggers: string[];
  repoUsages: Array<{ file: string; line: number }>;
  classification: 'CANONICAL' | 'ACTIVE' | 'COMPATIBILITY' | 'LEGACY' | 'ORPHAN_CANDIDATE' | 'UNKNOWN';
}

export function runForensicAudit() {
  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
  const srcDir = path.resolve(process.cwd(), 'src');

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`[FORENSIC ENGINE] Found ${migrationFiles.length} migration files in supabase/migrations.`);

  const tables = new Map<string, TableAuditInfo>();

  // 1. Parse migrations
  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    // CREATE TABLE [IF NOT EXISTS] [public.]<tableName> (
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi;
    let match: RegExpExecArray | null;

    while ((match = createTableRegex.exec(sql)) !== null) {
      const tableName = match[1].toLowerCase();
      const body = match[2];

      if (!tables.has(tableName)) {
        // Detect PK
        let pk = 'id';
        const pkMatch = body.match(/(?:id\s+([a-zA-Z0-9_]+)\s+PRIMARY\s+KEY|PRIMARY\s+KEY\s*\(([^)]+)\))/i);
        if (pkMatch) {
          pk = pkMatch[2] ? pkMatch[2].trim() : (pkMatch[1] ? `id (${pkMatch[1]})` : 'id');
        }

        const hasOrgId = /\borganization_id\b/i.test(body);
        const hasTenantId = /\btenant_id\b/i.test(body);
        const hasCompanyId = /\bcompany_id\b/i.test(body);

        const timestampColumns: string[] = [];
        if (/\bcreated_at\b/i.test(body)) timestampColumns.push('created_at');
        if (/\bupdated_at\b/i.test(body)) timestampColumns.push('updated_at');
        if (/\bcreatedAt\b/i.test(body)) timestampColumns.push('createdAt');
        if (/\bupdatedAt\b/i.test(body)) timestampColumns.push('updatedAt');

        // Foreign keys in body
        const fks: Array<{ column: string; targetTable: string; targetColumn: string }> = [];
        const fkInlineRegex = /([a-zA-Z0-9_]+)\s+[a-zA-Z0-9_]+\s+REFERENCES\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\(([a-zA-Z0-9_]+)\)/gi;
        let fkMatch: RegExpExecArray | null;
        while ((fkMatch = fkInlineRegex.exec(body)) !== null) {
          fks.push({ column: fkMatch[1], targetTable: fkMatch[2], targetColumn: fkMatch[3] });
        }
        const fkConstraintRegex = /FOREIGN\s+KEY\s*\(([a-zA-Z0-9_]+)\)\s+REFERENCES\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\(([a-zA-Z0-9_]+)\)/gi;
        while ((fkMatch = fkConstraintRegex.exec(body)) !== null) {
          fks.push({ column: fkMatch[1], targetTable: fkMatch[2], targetColumn: fkMatch[3] });
        }

        tables.set(tableName, {
          tableName,
          sourceMigration: file,
          primaryKey: pk,
          hasOrgId,
          hasTenantId,
          hasCompanyId,
          timestampColumns,
          rlsEnabled: false,
          policies: [],
          foreignKeys: fks,
          indexes: [],
          triggers: [],
          repoUsages: [],
          classification: 'UNKNOWN',
        });
      }
    }

    // ALTER TABLE [public.]<tableName> ENABLE ROW LEVEL SECURITY;
    const rlsRegex = /ALTER\s+TABLE\s+(?:ONLY\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
    let rlsMatch: RegExpExecArray | null;
    while ((rlsMatch = rlsRegex.exec(sql)) !== null) {
      const t = rlsMatch[1].toLowerCase();
      if (tables.has(t)) {
        tables.get(t)!.rlsEnabled = true;
      }
    }

    // ALTER TABLE [public.]<tableName> ADD COLUMN [IF NOT EXISTS] organization_id / tenant_id
    const addColRegex = /ALTER\s+TABLE\s+(?:ONLY\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/gi;
    let addColMatch: RegExpExecArray | null;
    while ((addColMatch = addColRegex.exec(sql)) !== null) {
      const t = addColMatch[1].toLowerCase();
      const col = addColMatch[2].toLowerCase();
      if (tables.has(t)) {
        if (col === 'organization_id') tables.get(t)!.hasOrgId = true;
        if (col === 'tenant_id') tables.get(t)!.hasTenantId = true;
        if (col === 'company_id') tables.get(t)!.hasCompanyId = true;
      }
    }

    // DROP POLICY [IF EXISTS] <polName> ON [public.]<tableName>
    const dropPolicyRegex = /DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?["']?([^"'\s]+)["']?\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)/gi;
    let dropPolMatch: RegExpExecArray | null;
    while ((dropPolMatch = dropPolicyRegex.exec(sql)) !== null) {
      const polName = dropPolMatch[1];
      const t = dropPolMatch[2].toLowerCase();
      if (tables.has(t)) {
        tables.get(t)!.policies = tables.get(t)!.policies.filter(p => p.name.toLowerCase() !== polName.toLowerCase());
      }
    }

    // CREATE POLICY <name> ON [public.]<tableName> FOR <command> USING (...) WITH CHECK (...)
    const policyRegex = /CREATE\s+POLICY\s+["']?([^"'\s]+)["']?\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)(?:[\s\S]*?FOR\s+([A-Z]+))?[\s\S]*?(?:USING\s*\(([\s\S]*?)\))?(?:[\s\S]*?WITH\s+CHECK\s*\(([\s\S]*?)\))?;/gi;
    let polMatch: RegExpExecArray | null;
    while ((polMatch = policyRegex.exec(sql)) !== null) {
      const polName = polMatch[1];
      const t = polMatch[2].toLowerCase();
      const cmd = polMatch[3] || 'ALL';
      const usingExpr = polMatch[4]?.trim();
      const withCheckExpr = polMatch[5]?.trim();
      if (tables.has(t)) {
        tables.get(t)!.policies.push({
          name: polName,
          command: cmd,
          using: usingExpr,
          withCheck: withCheckExpr,
          source: file,
        });
      }
    }

    // CREATE [UNIQUE] INDEX ... ON [public.]<tableName>
    const indexRegex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)/gi;
    let idxMatch: RegExpExecArray | null;
    while ((idxMatch = indexRegex.exec(sql)) !== null) {
      const idxName = idxMatch[1];
      const t = idxMatch[2].toLowerCase();
      if (tables.has(t)) {
        tables.get(t)!.indexes.push(idxName);
      }
    }

    // CREATE TRIGGER ... ON [public.]<tableName>
    const trigRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+([a-zA-Z0-9_]+)[\s\S]*?ON\s+(?:public\.)?([a-zA-Z0-9_]+)/gi;
    let trgMatch: RegExpExecArray | null;
    while ((trgMatch = trigRegex.exec(sql)) !== null) {
      const trgName = trgMatch[1];
      const t = trgMatch[2].toLowerCase();
      if (tables.has(t)) {
        tables.get(t)!.triggers.push(trgName);
      }
    }
  }

  console.log(`[FORENSIC ENGINE] Total distinct tables declared across migrations: ${tables.size}`);

  // 2. Scan src/ for usages: supabase.from('tableName') or from('tableName')
  function scanSrc(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        scanSrc(full);
      } else if (/\.(ts|tsx|js|jsx)$/.test(e.name)) {
        const content = fs.readFileSync(full, 'utf-8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          const fromMatches = line.matchAll(/\.from(?:<[^>]+>)?\(['"]([a-zA-Z0-9_]+)['"]\)/g);
          for (const m of fromMatches) {
            const t = m[1].toLowerCase();
            if (tables.has(t)) {
              tables.get(t)!.repoUsages.push({
                file: path.relative(process.cwd(), full),
                line: idx + 1,
              });
            }
          }
        });
      }
    }
  }
  scanSrc(srcDir);

  // 3. Classify tables
  for (const [_, info] of tables) {
    const usages = info.repoUsages.length;
    if (usages > 5) {
      info.classification = 'CANONICAL';
    } else if (usages > 0) {
      info.classification = 'ACTIVE';
    } else if (info.hasOrgId || info.hasTenantId) {
      // Defined in schema with tenant scoping, but maybe queried dynamically or platform internal
      info.classification = 'COMPATIBILITY';
    } else {
      info.classification = 'ORPHAN_CANDIDATE';
    }
  }

  return tables;
}

if (process.argv[1].endsWith('forensic_auditor.ts')) {
  const tables = runForensicAudit();
  const summary = {
    total: tables.size,
    canonical: Array.from(tables.values()).filter(t => t.classification === 'CANONICAL').length,
    active: Array.from(tables.values()).filter(t => t.classification === 'ACTIVE').length,
    compatibility: Array.from(tables.values()).filter(t => t.classification === 'COMPATIBILITY').length,
    orphanCandidates: Array.from(tables.values()).filter(t => t.classification === 'ORPHAN_CANDIDATE').length,
  };
  console.log('\n[FORENSIC SUMMARY]', JSON.stringify(summary, null, 2));
}
