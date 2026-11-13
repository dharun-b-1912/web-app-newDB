# JOY PeopleHR — Release Notes v1.1.12 (Build 33)

**Release Date:** 2026-11-12  
**Version:** `1.1.12+33`  
**Build Type:** Optimized Release Android App Bundle (`.aab`) with Dart obfuscation & split debug symbols (`--obfuscate --split-debug-info=build/debug-info`)

---

## What's New & Fixed

### 1. Live Break Management & Animated Confirmation
- **Compact Home Attendance Card**: Fixed horizontal overflow (`8.0px`) on the summary footer (`Today's attendance summary` + `View full timeline →`).
- **Animated Break Confirmation Dialog**: Tapping **Start Tea / Lunch / Coffee / Personal / Other Break** or **End Break** now displays a confirmation modal featuring an animated icon for the selected break category, Paid/Unpaid badge, and max break duration before starting or ending the break.

### 2. Policy-Driven Break Alerts & Cross-Platform Vibration
- **Break Ending & Limit-Reached Alerts**: Automatically monitors active breaks against the active Break Policy's `maxMinutesPerBreak` and notifies the employee **1 minute before** the limit and **when the limit is reached**.
- **Vibration Fix (Android & Mobile Web)**:
  - Added explicit `vibrationPattern` to `AndroidNotificationDetails` and `HapticFeedback.vibrate()` / `heavyImpact()` bursts on mobile.
  - Added `navigator.vibrate(...)` support via `dart:js_interop` for mobile web browsers.

### 3. Notifications & Privacy Hardening
- Removed the **Test Push Notifications** (`⚡`) button and test modal from the Notifications screen.
- Cleaned legacy/test broadcast notifications from `notification_events`.
- Hardened the notification repository so personal/scoped alerts (leave approvals, regularizations, payslips, break alerts, individual training reminders) never appear as global broadcasts if `recipient_user_id` is null.

### 4. Shift & Work Hours Accuracy (Web + Backend Sync)
- **No False Mid-Shift Deficit**: Ongoing checked-in sessions now show `Shift in progress` instead of premature deficit minutes before check-out.
- **8h / 9h / 12h Shift Customization**: Added `0.5h` step support for Net Working Hours in Shift Master and Shift-scoped Break Policy overrides in Breaks & Work Hours.
- **Biometric Check-Out Net Payable Sync**: `biometric-punch-ingestion` now invokes `fn_recalculate_daily_attendance` immediately upon biometric check-out.

### 5. Organization Module Gating
- Verified Super Admin add-on entitlements (`organization_addon_entitlements.is_enabled`) automatically hide disabled modules (such as **Garment & Piece-Rate** and **Face Attend**) in the employee mobile app.

### 6. Play Console Edge-to-Edge & R8 Optimization
- **Edge-to-Edge (Android 15+ / Backward Compatible)**: Added `WindowCompat.enableEdgeToEdge(window)` alongside `WindowCompat.setDecorFitsSystemWindows(window, false)` in `MainActivity.kt`.
- **R8 Code Shrinking, Resource Shrinking & Obfuscation**:
  - Enabled `isMinifyEnabled = true`, `isShrinkResources = true`, and `proguard-android-optimize.txt` in `android/app/build.gradle.kts`.
  - Tightened `proguard-rules.pro` to keep only required Flutter/Firebase entrypoints instead of broad package wildcards, improving DEX obfuscation rate and reducing bundle size.
- **Gradle Dependency Fix**: Scoped the `androidx.core` version pin in `android/build.gradle.kts` to `core` / `core-ktx` so `androidx.core:core-backported-fixes` resolves cleanly.

