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

async function testInsertPermission() {
  const { data, error } = await supabase.from('permissions').insert([
    {
      code: 'test.perm',
      module: 'test',
      action: 'view',
      description: 'Test permission'
    }
  ]).select();

  console.log('Insert test result:', { data, error });

  if (data && data[0]?.id) {
    // clean up
    await supabase.from('permissions').delete().eq('id', data[0].id);
  }
}

testInsertPermission();
