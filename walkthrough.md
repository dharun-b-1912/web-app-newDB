# Production-Grade Cross-Midnight Shift and Attendance Engine Walkthrough

## 1. Confirmed Root Causes & Defects Discovered

### A. Hardcoded Morning Cutoff in Database Functions
- **Defect**: PostgreSQL stored procedures `fn_determine_attendance_session_date` and `trg_fn_set_punch_attendance_date` hardcoded `IF v_punch_time_only < TIME '06:00:00' THEN v_session_date := v_session_date - 1;`.
- **Impact**: Shift `NS-01` runs from **19:30 to 07:30 IST**. Any punch recorded at 06:15, 07:00, 07:30, or 08:00 AM on 30 October was stamped with `attendance_date = 2026-10-30` instead of closing the 29 October night-shift session.
- **Evidence**: On 30-10-2026, Ranjith P appeared as `Not Checked In` because morning punches failed to pair with the overnight shift.

### B. Missing Shift Assignment in PostgreSQL
- **Defect**: Ranjith P (`75674ef6-47c0-43f9-87e0-8e1dc6387a55`) had no row in `employee_shift_assignments`.
- **Impact**: Database recalculation fell back to general daytime shift (`GEN-09`, 09:00 AM start). A check-in at 19:42 IST generated a false `late_entry_minutes: 312` (5 hours 12 minutes late), and overtime was incorrectly computed against 480 minutes (8h) rather than 720 minutes (12h).

### C. Trigger Invocation with Punch Date rather than Attendance Session Date
- **Defect**: Trigger `trg_fn_on_punch_recorded` called `fn_recalculate_daily_attendance(NEW.employee_id, v_punch_date)` using `punch_time::DATE` (30 October) instead of `NEW.attendance_date` (29 October).
- **Impact**: The overnight session on the 29th was never recalculated when the morning checkout punch arrived on the 30th.

### D. Hardcoded 480-Minute (8-Hour) Overtime Assumption
- **Defect**: Multiple services (`attendanceEngine.ts`, `attendanceReportExportService.ts`, Edge Functions, and DB triggers) calculated overtime as `MAX(0, net_minutes - 480)`.
- **Impact**: Standard 9h day shifts (e.g., Gopika D, Thirumalai R K) and 12h night shifts generated 1 to 4 hours of fictitious daily overtime even for normal on-time shifts.

### E. Calendar Date Filtering vs. Active Overnight Session Isolation
- **Defect**: The UI queried `attendance_daily` with `WHERE attendance_date = selectedDate`.
- **Impact**: On 30 October morning, the overnight shift started on 29 October was completely filtered out, falsely showing the employee as `Not Checked In`.

---

## 2. Changes Implemented Across the Stack

### 1. Database Migration: `20261030_168_cross_midnight_shift_attendance_engine.sql`
- Configured shift `NS-01`:
  - `start_time = '19:30:00'`, `end_time = '07:30:00'`, `is_overnight = true`
  - `min_half_day_hours = 6.0`, `min_full_day_hours = 12.0`
  - `grace_entry_minutes = 30`, `grace_exit_minutes = 30`
- Inserted permanent shift assignment for Ranjith P on `NS-01`.
- Replaced `fn_determine_attendance_session_date(uuid, timestamptz, text)`:
  - If a punch arrives before 14:00 IST and the employee has an open overnight shift from yesterday (`last_check_out IS NULL`), the punch is attached to yesterday's session date.
- Dropped ambiguous overloaded functions to eliminate PostgREST `PGRST203` errors.
- Updated `trg_fn_set_punch_attendance_date` and `trg_fn_on_punch_recorded` to ensure cross-midnight punches recalculate both session work date and calendar date.
- Re-implemented `fn_recalculate_daily_attendance`:
  - Scheduled duration is properly computed (720 minutes for 12h shift).
  - Late entry is evaluated against 19:30 IST (+30m grace).
  - Overtime is computed against 720 minutes (+30m threshold).

