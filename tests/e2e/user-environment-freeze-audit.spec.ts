import { test, expect } from '@playwright/test';

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
  roles: [
    { id: 'role-hr-head', name: 'HR Head', code: 'HR_HEAD' },
  ],
  authContext: {
    userId: '0c621892-e938-4707-9957-13534ea32c19',
    authUserId: '0c621892-e938-4707-9957-13534ea32c19',
    identity: {
      email: 'marimuthu@joycorporatesolutions.com',
      fullName: 'Mari Muthu'
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
    roles: ['HR_HEAD'],
    primaryRole: 'HR Head',
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

test.describe('Real-world viewport and interaction audit for /biometric', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((user) => {
      localStorage.setItem('joy_user', JSON.stringify(user));
      localStorage.setItem('workforce_current_user', JSON.stringify(user));
      sessionStorage.setItem('workforce_current_user', JSON.stringify(user));
      localStorage.setItem('workforce_active_org_id', user.organization_id);
      localStorage.setItem('workforce_auth_context', 'tenant');
      localStorage.setItem('workforce_active_route', 'biometric');
    }, hrHeadUser);
  });

  test('Diagnose scroll lock, click lag, and invisible overlays at 1366x650 viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 650 });

    const errors: string[] = [];
    const consoleLogs: string[] = [];

    page.on('pageerror', (err) => {
      console.error('[PageError]:', err.message);
      errors.push(err.message);
    });

    page.on('console', (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    console.log('Navigating to http://localhost:3000/biometric ...');
    await page.goto('http://localhost:3000/biometric', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Measure responsiveness
    const diagnostics = await page.evaluate(() => {
      const mainScroll = document.getElementById('joy-main-scroll-container');
      const body = document.body;

      // Check all elements covering the viewport
      const elementsAtPoints = [
        { x: 300, y: 100, el: document.elementFromPoint(300, 100)?.outerHTML?.slice(0, 120) },
        { x: 500, y: 300, el: document.elementFromPoint(500, 300)?.outerHTML?.slice(0, 120) },
        { x: 700, y: 550, el: document.elementFromPoint(700, 550)?.outerHTML?.slice(0, 120) },
        { x: 1200, y: 300, el: document.elementFromPoint(1200, 300)?.outerHTML?.slice(0, 120) },
      ];

      // Check fixed/absolute z-index overlays
      const allFixed = Array.from(document.querySelectorAll('*')).filter((el) => {
        const style = window.getComputedStyle(el);
        return (
          (style.position === 'fixed' || style.position === 'absolute') &&
          parseInt(style.zIndex || '0', 10) >= 10 &&
          el.clientWidth > 300 &&
          el.clientHeight > 300
        );
      }).map(el => ({
        tag: el.tagName,
        id: el.id,
        className: el.className,
        zIndex: window.getComputedStyle(el).zIndex,
        pointerEvents: window.getComputedStyle(el).pointerEvents,
        display: window.getComputedStyle(el).display,
        visibility: window.getComputedStyle(el).visibility,
        opacity: window.getComputedStyle(el).opacity,
      }));

      return {
        mainScroll: mainScroll ? {
          scrollHeight: mainScroll.scrollHeight,
          clientHeight: mainScroll.clientHeight,
          scrollTop: mainScroll.scrollTop,
          overflowY: window.getComputedStyle(mainScroll).overflowY,
          pointerEvents: window.getComputedStyle(mainScroll).pointerEvents,
        } : null,
        elementsAtPoints,
        allFixed,
      };
    });

    console.log('DIAGNOSTICS:', JSON.stringify(diagnostics, null, 2));

    // Test mouse wheel scroll down at (700, 300)
    console.log('Attempting mouse wheel at (700, 300)...');
    await page.mouse.move(700, 300);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(600);

    const afterWheel1 = await page.evaluate(() => {
      const el = document.getElementById('joy-main-scroll-container');
      return el ? el.scrollTop : 0;
    });
    console.log('ScrollTop after mouse wheel on (700, 300):', afterWheel1);

    // Test mouse wheel scroll down when cursor is over the live attendance stream card (700, 580)
    console.log('Attempting mouse wheel at (700, 580) (over Live Attendance Stream card)...');
    await page.mouse.move(700, 580);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(600);

    const afterWheel2 = await page.evaluate(() => {
      const el = document.getElementById('joy-main-scroll-container');
      return el ? el.scrollTop : 0;
    });
    console.log('ScrollTop after mouse wheel on (700, 580):', afterWheel2);

    // Capture screenshot of state after scroll
    await page.screenshot({ path: 'scratch/user-viewport-test-scrolled.png' });
    console.log('Saved screenshot scratch/user-viewport-test-scrolled.png');

    // Test clicking buttons
    const t0 = Date.now();
    const pauseBtn = page.locator('#pause-live-feed-btn');
    if (await pauseBtn.count() > 0) {
      await pauseBtn.click({ timeout: 5000 });
      console.log('Clicked Pause Feed in', Date.now() - t0, 'ms');
    }
  });
});
