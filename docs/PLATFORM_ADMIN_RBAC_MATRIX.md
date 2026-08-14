# WorkForceOS Enterprise HRMS — Platform Admin RBAC & Scope Matrix

**Date:** August 12, 2026

---

## Authorization Boundaries: Platform Admin vs Tenant Roles

| Resource / Capability | Super Admin / SaaS Owner | Company Admin | HR Head | Manager | Team Lead | Employee |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **SaaS Platform Dashboard** | ✅ Full | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Provision Tenants** | ✅ Full | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Suspend / Archive Tenants** | ✅ Full | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Global Feature Flags** | ✅ Full | ❌ | ❌ | ❌ | ❌ | ❌ |
| **SaaS Billing & Invoices** | ✅ Full | View Own | ❌ | ❌ | ❌ | ❌ |
| **Revoke Active Sessions** | ✅ Full | Company | ❌ | ❌ | ❌ | ❌ |
| **Time-Limited Support Access** | ✅ Audited | Request | ❌ | ❌ | ❌ | ❌ |
| **Company HR Operations** | Audited Support | ✅ Full | ✅ Full | Dept | Team | Self |
