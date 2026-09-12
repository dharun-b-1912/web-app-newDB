# JOY PeopleHR — Strict Environment Architecture

## 1. Environment Separation Matrix

| Environment | `--dart-define=APP_ENV` | Debug Menus | Mock Biometrics | Dev Auto-Login | Crashlytics Collection | Target Audience |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEV** | `dev` | ENABLED | ENABLED | ENABLED | Disabled / Opt-in | Local developers |
| **QA** | `qa` | ENABLED (Guarded) | DISABLED | DISABLED | ENABLED | QA Engineers |
| **STAGING** | `staging` | DISABLED | DISABLED | DISABLED | ENABLED | Pilot customers / UAT |
| **PRODUCTION**| `production` | **STRICTLY DISABLED** | **STRICTLY DISABLED** | **STRICTLY DISABLED** | ENABLED | Live Customers |

---

## 2. Compile-Time Build Commands

### QA Build:
```bash
flutter build apk --release \
  --dart-define=APP_ENV=qa \
  --dart-define=APP_VERSION=1.0.3 \
  --dart-define=APP_BUILD_CODE=184
```

### Production Build:
```bash
flutter build appbundle --release \
  --dart-define=APP_ENV=production \
  --dart-define=APP_VERSION=1.0.3 \
  --dart-define=APP_BUILD_CODE=184 \
  --dart-define=GIT_COMMIT_SHA=$(git rev-parse --short HEAD)
```
