import { test, expect } from '@playwright/test';

test.describe('P0 Incident Verification: Global Loading & Route Resilience Suite', () => {

  test('1. Fresh application load captures full [BOOT] lifecycle sequence without blank screen', async ({ page }) => {
    const bootLogs: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[BOOT]')) {
        bootLogs.push(text);
      }
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const rootHtml = await page.locator('#root').innerHTML();
    expect(rootHtml.trim().length).toBeGreaterThan(0);

    console.log('Boot logs captured:', bootLogs);
    // Verify key bootstrap stages were reached
    expect(bootLogs.some(log => log.includes('[BOOT] start'))).toBeTruthy();
    expect(bootLogs.some(log => log.includes('[BOOT] root_mounted'))).toBeTruthy();
    expect(bootLogs.some(log => log.includes('[BOOT] auth_started'))).toBeTruthy();
    expect(bootLogs.some(log => log.includes('[BOOT] auth_resolved'))).toBeTruthy();
  });

  test('2. Authenticated user directly on /biometric renders AppShell and Biometric view', async ({ page }) => {
    const bootLogs: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[BOOT]')) {
        bootLogs.push(text);
      }
    });

    await page.addInitScript(() => {
      const user = {
        id: '0c621892-e938-4707-9957-13534ea32c19',
        auth_user_id: '0c621892-e938-4707-9957-13534ea32c19',
        email: 'mari.muthu@joycorporatesolutions.com',
        name: 'Mari Muthu',
        role: 'HR Head',
        organization_id: '0c621892-e938-4707-9957-13534ea32c19',
        status: 'Active',
        roles: [{ id: 'role-hr-head', name: 'HR Head' }],
      };
      localStorage.setItem('workforce_current_user', JSON.stringify(user));
      localStorage.setItem('workforce_active_route', 'biometric');
    });

    await page.goto('http://localhost:3000/biometric', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);

    const rootHtml = await page.locator('#root').innerHTML();
    expect(rootHtml.trim().length).toBeGreaterThan(1000);

    console.log('Authenticated Boot logs:', bootLogs);
    expect(bootLogs.some(log => log.includes('[BOOT] router_ready'))).toBeTruthy();
    expect(bootLogs.some(log => log.includes('[BOOT] route_mounted'))).toBeTruthy();

    // Verify biometric content is visible
    const textContent = await page.locator('#root').innerText();
    expect(textContent.toLowerCase()).toContain('biometric');
  });

  test('3. Seamless navigation across multiple routes (/biometric -> /attendance -> /leave -> /payroll)', async ({ page }) => {
    await page.addInitScript(() => {
      const user = {
        id: '0c621892-e938-4707-9957-13534ea32c19',
        auth_user_id: '0c621892-e938-4707-9957-13534ea32c19',
        email: 'mari.muthu@joycorporatesolutions.com',
        name: 'Mari Muthu',
        role: 'HR Head',
        organization_id: '0c621892-e938-4707-9957-13534ea32c19',
        status: 'Active',
        roles: [{ id: 'role-hr-head', name: 'HR Head' }],
      };
      localStorage.setItem('workforce_current_user', JSON.stringify(user));
    });

    const routesToTest = ['biometric', 'attendance', 'leave', 'payroll', 'dashboard'];
    for (const route of routesToTest) {
      await page.goto(`http://localhost:3000/${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1500);

      const rootHtml = await page.locator('#root').innerHTML();
      expect(rootHtml.trim().length).toBeGreaterThan(500);
      console.log(`Route /${route} rendered successfully with length ${rootHtml.length}`);
    }
  });

  test('4. Floto widget failure or isolation does not prevent SaaS rendering', async ({ page }) => {
    // Intercept and abort external/floto scripts to simulate third-party CDN down
    await page.route('**/*floto*', route => route.abort());

    await page.goto('http://localhost:3000/biometric', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    const rootHtml = await page.locator('#root').innerHTML();
    expect(rootHtml.trim().length).toBeGreaterThan(0);
    console.log('App renders even if Floto widget fails or is blocked');
  });

  test('5. Biometric gateway offline simulation renders cloud dashboard gracefully', async ({ page }) => {
    // Mock local biometric gateway port 4301 and 8080 as failing/offline
    await page.route('**/localhost:4301/**', route => route.abort());
    await page.route('**/localhost:8080/**', route => route.abort());

    await page.addInitScript(() => {
      const user = {
        id: '0c621892-e938-4707-9957-13534ea32c19',
        auth_user_id: '0c621892-e938-4707-9957-13534ea32c19',
        email: 'mari.muthu@joycorporatesolutions.com',
        name: 'Mari Muthu',
        role: 'HR Head',
        organization_id: '0c621892-e938-4707-9957-13534ea32c19',
        status: 'Active',
        roles: [{ id: 'role-hr-head', name: 'HR Head' }],
      };
      localStorage.setItem('workforce_current_user', JSON.stringify(user));
      localStorage.setItem('workforce_active_route', 'biometric');
    });

    await page.goto('http://localhost:3000/biometric', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2500);

    const rootHtml = await page.locator('#root').innerHTML();
    expect(rootHtml.trim().length).toBeGreaterThan(1000);

    const bodyText = await page.locator('#root').innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });
});
