// scripts/capture_byod_phase1_screenshots.cjs
// ============================================================================
// Phase 1 Playwright Verification Script: Bring-Your-Own ID Card Design System
// Captures before/after UI, 5-step Wizard, and 3-employee side-by-side previews.
// ============================================================================

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

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

async function createSampleArtworkFiles() {
  const frontPath = path.join(__dirname, 'sample_front_artwork.png');
  const backPath = path.join(__dirname, 'sample_back_artwork.png');

  // CR80 Portrait at 300 DPI with 3mm bleed = 709 x 1082 px
  const frontSvg = `
  <svg width="709" height="1082" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#091e3a"/>
        <stop offset="35%" stop-color="#0f2f57"/>
        <stop offset="68%" stop-color="#f8fafc"/>
        <stop offset="100%" stop-color="#ffffff"/>
      </linearGradient>
      <linearGradient id="accGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#059669"/>
        <stop offset="100%" stop-color="#10b981"/>
      </linearGradient>
    </defs>
    <!-- Background -->
    <rect width="709" height="1082" fill="url(#bgGrad)"/>
    
    <!-- Top Punch Slot Marker (Safe zone indicator) -->
    <rect x="284" y="35" width="140" height="35" rx="17.5" fill="#020617" opacity="0.6"/>
    
    <!-- Header Branding -->
    <text x="354" y="145" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">JOY CORPORATE</text>
    <text x="354" y="175" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#93c5fd" text-anchor="middle" letter-spacing="2">OFFICIAL CREDENTIAL BADGE</text>
    
    <!-- Modern Wave Accent -->
    <path d="M 0 760 Q 250 710 709 750 L 709 775 Q 250 735 0 785 Z" fill="url(#accGrad)"/>
    
    <!-- Bottom Footer Bar -->
    <rect x="0" y="1035" width="709" height="47" fill="#091e3a"/>
    <text x="354" y="1064" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="600" fill="#94a3b8" text-anchor="middle">www.joypeoplehr.com • Coimbatore, India</text>
  </svg>
  `;

  const backSvg = `
  <svg width="709" height="1082" xmlns="http://www.w3.org/2000/svg">
    <rect width="709" height="1082" fill="#f8fafc"/>
    <rect x="0" y="0" width="709" height="40" fill="#091e3a"/>
    <text x="354" y="100" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#091e3a" text-anchor="middle">TERMS &amp; SECURITY INSTRUCTIONS</text>
    <rect x="0" y="1040" width="709" height="42" fill="#091e3a"/>
  </svg>
  `;

  await sharp(Buffer.from(frontSvg)).png().toFile(frontPath);
  await sharp(Buffer.from(backSvg)).png().toFile(backPath);
  console.log('✓ Generated sample high-res artwork PNGs (709 x 1082 px, 300 DPI)');

  return { frontPath, backPath };
}

