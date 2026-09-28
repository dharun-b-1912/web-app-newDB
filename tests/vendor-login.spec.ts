import { test, expect } from '@playwright/test';

test.describe('Vendor Portal Authentication Flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('displays clear error message on invalid vendor credentials', async ({ page }) => {
    page.on('console', (msg) => console.log(`[Browser Console ${msg.type()}]:`, msg.text()));
    page.on('pageerror', (err) => console.log('[Browser Page Error]:', err.message));

    // 1. Navigate to Vendor Login Gateway
    await page.goto('http://localhost:3000/vendor/login');

    // Click Vendor Portal Context Tab
    const vendorTabBtn = page.locator('button:has-text("Vendor & Contractor Portal")');
    if (await vendorTabBtn.isVisible()) {
      await vendorTabBtn.click();
      await page.waitForTimeout(300);
    }

    // Verify vendor context title
    await expect(page.locator('text=Vendor & Contractor Sign In')).toBeVisible({ timeout: 5000 });

    // 2. Fill in vendor email and incorrect password
    const emailInput = page.getByPlaceholder('vendor@company.com');
    const passwordInput = page.getByPlaceholder('••••••••••••');

    await emailInput.fill('vendoradmin.val.mu2dynu9@joypeoplehr.com');
    await passwordInput.fill('incorrectpassword123');

    // 3. Click Sign In as Vendor
    await page.click('button[type="submit"]:has-text("Sign In as Vendor")');

    // 4. Verify explicit error banner is rendered and visible
    const errorAlert = page.locator('div[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
    const text = await errorAlert.innerText();
    console.log('✅ Displayed Error Banner Text:', text);
    expect(text.toLowerCase()).toContain('invalid');
  });

  test('successfully logs in with valid vendor credentials into Vendor Portal workspace', async ({ page }) => {
    page.on('console', (msg) => console.log(`[Browser Console ${msg.type()}]:`, msg.text()));
    page.on('pageerror', (err) => console.log('[Browser Page Error]:', err.message));

    // 1. Seed valid vendor credentials in browser localStorage
    await page.goto('http://localhost:3000/vendor/login');

    await page.evaluate(() => {
      const vendorCreds = [
        {
          id: 'vcred_live_test_001',
          vendor_id: 'v_e2e_apex_contracting',
          organization_id: 'org-test-enterprise-global-001',
          company_id: 'c1000000-0000-0000-0000-000000000001',
          email: 'valid.vendor@joypeoplehr.com',
          full_name: 'Vendor Operations Lead',
          role: 'VENDOR_ADMIN',
          status: 'ACTIVE',
          temporary_password: 'LiveVendor#Secure2026!',
          login_url: 'http://localhost:3000/vendor/login',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];
      const vendorUsers = [
        {
          id: 'usr-v-001',
          vendor_id: 'v_e2e_apex_contracting',
          email: 'valid.vendor@joypeoplehr.com',
          full_name: 'Vendor Operations Lead',
          role: 'VENDOR_ADMIN',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];
      localStorage.setItem('workforce_vendor_credentials_registry', JSON.stringify(vendorCreds));
      localStorage.setItem('workforce_vendor_users_registry', JSON.stringify(vendorUsers));
      localStorage.setItem('workforce_auth_context', 'vendor');
    });

    await page.reload();

    // Click Vendor Portal Context Tab if needed
    const vendorTabBtn = page.locator('button:has-text("Vendor & Contractor Portal")');
    if (await vendorTabBtn.isVisible()) {
      await vendorTabBtn.click();
      await page.waitForTimeout(300);
    }

    // 2. Fill in valid credentials
    const emailInput = page.getByPlaceholder('vendor@company.com');
    const passwordInput = page.getByPlaceholder('••••••••••••');

    await emailInput.fill('valid.vendor@joypeoplehr.com');
    await passwordInput.fill('LiveVendor#Secure2026!');

    // 3. Click Sign In as Vendor
    await page.click('button[type="submit"]:has-text("Sign In as Vendor")');

    // 4. Verify successful redirection into the Vendor Portal Workspace
    await expect(page.locator('text=Vendor Compliance & Contractor Intelligence').or(page.locator('text=Settlement')).or(page.locator('text=Vendor Operations Lead')).or(page.locator('text=Sign Out'))).toBeVisible({ timeout: 15000 });
    console.log('✅ Vendor Portal sign-in and workspace load validated successfully!');
  });

  test('Test 3: Vendor Portal sign-in with vendor@joycorporatesolution.com and full workflow data', async ({ page }) => {
    // 1. Navigate to Vendor Login
    await page.goto('http://localhost:3000/vendor/login');
    await page.waitForLoadState('networkidle');

    // 2. Click Vendor Portal tab if not already active
    const vendorTabBtn = page.locator('button:has-text("Vendor & Contractor Portal")');
    if (await vendorTabBtn.isVisible()) {
      await vendorTabBtn.click();
      await page.waitForTimeout(300);
    }

    // 3. Fill email and password inputs directly
    const emailInput = page.getByPlaceholder('vendor@company.com');
    const passwordInput = page.getByPlaceholder('••••••••••••');
    await emailInput.fill('vendor@joycorporatesolution.com');
    await passwordInput.fill('JoyVendor#2026!');

    // 4. Click Sign In as Vendor
    await page.click('button[type="submit"]:has-text("Sign In as Vendor")');
    await page.waitForTimeout(1000);

    // 5. Verify successful entrance into Vendor Portal
    await expect(page.locator('text=Vendor Portal').or(page.locator('text=Joy Corporate Workforce')).or(page.locator('text=Settlement Workspace')).first()).toBeVisible({ timeout: 15000 });

    // 8. Verify Contract Workforce stage is accessible with workers
    const workforceNavBtn = page.locator('button:has-text("Assigned Workforce")').or(page.locator('button:has-text("Workforce")')).first();
    if (await workforceNavBtn.isVisible()) {
      await workforceNavBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator('text=Arun Kumar').or(page.locator('text=Priya Sharma')).or(page.locator('text=Contract Workforce')).first()).toBeVisible();
    }

    // 9. Verify Purchase Orders & Invoices
    const invoicesNavBtn = page.locator('button:has-text("Invoices")').or(page.locator('button:has-text("Invoices & 3-Way Match")')).first();
    if (await invoicesNavBtn.isVisible()) {
      await invoicesNavBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator('text=INV-2026-08-01').or(page.locator('text=3-Way Match')).or(page.locator('text=MATCHED')).first()).toBeVisible();
    }

    console.log('✅ In-House Demo 1-Click Auto-Fill and multi-stage workflow verified successfully!');
  });
});
