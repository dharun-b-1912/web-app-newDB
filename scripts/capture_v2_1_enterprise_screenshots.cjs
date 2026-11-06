// scripts/capture_v2_1_enterprise_screenshots.cjs
// ============================================================================
// V2.1 Enterprise Redesign Playwright Verification Script:
// 1. Clean Organization Design Library (0 Generic Starters, Purposeful Empty State)
// 2. Populated Organization Library (Front + Back Previews, Clone, Edit, Bump, Archive)
// 3. 3-Pane Precision Designer (Top Autosave/Publish Bar + Bottom Trim vs Full-Bleed Bar)
// 4. Print Production Console (CR80 Trim vs Full-Bleed Table, 6 Formats, ICC Profile)
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
  console.log('🚀 Starting V2.1 Enterprise Redesign Playwright Verification Suite...');
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
      // Start with an empty organization template library to verify V2.1 clean empty state
      localStorage.removeItem('joy_id_card_org_templates_v2');
      localStorage.removeItem('joy_id_card_draft_recovery_v2_1_default-org');
    }, hrHeadUser);

    await page.goto('http://localhost:3000/id-cards', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 1. Capture Clean Empty Organization Design Library (0 Generic Starters, No Auto-Selected Demo)
    const emptyLibPath = path.join(OUT_DIR, `v2_1_clean_empty_library_${vp.name}.png`);
    await page.screenshot({ path: emptyLibPath });
    console.log(`✓ 1. V2.1 Clean Empty Organization Design Library (${vp.name}) -> ${emptyLibPath}`);

    // 2. Click "Import Yellow Geometric EPS Package" and then "Clone" to populate Organization Templates
    const importEpsBtn = page.locator('button:has-text("Import Yellow Geometric EPS Package")').first();
    if (await importEpsBtn.isVisible()) {
      await importEpsBtn.click();
      await page.waitForTimeout(700);
    }

    const cloneOrgBtn = page.locator('button:has-text("Clone")').first();
    if (await cloneOrgBtn.isVisible()) {
      await cloneOrgBtn.click();
      await page.waitForTimeout(700);
    }

    const populatedLibPath = path.join(OUT_DIR, `v2_1_org_library_populated_${vp.name}.png`);
    await page.screenshot({ path: populatedLibPath });
    console.log(`✓ 2. V2.1 Populated Organization Design Library (${vp.name}) -> ${populatedLibPath}`);

    // 3. Click "Edit" on the first Organization Template to open the 3-Pane Precision Designer
    const editBtn = page.locator('button:has-text("Edit")').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(1000);
    }

    const designerPath = path.join(OUT_DIR, `v2_1_designer_3pane_autosave_${vp.name}.png`);
    await page.screenshot({ path: designerPath });
    console.log(`✓ 3. V2.1 3-Pane Precision Designer with Top/Bottom Prepress Bars (${vp.name}) -> ${designerPath}`);

    // 4. Switch back to "Issue Cards" mode and navigate directly to Step 4 (Print Production Console)
    const issueModeBtn = page.locator('button:has-text("Issue Cards")').first();
    if (await issueModeBtn.isVisible()) {
      await issueModeBtn.click();
      await page.waitForTimeout(500);
    }

    const step4Btn = page.locator('button:has-text("4. Generate Cards")').first();
    if (await step4Btn.isVisible()) {
      await step4Btn.click();
      await page.waitForTimeout(700);
    }

    const printConsolePath = path.join(OUT_DIR, `v2_1_print_production_console_${vp.name}.png`);
    await page.screenshot({ path: printConsolePath });
    console.log(`✓ 4. V2.1 Print Production Console (${vp.name}) -> ${printConsolePath}`);

    await context.close();
  }

  await browser.close();
  console.log('\n🎉 All V2.1 Enterprise Redesign screenshots captured successfully!');
}

run().catch(err => {
  console.error('Fatal V2.1 screenshot error:', err);
  process.exit(1);
});
