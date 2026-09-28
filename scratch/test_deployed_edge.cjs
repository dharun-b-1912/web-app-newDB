async function testEdgePush() {
  const url = 'https://ysiajemrqakfngasehhi.supabase.co/functions/v1/send-push';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQxMDksImV4cCI6MjEwMzk5MDEwOX0.0tegrR61DZ91R3hFZbp-RPPR3KG8a1cYbilLU5klUTc';

  const payload = {
    topic: 'all_employees',
    title: '🔔 Joy PeopleHR Edge Test',
    body: 'Edge function send-push is now live and working!',
    route: 'home',
    data: {
      type: 'test_announcement'
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`
    },
    body: JSON.stringify(payload)
  });

  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

testEdgePush();
