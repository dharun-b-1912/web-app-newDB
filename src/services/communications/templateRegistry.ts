// src/services/communications/templateRegistry.ts
// ============================================================
// WorkforceOS Communication Engine — Approved Template Registry
// TRAI DLT Compliant SMS & WhatsApp Business Templates
// Synchronized with Airtel DLT Portal (Header: JCSPRL)
// ============================================================

import { CommunicationTemplate, CommunicationEventType, CommunicationChannel } from './types';

export const OFFICIAL_TEMPLATES: Record<string, CommunicationTemplate> = {
  // ── 1. Authentication (Login OTP) ──────────────────────────────────────────
  WA_OTP: {
    templateKey: 'WA_OTP',
    channel: 'WHATSAPP',
    provider: 'AIRTEL',
    senderId: 'JCSPRL',
    category: 'AUTHENTICATION',
    bodyPattern: 'JOY PeopleHR: Your verification code is {{1}}. This code expires in {{2}} minutes. Do not share this code with anyone.',
  },
  // Approved Airtel DLT: JOYHR_LOGIN_OTP | ID: 1077449880060256831 | Header: JCSPRL
  SMS_OTP: {
    templateKey: 'SMS_OTP',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1077449880060256831',
    senderId: 'JCSPRL',
    category: 'AUTHENTICATION',
    bodyPattern: 'Your login OTP for Joy PeopleHR is {{1}}. Valid for {{2}} minutes. Do not share this OTP with anyone. - Joy PeopleHR',
  },
  JOYHR_LOGIN_OTP: {
    templateKey: 'JOYHR_LOGIN_OTP',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1077449880060256831',
    senderId: 'JCSPRL',
    category: 'AUTHENTICATION',
    bodyPattern: 'Your login OTP for Joy PeopleHR is {{1}}. Valid for {{2}} minutes. Do not share this OTP with anyone. - Joy PeopleHR',
  },
  // Approved Airtel DLT: OTP for JCS | ID: 1007961285745726410 | Header: JCSPRL
  OTP_FOR_JCS: {
    templateKey: 'OTP_FOR_JCS',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1007961285745726410',
    senderId: 'JCSPRL',
    category: 'AUTHENTICATION',
    bodyPattern: '{{1}} is your OTP for Joy Corporate Solutions Private Limited. Expires in {{2}} minutes.',
  },

  // ── 2. Attendance Check-In Confirmation ─────────────────────────────────────
  WA_CHECK_IN: {
    templateKey: 'WA_CHECK_IN',
    channel: 'WHATSAPP',
    provider: 'AIRTEL',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: '✅ *Attendance Checked In*\n\nHello {{1}},\nYour attendance has been recorded.\n\n📅 *Date:* {{2}}\n🕐 *Check-in:* {{3}}\n🏢 *Company:* {{4}}\n\n*Status:* Present\nHave a productive day! — *JOY PeopleHR*',
  },
  // Approved Airtel DLT: JOYHR_ATTENDANCE_CHECKIN | ID: 1077076930061928891 | Header: JCSPRL
  SMS_CHECK_IN: {
    templateKey: 'SMS_CHECK_IN',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1077076930061928891',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: 'Dear {{1}}, your check-in has been recorded at {{2}} on {{3}}. Have a productive day! - Joy PeopleHR',
  },
  JOYHR_ATTENDANCE_CHECKIN: {
    templateKey: 'JOYHR_ATTENDANCE_CHECKIN',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1077076930061928891',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: 'Dear {{1}}, your check-in has been recorded at {{2}} on {{3}}. Have a productive day! - Joy PeopleHR',
  },

  // ── 3. Attendance Check-Out Confirmation ────────────────────────────────────
  WA_CHECK_OUT: {
    templateKey: 'WA_CHECK_OUT',
    channel: 'WHATSAPP',
    provider: 'AIRTEL',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: '✅ *Attendance Checked Out*\n\nHello {{1}},\nYour workday has been completed.\n\n📅 *Date:* {{2}}\n🟢 *Check-in:* {{3}}\n🔴 *Check-out:* {{4}}\n⏱️ *Working time:* {{5}}\n\n*Attendance:* Present — *JOY PeopleHR*',
  },
  // Approved Airtel DLT: JOYHR_ATTENDANCE_CHECKOUT | ID: 1077188040062422070 | Header: JCSPRL
  SMS_CHECK_OUT: {
    templateKey: 'SMS_CHECK_OUT',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1077188040062422070',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: 'Dear {{1}}, your check-out has been recorded at {{2}} today. Your total logged time is {{3}}. Status: Present. - Joy PeopleHR.',
  },
  JOYHR_ATTENDANCE_CHECKOUT: {
    templateKey: 'JOYHR_ATTENDANCE_CHECKOUT',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1077188040062422070',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: 'Dear {{1}}, your check-out has been recorded at {{2}} today. Your total logged time is {{3}}. Status: Present. - Joy PeopleHR.',
  },

  // ── 4. Daily Attendance Status ──────────────────────────────────────────────
  WA_DAILY_ATTENDANCE: {
    templateKey: 'WA_DAILY_ATTENDANCE',
    channel: 'WHATSAPP',
    provider: 'AIRTEL',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: '📊 *Daily Attendance Summary*\n\n👤 *Employee:* {{1}}\n📅 *Date:* {{2}}\n🟢 *Check-in:* {{3}}\n🔴 *Check-out:* {{4}}\n⏱️ *Working Hours:* {{5}}\n📋 *Attendance:* {{6}}\n\nThank you, *JOY PeopleHR*',
  },
  // Approved Airtel DLT: JOYHR_DAILY_ATTENDANCE_STATUS | ID: 1077017600060238275 | Header: JCSPRL
  SMS_DAILY_ATTENDANCE: {
    templateKey: 'SMS_DAILY_ATTENDANCE',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1077017600060238275',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: 'Dear {{1}}, your attendance status for {{2}} is marked as {{3}}. For queries, contact HR. Joy PeopleHR',
  },
  JOYHR_DAILY_ATTENDANCE_STATUS: {
    templateKey: 'JOYHR_DAILY_ATTENDANCE_STATUS',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1077017600060238275',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: 'Dear {{1}}, your attendance status for {{2}} is marked as {{3}}. For queries, contact HR. Joy PeopleHR',
  },

  // ── 5. Absent Punch Alert ───────────────────────────────────────────────────
  WA_ABSENT_ALERT: {
    templateKey: 'WA_ABSENT_ALERT',
    channel: 'WHATSAPP',
    provider: 'AIRTEL',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: '⚠️ *Missing Punch Alert*\n\nDear {{1}},\nNo punch was recorded for your shift on {{2}}.\n\nPlease apply for regularization or leave on the Joy PeopleHR app.',
  },
  // Approved Airtel DLT: JOYHR_ABSENT_PUNCH_ALERT | ID: 1077182330060192197 | Header: JCSPRL
  SMS_ABSENT_ALERT: {
    templateKey: 'SMS_ABSENT_ALERT',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1077182330060192197',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: 'Dear {{1}}, no punch was recorded for your shift on {{2}}. Please apply for regularization or leave on the app. - Joy PeopleHR',
  },
  JOYHR_ABSENT_PUNCH_ALERT: {
    templateKey: 'JOYHR_ABSENT_PUNCH_ALERT',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1077182330060192197',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: 'Dear {{1}}, no punch was recorded for your shift on {{2}}. Please apply for regularization or leave on the app. - Joy PeopleHR',
  },

  // ── 6. Leave Status Update ─────────────────────────────────────────────────
  WA_LEAVE_STATUS: {
    templateKey: 'WA_LEAVE_STATUS',
    channel: 'WHATSAPP',
    provider: 'AIRTEL',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: '🌴 *Leave Request Update*\n\nHello {{1}},\nYour leave request for *{{2}}* has been *{{3}}*.\n\nCheck details on the portal. — *JOY PeopleHR*',
  },
  WA_LEAVE_APPROVED: {
    templateKey: 'WA_LEAVE_APPROVED',
    channel: 'WHATSAPP',
    provider: 'AIRTEL',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: '🌴 *Leave Approved*\n\nHello {{1}},\nYour leave request for *{{2}}* has been approved by your manager.\n\nHave a restful time! — *JOY PeopleHR*',
  },
  // Approved Airtel DLT: JOYHR_LEAVE_STATUS_UPDATE | ID: 1077171710060293148 | Header: JCSPRL
  SMS_LEAVE_STATUS: {
    templateKey: 'SMS_LEAVE_STATUS',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1077171710060293148',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: 'Dear {{1}}, your leave request for {{2}} has been {{3}}. Check details on the portal. - Joy PeopleHR',
  },
  SMS_LEAVE_APPROVED: {
    templateKey: 'SMS_LEAVE_APPROVED',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1077171710060293148',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: 'Dear {{1}}, your leave request for {{2}} has been {{3}}. Check details on the portal. - Joy PeopleHR',
  },
  JOYHR_LEAVE_STATUS_UPDATE: {
    templateKey: 'JOYHR_LEAVE_STATUS_UPDATE',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1077171710060293148',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: 'Dear {{1}}, your leave request for {{2}} has been {{3}}. Check details on the portal. - Joy PeopleHR',
  },

  // ── 7. Salary Processing Alert ──────────────────────────────────────────────
  WA_SALARY_PROCESSING: {
    templateKey: 'WA_SALARY_PROCESSING',
    channel: 'WHATSAPP',
    provider: 'AIRTEL',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: '💼 *Salary Processing Update*\n\nDear {{1}},\nYour salary for the month of *{{2}}* is processed and will be credited to your registered bank account soon.\n\n— *Joy PeopleHR*',
  },
  // Approved Airtel DLT: JOYHR_SALARY_PROCESSING_ALERT | ID: 1077377200060159599 | Header: JCSPRL
  SMS_SALARY_PROCESSING: {
    templateKey: 'SMS_SALARY_PROCESSING',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1077377200060159599',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: 'Dear {{1}}, your salary for the month of {{2}} is processed and will be credited to your registered bank account soon. - Joy PeopleHR',
  },
  JOYHR_SALARY_PROCESSING_ALERT: {
    templateKey: 'JOYHR_SALARY_PROCESSING_ALERT',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1077377200060159599',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: 'Dear {{1}}, your salary for the month of {{2}} is processed and will be credited to your registered bank account soon. - Joy PeopleHR',
  },

  // ── 8. Salary Credited Success ──────────────────────────────────────────────
  WA_SALARY_CREDITED: {
    templateKey: 'WA_SALARY_CREDITED',
    channel: 'WHATSAPP',
    provider: 'AIRTEL',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: '💰 *Salary Credited*\n\nDear {{1}},\nYour salary for *{{2}}* has been credited.\nYou can download your payslip directly from the JOY PeopleHR app.\n\n— *Joy PeopleHR*',
  },
  // Approved Airtel DLT: JOYHR_SALARY_CREDITED_SUCCESS | ID: 1077195070060448349 | Header: JCSPRL
  SMS_SALARY_CREDITED: {
    templateKey: 'SMS_SALARY_CREDITED',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1077195070060448349',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: 'Dear {{1}}, your salary for {{2}} has been credited. You can download your payslip from the JOY People HR application. - Joy PeopleHR',
  },
  JOYHR_SALARY_CREDITED_SUCCESS: {
    templateKey: 'JOYHR_SALARY_CREDITED_SUCCESS',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1077195070060448349',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: 'Dear {{1}}, your salary for {{2}} has been credited. You can download your payslip from the JOY People HR application. - Joy PeopleHR',
  },
  // Approved Airtel DLT: Salary Credit (JCS) | ID: 1007998574229366726 | Header: JCSPRL
  SALARY_CREDIT_JCS: {
    templateKey: 'SALARY_CREDIT_JCS',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1007998574229366726',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: 'Hi {{1}}, your salary of ₹{{2}} for last month is credited to your account. - Joy Corporate Solutions Private Limited.',
  },

  // ── 9. Welcome New Employee ─────────────────────────────────────────────────
  WA_WELCOME: {
    templateKey: 'WA_WELCOME',
    channel: 'WHATSAPP',
    provider: 'AIRTEL',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: '🎉 *Welcome to Joy Corporate Solutions, {{1}}!*\n\nFrom now on your reporting manager is *{{2}}*.\nHave a great journey ahead with us!',
  },
  // Approved Airtel DLT: Welcome JCS | ID: 1007711994736460605 | Header: JCSPRL
  SMS_WELCOME: {
    templateKey: 'SMS_WELCOME',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1007711994736460605',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: 'Welcome to Joy Corporate Solutions, {{1}}! From now on your reporting manager is {{2}}. Have a great day',
  },
  WELCOME_JCS: {
    templateKey: 'WELCOME_JCS',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1007711994736460605',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: 'Welcome to Joy Corporate Solutions, {{1}}! From now on your reporting manager is {{2}}. Have a great day',
  },

  // ── 10. Regularization Status ───────────────────────────────────────────────
  WA_REGULARIZATION_APPROVED: {
    templateKey: 'WA_REGULARIZATION_APPROVED',
    channel: 'WHATSAPP',
    provider: 'AIRTEL',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: '⏰ *Attendance Regularized*\n\nHello {{1}},\nYour attendance regularization request for *{{2}}* has been approved.\n\n*Adjusted Hours:* {{3}}\n*Status:* Regularized — *JOY PeopleHR*',
  },
  SMS_REGULARIZATION: {
    templateKey: 'SMS_REGULARIZATION',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1077017600060238275',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: 'Dear {{1}}, your attendance status for {{2}} is marked as {{3}}. For queries, contact HR. Joy PeopleHR',
  },
  SMS_REGULARIZATION_APPROVED: {
    templateKey: 'SMS_REGULARIZATION_APPROVED',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1077017600060238275',
    senderId: 'JCSPRL',
    category: 'UTILITY',
    bodyPattern: 'Dear {{1}}, your attendance status for {{2}} is marked as {{3}}. For queries, contact HR. Joy PeopleHR',
  },

  // ── 11. Company Announcements ───────────────────────────────────────────────
  WA_COMPANY_ANNOUNCEMENT: {
    templateKey: 'WA_COMPANY_ANNOUNCEMENT',
    channel: 'WHATSAPP',
    provider: 'AIRTEL',
    senderId: 'JCSPRL',
    category: 'SERVICE_EXPLICIT',
    bodyPattern: '📢 *Important Company Announcement*\n\n{{1}}\n\n{{2}}\n\n— *Management, Joy Corporate Solutions*',
  },
  SMS_COMPANY_ANNOUNCEMENT: {
    templateKey: 'SMS_COMPANY_ANNOUNCEMENT',
    channel: 'SMS',
    provider: 'AIRTEL',
    dltTemplateId: '1077017600060238275',
    senderId: 'JCSPRL',
    category: 'SERVICE_EXPLICIT',
    bodyPattern: 'Dear {{1}}, your attendance status for {{2}} is marked as {{3}}. For queries, contact HR. Joy PeopleHR',
  },
};

