# Joy PeopleHR — Complete Live Demo Presentation Guide

**Master Script, Screen Walkthrough & Presenter Safety Playbook**  
**Audience:** Internal Leadership, Co-workers, Enterprise Evaluators, Sales Prospects  
**Standard Demo Environment:** `http://localhost:3000` (Web) • Android APK Build 6 (Mobile)  

---

## 1. Demo Safety Checklist (Verify 10 Minutes Before Presentation)

Before welcoming stakeholders, verify each item:

- [ ] **Web Server Active**: `npm run dev` running smoothly on `http://localhost:3000`.
- [ ] **Database Reachable**: Supabase PostgreSQL (`ysiajemrqakfngasehhi`) connected without network blocks.
- [ ] **Auth Pre-Check**: Test logging in as HR Head (`marimuthu@joycorporatesolutions.com`).
- [ ] **Vendor Portal Pre-Check**: Test logging in as Vendor Admin (`vendor@joycorporatesolution.com`).
- [ ] **Zero Destructive Actions Warning**: Never click "Delete Employee", "Drop Database", or "Purge Attendance" during a live presentation. Use the pre-seeded demo records.
- [ ] **Browser Console Clean**: Press `F12` to ensure no uncaught exceptions are clogging the console.

---

## 2. Pre-Seeded Demo Data Inventory

Use these real records during the demonstration:

| Domain | Entity / Record | Key Values to Highlight |
| :--- | :--- | :--- |
| **Enterprise Tenant** | Joy Corporate Solutions | Top-level parent organization (`org-test-enterprise-global-001`) |
| **Company Entity** | Joy Corporate Solutions Pvt Ltd | Legal company entity with Chennai HQ & Tech Park branch |
| **HR Head User** | Marimuthu | `marimuthu@joycorporatesolutions.com` / `HR_HEAD` role |
| **Sample Full-Time Employees** | Dharun B (`EMP-001`)<br>Danya R (`EMP-002`)<br>Gokul M (`EMP-003`) | Real departments: Engineering, Human Resources, Operations.<br>Complete salary structures and KYC documents uploaded. |
| **Vendor Agency** | Joy Corporate Workforce & Contracting Solutions Pvt Ltd | Code: `vnd-joy-workforce-001`<br>CLRA License: `LIC-CLRA-2026-0091`<br>Form V Valid. |
| **Vendor Demo Account**| `vendor@joycorporatesolution.com` | Password: `JoyVendor#2026!` (1-click Auto-Fill card on `/vendor/login`) |
| **Contract Personnel** | Arun Kumar, Priya Sharma, Suresh Raina | 8 active contract personnel deployed at Chennai Tech Park |
| **Purchase Order** | `PO-2026-JOY-088` | ₹25,00,000 authorized value • Manpower supply contract |
| **Reconciled Invoice** | `INV-2026-08-01` | Period: August 2026 • Status: **100% 3-Way Match Passed** |

---

## 3. 15-Minute Optimized Presentation Track

| Timeline | Phase | Screens & Features Covered |
| :--- | :--- | :--- |
| **0:00 – 2:00** | **Product & Vision** | Dashboard metrics, unified HRMS + biometric + payroll + vendor philosophy. |
| **2:00 – 4:30** | **Core People & Onboarding**| Employee directory, Profile Drawer, 13-step Onboarding Wizard overview. |
| **4:30 – 8:00** | **Attendance & Biometrics** | 12 Status Tiles, 1-click drilldown into Employee Muster, Biometric device gateway. |
| **8:00 – 11:30**| **Authoritative Payroll** | Payroll processing run, 2x Overtime calculation, EPF/ESIC deductions, Payslip PDF. |
| **11:30 – 13:30**| **Vendor 3-Way Match** | Vendor Portal login, Contract workforce muster, PO vs Invoice 3-Way Match. |
| **13:30 – 15:00**| **Mobile App & Wrap-up** | Flutter Mobile ESS demo (Clock-in, Leave, Payslip viewing), Q&A closure. |

---

## 4. Screen-by-Screen Presenter Script

### Screen 1: HR Executive Dashboard
- **What to Click**: Navigate to `http://localhost:3000/dashboard`.
- **What to Show**: The main metrics strip (Total Workforce, Present Today, Pending Approvals, Monthly Payroll Burn) and Real-time Telemetry.
- **What to Say**:
  > *"Welcome to Joy PeopleHR. What you see here is the command center of the enterprise. Unlike traditional HR software that relies on stale daily batches, our dashboard displays real-time metrics pulled directly from our database. Notice the Live Synced indicator reflecting synchronized operational state."*
- **What Data is Being Used**: Active employees and current date attendance records from Supabase.
- **Expected Result**: Clean layout, no skeleton hanging, instant metric cards.
- **Backup if it Fails**: Click the "Sync Live" button in the top action bar to refresh telemetry.

---

