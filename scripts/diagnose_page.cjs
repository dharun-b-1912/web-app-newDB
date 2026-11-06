const { chromium } = require('playwright');

const hrHeadUser = {
  id: '0c621892-e938-4707-9957-13534ea32c19',
  email: 'marimuthu@joycorporatesolutions.com',
  full_name: 'Mari Muthu',
  role: 'HR Head',
  organization_id: '0c621892-e938-4707-9957-13534ea32c19',
  status: 'Active'
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.addInitScript((u) => {
    localStorage.setItem('joy_user', JSON.stringify(u));
    localStorage.setItem('workforce_current_user', JSON.stringify(u));
    sessionStorage.setItem('workforce_current_user', JSON.stringify(u));
    localStorage.setItem('joy_id_card_studio_v2', 'true');
  }, hrHeadUser);

  await page.goto('http://localhost:3000/id-cards', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const textV2 = await page.innerText('body');
  console.log('=== V2 Contains "1. Choose Template"? ===', textV2.includes('1. Choose Template'));
  console.log('=== V2 Contains "ID Card Studio"? ===', textV2.includes('ID Card Studio'));
  console.log('=== V2 Contains "Corporate Executive"? ===', textV2.includes('Corporate Executive'));

  await page.evaluate(() => localStorage.setItem('joy_id_card_studio_v2', 'false'));
  await page.goto('http://localhost:3000/id-cards', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const textV1 = await page.innerText('body');
  console.log('=== V1 Contains "ID Card Press"? ===', textV1.includes('ID Card Press'));
  console.log('=== V1 Contains "Show trim, bleed and safe lines"? ===', textV1.includes('Show trim, bleed and safe lines'));
  console.log('=== V1 Contains "CR80 landscape"? ===', textV1.includes('CR80 landscape'));

  await browser.close();
})();
