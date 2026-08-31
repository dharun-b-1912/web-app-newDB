// src/features/auth/AuthPage.tsx
// ============================================================
// Joy PeopleHR / WorkForceOS — Production Enterprise Authentication Gateway
// ============================================================

import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { PasswordSetupModal } from './PasswordSetupModal';
import {
  Building2,
  ShieldCheck,
  Users,
  CreditCard,
  Lock,
  CheckCircle2,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AuthContextMode } from '../../services/auth/authService';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

export interface AuthPageProps {
  initialContext?: AuthContextMode;
  onNavigateToSuperAdmin?: () => void;
  onSuccessRoute?: (route: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialContext = 'tenant', onSuccessRoute }) => {
  const { authContext, setAuthContextMode } = useAuth();
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  // Sync URL slug on mount and reflect deep-linked path
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath === '/vendor/login' || currentPath === '/vendor-login' || currentPath.startsWith('/vendor')) {
        setAuthContextMode('vendor');
      } else if (currentPath === '/platform-login' || currentPath === '/superadmin') {
        setAuthContextMode('platform');
      } else if (currentPath !== '/login' && !currentPath.includes('activate') && !currentPath.includes('reset-password')) {
        const slug = authContext === 'platform' ? '/platform-login' : authContext === 'vendor' ? '/vendor/login' : '/login';
        window.history.replaceState({ route: slug }, '', slug);
      }
    }
  }, []);

  const handleContextChange = (mode: AuthContextMode) => {
    setAuthContextMode(mode);
    if (typeof window !== 'undefined') {
      const slug = mode === 'platform' ? '/platform-login' : mode === 'vendor' ? '/vendor/login' : '/login';
      window.history.replaceState({ route: slug }, '', slug);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans antialiased">
      {/* 1. Context Switcher Bar */}
      <div className="mb-6 bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-1.5 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => handleContextChange('tenant')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
            authContext === 'tenant'
              ? 'bg-[#073B2A] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Organization Workspace</span>
        </button>

        <button
          type="button"
          onClick={() => handleContextChange('vendor')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
            authContext === 'vendor'
              ? 'bg-[#312E81] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Vendor & Contractor Portal</span>
        </button>

        <button
          type="button"
          onClick={() => handleContextChange('platform')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
            authContext === 'platform'
              ? 'bg-[#0F172A] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Platform Administration</span>
        </button>
      </div>

      {/* 2. Main Authentication Shell (Balanced Two-Column Grid) */}
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl border border-gray-100/90 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        {/* Left Side: Brand Showcase & Value Pillars */}
        <div
          className={cn(
            'lg:col-span-5 text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden transition-colors duration-300',
            authContext === 'platform'
              ? 'bg-[#0F172A]'
              : authContext === 'vendor'
              ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900'
              : 'bg-[#073B2A]'
          )}
        >
          {/* Subtle decorative glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          {/* Top Brand Logo */}
          <div className="relative z-10 space-y-6">
            <div className="bg-white/95 rounded-2xl p-2.5 inline-block shadow-sm">
              <img
                src="/joy-people-hr-logo.png"
                alt="JOY People - People First. Work Simplified."
                className="h-10 w-auto object-contain"
              />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                {authContext === 'platform'
                  ? 'Platform Control Plane'
                  : authContext === 'vendor'
                  ? 'Vendor Compliance & Contractor Intelligence'
                  : 'One secure workspace for your people operations.'}
              </h1>
              <p className="text-xs text-white/70 leading-relaxed">
                {authContext === 'platform'
                  ? 'Manage multi-tenant infrastructure, customer lifecycle, and compliance policies.'
                  : authContext === 'vendor'
                  ? 'Direct contractor portal for KYC onboarding, CLRA licenses, worker payroll, and invoice matching.'
                  : 'Empowering teams with seamless attendance, payroll, talent, and workforce intelligence.'}
              </p>
            </div>
          </div>

          {/* Middle: 3 Concise Enterprise Pillars */}
          <div className="relative z-10 py-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <Users className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Workforce & Employee Management</div>
                <div className="text-[11px] text-white/60">Unified lifecycle from onboarding to separation.</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Payroll & Compliance Operations</div>
                <div className="text-[11px] text-white/60">Automated salary runs, EPF, ESIC & tax filings.</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Secure Multi-Tenant Access</div>
                <div className="text-[11px] text-white/60">Strict tenant isolation and enterprise RBAC.</div>
              </div>
            </div>
          </div>

          {/* Bottom Security Assurance */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/60">
            <span>Joy PeopleHR — HR & Payroll SaaS</span>
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>SOC2 & ISO 27001 Ready</span>
            </span>
          </div>
        </div>

        {/* Right Side: Focused Authentication Gateway Form */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
          <div className="max-w-md mx-auto w-full my-auto">
            <LoginForm
              authContext={authContext}
              onForgotPassword={() => setIsForgotOpen(true)}
              onSuccessRoute={onSuccessRoute}
            />
          </div>

          {/* Bottom Footer Links */}
          <div className="pt-6 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span>© {new Date().getFullYear()} JOY PeopleHR. All rights reserved.</span>
            <div className="flex items-center gap-3">
              <a href="#privacy" className="hover:text-gray-600 transition-colors">
                Privacy
              </a>
              <span>•</span>
              <a href="#terms" className="hover:text-gray-600 transition-colors">
                Terms
              </a>
              <span>•</span>
              <a href="#support" className="hover:text-gray-600 transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
      />

      {/* Mandatory First-Login Password Setup Gate */}
      <PasswordSetupModal />
    </div>
  );
};
