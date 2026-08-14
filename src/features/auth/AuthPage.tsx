import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { Building2, ShieldCheck, Users, Layers, Sparkles } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  return (
    <div className="min-h-screen w-screen bg-[#F8F9FA] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
        {/* Left Side: Enterprise HRMS Showcase */}
        <div className="md:col-span-5 bg-[#073B2A] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle decorative background circles */}
          <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-emerald-600/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-400 text-[#073B2A] flex items-center justify-center font-black text-xl shadow-lg">
                W
              </div>
              <div>
                <span className="font-black text-lg tracking-tight text-white leading-tight">
                  WorkForce<span className="text-emerald-400">OS</span>
                </span>
                <p className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider">
                  Enterprise HRMS Engine
                </p>
              </div>
            </div>

            <div className="mt-12 space-y-6">
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
            </div>
          </div>

          <div className="relative z-10 pt-8 border-t border-emerald-800/60 text-[11px] text-emerald-300/80 flex items-center justify-between">
            <span>© 2026 WorkForceOS</span>
            <span className="flex items-center gap-1 text-emerald-200">
              <Sparkles className="w-3 h-3 text-amber-300" /> Enterprise v3.2
            </span>
          </div>
        </div>

        {/* Right Side: Auth Form Container */}
        <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
          {isSignup ? (
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
