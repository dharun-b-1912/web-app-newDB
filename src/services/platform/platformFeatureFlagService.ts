// src/services/platform/platformFeatureFlagService.ts
// ============================================================
// WorkForceOS — Enterprise Feature Flag & Rollout Service
// ============================================================

import { FeatureFlagItem } from '../../types/platformAdmin';
import { platformAuditService } from './platformAuditService';

const initialFlags: FeatureFlagItem[] = [
  {
    key: 'feature.ai.hr_assistant',
    name: 'AI Copilot Policy Assistant',
    description: 'Enable conversational HR policy search, legal summaries, and draft generations powered by Google Gemini',
    category: 'AI',
    status: 'Active',
    environment: 'Production',
    default_enabled: true,
    allowed_plans: ['Business', 'Enterprise'],
    rollout_percentage: 100,
    tenant_overrides_count: 3,
    tenant_overrides: [
      { tenant_id: 'org-innovate-05', tenant_name: 'Innovate Labs', is_enabled: true },
      { tenant_id: 'org-cyber-03', tenant_name: 'CyberSoft Global', is_enabled: true },
    ],
    updated_at: '2026-08-10',
    updated_by: 'Super Admin',
  },
  {
    key: 'feature.whatsapp.notifications',
    name: 'WhatsApp Business API Alerts',
    description: 'Send instant WhatsApp alerts for payslips, shift schedules, and manager leave approvals',
    category: 'Integrations',
    status: 'Active',
    environment: 'Production',
    default_enabled: true,
    allowed_plans: ['Professional', 'Business', 'Enterprise'],
    rollout_percentage: 100,
    tenant_overrides_count: 2,
    updated_at: '2026-08-08',
    updated_by: 'Super Admin',
  },
  {
    key: 'feature.biometric.adapter',
    name: 'ZK Teco Biometric Push Adapter',
    description: 'Direct IP hardware biometric machine push listener for real-time punch synchronization',
    category: 'Integrations',
    status: 'Active',
    environment: 'Production',
    default_enabled: true,
    allowed_plans: ['Business', 'Enterprise'],
    rollout_percentage: 100,
    tenant_overrides_count: 6,
    updated_at: '2026-08-05',
    updated_by: 'Super Admin',
  },
  {
    key: 'feature.advanced.analytics',
    name: 'Custom Pivot Report Builder',
    description: 'Drag-and-drop workforce BI report generator with scheduled CSV/PDF exports',
    category: 'Core',
    status: 'Beta',
    environment: 'All',
    default_enabled: false,
    allowed_plans: ['Enterprise'],
    rollout_percentage: 25,
    tenant_overrides_count: 14,
    updated_at: '2026-08-11',
    updated_by: 'Super Admin',
  },
  {
    key: 'feature.security.mandatory_mfa',
    name: 'Mandatory TOTP MFA Enforcement',
    description: 'Enforce Google Authenticator / Authy TOTP verification on all admin logins',
    category: 'Security',
    status: 'Active',
    environment: 'Production',
    default_enabled: true,
    allowed_plans: ['Starter', 'Professional', 'Business', 'Enterprise'],
    rollout_percentage: 100,
    tenant_overrides_count: 0,
    updated_at: '2026-08-01',
    updated_by: 'Security Officer',
  },
];

export const platformFeatureFlagService = {
  getFeatureFlags(): FeatureFlagItem[] {
    return initialFlags;
  },

  async toggleFeatureFlag(key: string, reason?: string): Promise<FeatureFlagItem> {
    const flag = initialFlags.find(f => f.key === key);
    if (!flag) throw new Error('Feature flag not found');

    const previous = flag.status;
    flag.status = flag.status === 'Active' ? 'Disabled' : 'Active';
    flag.updated_at = new Date().toISOString().split('T')[0];

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'FEATURE_FLAG_TOGGLED',
      resource_type: 'FeatureFlag',
      resource_id: key,
      severity: 'Normal',
      reason: reason || `Flag ${key} changed from ${previous} to ${flag.status}`,
    });

    return flag;
  },

  async updateRolloutPercentage(key: string, pct: number): Promise<FeatureFlagItem> {
    const flag = initialFlags.find(f => f.key === key);
    if (!flag) throw new Error('Feature flag not found');

    flag.rollout_percentage = pct;
    flag.updated_at = new Date().toISOString().split('T')[0];

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'FEATURE_ROLLOUT_UPDATED',
      resource_type: 'FeatureFlag',
      resource_id: key,
      severity: 'Normal',
      reason: `Rollout percentage updated to ${pct}%`,
    });

    return flag;
  },
};
