import { test, expect } from '@playwright/test';

test.describe('Joy PeopleHR — Core Enterprise Workflow Modules Certification', () => {
  test.describe.configure({ mode: 'serial' });

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

  test.beforeEach(async ({ page }) => {
    // Pre-inject authenticated user session into browser context
    await page.addInitScript((user) => {
      localStorage.setItem('joy_user', JSON.stringify(user));
      localStorage.setItem('workforce_current_user', JSON.stringify(user));
      localStorage.setItem('auth_context', JSON.stringify(user.authContext));
      localStorage.setItem('workforce_active_company', JSON.stringify({ id: 'comp-001', name: 'Joy Corporate Solutions Pvt Ltd' }));
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
  });

  test('Module 1: Documents & E-Sign (/documents)', async ({ page }) => {
    await page.goto('http://localhost:3000/documents');
    await page.waitForTimeout(1500);

    expect(page.url()).toContain('/documents');
    const heading = page.locator('button:has-text("Documents & E-Sign")').or(page.locator('text=Documents & E-Signature')).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('Module 2: Asset Management (/assets)', async ({ page }) => {
    await page.goto('http://localhost:3000/assets');
    await page.waitForTimeout(1500);

    expect(page.url()).toContain('/assets');
    const heading = page.locator('button:has-text("Company Asset Master")').or(page.locator('text=Hardware Assets')).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('Module 3: Onboarding Engine (/onboarding)', async ({ page }) => {
    await page.goto('http://localhost:3000/onboarding');
    await page.waitForTimeout(1500);

    expect(page.url()).toContain('/onboarding');
    const heading = page.locator('h1:has-text("Onboarding Engine")').or(page.locator('button:has-text("Initiate Onboarding")')).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('Module 4: Offboarding & Exit (/offboarding)', async ({ page }) => {
    await page.goto('http://localhost:3000/offboarding');
    await page.waitForTimeout(1500);

    expect(page.url()).toContain('/offboarding');
    const heading = page.locator('h1:has-text("Offboarding & Exit Operations")').or(page.locator('button:has-text("Initiate Separation")')).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('Module 5: Vendors & Workforce Hub (/vendors)', async ({ page }) => {
    await page.goto('http://localhost:3000/vendors');
    await page.waitForTimeout(1500);

    expect(page.url()).toContain('/vendors');
    const heading = page.locator('text=Vendors & Workforce Hub').or(page.locator('text=Active Vendors')).or(page.locator('text=Vendor Risk Radar')).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('Module 6: Contractor Attendance (/vendor/attendance)', async ({ page }) => {
    await page.goto('http://localhost:3000/vendor/attendance');
    await page.waitForTimeout(1500);

    expect(page.url()).toMatch(/vendors?\/attendance/);
    const heading = page.locator('text=Contractor Attendance Desk').or(page.locator('text=Contractor Attendance')).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('Module 7: 3-Way Match & Billing (/vendor/settlement)', async ({ page }) => {
    await page.goto('http://localhost:3000/vendor/settlement');
    await page.waitForTimeout(1500);

    expect(page.url()).toMatch(/vendors?\/(settlement|billing)/);
    const heading = page.locator('text=3-Way Match & Billing').or(page.locator('text=Reconciliation Desk')).or(page.locator('text=Contractor Billing')).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('Module 8: Sidebar Interactive Navigation Sequence across All 7 Modules', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(1500);

    // 1. Click Documents & E-Sign
    const docBtn = page.locator('button:has-text("Documents & E-Sign")').first();
    await docBtn.click();
    await page.waitForTimeout(800);
    expect(page.url()).toContain('/documents');

    // 2. Click Asset Management
    const assetBtn = page.locator('button:has-text("Asset Management")').first();
    await assetBtn.click();
    await page.waitForTimeout(800);
    expect(page.url()).toContain('/assets');

    // 3. Click Onboarding Engine
    const onbBtn = page.locator('button:has-text("Onboarding Engine")').first();
    await onbBtn.click();
    await page.waitForTimeout(800);
    expect(page.url()).toContain('/onboarding');

    // 4. Click Offboarding & Exit
    const offBtn = page.locator('button:has-text("Offboarding & Exit")').first();
    await offBtn.click();
    await page.waitForTimeout(800);
    expect(page.url()).toContain('/offboarding');

    // 5. Click Vendors & Workforce Hub
    const vendorBtn = page.locator('button:has-text("Vendors & Workforce Hub")').first();
    await vendorBtn.click();
    await page.waitForTimeout(800);
    expect(page.url()).toContain('/vendors');

    // 6. Click Contractor Attendance
    const attBtn = page.locator('button:has-text("Contractor Attendance")').first();
    await attBtn.click();
    await page.waitForTimeout(800);
    expect(page.url()).toMatch(/vendors?\/attendance/);

    // 7. Click 3-Way Match & Billing
    const billBtn = page.locator('button:has-text("3-Way Match & Billing")').first();
    await billBtn.click();
    await page.waitForTimeout(800);
    expect(page.url()).toMatch(/vendors?\/(settlement|billing)/);
  });
});
