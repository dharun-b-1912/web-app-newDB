# Joy PeopleHR — Known Limitations & Demo Presentation Risks

**Honest, Forensic Transparency for Internal Stakeholders & Presenters**  
**Core Rule:** Never claim a feature is fully autonomous or production-ready if the codebase reveals it is partially implemented, UI-only, or pending third-party API keys.

---

## 1. Feature-by-Feature Status & Limitations

### 1. Document E-Signatures
- **Status:** **UI ONLY / PLANNED**
- **What is Working:** Document categories, uploading employee PDFs/images to Supabase Storage bucket `employee-documents`, document preview modal, and verification status toggle (`PENDING` ➔ `VERIFIED` ➔ `REJECTED`).
- **What is NOT Working:** There is no live integration with legal digital signature providers (such as DocuSign, Adobe Sign, or Indian Aadhaar e-Sign / DigiLocker).
- **Presenter Advice:** Present the Document Vault as an enterprise compliance repository for KYC and certificate storage. If asked about E-Sign, state: *"E-Sign workflow templates are designed in the UI; automated third-party e-sign gateway integration is on the Q4 roadmap."*

---

### 2. Bank Salary Disbursement
- **Status:** **IMPLEMENTED (Batch File Output) / MANUAL GATEWAY**
- **What is Working:** Employee bank accounts (Account Number, IFSC, Bank Name) are stored. When a monthly payroll run is completed, the system generates a downloadable NEFT/RTGS bulk payment batch file (Excel/CSV) formatted for Indian corporate banking portals (HDFC, ICICI, SBI).
- **What is NOT Working:** There is no direct Open Banking API integration (e.g. RazorpayX or Cashfree API) that executes real-time wire transfers straight from the UI button.
- **Presenter Advice:** Show the generated bank disbursement batch file and explain: *"Finance teams download this standard NEFT/RTGS schedule for one-click upload into their corporate net banking portal."*

---

### 3. Full & Final Settlement (F&F)
- **Status:** **PARTIALLY IMPLEMENTED**
- **What is Working:** Separation requests, last working day tracking, notice period recovery calculation, and leave encashment mathematical formulas.
- **What is NOT Working:** The final multi-department asset clearance sign-off workflow is partially manual.
- **Presenter Advice:** Show the separation request queue and salary calculation rather than walking through a complete live multi-department exit sequence.

---

### 4. Biometric Terminal Auto-Discovery
- **Status:** **IMPLEMENTED (Static IP/Port Registration)**
- **What is Working:** Adding devices with known IP addresses and Port 4370, status heartbeats, and reading transaction logs through `node-zklib`.
- **What is NOT Working:** There is no Zero-Config mDNS / UPnP auto-discovery that scans the entire local area network for unconfigured hardware terminals without typing their IP address.
- **Presenter Advice:** Use the pre-seeded biometric device cards (eSSL SilkBio-101 and ZKTeco MB20) in the demo.

---

### 5. Recruitment / ATS & LMS Enterprise Add-ons
- **Status:** **PARTIALLY IMPLEMENTED (UI + Database Schema)**
- **What is Working:** Job requisition lists, candidate pipelines, course libraries, and enrollment tables exist in the schema and web views.
- **What is NOT Working:** Resume parsing (AI OCR) and external job board syndication (e.g. posting to LinkedIn/Naukri automatically) are not implemented.
- **Presenter Advice:** Focus the presentation on Joy PeopleHR's primary core strength: **Workforce Operations, Biometric Time & Attendance, Statutory Payroll, and Vendor 3-Way Matching**. Present Recruitment and LMS briefly as integrated extension modules.

---

## 2. Live Demo Traps to Avoid

1. **Do NOT Click "Delete" on Demo Employees**:
   - Dharun B, Danya R, and Gokul M have linked salary structures, KYC files, and August 2026 attendance. Deleting them will cause foreign key cascading or empty attendance states during later screens.
2. **Do NOT Switch Active Company to an Empty Tenant**:
   - Stick to `Joy Corporate Solutions Pvt Ltd` (the primary pre-seeded demo company).
3. **Do NOT Expect External Emails to Send Without SMTP Configuration**:
   - Notifications and approval alerts write directly to `public.notification_events` and display on the UI notification bell. Do not promise that test employees will receive real external emails unless SendGrid/Resend SMTP environment variables are configured.
