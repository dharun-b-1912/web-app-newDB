import { test, expect } from '@playwright/test';

function sanitizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return rawUrl;
  }
}

test.describe('P0 Deep Lifecycle Diagnostic: Auth & Tenant Resolution Loop Audit', () => {

  test('Monitor [BOOT] events and interaction stability on /biometric', async ({ page }) => {
    test.setTimeout(120000);
    const bootEvents: Array<{ event: string; timestamp: number; text: string }> = [];
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    const failedRequests: Array<{ url: string; error?: string }> = [];
    const slowRequests: Array<{ url: string; durationMs: number }> = [];

    page.on('pageerror', err => {
      console.error('[PW][PAGE_ERROR]', err.message);
      pageErrors.push(err.message);
    });

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[BOOT]')) {
        bootEvents.push({
          event: text.split(':')[0].trim(),
          timestamp: Date.now(),
          text,
        });
        console.log('[PW][BOOT]', text);
      }
      if (msg.type() === 'error') {
        console.error('[PW][CONSOLE_ERROR]', text);
        consoleErrors.push(text);
      }
    });

    const requestStartTimes = new WeakMap<any, number>();

    page.on('request', req => {
      requestStartTimes.set(req, Date.now());
    });

    page.on('requestfinished', req => {
      const start = requestStartTimes.get(req);
      if (start) {
        const duration = Date.now() - start;
        if (duration > 3000) {
          slowRequests.push({ url: sanitizeUrl(req.url()), durationMs: duration });
          console.warn('[PW][SLOW_REQUEST]', sanitizeUrl(req.url()), `${duration}ms`);
        }
      }
    });

    page.on('requestfailed', req => {
      const start = requestStartTimes.get(req);
      const duration = start ? Date.now() - start : 0;
      failedRequests.push({
        url: sanitizeUrl(req.url()),
        error: req.failure()?.errorText,
      });
      console.warn('[PW][REQUEST_FAILED]', sanitizeUrl(req.url()), req.failure()?.errorText, `after ${duration}ms`);
    });

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

    console.log(`\n[${new Date().toISOString()}] --- Step 1: Navigate to http://localhost:3000/biometric ---`);
    const navStartTime = Date.now();
    await page.goto('http://localhost:3000/biometric', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Wait for the page to settle
    await page.waitForTimeout(3000);

    const rootHtml = await page.locator('#root').innerHTML();
    expect(rootHtml.trim().length).toBeGreaterThan(1000);

    // Count organization_started and auth_started events
    const orgStartCount = bootEvents.filter(e => e.text.includes('organization_started')).length;
    const authStartCount = bootEvents.filter(e => e.text.includes('auth_started')).length;
    console.log(`[${new Date().toISOString()}] Initial Boot Metrics: org_started=${orgStartCount}, auth_started=${authStartCount}`);

    console.log(`\n[${new Date().toISOString()}] --- Step 2: Repeated scrolling on /biometric ---`);
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 400));
      await page.waitForTimeout(100);
      await page.evaluate(() => window.scrollBy(0, -400));
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(1000);

    const orgStartAfterScroll = bootEvents.filter(e => e.text.includes('organization_started')).length;
    console.log(`[${new Date().toISOString()}] After Scrolling: org_started=${orgStartAfterScroll} (difference: ${orgStartAfterScroll - orgStartCount})`);

    console.log(`\n[${new Date().toISOString()}] --- Step 3: Open & Close Diagnostics HUD ---`);
    const diagBtn = page.getByRole('button', { name: /diagnostics/i }).first();
    if (await diagBtn.isVisible()) {
      await diagBtn.click();
      await page.waitForTimeout(1000);
      const closeBtn = page.getByRole('button', { name: /close/i }).first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    }

    console.log(`\n[${new Date().toISOString()}] --- Step 4: Exercise client-side SPA navigation to other SaaS routes and return ---`);
    const orgCountBeforeNav = bootEvents.filter(e => e.text.includes('organization_started')).length;

    // Navigate to /attendance
    await page.evaluate(() => {
      window.history.pushState(null, '', '/attendance');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForTimeout(1500);

    // Navigate to /leave
    await page.evaluate(() => {
      window.history.pushState(null, '', '/leave');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForTimeout(1500);

    // Navigate back to /biometric
    await page.evaluate(() => {
      window.history.pushState(null, '', '/biometric');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForTimeout(2000);

    const orgCountAfterNav = bootEvents.filter(e => e.text.includes('organization_started')).length;
    console.log(`[${new Date().toISOString()}] After Multi-Route SPA Navigation: org_started=${orgCountAfterNav} (new starts: ${orgCountAfterNav - orgCountBeforeNav})`);

    const finalHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML || '');
    expect(finalHtml.trim().length).toBeGreaterThan(1000);

    const totalDuration = Date.now() - navStartTime;
    console.log(`\n--- Diagnostic Summary ---`);
    console.log(`Total Run Duration: ${totalDuration}ms`);
    console.log(`Total Boot Events: ${bootEvents.length}`);
    console.log(`Total Page Errors: ${pageErrors.length}`);
    console.log(`Total Console Errors: ${consoleErrors.length}`);
    console.log(`Total Failed Requests: ${failedRequests.length}`);
    console.log(`Total Slow Requests (>3s): ${slowRequests.length}`);

    expect(pageErrors.length).toBe(0);
  });
});
