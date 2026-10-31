# JOY PeopleHR — Crashlytics Verification & Health Report

## 1. Crashlytics Configuration Status
- **Service Status:** ACTIVE & INITIALIZED
- **Global Error Handlers:** FlutterError.onError + PlatformDispatcher.instance.onError + Isolate.current error listener.
- **Privacy Sanitization Engine:** Verified active. All JWT tokens, passwords, biometric face/fingerprint templates, and bank numbers are stripped prior to transmission.

---

## 2. Structured Breadcrumb Audit

| Feature | Custom Key | Verification |
| :--- | :--- | :--- |
| **Environment** | `app_env: QA / PROD` | Verified |
| **Attendance Operations** | `feature: attendance`, `source: biometric/mobile` | Verified |
| **Non-Fatal Exceptions** | Clean error codes (e.g. `ATTENDANCE_SOURCE_LOCKED`) | Verified |
| **Test Crash Trigger** | Guarded by `AppEnv.allowDebugMenus` (Inert in Production) | Verified |
