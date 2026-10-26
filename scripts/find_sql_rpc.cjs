const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL\s*=\s*([^\r\n]+)/)[1].trim().replace(/['"]/g, '');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

async function main() {
  const res = await fetch(url + '/rest/v1/', {
    headers: { 'apikey': key }
  });
  const data = await res.json();
  const rpcPaths = Object.keys(data.paths).filter(p => p.startsWith('/rpc/'));
  console.log('RPC count:', rpcPaths.length);
  const sqlRpc = rpcPaths.filter(p => p.includes('sql') || p.includes('exec') || p.includes('query') || p.includes('migrate'));
  console.log('SQL/Exec RPCs:', sqlRpc);
}

main().catch(console.error);
