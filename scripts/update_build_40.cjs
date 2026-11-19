const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ysiajemrqakfngasehhi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateBuild40() {
  const platforms = ['web', 'android', 'ios'];
  for (const p of platforms) {
    const { data, error } = await supabase
      .from('app_versions')
      .update({
        latest_version: '1.1.18',
        latest_build_number: 40,
        updated_at: new Date().toISOString()
      })
      .eq('platform', p);

    console.log(`Updated ${p} to build 40:`, error ? error : 'SUCCESS');
  }
}

updateBuild40().catch(console.error);

