// src/features/platform/auth/PlatformSuperAdminLoginPage.tsx
// ============================================================================
// JOY PeopleHR — Dedicated Platform Super Admin Authentication Portal
// Enterprise Control Plane Login with Independent Layout, Route & Security Guard
// ============================================================================

import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Building2,
  Users,
  Layers,
  Sparkles,
  Activity,
  CheckCircle2,
  Radio,
  KeyRound,
  AlertCircle,
  HelpCircle,
  X,
  Server,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../components/ui/Toast';
import { Button } from '../../../components/ui/Button';
import { JoyLogo } from '../../../components/common/JoyLogo';
import { supabase } from '../../../lib/supabase';
import { authService } from '../../../services/auth/authService';

export interface PlatformSuperAdminLoginPageProps {
  onSuccessRoute?: (route: string) => void;
  onBackToCustomer?: () => void;
}

export const PlatformSuperAdminLoginPage: React.FC<PlatformSuperAdminLoginPageProps> = ({
  onSuccessRoute,
  onBackToCustomer,
}) => {
  const { signIn, setAuthContextMode } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password modal state
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // Initialize auth context strictly to platform on mount
  React.useEffect(() => {
    setAuthContextMode('platform');
    if (typeof window !== 'undefined') {
      window.history.replaceState({ route: '/platform/login' }, '', '/platform/login');
    }
  }, [setAuthContextMode]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter your administrator email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Authenticate strictly with 'platform' context
      const res = await signIn(email.trim(), password, 'platform');

      if (!res.success) {
        setErrorMessage(res.errorMessage || 'Invalid credentials or unauthorized platform account.');
        return;
      }

      const user = res.user;
      const roleName = user?.roles?.[0]?.name ?? user?.role ?? '';
      const isPlatformStaff =
        Boolean(user?.is_platform_admin) ||
        ['Super Admin', 'Assistant Admin', 'Billing Admin', 'Security Officer'].includes(roleName);

      // 2. Strict Server-Side Authorization Guard
      if (!isPlatformStaff) {
        await supabase.auth.signOut();
        await authService.signOut();
        setErrorMessage('Access Denied. Your account is not authorized for the Platform Administration Gateway.');
        return;
      }

      showToast(`Welcome back, ${user?.name || 'Platform Administrator'}!`, 'success');

      if (onSuccessRoute) {
        onSuccessRoute('platform-dashboard');
      } else if (typeof window !== 'undefined') {
        window.location.href = '/platform-dashboard';
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected authentication error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setIsForgotLoading(true);
    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/platform/reset-password`
        : 'https://app.joypeoplehr.com/platform/reset-password';

      await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: redirectUrl,
      });

      setForgotSubmitted(true);
      showToast('If the email belongs to a registered administrator, a reset link has been dispatched.', 'info');
    } catch (err: any) {
      // Avoid revealing user existence
      setForgotSubmitted(true);
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleBackToPublicPortal = () => {
    if (onBackToCustomer) {
      onBackToCustomer();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#070D1E] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans antialiased relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Ambient Cyber / Aurora Background Lights */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/15 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0a_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Top Header / Back Navigation */}
      <div className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between py-2">
        <button
          type="button"
          onClick={handleBackToPublicPortal}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 transition-all cursor-pointer backdrop-blur-md"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
          <span>Back to JOY PeopleHR (Customer &amp; ESS Login)</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            CONTROL-PLANE ISOLATED
          </span>
        </div>
      </div>

      {/* Center 2-Column Authentication Card */}
      <div className="relative z-10 w-full max-w-5xl mx-auto my-auto py-6">
        <div className="bg-slate-900/85 backdrop-blur-2xl rounded-3xl border border-slate-800/90 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
          {/* LEFT PANEL: Platform Identity & High-Value Pillars */}
          <div className="lg:col-span-5 p-8 sm:p-10 bg-gradient-to-br from-slate-950 via-slate-900 to-[#06241C] border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-6 relative z-10">
              <div className="flex items-center gap-2.5">
                <JoyLogo size="md" />
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PLATFORM
                </span>
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  <Terminal className="w-3.5 h-3.5" />
                  SaaS Command Center
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  One secure command center for your entire SaaS ecosystem.
                </h1>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Centrally govern organizations, subscription quotas, users, hardware biometric fleet, and multi-tenant security policies.
                </p>
              </div>

              {/* 4 Feature Highlights */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-200">Multi-Tenant Governance</h2>
                    <p className="text-[11px] text-slate-400">Strict RLS boundaries, tenant lifecycle state machine &amp; company isolation.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-200">Subscription &amp; Seat Control</h2>
                    <p className="text-[11px] text-slate-400">Server-enforced seat limits, 4-tier central feature locks &amp; upgrades.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-200">Platform Security &amp; Compliance</h2>
                    <p className="text-[11px] text-slate-400">Database governance, verified is_platform_admin() guards &amp; audit mesh.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-200">Autonomous SaaS Intelligence</h2>
                    <p className="text-[11px] text-slate-400">JOY Sentinel anomaly radar with real-time Telegram watchdog bot.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance Footer */}
            <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>SOC2 Type II Ready</span>
              <span>•</span>
              <span>ISO 27001</span>
              <span>•</span>
              <span>256-Bit TLS</span>
            </div>
          </div>

          {/* RIGHT PANEL: Dedicated Login Form */}
          <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between bg-slate-900/60">
            <div className="w-full max-w-md mx-auto space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 mb-2">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  RESTRICTED ADMINISTRATIVE GATEWAY
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">Welcome back, Administrator</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Authenticate with your registered credentials to access the JOY platform control plane.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Authentication Failed</p>
                    <p className="text-[11px] text-rose-200 mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSignIn} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Registered Administrator Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="superadmin@joypeoplehr.com"
                      required
                      autoFocus
                      autoComplete="username"
                      disabled={isLoading}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder:text-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">
                      Master Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsForgotOpen(true)}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      autoComplete="current-password"
                      disabled={isLoading}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder:text-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Verifying Platform Authorization...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In Securely</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* Administrative Warning Banner */}
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  Audit &amp; Security Compliance Notice
                </div>
                <p>
                  Access to the Platform Control Center is restricted to verified administrators. All authentication attempts and cross-tenant mutations are logged to the immutable JOY Sentinel audit ledger.
                </p>
              </div>
            </div>

            <div className="w-full max-w-md mx-auto pt-6 border-t border-slate-800/60 text-center text-[11px] text-slate-500">
              © {new Date().getFullYear()} JOY PeopleHR Platform. All rights reserved.
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setIsForgotOpen(false);
                setForgotSubmitted(false);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <KeyRound className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-base font-bold text-white">Platform Password Recovery</h4>
                  <p className="text-xs text-slate-400">Request a secure, time-limited reset link</p>
                </div>
              </div>

              {forgotSubmitted ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Instructions Dispatched
                  </div>
                  <p className="text-[11px] text-emerald-200">
                    If <code>{forgotEmail}</code> is registered as a platform administrator, an encrypted password reset link has been sent. Please check your inbox.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsForgotOpen(false);
                      setForgotSubmitted(false);
                    }}
                    className="w-full mt-2 bg-slate-800 border-slate-700 text-slate-200 text-xs"
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Enter your registered administrator email address. We will verify your platform eligibility and dispatch a secure password reset link.
                  </p>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Administrator Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="superadmin@joypeoplehr.com"
                        required
                        className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsForgotOpen(false)}
                      className="bg-slate-800 border-slate-700 text-slate-300 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={isForgotLoading}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                    >
                      {isForgotLoading ? 'Dispatching...' : 'Send Recovery Link'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
