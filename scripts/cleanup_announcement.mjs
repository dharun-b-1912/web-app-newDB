import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wmqjmyzzamgxyeuotbki.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtcWpteXp6YW1neHlldW90YmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NzU0NjcsImV4cCI6MjEwMjI1MTQ2N30.mRHhiRs7r7q9J3mphaRVyavL4_THkCAzdhD2dqgvnKA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('--- Fetching from company_announcements ---');
  const { data: annData, error: annErr } = await supabase.from('company_announcements').select('*');
  console.log('company_announcements count:', annData?.length, 'error:', annErr);
  if (annData) {
    console.log(JSON.stringify(annData, null, 2));
  }

  console.log('--- Fetching from communications ---');
  const { data: commData, error: commErr } = await supabase.from('communications').select('*');
  console.log('communications count:', commData?.length, 'error:', commErr);
  if (commData) {
    console.log(JSON.stringify(commData, null, 2));
  }

  console.log('--- Deleting Unified WorkForceOS announcements ---');
  const res1 = await supabase
    .from('company_announcements')
    .delete()
    .ilike('title', '%Unified WorkForceOS%');
  console.log('Delete from company_announcements by title result:', res1);

  const res2 = await supabase
    .from('communications')
    .delete()
    .ilike('title', '%Unified WorkForceOS%');
  console.log('Delete from communications by title result:', res2);

  // If there are other announcements user wants removed, let's also check notification_events
  const res3 = await supabase
    .from('notification_events')
    .delete()
    .ilike('title', '%Unified WorkForceOS%');
  console.log('Delete from notification_events by title result:', res3);
}

main().catch(console.error);
