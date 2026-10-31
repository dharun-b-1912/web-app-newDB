# JOY PeopleHR — Flutter Local Storage & Caching Audit

**Target Application:** `workforce_os` (Flutter 3.47.1)  
**Storage Mechanism:** `shared_preferences: ^2.2.2`  
**Date:** 2026-09-04  

---

## 1. Local Storage Classification Matrix

| Key / Category | Dart Service / File | Purpose | Storage Classification | Authority Rule |
| :--- | :--- | :--- | :--- | :--- |
| `workforce_auth_token` | `SupabaseAuthRepository` | Session persistence | **AUTH TOKEN** | Controlled by Supabase GoTrue Auth |
| `cached_user_profile` | `UserService` | Offline profile display | **CACHE / OFFLINE DATA** | Invalidated on remote fetch |
| `cached_attendance_today` | `AttendanceService` | Today's punch quick state | **CACHE** | Overwritten by `attendance_punches` fetch |
| `cached_leave_balances` | `SupabaseLeaveRepository` | Leave balances | **CACHE** | Overwritten by `leave_balances` query |
| `cached_notifications` | `LocalNotificationStore` | In-app notification queue | **OFFLINE DATA** | Synchronized with `notification_events` |
| `theme_mode_preference` | `ThemeService` | Dark / Light theme | **UI PREFERENCE** | Authoritative local preference |
| `biometric_auth_enabled`| `SensitiveDataAuthService` | Local biometric toggle | **SECURITY PREFERENCE** | Local hardware binding |

---

## 2. Forensic Invariant Enforcement

> [!IMPORTANT]
> **No Local Authority Rule:**  
> SharedPreferences data is strictly treated as an ephemeral cache for offline instant-rendering. It is **NEVER** treated as authoritative business data. When the network connection is active, remote Supabase PostgREST queries against `ysiajemrqakfngasehhi` are the absolute source of truth.
