const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://ysiajemrqakfngasehhi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc');
s.from('organizations').select('*').then(r => console.log('Anon select orgs count:', r.data?.length, 'error:', r.error));
