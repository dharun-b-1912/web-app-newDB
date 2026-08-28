import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wmqjmyzzamgxyeuotbki.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtcWpteXp6YW1neHlldW90YmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MzY0MDgsImV4cCI6MjA4NjIxMjQwOH0.XU8d32p7s6Qe2Y223PzVq776c5rR_q60K2wA5j1kR80';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const candidateBuckets = [
  'workforce-avatars',
  'avatars',
  'profile-photos',
  'employee-avatars',
  'photos',
  'media',
  'documents',
  'public',
  'profile-media',
  'images',
  'attachments'
];

async function testUploads() {
  const dummyBuffer = Buffer.from('test');
  for (const b of candidateBuckets) {
    const { data, error } = await supabase.storage.from(b).upload('test.txt', dummyBuffer, { upsert: true });
    console.log(`Bucket [${b}]:`, error ? error.message : 'SUCCESS!');
  }
}

testUploads();
