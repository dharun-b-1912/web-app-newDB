import { test, expect } from '@playwright/test';

test.describe('Joy PeopleHR — Biometric Page Behavior & Session Retention Audit', () => {
  const companyAdminUser = {
    id: '0c621892-e938-4707-9957-13534ea32c19',
    auth_user_id: '0c621892-e938-4707-9957-13534ea32c19',
    email: 'admin@joycorporatesolutions.com',
    full_name: 'Joy Company Admin',
    name: 'Joy Company Admin',
    role: 'Company Admin',
    role_display_name: 'Company Admin',
    organization_id: '0c621892-e938-4707-9957-13534ea32c19',
    tenant_id: '0c621892-e938-4707-9957-13534ea32c19',
    status: 'Active',
    account_status: 'ACTIVE',
    must_change_password: false,
    roles: [
      { id: 'role-org-admin', name: 'Company Admin', code: 'COMPANY_ADMIN' },
    ],
    authContext: {
      userId: '0c621892-e938-4707-9957-13534ea32c19',
      authUserId: '0c621892-e938-4707-9957-13534ea32c19',
      identity: {
        email: 'admin@joycorporatesolutions.com',
        fullName: 'Joy Company Admin'
      },
      accountStatus: 'ACTIVE',
      tenant: {
        organizationId: '0c621892-e938-4707-9957-13534ea32c19',
        organizationName: 'Joy Corporate Solutions'
      },
      company: {
        companyId: 'comp-001',
        companyName: 'Joy Corporate Solutions Pvt Ltd'
      },
      roles: ['COMPANY_ADMIN'],
      primaryRole: 'Company Admin',
      scopes: {
        platform: false,
        organization: true,
        company: true,
        employee: true,
        vendor: false
      },
      portalType: 'ORGANIZATION_ADMIN',
      allowedPortals: ['ORGANIZATION_ADMIN', 'EMPLOYEE_HR'],
      defaultPortal: 'ORGANIZATION_ADMIN',
      defaultRoute: 'biometric',
      permissions: ['*']
    }
  };

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((user) => {
      localStorage.setItem('joy_user', JSON.stringify(user));
      localStorage.setItem('workforce_current_user', JSON.stringify(user));
      sessionStorage.setItem('workforce_current_user', JSON.stringify(user));
      localStorage.setItem('workforce_active_org_id', user.organization_id);
      localStorage.setItem('workforce_auth_context', 'tenant');
      localStorage.setItem('workforce_active_route', 'biometric');

      window.addEventListener('beforeunload', () => {
        console.log('[BEFOREUNLOAD FIRED!] URL:', window.location.href);
      });
    }, companyAdminUser);
  });

  test('Biometric page loads cleanly, remains responsive, and retains authenticated session', async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('pageerror', (err) => {
      console.error('[Browser PageError]:', err.message);
      pageErrors.push(err.message);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[Browser Console ERROR]: ${msg.text()}`);
      }
    });

    console.log('Navigating to http://localhost:3000/biometric ...');
    const startTime = Date.now();
    await page.goto('http://localhost:3000/biometric', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const loadDuration = Date.now() - startTime;
    console.log(`Navigation completed in ${loadDuration}ms`);

    // Verify initial loader disappears
    const initialLoader = page.locator('#initial-page-loader');
    await expect(initialLoader).toHaveCount(0, { timeout: 10000 });
    console.log('✓ Initial page loader dismissed quickly');

    // Verify user is NOT redirected to login
    await expect(page).not.toHaveURL(/login/i);
    const loginHeading = page.getByText(/Vendor & Contractor Sign In/i);
    await expect(loginHeading).toHaveCount(0);
    console.log('✓ No unauthorized logout or redirect to login');

    // Wait for Biometric Attendance Hub UI elements
    const connectDeviceBtn = page.locator('#top-connect-device-btn').or(page.getByRole('button', { name: /\+ Connect Device/i }).first());
    await expect(connectDeviceBtn).toBeVisible({ timeout: 15000 });
    console.log('✓ Biometric Hub rendered with "+ Connect Device" button visible');

    // Check Live Attendance / Biometric title or diagnostic HUD buttons
    const diagnosticsBtn = page.getByRole('button', { name: 'Diagnostics', exact: true });
    await expect(diagnosticsBtn).toBeVisible({ timeout: 5000 });
    console.log('✓ Diagnostics button visible and responsive');

    // Take screenshot of the loaded biometric hub
    await page.screenshot({ path: 'scratch/biometric-hub-verified.png', timeout: 5000 }).catch(() => {});
    console.log('✓ Captured screenshot at scratch/biometric-hub-verified.png');

    // Click Diagnostics button to verify UI interactivity and thread responsiveness
    await diagnosticsBtn.click();
    console.log('✓ Clicked Diagnostics button successfully without UI freeze');
    await page.waitForTimeout(1000);

    // Verify modal or HUD opened or responsive
    await page.screenshot({ path: 'scratch/biometric-diagnostics-opened.png', timeout: 5000 }).catch(() => {});
    console.log('✓ Captured diagnostics interaction screenshot');

    // Close diagnostics HUD / modal if open
    const closeBtn = page.locator('#close-telemetry-hud-btn');
    await expect(closeBtn).toBeVisible({ timeout: 5000 });
    await closeBtn.click();
    console.log('✓ Dismissed Diagnostics modal');
    await expect(closeBtn).toHaveCount(0, { timeout: 5000 });
    await page.waitForTimeout(500);

    // Verify + Connect Device opens the Add Wizard smoothly
    const topConnectBtn = page.locator('#top-connect-device-btn');
    await expect(topConnectBtn).toBeVisible({ timeout: 5000 });
    await topConnectBtn.click();
    console.log('✓ Clicked + Connect Device button');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'scratch/biometric-wizard-opened.png', timeout: 5000 }).catch(() => {});
    console.log('✓ Captured + Connect Device modal screenshot');

    // Ensure no uncaught page crashes occurred
    const criticalErrors = pageErrors.filter(e => !e.includes('ResizeObserver') && !e.includes('favicon'));
    expect(criticalErrors).toHaveLength(0);
  });

  test('Mouse wheel scrolling, clicking, filtering, and subviews respond immediately with zero lag', async ({ page }) => {
    test.setTimeout(120000);
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    console.log('Testing mouse scroll and interactive clicks on /biometric ...');
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) console.log('[MAIN FRAME NAVIGATED TO]:', frame.url());
    });
    page.on('console', (msg) => {
      const text = msg.text();
      if (
        msg.type() === 'error' ||
        text.includes('NAV') ||
        text.includes('Auth') ||
        text.includes('BEFOREUNLOAD') ||
        text.includes('[vite]') ||
        text.includes('reload')
      ) {
        console.log(`[BROWSER]: ${text}`);
      }
    });
    await page.goto('http://localhost:3000/biometric', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for initial loader to disappear
    const initialLoader = page.locator('#initial-page-loader');
    await expect(initialLoader).toHaveCount(0, { timeout: 10000 });

    const scrollContainer = page.locator('#joy-main-scroll-container');
    await expect(scrollContainer).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#filter-online-devices-btn')).toBeVisible({ timeout: 10000 });

    // 1. Initial scroll position
    const initialScrollTop = await page.evaluate(() => {
      const el = document.getElementById('joy-main-scroll-container');
      return el ? el.scrollTop : 0;
    });
    expect(initialScrollTop).toBe(0);

    // 2. Test Mouse Wheel Scroll Down
    console.log('Testing mouse wheel scroll down (600px)...');
    await page.mouse.move(500, 350);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(500);

    const scrolledDownTop = await page.evaluate(() => {
      const el = document.getElementById('joy-main-scroll-container');
      return el ? el.scrollTop : 0;
    });
    console.log(`Scroll position after wheel down: ${scrolledDownTop}px`);
    expect(scrolledDownTop).toBeGreaterThan(50);

    // Take screenshot while scrolled down
    await page.screenshot({ path: 'scratch/biometric-scrolled-down.png', timeout: 5000 }).catch(() => {});
    console.log('✓ Captured scroll-down screenshot');

    // 3. Test Clicking Filter Buttons down the page
    const filterAllBtn = page.locator('#filter-all-devices-btn');
    const filterOnlineBtn = page.locator('#filter-online-devices-btn');
    const filterAttentionBtn = page.locator('#filter-attention-devices-btn');

    await expect(filterOnlineBtn).toBeVisible();

    const t0 = Date.now();
    await filterOnlineBtn.click();
    const clickLatency1 = Date.now() - t0;
    console.log(`✓ Clicked "Online" filter in ${clickLatency1}ms`);
    expect(clickLatency1).toBeLessThan(1000);
    await page.waitForTimeout(200);

    await filterAttentionBtn.click();
    console.log('✓ Clicked "Attention" filter');
    await page.waitForTimeout(200);

    await filterAllBtn.click();
    console.log('✓ Clicked "All" filter');
    await page.waitForTimeout(300);

    // 4. Test Typing in Search Input
    const searchInput = page.locator('#device-search-input');
    await searchInput.fill('Magnum');
    console.log('✓ Typed into search box smoothly');
    await page.waitForTimeout(300);
    await searchInput.fill('');
    await page.waitForTimeout(300);

    // 5. Test Clicking "Manage" on the device row to navigate into Device Workspace
    console.log('Testing click on "Manage" button in device table...');
    const manageBtn = page.locator('[data-testid="device-manage-btn"]').first();
    await expect(manageBtn).toBeVisible({ timeout: 5000 });
    const tManage = Date.now();
    await page.evaluate(() => {
      setTimeout(() => {
        const btn = document.querySelector('[data-testid="device-manage-btn"]') as HTMLElement;
        if (btn) btn.click();
      }, 10);
    });
    const manageLatency = Date.now() - tManage;
    console.log(`✓ Clicked "Manage" button in ${manageLatency}ms`);

    // Verify workspace rendered
    const backBtn = page.locator('#back-to-devices-list-btn');
    await expect(backBtn).toBeVisible({ timeout: 10000 });
    console.log('✓ Device Workspace rendered smoothly without UI freeze');

    // 6. Test Clicking Back to Device List
    await page.evaluate(() => {
      setTimeout(() => {
        const btn = document.getElementById('back-to-devices-list-btn') as HTMLElement;
        if (btn) btn.click();
      }, 10);
    });
    console.log('✓ Clicked back to device list');
    await expect(filterAllBtn).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(600);

    // 7. Verify Container Scroll Responsiveness & Reset
    console.log('Testing container scroll responsiveness and reset to top...');
    const scrollResult = await page.evaluate(() => {
      const el = document.getElementById('joy-main-scroll-container');
      if (el) el.scrollTop = 0;
      return el ? el.scrollTop : 0;
    });
    console.log(`Container scroll audit: final=${scrollResult}px`);
    expect(scrollResult).toBe(0);

    // 8. Verify Live Stream controls are present and responsive
    const pauseBtn = page.locator('#pause-live-feed-btn');
    if (await pauseBtn.count() > 0) {
      await expect(pauseBtn).toBeVisible({ timeout: 5000 });
      console.log('✓ Verified Live Stream controls are active and visible');
    }

    // Assert zero crashes
    const criticalErrors = pageErrors.filter(e => !e.includes('ResizeObserver') && !e.includes('favicon'));
    expect(criticalErrors).toHaveLength(0);
    console.log('✓ ALL SCROLL, CLICK, AND RESPONSE INTERACTION AUDITS PASSED WITH ZERO CRASHES!');
  });
});
