import { test, expect } from '@playwright/test';

test.describe('Joy PeopleHR — Attendance Redirection, Filter Drilldown & History Navigation Audit', () => {
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
    await page.addInitScript((user) => {
      localStorage.setItem('joy_user', JSON.stringify(user));
      localStorage.setItem('workforce_current_user', JSON.stringify(user));
      localStorage.setItem('workforce_active_company', JSON.stringify({ id: 'comp-001', name: 'Joy Corporate Solutions Pvt Ltd' }));
      localStorage.setItem('workforce_active_route', 'attendance');
    }, companyHrUser);
  });

  test('Attendance drilldown tile redirection, filter clearing, and browser back/forward synchronization', async ({ page }) => {
    // 1. Navigate to Attendance Dashboard
    await page.goto('http://localhost:3000/attendance');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/attendance');
    await expect(page.locator('text=ATTENDANCE MASTER MODULE').first()).toBeVisible();

    // Verify status tiles exist
    const presentTile = page.locator('div[role="button"]:has-text("Present")').first();
    await expect(presentTile).toBeVisible();

    // 2. Click the Present tile to trigger semantic drilldown into /attendance/employees
    await presentTile.click();
    await page.waitForTimeout(600);

    // 3. Verify URL has updated to /attendance/employees with status and tile parameters
    const drilldownUrl = page.url();
    expect(drilldownUrl).toContain('/attendance/employees');
    expect(drilldownUrl).toContain('att_status=Present');
    expect(drilldownUrl).toContain('att_tile=present');

    // 4. Verify subtab and sidebar active state
    const empSubTab = page.locator('button:has-text("Employee Attendance")').first();
    await expect(empSubTab).toBeVisible();
    await expect(empSubTab).toHaveClass(/text-\[#07563D\]|bg-emerald-50|bg-\[#07563D\]/);

    // 5. Verify filter chip banner and empty state
    await expect(page.locator('text=Showing 0 employees because:').first()).toBeVisible();
    await expect(page.locator('text=Present Employees').first()).toBeVisible();
    await expect(page.locator('text=No Present Employees records found').first()).toBeVisible();

    // 6. Click "Clear Tile Filter"
    const clearTileBtn = page.locator('button:has-text("Clear Tile Filter")').first();
    await expect(clearTileBtn).toBeVisible();
    await clearTileBtn.click();
    await page.waitForTimeout(600);

    // 7. Verify URL replaced in place and employee rows appear
    const clearedUrl = page.url();
    expect(clearedUrl).toContain('/attendance/employees');
    expect(clearedUrl).not.toContain('att_status=Present');
    expect(clearedUrl).not.toContain('att_tile=present');
    await expect(page.locator('text=Showing 0 employees because:')).toHaveCount(0);

    // Employees should now be visible in table
    await expect(page.locator('text=Dharun B').or(page.locator('text=Danya R')).first()).toBeVisible();

    // 8. Test Browser Back navigation: should return to /attendance Dashboard in a single click
    await page.goBack();
    await page.waitForTimeout(600);

    const backUrl = page.url();
    expect(backUrl).toBe('http://localhost:3000/attendance');

    // Dashboard view should be restored
    await expect(page.locator('text=Workforce Status Tiles').first()).toBeVisible();

    // 9. Test Browser Forward navigation: should return to /attendance/employees in a single click
    await page.goForward();
    await page.waitForTimeout(600);

    expect(page.url()).toContain('/attendance/employees');
    await expect(page.locator('text=Employee Attendance Workspace').first()).toBeVisible();

    // 10. Test "Back to Dashboard" button navigation inside Employee Attendance
    const backToDashBtn = page.locator('button:has-text("← Dashboard")').first();
    await backToDashBtn.click();
    await page.waitForTimeout(600);

    expect(page.url()).toContain('/attendance');
    expect(page.url()).not.toContain('/employees');
    await expect(page.locator('text=Workforce Status Tiles').first()).toBeVisible();
  });
});
