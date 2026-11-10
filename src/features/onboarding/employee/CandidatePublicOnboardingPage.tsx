// src/features/onboarding/employee/CandidatePublicOnboardingPage.tsx
// ============================================================
// Joy PeopleHR Enterprise — Candidate Public Digital Onboarding Gateway
// Tokenized access for candidates to complete statutory forms & KYC
// ============================================================

import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, Lock, AlertCircle, ArrowRight, CheckCircle2, Building2, Sparkles } from 'lucide-react';
import { StatutoryOnboardingService } from '../../../services/onboarding/statutoryOnboardingService';
import { OnboardingInvitation } from '../../../types/statutoryForms';
import { EmployeeSelfOnboardingPortal } from './EmployeeSelfOnboardingPortal';
import { JoyLogo } from '../../../components/common/JoyLogo';

interface Props {
  onNavigateToLogin?: () => void;
}

export const CandidatePublicOnboardingPage: React.FC<Props> = ({ onNavigateToLogin }) => {
  const [token, setToken] = useState<string>('');
  const [manualTokenInput, setManualTokenInput] = useState<string>('');
  const [invitation, setInvitation] = useState<OnboardingInvitation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Extract token from URL
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    let extractedToken = urlParams.get('token') || urlParams.get('t') || '';

    if (!extractedToken) {
      // Check pathname: /onboard/:token or /onboarding/complete/:token
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2 && (pathParts[0] === 'onboard' || pathParts[1] === 'complete')) {
        extractedToken = pathParts[pathParts.length - 1];
      }
    }

    if (extractedToken) {
      setToken(extractedToken);
      fetchInvitation(extractedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchInvitation = async (tok: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const inv = await StatutoryOnboardingService.getInvitationByToken(tok);
      if (inv) {
        setInvitation(inv);
      } else {
        setError('The onboarding invitation token could not be verified or has expired. Please contact your hiring manager.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify onboarding invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTokenInput.trim()) return;
    setToken(manualTokenInput.trim());
    fetchInvitation(manualTokenInput.trim());
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navigation */}
      <header className="w-full border-b border-slate-800 bg-[#0b0f17]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <JoyLogo className="h-8 w-auto shrink-0" />
            <div className="h-5 w-px bg-slate-800 hidden sm:block" />
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Official Digital Onboarding Portal
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> DPDP Act 2023 & EPFO Statutory Compliant
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onNavigateToLogin && (
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors border border-slate-700"
              >
                Employee Portal Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {isLoading ? (
          <div className="py-24 text-center space-y-4">
            <div className="w-12 h-12 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="text-sm font-bold text-slate-200">Verifying Candidate Onboarding Credential...</h3>
            <p className="text-xs text-slate-400">Loading statutory Form 11, Nomination and KYC engine</p>
          </div>
        ) : invitation ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">Welcome, {invitation.candidate_name}!</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Token Verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Complete your EPFO Form 11, Form 2 / Form F nomination, and identity KYC to finalize your onboarding.
                  </p>
                </div>
              </div>

              <div className="text-xs text-right sm:border-l sm:border-slate-800 sm:pl-4 text-slate-400">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Invitation Valid Until</span>
                <span className="text-slate-200 font-semibold">
                  {invitation.expires_at ? new Date(invitation.expires_at).toLocaleDateString() : '7 Days from Issue'}
                </span>
              </div>
            </div>

            <EmployeeSelfOnboardingPortal
              invitationToken={token}
              candidateName={invitation.candidate_name}
              orgName="Joy Corporate Solutions Pvt Ltd"
              onComplete={() => {
                fetchInvitation(token);
              }}
            />
          </div>
        ) : (
          <div className="max-w-md mx-auto py-12 space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white">Digital Onboarding Portal</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter your secure onboarding token provided in your official email invitation to access your statutory paperwork.
                </p>
              </div>

              {error && (
                <div className="p-3.5 bg-rose-950/50 border border-rose-800/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleManualTokenSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Invitation Security Token
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. onb-0c621892-..."
                    value={manualTokenInput}
                    onChange={(e) => setManualTokenInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
                >
                  <span>Verify Token & Open Onboarding</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="pt-4 border-t border-slate-800 text-center">
                <p className="text-[11px] text-slate-400">
                  Did not receive an invitation email? Contact your recruiter or HR operations desk.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-[#0b0f17] py-4 text-center text-xs text-slate-500">
        <p>Joy PeopleHR Enterprise &middot; Statutory Compliance & Workforce Automation &middot; ISO 27001 Certified</p>
      </footer>
    </div>
  );
};

