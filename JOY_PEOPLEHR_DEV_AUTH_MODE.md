# JOY PeopleHR — Development Authentication Auto-Login Architecture

**Target Supabase Project:** `ysiajemrqakfngasehhi` (`https://ysiajemrqakfngasehhi.supabase.co`)  
**Mode:** Development-Only Auto-Authentication (Debug Bypass of Login Screen)  
**Security Level:** Full RLS Enforced, Real Supabase Auth JWT, Zero Anonymity / Mocking  
**Date:** 2026-09-04  

---

## 1. Overview & Security Blueprint

To accelerate end-to-end integration and cross-client testing between the **JOY PeopleHR Web Application** and the **JOY PeopleHR Flutter Mobile Application**, a development auto-login mechanism has been implemented.

### Critical Security Principles
1. **NO Anonymous Access / Protected Data Bypasses:**  
   Every API request continues to send real `Authorization: Bearer <JWT>` headers issued by Supabase GoTrue Auth.
2. **NO Supabase RLS Disabling:**  
   PostgreSQL Row Level Security (RLS) is 100% active and enforced across all tables in `ysiajemrqakfngasehhi`.
3. **NO Service Role Key Exposure:**  
   Neither Web nor Flutter clients possess or utilize the Supabase `service_role` key.
4. **NO Hardcoded Credentials in Source Code:**  
   Credentials are read exclusively from local, non-committed environment variables (`.env.local` for Web, `--dart-define` / local config for Flutter).
5. **Strict Production Disablement:**  
   In production builds (`import.meta.env.PROD === true` for Web, `kReleaseMode === true` for Flutter), auto-login is permanently disabled and the standard interactive login UI is rendered.

```
+-----------------------------------------------------------------------------------+
|                              DEV AUTO-LOGIN FLOW                                  |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  App Startup (Web / Flutter)                                                     |
|       │                                                                           |
|       ▼                                                                           |
|  Check Existing Supabase Session                                                  |
|  (supabase.auth.getSession() / currentSession)                                    |
|       │                                                                           |
|       ├─────────────────────────► Session Active? ──────────► [YES]               |
|       │                                                         │                 |
|      [NO]                                                       ▼                 |
|       │                                                 Restore Session           |
|       ▼                                                 (Resolve user_profiles)   |
|  Check DEV Mode & Local Config                                  │                 |
|  (VITE_DEV_AUTH_EMAIL / DEV_AUTH_EMAIL)                         ▼                 |
|       │                                                 Navigate to App           |
|       ├──────────────► Config Missing? ──────► [YES] ──► Show Login Screen        |
|       │                                                                           |
|      [NO]                                                                         |
|       │                                                                           |
|       ▼                                                                           |
|  Log: "JOY PeopleHR DEV AUTH MODE ACTIVE"                                         |
|       │                                                                           |
|       ▼                                                                           |
|  Execute: supabase.auth.signInWithPassword(...)                                  |
|       │                                                                           |
|       ├──────────────► Success? ─────────────► [NO] ───► Fallback to Login Screen |
|       │                                                  (Logs safe diagnostic)   |
|      [YES]                                                                        |
|       │                                                                           |
|       ▼                                                                           |
|  Obtain Real Supabase JWT + auth.uid()                                            |
|       │                                                                           |
|       ▼                                                                           |
|  Canonical Identity Resolution Chain:                                             |
|  auth.uid() ──► user_profiles ──► user_roles ──► employees ──► App Home/Dashboard |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Web Application Implementation Details

- **File:** `src/hooks/useAuth.tsx`
- **Trigger:** Evaluated during `initAuth()` when no cached or active session exists.
- **Environment Flags:**
  - `import.meta.env.DEV`: Must be `true`.
  - `VITE_DEV_AUTO_LOGIN`: Defaults to `true` in DEV; can be explicitly toggled.
  - `VITE_DEV_AUTH_EMAIL`: Controlled development account email (configured in `.env.local`).
  - `VITE_DEV_AUTH_PASSWORD`: Controlled development account password (configured in `.env.local`).
- **Code Reference:**
  ```ts
  const isDev = import.meta.env.DEV;
  const devAutoLogin = import.meta.env.VITE_DEV_AUTO_LOGIN === 'true' || (isDev && import.meta.env.VITE_DEV_AUTO_LOGIN !== 'false');
  const devEmail = import.meta.env.VITE_DEV_AUTH_EMAIL || '';
  const devPassword = import.meta.env.VITE_DEV_AUTH_PASSWORD || '';

  if (isDev && devAutoLogin && devEmail && devPassword) {
    console.log('[useAuth] JOY PeopleHR DEV AUTH MODE ACTIVE');
    try {
      const res = await authService.signInWithCredentials(devEmail, devPassword, cachedContext || 'tenant');
      if (res.success && res.user && isMounted) {
        bindSessionFingerprint(res.user.id);
        setUser(res.user);
        setMustChangePassword(Boolean(res.mustChangePassword));
        return;
      }
    } catch (devErr) {
      console.warn('[useAuth] Dev auto-login error:', devErr);
    }
  }
  ```

---

## 3. Flutter Application Implementation Details

- **Configuration:** `flutter_app/lib/core/config/env_config.dart`
- **Repository:** `flutter_app/lib/repositories/supabase/supabase_auth_repository.dart`
- **Environment Flags:**
  - `!kReleaseMode`: Hard guard ensuring auto-login is completely disabled in release builds.
  - `EnvConfig.devAutoLogin`: Injected via `--dart-define=DEV_AUTO_LOGIN=true` (defaults to `true`).
  - `EnvConfig.devAuthEmail`: Injected via `--dart-define=DEV_AUTH_EMAIL=...`.
  - `EnvConfig.devAuthPassword`: Injected via `--dart-define=DEV_AUTH_PASSWORD=...`.
- **Code Reference:**
  ```dart
  if (!kReleaseMode &&
      EnvConfig.devAutoLogin &&
      EnvConfig.devAuthEmail.isNotEmpty &&
      EnvConfig.devAuthPassword.isNotEmpty) {
    secureLog('JOY PeopleHR DEV AUTH MODE ACTIVE');
    try {
      final authRes = await authenticateUser(
        identifier: EnvConfig.devAuthEmail,
        password: EnvConfig.devAuthPassword,
      );
      if (authRes.success && authRes.user != null) {
        return authRes.user;
      }
    } catch (devErr) {
      secureLog('[Auth] Dev auto-login error: $devErr');
    }
  }
  ```

---

## 4. Operational Run Guide

### Web Run (Local Development)
1. In `.env.local`, set:
   ```env
   VITE_DEV_AUTO_LOGIN="true"
   VITE_DEV_AUTH_EMAIL="<your-confirmed-test-account>@joypeoplehr.com"
   VITE_DEV_AUTH_PASSWORD="<your-password>"
   ```
2. Run `npm run dev`. The browser automatically signs in with Supabase and opens the Dashboard.

### Flutter Run (Local Development / Emulator)
1. Run with `--dart-define`:
   ```bash
   flutter run -d chrome --dart-define=DEV_AUTH_EMAIL="<your-account>" --dart-define=DEV_AUTH_PASSWORD="<your-password>"
   # Or for Android device:
   flutter run -d <device_id> --dart-define=DEV_AUTH_EMAIL="<your-account>" --dart-define=DEV_AUTH_PASSWORD="<your-password>"
   ```
2. The Flutter application automatically signs in with Supabase, resolves identity, and presents the main employee tab shell.
