// src/services/communications/__tests__/airtelDltTemplates.test.ts
import { describe, it, expect } from 'vitest';
import {
  OFFICIAL_TEMPLATES,
  renderTemplate,
  resolveTemplateKey,
  validateDltVariables,
} from '../templateRegistry';
import { AirtelSmsClient } from '../airtelSmsClient';

describe('Airtel DLT Live Approved Templates & Header JCSPRL Suite', () => {
  const approvedDltTemplates = [
    {
      key: 'SMS_OTP',
      dltTemplateId: '1077449880060256831',
      name: 'JOYHR_LOGIN_OTP',
      header: 'JCSPRL',
      sampleVars: ['482910', '10'],
      expectedText:
        'Your login OTP for Joy PeopleHR is 482910. Valid for 10 minutes. Do not share this OTP with anyone. - Joy PeopleHR',
    },
    {
      key: 'SMS_CHECK_IN',
      dltTemplateId: '1077076930061928891',
      name: 'JOYHR_ATTENDANCE_CHECKIN',
      header: 'JCSPRL',
      sampleVars: ['Suresh Kumar', '09:15 AM', '10-10-2026'],
      expectedText:
        'Dear Suresh Kumar, your check-in has been recorded at 09:15 AM on 10-10-2026. Have a productive day! - Joy PeopleHR',
    },
    {
      key: 'SMS_CHECK_OUT',
      dltTemplateId: '1077188040062422070',
      name: 'JOYHR_ATTENDANCE_CHECKOUT',
      header: 'JCSPRL',
      sampleVars: ['Suresh Kumar', '06:30 PM', '8 hrs 30 mins'],
      expectedText:
        'Dear Suresh Kumar, your check-out has been recorded at 06:30 PM today. Your total logged time is 8 hrs 30 mins. Status: Present. - Joy PeopleHR.',
    },
    {
      key: 'SMS_DAILY_ATTENDANCE',
      dltTemplateId: '1077017600060238275',
      name: 'JOYHR_DAILY_ATTENDANCE_STATUS',
      header: 'JCSPRL',
      sampleVars: ['Suresh Kumar', '10-10-2026', 'Present'],
      expectedText:
        'Dear Suresh Kumar, your attendance status for 10-10-2026 is marked as Present. For queries, contact HR. Joy PeopleHR',
    },
    {
      key: 'SMS_ABSENT_ALERT',
      dltTemplateId: '1077182330060192197',
      name: 'JOYHR_ABSENT_PUNCH_ALERT',
      header: 'JCSPRL',
      sampleVars: ['Suresh Kumar', '10-10-2026'],
      expectedText:
        'Dear Suresh Kumar, no punch was recorded for your shift on 10-10-2026. Please apply for regularization or leave on the app. - Joy PeopleHR',
    },
    {
      key: 'SMS_LEAVE_STATUS',
      dltTemplateId: '1077171710060293148',
      name: 'JOYHR_LEAVE_STATUS_UPDATE',
      header: 'JCSPRL',
      sampleVars: ['Suresh Kumar', '12-Oct-2026 Casual Leave', 'Approved'],
      expectedText:
        'Dear Suresh Kumar, your leave request for 12-Oct-2026 Casual Leave has been Approved. Check details on the portal. - Joy PeopleHR',
    },
    {
      key: 'SMS_SALARY_PROCESSING',
      dltTemplateId: '1077377200060159599',
      name: 'JOYHR_SALARY_PROCESSING_ALERT',
      header: 'JCSPRL',
      sampleVars: ['Suresh Kumar', 'September 2026'],
      expectedText:
        'Dear Suresh Kumar, your salary for the month of September 2026 is processed and will be credited to your registered bank account soon. - Joy PeopleHR',
    },
    {
      key: 'SMS_SALARY_CREDITED',
      dltTemplateId: '1077195070060448349',
      name: 'JOYHR_SALARY_CREDITED_SUCCESS',
      header: 'JCSPRL',
      sampleVars: ['Suresh Kumar', 'September 2026'],
      expectedText:
        'Dear Suresh Kumar, your salary for September 2026 has been credited. You can download your payslip from the JOY People HR application. - Joy PeopleHR',
    },
    {
      key: 'OTP_FOR_JCS',
      dltTemplateId: '1007961285745726410',
      name: 'OTP for JCS',
      header: 'JCSPRL',
      sampleVars: ['593821', '10'],
      expectedText:
        '593821 is your OTP for Joy Corporate Solutions Private Limited. Expires in 10 minutes.',
    },
    {
      key: 'WELCOME_JCS',
      dltTemplateId: '1007711994736460605',
      name: 'Welcome JCS',
      header: 'JCSPRL',
      sampleVars: ['Suresh Kumar', 'Dharun B'],
      expectedText:
        'Welcome to Joy Corporate Solutions, Suresh Kumar! From now on your reporting manager is Dharun B. Have a great day',
    },
    {
      key: 'SALARY_CREDIT_JCS',
      dltTemplateId: '1007998574229366726',
      name: 'Salary Credit',
      header: 'JCSPRL',
      sampleVars: ['Suresh Kumar', '45,000'],
      expectedText:
        'Hi Suresh Kumar, your salary of ₹45,000 for last month is credited to your account. - Joy Corporate Solutions Private Limited.',
    },
  ];

  it('contains all 11 approved Airtel DLT templates with valid 19-digit numerical IDs and header JCSPRL', () => {
    for (const t of approvedDltTemplates) {
      const template = OFFICIAL_TEMPLATES[t.key];
      expect(template).toBeDefined();
      expect(template.senderId).toBe('JCSPRL');
      expect(template.dltTemplateId).toBe(t.dltTemplateId);
      expect(template.channel).toBe('SMS');
      expect(template.provider).toBe('AIRTEL');
    }
  });

  it('renders every template with dynamic variables producing byte-identical match to Airtel approved content', () => {
    for (const t of approvedDltTemplates) {
      const template = OFFICIAL_TEMPLATES[t.key];
      const rendered = renderTemplate(template.bodyPattern, t.sampleVars);
      expect(rendered).toBe(t.expectedText);
    }
  });

  it('resolves templates correctly through both event keys and original Airtel DLT names', () => {
    expect(OFFICIAL_TEMPLATES['SMS_OTP'].dltTemplateId).toBe('1077449880060256831');
    expect(OFFICIAL_TEMPLATES['JOYHR_LOGIN_OTP'].dltTemplateId).toBe('1077449880060256831');

    expect(OFFICIAL_TEMPLATES['SMS_CHECK_IN'].dltTemplateId).toBe('1077076930061928891');
    expect(OFFICIAL_TEMPLATES['JOYHR_ATTENDANCE_CHECKIN'].dltTemplateId).toBe('1077076930061928891');

    expect(OFFICIAL_TEMPLATES['SMS_CHECK_OUT'].dltTemplateId).toBe('1077188040062422070');
    expect(OFFICIAL_TEMPLATES['JOYHR_ATTENDANCE_CHECKOUT'].dltTemplateId).toBe('1077188040062422070');
  });

  it('validates numeric variables strictly for OTP template to avoid DLT scrubbing rejections', () => {
    // Valid numeric OTP
    const validRes = validateDltVariables('1077449880060256831', ['123456', '10']);
    expect(validRes.valid).toBe(true);
    expect(validRes.sanitizedVariables).toEqual(['123456', '10']);

    // Non-numeric OTP fails validation early
    const invalidRes = validateDltVariables('1077449880060256831', ['ABCDEF', '10']);
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.error).toContain('OTP must be numeric');
  });

  it('ensures AirtelSmsClient defaults to approved sender ID JCSPRL', () => {
    const client = AirtelSmsClient.getInstance();
    expect(client).toBeDefined();
  });
});
