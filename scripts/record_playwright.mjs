import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const RECORDINGS_DIR = path.resolve('recordings');
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

console.log('[Recorder] Launching Chrome via Playwright...');

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: false,
  args: [
    '--window-size=440,960',
    '--disable-web-security',
    '--no-sandbox',
    '--disable-infobars',
    '--disable-extensions',
  ],
});

const context = await browser.newContext({
  viewport: { width: 420, height: 900 },
  deviceScaleFactor: 2,
  recordVideo: {
    dir: RECORDINGS_DIR,
    size: { width: 420, height: 900 },
  },
  permissions: ['geolocation'],
  geolocation: { latitude: 11.0844, longitude: 77.1263 },
});

const page = await context.newPage();

console.log('[Recorder] Navigating to http://127.0.0.1:8089/ ...');
await page.goto('http://127.0.0.1:8089/', { waitUntil: 'domcontentloaded', timeout: 30000 });

// Wait for Flutter web to mount and load initial widgets
console.log('[Recorder] Waiting for Flutter app to initialize...');
await page.waitForTimeout(6000);

// Capture screenshot of Home Screen
await page.screenshot({ path: path.join(RECORDINGS_DIR, '01_home_screen.png') });
console.log('[Recorder] Step 1: Captured Home Screen');
await page.waitForTimeout(2000);

// Step 2: Click on the Current Location Card (x=110, y=220 on 420x900)
// This triggers the LocationProminentDisclosureDialog
console.log('[Recorder] Step 2: Clicking Current Location Card to display Prominent Disclosure...');
await page.mouse.click(110, 220);
await page.waitForTimeout(1500);

// Capture screenshot of the Prominent Disclosure Dialog
await page.screenshot({ path: path.join(RECORDINGS_DIR, '02_prominent_disclosure_dialog.png') });
console.log('[Recorder] Step 2: Prominent Disclosure Dialog displayed and captured');

// Hold for 7 seconds so the Google Play reviewer can clearly read the background disclosure
console.log('[Recorder] Holding disclosure on screen for reviewer readability (7s)...');
await page.waitForTimeout(7000);

// Step 3: Click "Agree & Continue" button on the Prominent Disclosure Dialog
console.log('[Recorder] Step 3: Clicking Agree & Continue...');
await page.mouse.click(300, 700);
await page.waitForTimeout(3000);

// Capture screenshot after consent
await page.screenshot({ path: path.join(RECORDINGS_DIR, '03_after_consent_home.png') });
console.log('[Recorder] Step 3: Consent recorded, back on Home Screen');
await page.waitForTimeout(3000);

// Step 4: Click the Shift GPS text button or open Locations
console.log('[Recorder] Step 4: Navigating to Live Location & Google Map screen...');
await page.mouse.click(110, 285);
await page.waitForTimeout(5000);

// Capture screenshot of Google Map Screen
await page.screenshot({ path: path.join(RECORDINGS_DIR, '04_location_map_screen.png') });
console.log('[Recorder] Step 4: Location Map Screen displayed');
await page.waitForTimeout(4000);

// Step 5: Click the Info icon in the AppBar on Location screen to show disclosure on demand
console.log('[Recorder] Step 5: Clicking Location Policy Info icon on map screen...');
await page.mouse.click(345, 45);
await page.waitForTimeout(2000);

// Capture screenshot of disclosure from map screen
await page.screenshot({ path: path.join(RECORDINGS_DIR, '05_disclosure_from_map.png') });
await page.waitForTimeout(6000);

// Step 6: Click Agree & Continue to dismiss
await page.mouse.click(300, 700);
await page.waitForTimeout(2000);

// Step 7: Click Back button on Location screen (top-left x=25, y=45)
console.log('[Recorder] Step 7: Returning to Home Screen...');
await page.mouse.click(25, 45);
await page.waitForTimeout(3000);

await page.screenshot({ path: path.join(RECORDINGS_DIR, '06_final_home_screen.png') });
console.log('[Recorder] Step 7: Completed full location flow');

// Finalize and save video
console.log('[Recorder] Closing context to finalize video recording...');
await context.close();
await browser.close();

// Find recorded video file in RECORDINGS_DIR
const files = fs.readdirSync(RECORDINGS_DIR);
const videoFile = files.find(f => f.endsWith('.webm') && f !== 'google_play_location_disclosure_demo.webm');
if (videoFile) {
  const finalPath = path.join(RECORDINGS_DIR, 'google_play_location_disclosure_demo.webm');
  fs.copyFileSync(path.join(RECORDINGS_DIR, videoFile), finalPath);
  console.log(`[Recorder] SUCCESS! Video recorded and saved to:\n${finalPath}`);
} else {
  console.log('[Recorder] Recording completed. Check recordings directory for output.');
}
