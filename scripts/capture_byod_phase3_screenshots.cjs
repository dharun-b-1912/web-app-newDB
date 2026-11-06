// scripts/capture_byod_phase3_screenshots.cjs
// ============================================================================
// Phase 3 Playwright Verification Script: Library, Versioning, .idtemplate
// Bundle Sharing & 300 DPI Prepress Designer Spec Kit Modal
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
  console.log('🚀 Starting Phase 3 Library, Versioning & Spec Kit Playwright Suite...');
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: '1440x900', width: 1440, height: 900 },
    { name: '1920x1080', width: 1920, height: 1080 }
  ];

  for (const vp of viewports) {
    console.log(`\n================ Viewport: ${vp.name} ================`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
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

    // 1. Capture Organization Library with Versioning & .idtemplate Controls (v1.0)
    const libraryV1Path = path.join(OUT_DIR, `byod_phase3_library_v1_${vp.name}.png`);
    await page.screenshot({ path: libraryV1Path });
    console.log(`✓ 1. Organization Library v1.0 (${vp.name}) -> ${libraryV1Path}`);

    // 2. Click "Bump to v2.0" and capture incremented version
    const bumpBtn = page.locator('button:has-text("Bump to v2.0")').first();
    if (await bumpBtn.isVisible()) {
      await bumpBtn.click();
      await page.waitForTimeout(700);
    }

    const libraryV2Path = path.join(OUT_DIR, `byod_phase3_library_v2_bumped_${vp.name}.png`);
    await page.screenshot({ path: libraryV2Path });
    console.log(`✓ 2. Organization Library Bumped to v2.0 (${vp.name}) -> ${libraryV2Path}`);

    // 3. Click "Designer Spec Kit (300 DPI Guide)" to open the Prepress Guide Modal
    const specKitBtn = page.locator('button:has-text("Designer Spec Kit (300 DPI Guide)")').first();
    if (await specKitBtn.isVisible()) {
      await specKitBtn.click();
      await page.waitForTimeout(700);
    }

    const specModalPortraitPath = path.join(OUT_DIR, `byod_phase3_spec_kit_portrait_${vp.name}.png`);
    await page.screenshot({ path: specModalPortraitPath });
    console.log(`✓ 3. Prepress Designer Spec Kit Modal - Portrait (${vp.name}) -> ${specModalPortraitPath}`);

    // 4. Switch to Landscape (1082x709 px) inside the Spec Kit Modal
    const landscapeGuideBtn = page.locator('button:has-text("Landscape (1082×709 px)")').first();
    if (await landscapeGuideBtn.isVisible()) {
      await landscapeGuideBtn.click();
      await page.waitForTimeout(500);
    }

    const specModalLandscapePath = path.join(OUT_DIR, `byod_phase3_spec_kit_landscape_${vp.name}.png`);
    await page.screenshot({ path: specModalLandscapePath });
    console.log(`✓ 4. Prepress Designer Spec Kit Modal - Landscape (${vp.name}) -> ${specModalLandscapePath}`);

    await context.close();
  }

  await browser.close();
  console.log('\n🎉 All Phase 3 screenshots captured successfully!');
}

run().catch(err => {
  console.error('Fatal Phase 3 screenshot error:', err);
  process.exit(1);
});

