// src/services/vendor/vendorStoragePurge.ts
// ============================================================================
// JOY PeopleHR — Purge Vendor LocalStorage & Mock Fallback Registry
// Completely flushes any legacy mock/test vendor records from browser storage
// ensuring clean, authentic database testing with zero mock artifacts.
// ============================================================================

export function purgeVendorLocalStorage(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }

  const VENDOR_STORAGE_KEYS = [
    'wf_vendor_portal_orgs',
    'wf_vendor_portal_active_id',
    'wf_vendor_portal_relationships',
    'wf_vendor_portal_active_rel_id',
    'wf_vendor_portal_employees',
    'wf_vendor_portal_assignments',
    'wf_vendor_portal_attendance',
    'wf_vendor_portal_corrections',
    'wf_vendor_portal_pos',
    'wf_vendor_portal_invoices',
    'wf_vendor_portal_payments',
    'wf_vendor_portal_challans',
    'wf_vendor_portal_audit',
    'wf_vendor_portal_payroll_status',
    'wf_vendor_portal_selected_worker_id',
    'wf_vendor_portal_selected_invoice_id',
    'wf_vendor_portal_selected_site_id',
    'wf_vendor_portal_cached_summary',
    'workforce_vendors_master',
    'workforce_vendor_contracts',
    'workforce_vendor_docs',
    'workforce_vendor_payments',
    'workforce_vendor_assignments',
    'workforce_vendor_saved_views',
    'workforce_vendor_audit',
    'workforce_vendor_credentials_registry',
    'workforce_vendor_users_registry',
    'workforce_vendor_user_relationships_registry',
    'workforce_vendor_password_resets',
    'workforce_vendor_invitations_store',
    'wf_vendor_portal_licenses',
    'wf_vendor_portal_returns',
    'wf_vendor_portal_cal_tasks',
    'wf_vendor_portal_doc_requests',
    'wf_vendor_portal_form_v',
    'wf_vendor_portal_deployments',
    'workforce_vendor_attendance_locks',
    'workforce_vendor_attendance_disputes',
  ];

  try {
    for (const key of VENDOR_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn('[VendorStoragePurge] Could not purge vendor localStorage keys:', err);
  }
}
