// src/features/auth/AuthPage.tsx
// ============================================================
// WorkForceOS — Multi-Tenant Customer & Dedicated Platform Control Plane Auth
// ============================================================

import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { PlatformAdminLoginForm } from './PlatformAdminLoginForm';
import { Building2, ShieldCheck, Users, Layers, Sparkles, ShieldAlert, KeyRound } from 'lucide-react';
import { parseRouteFromUrl } from '../../lib/router/urlRouter';
import { cn } from '../../lib/utils';

export const AuthPage: React.FC = () => {
  const urlState = parseRouteFromUrl();
  const isPlatformInitial =
    urlState.route?.startsWith('platform') ||
    urlState.params?.portal === 'platform' ||
    urlState.params?.tab === 'platform-login';

  const [authMode, setAuthMode] = useState<'customer' | 'platform'>(
    isPlatformInitial ? 'platform' : 'customer'
  );
  const [isSignup, setIsSignup] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  return (
    <div className="min-h-screen w-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      {/* Top Portal Switcher Bar */}
      <div className="mb-4 bg-white p-1 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-1 text-xs">
        <button
          type="button"
          onClick={() => {
            setAuthMode('customer');
            setIsSignup(false);
          }}
          className={cn(
            'px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2',
            authMode === 'customer'
              ? 'bg-[#073B2A] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Customer HRMS Login</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setAuthMode('platform');
            setIsSignup(false);
          }}
          className={cn(
            'px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2',
            authMode === 'platform'
              ? 'bg-indigo-900 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>🛡️ Platform Staff Portal (Assistant / Super Admin)</span>
        </button>
      </div>

      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
        {/* Left Side Showcase */}
        <div
          className={cn(
            'md:col-span-5 text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden transition-colors duration-300',
            authMode === 'platform' ? 'bg-[#0b132b]' : 'bg-[#073B2A]'
          )}
        >
          {/* Decorative background glow */}
          <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-emerald-600/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  'w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg',
                  authMode === 'platform'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-emerald-400 text-[#073B2A]'
                )}
              >
                W
              </div>
              <div>
                <span className="font-black text-lg tracking-tight text-white leading-tight">
                  WorkForce<span className={authMode === 'platform' ? 'text-indigo-400' : 'text-emerald-400'}>OS</span>
                </span>
                <p className="text-[10px] text-gray-300 uppercase font-bold tracking-wider">
                  {authMode === 'platform' ? 'Platform Control Plane' : 'Enterprise HRMS Engine'}
                </p>
              </div>
            </div>

            <div className="mt-12 space-y-6">
              {authMode === 'platform' ? (
                <>
                  <h1 className="text-2xl font-extrabold tracking-tight text-white leading-snug">
                    SaaS Platform Control Center & Multi-Tenant Operations.
                  </h1>
                  <p className="text-xs text-indigo-200/80 leading-relaxed">
                    Internal administration console for Super Admins, Assistant Admins, Billing Specialists, and Security Officers managing customer organizations.
                  </p>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3 text-xs text-indigo-100">
                      <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-indigo-300">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <span>Tenant Lifecycle Provisioning & Health</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-indigo-100">
                      <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-indigo-300">
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </div>
                      <span>Delegated Operations & Support Sessions</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-indigo-100">
                      <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-indigo-300">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <span>Commercial GST Invoicing & FinOps Engine</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-extrabold tracking-tight text-white leading-snug">
                    Powering modern multi-entity enterprise workforces.
                  </h1>
                  <p className="text-xs text-emerald-100/80 leading-relaxed">
                    Streamline organizational structures, department hierarchies, RBAC policy enforcement, and employee directories across global legal entities.
                  </p>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3 text-xs text-emerald-50">
                      <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-emerald-300">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <span>Multi-Tenant Legal Entities & Branch Mapping</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-emerald-50">
                      <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-emerald-300">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <span>Granular Role-Based Access Control (RBAC)</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-emerald-50">
                      <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-emerald-300">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <span>Unified Employee Lifecycle Directory & Profiles</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="relative z-10 pt-8 border-t border-white/10 text-[11px] text-gray-300 flex items-center justify-between">
            <span>© 2026 WorkForceOS</span>
            <span className="flex items-center gap-1 text-gray-200">
              <Sparkles className="w-3 h-3 text-amber-300" /> Enterprise v3.2
            </span>
          </div>
        </div>

        {/* Right Side: Dynamic Form Container */}
        <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
          {authMode === 'platform' ? (
            <PlatformAdminLoginForm onSwitchToCustomerLogin={() => setAuthMode('customer')} />
          ) : isSignup ? (
            <SignupForm onToggleLogin={() => setIsSignup(false)} />
          ) : (
            <LoginForm
              onToggleSignup={() => setIsSignup(true)}
              onForgotPassword={() => setIsForgotOpen(true)}
            />
          )}
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
      />
    </div>
  );
};
