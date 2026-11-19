require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncAppVersions() {
  const version = '1.1.18+40';
  const platforms = ['web', 'android', 'ios'];

  for (const platform of platforms) {
    const { data, error } = await supabase
      .from('app_versions')
      .upsert({
        platform,
        current_version: version,
        min_supported_version: '1.1.18+39',
        is_critical: false,
        release_notes: 'Resolved Quick Actions Regularize text wrapping on mobile web, added self-healing cache-invalidation, updated WhatsApp onboarding links.',
        updated_at: new Date().toISOString()
      }, { onConflict: 'platform' });

    console.log(`Platform ${platform} synced:`, error ? error : 'OK');
  }
}

syncAppVersions();

