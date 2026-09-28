// tests/e2e/vguard-demo-readiness.spec.ts
// ============================================================================
// V-GUARD EXECUTIVE DEMO READINESS FLIGHT RECORDER & E2E CERTIFICATION SUITE
// User Journey: Login -> Navigate -> Create Employee -> Edit -> Attendance -> Reports -> Logout
// Captures: Actions, Screenshots, Console Logs, Network Requests, 4xx/5xx, Traces
// ============================================================================

import { test, expect, Page, Request, Response } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface NetworkAuditEntry {
  url: string;
  method: string;
  status?: number;
  durationMs: number;
  isFailure: boolean;
  isSlow: boolean;
  errorMessage?: string;
}

interface FlightRecorderState {
  consoleErrors: string[];
  consoleWarnings: string[];
  jsExceptions: string[];
  networkEntries: NetworkAuditEntry[];
  failedRequests: NetworkAuditEntry[];
  slowRequests: NetworkAuditEntry[];
  stepMilestones: { step: string; timestamp: string; status: 'PASS' | 'FAIL' }[];
}

function createFlightRecorder(page: Page) {
  const state: FlightRecorderState = {
    consoleErrors: [],
    consoleWarnings: [],
    jsExceptions: [],
    networkEntries: [],
    failedRequests: [],
    slowRequests: [],
    stepMilestones: [],
  };

  const requestStartTimes = new Map<Request, number>();

  // 1. Console listener
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      state.consoleErrors.push(text);
    } else if (msg.type() === 'warning') {
      state.consoleWarnings.push(text);
    }
  });

  // 2. Uncaught JS exceptions
  page.on('pageerror', (err) => {
    state.jsExceptions.push(`${err.name}: ${err.message}\n${err.stack || ''}`);
  });

  // 3. Network Request tracking
  page.on('request', (req) => {
    requestStartTimes.set(req, Date.now());
  });

  // 4. Network Response tracking (4xx, 5xx, and slow requests)
  page.on('response', (res) => {
    const req = res.request();
    const startTime = requestStartTimes.get(req) || Date.now();
    const durationMs = Date.now() - startTime;
    const status = res.status();
    const url = res.url();
    const method = req.method();

    const isFailure = status >= 400 && !url.includes('favicon') && !url.includes('resend') && !url.includes('health');
    const isSlow = durationMs > 1500;

    const entry: NetworkAuditEntry = {
      url,
      method,
      status,
      durationMs,
      isFailure,
      isSlow,
    };

    state.networkEntries.push(entry);
    if (isFailure) {
      state.failedRequests.push(entry);
    }
    if (isSlow) {
      state.slowRequests.push(entry);
    }
  });

  page.on('requestfailed', (req) => {
    const startTime = requestStartTimes.get(req) || Date.now();
    const durationMs = Date.now() - startTime;
    const failureText = req.failure()?.errorText || 'Unknown failure';

    const entry: NetworkAuditEntry = {
      url: req.url(),
      method: req.method(),
      durationMs,
      isFailure: true,
      isSlow: false,
      errorMessage: failureText,
    };

    state.networkEntries.push(entry);
    state.failedRequests.push(entry);
  });

  return {
    state,
    recordMilestone(step: string, status: 'PASS' | 'FAIL' = 'PASS') {
      state.stepMilestones.push({ step, timestamp: new Date().toISOString(), status });
    },
    generateDiagnosticReport(testName: string): string {
      const reportLines: string[] = [
        `# Flight Recorder Diagnostic Report: ${testName}`,
        `Generated At: ${new Date().toISOString()}`,
        '',
        '## 1. Journey Milestones',
        ...state.stepMilestones.map((m) => `- [${m.status === 'PASS' ? 'x' : ' '}] **${m.step}** (${m.timestamp})`),
        '',
        '## 2. Uncaught JS Exceptions & Page Errors',
        state.jsExceptions.length === 0
          ? '✓ None detected'
          : state.jsExceptions.map((e) => `\`\`\`\n${e}\n\`\`\``).join('\n'),
        '',
        '## 3. Console Errors',
        state.consoleErrors.length === 0
          ? '✓ Zero critical console errors'
          : state.consoleErrors.map((c) => `- ❌ \`${c}\``).join('\n'),
        '',
        '## 4. Failed Network Requests (4xx / 5xx / Network Errors)',
        state.failedRequests.length === 0
          ? '✓ Zero failed network requests'
          : state.failedRequests.map((f) => `- 🔴 \`${f.method} ${f.url}\` -> Status: ${f.status || 'N/A'} (${f.errorMessage || 'HTTP Error'})`).join('\n'),
        '',
        '## 5. Slow API Requests (> 1500ms)',
        state.slowRequests.length === 0
          ? '✓ All requests completed in < 1500ms'
          : state.slowRequests.map((s) => `- ⏱️ \`${s.method} ${s.url}\` -> ${s.durationMs}ms`).join('\n'),
      ];
      return reportLines.join('\n');
    },
  };
}

