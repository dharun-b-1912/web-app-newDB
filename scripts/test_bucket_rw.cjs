const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL\s*=\s*([^\r\n]+)/)[1].trim().replace(/['"]/g, '');
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

async function main() {
  const testObj = { hello: 'lms', timestamp: Date.now() };
  const uploadRes = await fetch(`${url}/storage/v1/object/lms-content/test.json`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json',
      'x-upsert': 'true'
    },
    body: JSON.stringify(testObj)
  });
  console.log('Upload status:', uploadRes.status);

  // Read public url
  const readRes = await fetch(`${url}/storage/v1/object/public/lms-content/test.json`);
  console.log('Read status:', readRes.status);
  const json = await readRes.json();
  console.log('Read content:', json);
}

main().catch(console.error);
