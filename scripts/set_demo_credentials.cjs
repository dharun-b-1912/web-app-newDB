require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setDemoCredentials() {
  const demoAccounts = [
    { email: 'demo.hr@joypeoplehr.com', password: 'DemoPassword@2026' },
    { email: 'demo.companyhead@joypeoplehr.com', password: 'DemoPassword@2026' },
    { email: 'demo.employee@joypeoplehr.com', password: 'DemoPassword@2026' },
  ];

  for (const acc of demoAccounts) {
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === acc.email);
    if (user) {
      const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
        password: acc.password,
        email_confirm: true,
      });
      console.log(`Updated ${acc.email}:`, error ? error.message : 'SUCCESS');
    }
  }
}

setDemoCredentials();

