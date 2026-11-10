// src/components/common/CookieConsentBanner.tsx
// ============================================================
// Joy PeopleHR Enterprise — Proactive DPDP & GDPR Cookie Consent Banner
// Fixed bottom floating banner with granular consent actions.
// ============================================================

import React, { useState, useEffect } from 'react';
import { Cookie, ShieldCheck, Settings2, X, Check } from 'lucide-react';
import { CookiePreferencesModal } from '../../features/legal/CookiePreferencesModal';

const STORAGE_KEY = 'wf_cookie_preferences';

export const CookieConsentBanner: React.FC = () => {
  const [hasPreferences, setHasPreferences] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setHasPreferences(false);
      }
    } catch {
      setHasPreferences(true);
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          essential: true,
          analytics: true,
          functional: true,
          marketing: true,
          timestamp: new Date().toISOString(),
        })
      );
    } catch {}
    setHasPreferences(true);
  };

  const handleEssentialOnly = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          essential: true,
          analytics: false,
          functional: true,
          marketing: false,
          timestamp: new Date().toISOString(),
        })
      );
    } catch {}
    setHasPreferences(true);
  };

  if (hasPreferences) {
    return isModalOpen ? (
      <CookiePreferencesModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setHasPreferences(true);
        }}
      />
    ) : null;
  }

  return (
    <>
      <div
        role="region"
        aria-label="Cookie consent banner"
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-xl z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
      >
        <div className="bg-slate-900/95 dark:bg-[#0c121e]/95 backdrop-blur-md text-white p-5 rounded-2xl border border-slate-700/80 shadow-2xl shadow-black/40 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Cookie className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white tracking-tight">Cookie & Privacy Consent</h4>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                  <ShieldCheck className="w-3 h-3" />
                  DPDP & GDPR Compliant
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Joy PeopleHR uses strictly necessary cookies for session persistence, CSRF security, and tenant routing. 
                With your consent, we also use analytical cookies to maintain service reliability.
              </p>
            </div>
            <button
              type="button"
              onClick={handleEssentialOnly}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              title="Decline optional cookies"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="hover:text-emerald-400 flex items-center gap-1 font-medium underline underline-offset-2 transition-colors cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Customize Preferences
              </button>
              <span>&middot;</span>
              <a
                href="/legal"
                className="hover:text-emerald-400 font-medium underline underline-offset-2 transition-colors"
              >
                Statutory Notice
              </a>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleEssentialOnly}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                Essential Only
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md shadow-emerald-950/50 transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Accept All
              </button>
            </div>
          </div>
        </div>
      </div>

      <CookiePreferencesModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setHasPreferences(true);
        }}
      />
    </>
  );
};

