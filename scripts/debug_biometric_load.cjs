const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('response', res => {
    if (res.status() >= 400) {
      console.log('HTTP', res.status(), res.url());
    }
  });

  page.on('console', msg => {
    console.log('CONSOLE [' + msg.type() + ']:', msg.text());
  });

  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });

  await page.goto('http://localhost:3000/biometric');
  await page.waitForTimeout(3000);
  await browser.close();
})();
