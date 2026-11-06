// scripts/capture_step3_canvas.cjs
const { chromium } = require('playwright');
const path = require('path');

const OUT_DIR = 'C:/Users/hp/.gemini/antigravity/brain/607f29a2-17c7-4b9c-b3a0-d4836a0335af';

async function run() {
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: '1440x900', width: 1440, height: 900 },
    { name: '1920x1080', width: 1920, height: 1080 },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    await page.goto('http://localhost:3000/id-cards', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.setItem('joy_id_card_studio_v2', 'true'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Step 1 -> Step 2
    const btn1 = page.locator('button:has-text("Continue to Select People")');
    if (await btn1.isVisible()) {
      await btn1.click();
      await page.waitForTimeout(800);
    }

    // Step 2 -> Step 3
    const btn2 = page.locator('button:has-text("Review Selected")');
    if (await btn2.isVisible()) {
      await btn2.click();
      await page.waitForTimeout(1500);
    }

    const step3Path = path.join(OUT_DIR, `idcard_v2_step3_canvas_${vp.name}.png`);
    await page.screenshot({ path: step3Path });
    console.log(`Saved Step 3 Canvas (${vp.name}) to ${step3Path}`);

    await context.close();
  }

  await browser.close();
}

run().catch(console.error);

