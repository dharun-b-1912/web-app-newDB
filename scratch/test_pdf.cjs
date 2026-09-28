const { chromium } = require('playwright');

(async () => {
  try {
    const browser = await chromium.launch();
    console.log('Chromium launch success!');
    await browser.close();
  } catch (err) {
    console.error('Chromium launch failed:', err.message);
  }
})();
