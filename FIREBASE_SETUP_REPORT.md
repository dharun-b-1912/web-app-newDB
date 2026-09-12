# JOY PeopleHR — Firebase Setup & Distribution Report

## 1. Firebase Project Association
- **Project ID:** `joy-peoplehr`
- **Android App ID:** `1:1047166003228:android:d0596687b790996338d7d9`
- **Package Name:** `com.joypeoplehr.app`
- **Firebase Configuration:** `flutter_app/android/app/google-services.json` and `lib/firebase_options.dart`

---

## 2. Configured Tester Groups
1. `joy-developers`: Internal developers & engineers.
2. `joy-qa`: Core QA automation & manual testing team.
3. `joy-product`: Product management & UX designers.
4. `joy-hr-uat`: Enterprise HR leaders & internal pilot users.
5. `joy-pilot`: External corporate customer pilots.
6. `joy-release-candidate`: Final release sign-off stakeholders.

---

## 3. Automated Changelog Attachment
Release notes are automatically generated from Git commit history and build parameters using `scripts/generate_release_notes.cjs` during CI execution.
