// src/services/platform/platformSecurityService.ts
// ============================================================
// WorkForceOS — Platform Security & Session Management Service
// ============================================================

import { SecuritySessionItem } from '../../types/platformAdmin';
import { platformAuditService } from './platformAuditService';

const initialSessions: SecuritySessionItem[] = [
  { id: 'sess-01', user_name: 'WorkForce Super Admin', user_email: 'superadmin@workforceos.com', role_name: 'Super Admin', tenant_name: 'Platform Control Plane', tenant_id: 'platform-root', ip_address: '106.51.72.18', location: 'Coimbatore, India', device: 'Chrome 127 on macOS Sequoia', login_time: '2026-08-14 10:15 AM', last_activity: 'Just now', risk_level: 'Low', status: 'Active' },
  { id: 'sess-02', user_name: 'Dharun Joy', user_email: 'admin@acme.com', role_name: 'Company Admin', tenant_name: 'Acme Technologies', tenant_id: 'org-acme-01', ip_address: '182.74.88.12', location: 'Bengaluru, India', device: 'Firefox 128 on Windows 11', login_time: '2026-08-14 09:40 AM', last_activity: '12 mins ago', risk_level: 'Low', status: 'Active' },
  { id: 'sess-03', user_name: 'Suresh Raina', user_email: 'suresh@techcorp.in', role_name: 'Company Admin', tenant_name: 'TechCorp Solutions', tenant_id: 'org-tech-02', ip_address: '49.207.195.44', location: 'Chennai, India', device: 'Safari 17.5 on iOS 17', login_time: '2026-08-14 08:20 AM', last_activity: '1 hr ago', risk_level: 'Low', status: 'Active' },
  { id: 'sess-04', user_name: 'Meera Nair', user_email: 'meera@zenithlog.com', role_name: 'Company Admin', tenant_name: 'Zenith Logistics', tenant_id: 'org-zenith-04', ip_address: '103.211.54.90', location: 'Hyderabad, India', device: 'Chrome 126 on Windows 10', login_time: '2026-08-10 03:20 PM', last_activity: '4 days ago', risk_level: 'Medium', status: 'Idle' },
  { id: 'sess-05', user_name: 'Anish Kapadia', user_email: 'anish@cybersoft.com', role_name: 'Company Admin', tenant_name: 'CyberSoft Global', tenant_id: 'org-cyber-03', ip_address: '115.112.89.20', location: 'Singapore (VPN)', device: 'Brave 1.68 on Linux', login_time: '2026-08-14 07:10 AM', last_activity: '2 hrs ago', risk_level: 'High', status: 'Active' },
];

export const platformSecurityService = {
  getSessions(): SecuritySessionItem[] {
    return initialSessions;
  },

  async revokeSession(id: string, reason?: string): Promise<SecuritySessionItem> {
    const session = initialSessions.find(s => s.id === id);
    if (!session) throw new Error('Session not found');

    session.status = 'Revoked';

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      organization_id: session.tenant_id,
      organization_name: session.tenant_name,
      action: 'ADMIN_SESSION_REVOKED',
      resource_type: 'Session',
      resource_id: id,
      severity: 'High',
      reason: reason || `Revoked session for ${session.user_email} on ${session.device}`,
    });

    return session;
  },

  async revokeAllTenantSessions(tenantId: string, reason: string): Promise<number> {
    let count = 0;
    initialSessions.forEach(s => {
      if (s.tenant_id === tenantId && s.status !== 'Revoked') {
        s.status = 'Revoked';
        count++;
      }
    });

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      organization_id: tenantId,
      action: 'ALL_TENANT_SESSIONS_REVOKED',
      resource_type: 'SessionGroup',
      resource_id: tenantId,
      severity: 'Critical',
      reason: reason || `Force logged out ${count} active sessions`,
    });

    return count;
  },
};
