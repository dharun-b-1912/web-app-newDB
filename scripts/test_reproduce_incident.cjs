const { chromium } = require('playwright');

async function test() {
  console.log('Launching browser to reproduce incident at http://localhost:3000/biometric...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = [];
  const errors = [];
  const pendingRequests = new Set();
  const failedRequests = [];

  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    errors.push(err.stack || err.message);
  });

  page.on('request', req => {
    pendingRequests.add(req.url());
  });

  page.on('requestfinished', req => {
    pendingRequests.delete(req.url());
  });

  page.on('requestfailed', req => {
    pendingRequests.delete(req.url());
    failedRequests.push(`${req.url()} (${req.failure()?.errorText || 'failed'})`);
  });

  try {
    console.log('Navigating to http://localhost:3000/biometric ...');
    await page.goto('http://localhost:3000/biometric', { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('DOMContentLoaded fired. Waiting 5 seconds...');
    await page.waitForTimeout(5000);

    const title = await page.title();
    const rootHtml = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        innerHTML: root ? root.innerHTML.slice(0, 500) : 'NO_ROOT',
        bodyBg: window.getComputedStyle(document.body).backgroundColor,
        rootBg: root ? window.getComputedStyle(root).backgroundColor : null,
        childrenCount: root ? root.children.length : 0,
        firstTag: root?.firstElementChild?.tagName,
        firstClass: root?.firstElementChild?.className,
      };
    });

    console.log('Page Title:', title);
    console.log('Root details:', JSON.stringify(rootHtml, null, 2));
    console.log('\n--- Console Logs (' + logs.length + ') ---');
    logs.forEach(l => console.log(l));
    console.log('\n--- Page Errors (' + errors.length + ') ---');
    errors.forEach(e => console.log(e));
    console.log('\n--- Failed Requests (' + failedRequests.length + ') ---');
    failedRequests.forEach(f => console.log(f));
    console.log('\n--- Pending Requests at end (' + pendingRequests.size + ') ---');
    Array.from(pendingRequests).slice(0, 10).forEach(p => console.log(p));

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await browser.close();
  }
}

test();
