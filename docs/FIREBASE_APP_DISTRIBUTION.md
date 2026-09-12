# JOY PeopleHR — Firebase App Distribution Architecture

## 1. Overview
Firebase App Distribution is the delivery mechanism for trusted pre-release testers. It connects CI/CD builds to designated tester groups with automatically generated release notes and expiration management.

---

## 2. Tester Groups Matrix

| Group Name | Alias | Audience | Distribution Criteria |
| :--- | :--- | :--- | :--- |
| `joy-developers` | DEV | Mobile & Full-stack engineers | Automated on QA builds |
| `joy-qa` | QA | QA Engineers & Test Automation | Automated on QA branch merge |
| `joy-product` | Product | Product Managers & Designers | Automated on Staging build |
| `joy-hr-uat` | UAT | Enterprise HR Leaders | Automated on Staging RC |
| `joy-pilot` | Pilot | External Pilot Customer Cohort | Manual approval on RC |
| `joy-release-candidate` | RC | Release Board & Executive sign-off | Tagged Release Candidate |

---

## 3. Distribution Expiry & Long-term Artifact Retention
- **Notice:** Firebase App Distribution releases have a **150-day availability period**.
- **Archive Strategy:** All approved release candidate APKs and AppBundles are permanently mirrored to GitHub Release Artifacts and Supabase Storage with cryptographic SHA-256 hashes.
