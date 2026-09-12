# JOY PeopleHR — Production Rollback & Hotfix Procedure

## 1. Rollback Triggers
Rollback is immediately triggered if:
1. Crash-free session rate drops below **99.5%** in Crashlytics.
2. Attendance duplication occurs in production.
3. RLS or multi-tenant leakage is detected.
4. Payroll calculations exhibit regressions.

---

## 2. Immediate Rollback Action Steps
1. **Pause Google Play Rollout:** Immediately halt staged rollout from Google Play Console.
2. **Revert Production Build in Hostinger / Vercel:** Promote previous stable production tag.
3. **Database Guard:** Supabase schema updates are designed to be backward compatible. If table rollback is necessary, apply migration down-scripts.
4. **Hotfix Flow:**
   ```
   production-incident
          ↓
   hotfix/v1.0.3-patch1 branch
          ↓
   Targeted test run & quality gate pass
          ↓
   Emergency QA build to joy-qa
          ↓
   Expedited Release Candidate
          ↓
   Production deployment
   ```
