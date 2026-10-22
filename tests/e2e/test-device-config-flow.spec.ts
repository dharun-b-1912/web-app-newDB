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

test('Test opening device workspace and clicking configure functions', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });

  await page.addInitScript((user) => {
    localStorage.setItem('joy_user', JSON.stringify(user));
    localStorage.setItem('workforce_current_user', JSON.stringify(user));
    sessionStorage.setItem('workforce_current_user', JSON.stringify(user));
    localStorage.setItem('workforce_active_org_id', user.organization_id);
    localStorage.setItem('workforce_auth_context', 'tenant');
    localStorage.setItem('workforce_active_route', 'biometric');
  }, hrHeadUser);

  const errors: string[] = [];
  page.on('pageerror', err => {
    console.error('[PageError]:', err.message);
    errors.push(err.message);
  });

  console.log('Navigating to http://localhost:3000/biometric ...');
  await page.goto('http://localhost:3000/biometric', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Check if manage button exists
  const manageBtn = page.locator('[data-testid="device-manage-btn"]').first();
  const count = await manageBtn.count();
  console.log('Manage button count:', count);

  if (count > 0) {
    const layoutSectionMetrics = await page.evaluate(() => {
      const main = document.getElementById('joy-main-scroll-container');
      const children = Array.from(main?.firstElementChild?.children || []);
      return children.map((c, i) => {
        const rect = c.getBoundingClientRect();
        return {
          index: i,
          tag: c.tagName,
          className: c.className.slice(0, 40),
          textSnippet: c.textContent?.slice(0, 35)?.replace(/\s+/g, ' '),
          top: Math.round(rect.top),
          height: Math.round(rect.height),
          bottom: Math.round(rect.bottom),
        };
      });
    });
    console.log('PAGE SECTION METRICS:\n', JSON.stringify(layoutSectionMetrics, null, 2));

    // Test 1: Click the new Top Header "Configure Device" button
    const topConfigBtn = page.locator('#top-configure-device-btn');
    await expect(topConfigBtn).toBeVisible({ timeout: 3000 });
    const tTop0 = Date.now();
    await topConfigBtn.click();
    console.log('✓ Clicked Top Header "Configure Device" button in', Date.now() - tTop0, 'ms');

    const backBtn = page.locator('#back-to-devices-list-btn');
    await expect(backBtn).toBeVisible({ timeout: 3000 });
    console.log('✓ Workspace opened from Top Header button!');
    await backBtn.click();
    await page.waitForTimeout(200);

    // Test 2: Click the Connected Devices KPI Card
    const connectedDevicesCard = page.locator('text=Connected Devices').locator('..').locator('..');
    const tCard0 = Date.now();
    await connectedDevicesCard.click();
    console.log('✓ Clicked Connected Devices KPI card in', Date.now() - tCard0, 'ms');
    await expect(page.locator('#back-to-devices-list-btn')).toBeVisible({ timeout: 3000 });
    console.log('✓ Workspace opened from Connected Devices card!');
    await page.locator('#back-to-devices-list-btn').click();
    await page.waitForTimeout(200);

    // Test 3: Test scrolling down to Device Table
    console.log('Testing wheel scroll down on main container...');
    await page.mouse.move(700, 300);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(300);

    const scrollTop = await page.evaluate(() => {
      const el = document.getElementById('joy-main-scroll-container');
      return el ? el.scrollTop : 0;
    });
    console.log('ScrollTop after wheel:', scrollTop);

    // Test 4: Click Manage button on the device row
    const manageBtnRow = page.locator('[data-testid="device-manage-btn"]').first();
    const tManage0 = Date.now();
    await manageBtnRow.click();
    console.log('✓ Clicked Manage button on device row in', Date.now() - tManage0, 'ms');
    await expect(page.locator('#back-to-devices-list-btn')).toBeVisible({ timeout: 3000 });
    console.log('✓ Workspace opened from Manage button!');

    // Test tab switches inside workspace
    const tabs = ['Machine Users', 'Live Punches', 'Remote Commands', 'Health & Diagnostics'];
    for (const tab of tabs) {
      const tabEl = page.locator(`button:has-text("${tab}")`).first();
      if (await tabEl.count() > 0) {
        const tStart = Date.now();
        await tabEl.click();
        console.log(`✓ Switched to tab "${tab}" in ${Date.now() - tStart}ms`);
        await page.waitForTimeout(150);
      }
    }

    // Capture screenshot of workspace
    await page.screenshot({ path: 'scratch/device-workspace-open.png' });
    console.log('Saved scratch/device-workspace-open.png');
  } else {
    console.log('No manage button found!');
    await page.screenshot({ path: 'scratch/no-manage-btn.png' });
  }

  expect(errors).toEqual([]);
});
