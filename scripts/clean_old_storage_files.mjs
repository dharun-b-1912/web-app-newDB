import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wmqjmyzzamgxyeuotbki.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtcWpteXp6YW1neHlldW90YmtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ1NjAwNywiZXhwIjoyMDg4MDMyMDA3fQ.fU9xM5T-5xJ-W_N47_o-E81a0-N7mE-l92_yR48mR4E';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function cleanOldFiles() {
  const folder = 'employees/emp-admin-001/documents/doc-req-1787676092443-t30e';
  const { data: files, error } = await supabase.storage.from('employee-documents').list(folder);
  if (error) {
    console.error('List error:', error);
    return;
  }
  console.log('Found files in folder:', files.map(f => f.name));

  // Remove everything except the newest Resume.pdf
  const toDelete = files
    .filter(f => f.name.includes('dharun_driving_licence'))
    .map(f => `${folder}/${f.name}`);

  if (toDelete.length > 0) {
    console.log('Deleting older files:', toDelete);
    const { data: delRes, error: delErr } = await supabase.storage.from('employee-documents').remove(toDelete);
    console.log('Delete result:', delRes, delErr || 'OK');
  } else {
    console.log('No old files to delete.');
  }
}

cleanOldFiles();
