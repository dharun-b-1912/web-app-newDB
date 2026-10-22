const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Warning')) {
      console.log(`[BROWSER_${msg.type().toUpperCase()}]`, msg.text());
    }
  });

  page.on('pageerror', err => {
    console.error('[PAGE_ERROR]', err.message);
  });

  const hrHeadUser = {
    id: '0c621892-e938-4707-9957-13534ea32c19',
    auth_user_id: '0c621892-e938-4707-9957-13534ea32c19',
    email: 'marimuthu@joycorporatesolutions.com',
    full_name: 'Mari Muthu',
    name: 'Mari Muthu',
    role: 'HR Head',
    role_display_name: 'HR Head (Company)',
    organization_id: '0c621892-e938-4707-9957-13534ea32c19',
    tenant_id: '0c621892-e938-4707-9957-13534ea32c19',
    status: 'Active',
    account_status: 'ACTIVE',
    must_change_password: false,
    roles: [{ id: 'role-hr-head', name: 'HR Head', code: 'HR_HEAD' }],
    authContext: {
      userId: '0c621892-e938-4707-9957-13534ea32c19',
      authUserId: '0c621892-e938-4707-9957-13534ea32c19',
      identity: { email: 'marimuthu@joycorporatesolutions.com', fullName: 'Mari Muthu' },
      accountStatus: 'ACTIVE',
      tenant: { organizationId: '0c621892-e938-4707-9957-13534ea32c19', organizationName: 'Joy Corporate Solutions' },
      company: { companyId: 'comp-001', companyName: 'Joy Corporate Solutions Pvt Ltd' },
      roles: ['HR_HEAD'],
      primaryRole: 'HR Head',
      scopes: { platform: false, organization: true, company: true, employee: true, vendor: false },
      portalType: 'ORGANIZATION_ADMIN',
      allowedPortals: ['ORGANIZATION_ADMIN', 'EMPLOYEE_HR'],
      defaultPortal: 'ORGANIZATION_ADMIN',
      defaultRoute: 'biometric',
      permissions: ['*']
    }
  };

  await page.addInitScript((user) => {
    localStorage.setItem('joy_user', JSON.stringify(user));
    localStorage.setItem('workforce_current_user', JSON.stringify(user));
    sessionStorage.setItem('workforce_current_user', JSON.stringify(user));
    localStorage.setItem('workforce_active_org_id', user.organization_id);
    localStorage.setItem('workforce_auth_context', 'tenant');
    localStorage.setItem('workforce_active_route', 'biometric');
  }, hrHeadUser);

  console.log('Navigating to http://localhost:3000/biometric ...');
  await page.goto('http://localhost:3000/biometric', { waitUntil: 'load', timeout: 15000 });
  await page.waitForSelector('#joy-main-scroll-container', { timeout: 10000 });
  console.log('Page loaded. Waiting 15 seconds to let background tasks run...');
  await page.waitForTimeout(15000);

  console.log('Now testing scrolling down and up 10 times...');
  const scrollContainer = await page.$('#joy-main-scroll-container') || page;
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => {
      const el = document.getElementById('joy-main-scroll-container') || window;
      if (el.scrollTo) {
        el.scrollTo(0, 1000);
      }
    });
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      const el = document.getElementById('joy-main-scroll-container') || window;
      if (el.scrollTo) {
        el.scrollTo(0, 0);
      }
    });
    await page.waitForTimeout(100);
  }
  console.log('Scrolling complete. Now checking responsiveness of buttons...');

  // Test click on Diagnostics
  const diagBtn = await page.$('button:has-text("Diagnostics")');
  if (diagBtn) {
    const t0 = Date.now();
    await diagBtn.click();
    console.log(`Clicked Diagnostics in ${Date.now() - t0}ms`);
    await page.waitForTimeout(500);
    // Close HUD
    const hudClose = await page.$('button[aria-label="Close"], button:has-text("Close")');
    if (hudClose) await hudClose.click();
    else await page.keyboard.press('Escape');
  }

  // Test click on Sync Now
  const syncBtn = await page.$('button:has-text("Sync Now")');
  if (syncBtn) {
    const t0 = Date.now();
    await syncBtn.click();
    console.log(`Clicked Sync Now in ${Date.now() - t0}ms`);
    await page.waitForTimeout(500);
  }

  console.log('Success! Test finished.');
  await browser.close();
})();
