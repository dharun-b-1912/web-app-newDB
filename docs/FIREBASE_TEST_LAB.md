# JOY PeopleHR — Firebase Test Lab Real Device Matrix

## 1. Purpose & Scope
Firebase Test Lab executes automated Flutter integration tests on physical Android devices in Google Cloud infrastructure. It verifies form factors, CPU architectures, and OS compatibility.

> [!NOTE]
> Physical biometric hardware (eSSL AI-FACE MAGNUM TCP/LAN) is tested in the Physical Device Lab. Test Lab verifies mobile app performance, UI rendering, geofence permissions, and background timer resilience across Android versions.

---

## 2. Real Android Device Test Matrix

| Manufacturer | Model | Android Version | Screen Size / Resolution | Tier |
| :--- | :--- | :--- | :--- | :--- |
| **Google** | Pixel 8 / 7 Pro | Android 14 / 15 | 6.7" / 1440 x 3120 | Flagship Reference |
| **Samsung** | Galaxy S23 / S24 | Android 14 / One UI 6 | 6.1" / 1080 x 2340 | High-End Market Leader |
| **OnePlus** | OnePlus 11 / 12 | Android 13 / 14 | 6.7" / 1440 x 3216 | High-Performance |
| **Xiaomi / Redmi** | Redmi Note 13 | Android 13 / MIUI 14 | 6.67" / 1080 x 2400 | Mid-Range Factory Standard |
| **Motorola** | Moto G Power | Android 12 / 13 | 6.5" / 720 x 1600 | Budget / Entry Tier |

---

## 3. Test Lab Execution Command
```bash
gcloud firebase test android run \
  --type instrumentation \
  --app build/app/outputs/apk/release/app-release.apk \
  --test build/app/outputs/apk/androidTest/release/app-release-androidTest.apk \
  --device model=oriole,version=33,locale=en,orientation=portrait \
  --device model=dm3q,version=34,locale=en,orientation=portrait \
  --timeout 10m
```