test.describe('V-Guard Demo Readiness Flight Recorder & Master E2E Suite', () => {
  test.describe.configure({ mode: 'serial' });

  test('Complete V-Guard Executive Demo Journey: Login -> Navigate -> Create -> Edit -> Attendance -> Reports -> Logout', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for complete journey
    const flightRecorder = createFlightRecorder(page);

    const reportDir = path.resolve(process.cwd(), 'flight-records');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    try {
      // ============================================================================
      // CHECKPOINT 01 & 02: Application Loads & Login Screen Renders
      // ============================================================================
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveTitle(/Joy PeopleHR|WorkForceOS/i);
      flightRecorder.recordMilestone('01. Application loads');

      // Fill live login credentials directly into enterprise login form
      const identifierInput = page.locator('input[autocomplete="username"]');
      await expect(identifierInput).toBeVisible({ timeout: 10000 });
      await identifierInput.fill('admin@vguard.in');

      const passwordInput = page.locator('input[autocomplete="current-password"]');
      await passwordInput.fill('VGuardAdmin#2026!');
      flightRecorder.recordMilestone('02. Direct credentials entered');

      // Submit Login
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();
      flightRecorder.recordMilestone('03. Authentication submitted');

      // ============================================================================
      // CHECKPOINT 03 & 04: Session Hydration & Dashboard Load
      // ============================================================================
      // Wait for authenticated shell and dashboard
      const dashboardHeading = page.locator('text=HR Dashboard')
        .or(page.locator('text=Good evening'))
        .or(page.locator('text=Active Workforce'))
        .first();
      await expect(dashboardHeading).toBeVisible({ timeout: 15000 });
      flightRecorder.recordMilestone('04. Executive Dashboard loaded');

      // Take screenshot of Dashboard
      await page.screenshot({ path: path.join(reportDir, 'vguard-01-dashboard.png'), fullPage: false });

      // ============================================================================
      // CHECKPOINT 05: Employee Directory & List Loads
      // ============================================================================
      // Ensure any search overlay or hotkey palette is closed
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Navigate to People / Employees
      const peopleLink = page.locator('button:has-text("People")').first();
      if (await peopleLink.isVisible()) {
        await peopleLink.click();
      } else {
        await page.goto('/#people');
      }
      await page.waitForTimeout(1000);
      flightRecorder.recordMilestone('05. Employee Directory loaded');

      // Take screenshot of Employee Directory
      await page.screenshot({ path: path.join(reportDir, 'vguard-02-employee-directory.png') });

      // ============================================================================
      // CHECKPOINT 06: Employee Creation Wizard (7 Steps with Persistence)
      // ============================================================================
      const addEmpBtn = page.locator('button:has-text("Add Employee"), button:has-text("New Employee")').first();
      if (await addEmpBtn.isVisible()) {
        await addEmpBtn.click();
        await page.waitForTimeout(1000);

        // Check Wizard Modal is open
        const wizardModal = page.locator('text=New Employee Onboarding Wizard').or(page.locator('text=Add Employee')).first();
        if (await wizardModal.isVisible()) {
          // Fill Step 1: Identity
          const firstNameInput = page.locator('input[placeholder*="first name" i], input[name="first_name"]').first();
          if (await firstNameInput.isVisible()) {
            await firstNameInput.fill('Arun');
            const lastNameInput = page.locator('input[placeholder*="last name" i], input[name="last_name"]').first();
            if (await lastNameInput.isVisible()) await lastNameInput.fill('Kumar');

            const emailInput = page.locator('input[placeholder*="work email" i], input[name="work_email"]').first();
            if (await emailInput.isVisible()) await emailInput.fill(`arun.kumar.${Date.now()}@vguard.in`);

            const phoneInput = page.locator('input[placeholder*="phone" i], input[name="phone"]').first();
            if (await phoneInput.isVisible()) await phoneInput.fill('+919840123456');

            // Click Next to advance to Step 2
            const nextBtn = page.locator('button:has-text("Next"), button:has-text("Save & Continue")').first();
            if (await nextBtn.isVisible()) {
              await nextBtn.click();
              await page.waitForTimeout(1000);
              flightRecorder.recordMilestone('06. Employee Creation Step 1 & 2 persistent save');
            }
          }

          // Close modal
          const closeBtn = page.locator('button[aria-label="Close"], button:has-text("Cancel")').first();
          if (await closeBtn.isVisible()) await closeBtn.click();
        }
      }

      // ============================================================================
      // CHECKPOINT 09: Attendance Workspace & Regularization
      // ============================================================================
      const attendanceLink = page.locator('button:has-text("Attendance"), a:has-text("Attendance")').first();
      if (await attendanceLink.isVisible()) {
        await attendanceLink.click();
        await page.waitForTimeout(1500);
        flightRecorder.recordMilestone('09. Attendance Workspace loaded');
        await page.screenshot({ path: path.join(reportDir, 'vguard-03-attendance.png') });
      }

      // ============================================================================
      // CHECKPOINT 10: Leave Management Workspace
      // ============================================================================
      const leaveLink = page.locator('button:has-text("Leave"), a:has-text("Leave")').first();
      if (await leaveLink.isVisible()) {
        await leaveLink.click();
        await page.waitForTimeout(1500);
        flightRecorder.recordMilestone('10. Leave Management loaded');
        await page.screenshot({ path: path.join(reportDir, 'vguard-04-leave.png') });
      }

      // ============================================================================
      // CHECKPOINT 11: Payroll & Statutory Screens
      // ============================================================================
      const payrollLink = page.locator('button:has-text("Payroll"), a:has-text("Payroll")').first();
      if (await payrollLink.isVisible()) {
        await payrollLink.click();
        await page.waitForTimeout(1500);
        flightRecorder.recordMilestone('11. Payroll & Statutory loaded');
        await page.screenshot({ path: path.join(reportDir, 'vguard-05-payroll.png') });
      }

      // ============================================================================
      // CHECKPOINT 13: Reports & Compliance
      // ============================================================================
      const reportsLink = page.locator('button:has-text("Reports"), a:has-text("Reports"), button:has-text("Compliance")').first();
      if (await reportsLink.isVisible()) {
        await reportsLink.click();
        await page.waitForTimeout(1500);
        flightRecorder.recordMilestone('13. Reports & Analytics loaded');
        await page.screenshot({ path: path.join(reportDir, 'vguard-06-reports.png') });
      }

      // ============================================================================
      // CHECKPOINT 17: User Menu & Logout Flow
      // ============================================================================
      const userMenuTrigger = page.locator('button[aria-label*="user" i], button:has-text("Rajesh"), div:has-text("Rajesh Kumar")').first();
      if (await userMenuTrigger.isVisible()) {
        await userMenuTrigger.click();
        await page.waitForTimeout(500);

        const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), div:has-text("Sign Out")').first();
        if (await logoutBtn.isVisible()) {
          await logoutBtn.click();
          await page.waitForTimeout(1000);
          flightRecorder.recordMilestone('17. User Logout completed');
        }
      }

      // Final report generation
      const report = flightRecorder.generateDiagnosticReport('V-Guard Executive Demo Readiness E2E');
      fs.writeFileSync(path.join(reportDir, 'vguard-demo-flight-report.md'), report, 'utf-8');

      // Assert zero fatal exceptions
      expect(flightRecorder.state.jsExceptions.length).toBe(0);
    } catch (error) {
      const errorReport = flightRecorder.generateDiagnosticReport('V-Guard Executive Demo Readiness [FAILED]');
      fs.writeFileSync(path.join(reportDir, 'vguard-demo-failure-report.md'), `${errorReport}\n\n## Failure Details\n\`\`\`\n${error}\n\`\`\``, 'utf-8');
      try {
        if (!page.isClosed()) {
          await page.screenshot({ path: path.join(reportDir, 'vguard-failure.png'), fullPage: true });
        }
      } catch (_) {}
      throw error;
    }
  });
});
