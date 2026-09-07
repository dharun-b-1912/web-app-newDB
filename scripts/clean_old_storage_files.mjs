import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
