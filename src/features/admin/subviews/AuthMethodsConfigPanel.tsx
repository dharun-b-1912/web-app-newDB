import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  MessageSquareCode,
  Save,
  Shield,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../components/ui/Toast';
import { multiMethodAuthService } from '../../../services/auth/multiMethodAuthService';
import type {
  AuthMethodConfig,
  LoginMethod,
  PublicLoginConfigResponse,
} from '../../../types/multiMethodAuth';

const METHOD_ROWS: Array<{
  key: keyof Pick<
    AuthMethodConfig,
    | 'enableEmployeeIdPassword'
    | 'enableMobilePassword'
    | 'enableMobileOtp'
    | 'enableEmailPassword'
  >;
  id: LoginMethod;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    key: 'enableEmployeeIdPassword',
    id: 'employee_id_password',
    label: 'Employee ID + Password',
    desc: 'Allows employees and factory workers to sign in with their company code & password.',
    icon: <BadgeCheck className="w-4 h-4 text-[#07563D]" />,
  },
  {
    key: 'enableMobilePassword',
    id: 'mobile_password',
    label: 'Mobile Number + Password',
    desc: 'Allows staff to sign in using their E.164 registered mobile number & password.',
    icon: <Smartphone className="w-4 h-4 text-[#07563D]" />,
  },
  {
    key: 'enableMobileOtp',
    id: 'mobile_otp',
    label: 'Mobile Number + OTP',
    desc: 'Dispatches DLT-verified SMS verification codes via Airtel IQ Gateway.',
    icon: <MessageSquareCode className="w-4 h-4 text-[#07563D]" />,
  },
  {
    key: 'enableEmailPassword',
    id: 'email_password',
    label: 'Email Address + Password',
    desc: 'Standard corporate email authentication across web & mobile.',
    icon: <Mail className="w-4 h-4 text-[#07563D]" />,
  },
];

const EMPLOYEE_GROUPS = [
  { value: 'all', label: 'All Staff' },
  { value: 'FULL_TIME', label: 'Regular Staff' },
  { value: 'CONTRACT', label: 'Contract / Vendor' },
  { value: 'FACTORY', label: 'Factory / Site' },
];

