# JOY PeopleHR — Release Notes v1.1.6 (Build 23)

## Google Play Console Release Notes (Ready to Copy-Paste)

### English (United States) - en-US / English (India) - en-IN
```text
• Advanced Real-Time Shift Tracking: Continuous live GPS telemetry during active shift hours with intelligent stationary drift filtering.
• Live Route Radar Integration: Real-time route trail logging (>20m displacement) and fleet visibility directly synced with Joy PeopleHR Live Radar.
• Instant Geofence Sync: Automatic over-the-air updates for office perimeters and multi-branch work locations via Supabase Realtime.
• Battery-Optimized Location Engine: Android 15/16 Foreground Service compliance with smart power conservation while stationary.
• Performance & Stability: Enhanced attendance verification, high-accuracy satellite acquisition, and startup stability.
```

---

## Detailed Technical Release Notes (v1.1.6+23)

### 1. High-Precision Shift Route & Live Fleet Radar Telemetry
- **Continuous Shift-Hour Tracking:** Activated automatically when an employee checks in or enters their assigned shift window. Automatically stops when clocked out or off-duty to preserve privacy.
- **Smart Stationary Anchor (Anti-Drift):** Integrated intelligent filtering to suppress indoor GPS jitter. When the device is stationary within 20 meters, telemetry updates without generating redundant breadcrumbs or draining the battery.
- **Displacement Breadcrumb Trail:** Records high-resolution route waypoints whenever displacement exceeds 20 meters with acceptable accuracy (≤65m), populating `employee_location_trails` for playback on the web dashboard.
- **Hardware Telemetry Transmission:** Pushes live satellite telemetry (`latitude`, `longitude`, `accuracy`, `speed`, `battery_level`, `is_charging`, `is_moving`) directly into Supabase `employee_live_locations` table.

### 2. Multi-Branch Geofencing & Real-Time Synchronization
- **Zero-Restart Geofence Updates:** Subscribes to Supabase Realtime channels for `work_locations` and `employee_work_location_assignments`. Any boundary or coordinate updates made by HR take effect immediately on active mobile clients.
- **Live Attendance State Synchronization:** Realtime listeners on `attendance_daily` and `attendance_punches` ensure mobile check-in/out timers and statuses sync instantly across mobile, web, and biometric devices.
- **Multi-Tier Location Verification:** Enforces strict geofencing with tolerance calculation based on device GPS accuracy, prompting for location regularization reasons when authorized exceptions occur.

### 3. Android 15 / 16 & Google Play Compliance
- **Foreground Service Location Compliance:** Configured `FOREGROUND_SERVICE_LOCATION` with active persistent notification during on-duty tracking in compliance with Google Play Store Background Location guidelines.
- **Photo & Video Permission Safeguards:** Explicitly stripped broad media access (`READ_MEDIA_IMAGES`, `READ_EXTERNAL_STORAGE`) to ensure 100% compliance with Google Play Data Safety policies.
- **R8 / ProGuard Hardening:** Maintained protected Flutter engine bridge, native JNI bindings, and Firebase services for seamless runtime performance without obfuscation errors.

### 4. Build & Distribution Details
- **App Version:** `1.1.6`
- **Version Code:** `23`
- **Target SDK:** `36` (Android 15 / 16 Ready)
- **Min SDK:** `24` (Android 7.0 Nougat+)
- **Output Artifact:** `JOY_PeopleHR_v1.1.6_build23.aab`
- **Signing Keystore:** `joy_people_hr_release.jks` (Release signed)