/**
 * Render template with positional variables {{1}}, {{2}}, etc.
 */
export function renderTemplate(pattern: string, variables: string[]): string {
  let rendered = pattern;
  variables.forEach((val, idx) => {
    const placeholder = new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g');
    rendered = rendered.replace(placeholder, val !== undefined && val !== null ? String(val) : '');
  });
  return rendered;
}

/**
 * Resolve template key for a given event and channel
 */
export function resolveTemplateKey(eventType: CommunicationEventType, channel: CommunicationChannel): string {
  const prefix = channel === 'WHATSAPP' ? 'WA' : channel;
  return `${prefix}_${eventType}`;
}

/**
 * Validates outgoing message variables against TRAI DLT scrubbing constraints.
 * Ensures numeric fields are strictly numeric, and strings don't contain breaking symbols.
 */
export function validateDltVariables(dltTemplateId: string, variables: string[]): {
  valid: boolean;
  sanitizedVariables: string[];
  error?: string;
} {
  const sanitized = variables.map((v) => (v !== undefined && v !== null ? String(v).trim() : ''));

  // Special validation for OTP (JOYHR_LOGIN_OTP: 1077449880060256831)
  if (dltTemplateId === '1077449880060256831') {
    if (sanitized.length < 2) {
      return { valid: false, sanitizedVariables: sanitized, error: 'OTP template requires 2 variables: OTP and validity minutes' };
    }
    if (!/^\d+$/.test(sanitized[0])) {
      return { valid: false, sanitizedVariables: sanitized, error: `OTP must be numeric, got: ${sanitized[0]}` };
    }
    if (!/^\d+$/.test(sanitized[1])) {
      return { valid: false, sanitizedVariables: sanitized, error: `Validity minutes must be numeric, got: ${sanitized[1]}` };
    }
  }

  return { valid: true, sanitizedVariables: sanitized };
}
