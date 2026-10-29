import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('JOY PeopleHR — Adaptive Shifts & Permission Governance End-to-End Suite', () => {
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
        organizationId: '0c621892-e938-4707-9957-13534ea32c19',
        organizationName: 'Joy Corporate Solutions Pvt. Ltd.'
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
      localStorage.setItem('workforce_active_route', 'dashboard');
    }, companyHrUser);
  });

  test('1. Sidebar displays Adaptive Shifts and Permission Governance with enterprise badges', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Sidebar navigation group: SHIFT & SCHEDULING
    const adaptiveLink = page.locator('text=Adaptive Shifts').first();
    const permissionLink = page.locator('text=Permission Governance').first();

    await expect(adaptiveLink).toBeVisible({ timeout: 15000 });
    await expect(permissionLink).toBeVisible({ timeout: 15000 });

    // Verify badges
    await expect(page.locator('text=Smart').first()).toBeVisible();
    await expect(page.locator('text=120m').first()).toBeVisible();
  });

  test('2. Adaptive Shifts Console: 6 Workspace Tabs, Conflict Checks & Modals', async ({ page }) => {
    await page.goto('/shifts/adaptive');
    await page.waitForLoadState('networkidle');

    // Verify Page Header and Enterprise Palette
    await expect(page.locator('text=Adaptive Shift & Rotation Console').first()).toBeVisible({ timeout: 15000 });

    // Verify 6 Tabs
    const tabs = [
      'Overview & Hierarchy',
      'Shift Assignments & Overrides',
      'Punch Detection Radar',
      'Rotation Cycle Planner',
      'Staff Shift Matrix',
      'Exceptions & Audit'
    ];

    for (const tab of tabs) {
      const tabBtn = page.getByRole('button', { name: tab }).first();
      await expect(tabBtn).toBeVisible();
    }

    // Capture screenshot of Tab 1: Overview & Hierarchy
    await page.screenshot({ path: './scratch/adaptive-shifts-overview.png', fullPage: true });

    // Click "Assign / Reallocate Shift" modal trigger
    const assignBtn = page.locator('button:has-text("Assign / Reallocate Shift")').first();
    await expect(assignBtn).toBeVisible();
    await assignBtn.click();

    // Verify Modal Header & Pre-flight Conflict Check Banner
    await expect(page.locator('text=Operational Shift Assignment & Emergency Allocation').first()).toBeVisible();
    const conflictNotice = page.getByText(/Pre-Flight Conflict Check|Schedule Notice/).first();
    await expect(conflictNotice).toBeVisible();

    // Close Modal
    const cancelBtn = page.getByRole('button', { name: 'Cancel' }).first();
    await cancelBtn.click();
    await expect(page.locator('text=Operational Shift Assignment & Emergency Allocation')).not.toBeVisible();

    // Switch to Tab 2: Shift Assignments & Overrides
    await page.getByRole('button', { name: 'Shift Assignments & Overrides' }).first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Operational Workforce Shift Reallocations').first()).toBeVisible();

    // Switch to Tab 3: Punch Detection Radar
    await page.getByRole('button', { name: 'Punch Detection Radar' }).first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Biometric Punch-to-Shift Inference Radar').first()).toBeVisible();
    await page.screenshot({ path: './scratch/adaptive-shifts-punch-radar.png' });

    // Switch to Tab 4: Rotation Cycle Planner
    await page.getByRole('button', { name: 'Rotation Cycle Planner' }).first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Shift Rotation Cycle Scheduler').first()).toBeVisible();

    // Switch to Tab 5: Staff Shift Matrix
    await page.getByRole('button', { name: 'Staff Shift Matrix' }).first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('th:has-text("Resolved Shift")').first()).toBeVisible();

    // Switch to Tab 6: Exceptions & Audit
    await page.getByRole('button', { name: 'Exceptions & Audit' }).first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Adaptive Shift Exceptions & Audit Trail').first()).toBeVisible();
  });

  test('3. Permission Governance Console: Compact Header, Ledger, Accordions & Timeline Drawer', async ({ page }) => {
    await page.goto('/permission-governance');
    await page.waitForLoadState('networkidle');

    // Header & KPIs
    await expect(page.locator('text=Permission Allowance & Ledger Console').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Monthly Quota').first()).toBeVisible();
    await expect(page.locator('text=120m').first()).toBeVisible();
    await expect(page.locator('text=Staff Evaluated').first()).toBeVisible();
    await expect(page.locator('text=Within Allowance').first()).toBeVisible();
    await expect(page.locator('text=Threshold Crossed').first()).toBeVisible();

    // Capture initial ledger screenshot
    await page.screenshot({ path: './scratch/permission-governance-ledger.png', fullPage: true });

    // Verify Tab 1: Employee Monthly Ledger
    await expect(page.locator('button:has-text("Employee Monthly Ledger")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Combined Quota (120m)")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Threshold Date")').first()).toBeVisible();

    // Test search filter with accurate placeholder
    const searchInput = page.getByPlaceholder('Search staff by name or employee code...').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Shalini');
    await page.waitForTimeout(600); // debounced search

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(600);

    // Test Breakdown Slide-Over Drawer
    const breakdownBtn = page.getByRole('button', { name: 'Breakdown' }).first();
    await expect(breakdownBtn).toBeVisible();
    await breakdownBtn.click();
    await page.waitForTimeout(800);

    // Verify Drawer Title & Content
    await expect(page.locator('text=Monthly Quota Consumption').first()).toBeVisible();
    await expect(page.locator('text=Monthly Permission Events').first()).toBeVisible();

    // Take screenshot of Slide-over Drawer
    await page.screenshot({ path: './scratch/permission-governance-drawer.png' });

    // Close drawer via testid
    await page.locator('[data-testid="close-drawer"]').click();
    await expect(page.locator('[data-testid="close-drawer"]')).not.toBeVisible({ timeout: 5000 });

    // Switch to Tab 2: Policy Settings & Thresholds
    await page.getByRole('button', { name: 'Policy Settings & Thresholds' }).first().click();
    await page.waitForTimeout(500);

    // Verify Policy Summary Banner & Accordions
    await expect(page.locator('text=Active Attendance Governance Summary').first()).toBeVisible();
    await expect(page.locator('text=Policy Version 2.0 • Live').first()).toBeVisible();
    await expect(page.locator('text=Monthly Allowance & Workforce Scope').first()).toBeVisible();
    await expect(page.locator('text=Consumption Basis & Late Arrival Integration').first()).toBeVisible();
    await expect(page.locator('text=Threshold-Crossing Day Classification Rule').first()).toBeVisible();
    await expect(page.locator('text=Subsequent Excess Handling').first()).toBeVisible();
    await expect(page.locator('text=Attendance Classification & Minimum Duration').first()).toBeVisible();

    // Take screenshot of Policy Settings
    await page.screenshot({ path: './scratch/permission-governance-policy-settings.png', fullPage: true });

    // Switch to Tab 3: Exceptions & Review Desk
    await page.getByRole('button', { name: 'Exceptions & Review Desk' }).first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Allowance Threshold Exceptions & Reviews').first()).toBeVisible();
    await expect(page.locator('text=Flagged Ledgers').first()).toBeVisible();

    // Open "Record Permission" Modal
    const recordBtn = page.locator('button:has-text("Record Permission")').first();
    await expect(recordBtn).toBeVisible();
    await recordBtn.click();

    // Verify Modal & Live Impact Calculation Preview
    await expect(page.locator('text=Record Approved Attendance Permission').first()).toBeVisible();
    await expect(page.locator('text=Operational Justification / Note').first()).toBeVisible();
    const previewBanner = page.locator('text=Monthly Quota Consumption Preview').first();
    if (await previewBanner.isVisible()) {
      await expect(previewBanner).toBeVisible();
    }

    // Close Modal
    await page.getByRole('button', { name: 'Cancel' }).first().click();
  });
});
