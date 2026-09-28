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

async function probePermissionsCols() {
  const candidateCols = [
    'id', 'key', 'code', 'name', 'permission_name', 'permission_code',
    'module', 'category', 'description', 'action', 'resource', 'created_at'
  ];
  const validCols = [];
  for (const col of candidateCols) {
    const { error } = await supabase.from('permissions').select(col).limit(1);
    if (!error) validCols.push(col);
  }
  console.log('Valid columns in permissions:', validCols);

  // Also probe roles table columns
  const roleCols = ['id', 'organization_id', 'code', 'name', 'role_name', 'description', 'is_system', 'created_at'];
  const validRoleCols = [];
  for (const col of roleCols) {
    const { error } = await supabase.from('roles').select(col).limit(1);
    if (!error) validRoleCols.push(col);
  }
  console.log('Valid columns in roles:', validRoleCols);

  // Also probe role_permissions table columns
  const rpCols = ['id', 'role_id', 'permission_id', 'created_at'];
  const validRpCols = [];
  for (const col of rpCols) {
    const { error } = await supabase.from('role_permissions').select(col).limit(1);
    if (!error) validRpCols.push(col);
  }
  console.log('Valid columns in role_permissions:', validRpCols);
}

probePermissionsCols();
