const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('Testing /biometric and tabs with detailed diagnostic...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

  page.on('console', msg => {
    console.log(`[BROWSER_${msg.type().toUpperCase()}]`, msg.text());
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
  await page.waitForTimeout(2000);

  const manageBtn = await page.$('[data-testid="device-manage-btn"], [id^="device-row-manage-btn"]');
  if (!manageBtn) {
    console.log('Manage button NOT found!');
    await browser.close();
    return;
  }

  console.log('Clicking manage button...');
  await manageBtn.click();
  await page.waitForTimeout(1000);

  // Take screenshot immediately after click
  await page.screenshot({ path: 'after_manage_click.png' });
  console.log('Saved after_manage_click.png');

  // Dump HTML body
  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('after_manage_click.html', bodyHtml);
  console.log('Saved after_manage_click.html (length:', bodyHtml.length, ')');

  // Check if overview button exists
  const ovBtn = await page.$('#workspace-tab-overview');
  console.log('Does #workspace-tab-overview exist?', !!ovBtn);

  if (ovBtn) {
    const isVis = await ovBtn.isVisible();
    console.log('Is #workspace-tab-overview visible?', isVis);
  }

  await browser.close();
})();
