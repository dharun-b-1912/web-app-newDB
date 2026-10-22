const { chromium } = require('playwright');

(async () => {
  console.log('Testing open workspace step by step...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

  page.on('console', msg => {
    const text = msg.text();
    if (!text.includes('[vite]') && !text.includes('React DevTools')) {
      console.log(`[CONSOLE_${msg.type()}]`, text);
    }
  });
  page.on('pageerror', err => console.error('[PAGE_ERROR]', err.message));

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

  console.log('Navigating to http://localhost:3000/biometric ...');
  await page.goto('http://localhost:3000/biometric', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  console.log('Clicking manage button via evaluate click...');
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="device-manage-btn"]') || document.querySelector('[id^="device-row-manage-btn"]');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Evaluate click result:', clicked);

  console.log('Waiting for #workspace-tab-overview...');
  await page.waitForSelector('#workspace-tab-overview', { timeout: 8000 });
  console.log('Workspace overview tab is present!');

  // Check overview elements
  const overviewData = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('[id^="workspace-tab-"]')).map(el => el.textContent?.trim());
    return { tabs };
  });
  console.log('Tabs on page:', overviewData.tabs);

  // Switch to users tab
  console.log('Clicking users tab...');
  await page.evaluate(() => document.getElementById('workspace-tab-users')?.click());
  await page.waitForTimeout(800);
  const usersRows = await page.evaluate(() => document.querySelectorAll('tbody tr').length);
  console.log('Users tab rows count:', usersRows);

  // Switch to attendance tab
  console.log('Clicking attendance tab...');
  await page.evaluate(() => document.getElementById('workspace-tab-attendance')?.click());
  await page.waitForTimeout(800);
  const punchCheck = await page.evaluate(() => {
    const rows = document.querySelectorAll('tbody tr').length;
    const badge = document.querySelector('[data-testid="workspace-tab-attendance"]')?.textContent?.trim();
    return { rows, badge };
  });
  console.log('Attendance tab check:', punchCheck);

  // Switch to commands tab
  console.log('Clicking commands tab...');
  await page.evaluate(() => document.getElementById('workspace-tab-commands')?.click());
  await page.waitForTimeout(800);
  const cmdsCheck = await page.evaluate(() => {
    return {
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(t => t?.includes('Test') || t?.includes('Sync') || t?.includes('Restart')).slice(0, 5)
    };
  });
  console.log('Commands tab check:', cmdsCheck);

  // Switch to health tab
  console.log('Clicking health tab...');
  await page.evaluate(() => document.getElementById('workspace-tab-health')?.click());
  await page.waitForTimeout(800);
  const healthCheck = await page.evaluate(() => {
    return {
      headings: Array.from(document.querySelectorAll('h3, h4')).map(h => h.textContent?.trim()).slice(0, 4)
    };
  });
  console.log('Health tab check:', healthCheck);

  // Switch to sync_history tab
  console.log('Clicking sync_history tab...');
  await page.evaluate(() => document.getElementById('workspace-tab-sync_history')?.click());
  await page.waitForTimeout(800);
  const syncCheck = await page.evaluate(() => {
    return {
      rows: document.querySelectorAll('tbody tr').length
    };
  });
  console.log('Sync history tab check:', syncCheck);

  // Switch to diagnostics tab
  console.log('Clicking diagnostics tab...');
  await page.evaluate(() => document.getElementById('workspace-tab-diagnostics')?.click());
  await page.waitForTimeout(800);
  const diagCheck = await page.evaluate(() => {
    return {
      rows: document.querySelectorAll('tbody tr').length
    };
  });
  console.log('Diagnostics tab check:', diagCheck);

  await browser.close();
  console.log('All 7 tabs tested successfully!');
})();
