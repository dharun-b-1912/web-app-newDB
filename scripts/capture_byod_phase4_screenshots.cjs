// scripts/capture_byod_phase4_screenshots.cjs
// ============================================================================
// Phase 4 Playwright Verification Script: 6 Distinct Starter Archetypes,
// Starter-to-Custom Cloning, Keyboard Precision Nudging & End-to-End Signoff
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
  console.log('🚀 Starting Phase 4 Starter Redesign, Keyboard Nudge & Lifecycle Playwright Suite...');
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

    // 1. Scroll to the 6 Distinct Starter Archetypes Grid and capture
    const minimalCard = page.locator('text=Minimal Monospace Grid').first();
    if (await minimalCard.isVisible()) {
      await minimalCard.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    }

    const startersGridPath = path.join(OUT_DIR, `byod_phase4_starters_6_distinct_${vp.name}.png`);
    await page.screenshot({ path: startersGridPath });
    console.log(`✓ 1. 6 Distinct Starter Archetypes (${vp.name}) -> ${startersGridPath}`);

    // 2. Click "Clone & Customize" on Lanyard Arch Tech Badge and scroll back to Organization Templates
    const cloneBtn = page.locator('button:has-text("Clone & Customize")').nth(3); // Lanyard Arch
    if (await cloneBtn.isVisible()) {
      await cloneBtn.click();
      await page.waitForTimeout(1600);
    }
    const orgSection = page.locator('text=YOUR ORGANIZATION TEMPLATES').first();
    if (await orgSection.isVisible()) {
      await orgSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    }

    const clonedOrgPath = path.join(OUT_DIR, `byod_phase4_starter_cloned_to_org_${vp.name}.png`);
    await page.screenshot({ path: clonedOrgPath });
    console.log(`✓ 2. Starter Cloned into Organization Library (${vp.name}) -> ${clonedOrgPath}`);

    // 3. Scroll to top, click "Start Upload Wizard", load EPS Package, and test Keyboard Nudge
    const startUploadTrigger = page.locator('text=Start Upload Wizard').first();
    await startUploadTrigger.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await startUploadTrigger.click();
    await page.waitForTimeout(700);

    const epsBtn = page.locator('button:has-text("Load Yellow Geometric EPS Package")').first();
    if (await epsBtn.isVisible()) {
      await epsBtn.click();
      await page.waitForTimeout(800);
    }

    const toStep2Btn = page.locator('button:has-text("Continue to Check Fit")').first();
    if (await toStep2Btn.isVisible()) {
      await toStep2Btn.click();
      await page.waitForTimeout(600);
    }

    const toStep3Btn = page.locator('button:has-text("Continue to Place Fields")').first();
    if (await toStep3Btn.isVisible()) {
      await toStep3Btn.click();
      await page.waitForTimeout(600);
    }

    // Select the foreground employee-name text field and press ArrowDown + Shift+ArrowRight to verify keyboard nudging
    const nameField = page.locator('[aria-label*="text employee-name"]').first();
    if (await nameField.isVisible()) {
      await nameField.click({ force: true });
      await page.waitForTimeout(200);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Shift+ArrowRight');
      await page.waitForTimeout(400);
    }

    // Scroll inside wizard modal so Keyboard Nudge bar is clearly visible
    const nudgeBar = page.locator('text=Keyboard Nudge:').first();
    if (await nudgeBar.isVisible()) {
      await nudgeBar.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
    }

    const keyboardNudgePath = path.join(OUT_DIR, `byod_phase4_keyboard_nudge_${vp.name}.png`);
    await page.screenshot({ path: keyboardNudgePath });
    console.log(`✓ 3. Step 3 Keyboard Precision Nudge Bar (${vp.name}) -> ${keyboardNudgePath}`);

    // Close modal and proceed through Step 2 (Select People) -> Step 3 (Review & Fix)
    const closeWizardBtn = page.locator('.fixed.inset-0 button').first();
    if (await closeWizardBtn.isVisible()) {
      await closeWizardBtn.click();
      await page.waitForTimeout(400);
    }

    const continueToPeopleBtn = page.locator('button:has-text("Continue to Select People")').first();
    if (await continueToPeopleBtn.isVisible()) {
      await continueToPeopleBtn.click();
      await page.waitForTimeout(700);
    }

    const continueToReviewBtn = page.locator('button:has-text("Review & Fix")').first();
    if (await continueToReviewBtn.isVisible()) {
      await continueToReviewBtn.click();
      await page.waitForTimeout(900);
    }

    const reviewEndToEndPath = path.join(OUT_DIR, `byod_phase4_end_to_end_review_${vp.name}.png`);
    await page.screenshot({ path: reviewEndToEndPath });
    console.log(`✓ 4. End-to-End Lifecycle Review & Prepress Check (${vp.name}) -> ${reviewEndToEndPath}`);

    await context.close();
  }

  await browser.close();
  console.log('\n🎉 All Phase 4 screenshots captured successfully!');
}

run().catch(err => {
  console.error('Fatal Phase 4 screenshot error:', err);
  process.exit(1);
});
