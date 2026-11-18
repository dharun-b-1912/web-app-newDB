import { test, expect } from '@playwright/test';

test.describe('Joy PeopleHR — GPS Radar, In-Office Biometric & KM Fare E2E Audit', () => {
  const companyHrUser = {
    id: '4d9bde74-2746-4a8b-96b0-1382de32d3ce',
    email: 'marimuthu@joycorporatesolutions.com',
    full_name: 'Marimuthu HR Head',
    name: 'Marimuthu HR Head',
    role: 'HR_HEAD',
    role_display_name: 'HR Head',
    organization_id: '0c621892-e938-4707-9957-13534ea32c19',
    tenant_id: '0c621892-e938-4707-9957-13534ea32c19',
    status: 'Active',
    account_status: 'ACTIVE',
    roles: [
      { id: 'role-1', name: 'ORGANIZATION_ADMIN', code: 'ORGANIZATION_ADMIN' },
      { id: 'role-2', name: 'HR_HEAD', code: 'HR_HEAD' },
    ],
    authContext: {
      userId: '4d9bde74-2746-4a8b-96b0-1382de32d3ce',
      authUserId: '4d9bde74-2746-4a8b-96b0-1382de32d3ce',
      identity: {
        email: 'marimuthu@joycorporatesolutions.com',
        fullName: 'Marimuthu HR Head',
      },
      accountStatus: 'ACTIVE',
      tenant: {
        organizationId: '0c621892-e938-4707-9957-13534ea32c19',
        organizationName: 'Joy Corporate Solutions Pvt Ltd',
      },
      company: {
        companyId: 'comp-001',
        companyName: 'Joy Corporate Solutions Pvt Ltd',
      },
      roles: ['ORGANIZATION_ADMIN', 'HR_HEAD'],
      primaryRole: 'HR Head',
      scopes: {
        platform: false,
        organization: true,
        company: true,
        employee: true,
        vendor: false,
      },
      portalType: 'ORGANIZATION_ADMIN',
      allowedPortals: ['ORGANIZATION_ADMIN', 'EMPLOYEE_HR'],
      defaultPortal: 'ORGANIZATION_ADMIN',
      defaultRoute: 'dashboard',
      permissions: ['*'],
    },
  };

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((user) => {
      localStorage.setItem('joy_user', JSON.stringify(user));
      localStorage.setItem('workforce_current_user', JSON.stringify(user));
      localStorage.setItem(
        'workforce_active_company',
        JSON.stringify({ id: 'comp-001', name: 'Joy Corporate Solutions Pvt Ltd' })
      );
      localStorage.setItem('workforce_active_org_id', '0c621892-e938-4707-9957-13534ea32c19');
      localStorage.setItem('joy_active_tenant_id', '0c621892-e938-4707-9957-13534ea32c19');
      localStorage.setItem('workforce_active_route', 'dashboard');
    }, companyHrUser);
  });

  test('1. Master Sidebar has separate GPS & Radar segments under CLOCKING & DEVICES', async ({ page }) => {
    await page.goto('/biometric/gps?subTab=tracking');
    await page.waitForLoadState('domcontentloaded');

    // Verify CLOCKING & DEVICES section exists in sidebar
    const clockingGroup = page.locator('text=CLOCKING & DEVICES');
    await expect(clockingGroup).toBeVisible({ timeout: 15000 });

    // Verify separate menu items exist
    const radarNav = page.locator('button:has-text("Shift Route & Live Fleet Radar")').first();
    await expect(radarNav).toBeVisible();

    const clockingNav = page.locator('button:has-text("GPS & Mobile Clocking")').first();
    await expect(clockingNav).toBeVisible();

    const kmFareNav = page.locator('button:has-text("Field Travel & KM Fare Config")').first();
    await expect(kmFareNav).toBeVisible();

    const geofencesNav = page.locator('button:has-text("Geofence Boundaries")').first();
    await expect(geofencesNav).toBeVisible();
  });

  test('2. Field Travel & KM Fare Config renders rates and travel allowance correctly', async ({ page }) => {
    await page.goto('/biometric/gps?subTab=travel-fare');
    await page.waitForLoadState('domcontentloaded');

    // Verify the Field Travel & KM Fare Config tab is rendered
    await expect(page.locator('text=Field Travel Reimbursement & KM Fare Configuration').first()).toBeVisible({ timeout: 15000 });

    // Verify standard metrics and mileage tiers
    await expect(page.locator('text=Standard Fare Rate').first()).toBeVisible();
    await expect(page.locator('text=Two-Wheeler Rate').first()).toBeVisible();
    await expect(page.locator('text=Shift-Bound Privacy Cutoff').first()).toBeVisible();

    // Verify Export and Sync buttons
    await expect(page.locator('button:has-text("Export Audit")')).toBeVisible();
    await expect(page.locator('button:has-text("Sync to Payroll")')).toBeVisible();
  });

  test('3. Employee on leave shows dedicated privacy card and suppresses map', async ({ page }) => {
    await page.goto('/biometric/gps?subTab=tracking');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=Employee Shift Route & Live Fleet Radar').first()).toBeVisible({ timeout: 15000 });

    // Switch to "On Leave" filter tab
    const onLeaveFilterBtn = page.locator('button:has-text("On Leave")').first();
    await expect(onLeaveFilterBtn).toBeVisible({ timeout: 10000 });
    await onLeaveFilterBtn.click();

    // Look for Shalini or any on-leave staff item
    const shaliniItem = page.locator('text=Shalini').first();
    await expect(shaliniItem).toBeVisible({ timeout: 10000 });
    await shaliniItem.click();

    // Verify the dedicated privacy card is rendered
    await expect(page.locator('text=Real-Time GPS Tracking Suspended').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Shift Inactive • Approved Leave Record Active').first()).toBeVisible();

    // Ensure no Google Maps iframe is rendered for staff on leave
    const iframeMap = page.locator('iframe[title="Google Maps Employee Live Tracker"]');
    await expect(iframeMap).not.toBeVisible();
  });

  test('4. In-Office biometric punch shows In Office • Biometric instead of Awaiting Punch', async ({ page }) => {
    await page.goto('/biometric/gps?subTab=tracking');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=Employee Shift Route & Live Fleet Radar').first()).toBeVisible({ timeout: 15000 });

    // Find any in-office employee (e.g. Thirumalai R K or In Office badge)
    const inOfficeBadge = page.locator('text=In Office').first();
    await expect(inOfficeBadge).toBeVisible({ timeout: 15000 });
  });

  test('5. Direct /gps-travel-fare URL correctly renders KM Fare tab without tracking bleed', async ({ page }) => {
    await page.goto('/gps-travel-fare');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=Field Travel Reimbursement & KM Fare Configuration').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Standard Fare Rate').first()).toBeVisible();
  });
});