async function run() {
  console.log('🚀 Starting Phase 1 Bring-Your-Own Design Playwright Suite...');
  const { frontPath, backPath } = await createSampleArtworkFiles();

  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: '1440x900', width: 1440, height: 900 },
    { name: '1920x1080', width: 1920, height: 1080 }
  ];

  for (const vp of viewports) {
    console.log(`\n================ Viewport: ${vp.name} ================`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    // Authenticate as HR Head with V2 enabled
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

    // 1. Capture Step 1 Gallery with Create Row
    const step1Path = path.join(OUT_DIR, `byod_step1_gallery_${vp.name}.png`);
    await page.screenshot({ path: step1Path });
    console.log(`✓ 1. Step 1 Gallery with Create Row (${vp.name}) -> ${step1Path}`);

    // Click "Upload My Design (Own Artwork)"
    const uploadTrigger = page.locator('text=Upload My Design (Own Artwork)').first();
    await uploadTrigger.click();
    await page.waitForTimeout(1000);

    // 2. Capture Wizard Step 1: Upload Modal
    const wizardStep1Path = path.join(OUT_DIR, `byod_wizard_step1_upload_${vp.name}.png`);
    await page.screenshot({ path: wizardStep1Path });
    console.log(`✓ 2. Wizard Step 1 Upload Modal (${vp.name}) -> ${wizardStep1Path}`);

    // Upload Front Artwork file
    const fileInputs = page.locator('input[type="file"]');
    await fileInputs.nth(0).setInputFiles(frontPath);
    await page.waitForTimeout(1000);

    // Confirm legal rights checkbox
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count > 0) {
      await checkboxes.last().check();
    }
    await page.waitForTimeout(600);

    // Click "Continue to Check Fit"
    const continueBtn = page.locator('button:has-text("Continue to Check Fit")');
    await continueBtn.click();
    await page.waitForTimeout(1200);

    // 3. Capture Wizard Step 2: Check Fit & Bleed
    const wizardStep2Path = path.join(OUT_DIR, `byod_wizard_step2_check_fit_${vp.name}.png`);
    await page.screenshot({ path: wizardStep2Path });
    console.log(`✓ 3. Wizard Step 2 Check Fit & Bleed (${vp.name}) -> ${wizardStep2Path}`);

    // Click "Continue to Place Fields"
    const placeFieldsBtn = page.locator('button:has-text("Continue to Place Fields")');
    await placeFieldsBtn.click();
    await page.waitForTimeout(1200);

    // 4. Capture Wizard Step 3: Place Fields
    const wizardStep3Path = path.join(OUT_DIR, `byod_wizard_step3_place_fields_${vp.name}.png`);
    await page.screenshot({ path: wizardStep3Path });
    console.log(`✓ 4. Wizard Step 3 Place Fields (${vp.name}) -> ${wizardStep3Path}`);

    // Click "Continue to Test"
    const testBtn = page.locator('button:has-text("Continue to Test")');
    await testBtn.click();
    await page.waitForTimeout(1500);

    // 5. Capture Wizard Step 4: Test Workforce Strip (3 real employees preview)
    const wizardStep4Path = path.join(OUT_DIR, `byod_wizard_step4_test_workforce_${vp.name}.png`);
    await page.screenshot({ path: wizardStep4Path });
    console.log(`✓ 5. Wizard Step 4 Test Workforce Strip (${vp.name}) -> ${wizardStep4Path}`);

    // Click "Review & Publish"
    const reviewPublishBtn = page.locator('button:has-text("Review & Publish")');
    await reviewPublishBtn.click();
    await page.waitForTimeout(1000);

    // 6. Capture Wizard Step 5: Publish Template
    const wizardStep5Path = path.join(OUT_DIR, `byod_wizard_step5_publish_${vp.name}.png`);
    await page.screenshot({ path: wizardStep5Path });
    console.log(`✓ 6. Wizard Step 5 Publish (${vp.name}) -> ${wizardStep5Path}`);

    // Click "Publish Version 1.0"
    const publishFinalBtn = page.locator('button:has-text("Publish Version 1.0")');
    await publishFinalBtn.click();
    await page.waitForTimeout(2000);

    // 7. Capture Gallery with the newly published Organization Template
    const postPublishStep1Path = path.join(OUT_DIR, `byod_gallery_with_published_template_${vp.name}.png`);
    await page.screenshot({ path: postPublishStep1Path });
    console.log(`✓ 7. Gallery with Published Template (${vp.name}) -> ${postPublishStep1Path}`);

    // Advance to Step 3 (Review & Fix) to see the live custom card rendered in the studio
    const ctaNext1 = page.locator('header button:has-text("Next: Select People")');
    if (await ctaNext1.isVisible()) {
      await ctaNext1.click();
      await page.waitForTimeout(1500);

      const ctaNext2 = page.locator('header button:has-text("Next: Review & Fix")');
      if (await ctaNext2.isVisible()) {
        await ctaNext2.click();
        await page.waitForTimeout(2000);

        const liveStudioReviewPath = path.join(OUT_DIR, `byod_studio_step3_review_${vp.name}.png`);
        await page.screenshot({ path: liveStudioReviewPath });
        console.log(`✓ 8. Studio Review with Published Design (${vp.name}) -> ${liveStudioReviewPath}`);
      }
    }

    await context.close();
  }

  await browser.close();
  console.log('\n🎉 All Phase 1 Bring-Your-Own Design screenshots captured successfully!');
}

run().catch(err => {
  console.error('Fatal screenshot error:', err);
  process.exit(1);
});
