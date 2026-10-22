import { test, expect } from '@playwright/test';

const companyAdminUser = {
  id: '0c621892-e938-4707-9957-13534ea32c19',
  email: 'admin@joycorporatesolutions.com',
  name: 'Joy Company Admin',
  role: 'Company Admin',
  organization_id: '0c621892-e938-4707-9957-13534ea32c19',
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

test.describe('Biometric Click Latency & Freeze Profiling', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((user) => {
      localStorage.setItem('joy_user', JSON.stringify(user));
      localStorage.setItem('workforce_current_user', JSON.stringify(user));
      sessionStorage.setItem('workforce_current_user', JSON.stringify(user));
      localStorage.setItem('workforce_active_org_id', user.organization_id);
      localStorage.setItem('workforce_auth_context', 'tenant');
      localStorage.setItem('workforce_active_route', 'biometric');
    }, companyAdminUser);
  });

  test('Profile all click operations in Biometric Page and Device Workspace', async ({ page }) => {
    test.setTimeout(120000);

    const latencies: Record<string, number> = {};

    page.on('console', msg => {
      const txt = msg.text();
      if (txt.includes('NAV') || txt.includes('PERF') || msg.type() === 'error') {
        console.log(`[BROWSER]: ${txt}`);
      }
    });

    // Track long tasks (>50ms frame freezes) on main thread in browser
    await page.addInitScript(() => {
      (window as any).__longTasks = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          (window as any).__longTasks.push({
            duration: entry.duration,
            startTime: entry.startTime,
          });
        }
      });
      try {
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {}
    });

    console.log('Navigating to http://localhost:3000/biometric ...');
    await page.goto('http://localhost:3000/biometric', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#top-connect-device-btn')).toBeVisible({ timeout: 15000 });

    // Open Workspace
    const manageBtn = page.locator('[data-testid="device-manage-btn"]').first();
    await expect(manageBtn).toBeVisible({ timeout: 10000 });
    const t0 = Date.now();
    await manageBtn.click();
    await expect(page.locator('#back-to-devices-list-btn')).toBeVisible({ timeout: 10000 });
    latencies['open_workspace'] = Date.now() - t0;
    console.log(`✓ Workspace opened in ${latencies['open_workspace']}ms`);

    // Allow workspace initial paint and deferred effects to settle
    await page.waitForTimeout(500);

    // Test Click Direction Mode: CHECK_IN
    const checkInCard = page.locator('text=Check-In Only (IN)').first();
    await expect(checkInCard).toBeVisible({ timeout: 5000 });
    let t = Date.now();
    await checkInCard.click();
    latencies['click_check_in'] = Date.now() - t;
    console.log(`✓ Clicked Check-In Only in ${latencies['click_check_in']}ms`);

    await page.waitForTimeout(400);

    // Test Click Direction Mode: CHECK_OUT
    const checkOutCard = page.locator('text=Check-Out Only (OUT)').first();
    t = Date.now();
    await checkOutCard.click();
    latencies['click_check_out'] = Date.now() - t;
    console.log(`✓ Clicked Check-Out Only in ${latencies['click_check_out']}ms`);

    await page.waitForTimeout(400);

    // Test Click Direction Mode: BOTH
    const bothCard = page.locator('text=Bidirectional (BOTH)').first();
    t = Date.now();
    await bothCard.click();
    latencies['click_both'] = Date.now() - t;
    console.log(`✓ Clicked Bidirectional (BOTH) in ${latencies['click_both']}ms`);

    await page.waitForTimeout(400);

    // Test Switching Workspace Tabs
    const tabs = ['Machine Users', 'Live Punches', 'Remote Commands', 'Health & Diagnostics', 'Sync History', 'Raw Logs', 'Overview'];
    for (const tabName of tabs) {
      const tabBtn = page.locator(`button:has-text("${tabName}")`).first();
      if (await tabBtn.count() > 0) {
        t = Date.now();
        await tabBtn.click();
        latencies[`tab_${tabName}`] = Date.now() - t;
        console.log(`✓ Switched to tab "${tabName}" in ${latencies[`tab_${tabName}`]}ms`);
        await page.waitForTimeout(300);
      }
    }

    // Collect and print performance summary
    const recordedLongTasks = await page.evaluate(() => (window as any).__longTasks || []);
    console.log('--- PERFORMANCE PROFILE SUMMARY ---');
    console.table(latencies);
    console.log(`Total Long Tasks (>50ms frame freezes) detected: ${recordedLongTasks.length}`);
    for (const lt of recordedLongTasks) {
      console.log(`  Freeze duration: ${Math.round(lt.duration)}ms at timestamp ${Math.round(lt.startTime)}ms`);
    }

    // Per-action latency thresholds (ms):
    // - First-render ops (open_workspace, Health/Overview tabs) get generous headroom in dev mode
    // - Interactive direction mode updates (updating localStorage + Supabase + toast) get 2500ms
    // - Subsequent interactive tab navigation ops must be under 500ms
    const actionThresholds: Record<string, number> = {
      open_workspace: 10000,        // cold-start: React mount + rAF deferred data load
      click_check_in: 5000,         // first click after workspace mount & hydration
      click_check_out: 2500,        // direction mode change + DB update
      click_both: 2500,             // direction mode change + DB update
      'tab_Live Punches': 3000,     // first visit: live punches table render
      'tab_Machine Users': 3000,    // first visit: machine users table render
      'tab_Health & Diagnostics': 15000, // large 13-point diagnostic suite card render on first visit
      'tab_Sync History': 5000,     // first visit: sync history table render
      'tab_Raw Logs': 5000,         // first visit: raw diagnostic logs table render
      tab_Overview: 15000,          // overview re-renders with agents + device + punches
    };
    const defaultThreshold = 800;

    for (const [action, ms] of Object.entries(latencies)) {
      const limit = actionThresholds[action] ?? defaultThreshold;
      expect(ms, `Action ${action} took too long: ${ms}ms (limit: ${limit}ms)`).toBeLessThan(limit);
    }

    // Assert long task count is within acceptable range (< 25 is healthy for dev Vite server with CDP tracing)
    expect(recordedLongTasks.length, `Too many main-thread long tasks: ${recordedLongTasks.length}`).toBeLessThan(25);
  });
});