### 2. Frontend Attendance Engine: `src/lib/attendance/attendanceEngine.ts`
- Detects cross-midnight shifts (`expectedOutMinutes < expectedInMinutes`).
- Computes scheduled shift duration: `1440 - expectedInMinutes + expectedOutMinutes`.
- Calculates live elapsed duration across midnight: `(1440 - checkInMinutes) + currentMinutes`.
- Corrects `Missing Punch` logic: An overnight shift starting today is actively working tonight and is **never** flagged as missing checkout until `(attendanceDate + 1) expectedOutMinutes + grace`.
- Restricts overtime to post-checkout time exceeding the shift's actual scheduled duration + policy threshold.

### 3. Report & Overtime Export Service: `src/services/attendance/attendanceReportExportService.ts`
- In `computeEmployeeOvertime`:
  - Dynamically calculates `shiftDuration` based on scheduled start and end times (handling overnight spans).
  - Applies a 30-minute policy threshold past shift end.
  - Requires checkout past scheduled shift end to qualify for overtime (early arrival before shift start no longer inflates overtime).

### 4. API & Data Retrieval: `src/services/attendanceApi.ts`
- In `getDailyAttendanceAsync(date)`:
  - Simultaneously retrieves `attendance_date = date` and previous day's open/completed overnight sessions (`attendance_date = date - 1` with `is_overnight = true`).
  - Carries forward overnight sessions onto Day+1's view with `is_overnight_active: true` and `overnight_work_date`.
  - Preserves shift metadata (`NS-01`, `19:30 - 07:30`, `is_overnight`).

### 5. Employee Attendance UI: `src/features/attendance/subviews/EmployeeAttendanceView.tsx`
- Filters and row matching accept active overnight sessions carrying over into `selectedDate`.
- Displays `NS-01 19:30 - 07:30 [NGT]` with `Session: 2026-10-29` badge on 30 October.
- Displays live elapsed working time and `Working` status rather than `Not Checked In`.

### 6. Edge Ingestion: `supabase/functions/biometric-punch-ingestion/index.ts`
- Removed `< 6.0` hardcode in favor of checking open overnight sessions up to 14:00 IST.
- Computes overtime against scheduled shift duration (720m for 12h shifts, 540m for 9h shifts) rather than hardcoded 480m.

---

## 3. Verification & Test Results

### Automated Test Suite: `src/services/__tests__/crossMidnightAttendanceEngine.test.ts`
- **Test A (Normal Overnight Shift 19:30 -> 07:30)**: Passed (720m gross, 0m late, 0m OT, status: Present).
- **Test B (Midnight Transition at 00:00)**: Passed (270m elapsed, status: Present, not reset).
- **Test C (Early Morning Checkout at 06:00 AM)**: Passed (630m gross, 75m early exit, status: Present).
- **Test D (Missing Checkout Past Morning Cutoff)**: Passed (status: Missing Punch, 0 invented OT).
- **Test J (12h Shift Overtime at 09:30 AM)**: Passed (840m total = 120m OT).
- **Standard 9h Day Shift OT Elimination (Gopika D Scenario)**: Passed (11m post-shift departure generates 0m OT).
- **NS-01 Night Shift Overtime Verification**: Passed (07:30 = 0m OT; 08:30 = 60m OT).

### TypeScript & RPC Verification
- `npm run typecheck` (`tsc --noEmit`): **Passed with 0 errors**.
- Live RPC verification (`scripts/test_deployed_rpcs.ts` against remote PostgreSQL):
  - `fn_recalculate_daily_attendance` returned: `{ shift_code: 'NS-01', is_overnight: true, late_minutes: 0, overtime_minutes: 0, status: 'PRESENT' }`.
  - `fn_determine_attendance_session_date` for 07:30 AM IST returned: `2026-10-29`.
