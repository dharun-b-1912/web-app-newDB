# JOY PeopleHR — Release Notes v1.1.8 (Build 26)

## Google Play Console Release Notes (Ready to Copy-Paste)

### English (United States) - en-US / English (India) - en-IN
```text
• Improved night shift attendance for seamless check-ins and check-outs across midnight.
• View your assigned shift schedule and timings directly on the home screen.
• Faster and more accurate attendance sync across mobile and biometric devices.
• Overall performance improvements and bug fixes for a smoother experience.
```

---

## Detailed Technical Release Notes (v1.1.8+26)

### 1. Cross-Midnight Night Shift & Cutoff Engine
- **Active Session Continuity:** When night shift employees check in at night and punch out the following morning, the check-out punch correctly binds to the open session (yesterday's shift date) and computes accurate total duration across midnight.
- **Automated 12:00 PM Cutoff Reset:** If an employee misses their check-out, the session locks as Missed Out after the 12:00 PM cutoff, and the mobile dashboard immediately resets to today's date for upcoming shift check-ins.
- **Dynamic Shift Timers:** Displays exact assigned shift hours (e.g. `10:00 PM - 07:00 AM`) dynamically fetched from the organization roster below the live working timer.

### 2. Check-In / Check-Out Isolation & Punch Guard
- **State De-duplication:** Strict mutual exclusion locks between check-in and check-out buttons to prevent rapid double-taps from producing duplicate attendance punches.
- **Live Device Sync:** Attendance punches instantly synchronize state with the Supabase `attendance_daily` record, reflecting the same hours on both web HR desks and mobile ESS.

### 3. Google Play Console Compliance & Location Transparency
- **Prominent Background Location Disclosure:** Direct access to the transparent background location disclosure modal explaining why location is required during shift tracking.
- **Strict Data Safety Standard:** Stripped broad storage permissions (`READ_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES`), keeping only essential location and notification channels.
- **Foreground Service Compliance:** Adheres to Android 15 & 16 (`compileSdk 36`, `targetSdk 36`) background foreground service requirements with persistent status bar notification while on duty.

### 4. Build & Distribution Metadata
- **App Version:** `1.1.8`
- **Version Code:** `26` (Resolves Google Play Console `Version code 25 has already been used` error)
- **Target SDK:** `36` (Android 15 / 16)
- **Min SDK:** `24` (Android 7.0 Nougat+)
- **Output Artifact:** `JOY_PeopleHR_v1.1.8_build26.aab` *(66.9 MB)*
- **Primary Package:** `flutter_app/build/app/outputs/bundle/release/app-release.aab`
- **Archive Copy:** `artifacts/android-bundles/JOY_PeopleHR_v1.1.8_build26.aab`
- **Signing Keystore:** `joy_people_hr_release.jks` (Release Signed)
