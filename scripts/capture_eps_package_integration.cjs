// scripts/capture_eps_package_integration.cjs
// ============================================================================
// Playwright Verification: EPS Yellow Geometric Corporate ID Integration
// Captures Gallery Front/Back preview, Wizard EPS Config Import, Front & Back
// Layer Placement, and Live Studio Review.
// ============================================================================

const { chromium } = require('playwright');
const path = require('path');

const OUT_DIR = 'C:/Users/hp/.gemini/antigravity/brain/607f29a2-17c7-4b9c-b3a0-d4836a0335af';

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
    defaultRoute: 'people',
    permissions: ['*']
  }
};

async function run() {
  console.log('🚀 Starting EPS Yellow Geometric Corporate ID Playwright Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.addInitScript((user) => {
    localStorage.setItem('joy_user', JSON.stringify(user));
    localStorage.setItem('workforce_current_user', JSON.stringify(user));
    sessionStorage.setItem('workforce_current_user', JSON.stringify(user));
    localStorage.setItem('workforce_active_org_id', user.organization_id);
    localStorage.setItem('workforce_auth_context', 'tenant');
    localStorage.setItem('workforce_active_route', 'id-cards');
    localStorage.setItem('joy_id_card_studio_v2', 'true');
  }, hrHeadUser);

  await page.goto('http://localhost:3000/id-cards', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 1. Capture Gallery showing pre-integrated Yellow Geometric Corporate ID (Front & Back Miniature)
  const galleryPath = path.join(OUT_DIR, 'eps_yellow_geometric_gallery_1440x900.png');
  await page.screenshot({ path: galleryPath });
  console.log(`✓ 1. Gallery with EPS Yellow Geometric Template -> ${galleryPath}`);

  // 2. Open Upload Wizard and click "Load Yellow Geometric EPS Package"
  await page.locator('text=Upload My Design (Own Artwork)').first().click();
  await page.waitForTimeout(700);
  await page.locator('button:has-text("Load Yellow Geometric EPS Package")').click();
  await page.waitForTimeout(800);

  const wizardStep1Path = path.join(OUT_DIR, 'eps_yellow_geometric_wizard_step1_1440x900.png');
  await page.screenshot({ path: wizardStep1Path });
  console.log(`✓ 2. Wizard Step 1 EPS Package Loaded -> ${wizardStep1Path}`);

  // 3. Advance to Step 3: Place Fields (Front Side)
  await page.locator('button:has-text("Continue to Check Fit")').click();
  await page.waitForTimeout(700);
  await page.locator('button:has-text("Continue to Place Fields")').click();
  await page.waitForTimeout(1000);

  const wizardFrontPath = path.join(OUT_DIR, 'eps_yellow_geometric_wizard_front_1440x900.png');
  await page.screenshot({ path: wizardFrontPath });
  console.log(`✓ 3. Wizard Step 3 Front Side (Circular Gold Photo + Dynamic Fields) -> ${wizardFrontPath}`);

  // 4. Switch to Back Side in Step 3
  const backSideBtn = page.locator('button:has-text("Back Side")').first();
  if (await backSideBtn.isVisible()) {
    await backSideBtn.click();
    await page.waitForTimeout(800);
  }

  const wizardBackPath = path.join(OUT_DIR, 'eps_yellow_geometric_wizard_back_1440x900.png');
  await page.screenshot({ path: wizardBackPath });
  console.log(`✓ 4. Wizard Step 3 Back Side (Gold QR Frame + Dynamic QR + Terms) -> ${wizardBackPath}`);

  // 5. Advance to Step 4: Workforce Preview with EPS Yellow Geometric design
  await page.locator('button:has-text("Continue to Test")').click();
  await page.waitForTimeout(1000);

  const wizardTestPath = path.join(OUT_DIR, 'eps_yellow_geometric_wizard_test_1440x900.png');
  await page.screenshot({ path: wizardTestPath });
  console.log(`✓ 5. Wizard Step 4 Workforce Preview -> ${wizardTestPath}`);

  await browser.close();
  console.log('🎉 EPS Yellow Geometric Corporate ID verification complete!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

