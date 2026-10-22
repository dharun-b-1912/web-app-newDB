import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Airtel DLT Registration Guide for Educational Institutions</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

    @page {
      size: A4;
      margin: 18mm 16mm 20mm 16mm;
      @bottom-right {
        content: counter(page) " of " counter(pages);
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1e293b;
      background-color: #ffffff;
      font-size: 10pt;
      line-height: 1.55;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Header styling */
    .doc-header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 14px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .doc-badge {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .doc-title {
      font-size: 20pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .doc-subtitle {
      font-size: 11pt;
      color: #64748b;
      margin-top: 4px;
      font-weight: 500;
    }

    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 22px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }

    .meta-table td {
      padding: 8px 14px;
      font-size: 9pt;
      border-bottom: 1px solid #e2e8f0;
    }

    .meta-table td:nth-child(odd) {
      font-weight: 600;
      color: #475569;
      width: 22%;
      background: #f1f5f9;
    }

    .meta-table td:nth-child(even) {
      color: #0f172a;
      width: 28%;
    }

    /* Section Headings */
    h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #0f172a;
      margin-top: 22px;
      margin-bottom: 10px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    h3 {
      font-size: 11pt;
      font-weight: 600;
      color: #1e293b;
      margin-top: 14px;
      margin-bottom: 6px;
    }

    p {
      margin-bottom: 8px;
      color: #334155;
    }

    /* Callouts */
    .callout {
      border-left: 4px solid #0284c7;
      background: #f0f9ff;
      padding: 12px 14px;
      border-radius: 0 6px 6px 0;
      margin: 12px 0;
      font-size: 9pt;
    }

    .callout-warning {
      border-left-color: #f59e0b;
      background: #fffbeb;
    }

    .callout-warning strong {
      color: #b45309;
    }

    .callout-trai {
      border-left-color: #ef4444;
      background: #fef2f2;
    }

    .callout-trai strong {
      color: #b91c1c;
    }

    /* Tables */
    table.content-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 16px 0;
      font-size: 8.5pt;
    }

    table.content-table th {
      background: #0f172a;
      color: #ffffff;
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 8.5pt;
    }

    table.content-table td {
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
      color: #334155;
    }

    table.content-table tr:nth-child(even) td {
      background: #f8fafc;
    }

    /* Template Cards */
    .template-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      margin-bottom: 12px;
      background: #ffffff;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .template-header {
      background: #f1f5f9;
      padding: 7px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
    }

    .template-name {
      font-weight: 700;
      font-size: 9pt;
      color: #0f172a;
      font-family: 'JetBrains Mono', monospace;
    }

    .template-tag {
      font-size: 7.5pt;
      padding: 2px 8px;
      background: #0284c7;
      color: #ffffff;
      border-radius: 4px;
      font-weight: 600;
    }

    .template-body {
      padding: 10px 12px;
    }

    .template-content {
      background: #f8fafc;
      border: 1px dashed #94a3b8;
      border-radius: 6px;
      padding: 8px 10px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8pt;
      color: #0f172a;
      line-height: 1.45;
      margin-bottom: 8px;
    }

    .template-var-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      font-size: 7.5pt;
      color: #475569;
    }

    .var-pill {
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5pt;
    }

    .template-sample {
      margin-top: 6px;
      font-size: 8pt;
      color: #0369a1;
      font-style: italic;
    }

    /* Lists */
    ol, ul {
      margin-left: 20px;
      margin-bottom: 10px;
    }

    li {
      margin-bottom: 5px;
      color: #334155;
    }

    /* Letterhead / LOA styling */
    .loa-box {
      border: 2px dashed #94a3b8;
      padding: 20px;
      border-radius: 8px;
      background: #fafafa;
      margin: 15px 0;
      font-size: 9pt;
      line-height: 1.6;
    }

    .loa-box .title {
      text-align: center;
      font-weight: 800;
      text-decoration: underline;
      font-size: 11pt;
      margin-bottom: 14px;
      color: #0f172a;
    }

    .blank-line {
      display: inline-block;
      border-bottom: 1px solid #475569;
      min-width: 140px;
      text-align: center;
      font-style: italic;
      color: #64748b;
    }

    .footer-note {
      margin-top: 25px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      font-size: 8pt;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>

  <!-- PAGE 1: HEADER & OVERVIEW -->
  <div class="doc-header">
    <div>
      <div class="doc-badge">Official Standard Operating Procedure (SOP)</div>
      <div class="doc-title">Airtel DLT Enterprise Registration Guide</div>
      <div class="doc-subtitle">Compliance Handbook & Template Submission Manual for Educational Institutions & Colleges</div>
    </div>
    <div style="text-align: right; font-size: 8.5pt; color: #64748b;">
      <div><strong>Joy PeopleHR</strong></div>
      <div>Enterprise Workforce SaaS</div>
      <div>Dated: November 2025 / 2026</div>
    </div>
  </div>

  <table class="meta-table">
    <tr>
      <td>Target Entity</td>
      <td>Colleges, Universities & Educational Trusts</td>
      <td>Telecom Operator</td>
      <td>Bharti Airtel IQ DLT Portal</td>
    </tr>
    <tr>
      <td>Regulatory Framework</td>
      <td>TRAI TCCCPR 2018</td>
      <td>Recent Compliance</td>
      <td>TRAI Direction dt. 18-Nov-2025 (Variable Tagging)</td>
    </tr>
    <tr>
      <td>Service Scope</td>
      <td>Biometric Attendance, OTPs, Salary & Staff Alerts</td>
      <td>Default Sender Category</td>
      <td>Service Implicit (Transactional 24x7)</td>
    </tr>
  </table>

  <h2>1. Executive Summary & Why College Registration is Mandatory</h2>
  <p>
    Under the Telecom Regulatory Authority of India (<strong>TRAI</strong>) Telecom Commercial Communications Customer Preference Regulations (<strong>TCCCPR, 2018</strong>), no telecommunication company (Airtel, Jio, Vi, BSNL) is legally permitted to deliver SMS messages to faculty, non-teaching staff, or students without Distributed Ledger Technology (<strong>DLT</strong>) registration.
  </p>
  <p>
    To enable seamless, real-time automated SMS notifications from the <strong>Joy PeopleHR Platform</strong>—such as biometric punch-in/out timestamps, daily attendance summaries, OTP logins, and salary credit notifications—the College must register itself as a <strong>Principal Entity (PE)</strong> on the Airtel DLT portal.
  </p>

  <div class="callout callout-warning">
    <strong>Key Benefit of Service Implicit Category:</strong>
    Because college operational notifications (attendance, emergency circulars, salary alerts) are registered under the <strong>Service Implicit</strong> category, they are delivered instantly 24 hours a day, 7 days a week, and are never blocked by National Do Not Disturb (DND) registries.
  </div>

  <h2>2. KYC Documents Checklist for Educational Institutions</h2>
  <p>Before initiating the online application, ensure the following scanned documents (PDF / JPG format, size under 5 MB each) are ready:</p>

  <table class="content-table">
    <thead>
      <tr>
        <th style="width: 28%;">Document Required</th>
        <th style="width: 42%;">Description / Specifications</th>
        <th style="width: 30%;">Accepted Alternatives</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. Entity PAN Card</strong></td>
        <td>PAN Card in the registered name of the College, Educational Trust, or Society.</td>
        <td>Trust PAN / Society PAN / University PAN</td>
      </tr>
      <tr>
        <td><strong>2. Legal Proof of Existence</strong></td>
        <td>Government/Statutory recognition document.</td>
        <td>Trust Deed, Society Reg. Certificate, AICTE/UGC Approval, 12A/80G Certificate</td>
      </tr>
      <tr>
        <td><strong>3. Authorized Signatory ID Proof</strong></td>
        <td>Government photo ID of Principal, Director, Secretary, or Chairman.</td>
        <td>Aadhaar Card, PAN Card, Passport, or Voter ID</td>
      </tr>
      <tr>
        <td><strong>4. Letter of Authorization (LOA)</strong></td>
        <td>Signed and officially stamped letter on College Letterhead appointing the applicant.</td>
        <td>Board / Trust Resolution or Annexure A template</td>
      </tr>
      <tr>
        <td><strong>5. Bank Proof</strong></td>
        <td>Bank account verification for the non-refundable registration fee.</td>
        <td>Cancelled Cheque or Bank Statement showing College/Trust name</td>
      </tr>
      <tr>
        <td><strong>6. GST Certificate (Optional)</strong></td>
        <td>Required only if the college or society holds GST registration.</td>
        <td>GSTIN Certificate copy</td>
      </tr>
    </tbody>
  </table>

  <div class="callout">
    <strong>DLT Registration Fee:</strong> Telecom operators charge a one-time non-refundable regulatory registration fee of <strong>INR 5,000 + 18% GST (Total: INR 5,900)</strong> paid directly to Bharti Airtel through online payment gateway (Net Banking / Debit / Credit / UPI).
  </div>

  <div class="page-break"></div>

  <!-- PAGE 2: REGISTRATION STEPS -->
  <h2>3. Step-by-Step Airtel DLT Registration Walkthrough</h2>

  <h3>Step 3.1: Online Entity Onboarding</h3>
  <ol>
    <li>Navigate to the official Airtel IQ DLT portal: <br><strong style="color: #0284c7;">https://www.airtel.in/business/commercial-communication</strong></li>
    <li>Click on <strong>"Register as Enterprise"</strong> and select <strong>"New Registration"</strong>.</li>
    <li>Select <strong>Registration Type: Indian</strong> and Business Type: <strong>Educational Institution / Society / Trust</strong>.</li>
    <li>Enter the College PAN number. The portal validates the PAN with the NSDL database.</li>
    <li>Fill in the College Legal Name, Registered Address, City, State, and PIN Code.</li>
    <li>Enter the <strong>Authorized Signatory Details</strong> (Name, Official Email ID, Mobile Number). An OTP will be sent to both email and phone for verification.</li>
    <li>Upload the KYC documents (PAN, Trust Deed/Affiliation Letter, LOA, Signatory ID Proof).</li>
    <li>Complete the regulatory payment of INR 5,900 via the payment gateway.</li>
    <li><strong>Approval Timeline:</strong> Airtel verifies the documents within <strong>24 to 48 working hours</strong>. Upon approval, you will receive your unique <strong>19-digit Principal Entity ID (PE ID)</strong> via email.</li>
  </ol>

  <h3>Step 3.2: Header (Sender ID) Registration</h3>
  <p>The Header is the 6-character sender title appearing at the top of incoming SMS messages (e.g., <code>JOYCOL</code>, <code>SVCENG</code>, <code>COLJOY</code>).</p>
  <ol>
    <li>Log in to the Airtel DLT Portal with your registered credentials.</li>
    <li>Navigate to <strong>Header Management</strong> &rarr; <strong>Add New Header</strong>.</li>
    <li>Select Header Category: <strong>Service Implicit</strong> (Do NOT select Promotional).</li>
    <li>Enter your desired <strong>6-character Alphabetic Header</strong> (e.g., if college name is <em>St. Joseph College of Engineering</em>, suggest <code>SJCHRM</code> or <code>SJCOLS</code>).</li>
    <li>In the <strong>Justification / Purpose</strong> text box, enter: <br>
      <em>"This header will be used to send transactional attendance punches, daily status alerts, OTPs, and salary notifications to our college staff and faculty via Joy PeopleHR SaaS."</em>
    </li>
    <li>Submit for approval. Header approval usually takes <strong>2 to 6 hours</strong>.</li>
  </ol>

  <h2>4. TRAI November 18, 2025 Direction on Variable Tagging</h2>
  <div class="callout callout-trai">
    <strong>Mandatory TRAI Rule (Annexure-I Directive):</strong><br>
    Effective immediately, every dynamic variable in an SMS template must be assigned a descriptive tag. Generic variables without designated tags will be rejected by telecom firewalls during message scrubbing.
  </div>

  <table class="content-table">
    <thead>
      <tr>
        <th style="width: 25%;">TRAI Tag</th>
        <th style="width: 25%;">Portal Label</th>
        <th style="width: 25%;">Permitted Characters</th>
        <th style="width: 25%;">Use-Case in Joy PeopleHR</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>{#numeric#}</code></td>
        <td>Numeric / Number</td>
        <td>Digits only (0-9)</td>
        <td>Login OTPs, minutes, amounts</td>
      </tr>
      <tr>
        <td><code>{#alphanumeric#}</code></td>
        <td>Alphanumeric</td>
        <td>Letters, numbers, spaces, symbols (Max 40 chars)</td>
        <td>Staff Name, Punch Time, Date, Leave Status</td>
      </tr>
      <tr>
        <td><code>{#url#}</code></td>
        <td>URL</td>
        <td>Pre-whitelisted domain / link</td>
        <td>College portal / Payslip download link</td>
      </tr>
      <tr>
        <td><code>{#cbn#}</code></td>
        <td>Call-Back Number</td>
        <td>Pre-registered 10-digit or landline</td>
        <td>College HR helpline / Admin office phone</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- PAGE 3: CONTENT TEMPLATES LIBRARY -->
  <h2>5. Pre-Approved SMS Content Templates Library</h2>
  <p>Navigate to <strong>Content Template</strong> &rarr; <strong>Add Template</strong> in the Airtel DLT portal. Copy and paste each template exactly as formulated below:</p>

  <!-- Template 1 -->
  <div class="template-box">
    <div class="template-header">
      <span class="template-name">1. JOYHR_LOGIN_OTP</span>
      <span class="template-tag">Service Implicit</span>
    </div>
    <div class="template-body">
      <div class="template-content">Your login OTP for Joy PeopleHR is {#var#}. Valid for {#var#} minutes. Do not share this OTP with anyone. - Joy PeopleHR</div>
      <div class="template-var-row">
        <span>Tags:</span>
        <span class="var-pill">Var 1: Numeric (OTP Code)</span>
        <span class="var-pill">Var 2: Numeric (Validity Minutes)</span>
      </div>
      <div class="template-sample">Output: "Your login OTP for Joy PeopleHR is 482910. Valid for 5 minutes. Do not share this OTP with anyone. - Joy PeopleHR"</div>
    </div>
  </div>

  <!-- Template 2 -->
  <div class="template-box">
    <div class="template-header">
      <span class="template-name">2. JOYHR_ATTENDANCE_CHECKIN</span>
      <span class="template-tag">Service Implicit</span>
    </div>
    <div class="template-body">
      <div class="template-content">Dear {#var#}, your check-in has been recorded at {#var#} on {#var#}. Have a productive day! - Joy PeopleHR</div>
      <div class="template-var-row">
        <span>Tags:</span>
        <span class="var-pill">Var 1: Alphanumeric (Staff Name)</span>
        <span class="var-pill">Var 2: Alphanumeric (Punch Time)</span>
        <span class="var-pill">Var 3: Alphanumeric (Date)</span>
      </div>
      <div class="template-sample">Output: "Dear Prof. Suresh, your check-in has been recorded at 08:45 AM on 10-Oct-2026. Have a productive day! - Joy PeopleHR"</div>
    </div>
  </div>

  <!-- Template 3 -->
  <div class="template-box">
    <div class="template-header">
      <span class="template-name">3. JOYHR_ATTENDANCE_CHECKOUT</span>
      <span class="template-tag">Service Implicit</span>
    </div>
    <div class="template-body">
      <div class="template-content">Dear {#var#}, your check-out has been recorded at {#var#} on {#var#}. Total logged time: {#var#} hrs. - Joy PeopleHR</div>
      <div class="template-var-row">
        <span>Tags:</span>
        <span class="var-pill">Var 1: Alphanumeric (Staff Name)</span>
        <span class="var-pill">Var 2: Alphanumeric (Punch Time)</span>
        <span class="var-pill">Var 3: Alphanumeric (Date)</span>
        <span class="var-pill">Var 4: Alphanumeric (Total Hours)</span>
      </div>
      <div class="template-sample">Output: "Dear Prof. Suresh, your check-out has been recorded at 05:15 PM on 10-Oct-2026. Total logged time: 8.5 hrs. - Joy PeopleHR"</div>
    </div>
  </div>

  <!-- Template 4 -->
  <div class="template-box">
    <div class="template-header">
      <span class="template-name">4. JOYHR_DAILY_ATTENDANCE_STATUS</span>
      <span class="template-tag">Service Implicit</span>
    </div>
    <div class="template-body">
      <div class="template-content">Dear {#var#}, your attendance status for {#var#} is marked as {#var#}. For queries, contact HR. - Joy PeopleHR</div>
      <div class="template-var-row">
        <span>Tags:</span>
        <span class="var-pill">Var 1: Alphanumeric (Staff Name)</span>
        <span class="var-pill">Var 2: Alphanumeric (Date)</span>
        <span class="var-pill">Var 3: Alphanumeric (Status: Present / Half Day)</span>
      </div>
      <div class="template-sample">Output: "Dear Priya, your attendance status for 10-Oct-2026 is marked as Present. For queries, contact HR. - Joy PeopleHR"</div>
    </div>
  </div>

  <!-- Template 5 -->
  <div class="template-box">
    <div class="template-header">
      <span class="template-name">5. JOYHR_ABSENT_PUNCH_ALERT</span>
      <span class="template-tag">Service Implicit</span>
    </div>
    <div class="template-body">
      <div class="template-content">Dear {#var#}, no punch was recorded for your shift on {#var#}. Please apply for regularization or leave on the app. - Joy PeopleHR</div>
      <div class="template-var-row">
        <span>Tags:</span>
        <span class="var-pill">Var 1: Alphanumeric (Staff Name)</span>
        <span class="var-pill">Var 2: Alphanumeric (Date)</span>
      </div>
      <div class="template-sample">Output: "Dear Ramesh, no punch was recorded for your shift on 10-Oct-2026. Please apply for regularization or leave on the app. - Joy PeopleHR"</div>
    </div>
  </div>

  <!-- Template 6 -->
  <div class="template-box">
    <div class="template-header">
      <span class="template-name">6. JOYHR_SALARY_PROCESSING_ALERT</span>
      <span class="template-tag">Service Implicit</span>
    </div>
    <div class="template-body">
      <div class="template-content">Dear {#var#}, your salary for the month of {#var#} is processed and will be credited to your registered bank account soon. - Joy PeopleHR</div>
      <div class="template-var-row">
        <span>Tags:</span>
        <span class="var-pill">Var 1: Alphanumeric (Staff Name)</span>
        <span class="var-pill">Var 2: Alphanumeric (Month/Year)</span>
      </div>
      <div class="template-sample">Output: "Dear Ramesh, your salary for the month of September 2026 is processed and will be credited to your registered bank account soon. - Joy PeopleHR"</div>
    </div>
  </div>

  <!-- Template 7 -->
  <div class="template-box">
    <div class="template-header">
      <span class="template-name">7. JOYHR_SALARY_CREDITED_SUCCESS</span>
      <span class="template-tag">Service Implicit</span>
    </div>
    <div class="template-body">
      <div class="template-content">Dear {#var#}, your salary for {#var#} has been credited. You can download your payslip from the employee portal: {#var#}. - Joy PeopleHR</div>
      <div class="template-var-row">
        <span>Tags:</span>
        <span class="var-pill">Var 1: Alphanumeric (Staff Name)</span>
        <span class="var-pill">Var 2: Alphanumeric (Month)</span>
        <span class="var-pill">Var 3: URL (Whitelisted Link)</span>
      </div>
      <div class="template-sample">Output: "Dear Ramesh, your salary for Sept 2026 has been credited. You can download your payslip from the employee portal: https://joypeoplehr.com. - Joy PeopleHR"</div>
    </div>
  </div>

  <!-- Template 8 -->
  <div class="template-box">
    <div class="template-header">
      <span class="template-name">8. JOYHR_LEAVE_STATUS_UPDATE</span>
      <span class="template-tag">Service Implicit</span>
    </div>
    <div class="template-body">
      <div class="template-content">Dear {#var#}, your leave request for {#var#} has been {#var#}. Check details on the portal. - Joy PeopleHR</div>
      <div class="template-var-row">
        <span>Tags:</span>
        <span class="var-pill">Var 1: Alphanumeric (Staff Name)</span>
        <span class="var-pill">Var 2: Alphanumeric (Date/Duration)</span>
        <span class="var-pill">Var 3: Alphanumeric (Approved / Rejected)</span>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- PAGE 4: LETTER OF AUTHORIZATION TEMPLATE -->
  <h2>6. Annexure A: Official Letter of Authorization (LOA)</h2>
  <p><em>(To be printed on the official College / Trust Letterhead, signed by Principal / Chairman, and uploaded during DLT Registration)</em></p>

  <div class="loa-box">
    <div class="title">LETTER OF AUTHORIZATION</div>
    <p><strong>To:</strong><br>
    The Nodal Officer / Enterprise DLT Registration Team,<br>
    Bharti Airtel Limited (Airtel IQ DLT Portal)</p>

    <p style="margin-top: 10px;">
      <strong>Date:</strong> <span class="blank-line">[DD / MM / YYYY]</span><br>
      <strong>Subject:</strong> Authorization for Registration as Principal Entity on Airtel DLT Platform
    </p>

    <p style="margin-top: 12px;">Dear Sir / Madam,</p>

    <p style="text-align: justify; margin-top: 8px;">
      This is to certify that <strong><span class="blank-line" style="min-width: 250px;">[Insert Registered College / Trust Name]</span></strong> (PAN: <strong><span class="blank-line">[Insert Entity PAN]</span></strong>), situated at <strong><span class="blank-line" style="min-width: 300px;">[Insert Registered College Address]</span></strong>, hereby authorizes <strong><span class="blank-line" style="min-width: 220px;">[Name of Authorized Person]</span></strong>, holding designation as <strong><span class="blank-line">[Principal / Director / Admin Officer]</span></strong> (Mobile: <strong><span class="blank-line">[Mobile Number]</span></strong>, Email: <strong><span class="blank-line">[Official Email ID]</span></strong>), to act as the Authorized Signatory on our behalf.
    </p>

    <p style="text-align: justify; margin-top: 8px;">
      The authorized signatory is empowered to register our entity, submit KYC documentation, register Headers (Sender IDs), register SMS Content Templates, whitelist web URLs/CTAs, and manage all communications in compliance with the Telecom Commercial Communications Customer Preference Regulations, 2018 (TCCCPR, 2018) and relevant TRAI directives.
    </p>

    <p style="text-align: justify; margin-top: 8px;">
      We hereby confirm that all SMS dispatches initiated through our registered headers and templates on the Joy PeopleHR platform shall be strictly for official administrative, attendance, security OTP, and staff payroll notifications.
    </p>

    <div style="margin-top: 40px; display: flex; justify-content: space-between;">
      <div>
        <p><strong>Specimen Signature of Authorized Person:</strong></p>
        <div style="height: 45px;"></div>
        <p>_____________________________________</p>
        <p>Name: <span class="blank-line">[Authorized Person Name]</span></p>
      </div>
      <div style="text-align: right;">
        <p><strong>For [College / Trust Name]</strong></p>
        <div style="height: 45px;"></div>
        <p>_____________________________________</p>
        <p><strong>Principal / Chairman / Secretary</strong></p>
        <p>(Official Seal & Rubber Stamp)</p>
      </div>
    </div>
  </div>

  <h2>7. Handover Checklist for Joy PeopleHR Technical Team</h2>
  <p>Once your Airtel DLT portal approvals are received, please share the following details with the Joy PeopleHR deployment team to bind your college's live SMS gateway:</p>

  <table class="content-table">
    <thead>
      <tr>
        <th style="width: 35%;">Parameter Name</th>
        <th style="width: 45%;">Where to find on Airtel DLT Portal</th>
        <th style="width: 20%;">Format</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. Principal Entity ID (PE ID)</strong></td>
        <td>Top-right profile avatar or Dashboard &rarr; Entity Details</td>
        <td>19-digit numerical number</td>
      </tr>
      <tr>
        <td><strong>2. Approved Header (Sender ID)</strong></td>
        <td>Headers menu &rarr; Approved Headers list</td>
        <td>6-character alphabet string (e.g. <code>SJCHRM</code>)</td>
      </tr>
      <tr>
        <td><strong>3. Content Template IDs</strong></td>
        <td>Content Templates &rarr; Approved Templates list</td>
        <td>19-digit number for each template</td>
      </tr>
      <tr>
        <td><strong>4. Whitelisted URL / CTA</strong></td>
        <td>Telemarketer / CTA Whitelist &rarr; Approved URLs</td>
        <td>Domain link (e.g. <code>joypeoplehr.com</code>)</td>
      </tr>
    </tbody>
  </table>

  <div class="footer-note">
    Joy PeopleHR Enterprise SaaS &bull; Technical Support: support@joypeoplehr.com &bull; Confidential & Property of Client College
  </div>

</body>
</html>
`;

async function generatePdf() {
  const outputDir = path.resolve('Test Data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'Airtel_DLT_College_Registration_Guide.pdf');
  const htmlPath = path.join(outputDir, 'Airtel_DLT_College_Registration_Guide.html');

  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log('HTML written to:', htmlPath);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '12mm',
      bottom: '12mm',
      left: '12mm',
      right: '12mm'
    }
  });

  await browser.close();
  console.log('PDF successfully generated at:', outputPath);
}

generatePdf().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