- Live API verification (`scripts/test_ranjith_oct30.ts`):
  - Ranjith P retrieved on 30-10-2026 with `status: 'Present'`, `shift_code: 'NS-01'`, `is_overnight: true`, `is_overnight_active: true`, `work_date: '2026-10-29'`.

---

# eSSL MB160 Hardware Compatibility Audit & Integration Architecture

## 1. Hardware Compatibility Report (eSSL MB160)

### A. Verified Physical Device Specifications (Confirmed via Live Terminal Diagnostics)
* **Model / Device Name**: `eSSL MB160` (Motherboard label: `x 2008`)
* **Serial Number (SN)**: `JNP2263200782`
* **MAC Address**: `00:17:61:12:a4:3b`
* **Hardware Platform**: `ZMM220_TFT` (Dual-core ARM Linux architecture)
* **Facial Recognition Algorithm**: `Face VX7.0` (Dual IR cameras)
* **Fingerprint Algorithm**: `Finger VX10.0` (Optical SilkID sensor)
* **Cellular / Mobile Network Status**:
  * **Module Status**: **`Connected`**
  * **Network Mode**: **`FDLTE`** (4G LTE SIM data)
  * **Assigned Carrier IP**: `100.64.211.128` (Airtel / Jio Carrier-Grade NAT)
  * **Heartbeat Server**: `8.8.8.8` (Google Public DNS)
* **Cloud Push Settings**:
  * **Server Mode**: `ADMS`
  * **Enable Domain Name**: `ON`
  * **Server Address**: `adms.joypeoplehr.com`
  * **Server Port**: `80`
* **SaaS Tenant Binding**:
  * **Organization**: `0c621892-e938-4707-9957-13534ea32c19` (JOY Corporate Solutions Pvt Ltd)
  * **Database Device ID**: `45f06da9-066b-428c-baa7-973c500850a6`
  * **Registered Name**: `eSSL MB160 — Bus Attendance Terminal`
  * **Active Status**: `true` | **Direction**: `BOTH` (Check-In & Check-Out)

### B. Confirmed Capabilities (From eSSL Official Hardware Specifications & Quick-Start Guide)
* **Core Modalities**: Multi-biometric terminal featuring facial recognition (dual infrared camera system) and optical fingerprint sensor (SilkID / standard optical depending on revision).
* **Display & User Feedback**: 2.8-inch TFT color screen with audible voice prompts and keypad for PIN / password entry.
* **Standard Physical Interfaces**:
  * 1× RJ-45 10/100 Mbps Ethernet port (TCP/IP).
  * 1× USB Host port (for USB flash drive log download / firmware update).
* **Communication Protocols in Firmware**:
  * **TCP/IP direct socket** (port 4370) for local LAN discovery.
  * **ADMS / iClock Cloud Push protocol** (`/iclock/cdata` HTTP push).
* **Onboard Flash Memory Capacity**:
  * Up to 1,500 face templates (or 1,200 depending on firmware build).
  * Up to 2,000 fingerprint templates.
  * Up to 100,000 offline attendance log records buffered in persistent non-volatile flash memory.

### B. Capabilities Requiring Live Device Test
* **Cellular Data Transmission (2G/3G/4G GPRS)**: 
  * The standard eSSL MB160 specification lists Wi-Fi and GPRS/4G as **optional add-on modules**.
  * A physical inspection of the terminal's back/internal compartment and the `Comm. -> Wireless Network / Cellular` menu is required to verify if a SIM card slot and cellular modem are physically installed.
* **Outbound HTTPS / TLS Cipher Support**:
  * Embedded Linux on MB160 typically speaks plain HTTP (`http://server:port/iclock/cdata`). Older ZKTeco/eSSL ADMS firmware lacks modern TLS 1.3/SNI ciphers.
  * Live test required: Determine if the device firmware accepts an `https://` domain or requires an HTTP port (or edge proxy/gateway like Nginx/Cloudflare termination).
* **DNS Resolution over Cellular**:
  * Test whether domain names (e.g. `adms.joypeoplehr.com`) resolve properly over the carrier's mobile APN or if a static public IPv4 is required.

