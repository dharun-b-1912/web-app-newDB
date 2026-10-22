const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('Testing Tab Switch Debug...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[BROWSER_ERROR]', msg.text());
  });
  page.on('pageerror', err => console.error('[BROWSER_UNCAUGHT]', err.message, err.stack));

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

  await page.goto('http://localhost:3000/biometric');
  const manageBtn = await page.waitForSelector('[data-testid="device-manage-btn"], [id^="device-row-manage-btn"]');
  await manageBtn.click();
  await page.waitForSelector('#workspace-tab-overview');
  console.log('1. On overview');

  console.log('2. Cycling through all 7 tabs...');
  const tabIds = ['overview', 'users', 'attendance', 'commands', 'health', 'sync_history', 'diagnostics'];
  
  for (const tabId of tabIds) {
    const tabInfo = await page.evaluate((id) => {
      const btn = document.getElementById(`workspace-tab-${id}`);
      if (!btn) return { id, error: 'BUTTON NOT FOUND' };
      const label = btn.textContent?.trim();
      btn.click();
      return { id, label, ok: true };
    }, tabId);

    console.log(`\n--- Tab [${tabId}]: ${tabInfo.label} ---`);
    await page.waitForTimeout(600);

    const check = await page.evaluate((id) => {
      const tableRows = document.querySelectorAll('tbody tr').length;
      const cards = document.querySelectorAll('.rounded-2xl').length;
      return { tableRows, cards };
    }, tabId);

    console.log(`  ✓ State: Table rows=${check.tableRows}, Cards/Panels=${check.cards}`);
  }

  await page.screenshot({ path: 'tab_all_verified.png' });
  console.log('\n✓ Screenshot saved to tab_all_verified.png');
  await browser.close();
  console.log('Done testing all 7 tabs.');
})();
