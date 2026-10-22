import { test } from '@playwright/test';

test.describe('Audit White Screen root cause under multiple session scenarios', () => {
  const scenarios = [
    {
      name: 'Scenario 1: No session (clean incognito)',
      setup: async (page) => {},
    },
    {
      name: 'Scenario 2: Mari Muthu standard session with route=biometric',
      setup: async (page) => {
        await page.addInitScript(() => {
          const user = {
            id: '0c621892-e938-4707-9957-13534ea32c19',
            auth_user_id: '0c621892-e938-4707-9957-13534ea32c19',
            email: 'mari.muthu@joycorporatesolutions.com',
            name: 'Mari Muthu',
            role: 'HR Head',
            organization_id: '0c621892-e938-4707-9957-13534ea32c19',
            status: 'Active',
            roles: [{ id: 'role-hr-head', name: 'HR Head' }],
          };
          localStorage.setItem('workforce_current_user', JSON.stringify(user));
          localStorage.setItem('workforce_active_route', 'biometric');
        });
      },
    },
    {
      name: 'Scenario 3: Company Admin session with route=biometric',
      setup: async (page) => {
        await page.addInitScript(() => {
          const user = {
            id: 'admin-01',
            auth_user_id: 'admin-01',
            email: 'admin@joycorporatesolutions.com',
            name: 'Company Admin',
            role: 'Company Admin',
            organization_id: '0c621892-e938-4707-9957-13534ea32c19',
            status: 'Active',
            roles: [{ id: 'role-ca', name: 'Company Admin' }],
          };
          localStorage.setItem('workforce_current_user', JSON.stringify(user));
          localStorage.setItem('workforce_active_route', 'biometric');
        });
      },
    },
    {
      name: 'Scenario 4: Employee user without biometric permission',
      setup: async (page) => {
        await page.addInitScript(() => {
          const user = {
            id: 'emp-01',
            auth_user_id: 'emp-01',
            email: 'employee@joycorporatesolutions.com',
            name: 'Regular Employee',
            role: 'Employee',
            organization_id: '0c621892-e938-4707-9957-13534ea32c19',
            status: 'Active',
            roles: [{ id: 'role-emp', name: 'Employee' }],
          };
          localStorage.setItem('workforce_current_user', JSON.stringify(user));
          localStorage.setItem('workforce_active_route', 'biometric');
        });
      },
    },
    {
      name: 'Scenario 5: Corrupt/empty user object in localStorage',
      setup: async (page) => {
        await page.addInitScript(() => {
          localStorage.setItem('workforce_current_user', '{}');
          localStorage.setItem('workforce_active_route', 'biometric');
        });
      },
    },
    {
      name: 'Scenario 6: User object with null roles',
      setup: async (page) => {
        await page.addInitScript(() => {
          localStorage.setItem('workforce_current_user', JSON.stringify({
            id: 'user-corrupt',
            email: 'test@example.com',
            roles: null,
            role: null,
          }));
          localStorage.setItem('workforce_active_route', 'biometric');
        });
      },
    },
  ];

  for (const scenario of scenarios) {
    test(scenario.name, async ({ page }) => {
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];

      page.on('pageerror', err => {
        console.error('[PAGE ERROR]', err.stack || err.message);
        pageErrors.push(err.stack || err.message);
      });
      page.on('console', msg => {
        console.log(`[BROWSER ${msg.type()}] ${msg.text()}`);
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await scenario.setup(page);

      console.log(`\n--- Running ${scenario.name} ---`);
      await page.goto('http://localhost:3000/biometric', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);

      const html = await page.content();
      const rootHtml = await page.locator('#root').innerHTML();
      const isBlank = rootHtml.trim().length === 0;

      console.log(`Page Errors: ${pageErrors.length}`);
      if (pageErrors.length > 0) {
        console.error('Page Error Details:', pageErrors);
      }
      console.log(`Console Errors: ${consoleErrors.length}`);
      if (consoleErrors.length > 0) {
        console.error('Console Error Details:', consoleErrors);
      }
      console.log(`Root is blank: ${isBlank}, Root innerHTML length: ${rootHtml.length}`);

      if (isBlank) {
        console.error(`🚨 BLANK WHITE SCREEN DETECTED IN ${scenario.name}!`);
      }
    });
  }
});