### Screen 2: Employee Directory & Complete Profile Drawer
- **What to Click**: Click **Employee Management** (`/people`) in the sidebar, then click on employee **Dharun B**.
- **What to Show**: The sliding Employee Profile Drawer showing Identity, Employment, Department, Shift, Bank Details, and Statutory UAN/ESIC.
- **What to Say**:
  > *"Here HR manages the full employee identity. We maintain strict separation between HR-administrative data and employee self-service records. Notice that bank account details, statutory PF and ESI credentials, and assigned shifts are stored in normalized tables with encryption at rest."*
- **Expected Result**: Drawer slides in smoothly from the right with all tabs accessible.
- **Backup if it Fails**: Click the search input, type "Dharun", and hit Enter to reload the specific profile.

---

### Screen 3: Attendance Dashboard & Drilldown Navigation
- **What to Click**: Click **Attendance Dashboard** (`/attendance`) in the sidebar. Click the **Present** status KPI tile.
- **What to Show**: Seamless transition to `/attendance/employees?att_status=Present&att_tile=present` with the filter chip banner. Then click the browser **Back** button.
- **What to Say**:
  > *"This is our 12-KPI Attendance Engine. Notice the mathematical invariant at the top: Present plus Absent plus On-Leave plus Not-Clocked strictly equals Total Headcount. When I click any tile, such as 'Present', the system performs an exact semantic drilldown. Watch what happens when I click the browser Back button: in exactly one click, we are back on the main dashboard without any broken intermediate pages."*
- **Expected Result**: Clean URL update, table filtered, single-click Back navigation.
- **Backup if it Fails**: Use the top sub-nav tab "Dashboard" to return.

---

### Screen 4: Biometric IoT Hardware Integration
- **What to Click**: In the sidebar under `CLOCKING & DEVICES`, click **Biometric Devices** (`/biometric`).
- **What to Show**: Device cards (eSSL SilkBio-101, ZKTeco MB20) showing IP address, Port 4370, Online status, and last synced timestamp.
- **What to Say**:
  > *"Joy PeopleHR interfaces directly with standard physical biometric terminals over raw TCP/IP sockets using port 4370. To protect against network latency in high-density factory environments, our architecture utilizes a database-first ingestion pipeline: raw hardware events are immediately recorded in an immutable punch ledger and processed asynchronously by our attendance rules engine."*
- **Expected Result**: Device grid displayed with online badges and device details.

---

### Screen 5: Authoritative Payroll Processing & Digital Payslip
- **What to Click**: In the sidebar under `PAYROLL`, click **Payroll Processing & Runs** (`/payroll/runs`).
- **What to Show**: The monthly payroll processing batch, total gross wages, statutory EPF and ESIC breakdowns, and click **View Payslip**.
- **What to Say**:
  > *"Our payroll calculation engine is mathematically authoritative. It directly ingests the locked attendance muster and computes overtime at double rates as mandated by the Code on Wages 2019. It enforces the statutory ₹15,000 EPF ceiling, computes 12% employee PF and 13% employer contributions, applies ESIC rules, and outputs verified digital payslips with instant PDF export capabilities."*
- **Expected Result**: Payslip modal renders with exact mathematical parity between earnings and deductions.
- **Backup if it Fails**: Click the "Download PDF" button to demonstrate file output.

---

### Screen 6: Vendor Portal & Commercial 3-Way Match
- **What to Click**: Open an incognito window or log out, navigate to `http://localhost:3000/vendor/login`.
- **What to Show**: Click the **1-Click Auto-Fill** button on the In-House Demo card (`vendor@joycorporatesolution.com`), then click **Sign In as Vendor**.
- **What to Say**:
  > *"Now let us step into the shoes of an external staffing agency. Notice this dedicated 1-click In-House Demo account. When I sign in, the vendor enters an isolated, secure workspace. The vendor can see their 8 deployed workers and their biometric attendance. Most importantly, under Invoices, our system automatically performs a Commercial 3-Way Match: comparing biometric man-days against the Purchase Order authorized rate and the Vendor's Tax Invoice before releasing payment."*
- **Expected Result**: Lands cleanly on `/vendor-portal/dashboard` or `/vendor-settlement-workspace` with PO `PO-2026-JOY-088` and invoice `INV-2026-08-01` showing **MATCHED**.

---

### Screen 7: Flutter Mobile Application (Employee Self-Service)
- **What to Show**: Present the Android/iOS simulator or demo recording of the Flutter app (`JOY_PeopleHR_v1.0.1_build6.apk`).
- **What to Show**:
  1. Geofenced Clock-In: Showing GPS detection inside the office radius.
  2. Leave Balance Cards: Casual Leave, Sick Leave with live remaining balances.
  3. Digital Payslip: Scrolling through monthly payslips with the native PDF viewer.
- **What to Say**:
  > *"For employees in the field or on the shop floor, our native Flutter app provides a clean, Klarna-inspired mobile experience. Punches are geofenced against the employee's assigned work location, leave balances are fetched directly from our Supabase PostgreSQL ledger, and payslips can be securely downloaded straight to the mobile device."*
