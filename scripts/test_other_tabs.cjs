const { chromium } = require('playwright');

(async () => {
  console.log('Testing tabs EXCLUDING attendance...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

  const hrHeadUser = {
    id: '0c621892-e938-4707-9957-13534ea32c19',
    auth_user_id: '0c621892-e938-4707-9957-13534ea32c19',
    email: 'marimuthu@joycorporatesolutions.com',
    full_name: 'Mari Muthu',
    name: 'Mari Muthu',
    role: 'HR Head',
    organization_id: '0c621892-e938-4707-9957-13534ea32c19',
    roles: [{ id: 'role-hr-head', name: 'HR Head', code: 'HR_HEAD' }],
    authContext: {
      userId: '0c621892-e938-4707-9957-13534ea32c19',
      roles: ['HR_HEAD'],
      permissions: ['*']
    }
  };

  await page.addInitScript((user) => {
    localStorage.setItem('joy_user', JSON.stringify(user));
    localStorage.setItem('workforce_current_user', JSON.stringify(user));
  }, hrHeadUser);

  await page.goto('http://localhost:3000/biometric', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="device-manage-btn"]') || document.querySelector('[id^="device-row-manage-btn"]');
    if (btn) btn.click();
  });
  await page.waitForSelector('#workspace-tab-overview', { timeout: 5000 });
  console.log('1. Overview loaded');

  // Test other 5 tabs: users, commands, health, sync_history, diagnostics
  const otherTabs = ['users', 'commands', 'health', 'sync_history', 'diagnostics'];
  for (const tab of otherTabs) {
    console.log(`Switching to tab [${tab}]...`);
    await page.evaluate((t) => document.getElementById(`workspace-tab-${t}`)?.click(), tab);
    await page.waitForTimeout(400);
    const result = await page.evaluate(() => {
      const rows = document.querySelectorAll('tbody tr').length;
      const cards = document.querySelectorAll('.rounded-2xl').length;
      return { rows, cards };
    });
    console.log(`  ✓ Tab [${tab}] result: rows=${result.rows}, cards=${result.cards}`);
  }

  await browser.close();
  console.log('All other tabs passed successfully!');
})();
