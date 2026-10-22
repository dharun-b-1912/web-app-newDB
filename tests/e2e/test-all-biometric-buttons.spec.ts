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

test.describe('Audit every button and interaction on /biometric', () => {
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

  test('Test click responsiveness of all buttons on biometric page', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 650 });

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log(`[CONSOLE ERR]: ${msg.text()}`);
    });

    console.log('Navigating to http://localhost:3000/biometric ...');
    await page.goto('http://localhost:3000/biometric', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 1. Click "Diagnostics"
    console.log('Testing "Diagnostics" button...');
    const diagBtn = page.getByRole('button', { name: 'Diagnostics', exact: true });
    let t0 = Date.now();
    await diagBtn.click();
    console.log(`Diagnostics click latency: ${Date.now() - t0}ms`);
    await page.waitForTimeout(500);
    // Close it
    const closeDiag = page.locator('#close-telemetry-hud-btn');
    if (await closeDiag.count() > 0) {
      await closeDiag.click();
      console.log('Closed Diagnostics modal');
    }

    // 2. Click "Icons Guide"
    console.log('Testing "Icons Guide" button...');
    const iconsBtn = page.getByRole('button', { name: 'Icons Guide', exact: true });
    t0 = Date.now();
    await iconsBtn.click();
    console.log(`Icons Guide click latency: ${Date.now() - t0}ms`);
    await page.waitForTimeout(500);
    const closeIcons = page.getByRole('button', { name: 'Got It, Close Guide' });
    if (await closeIcons.count() > 0) {
      await closeIcons.click();
      console.log('Closed Icons Guide');
    }

    // 3. Click "Install Connector"
    console.log('Testing "Install Connector" button...');
    const installBtn = page.getByRole('button', { name: 'Install Connector', exact: true }).first();
    t0 = Date.now();
    await installBtn.click();
    console.log(`Install Connector click latency: ${Date.now() - t0}ms`);
    await page.waitForTimeout(500);
    const doneBtn = page.getByRole('button', { name: 'Done', exact: true });
    if (await doneBtn.count() > 0) {
      await doneBtn.click();
      console.log('Closed Install Connector modal');
    }

    // 4. Click "+ Connect Device"
    console.log('Testing "+ Connect Device" button...');
    const connectBtn = page.locator('#top-connect-device-btn');
    t0 = Date.now();
    await connectBtn.click();
    console.log(`+ Connect Device click latency: ${Date.now() - t0}ms`);
    await page.waitForTimeout(500);
    // Close wizard
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    console.log('Closed Connect Device Wizard');

    // 5. Click "Resolve Mapping"
    console.log('Testing "Resolve Mapping" button...');
    const resolveBtn = page.getByRole('button', { name: 'Resolve Mapping', exact: true });
    if (await resolveBtn.count() > 0) {
      t0 = Date.now();
      await resolveBtn.click();
      console.log(`Resolve Mapping click latency: ${Date.now() - t0}ms`);
      await page.waitForTimeout(800);
      await page.screenshot({ path: 'scratch/resolve-mapping-modal.png' });
      // Close users modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);
      console.log('Closed Resolve Mapping modal');
    }

    // 6. Test scrolling down to Device fleet table and clicking "Manage"
    console.log('Scrolling down to Device fleet table...');
    const mainScroll = page.locator('#joy-main-scroll-container');
    await mainScroll.evaluate((el) => { el.scrollTop = 900; });
    await page.waitForTimeout(500);

    const manageBtn = page.locator('[data-testid="device-manage-btn"]').first();
    console.log('Is Manage button visible?', await manageBtn.isVisible());
    if (await manageBtn.isVisible()) {
      t0 = Date.now();
      await manageBtn.click();
      console.log(`Manage button click latency: ${Date.now() - t0}ms`);
      await page.waitForTimeout(500);

      // Verify workspace opened
      const backBtn = page.locator('#back-to-devices-list-btn');
      console.log('Is workspace Back button visible?', await backBtn.isVisible());
      await page.screenshot({ path: 'scratch/workspace-opened.png' });
    }

    console.log('Finished testing all buttons!');
  });
});
