const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.error('PAGE_ERROR:', err.message);
    console.error(err.stack);
  });
  
  page.on('console', msg => {
    console.log(`[${msg.type()}]`, msg.text());
  });

  const hrHeadUser = {
    id: '0c621892-e938-4707-9957-13534ea32c19',
    auth_user_id: '0c621892-e938-4707-9957-13534ea32c19',
    email: 'marimuthu@joycorporatesolutions.com',
    full_name: 'Mari Muthu',
    name: 'Mari Muthu',
    role: 'HR Head',
    role_display_name: 'HR Head (Company)',
    organization_id: '0c621892-e938-4707-9957-13534ea32c19',
    tenant_id: '0c621892-e938-4707-9957-13534ea32c19',
    status: 'Active',
    account_status: 'ACTIVE',
    must_change_password: false,
    roles: [{ id: 'role-hr-head', name: 'HR Head', code: 'HR_HEAD' }],
    authContext: {
      userId: '0c621892-e938-4707-9957-13534ea32c19',
      authUserId: '0c621892-e938-4707-9957-13534ea32c19',
      identity: { email: 'marimuthu@joycorporatesolutions.com', fullName: 'Mari Muthu' },
      accountStatus: 'ACTIVE',
      tenant: { organizationId: '0c621892-e938-4707-9957-13534ea32c19', organizationName: 'Joy Corporate Solutions' },
      company: { companyId: 'comp-001', companyName: 'Joy Corporate Solutions Pvt Ltd' },
      roles: ['HR_HEAD'],
      primaryRole: 'HR Head',
      scopes: { platform: false, organization: true, company: true, employee: true, vendor: false },
      portalType: 'ORGANIZATION_ADMIN',
      allowedPortals: ['ORGANIZATION_ADMIN', 'EMPLOYEE_HR'],
      defaultPortal: 'ORGANIZATION_ADMIN',
      defaultRoute: 'biometric',
      permissions: ['*']
    }
  };

  await page.addInitScript((user) => {
    localStorage.setItem('joy_user', JSON.stringify(user));
    localStorage.setItem('workforce_current_user', JSON.stringify(user));
    sessionStorage.setItem('workforce_current_user', JSON.stringify(user));
    localStorage.setItem('workforce_active_org_id', user.organization_id);
    localStorage.setItem('workforce_auth_context', 'tenant');
    localStorage.setItem('workforce_active_route', 'biometric');
  }, hrHeadUser);

  try {
    console.log('Navigating to http://localhost:3000/biometric ...');
    await page.goto('http://localhost:3000/biometric', { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(3000);
    const mainEl = await page.$('#joy-main-scroll-container');
    const mainText = mainEl ? await mainEl.innerText() : 'no #joy-main-scroll-container';
    console.log('MAIN CONTAINER TEXT:\n', mainText.slice(0, 500));
  } catch (e) {
    console.error('CATCH_ERROR:', e.message);
  } finally {
    await browser.close();
  }
})();