### C. Capabilities Requiring Vendor Confirmation (eSSL / ZKTeco)
* **Transaction Sequence Numbers**: Confirm whether the MB160 ADMS push payload includes a strictly monotonic event ID (`LogID` or `Stamp`) across power cycles to serve as an immutable hardware transaction identifier.
* **Cellular Keep-Alive / CGNAT Behavior**: Clarify if the cellular modem maintains a persistent TCP keep-alive or tears down the PDP context between punch bursts, and whether modem watchdog auto-reboots upon carrier tower handoff failures.
* **Firmware Update Support for ADMS 3.4+**: Verify if latest firmware provides configurable heartbeat frequency (e.g., `Delay=10s`) without battery drain or thermal issues on vehicles.

### D. Unsupported Features (Do NOT Expect from MB160)
* **Built-in GPS Geolocation**: The MB160 does **not** have an onboard GPS receiver. It cannot provide latitude/longitude coordinates of where the punch occurred. Vehicle location must be determined by external vehicle telematics or assigned static route schedules.
* **Inbound Push / Remote Listening over SIM**: Because mobile carriers assign CGNAT private IPs (100.64.0.0/10 or 10.x.x.x) to cellular SIMs, the MB160 **cannot** receive inbound connections. The device **must always initiate outbound HTTP push** to the JOY PeopleHR ADMS server.

---

## 2. Integration Architecture Design

```
+-------------------------------------------------------------+
|                     eSSL MB160 TERMINAL                     |
|  - Face / Fingerprint Verification                         |
|  - Non-volatile Flash Log Buffer (100k events)              |
+-------------------------------------------------------------+
                              |
     [Pathway A: Native SIM]  |  [Pathway B: External 4G Router (Recommended)]
     Internal 4G Cellular     |  Ethernet -> Teltonika / TP-Link 4G CPE
                              v
                Mobile Carrier Network (4G LTE)
               (Carrier-Grade NAT / Outbound Only)
                              |
                              v  HTTPS / TLS (Port 443)
+-------------------------------------------------------------+
|             JOY PeopleHR Cloud ADMS Ingestion Gateway       |
|             (Endpoint: POST /iclock/cdata.aspx)             |
|  1. Device SN Authentication & Tenant Isolation             |
|  2. Idempotency Guard (SHA-256 / Composite Dedup Key)       |
|  3. Flash Memory Buffer Replay Detector                     |
|  4. Durable Raw Event Storage (attendance_punches)          |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|              JOY PeopleHR Canonical Engine                  |
|  1. Device User PIN -> Employee Record Mapping              |
|  2. Operational Date & Overnight Session Resolver           |
|  3. Adaptive Shift Matcher & Grace Period Calculator        |
|  4. Monthly 120-Min Permission Governance (Threshold Rule)  |
|  5. Overtime Eligibility & Break Deduction Engine           |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|           Supabase PostgreSQL Authoritative Records         |
|  - attendance_daily                                         |
|  - attendance_punches                                       |
|  - attendance_monthly_summary                               |
|  - payroll_run_items (Locked / Unfinalized Isolation)       |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                     HR & Operations Hub                     |
|  - Live Employee Attendance Workspace (Web & Mobile)       |
|  - Biometric Hardware Telemetry & Health Dashboard          |
|  - WhatsApp / Airtel IQ Instant Punch SMS Dispatch          |
+-------------------------------------------------------------+
```

### Preferred & Fallback Connection Topologies for Buses & Remote Sites:
1. **Pathway A (Native SIM ADMS)**: If the physical MB160 unit has the optional 4G module installed, insert an industrial M2M SIM card (Airtel IoT / Jio Business with fixed data plan). Configure APN and set Server IP to `adms.joypeoplehr.com`, Port `443` (or reverse proxy port `8088`).
2. **Pathway B (External 4G Industrial Router — Most Reliable for Buses)**: Connect the MB160 RJ45 Ethernet port to an automotive-grade 4G router (e.g. Teltonika RUT240 or TP-Link TL-MR6400) powered by the bus battery (9V-36V DC).
   * **Advantage**: Provides rock-solid cellular antenna reception, automatic carrier failover, and isolates the biometric terminal from vehicle voltage spikes.
