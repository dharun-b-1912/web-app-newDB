const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ysiajemrqakfngasehhi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function upsertWebVersion() {
  const { data: existing } = await supabase.from('app_versions').select('*').eq('platform', 'web').maybeSingle();
  console.log('Existing web row:', existing);

  if (!existing) {
    const { data, error } = await supabase.from('app_versions').insert({
      platform: 'web',
      latest_version: '1.1.10',
      latest_build_number: 31,
      min_required_version: '1.1.10',
      min_required_build_number: 31,
      release_notes: '• Dedicated mobile web app performance improvements\n• CameraX biometric verification\n• Fast GPS check-in',
      play_store_url: 'https://mobile.joypeoplehr.com',
      is_force_update: false,
      is_active: true
    }).select();
    console.log('Inserted web version row:', data, error);
  } else {
    const { data, error } = await supabase.from('app_versions').update({
      latest_version: '1.1.10',
      latest_build_number: 31,
      min_required_version: '1.1.10',
      min_required_build_number: 31,
      play_store_url: 'https://mobile.joypeoplehr.com',
      is_active: true
    }).eq('id', existing.id).select();
    console.log('Updated web version row:', data, error);
  }
}

upsertWebVersion().catch(console.error);

