import { test, expect } from '@playwright/test';

test.describe('Joy PeopleHR — Master Sidebar Routing, Slugs & Sub-Nav Live Audit', () => {
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
      defaultRoute: 'dashboard',
      permissions: ['*']
    }
  };

  test.beforeEach(async ({ page }) => {
    // Inject authenticated HR Head session before navigation
    await page.addInitScript((user) => {
      localStorage.setItem('joy_user', JSON.stringify(user));
      localStorage.setItem('workforce_current_user', JSON.stringify(user));
      localStorage.setItem('workforce_active_company', JSON.stringify({ id: 'comp-001', name: 'Joy Corporate Solutions Pvt Ltd' }));
      localStorage.setItem('workforce_active_route', 'dashboard');
    }, companyHrUser);
  });

  test('Test 1: Direct URL Access & Refresh on /payroll/statutory', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // 1. Direct URL access
    await page.goto('http://localhost:3000/payroll/statutory');
    await page.waitForLoadState('networkidle');

    // 2. Validate URL is exact canonical slug
    expect(page.url()).toBe('http://localhost:3000/payroll/statutory');

    // 3. Verify page content
    const statutoryHeading = page.locator('text=Statutory & Tax Rules').first();
    await expect(statutoryHeading).toBeVisible({ timeout: 10000 });

    // 4. Verify sidebar active item
    const activeSidebarButton = page.locator('button:has-text("Statutory & Tax Rules")').first();
    await expect(activeSidebarButton).toBeVisible();
    await expect(activeSidebarButton).toHaveClass(/text-\[#07563D\]|bg-emerald-50/);

    // 5. Test page refresh
    await page.reload();
    await page.waitForLoadState('networkidle');

    expect(page.url()).toBe('http://localhost:3000/payroll/statutory');
    await expect(page.locator('text=Statutory & Tax Rules').first()).toBeVisible();

    // Ensure zero critical uncaught runtime exceptions
    const criticalErrors = consoleErrors.filter(err => !err.includes('favicon') && !err.includes('React Query'));
    expect(criticalErrors.length).toBe(0);
  });

  test('Test 2: Direct URL Access on /attendance & Sub-navigation to /attendance/employees', async ({ page }) => {
    // 1. Direct navigation to Attendance Dashboard
    await page.goto('http://localhost:3000/attendance');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toBe('http://localhost:3000/attendance');
    await expect(page.locator('text=ATTENDANCE MASTER MODULE').first()).toBeVisible();

    // 2. Click "Employee Attendance" in the sidebar
    const empAttButton = page.locator('button:has-text("Employee Attendance")').first();
    await empAttButton.click();
    await page.waitForTimeout(500);

    // 3. Validate URL changes to canonical slug
    expect(page.url()).toBe('http://localhost:3000/attendance/employees');

    // 4. Validate active state switched to Employee Attendance
    await expect(empAttButton).toHaveClass(/text-\[#07563D\]|bg-emerald-50/);
  });

  test('Test 3: Sidebar Traversal across Core Modules and Groups', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');

    // Test Employee Management
    const peopleBtn = page.locator('button:has-text("Employee Management")').first();
    await peopleBtn.click();
    await page.waitForTimeout(500);
    expect(page.url()).toBe('http://localhost:3000/people');

    // Test Organization Architecture
    const orgBtn = page.locator('button:has-text("Organization Architecture")').first();
    await orgBtn.click();
    await page.waitForTimeout(500);
    expect(page.url()).toBe('http://localhost:3000/organization');

    // Test Biometric Devices
    const bioBtn = page.locator('button:has-text("Biometric Devices")').first();
    await bioBtn.click();
    await page.waitForTimeout(500);
    expect(page.url()).toBe('http://localhost:3000/biometric');

    // Test Shift Master
    const shiftsBtn = page.locator('button:has-text("Shift Master")').first();
    await shiftsBtn.click();
    await page.waitForTimeout(500);
    expect(page.url()).toBe('http://localhost:3000/shifts');

    // Test Vendors & Workforce Hub
    const vendorBtn = page.locator('button:has-text("Vendors & Workforce Hub")').first();
    await vendorBtn.click();
    await page.waitForTimeout(500);
    expect(page.url()).toBe('http://localhost:3000/vendors');

    // Test 3-Way Match & Billing
    const billingBtn = page.locator('button:has-text("3-Way Match & Billing")').first();
    await billingBtn.click();
    await page.waitForTimeout(500);
    expect(page.url()).toBe('http://localhost:3000/vendors/billing');

    // Test Payroll Runs
    const runsBtn = page.locator('button:has-text("Payroll Processing & Runs")').first();
    await runsBtn.click();
    await page.waitForTimeout(500);
    expect(page.url()).toBe('http://localhost:3000/payroll/runs');

    // Test Bank Disbursement
    const disburseBtn = page.locator('button:has-text("Bank Disbursement")').first();
    await disburseBtn.click();
    await page.waitForTimeout(500);
    expect(page.url()).toBe('http://localhost:3000/payroll/bank');
  });

  test('Test 4: Browser Back & Forward Navigation Synchronization', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');

    // Navigate to People
    await page.locator('button:has-text("Employee Management")').first().click();
    await page.waitForTimeout(400);
    expect(page.url()).toBe('http://localhost:3000/people');

    // Navigate to Payroll Statutory
    await page.locator('button:has-text("Statutory & Tax Rules")').first().click();
    await page.waitForTimeout(400);
    expect(page.url()).toBe('http://localhost:3000/payroll/statutory');

    // Browser Back -> should return to /people
    await page.goBack();
    await page.waitForTimeout(400);
    expect(page.url()).toBe('http://localhost:3000/people');
    await expect(page.locator('button:has-text("Employee Management")').first()).toHaveClass(/text-\[#07563D\]|bg-emerald-50/);

    // Browser Forward -> should return to /payroll/statutory
    await page.goForward();
    await page.waitForTimeout(400);
    expect(page.url()).toBe('http://localhost:3000/payroll/statutory');
    await expect(page.locator('button:has-text("Statutory & Tax Rules")').first()).toHaveClass(/text-\[#07563D\]|bg-emerald-50/);
  });

  test('Test 5: Deep Direct Route URLs Verification', async ({ page }) => {
    // 1. Direct visit to /biometric/rules
    await page.goto('http://localhost:3000/biometric/rules');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toBe('http://localhost:3000/biometric/rules');
    await expect(page.locator('button:has-text("Biometric Rules & Automation")').first()).toHaveClass(/text-\[#07563D\]|bg-emerald-50/);

    // 2. Direct visit to /shifts/roster
    await page.goto('http://localhost:3000/shifts/roster');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toBe('http://localhost:3000/shifts/roster');
    await expect(page.locator('button:has-text("Shift Roster & Matrix")').first()).toHaveClass(/text-\[#07563D\]|bg-emerald-50/);

    // 3. Direct visit to /payroll/runs
    await page.goto('http://localhost:3000/payroll/runs');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toBe('http://localhost:3000/payroll/runs');
    await expect(page.locator('button:has-text("Payroll Processing & Runs")').first()).toHaveClass(/text-\[#07563D\]|bg-emerald-50/);

    // 4. Direct visit to /vendors/compliance
    await page.goto('http://localhost:3000/vendors/compliance');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toBe('http://localhost:3000/vendors/compliance');
    await expect(page.locator('button:has-text("Compliance & Risk Audit")').first()).toHaveClass(/text-\[#07563D\]|bg-emerald-50/);
  });

  test('Test 6: Sidebar Collapse & Expand Persistence', async ({ page }) => {
    await page.goto('http://localhost:3000/payroll/statutory');
    await page.waitForLoadState('networkidle');

    // Click collapse button
    const collapseToggle = page.locator('button[title*="Collapse"]').first();
    await collapseToggle.click();
    await page.waitForTimeout(400);

    // Verify aside width collapsed to 72px
    const aside = page.locator('aside');
    await expect(aside).toHaveClass(/w-\[72px\]/);

    // Click expand button
    const expandToggle = page.locator('button[title*="Expand"]').first();
    await expandToggle.click();
    await page.waitForTimeout(400);

    // Verify aside expanded back to 276px
    await expect(aside).toHaveClass(/w-\[276px\]/);
    await expect(page.locator('button:has-text("Statutory & Tax Rules")').first()).toHaveClass(/text-\[#07563D\]|bg-emerald-50/);
  });

  test('Test 7: Unauthenticated Route Protection Barrier', async ({ browser }) => {
    // Create completely isolated context without injected user
    const loggedOutContext = await browser.newContext();
    const loggedOutPage = await loggedOutContext.newPage();

    await loggedOutPage.goto('http://localhost:3000/payroll/statutory');
    await loggedOutPage.waitForLoadState('networkidle');

    // Must show authentication login page and NOT reveal protected payroll data
    await expect(loggedOutPage.locator('button:has-text("Sign in")').or(loggedOutPage.locator('input[type="email"]')).first()).toBeVisible();
    await loggedOutContext.close();
  });
});
