import { test, expect } from '@playwright/test';

test.describe('Attendance Policies — Enterprise Attendance Rules Engine', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    const hrUser = {
      id: '4d9bde74-2746-4a8b-96b0-1382de32d3ce',
      email: 'marimuthu@joycorporatesolutions.com',
      full_name: 'Dr. Marimuthu (HR Head)',
      name: 'Dr. Marimuthu (HR Head)',
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
          fullName: 'Dr. Marimuthu (HR Head)',
        },
        accountStatus: 'ACTIVE',
        tenant: {
          organizationId: '0c621892-e938-4707-9957-13534ea32c19',
          organizationName: 'Joy Corporate Solutions Pvt Ltd',
        },
        company: {
          companyId: '0c621892-e938-4707-9957-13534ea32c19',
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
        defaultRoute: 'policies',
        permissions: ['*'],
      },
    };

    await page.addInitScript((user) => {
      localStorage.setItem('joy_user', JSON.stringify(user));
      localStorage.setItem('workforce_current_user', JSON.stringify(user));
      localStorage.setItem('auth_context', JSON.stringify(user.authContext));
      localStorage.setItem('workforce_active_route', 'policies');
      localStorage.setItem('joy_active_tenant_id', '0c621892-e938-4707-9957-13534ea32c19');
    }, hrUser);

    await page.goto('/policies');
    await page.waitForLoadState('networkidle');
  });

  test('1. Shell Layout Fix: Suppresses duplicate top master banner', async ({ page }) => {
    // Check that page title "Attendance Policies" is visible
    const title = page.locator('h1', { hasText: 'Attendance Policies' });
    await expect(title).toBeVisible();

    // Verify badge
    await expect(page.getByText('Deterministic Rule Engine')).toBeVisible();

    // Verify duplicate header banner "ATTENDANCE MASTER MODULE" is NOT present on this view
    const duplicateBanner = page.locator('text="ATTENDANCE MASTER MODULE"');
    await expect(duplicateBanner).toHaveCount(0);

    // Save screenshot
    await page.screenshot({ path: 'scratch/attendance_policies_header.png', fullPage: false });
  });

  test('2. Operational Telemetry: Renders 5 KPI metrics cards', async ({ page }) => {
    await expect(page.getByText('Active Policies', { exact: true })).toBeVisible();
    await expect(page.getByText('Draft & Scheduled', { exact: false })).toBeVisible();
    await expect(page.getByText('Workforce Covered', { exact: true })).toBeVisible();
    await expect(page.getByText('Unassigned / Baseline', { exact: true })).toBeVisible();
    await expect(page.getByText('Awaiting Review', { exact: true })).toBeVisible();
  });

  test('3. Policy Table & Statuses: Renders enterprise catalog with lifecycle badges', async ({ page }) => {
    // Expect corporate and factory policies to be present
    await expect(page.getByText('Corporate Standard Attendance Policy').first()).toBeVisible();
    await expect(page.getByText('Plant & Manufacturing Shift Attendance Policy').first()).toBeVisible();
    await expect(page.getByText('Rotating Workforce 24/7 Operations Policy').first()).toBeVisible();
    await expect(page.getByText('Multi-Branch Retail & Field Operations Policy').first()).toBeVisible();

    // Verify lifecycle badges
    await expect(page.locator('span:has-text("Active")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Draft")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Scheduled")').first()).toBeVisible();

    // Test filter pills
    await page.getByRole('button', { name: /^Active/i }).first().click();
    await expect(page.getByText('Corporate Standard Attendance Policy').first()).toBeVisible();

    await page.getByRole('button', { name: /^Drafts/i }).first().click();
    await expect(page.getByText('Rotating Workforce 24/7 Operations Policy').first()).toBeVisible();

    await page.getByRole('button', { name: /^All Policies/i }).first().click();
    await expect(page.getByText('Plant & Manufacturing Shift Attendance Policy').first()).toBeVisible();
  });

  test('4. Industry Templates Modal: Displays 4 pre-configured templates', async ({ page }) => {
    await page.getByRole('button', { name: /Industry Templates/i }).click();
    await expect(page.getByText('Select Industry Attendance Policy Template')).toBeVisible();

    await expect(page.getByText('Corporate Standard', { exact: true })).toBeVisible();
    await expect(page.getByText('Plant & Manufacturing Shifts', { exact: true })).toBeVisible();
    await expect(page.getByText('Rotating Workforce 24/7', { exact: true })).toBeVisible();
    await expect(page.getByText('Multi-Branch Retail & Field', { exact: true })).toBeVisible();

    // Save screenshot
    await page.screenshot({ path: 'scratch/attendance_policies_templates.png', fullPage: false });

    // Close modal
    await page.keyboard.press('Escape');
  });

  test('5. Guided Policy Builder Wizard: 11-step setup with safe enable/disable switches', async ({ page }) => {
    await page.getByRole('button', { name: /Create Attendance Policy/i }).click();
    await expect(page.getByText('Guided Attendance Policy Wizard')).toBeVisible();

    // Verify Step 1
    await expect(page.getByText('Policy Identity & Business Purpose')).toBeVisible();
    await page.getByRole('button', { name: /Next Step/i }).click();

    // Verify Step 2
    await expect(page.getByText('Workforce Scope & Applicability Precedence')).toBeVisible();
    await page.getByRole('button', { name: /Next Step/i }).click();

    // Verify Step 3: Calendar
    await expect(page.getByText('Working Calendar, Weekly Offs & Holidays')).toBeVisible();
    await page.getByRole('button', { name: /Next Step/i }).click();

    // Verify Step 4: Shift Resolution
    await expect(page.getByText('Shift Resolution Hierarchy & Adaptive Inference')).toBeVisible();
    await page.getByRole('button', { name: /Next Step/i }).click();

    // Verify Step 5: Biometrics & Grace
    await expect(page.getByText('Biometric Ingestion, Deduplication & Grace Tolerances')).toBeVisible();
    await page.getByRole('button', { name: /Next Step/i }).click();

    // Verify Step 6: Breaks & Hours
    await expect(page.getByText('Breaks, Required Work Duration & Overnight Shifts')).toBeVisible();
    await page.getByRole('button', { name: /Next Step/i }).click();

    // Verify Step 7: Permission Quota
    await expect(page.getByText('Monthly Permission Quota & Half-Day Governance')).toBeVisible();
    await page.getByRole('button', { name: /Next Step/i }).click();

    // Verify Step 8: Overtime
    await expect(page.getByText('Overtime Eligibility, Thresholds & Multipliers')).toBeVisible();

    // Save screenshot
    await page.screenshot({ path: 'scratch/attendance_policies_wizard.png', fullPage: false });

    // Close wizard modal
    await page.keyboard.press('Escape');
  });

  test('6. Interactive Rule Simulator Sandbox: 9-step calculation trace & batch preview', async ({ page }) => {
    // Open simulator for Corporate policy
    const simBtn = page.getByRole('button', { name: /Simulate/i }).first();
    await simBtn.click();

    await expect(page.getByText(/Attendance Rule Simulator/i)).toBeVisible();
    await expect(page.getByText('Deterministic sandbox evaluation')).toBeVisible();

    // Run Sandbox simulation
    await page.getByRole('button', { name: /Run Sandbox Simulation Now/i }).click();

    // Verify 9-step engine trace
    await expect(page.getByText('1. Policy Scope & Precedence')).toBeVisible();
    await expect(page.getByText('2. Shift Resolution')).toBeVisible();
    await expect(page.getByText('3. Check-In & Grace')).toBeVisible();
    await expect(page.getByText('4. Check-Out & Departure')).toBeVisible();
    await expect(page.getByText('5. Working Hours & Breaks')).toBeVisible();
    await expect(page.getByText('6. Monthly Permission Allowance')).toBeVisible();
    await expect(page.getByText('7. Attendance Status Classification')).toBeVisible();
    await expect(page.getByText('8. Overtime Calculation')).toBeVisible();
    await expect(page.getByText('9. Downstream Payroll Consequence')).toBeVisible();

    // Test preset: Quota Exhaustion (Policy A Half-Day)
    await page.getByRole('button', { name: /6. Quota Exhaustion/i }).click();
    await page.getByRole('button', { name: /Run Sandbox Simulation Now/i }).click();
    await expect(page.getByText('HALF_DAY').first()).toBeVisible();

    // Test Batch Workforce Preview
    await page.getByRole('button', { name: /Batch Workforce Preview/i }).click();
    await expect(page.getByText(/Workforce Pre-Flight Simulation/i)).toBeVisible();
    await expect(page.getByText('Compliant')).toBeVisible();
    await expect(page.getByText('Projected LOP')).toBeVisible();

    // Save screenshot of simulator
    await page.screenshot({ path: 'scratch/attendance_policies_simulator.png', fullPage: false });
  });
});
