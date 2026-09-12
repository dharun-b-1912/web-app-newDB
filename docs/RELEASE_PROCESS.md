# JOY PeopleHR — Controlled Software Delivery & Release Process

## 1. Release Lifecycle Stages

```
DEVELOPMENT (feature branches)
      ↓
PULL REQUEST → Automated Quality Gates (CI)
      ↓
MERGE TO QA → Build QA APK → Firebase App Distribution (joy-qa)
      ↓
MERGE TO STAGING → Firebase Test Lab Matrix → Distribute (joy-hr-uat, joy-pilot)
      ↓
RELEASE CANDIDATE → QA & UAT Sign-off
      ↓
PRODUCTION APPROVAL → Build Signed AppBundle → Google Play Console
      ↓
CRASHLYTICS & SLA MONITORING
```

---

## 2. Release Channels & Tester Groups

| Channel | Target Audience | Branch | Distribution Tool | Artifact Type |
| :--- | :--- | :--- | :--- | :--- |
| **DEV** | Core Developers | `develop` | Local / Firebase | Debug APK |
| **QA** | QA Testing Team | `qa` | Firebase App Distribution (`joy-qa`) | Signed Release APK |
| **INTERNAL** | HR, Management | `staging` | Firebase App Distribution (`joy-product`) | Signed Release APK |
| **UAT / PILOT**| Pilot Customers | `staging` | Firebase App Distribution (`joy-hr-uat`, `joy-pilot`) | Signed Release APK |
| **PRODUCTION** | Live Employees | `main` (Tags) | Google Play Store / Web Host | Signed AppBundle (.aab) |

---

## 3. Release Blocker Criteria
A release is blocked if ANY of the following occur:
- Any failing unit, widget, or integration test.
- Any TypeScript or Flutter analyze error.
- Any multi-tenant isolation failure or cross-organization data leakage.
- Any duplicate attendance creation or race condition during concurrency tests.
- Production environment misconfiguration (`APP_ENV != production`).
- Unverified keystore signing.
