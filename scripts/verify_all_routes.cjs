const { chromium } = require('playwright');

(async () => {
  console.log('Testing /biometric root page and Face Recognition channel view...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('[BROWSER_ERROR]', msg.text());
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    console.error('[BROWSER_UNCAUGHT]', err.message);
    errors.push(err.message);
  });

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

  // 1. Check /biometric root
  console.log('1. Checking /biometric root page...');
  await page.goto('http://localhost:3000/biometric', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const biometricRootCheck = await page.evaluate(() => {
    return {
      title: document.title,
      deviceRows: document.querySelectorAll('tbody tr').length,
      hasManageBtn: !!document.querySelector('[data-testid="device-manage-btn"], [id^="device-row-manage-btn"]'),
      bodySnippet: document.body.innerText.slice(0, 200).replace(/\n+/g, ' ')
    };
  });
  console.log('Biometric root check:', biometricRootCheck);

  // 2. Check Face Recognition Channel (/biometric/face)
  console.log('\n2. Checking Face Recognition Channel (/biometric/face)...');
  await page.goto('http://localhost:3000/biometric/face', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const faceCheck = await page.evaluate(() => {
    return {
      title: document.title,
      headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent?.trim()).slice(0, 3),
      punchRows: document.querySelectorAll('tbody tr').length,
      bodySnippet: document.body.innerText.slice(0, 200).replace(/\n+/g, ' ')
    };
  });
  console.log('Face Recognition view check:', faceCheck);

  console.log('\nTotal console/page errors detected:', errors.length);
  if (errors.length > 0) {
    console.log('Errors:', errors);
  }

  await browser.close();
  console.log('Verification finished.');
})();
