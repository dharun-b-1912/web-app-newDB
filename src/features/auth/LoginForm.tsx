// src/features/auth/LoginForm.tsx
// ============================================================
// Joy PeopleHR / WorkForceOS — Multi-Method Enterprise Login Form
// Supports Employee ID + Password, Mobile + Password, Mobile + OTP,
// Email + Password, HR policy filtering, and Multi-Company Selection.
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MessageSquareCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import type { AuthContextMode } from '../../services/auth/authService';
import { useToast } from '../../components/ui/Toast';
import { multiMethodAuthService } from '../../services/auth/multiMethodAuthService';
import type {
  CompanyMembershipOption,
  LoginMethod,
  PublicLoginConfigResponse,
} from '../../types/multiMethodAuth';

export interface LoginFormProps {
  authContext?: AuthContextMode;
  onForgotPassword: () => void;
  onSuccessRoute?: (route: string) => void;
}

interface MethodMeta {
  id: LoginMethod;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const METHOD_META: MethodMeta[] = [
  {
    id: 'employee_id_password',
    title: 'Employee ID + Password',
    subtitle: 'Sign in with your assigned company Employee ID',
    icon: <BadgeCheck className="w-5 h-5" />,
  },
  {
    id: 'mobile_password',
    title: 'Mobile Number + Password',
    subtitle: 'Login using your registered mobile number',
    icon: <Smartphone className="w-5 h-5" />,
  },
  {
    id: 'mobile_otp',
    title: 'Mobile Number + OTP',
    subtitle: 'Receive a one-time SMS verification code',
    icon: <MessageSquareCode className="w-5 h-5" />,
  },
  {
    id: 'email_password',
    title: 'Email Address + Password',
    subtitle: 'Login using your registered work email',
    icon: <Mail className="w-5 h-5" />,
  },
];

const COUNTRY_CODES = [
  { code: '+91', label: '+91 (IN)' },
  { code: '+971', label: '+971 (UAE)' },
  { code: '+65', label: '+65 (SG)' },
  { code: '+44', label: '+44 (UK)' },
  { code: '+1', label: '+1 (US)' },
];

export const LoginForm: React.FC<LoginFormProps> = ({
  authContext = 'tenant',
  onForgotPassword,
  onSuccessRoute,
}) => {
  const { signIn } = useAuth();
  const { showToast } = useToast();

  const isEmployeePortal = authContext === 'tenant';

  const [config, setConfig] = useState<PublicLoginConfigResponse | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(isEmployeePortal);
  const [step, setStep] = useState<'select_method' | 'credentials' | 'company_select'>(
    isEmployeePortal ? 'select_method' : 'credentials'
  );
  const [selectedMethod, setSelectedMethod] = useState<LoginMethod>('employee_id_password');

  // Form inputs
  const [identifier, setIdentifier] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP state
  const [otpChallengeId, setOtpChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [maskedDest, setMaskedDest] = useState<string | null>(null);
  const [otpCompanyName, setOtpCompanyName] = useState<string | null>(null);
  const [otpOrgName, setOtpOrgName] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // Multi-company selection state
  const [pendingSession, setPendingSession] = useState<{
    access_token: string;
    refresh_token: string;
  } | null>(null);
  const [companies, setCompanies] = useState<CompanyMembershipOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Load live HR-configured login methods
  useEffect(() => {
    if (!isEmployeePortal) {
      setSelectedMethod('email_password');
      setStep('credentials');
      setIsLoadingConfig(false);
      return;
    }

    let cancelled = false;
    setIsLoadingConfig(true);
    multiMethodAuthService.warmUp();
    multiMethodAuthService
      .getPublicLoginConfig()
      .then((cfg) => {
        if (cancelled) return;
        setConfig(cfg);
        if (cfg.defaultLoginMethod && cfg.enabledMethods.includes(cfg.defaultLoginMethod)) {
          setSelectedMethod(cfg.defaultLoginMethod);
        } else if (cfg.enabledMethods.length > 0) {
          setSelectedMethod(cfg.enabledMethods[0]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingConfig(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isEmployeePortal]);

  // Cooldown countdown timer for OTP resend
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  const resetCredentialInputs = () => {
    setPassword('');
    setOtpCode('');
    setOtpChallengeId(null);
    setMaskedDest(null);
    setOtpCompanyName(null);
    setOtpOrgName(null);
    setAuthError(null);
    setErrorCode(null);
  };

  const handleSelectMethod = (method: LoginMethod) => {
    setSelectedMethod(method);
    setIdentifier('');
    resetCredentialInputs();
    multiMethodAuthService.warmUp();
    setStep('credentials');
  };

  const handleChangeMethod = () => {
    resetCredentialInputs();
    setStep('select_method');
  };

  const handleSendOtp = async () => {
    setAuthError(null);
    setErrorCode(null);

    const digits = identifier.replace(/\D/g, '');
    if (digits.length < 10) {
      setAuthError('Please enter a valid 10-digit registered mobile number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await multiMethodAuthService.requestMobileLoginOtp({
        mobile: identifier,
        countryCode,
      });

      if (!res.ok || !res.challengeId) {
        if (res.cooldownSeconds) {
          setCooldownSeconds(res.cooldownSeconds);
        }
        setAuthError(res.message || 'Unable to dispatch login OTP.');
        setErrorCode(res.code || null);
        return;
      }

      setOtpChallengeId(res.challengeId);
      setMaskedDest(res.maskedDestination || null);
      setOtpCompanyName(res.companyName || null);
      setOtpOrgName(res.organizationName || null);
      setCooldownSeconds(res.cooldownSeconds || config?.otpResendCooldownSeconds || 30);
      setOtpCode('');
      showToast(`OTP sent to ${res.maskedDestination || 'your mobile number'}`, 'success');
    } catch (err: any) {
      setAuthError(err?.message || 'Unable to send OTP. Check your network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordOrOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setErrorCode(null);

    // Platform Admin / Vendor portals preserve standard AuthPage signIn handler
    if (!isEmployeePortal) {
      if (!identifier.trim() || !password) {
        setAuthError('Please enter both your email address and password.');
        return;
      }
      setIsSubmitting(true);
      try {
        const res = await signIn(identifier.trim(), password, authContext);
        if (res.success && res.user) {
          showToast(`Welcome back, ${res.user.name}`, 'success');
          if (onSuccessRoute) {
            onSuccessRoute(authContext === 'platform' ? '/platform-admin' : '/vendor-portal');
          }
        } else {
          setAuthError(res.errorMessage || 'Authentication failed.');
        }
      } catch (err: any) {
        setAuthError(err?.message || 'Authentication error occurred.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Mobile OTP Flow
    if (selectedMethod === 'mobile_otp') {
      if (!otpChallengeId) {
        await handleSendOtp();
        return;
      }
      if (!/^\d{6}$/.test(otpCode.trim())) {
        setAuthError('Please enter the 6-digit verification code sent via SMS.');
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await multiMethodAuthService.verifyMobileLoginOtp({
          challengeId: otpChallengeId,
          otp: otpCode.trim(),
          skipSessionHydration: true,
        });

        if (!res.ok || !res.session) {
          setAuthError(res.message || 'Invalid OTP code.');
          setErrorCode(res.code || null);
          return;
        }

        if (res.requiresCompanySelection && res.companies && res.companies.length > 1) {
          setPendingSession({
            access_token: res.session.access_token,
            refresh_token: res.session.refresh_token,
          });
          setCompanies(res.companies);
          const def = res.companies.find((c) => c.isDefault) || res.companies[0];
          setSelectedCompanyId(def.organizationId);
          setStep('company_select');
          return;
        }

        await multiMethodAuthService.hydrateSession(
          res.session.access_token,
          res.session.refresh_token
        );
        const signedWorkspace =
          res.companies?.[0]?.companyName ||
          res.activeContext?.organizationName ||
          otpCompanyName ||
          otpOrgName;
        showToast(
          signedWorkspace
            ? `Signed in to ${signedWorkspace}`
            : 'Signed in successfully via Mobile OTP',
          'success'
        );
        onSuccessRoute?.(res.activeContext?.destinationRoute || '/ess/dashboard');
      } catch (err: any) {
        setAuthError(err?.message || 'OTP verification failed.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Employee ID + Password, Mobile + Password, Email + Password
    if (!identifier.trim()) {
      setAuthError('Please enter your login credential.');
      return;
    }
    if (!password) {
      setAuthError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await multiMethodAuthService.loginWithMethodPassword({
        method: selectedMethod,
        identifier: identifier.trim(),
        password,
        countryCode,
        skipSessionHydration: true,
      });

      if (!res.ok || !res.session) {
        setAuthError(res.message || 'Invalid login credentials.');
        setErrorCode(res.code || null);
        return;
      }

      if (res.requiresCompanySelection && res.companies && res.companies.length > 1) {
        setPendingSession({
          access_token: res.session.access_token,
          refresh_token: res.session.refresh_token,
        });
        setCompanies(res.companies);
        const def = res.companies.find((c) => c.isDefault) || res.companies[0];
        setSelectedCompanyId(def.organizationId);
        setStep('company_select');
        return;
      }

      await multiMethodAuthService.hydrateSession(
        res.session.access_token,
        res.session.refresh_token
      );
      const signedWorkspace =
        res.companies?.[0]?.companyName ||
        res.activeContext?.organizationName;
      showToast(
        signedWorkspace ? `Signed in to ${signedWorkspace}` : 'Signed in successfully',
        'success'
      );
      onSuccessRoute?.(res.activeContext?.destinationRoute || '/ess/dashboard');
    } catch (err: any) {
      setAuthError(err?.message || 'Unexpected authentication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCompany = async () => {
    if (!pendingSession || !selectedCompanyId) return;
    setIsSubmitting(true);
    setAuthError(null);
    try {
      await multiMethodAuthService.hydrateSession(
        pendingSession.access_token,
        pendingSession.refresh_token
      );
      const switchRes = await multiMethodAuthService.switchCompanyContext(selectedCompanyId);
      if (!switchRes.ok) {
        setAuthError(switchRes.message || 'Could not switch company workspace.');
        return;
      }
      const chosen = companies.find((c) => c.organizationId === selectedCompanyId);
      showToast(`Signed in to ${chosen?.organizationName || 'workspace'}`, 'success');
      onSuccessRoute?.(switchRes.activeContext?.destinationRoute || '/ess/dashboard');
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to activate selected company workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // RENDER: MULTI-COMPANY SELECTION
  // -------------------------------------------------------------------------
  if (step === 'company_select') {
    return (
      <div className="space-y-5">
        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-emerald-950">Identity Verified</p>
            <p className="text-xs text-emerald-800 mt-0.5">
              Your account is linked to {companies.length} companies. Choose your workspace for this session.
            </p>
          </div>
        </div>

        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {companies.map((comp) => {
            const active = selectedCompanyId === comp.organizationId;
            return (
              <button
                key={comp.organizationId}
                type="button"
                onClick={() => setSelectedCompanyId(comp.organizationId)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  active
                    ? 'border-[#07563D] bg-emerald-50/60 ring-2 ring-[#07563D]/15'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      active ? 'bg-[#07563D] text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {comp.companyName || comp.organizationName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {[
                        comp.companyName && comp.companyName !== comp.organizationName
                          ? comp.organizationName
                          : null,
                        comp.employeeCode ? `ID: ${comp.employeeCode}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Workspace'}{' '}
                      ·{' '}
                      <span className="uppercase font-semibold text-[#07563D]">
                        {comp.roleCode.replace(/_/g, ' ')}
                      </span>
                    </p>
                  </div>
                </div>
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    active ? 'border-[#07563D]' : 'border-gray-300'
                  }`}
                >
                  {active && <span className="w-2 h-2 rounded-full bg-[#07563D]" />}
                </span>
              </button>
            );
          })}
        </div>

        {authError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        <button
          type="button"
          disabled={isSubmitting || !selectedCompanyId}
          onClick={handleConfirmCompany}
          className="w-full py-3.5 px-4 bg-[#07563D] hover:bg-[#05402D] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Opening Workspace...</span>
            </>
          ) : (
            <>
              <span>Continue to Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER STEP 1: SELECT LOGIN METHOD BEFORE CREDENTIALS
  // -------------------------------------------------------------------------
  if (isEmployeePortal && step === 'select_method') {
    const enabledList = config?.enabledMethods || [
      'employee_id_password',
      'mobile_password',
      'mobile_otp',
      'email_password',
    ];
    const visibleMethods = METHOD_META.filter((m) => enabledList.includes(m.id));
    const recommendedMethod = config?.factoryRecommendedMethod || 'employee_id_password';

    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#07563D]">
            Employee &amp; Workforce Login
          </p>
          <p className="text-sm text-gray-600 mt-0.5">
            Select your preferred login method to continue
          </p>
        </div>

        {isLoadingConfig ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-gray-100 animate-pulse border border-gray-200"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {visibleMethods.map((method) => {
              const isSelected = selectedMethod === method.id;
              const isRecommended = recommendedMethod === method.id;

              return (
                <button
                  key={method.id}
                  type="button"
                  data-testid={`login-method-card-${method.id}`}
                  onClick={() => handleSelectMethod(method.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all group flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-[#07563D] bg-emerald-50/50 shadow-2xs'
                      : 'border-gray-200 bg-white hover:border-[#07563D]/60 hover:bg-emerald-50/20'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[#07563D] text-white'
                          : 'bg-gray-100 text-gray-600 group-hover:bg-emerald-100 group-hover:text-[#07563D]'
                      }`}
                    >
                      {method.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="text-sm font-bold text-gray-900">
                          {method.title}
                        </span>
                        {isRecommended && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-[#07563D]">
                            Recommended for factory &amp; site workers
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{method.subtitle}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#07563D] shrink-0 transition-transform group-hover:translate-x-0.5" />
                </button>
              );
            })}
          </div>
        )}

        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#07563D]" />
            <span>Single identity authentication</span>
          </span>
          <button
            type="button"
            onClick={onForgotPassword}
            className="font-semibold text-[#07563D] hover:underline"
          >
            Need help signing in?
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER STEP 2: METHOD-SPECIFIC CREDENTIALS FORM
  // -------------------------------------------------------------------------
  const activeMeta =
    METHOD_META.find((m) => m.id === selectedMethod) || METHOD_META[0];

  return (
    <form onSubmit={handlePasswordOrOtpSubmit} className="space-y-4">
      {isEmployeePortal && (
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
          <button
            type="button"
            onClick={handleChangeMethod}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#07563D] hover:text-[#05402D] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Change Login Method</span>
          </button>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-[#07563D] text-[11px] font-bold border border-emerald-200/80">
            {activeMeta.title}
          </span>
        </div>
      )}

      {authError && (
        <div className="p-3.5 bg-red-50/90 border border-red-200/80 rounded-xl space-y-2 text-red-700">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <div className="text-xs font-medium leading-relaxed">{authError}</div>
          </div>
          {errorCode === 'DUPLICATE_PHONE' && (
            <button
              type="button"
              onClick={() => handleSelectMethod('employee_id_password')}
              className="text-xs font-bold text-[#07563D] underline ml-6"
            >
              Switch to Employee ID + Password
            </button>
          )}
        </div>
      )}

      {/* Verified Organization / Company Banner */}
      {isEmployeePortal && (otpCompanyName || config?.companyName || otpOrgName || config?.organizationName) && (
        <div className="px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#07563D] text-white flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">
                {otpCompanyName || config?.companyName || otpOrgName || config?.organizationName}
              </p>
              {(otpOrgName || config?.organizationName) &&
                (otpCompanyName || config?.companyName) &&
                (otpOrgName || config?.organizationName) !==
                  (otpCompanyName || config?.companyName) && (
                  <p className="text-[11px] text-gray-500 truncate">
                    {otpOrgName || config?.organizationName}
                  </p>
                )}
            </div>
          </div>
          <CheckCircle2 className="w-4 h-4 text-[#07563D] shrink-0" />
        </div>
      )}

      {/* Credential Field according to selectedMethod */}
      {selectedMethod === 'employee_id_password' && (
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-700">
            Employee ID / Worker Code
          </label>
          <div className="relative">
            <BadgeCheck className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. EMP-101 or JCS0042"
              className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50/60 border border-gray-200 rounded-xl focus:bg-white focus:border-[#07563D] focus:ring-4 focus:ring-[#07563D]/10 outline-none uppercase placeholder:normal-case"
            />
          </div>
        </div>
      )}

      {(selectedMethod === 'mobile_password' ||
        (selectedMethod === 'mobile_otp' && !otpChallengeId)) && (
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-700">
            Registered Mobile Number
          </label>
          <div className="flex gap-2">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              disabled={Boolean(otpChallengeId)}
              aria-label="Country code"
              className="w-28 px-2.5 py-3 text-sm bg-gray-50/60 border border-gray-200 rounded-xl focus:bg-white focus:border-[#07563D] outline-none font-medium"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="relative flex-1">
              <Smartphone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                inputMode="numeric"
                autoFocus
                disabled={selectedMethod === 'mobile_otp' && Boolean(otpChallengeId)}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="98765 43210"
                className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50/60 border border-gray-200 rounded-xl focus:bg-white focus:border-[#07563D] focus:ring-4 focus:ring-[#07563D]/10 outline-none disabled:opacity-70"
              />
            </div>
          </div>
        </div>
      )}

      {selectedMethod === 'email_password' && (
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-700">
            Registered Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              autoFocus
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="name@company.com"
              className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50/60 border border-gray-200 rounded-xl focus:bg-white focus:border-[#07563D] focus:ring-4 focus:ring-[#07563D]/10 outline-none"
            />
          </div>
        </div>
      )}

      {/* Password Field (for Employee ID, Mobile+Password, Email+Password) */}
      {selectedMethod !== 'mobile_otp' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-gray-700">Password</label>
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-xs font-semibold text-[#07563D] hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full pl-10 pr-11 py-3 text-sm bg-gray-50/60 border border-gray-200 rounded-xl focus:bg-white focus:border-[#07563D] focus:ring-4 focus:ring-[#07563D]/10 outline-none"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* OTP Code Entry Stage (Mobile Number + OTP) */}
      {selectedMethod === 'mobile_otp' && otpChallengeId && (
        <div className="space-y-4 py-2 text-center">
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">
              OTP Verification
            </h3>
            <p className="text-xs text-gray-500">
              We have sent a verification code to
            </p>
            <div className="flex items-center justify-center gap-2 pt-0.5">
              <span className="text-sm font-extrabold text-gray-900 tracking-wide">
                {maskedDest || 'your registered mobile'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setOtpChallengeId(null);
                  setOtpCode('');
                  setOtpCompanyName(null);
                  setOtpOrgName(null);
                }}
                className="text-xs font-bold text-[#07563D] hover:underline"
              >
                Edit
              </button>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-2 max-w-[340px] mx-auto" role="group" aria-label="6-digit OTP">
            {Array.from({ length: 6 }).map((_, idx) => {
              const digit = otpCode[idx] || '';
              return (
                <input
                  key={idx}
                  type="text"
                  inputMode="numeric"
                  autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                  autoFocus={idx === 0}
                  maxLength={6}
                  aria-label={`OTP digit ${idx + 1}`}
                  value={digit}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '');
                    if (cleaned.length > 1) {
                      const full = cleaned.slice(0, 6);
                      setOtpCode(full);
                      const targetIdx = Math.min(5, full.length);
                      const parent = e.currentTarget.parentElement;
                      const nextInput = parent?.children[targetIdx] as HTMLInputElement | undefined;
                      nextInput?.focus();
                      return;
                    }
                    const chars = otpCode.padEnd(6, ' ').split('');
                    chars[idx] = cleaned || ' ';
                    const nextCode = chars.join('').replace(/\s+$/g, '').replace(/ /g, '');
                    setOtpCode(nextCode);
                    if (cleaned && idx < 5) {
                      const nextInput = e.currentTarget.parentElement?.children[idx + 1] as HTMLInputElement | undefined;
                      nextInput?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !otpCode[idx] && idx > 0) {
                      const prevInput = e.currentTarget.parentElement?.children[idx - 1] as HTMLInputElement | undefined;
                      prevInput?.focus();
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                    if (!pasted) return;
                    e.preventDefault();
                    setOtpCode(pasted);
                    const focusIdx = Math.min(5, pasted.length);
                    const targetInput = e.currentTarget.parentElement?.children[focusIdx] as HTMLInputElement | undefined;
                    targetInput?.focus();
                  }}
                  className={`h-13 w-full text-center font-black text-xl rounded-xl border bg-white transition-all outline-none shadow-xs ${
                    digit
                      ? 'border-[#07563D] ring-2 ring-[#07563D]/15 text-gray-900'
                      : 'border-gray-200 text-gray-900 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10'
                  }`}
                />
              );
            })}
          </div>

          <p className="text-[11px] text-gray-400">
            SMS auto-fill &amp; 6-digit paste supported
          </p>

          <div className="pt-0.5 flex flex-col items-center gap-2 text-xs">
            {cooldownSeconds > 0 ? (
              <span className="font-medium text-gray-400">
                Resend OTP in {cooldownSeconds}s
              </span>
            ) : (
              <>
                <span className="text-gray-400">Resend OTP via</span>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSendOtp}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-emerald-50/40 font-bold text-[#07563D] transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>SMS</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Primary Action Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 px-4 bg-[#07563D] hover:bg-[#05402D] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              {selectedMethod === 'mobile_otp' && !otpChallengeId
                ? 'Sending OTP...'
                : 'Verifying & Signing In...'}
            </span>
          </>
        ) : (
          <>
            <span>
              {selectedMethod === 'mobile_otp'
                ? otpChallengeId
                  ? 'Verify & Sign In'
                  : 'Send Login OTP'
                : 'Sign In Securely'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {isEmployeePortal && (
        <p className="text-[11px] text-center text-gray-500 pt-1">
          Powered by JOY PeopleHR Identity Gateway · Zero duplicate accounts
        </p>
      )}
    </form>
  );
};
