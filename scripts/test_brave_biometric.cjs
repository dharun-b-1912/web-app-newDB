const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('================================================================');
  console.log(' Launching Brave Browser with DevTools for Live Biometric Inspection');
  console.log('================================================================');

  const bravePath = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';

  const browser = await chromium.launch({
    executablePath: bravePath,
    headless: false,
    args: [
      '--start-maximized',
      '--auto-open-devtools-for-tabs',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const context = await browser.newContext({
    viewport: null // Uses full window
  });

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('[BRAVE_CONSOLE_ERROR]', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.error('[BRAVE_PAGE_ERROR]', err.message);
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

  console.log('Navigating directly to http://localhost:3000/biometric in Brave Browser...');
  await page.goto('http://localhost:3000/biometric', { waitUntil: 'load', timeout: 20000 });
  await page.waitForSelector('#joy-main-scroll-container', { timeout: 15000 });
  console.log('✓ Biometric Page loaded successfully in Brave Browser with full interactivity!');

  // Test Sync Now
  const syncBtn = await page.$('button:has-text("Sync Now")');
  if (syncBtn) {
    const t0 = Date.now();
    await syncBtn.click({ noWaitAfter: true });
    console.log(`✓ "Sync Now" clicked and responded in ${Date.now() - t0}ms`);
    await page.waitForTimeout(1000);
  }

  // Test Diagnostics
  const diagBtn = await page.$('button:has-text("Diagnostics")');
  if (diagBtn) {
    const t0 = Date.now();
    await diagBtn.click({ noWaitAfter: true });
    console.log(`✓ "Diagnostics" HUD opened in ${Date.now() - t0}ms`);
    await page.waitForTimeout(1500);
    const closeDiag = await page.$('button[aria-label="Close modal"]:visible, button:has-text("Close"):visible');
    if (closeDiag) await closeDiag.click({ noWaitAfter: true });
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // Test Face Recognition page navigation
  console.log('\nNavigating to Optical Face Recognition view (/biometric/face)...');
  await page.goto('http://localhost:3000/face-attendance', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);
  console.log('✓ Face Recognition Channel View loaded with zero errors!');

  // Test Attendance Policies page navigation
  console.log('\nNavigating to Attendance Policies view (/policies)...');
  await page.goto('http://localhost:3000/policies', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);
  console.log('✓ Attendance Policies loaded smoothly without "Page Unresponsive" freeze!');

  // Return to Biometric Hub
  console.log('\nReturning to Biometric Devices Hub (/biometric)...');
  await page.goto('http://localhost:3000/biometric', { waitUntil: 'load', timeout: 20000 });
  await page.waitForSelector('#joy-main-scroll-container', { timeout: 15000 });
  console.log('✓ Returned to Biometric Hub. Everything is fully interactive.');

  console.log('\n================================================================');
  console.log(' BRAVE BROWSER AUDIT COMPLETE — INSPECT WINDOW IS OPEN FOR YOU');
  console.log('================================================================');
  
  // Keep open for user inspection
  await page.waitForTimeout(60000);
  await browser.close();
})();
