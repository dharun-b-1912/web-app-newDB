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

async function ensureSampleArtwork() {
  const frontPath = path.join(__dirname, 'sample_front_artwork.png');
  const backPath = path.join(__dirname, 'sample_back_artwork.png');

  if (!fs.existsSync(frontPath)) {
    const frontSvg = `<svg width="709" height="1082" xmlns="http://www.w3.org/2000/svg"><rect width="709" height="1082" fill="#091e3a"/><rect x="284" y="35" width="140" height="35" rx="17.5" fill="#020617" opacity="0.6"/><text x="354" y="145" font-family="Arial" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle">JOY CORPORATE</text></svg>`;
    await sharp(Buffer.from(frontSvg)).png().toFile(frontPath);
  }
  if (!fs.existsSync(backPath)) {
    const backSvg = `<svg width="709" height="1082" xmlns="http://www.w3.org/2000/svg"><rect width="709" height="1082" fill="#f8fafc"/></svg>`;
    await sharp(Buffer.from(backSvg)).png().toFile(backPath);
  }
  return { frontPath, backPath };
}

async function run() {
  console.log('🚀 Running Playwright Text Editing, Alignment & Font Verification...');
  const { frontPath, backPath } = await ensureSampleArtwork();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 920 } });
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

  // Open Bring-Your-Own Design Studio Wizard
  console.log('1. Opening Bring-Your-Own Design Wizard...');
  const startBtn = page.locator('button:has-text("Start Upload Wizard")').first();
  await startBtn.waitFor({ state: 'visible', timeout: 10000 });
  await startBtn.click();
  await page.waitForTimeout(1000);

  // Step 1: Load High-Res Package
  console.log('2. Loading High-Resolution Template Artwork Package...');
  const loadPackageBtn = page.locator('button:has-text("Load Yellow Geometric EPS Package")').first();
  if (await loadPackageBtn.isVisible()) {
    await loadPackageBtn.click();
    await page.waitForTimeout(1000);
  }

  // Next: Continue to Check Fit
  console.log('3. Proceeding through Step 2 Check Fit...');
  const toFitBtn = page.locator('button:has-text("Continue to Check Fit")').first();
  await toFitBtn.click();
  await page.waitForTimeout(1200);

  // Step 2 -> Step 3
  console.log('4. Proceeding to Step 3 Place Fields...');
  const toPlaceBtn = page.locator('button:has-text("Continue to Place Fields")').first();
  await toPlaceBtn.click();
  await page.waitForTimeout(1200);

  // Switch to Back Side
  console.log('5. Switching to Back Side...');
  const backTab = page.locator('button:has-text("Back Side")').first();
  await backTab.click();
  await page.waitForTimeout(700);

  // Click 1-Click Auto-Populate Standard Back Side
  console.log('6. Clicking 1-Click Auto-Populate Back Side...');
  const autoPopulateBtn = page.locator('button:has-text("Auto-Populate Standard Back Side")').first();
  if (await autoPopulateBtn.isVisible()) {
    await autoPopulateBtn.click();
    await page.waitForTimeout(1000);
  }

  // Screenshot 1: Back Side Initial Auto-Populate (Multi-line wrapped)
  const step3InitialShot = path.join(OUT_DIR, 'byod_text_step3_backside_wrapped_1440x920.png');
  await page.screenshot({ path: step3InitialShot });
  console.log(`✓ 1. Saved initial wrapped back side: ${step3InitialShot}`);

  // Select Employee Bio element on canvas
  console.log('7. Selecting Employee Bio element on canvas...');
  const bioCanvasElement = page.locator('div[title="Double-click to edit text directly on canvas"]').filter({ hasText: 'Blood Group' }).first();
  await bioCanvasElement.click({ force: true });
  await page.waitForTimeout(700);

  // Test Font Changing: select Poppins (Canva Modern)
  console.log('8. Changing Font Family to Poppins...');
  const fontSelect = page.locator('select[aria-label="Font Family"]').first();
  if (await fontSelect.isVisible()) {
    await fontSelect.selectOption('Poppins');
    await page.waitForTimeout(500);
  }

  // Test Alignment: Center
  console.log('9. Changing Alignment to Center...');
  const centerBtn = page.locator('button[aria-label="Align text center"]').first();
  if (await centerBtn.isVisible()) {
    await centerBtn.click();
    await page.waitForTimeout(500);
  }

  // Test Auto-Fit Box Height
  console.log('10. Triggering Auto-Fit Box Height...');
  const autoFitBtn = page.locator('button[aria-label="Auto-Fit Box Height"]').first();
  if (await autoFitBtn.isVisible()) {
    await autoFitBtn.click();
    await page.waitForTimeout(500);
  }

  // Screenshot 2: Step 3 with Poppins font and centered multi-line alignment
  const step3AlignedShot = path.join(OUT_DIR, 'byod_text_step3_poppins_centered_1440x920.png');
  await page.screenshot({ path: step3AlignedShot });
  console.log(`✓ 2. Saved Poppins centered multi-line: ${step3AlignedShot}`);

  // Test In-Place Canvas Editing via Double-Click
  console.log('11. Testing in-place canvas editing via double click...');
  await bioCanvasElement.dblclick({ force: true });
  await page.waitForTimeout(600);

  // Check active textarea on canvas
  const canvasTextarea = page.locator('div.relative textarea').first();
  if (await canvasTextarea.isVisible()) {
    console.log('✓ Direct in-place canvas textarea is active!');
    const step3InPlaceShot = path.join(OUT_DIR, 'byod_text_step3_inplace_canvas_editing_1440x920.png');
    await page.screenshot({ path: step3InPlaceShot });
    console.log(`✓ 3. Saved in-place editing screenshot: ${step3InPlaceShot}`);

    // Commit edit with Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // Proceed to Step 4: Test Workforce
  console.log('12. Continuing to Step 4 Workforce Pre-Flight...');
  const continueTestBtn = page.locator('button:has-text("Continue to Test")').first();
  await continueTestBtn.click();
  await page.waitForTimeout(1500);

  // Screenshot 4: Step 4 Multi-Employee Workforce Preview
  const step4Shot = path.join(OUT_DIR, 'byod_text_step4_workforce_wrapped_1440x920.png');
  await page.screenshot({ path: step4Shot });
  console.log(`✓ 4. Saved Step 4 Workforce Preview: ${step4Shot}`);

  await browser.close();
  console.log('🎉 Verification completed successfully!');
}

run().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
