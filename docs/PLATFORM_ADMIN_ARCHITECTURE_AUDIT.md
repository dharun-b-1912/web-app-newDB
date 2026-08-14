# WorkForceOS Enterprise HRMS — Platform Admin & SaaS Owner Control Plane Architecture Audit

**Target System:** WorkForceOS SaaS Platform Control Plane v5.0  
**Root Path:** `d:/Joy Corporate Solutions/workforceos-enterprise-hrms`  
**Date:** August 12, 2026  
**Auditor:** Chief Technology Officer & Principal SaaS Architect

---

## 1. System Scope & Core Distinction

The Platform Admin / SaaS Owner control plane governs the overarching multi-tenant SaaS application, tenant provisioning pipelines, subscription monetization, infrastructure telemetry, and platform-wide compliance.

```text
                        WORKFORCEOS SaaS
                             │
              ┌──────────────┴──────────────┐
              │                             │
       PLATFORM CONTROL                CUSTOMER HRMS
              │                             │
       SaaS Owner / Admin             Company Admin
              │                             │
    ┌─────────┼─────────┐          ┌────────┼─────────┐
    │         │         │          │        │         │
 Tenants   Billing   Security     HR Head  Manager   Employee
    │
    ├── Product & Feature Flags
    ├── Metered Usage Telemetry
    ├── Integrations & Marketplace
    ├── Support & Impersonation
    └── Operations & System Health
```

---

## 2. Platform Admin Directory & File Mapping

```text
src/
├── features/
│   └── platform/                        # Master Platform Admin domain module
│       ├── PlatformAdminMasterModule.tsx# Main tab container router
│       └── subviews/
│           ├── PlatformDashboardView.tsx# SaaS KPIs, Uptime & Alert Telemetry
│           ├── TenantsView.tsx          # Multi-tenant directory & Provisioning modal
│           ├── SubscriptionsView.tsx    # Subscriptions & Tier entitlements
│           ├── BillingView.tsx          # GST Invoices, Overdue payments & Tax breakdown
│           ├── UsageMeteringView.tsx    # Seat, Storage, API & WhatsApp quotas
│           ├── FeatureFlagsView.tsx     # Feature registry & Tenant overrides
│           ├── SecurityDashboardView.tsx# Active sessions & Force revoke
│           ├── SupportCenterView.tsx    # Audited time-limited support access banner
│           ├── SaasBusinessView.tsx     # MRR/ARR, NRR & Trial analytics
│           └── PlatformSettingsView.tsx # Global SaaS defaults & provider keys
├── services/
│   └── platformAdminApi.ts              # Data service layer backing SaaS control plane
└── types/
    └── platformAdmin.ts                 # Domain interfaces & tenant status types
```

---

## 3. Architecture Audit Sign-Off

The Platform Admin control plane operates as a native WorkForceOS module using the deep-green (`#07563D`) visual design language, enterprise data tables, and strict RLS tenant isolation.
