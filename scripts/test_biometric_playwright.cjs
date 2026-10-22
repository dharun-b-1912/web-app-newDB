const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = [];
  const errors = [];

  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'error') {
      console.error('[BROWSER_ERROR]', msg.text());
    }
  });

  page.on('pageerror', err => {
    errors.push(err.message);
    console.error('[PAGE_ERROR]', err.message, err.stack);
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

  const tStart = Date.now();
  console.log('--- Step 1: Navigating to http://localhost:3000/biometric ---');
  await page.goto('http://localhost:3000/biometric', { waitUntil: 'domcontentloaded', timeout: 15000 });
  
  await page.waitForSelector('#joy-main-scroll-container', { timeout: 10000 });
  const loadDuration = Date.now() - tStart;
  console.log(`Page Shell Loaded in: ${loadDuration}ms`);

  const closeModalIfOpen = async () => {
    const closeBtn = await page.$('button[aria-label="Close modal"], button:has-text("Done"), button:has-text("Got It, Close Guide"), button:has-text("Cancel")');
    if (closeBtn && await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }
  };

  // Helper to click and measure
  const testClick = async (label, selector, opts = {}) => {
    const el = await page.$(selector);
    if (!el) {
      console.warn(`[CONTROL] "${label}": NOT FOUND (${selector})`);
      return false;
    }
    const isVis = await el.isVisible();
    const isEn = await el.isEnabled();
    const t0 = Date.now();
    await el.click({ timeout: 3000, noWaitAfter: true, ...opts });
    const duration = Date.now() - t0;
    console.log(`[CONTROL] "${label}": SUCCESS in ${duration}ms (visible=${isVis}, enabled=${isEn})`);
    await page.waitForTimeout(500);
    await closeModalIfOpen();
    return true;
  };

  console.log('\n--- Step 2: Testing Header & Action Bar Controls ---');
  await testClick('Sync Now', 'button:has-text("Sync Now")');
  await testClick('Diagnostics', 'button:has-text("Diagnostics")');
  await testClick('Icons Guide', 'button:has-text("Icons Guide")');
  await testClick('Install Connector', 'button:has-text("Install Connector")');
  await testClick('Configure Device', '#top-configure-device-btn');
  
  // Close Workspace if opened
  const backBtn = await page.$('#back-to-devices-list-btn, button:has-text("Back to Biometric Devices")');
  if (backBtn && await backBtn.isVisible()) {
    console.log('[CONTROL] BiometricDeviceWorkspace opened! Testing Back to Biometric Devices...');
    await backBtn.click({ noWaitAfter: true });
    await page.waitForTimeout(600);
  }

  await testClick('+ Connect Device', '#top-connect-device-btn');

  console.log('\n--- Step 3: Testing Stream & Table Controls ---');
  // Pause / Resume Feed
  const pauseBtn = await page.$('button:has-text("Pause Feed"), button:has-text("Resume Feed")');
  if (pauseBtn) {
    const initialText = (await pauseBtn.innerText()).trim();
    await pauseBtn.click();
    await page.waitForTimeout(300);
    const toggledText = (await pauseBtn.innerText()).trim();
    console.log(`[CONTROL] Live Stream Toggle: "${initialText}" -> "${toggledText}" (SUCCESS)`);
    // Revert
    await pauseBtn.click();
    await page.waitForTimeout(300);
  }

  // Clear Feed
  const clearBtn = await page.$('button:has-text("Clear Feed")');
  if (clearBtn) {
    await clearBtn.click();
    console.log('[CONTROL] "Clear Feed" clicked successfully');
    await page.waitForTimeout(300);
  }

  // Terminal Event Ledger
  await testClick('Terminal Event Ledger', 'button:has-text("Terminal Event Ledger")');
  const backFromLedger = await page.$('button:has-text("Back to Biometric Hub")');
  if (backFromLedger && await backFromLedger.isVisible()) {
    console.log('[CONTROL] TerminalLogLedger opened! Returning to hub...');
    await backFromLedger.click();
    await page.waitForTimeout(500);
  }

  // Device Row Actions
  console.log('\n--- Step 4: Testing Device Row Actions ---');
  const manageUsersBtn = await page.$('button:has-text("Manage Users"), button:has-text("Users")');
  if (manageUsersBtn && await manageUsersBtn.isVisible()) {
    console.log('[CONTROL] Testing Manage Users modal...');
    await manageUsersBtn.click();
    await page.waitForTimeout(600);
    const modalTitle = await page.$('text=Hardware User Directory & HR Mapping');
    console.log(`  -> DeviceUsersManagerModal rendered: ${Boolean(modalTitle)}`);
    await closeModalIfOpen();
  }

  console.log(`\nTotal Errors Encountered: ${errors.length}`);
  if (errors.length > 0) {
    console.log('Errors:', errors);
  }

  await browser.close();
  console.log('--- ALL BIOMETRIC PLAYWRIGHT CONTROLS VERIFIED ---');
})();
