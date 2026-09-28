# Joy PeopleHR — Presenter Q&A Defense Playbook

**Factual, Codebase-Grounded Answers to Tough Stakeholder & Technical Questions**  
**Core Rule:** Confidently explain how the system actually works without guessing or making speculative claims.

---

### Q1: How does multi-tenancy work?
**Presenter Answer:**  
> *"Joy PeopleHR enforces multi-tenancy at two levels: Logical Grouping in the application layer and Kernel-Level Row-Level Security in PostgreSQL. Every single database query evaluates `organization_id` and `company_id`. Even if a malicious user tampers with the web client, the Supabase database automatically rejects any query attempting to read or mutate another company's records. Third-party vendors are isolated into a completely separate `PortalType.VENDOR` sandbox with zero access to internal employee records."*

---

### Q2: How does biometric attendance reach payroll?
**Presenter Answer:**  
> *"Biometric devices (like eSSL and ZKTeco) send raw punch events over TCP/IP socket port 4370 to our background IoT edge connector. The connector deduplicates punches and writes them into `attendance_punches`. Our database rule engine matches the biometric numeric PIN to the employee, evaluates shift timings, and determines daily status (Present, Late, Half-Day, or OT). At month-end, HR locks the attendance muster; the authoritative payroll engine directly reads payable days and approved 2x overtime hours to compute gross and net salaries."*

---

### Q3: Can vendors manage their own workforce?
**Presenter Answer:**  
> *"Yes. Manpower staffing vendors have a dedicated portal at `/vendor/login`. They can add their contract personnel, upload contractor KYC, view daily biometric shift attendance, and track active Purchase Orders. When billing, the system executes a 3-Way Match: comparing biometric muster man-days against the authorized PO rate card and the vendor's submitted invoice before HR approves payment."*

---

### Q4: How are employee permissions controlled?
**Presenter Answer:**  
> *"Through a unified 13-role RBAC framework spanning 6 data scopes: `PLATFORM`, `ORGANIZATION`, `COMPANY`, `HR`, `MANAGER`, `TEAM`, and `SELF`. A Manager can only approve leaves and view rosters for their assigned subordinates. An Employee can only view their own records in mobile ESS. Permission checks are enforced in both the React route guards and PostgreSQL RLS policies."*

---

### Q5: How does payroll calculate deductions?
**Presenter Answer:**  
> *"Our calculation engine strictly follows Indian statutory formulas:
> - **EPF**: Computes 12% employee contribution on Basic + DA (capped at ₹15,000 statutory limit) and 13% employer contribution (split into EPS 8.33%, EPF 3.67%, Admin 0.5%, EDLI 0.5%).
> - **ESIC**: Automatically applies 0.75% employee and 3.25% employer contributions for employees earning Gross $\le ₹21,000$.
> - **Professional Tax**: Evaluates employee gross earnings against state-specific slab rules.
> - **Loss of Pay (LOP)**: Linearly prorates Basic and HRA based on unattended working days."*

---

### Q6: How does mobile synchronize?
**Presenter Answer:**  
> *"Our Flutter mobile app connects directly to Supabase via authenticated HTTPS/REST. Daily attendance and leave balances are cached locally in SharedPreferences for instant UI rendering. If an employee clocks in while outside internet coverage, the punch is queued offline and automatically submitted with tamper-proof timestamps when connectivity resumes."*

---

### Q7: What happens when a biometric device is offline?
**Presenter Answer:**  
> *"Physical terminals store up to 100,000 punches in internal flash memory. When connectivity is restored, our edge connector queries the device's transaction log using `node-zklib`, reads the backlogged records, and reconciles them into the database without missing a single employee clock-in."*

---

### Q8: How does employee onboarding work?
**Presenter Answer:**  
> *"HR uses a comprehensive 13-step wizard covering Personal Identity, Contact Details, Emergency Contacts, Addresses, Department & Designation, Manager Assignment, Salary Structure & CTC, Statutory EPF/ESIC/PAN, Bank Account, KYC Document Uploads, and System Access Provisioning. Upon completion, a transactional commit provisions the employee master record and generates their user account."*

---

### Q9: Can employees access their payslips on mobile?
**Presenter Answer:**  
> *"Yes. As soon as HR finalizes and publishes a payroll run, payslips are generated and stored securely in the `payslips` storage bucket. Employees can view their earnings and deductions breakdown in the mobile app and download or print the official PDF payslip using our native PDF viewer."*

---

### Q10: Which features are currently 100% complete versus planned?
**Presenter Answer:**  
> *"Joy PeopleHR's core operations are 100% production-ready: Employee Lifecycle, Multi-Tenant Hierarchy, Biometric & GPS Attendance, Shift Master, Leave Management & Ledger, Statutory Indian Payroll, Vendor Portal with 3-Way Match, and Mobile ESS. Extended modules like Document E-Signatures (currently KYC verification), ATS Resume Parsing, and LMS Video Streaming are scheduled in the upcoming roadmap."*
