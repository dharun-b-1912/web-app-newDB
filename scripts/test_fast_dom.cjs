const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('Fast diagnostic without font-waiting screenshot...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

  page.on('console', msg => console.log(`[BROWSER_${msg.type().toUpperCase()}]`, msg.text()));
  page.on('pageerror', err => console.error('[BROWSER_UNCAUGHT]', err.message, err.stack));

  const hrHeadUser = {
    id: '0c621892-e938-4707-9957-13534ea32c19',
    auth_user_id: '0c621892-e938-4707-9957-13534ea32c19',
    email: 'marimuthu@joycorporatesolutions.com',
    full_name: 'Mari Muthu',
    name: 'Mari Muthu',
    role: 'HR Head',
    organization_id: '0c621892-e938-4707-9957-13534ea32c19',
    roles: [{ id: 'role-hr-head', name: 'HR Head', code: 'HR_HEAD' }],
    authContext: {
      userId: '0c621892-e938-4707-9957-13534ea32c19',
      roles: ['HR_HEAD'],
      permissions: ['*']
    }
  };

  await page.addInitScript((user) => {
    localStorage.setItem('joy_user', JSON.stringify(user));
    localStorage.setItem('workforce_current_user', JSON.stringify(user));
  }, hrHeadUser);

  await page.goto('http://localhost:3000/biometric', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const manageBtn = await page.$('[data-testid="device-manage-btn"], [id^="device-row-manage-btn"]');
  console.log('Manage button found?', !!manageBtn);
  if (!manageBtn) {
    const html = await page.content();
    fs.writeFileSync('page_dom_no_manage.html', html);
    await browser.close();
    return;
  }

  console.log('Clicking manage button...');
  await manageBtn.click();
  await page.waitForTimeout(1500);

  const domSummary = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('[id^="workspace-tab-"]')).map(el => ({
      id: el.id,
      text: el.textContent?.trim(),
      visible: el.offsetParent !== null
    }));
    const h1 = document.querySelector('h1')?.textContent?.trim();
    const h2 = document.querySelector('h2')?.textContent?.trim();
    const h3 = Array.from(document.querySelectorAll('h3')).map(e => e.textContent?.trim());
    return {
      url: window.location.href,
      h1,
      h2,
      h3,
      tabsCount: tabs.length,
      tabs
    };
  });

  console.log('DOM Summary after clicking manage button:');
  console.log(JSON.stringify(domSummary, null, 2));

  await browser.close();
  console.log('Done!');
})();
