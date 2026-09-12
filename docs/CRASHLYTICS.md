# JOY PeopleHR — Production-Grade Crashlytics & Privacy Specification

## 1. Overview
Firebase Crashlytics is integrated into the Flutter mobile application with enterprise-grade error reporting and strict privacy sanitization.

---

## 2. Privacy & Zero-PII Guarantee
Crashlytics strictly **never** logs or transmits:
- Passwords or credentials
- Session tokens, JWTs, or refresh tokens
- Raw biometric face or fingerprint templates
- Bank account numbers, IFSC codes, or PAN/Aadhaar numbers
- Salary and payroll compensation figures

---

## 3. Structured Breadcrumbs & Error Codes

| Operation | Custom Keys Attached | Safe Error Code |
| :--- | :--- | :--- |
| **Biometric Punch Ingestion** | `feature: attendance`, `source: biometric`, `device_type: eSSL` | `ATTENDANCE_SOURCE_LOCKED` |
| **Mobile Geofence Punch** | `feature: attendance`, `source: mobile_gps` | `GEOFENCE_OUTSIDE_RADIUS` |
| **Session Reconciliation** | `feature: auth`, `app_env: QA/PROD` | `SESSION_EXPIRED_REAUTH` |

---

## 4. Controlled Force Crash Verification
To safely test Crashlytics connectivity, a controlled test trigger `CrashReportingService.instance.testCrash()` is provided.
- **Rule:** This trigger is active **strictly in non-production builds** (`APP_ENV=dev` or `APP_ENV=qa` with debug menus enabled).
- In production (`APP_ENV=production`), this method is completely inert.
