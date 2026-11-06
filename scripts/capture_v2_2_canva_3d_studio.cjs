// scripts/capture_v2_2_canva_3d_studio.cjs
const { chromium } = require('playwright');
const path = require('path');

const OUT_DIR = 'C:/Users/hp/.gemini/antigravity/brain/607f29a2-17c7-4b9c-b3a0-d4836a0335af';

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
    defaultRoute: 'people',
    permissions: ['*']
  }
};

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.addInitScript((user) => {
    localStorage.setItem('joy_user', JSON.stringify(user));
    localStorage.setItem('workforce_current_user', JSON.stringify(user));
    sessionStorage.setItem('workforce_current_user', JSON.stringify(user));
    localStorage.setItem('workforce_active_org_id', user.organization_id);
    localStorage.setItem('workforce_auth_context', 'tenant');
    localStorage.setItem('workforce_active_route', 'id-cards');
    localStorage.setItem('joy_id_card_studio_v2', 'true');
    localStorage.removeItem('joy_id_card_org_templates_v2');
    localStorage.removeItem('joy_id_card_draft_recovery_v2_1_default-org');
    localStorage.removeItem('joy_id_card_draft_recovery_v2_1_0c621892-e938-4707-9957-13534ea32c19');
  }, hrHeadUser);

  await page.goto('http://localhost:3000/id-cards', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Screenshot 0: Issue Cards Mode (Step 1 Header + Stepper Spacing)
  const issueHeaderPath = path.join(OUT_DIR, 'v2_2_issue_header_stepper_1440x900.png');
  await page.screenshot({ path: issueHeaderPath });
  console.log('✓ Captured:', issueHeaderPath);

  // Click "Create Blank Design" to open the 3-Pane Canva Studio Designer
  const createBtn = page.locator('button:has-text("Create Blank Design")').first();
  if (await createBtn.isVisible()) {
    await createBtn.click();
    await page.waitForTimeout(1500);
  }

  // Screenshot 1: Canva Studio Tab + Dual 3D Front & Back View (Cyber Yellow & Matte Black)
  const studioPath = path.join(OUT_DIR, 'v2_2_canva_3d_studio_1440x900.png');
  await page.screenshot({ path: studioPath });
  console.log('✓ Captured:', studioPath);

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

