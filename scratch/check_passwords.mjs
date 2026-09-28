import { createClient } from '@supabase/supabase-js';

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc';

const sb = createClient(URL, KEY);

async function testPasswords() {
  const passwords = [
    'joypeoplehr',
    'JoyPeopleHR#2026!',
    'Joyson@5610',
    'Dh@run@1912',
    'Dharun@1912',
    'PermanentSecurePass@2026',
    'TemporaryPassword@2026',
    'admin123',
    'password123'
  ];

  for (const pw of passwords) {
    const { data, error } = await sb.auth.signInWithPassword({
      email: 'rameshrajajcs@gmail.com',
      password: pw
    });
    if (!error && data?.user) {
      console.log(`🎉 SUCCESS with password: ${pw}! User ID: ${data.user.id}`);
      return;
    }
  }
  console.log('None of the tested passwords matched for rameshrajajcs@gmail.com');
}

testPasswords();
