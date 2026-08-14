# WorkForceOS Enterprise HRMS — Implementation Plan

**Date:** August 12, 2026  
**Execution Strategy:** Phase-by-Phase Safe Refactoring & Verification

---

## 1. Sequence of Implementation

```text
Phase 1: Codebase & Architecture Audit ─────────────────────> COMPLETED
Phase 2: RBAC Separation (HR Head vs Super Admin) ─────────> COMPLETED
Phase 3: Sidebar Canonical Structure Refactoring ────────────> COMPLETED
Phase 4: Horizontal Tab Ribbon Removal across Modules ─────> COMPLETED
Phase 5: Single Source of Truth Route Integration ───────────> COMPLETED
Phase 6: Quality Assurance & Build Verification ────────────> COMPLETED
```

---

## 2. Dependency Rules

1. **Security First:** RLS database policies and backend scope checks (`auth.uid() -> employee_id`) enforced before UI conditional rendering.
2. **Canonical Services:** Modules consume domain services (`attendanceApi.ts`, `leaveApi.ts`, `payrollApi.ts`) instead of duplicating business logic inside React views.
3. **Backward Compatibility:** All existing URL bookmarks and legacy route aliases in `App.tsx` redirect to canonical module handlers.
