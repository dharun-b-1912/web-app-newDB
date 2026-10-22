import { test, expect } from '@playwright/test';

test('Verify Live Attendance Stream renders authentic today punches and device status', async ({ page }) => {
  // Setup standard authenticated user
  await page.addInitScript(() => {
    const user = {
      id: '0c621892-e938-4707-9957-13534ea32c19',
      auth_user_id: '0c621892-e938-4707-9957-13534ea32c19',
      email: 'marimuthu@joycorporatesolutions.com',
      name: 'Mari Muthu',
      role: 'HR Head',
      organization_id: '0c621892-e938-4707-9957-13534ea32c19',
      status: 'Active',
      roles: [{ id: 'role-hr-head', name: 'HR Head' }],
    };
    localStorage.setItem('workforce_current_user', JSON.stringify(user));
  });

  await page.goto('http://localhost:3000/biometric', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Check Punches Today KPI card
  const punchesTodayCard = page.locator('text=Punches Today').locator('xpath=..');
  await expect(punchesTodayCard).toBeVisible();
  const cardText = await punchesTodayCard.textContent();
  console.log('Punches Today Card text:', cardText);

  // Check for "LIVE ATTENDANCE STREAM" section
  const liveStreamHeader = page.locator('text=LIVE ATTENDANCE STREAM');
  await expect(liveStreamHeader).toBeVisible();

  // Check that the stream shows "TODAY" badges and not old September dates
  const todayBadges = page.locator('text=TODAY');
  const countToday = await todayBadges.count();
  console.log('Found TODAY badges count:', countToday);
  expect(countToday).toBeGreaterThan(0);

  // Check for eSSL terminal device in the table
  const deviceRow = page.locator('text=eSSL AI-FACE MAGNUM Terminal');
  await expect(deviceRow.first()).toBeVisible();

  // Take screenshot for visual proof
  await page.screenshot({ path: 'scratch/biometric-live-stream-verified.png', fullPage: true });
  console.log('Screenshot saved to scratch/biometric-live-stream-verified.png');
});
