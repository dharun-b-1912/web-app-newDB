// scripts/test_communication_engine.mjs
// ============================================================
// Automated Test Harness: WorkforceOS Employee Communication Engine
// Tests Primary WhatsApp, Feature-Phone Direct SMS, and Airtel SMS Fallback
// ============================================================

import 'dotenv/config';
import { CommunicationRouter } from '../src/services/communications/communicationRouter.js';
import { OFFICIAL_TEMPLATES, renderTemplate } from '../src/services/communications/templateRegistry.js';

async function runTestSuite() {
  console.log('================================================================');
  console.log('🚀 WORKFORCEOS EMPLOYEE COMMUNICATION ENGINE TEST SUITE');
  console.log('================================================================\n');

  const router = CommunicationRouter.getInstance();

  // ── Scenario 1: Factory Worker on Feature / Button Phone (No WhatsApp) ───
  console.log('--- Test 1: Factory Worker with Feature Phone (Button Phone SMS) ---');
  const factoryWorker = {
    employeeCode: 'FAC-104',
    fullName: 'Ramesh Kumar',
    mobileNumber: '919876543210',
    whatsappEnabled: false,
    smsEnabled: true,
    communicationPreference: 'SMS',
    phoneType: 'FEATURE_PHONE_SMS',
  };

  const res1 = await router.sendCheckIn(factoryWorker, {
    employeeName: 'Ramesh',
    date: '06 Oct 2026',
    time: '08:42 AM',
    companyName: 'Joy Corporate Solutions',
  });
  console.log('Test 1 Passed:', res1.finalChannel === 'SMS', '| Summary:', res1.logSummary);

  // ── Scenario 2: Smartphone Employee (WhatsApp Rich Delivery) ─────────────
  console.log('\n--- Test 2: Smartphone Employee (WhatsApp Rich) ---');
  const officeEmployee = {
    employeeCode: 'WF-1001',
    fullName: 'Thirumalai R K',
    mobileNumber: '919384125278',
    whatsappEnabled: true,
    smsEnabled: true,
    communicationPreference: 'WHATSAPP_SMS',
    phoneType: 'SMARTPHONE_WHATSAPP',
  };

  const res2 = await router.sendCheckIn(officeEmployee, {
    employeeName: 'Thirumalai',
    date: '06 Oct 2026',
    time: '09:15 AM',
    companyName: 'Joy Corporate Solutions',
  });
  console.log('Test 2 Passed:', res2.success, '| Final Channel:', res2.finalChannel);

  // ── Scenario 2b: Employee Configured for Mobile SMS Only ─────────────────
  console.log('\n--- Test 2b: Employee Configured for Mobile SMS Only ---');
  const smsOnlyEmployee = {
    employeeCode: 'WF-1001',
    fullName: 'Thirumalai R K',
    mobileNumber: '919384125278',
    whatsappEnabled: true,
    smsEnabled: true,
    communicationPreference: 'SMS',
    phoneType: 'SMARTPHONE_SMS',
  };

  const res2b = await router.sendCheckIn(smsOnlyEmployee, {
    employeeName: 'Thirumalai',
    date: '06 Oct 2026',
    time: '09:20 AM',
    companyName: 'Joy Corporate Solutions',
  });
  console.log('Test 2b Passed (Routed to SMS):', res2b.finalChannel === 'SMS', '| Summary:', res2b.logSummary);

  // ── Scenario 3: Intelligent Fallback (WhatsApp Fails ➔ Fallback to SMS) ───
  console.log('\n--- Test 3: Intelligent Fallback Simulation (WA Fails ➔ Fallback to SMS) ---');
  // Temporarily stub waClient to simulate failure
  const originalSendText = router['waClient'].sendText.bind(router['waClient']);
  router['waClient'].sendText = async () => ({
    success: false,
    error: 'USER_NOT_ON_WHATSAPP',
  });

  const unreachableWaEmployee = {
    employeeCode: 'JCS-017',
    fullName: 'Dharun',
    mobileNumber: '919876543219',
    whatsappEnabled: true,
    smsEnabled: true,
    communicationPreference: 'WHATSAPP_SMS',
    phoneType: 'SMARTPHONE_WHATSAPP',
  };

  const res3 = await router.sendCheckIn(unreachableWaEmployee, {
    employeeName: 'Dharun',
    date: '06 Oct 2026',
    time: '08:57 AM',
    companyName: 'Joy Corporate Solutions',
  });
  // Restore
  router['waClient'].sendText = originalSendText;

  console.log('Test 3 Fallback Triggered:', res3.fallbackTriggered, '| Final Channel:', res3.finalChannel);
  console.log('Test 3 Trace Output:', res3.logSummary);

  // ── Scenario 4: Secure OTP with Fallback ──────────────────────────────────
  console.log('\n--- Test 4: Secure Authentication OTP Dispatch ---');
  const res4 = await router.sendOtp(factoryWorker, {
    otpCode: '482731',
    validityMinutes: 5,
  });
  console.log('Test 4 OTP Dispatched via SMS:', res4.finalChannel === 'SMS');

  // ── Scenario 5: Daily Attendance Summary ─────────────────────────────────
  console.log('\n--- Test 5: Daily Attendance Summary ---');
  const res5 = await router.sendDailySummary(factoryWorker, {
    employeeName: 'Ramesh',
    date: '06 Oct 2026',
    checkIn: '08:42 AM',
    checkOut: '05:45 PM',
    hours: '9h 03m',
    status: 'Present',
  });
  console.log('Test 5 Daily Summary Passed:', res5.success);

  console.log('\n================================================================');
  console.log('✅ ALL WORKFORCEOS COMMUNICATION ENGINE TESTS COMPLETED!');
  console.log('================================================================');
}

runTestSuite().catch(console.error);
