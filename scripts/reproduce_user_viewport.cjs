const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: true });
  // Viewport exactly matching user screenshot: 1643 x 1296
  const context = await browser.newContext({
    viewport: { width: 1643, height: 1296 },
    colorScheme: 'dark' // What if user has dark mode enabled in OS/Chrome?
  });
  const page = await context.newPage();

  console.log('Testing dark color scheme at 1643x1296 ...');
  await page.goto('http://localhost:3000/biometric', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: 'scratch/user_view_dark_mode.png' });

  const bodyBg = await page.evaluate(() => {
    return {
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
      htmlBg: window.getComputedStyle(document.documentElement).backgroundColor,
      rootBg: window.getComputedStyle(document.getElementById('root')).backgroundColor,
      classes: document.documentElement.className,
      hasDarkClass: document.documentElement.classList.contains('dark'),
    };
  });

  console.log('DOM Backgrounds:', bodyBg);
  await browser.close();
}

test();