export const AuthMethodsConfigPanel: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const organizationId = user?.organization_id || null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providerStatus, setProviderStatus] = useState<{
    airtel: boolean;
    resend: boolean;
  }>({ airtel: true, resend: true });

  const [config, setConfig] = useState<AuthMethodConfig>({
    organizationId,
    enableEmployeeIdPassword: true,
    enableMobilePassword: true,
    enableMobileOtp: true,
    enableEmailPassword: true,
    defaultLoginMethod: 'employee_id_password',
    factoryRecommendedMethod: 'employee_id_password',
    allowedEmployeeGroups: {
      employee_id_password: ['all'],
      mobile_password: ['all'],
      mobile_otp: ['all'],
      email_password: ['all'],
    },
    roleSpecificPolicies: {},
    otpProvider: 'airtel_iq',
    otpExpirySeconds: 300,
    otpResendCooldownSeconds: 30,
    otpMaxAttempts: 5,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecial: false,
    },
    lockoutPolicy: {
      maxFailedAttempts: 5,
      lockoutMinutes: 15,
      trackByIdentifier: true,
    },
    sessionPolicy: {
      webSessionHours: 24,
      mobileSessionDays: 30,
      requireReauthSensitiveActions: true,
    },
  });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    multiMethodAuthService
      .getPublicLoginConfig(organizationId)
      .then((res: PublicLoginConfigResponse) => {
        if (!mounted) return;
        setProviderStatus({
          airtel: res.otpProviderConfigured,
          resend: res.emailProviderConfigured,
        });
        setConfig({
          organizationId: res.organizationId ?? organizationId,
          enableEmployeeIdPassword: res.enabledMethods.includes('employee_id_password'),
          enableMobilePassword: res.enabledMethods.includes('mobile_password'),
          enableMobileOtp: res.enabledMethods.includes('mobile_otp'),
          enableEmailPassword: res.enabledMethods.includes('email_password'),
          defaultLoginMethod: res.defaultLoginMethod,
          factoryRecommendedMethod: res.factoryRecommendedMethod,
          allowedEmployeeGroups: res.allowedEmployeeGroups,
          roleSpecificPolicies: res.roleSpecificPolicies,
          otpProvider: res.otpProvider,
          otpExpirySeconds: res.otpExpirySeconds,
          otpResendCooldownSeconds: res.otpResendCooldownSeconds,
          otpMaxAttempts: res.otpMaxAttempts,
          passwordPolicy: res.passwordPolicy,
          lockoutPolicy: res.lockoutPolicy,
          sessionPolicy: res.sessionPolicy,
        });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [organizationId]);

  const enabledCount =
    Number(config.enableEmployeeIdPassword) +
    Number(config.enableMobilePassword) +
    Number(config.enableMobileOtp) +
    Number(config.enableEmailPassword);

  const toggleMethod = (
    key: keyof Pick<
      AuthMethodConfig,
      | 'enableEmployeeIdPassword'
      | 'enableMobilePassword'
      | 'enableMobileOtp'
      | 'enableEmailPassword'
    >,
    methodId: LoginMethod
  ) => {
    const currentlyEnabled = config[key];
    if (currentlyEnabled && enabledCount <= 1) {
      showToast(
        'At least one login method must stay active to prevent employee lockout.',
        'error'
      );
      return;
    }

    const updated = { ...config, [key]: !currentlyEnabled };
    // Auto-reconcile defaultLoginMethod if disabling current default
    if (currentlyEnabled && config.defaultLoginMethod === methodId) {
      const nextFallback = METHOD_ROWS.find(
        (m) => m.key !== key && updated[m.key]
      )?.id;
      if (nextFallback) updated.defaultLoginMethod = nextFallback;
    }
    setConfig(updated);
  };

  const toggleGroup = (methodId: LoginMethod, groupVal: string) => {
    const current = config.allowedEmployeeGroups[methodId] || ['all'];
    if (groupVal === 'all') {
      setConfig({
        ...config,
        allowedEmployeeGroups: {
          ...config.allowedEmployeeGroups,
          [methodId]: ['all'],
        },
      });
      return;
    }

    const withoutAll = current.filter((g) => g !== 'all');
    const next = withoutAll.includes(groupVal)
      ? withoutAll.filter((g) => g !== groupVal)
      : [...withoutAll, groupVal];

    setConfig({
      ...config,
      allowedEmployeeGroups: {
        ...config.allowedEmployeeGroups,
        [methodId]: next.length === 0 ? ['all'] : next,
      },
    });
  };

  const handleSave = async () => {
    if (enabledCount === 0) {
      showToast('At least one authentication method must remain enabled.', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await multiMethodAuthService.saveAuthMethodConfig(
        organizationId,
        config
      );
      if (!res.ok) {
        showToast(res.message || 'Failed to save authentication settings.', 'error');
        return;
      }
      if (res.config) setConfig(res.config);
      showToast(
        res.message || 'Employee authentication configuration saved and enforced.',
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Error saving authentication configuration.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-200/80 flex items-center justify-center gap-3 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin text-[#07563D]" />
        <span>Loading live authentication policy configuration...</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#07563D]" />
            <span>Employee Multi-Method Authentication Settings</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Changes apply immediately across Web Login, Flutter Mobile App, and Edge Auth Gateway.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
              providerStatus.airtel
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {providerStatus.airtel ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <AlertTriangle className="w-3 h-3" />
            )}
            Airtel IQ SMS {providerStatus.airtel ? 'Connected' : 'Missing Secrets'}
          </span>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-2 bg-[#07563D] hover:bg-[#05402D] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Authentication Policy</span>
          </button>
        </div>
      </div>

      {/* 4 Method Toggles + Group Scoping */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {METHOD_ROWS.map((row) => {
          const isOn = config[row.key];
          const isDefault = config.defaultLoginMethod === row.id;
          const isFactory = config.factoryRecommendedMethod === row.id;
          const selectedGroups = config.allowedEmployeeGroups[row.id] || ['all'];

          return (
            <div
              key={row.id}
              className={`p-4 rounded-xl border transition-all space-y-3 ${
                isOn
                  ? 'border-emerald-200/80 bg-emerald-50/20'
                  : 'border-gray-200 bg-gray-50/70 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                    {row.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-gray-900">{row.label}</span>
                      {isDefault && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-[#07563D]">
                          Default
                        </span>
                      )}
                      {isFactory && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
                          Factory Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{row.desc}</p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isOn}
                  aria-label={`Toggle ${row.label}`}
                  onClick={() => toggleMethod(row.key, row.id)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    isOn ? 'bg-[#07563D]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition ${
                      isOn ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {isOn && (
                <div className="pt-2 border-t border-gray-200/60 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-gray-600">Allowed Employee Groups:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({ ...config, defaultLoginMethod: row.id })
                        }
                        className={`font-bold ${
                          isDefault ? 'text-[#07563D]' : 'text-gray-400 hover:text-gray-700'
                        }`}
                      >
                        Set Default
                      </button>
                      <span className="text-gray-300">·</span>
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({ ...config, factoryRecommendedMethod: row.id })
                        }
                        className={`font-bold ${
                          isFactory ? 'text-blue-700' : 'text-gray-400 hover:text-gray-700'
                        }`}
                      >
                        Factory Badge
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {EMPLOYEE_GROUPS.map((g) => {
                      const active = selectedGroups.includes(g.value);
                      return (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => toggleGroup(row.id, g.value)}
                          className={`px-2 py-1 rounded-md text-[11px] font-semibold border ${
                            active
                              ? 'bg-[#07563D] text-white border-[#07563D]'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* OTP, Password Complexity & Lockout Policies */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
            OTP &amp; SMS Controls
          </h4>
          <div className="space-y-2 text-xs">
            <label className="block">
              <span className="text-gray-600 font-medium">OTP Expiry (seconds)</span>
              <input
                type="number"
                min={60}
                max={900}
                value={config.otpExpirySeconds}
                onChange={(e) =>
                  setConfig({ ...config, otpExpirySeconds: Number(e.target.value) || 300 })
                }
                className="mt-1 w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-semibold"
              />
            </label>
            <label className="block">
              <span className="text-gray-600 font-medium">Resend Cooldown (seconds)</span>
              <input
                type="number"
                min={15}
                max={300}
                value={config.otpResendCooldownSeconds}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    otpResendCooldownSeconds: Number(e.target.value) || 30,
                  })
                }
                className="mt-1 w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-semibold"
              />
            </label>
            <label className="block">
              <span className="text-gray-600 font-medium">Max OTP Attempts</span>
              <input
                type="number"
                min={3}
                max={10}
                value={config.otpMaxAttempts}
                onChange={(e) =>
                  setConfig({ ...config, otpMaxAttempts: Number(e.target.value) || 5 })
                }
                className="mt-1 w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-semibold"
              />
            </label>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#07563D]" />
            <span>Password Complexity</span>
          </h4>
          <div className="space-y-2 text-xs">
            <label className="block">
              <span className="text-gray-600 font-medium">Minimum Length</span>
              <input
                type="number"
                min={6}
                max={32}
                value={config.passwordPolicy.minLength}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    passwordPolicy: {
                      ...config.passwordPolicy,
                      minLength: Number(e.target.value) || 8,
                    },
                  })
                }
                className="mt-1 w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-semibold"
              />
            </label>
            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={config.passwordPolicy.requireUppercase}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    passwordPolicy: {
                      ...config.passwordPolicy,
                      requireUppercase: e.target.checked,
                    },
                  })
                }
                className="rounded text-[#07563D]"
              />
              <span className="text-gray-700 font-medium">Require Uppercase (A-Z)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.passwordPolicy.requireNumber}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    passwordPolicy: {
                      ...config.passwordPolicy,
                      requireNumber: e.target.checked,
                    },
                  })
                }
                className="rounded text-[#07563D]"
              />
              <span className="text-gray-700 font-medium">Require Digit (0-9)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.passwordPolicy.requireSpecial}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    passwordPolicy: {
                      ...config.passwordPolicy,
                      requireSpecial: e.target.checked,
                    },
                  })
                }
                className="rounded text-[#07563D]"
              />
              <span className="text-gray-700 font-medium">Require Special Symbol</span>
            </label>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
            Lockout &amp; Session Expiry
          </h4>
          <div className="space-y-2 text-xs">
            <label className="block">
              <span className="text-gray-600 font-medium">Max Failed Attempts</span>
              <input
                type="number"
                min={3}
                max={20}
                value={config.lockoutPolicy.maxFailedAttempts}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    lockoutPolicy: {
                      ...config.lockoutPolicy,
                      maxFailedAttempts: Number(e.target.value) || 5,
                    },
                  })
                }
                className="mt-1 w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-semibold"
              />
            </label>
            <label className="block">
              <span className="text-gray-600 font-medium">Lockout Duration (minutes)</span>
              <input
                type="number"
                min={1}
                max={1440}
                value={config.lockoutPolicy.lockoutMinutes}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    lockoutPolicy: {
                      ...config.lockoutPolicy,
                      lockoutMinutes: Number(e.target.value) || 15,
                    },
                  })
                }
                className="mt-1 w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-semibold"
              />
            </label>
            <label className="block">
              <span className="text-gray-600 font-medium">Mobile Session TTL (days)</span>
              <input
                type="number"
                min={1}
                max={90}
                value={config.sessionPolicy.mobileSessionDays}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    sessionPolicy: {
                      ...config.sessionPolicy,
                      mobileSessionDays: Number(e.target.value) || 30,
                    },
                  })
                }
                className="mt-1 w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-semibold"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
