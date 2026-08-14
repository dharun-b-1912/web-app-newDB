import React, { useState } from 'react';
import {
  Settings,
  Globe,
  Mail,
  MessageSquare,
  CreditCard,
  Bell,
  Shield,
  Key,
  Database,
  Sliders,
  Save,
  RefreshCw,
  CheckCircle,
  Server,
  Palette,
  Lock,
} from 'lucide-react';

interface SettingRow {
  key: string;
  label: string;
  description: string;
  value: string;
  type: 'text' | 'toggle' | 'select';
  options?: string[];
}

const PLATFORM_SETTINGS: SettingRow[] = [
  { key: 'platform.name', label: 'Platform Product Name', description: 'Public-facing SaaS product name', value: 'WorkForceOS', type: 'text' },
  { key: 'platform.domain', label: 'SaaS Primary Domain', description: 'Root domain for tenant routing', value: 'workforceos.in', type: 'text' },
  { key: 'platform.support_email', label: 'Platform Support Email', description: 'Customer support address', value: 'support@workforceos.in', type: 'text' },
  { key: 'platform.timezone', label: 'Default Timezone', description: 'Used if tenant has not configured own timezone', value: 'Asia/Kolkata (IST)', type: 'select', options: ['Asia/Kolkata (IST)', 'UTC', 'US/Eastern', 'Europe/London'] },
  { key: 'platform.currency', label: 'Default Currency', description: 'Default billing currency', value: 'INR (₹)', type: 'select', options: ['INR (₹)', 'USD ($)', 'EUR (€)', 'GBP (£)'] },
  { key: 'platform.max_trial_days', label: 'Trial Period (Days)', description: 'Default trial length for new registrations', value: '14', type: 'text' },
];

const EMAIL_SETTINGS: SettingRow[] = [
  { key: 'email.provider', label: 'Email Provider', description: 'Transactional email service', value: 'AWS SES (Production)', type: 'select', options: ['AWS SES (Production)', 'SendGrid', 'Postmark', 'SMTP Custom'] },
  { key: 'email.from_name', label: 'From Display Name', description: 'Sender name for all platform emails', value: 'WorkForceOS Platform', type: 'text' },
  { key: 'email.from_address', label: 'From Email Address', description: 'DKIM-signed sender address', value: 'noreply@workforceos.in', type: 'text' },
  { key: 'email.dkim_enabled', label: 'DKIM Signing', description: 'Enable email authentication', value: 'Active', type: 'toggle' },
];

const SECURITY_SETTINGS: SettingRow[] = [
  { key: 'security.mfa_required', label: 'Force MFA for Admins', description: 'Require MFA for all admin-level platform users', value: 'Active', type: 'toggle' },
  { key: 'security.session_ttl', label: 'Session Timeout (Minutes)', description: 'Idle session expiry period', value: '480', type: 'text' },
  { key: 'security.password_min_length', label: 'Minimum Password Length', description: 'Applied across all tenants as minimum', value: '10', type: 'text' },
  { key: 'security.ip_allowlist', label: 'Global IP Allowlist', description: 'Restrict platform admin access to listed CIDRs', value: 'Disabled', type: 'toggle' },
  { key: 'security.audit_retention_years', label: 'Audit Log Retention (Years)', description: 'Duration before audit logs are archived', value: '7', type: 'select', options: ['3', '5', '7', '10', 'Indefinite'] },
];

const PAYMENT_SETTINGS: SettingRow[] = [
  { key: 'payment.gateway', label: 'Payment Gateway', description: 'Primary billing payment processor', value: 'Razorpay', type: 'select', options: ['Razorpay', 'Stripe', 'PayU', 'Cashfree'] },
  { key: 'payment.gst_percent', label: 'GST Rate (%)', description: 'Applied to all SaaS invoices', value: '18', type: 'text' },
  { key: 'payment.auto_dunning', label: 'Automated Dunning Engine', description: 'Auto-retry failed payments before suspending', value: 'Active', type: 'toggle' },
  { key: 'payment.dunning_retry_days', label: 'Dunning Retry Days', description: 'Days to retry before account suspension', value: '7', type: 'text' },
];

const SettingSection: React.FC<{ title: string; icon: React.ElementType; settings: SettingRow[] }> = ({
  title,
  icon: Icon,
  settings,
}) => {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(settings.map(s => [s.key, s.value]))
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 rounded-xl">
            <Icon className="w-4 h-4 text-[#07563D]" />
          </div>
          <h3 className="text-sm font-extrabold text-gray-900">{title}</h3>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            saved
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-[#07563D] hover:bg-[#064733] text-white shadow-sm'
          }`}
        >
          {saved ? <CheckCircle className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? 'Saved' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-4">
        {settings.map(s => (
          <div key={s.key} className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-gray-800">{s.label}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{s.description}</div>
            </div>
            <div className="shrink-0">
              {s.type === 'toggle' ? (
                <button
                  onClick={() =>
                    setValues(v => ({ ...v, [s.key]: v[s.key] === 'Active' ? 'Disabled' : 'Active' }))
                  }
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                    values[s.key] === 'Active'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}
                >
                  {values[s.key] === 'Active' ? '● Active' : '○ Disabled'}
                </button>
              ) : s.type === 'select' ? (
                <select
                  value={values[s.key]}
                  onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-emerald-500"
                >
                  {s.options?.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={values[s.key]}
                  onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-emerald-500 w-52 text-right"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PlatformSettingsView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Platform Global Settings</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure cross-tenant SaaS defaults: branding, email infrastructure, payment gateways, security policies, and operational parameters.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-1 bg-emerald-50 text-[#07563D] border border-emerald-200 rounded-full text-xs font-bold">
            SaaS Owner Only
          </span>
        </div>
      </div>

      <SettingSection title="Platform Identity & Branding" icon={Globe} settings={PLATFORM_SETTINGS} />
      <SettingSection title="Email Infrastructure" icon={Mail} settings={EMAIL_SETTINGS} />
      <SettingSection title="Security & Compliance Policies" icon={Shield} settings={SECURITY_SETTINGS} />
      <SettingSection title="Billing & Payment Gateway" icon={CreditCard} settings={PAYMENT_SETTINGS} />
    </div>
  );
};
