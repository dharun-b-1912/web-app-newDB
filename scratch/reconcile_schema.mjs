import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

async function main() {
  const migrationsDir = 'd:/Joy Corporate Solutions/JOY PeopleHR/web-app/Joy PeopleHR new version/workforceos-enterprise-hrms/supabase/greenfield_migrations';
  const srcDir = 'd:/Joy Corporate Solutions/JOY PeopleHR/web-app/Joy PeopleHR new version/workforceos-enterprise-hrms/src';

  // 1. Extract all CREATE TABLE statements from migrations
  const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql') && f !== '000_FULL_GREENFIELD_DEPLOYMENT_SCRIPT.sql');
  const migrationTables = new Map(); // table_name -> [file_names]

  for (const file of migrationFiles) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const table = match[1].toLowerCase();
      if (!migrationTables.has(table)) {
        migrationTables.set(table, []);
      }
      migrationTables.get(table).push(file);
    }
  }

  // 2. Fetch deployed OpenAPI schema from Supabase PostgREST
  let deployedTables = new Set();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (res.ok) {
      const spec = await res.json();
      if (spec.definitions) {
        for (const def of Object.keys(spec.definitions)) {
          deployedTables.add(def.toLowerCase());
        }
      }
    } else {
      console.error('OpenAPI fetch failed with status:', res.status);
    }
  } catch (err) {
    console.error('Error fetching OpenAPI spec:', err);
  }

  // 3. Find all application supabase.from('...') or from("...") references
  function scanDir(dir, found = new Map()) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const fullPath = path.join(dir, e.name);
      if (e.isDirectory()) {
        scanDir(fullPath, found);
      } else if (/\.(ts|tsx|js|jsx)$/.test(e.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const regex = /\.from\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*\)/g;
        let m;
        while ((m = regex.exec(content)) !== null) {
          const tbl = m[1].toLowerCase();
          if (!found.has(tbl)) {
            found.set(tbl, new Set());
          }
          const relPath = path.relative(srcDir, fullPath).replace(/\\/g, '/');
          found.get(tbl).add(relPath);
        }
      }
    }
    return found;
  }

  const appReferences = scanDir(srcDir);

  // 4. Test all union of tables against Supabase REST API directly
  const allCandidateTables = new Set([
    ...migrationTables.keys(),
    ...deployedTables,
    ...appReferences.keys(),
  ]);

  const verifiedDbTables = new Map(); // table -> { exists: boolean, status: number, error?: string }

  for (const table of allCandidateTables) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=0`, {
        method: 'HEAD',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      if (res.status === 200 || res.status === 206 || res.status === 401 || res.status === 403) {
        // Table exists in PostgREST schema cache
        verifiedDbTables.set(table, { exists: true, status: res.status });
      } else if (res.status === 404) {
        verifiedDbTables.set(table, { exists: false, status: 404 });
      } else {
        verifiedDbTables.set(table, { exists: false, status: res.status });
      }
    } catch (e) {
      verifiedDbTables.set(table, { exists: false, status: -1, error: e.message });
    }
  }

  // 5. Output full analysis
  const results = {
    canonicalDbTableCount: Array.from(verifiedDbTables.entries()).filter(([k, v]) => v.exists).length,
    migrationTableCount: migrationTables.size,
    appReferencedTableCount: appReferences.size,
    tables: [],
  };

  const sortedAllTables = Array.from(allCandidateTables).sort();

  for (const table of sortedAllTables) {
    const inDb = verifiedDbTables.get(table)?.exists ?? false;
    const migFiles = migrationTables.get(table) || [];
    const appRefs = appReferences.has(table) ? Array.from(appReferences.get(table)) : [];

    let status = 'UNKNOWN';
    if (inDb && migFiles.length > 0 && appRefs.length > 0) {
      status = 'MATCH';
    } else if (inDb && migFiles.length > 0 && appRefs.length === 0) {
      status = 'MATCH (DB + MIGRATION, UNUSED IN APP)';
    } else if (inDb && migFiles.length === 0) {
      status = 'MISSING FROM MIGRATIONS';
    } else if (!inDb && migFiles.length > 0) {
      status = 'MISSING FROM DB';
    } else if (!inDb && appRefs.length > 0) {
      status = 'APPLICATION MISMATCH (NONEXISTENT TABLE)';
    }

    results.tables.push({
      table,
      inDb,
      dbStatus: verifiedDbTables.get(table)?.status,
      migrationSources: migFiles,
      appReferences: appRefs,
      status,
    });
  }

  fs.writeFileSync('d:/Joy Corporate Solutions/JOY PeopleHR/web-app/Joy PeopleHR new version/workforceos-enterprise-hrms/scratch/reconcile_result.json', JSON.stringify(results, null, 2));
  console.log('Analysis written to scratch/reconcile_result.json');
  console.log(`Actual Deployed Tables in DB: ${results.canonicalDbTableCount}`);
  console.log(`Migration Tables: ${results.migrationTableCount}`);
  console.log(`App Referenced Tables: ${results.appReferencedTableCount}`);
}

main().catch(console.error);
