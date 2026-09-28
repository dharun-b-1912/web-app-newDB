import { test, expect } from '@playwright/test';

test.describe('Company-Side Vendor Management Access for Company HR / Admin', () => {
  test.describe.configure({ mode: 'serial' });

  test('Company HR can access all 4 company-side vendor modules without Vendor Portal denial', async ({ page }) => {
    // 1. Setup local mock session or login as Company HR / Org Admin
    await page.goto('http://localhost:3000/login');

    const companyHrUser = {
      id: '4d9bde74-2746-4a8b-96b0-1382de32d3ce',
      email: 'marimuthu@joycorporatesolutions.com',
      full_name: 'Marimuthu HR Head',
      name: 'Marimuthu HR Head',
      role: 'HR_HEAD',
      role_display_name: 'HR Head',
      organization_id: 'org-test-enterprise-global-001',
      tenant_id: 'org-test-enterprise-global-001',
      status: 'Active',
      account_status: 'ACTIVE',
      roles: [
        { id: 'role-1', name: 'ORGANIZATION_ADMIN', code: 'ORGANIZATION_ADMIN' },
        { id: 'role-2', name: 'HR_HEAD', code: 'HR_HEAD' }
      ],
      authContext: {
        userId: '4d9bde74-2746-4a8b-96b0-1382de32d3ce',
        authUserId: '4d9bde74-2746-4a8b-96b0-1382de32d3ce',
        identity: {
          email: 'marimuthu@joycorporatesolutions.com',
          fullName: 'Marimuthu HR Head'
        },
        accountStatus: 'ACTIVE',
        tenant: {
          organizationId: 'org-test-enterprise-global-001',
          organizationName: 'Joy Corporate Solutions'
        },
        company: {
          companyId: 'comp-001',
          companyName: 'Joy Corporate Solutions Pvt Ltd'
        },
        roles: ['ORGANIZATION_ADMIN', 'HR_HEAD'],
        primaryRole: 'Organization Admin',
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
        defaultRoute: 'dashboard',
        permissions: ['*']
      }
    };

    // Inject session into browser context before page load
    await page.addInitScript((user) => {
      localStorage.setItem('joy_user', JSON.stringify(user));
      localStorage.setItem('workforce_current_user', JSON.stringify(user));
      localStorage.setItem('auth_context', JSON.stringify(user.authContext));
      localStorage.setItem('sb-ysiajemrqakfngasehhi-auth-token', JSON.stringify({
        access_token: 'fake-company-hr-token',
        user: {
          id: user.id,
          email: user.email,
          user_metadata: {
            role: 'HR_HEAD',
            full_name: 'Marimuthu HR Head'
          }
        }
      }));
    }, companyHrUser);

    page.on('console', (msg) => console.log(`[Browser Console ${msg.type()}]:`, msg.text()));
    page.on('pageerror', (err) => console.log('[Browser Page Error]:', err.message));

    // 2. Test Module 1: Vendors & Workforce Hub (/vendors)
    console.log('Testing Module 1: /vendors (Vendors & Workforce Hub)...');
    await page.goto('http://localhost:3000/vendors');
    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').innerText();
    console.log('PAGE BODY TEXT (first 300 chars):', bodyText.slice(0, 300));

    // Verify no "not authorized for the Vendor Portal" dialog
    await expect(page.locator('text=Your account is not authorized for the Vendor Portal')).not.toBeVisible();
    await expect(page.locator('text=Vendors & Workforce Hub').or(page.locator('text=Vendor Risk Radar')).or(page.locator('text=Active Vendors')).first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Vendors & Workforce Hub successfully loaded for Company HR!');

    // 3. Test Module 2: Contractor Attendance (/vendor/attendance)
    console.log('Testing Module 2: /vendor/attendance (Contractor Attendance)...');
    await page.goto('http://localhost:3000/vendor/attendance');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Your account is not authorized for the Vendor Portal')).not.toBeVisible();
    await expect(page.locator('text=Contractor Attendance Desk')).toBeVisible({ timeout: 5000 });
    console.log('✅ Contractor Attendance Desk successfully loaded for Company HR!');

    // 4. Test Module 3: 3-Way Match & Billing (/vendor/settlement)
    console.log('Testing Module 3: /vendor/settlement (3-Way Match & Billing)...');
    await page.goto('http://localhost:3000/vendor/settlement');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Your account is not authorized for the Vendor Portal')).not.toBeVisible();
    await expect(page.locator('text=3-Way Match & Commercial Billing Desk').or(page.locator('text=Commercial Governance')).first()).toBeVisible({ timeout: 5000 });
    console.log('✅ 3-Way Match & Billing Desk successfully loaded for Company HR!');

    // 5. Test Module 4: Compliance & Risk Audit (/vendor/dashboard or /vendor/compliance)
    console.log('Testing Module 4: /vendor/dashboard (Compliance & Risk Audit)...');
    await page.goto('http://localhost:3000/vendor/dashboard');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Your account is not authorized for the Vendor Portal')).not.toBeVisible();
    await expect(page.locator('text=Vendor Compliance & Statutory Risk Audit Desk')).toBeVisible({ timeout: 5000 });
    console.log('✅ Vendor Compliance & Statutory Risk Audit Desk successfully loaded for Company HR!');

    // 6. Test direct navigation to /vendor/compliance
    console.log('Testing Direct Route: /vendor/compliance...');
    await page.goto('http://localhost:3000/vendor/compliance');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Your account is not authorized for the Vendor Portal')).not.toBeVisible();
    await expect(page.locator('text=Vendor Compliance & Statutory Risk Audit Desk')).toBeVisible({ timeout: 5000 });
    console.log('✅ All Company-Side Vendor modules successfully accessed and verified!');
  });
});
