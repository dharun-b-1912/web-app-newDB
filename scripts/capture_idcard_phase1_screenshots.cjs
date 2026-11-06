// scripts/capture_idcard_phase1_screenshots.cjs
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
  console.log('Capturing all Phase 1 screenshots...');
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

    // 1. Capture V2 Step 1: Choose Template
    await page.goto('http://localhost:3000/id-cards', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const v2Step1Path = path.join(OUT_DIR, `idcard_v2_step1_template_${vp.name}.png`);
    await page.screenshot({ path: v2Step1Path });
    console.log(`✓ Saved V2 Step 1 (${vp.name}) -> ${v2Step1Path}`);

    // Click Next to Step 2
    const cta1 = page.locator('header button:has-text("Next: Select People")');
    if (await cta1.isVisible()) {
      await cta1.click();
      await page.waitForTimeout(1500);

      // 2. Capture V2 Step 2: Select People
      const v2Step2Path = path.join(OUT_DIR, `idcard_v2_step2_people_${vp.name}.png`);
      await page.screenshot({ path: v2Step2Path });
      console.log(`✓ Saved V2 Step 2 (${vp.name}) -> ${v2Step2Path}`);

      // Click Next to Step 3
      const cta2 = page.locator('header button:has-text("Next: Review & Fix")');
      if (await cta2.isVisible()) {
        await cta2.click();
        await page.waitForTimeout(2000);

        // 3. Capture V2 Step 3: Review & Canvas
        const v2Step3Path = path.join(OUT_DIR, `idcard_v2_step3_canvas_${vp.name}.png`);
        await page.screenshot({ path: v2Step3Path });
        console.log(`✓ Saved V2 Step 3 (${vp.name}) -> ${v2Step3Path}`);
      }
    }

    // 4. Capture Mode B: Edit Template Designer
    const editModeBtn = page.locator('header button:has-text("Edit Template")');
    if (await editModeBtn.isVisible()) {
      await editModeBtn.click();
      await page.waitForTimeout(2000);

      const v2ModeBPath = path.join(OUT_DIR, `idcard_v2_mode_b_designer_${vp.name}.png`);
      await page.screenshot({ path: v2ModeBPath });
      console.log(`✓ Saved V2 Mode B Designer (${vp.name}) -> ${v2ModeBPath}`);
    }

    // 5. Capture Legacy V1 Studio
    await page.evaluate(() => {
      localStorage.setItem('joy_id_card_studio_v2', 'false');
    });
    await page.goto('http://localhost:3000/id-cards', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const v1Path = path.join(OUT_DIR, `idcard_v1_legacy_${vp.name}.png`);
    await page.screenshot({ path: v1Path });
    console.log(`✓ Saved Legacy V1 (${vp.name}) -> ${v1Path}`);

    // Reset back to V2 as default
    await page.evaluate(() => {
      localStorage.setItem('joy_id_card_studio_v2', 'true');
    });

    await context.close();
  }

  await browser.close();
  console.log('\nAll genuine before/after screenshots captured successfully!');
}

run().catch(err => {
  console.error('Capture script error:', err);
  process.exit(1);
});
