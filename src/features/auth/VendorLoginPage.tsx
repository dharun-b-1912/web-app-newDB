// src/features/auth/VendorLoginPage.tsx
// ============================================================================
// Joy PeopleHR — Dedicated External Vendor Portal Authentication Screen
// Separate authentication entry point for Vendors, Contractors, and Manpower Agencies
// SaaS Enterprise Emerald Theme — Clean Light Aesthetic (No Dark Blue / Inverted UI)
// ============================================================================

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  FileCheck,
  Users,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import { JoyLogo } from '../../components/common/JoyLogo';

export interface VendorLoginPageProps {
  onNavigateToCompanyLogin?: () => void;
  onSuccessRoute?: (route: string) => void;
}

export const VendorLoginPage: React.FC<VendorLoginPageProps> = ({
  onNavigateToCompanyLogin,
  onSuccessRoute,
}) => {
  const { signIn } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleVendorSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    try {
      const res = await signIn(email, password, 'vendor');
      if (res.success && res.user) {
        showToast(`Vendor Portal Sign-in Successful: ${res.user.name || 'Vendor'}`, 'success');
        if (onSuccessRoute) {
          onSuccessRoute(res.destinationRoute || 'vendor-dashboard');
        } else {
          window.location.href = '/vendor/dashboard';
        }
      } else {
        const errorMsg = res.errorMessage || 'Invalid vendor credentials or unauthorized account.';
        setAuthError(errorMsg);
        showToast(errorMsg, 'error');
      }
    } catch (err: any) {
      const msg = err.message || 'An unexpected error occurred during vendor sign-in.';
      setAuthError(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans antialiased text-slate-800">
      {/* Container */}
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl border border-gray-100/90 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        {/* Left Banner: Joy PeopleHR Signature SaaS Emerald Theme */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#064E3B] via-[#07563D] to-[#042F24] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden text-white border-b lg:border-b-0 lg:border-r border-emerald-900/30">
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="bg-white/95 rounded-2xl p-2.5 inline-block shadow-md border border-white/40">
              <JoyLogo size="sm" showText animated={false} />
            </div>

            <div className="space-y-2">
              <span className="inline-block text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                Vendor Ecosystem
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">
                Vendor Collaboration Portal
              </h1>
              <p className="text-xs text-emerald-100/80 leading-relaxed">
                Dedicated secure portal for manpower agencies, contractors, and external vendors to manage purchase orders, workforce billing, and compliance.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-200 mt-0.5 shrink-0">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Purchase Orders &amp; Invoices</div>
                  <div className="text-[11px] text-emerald-100/70">Review POs, accept terms, and submit 3-way matched invoices.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-200 mt-0.5 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Workforce &amp; Attendance</div>
                  <div className="text-[11px] text-emerald-100/70">Manage deployed associates, rosters, and biometric verification.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-200 mt-0.5 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Statutory Compliance Vault</div>
                  <div className="text-[11px] text-emerald-100/70">Upload ESI/PF return receipts, TRRN challans, and labor licenses.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 border-t border-emerald-700/40 text-[11px] text-emerald-200/90 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Multi-Tenant RLS Isolated Account Access</span>
          </div>
        </div>

        {/* Right Form: Clean White SaaS Sign-in Controls */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between bg-white text-slate-900">
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Sign In to Vendor Portal</h2>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  External Vendor Access
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter your registered vendor email and password to access authorized contracts and POs.
              </p>
            </div>

            {authError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Authentication Failed</div>
                  <div>{authError}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleVendorSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Registered Vendor Work Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. name@vendorcompany.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700">Password *</label>
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      showToast('Password reset link sent to registered email', 'info');
                    }}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    Forgot Password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#064E3B] hover:bg-[#053d2e] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In to Vendor Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="pt-6 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">Company HR / Procurement User?</span>
            <button
              type="button"
              onClick={() => {
                if (onNavigateToCompanyLogin) {
                  onNavigateToCompanyLogin();
                } else {
                  window.location.href = '/login';
                }
              }}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Go to Company HR Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