3. **Pathway C (Vehicle Gateway Agent)**: For fleets with existing Android telematics or IoT vehicle units, run the lightweight WorkForceOS gateway daemon to ingest punches locally over LAN and forward them with GPS coordinates.

---

## 3. Database Schema & Service Dependency Map

| Component / Layer | Source File / Table | Role in eSSL MB160 Integration |
| :--- | :--- | :--- |
| **ADMS Gateway** | [`supabase/functions/adms-gateway/index.ts`](file:///d:/web-app%20(2)/Joy%20PeopleHR/supabase/functions/adms-gateway/index.ts) | Cloud-edge listener receiving `GET /iclock/cdata` (handshake) and `POST /iclock/cdata` (punch push). |
| **Protocol Parser** | [`src/services/biometric-saas/admsProtocolEngine.ts`](file:///d:/web-app%20(2)/Joy%20PeopleHR/src/services/biometric-saas/admsProtocolEngine.ts) | Parses tab-separated ATTLOG records, maps verify type (`15` = Face, `1` = Fingerprint), computes payload hashes. |
| **Device Registry** | PostgreSQL `biometric_devices` | Holds hardware SN, tenant binding (`organization_id`), branch, and heartbeat timestamp. |
| **Raw Punch Ledger** | PostgreSQL `attendance_punches` | Authoritative punch records with `punch_source = 'BIOMETRIC'`, `verification_mode = 'FACE'`, and `idempotency_key`. |
| **Daily Attendance** | PostgreSQL `attendance_daily` | Consolidated daily record (`first_check_in`, `last_check_out`, `net_minutes`, `status`, `late_minutes`, `overtime_minutes`). |
| **Shift Assignment** | PostgreSQL `employee_shift_assignments` | Maps employee to active shift policy (`GEN-09`, `NS-01`, etc.). |
| **Attendance Engine** | [`src/lib/attendance/attendanceEngine.ts`](file:///d:/web-app%20(2)/Joy%20PeopleHR/src/lib/attendance/attendanceEngine.ts) | Canonical business rules: cross-midnight detection, grace periods, missing punch determination. |
| **Device Workspace** | [`src/features/attendance/subviews/BiometricIntegrationView.tsx`](file:///d:/web-app%20(2)/Joy%20PeopleHR/src/features/attendance/subviews/BiometricIntegrationView.tsx) | Live biometric hardware HUD, telemetry, device management, and error diagnostics. |

---

## 4. Key Operational Rules & Policies

### A. Device Registration & Tenant Isolation
* Every MB160 device is registered with its unique hardware **Serial Number (SN)** and bound to an `organization_id`.
* The ADMS gateway inspects `GET/POST /iclock/cdata?SN=...`. If the serial number is unknown or belongs to another company, the request is rejected with `OK: 0` without processing. No cross-tenant punch leakage is possible.

### B. Idempotency & Flash Memory Outage Recovery
* When an offline bus reconnects, the MB160 flushes buffered punches.
* Idempotency is enforced at the database level:
  $$\text{idempotency\_key} = \text{MD5}(\text{organization\_id} + \text{"::"} + \text{serial\_number} + \text{"::"} + \text{pin} + \text{"::"} + \text{punch\_iso})$$
* **Strict SMS Guard**: Buffered punches with timestamps belonging to past calendar dates are ingested into `attendance_punches` and recalculated in `attendance_daily`, but **never** trigger retrospective live Airtel IQ SMS alerts to avoid alarming employees.

### C. Bus Boarding Attendance vs. Work Shift Attendance
* If an MB160 is installed on an employee bus:
  * A morning punch recorded at **06:45 AM** as the employee boards the bus is tagged with `punch_source = 'BIOMETRIC'` and `location_authorized = true`.
  * The canonical attendance engine reconciles whether the punch is a **Transit / Boarding Verification** or the **Shift Start**, based on the employee's assigned schedule (e.g. shift starts at 08:00 AM at the factory gate).

### D. Monthly 120-Minute Permission Allowance (Threshold-Crossing Rule)
* Each employee has a configurable monthly grace allowance (default: 120 minutes).
* **Threshold Crossing Rule**:
  * Late arrival minutes exceeding shift grace are debited from the monthly allowance ledger.
  * When cumulative late minutes cross the 120-minute threshold on a particular operational date, that specific operational date is flagged for half-day treatment.
  * Past approved dates are never retroactively degraded.

### E. Overtime & Payroll Synchronization
* Raw biometric punches never directly manipulate finalized payroll.
* Overtime is calculated only after shift completion and validated against:
  1. Actual scheduled shift duration (e.g. 720 minutes for 12h night shift, 540 minutes for 9h day shift).
  2. Approved manager overtime requests in `attendance_regularization_requests`.
  3. Finalized payroll periods (`payroll_runs.status = 'FINALIZED'`) are protected by database triggers against accidental mutations.

### F. Multi-Tenant Shared Device & Fleet Flow Architecture
When a single physical biometric terminal (such as an MB160 on a company bus) serves employees from multiple client companies/tenants:

```
                      eSSL MB160 (SN: JNP2263200782)
                                    |
                    Pushes: SN + PIN (e.g. PIN #102)
                                    |
                                    v
+-----------------------------------------------------------------------+
|             JOY PeopleHR Multi-Tenant ADMS Gateway                   |
+-----------------------------------------------------------------------+
| 1. Query Hardware Serial Number:                                      |
|    SELECT * FROM biometric_devices WHERE serial_number = 'JNP2263...' |
|    -> Resolves Authorized Tenant Pool: [Tenant A, Tenant B, Tenant C] |
|                                                                       |
| 2. Dynamic Employee & Tenant Match:                                   |
|    SELECT id, organization_id, employee_code                          |
|    FROM employees                                                     |
|    WHERE organization_id IN (authorized_tenants)                      |
|      AND (employee_code_numeric = PIN OR biometric_pin = PIN)         |
|                                                                       |
| 3. Route Punch to Resolved Tenant:                                    |
|    - Target Org: emp.organization_id (e.g. Tenant B)                  |
|    - Device Record: Tenant B's linked device instance                 |
|    - Shift Policy: Evaluated under Tenant B's active shift rules      |
|    - RLS Isolation: Committed to Tenant B's attendance_punches        |
+-----------------------------------------------------------------------+
         |                                           |
         v                                           v
+-----------------------------+             +-----------------------------+
| Tenant A Attendance Ledger  |             | Tenant B Attendance Ledger  |
| (Isolated PostgreSQL RLS)   |             | (Isolated PostgreSQL RLS)   |
+-----------------------------+             +-----------------------------+
```

#### Predefined Multi-Tenant Setup & Discovery Flow:
1. **Hardware Discovery**:
   - When an MB160 points to `adms.joypeoplehr.com`, its hardware `Serial Number` (`SN`), IP, and MAC are registered.
2. **SaaS Multi-Tenant Assignment**:
   - In **JOY PeopleHR Super Admin / Fleet Hub**, the device can be bound to:
     - **Option 1 (Dedicated Single Tenant)**: Bound exclusively to one organization.
     - **Option 2 (Shared Multi-Tenant Fleet)**: Bound to multiple participating client companies who share transport or facilities.
3. **Zero Cross-Tenant Leakage**:
   - Company A's HR administrators only see their employees' transit/bus punches.
   - Company B's HR administrators only see their employees' transit/bus punches.
   - No company can view or access attendance, profiles, or headcount of any other company sharing the terminal.
