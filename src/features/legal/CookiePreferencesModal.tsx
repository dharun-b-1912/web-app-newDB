// src/features/legal/CookiePreferencesModal.tsx
// ============================================================
// Joy PeopleHR Enterprise — Cookie Consent Preferences Manager
// Provides granular GDPR & DPDP compliant cookie consent categories.
// ============================================================

import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { ShieldCheck, Cookie, CheckCircle2, Lock } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

export interface CookiePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'wf_cookie_preferences';

export const CookiePreferencesModal: React.FC<CookiePreferencesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { showToast } = useToast();

  const [preferences, setPreferences] = useState({
    essential: true, // Always required
    analytics: true,
    functional: true,
    marketing: false,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
    } catch (_) {}
  }, [isOpen]);

  const handleSavePreferences = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    showToast('Cookie preferences updated successfully.');
    onClose();
  };

  const handleAcceptAll = () => {
    const all = {
      essential: true,
      analytics: true,
      functional: true,
      marketing: true,
    };
    setPreferences(all);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    showToast('All cookie categories accepted.');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="lg">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-[#07563D] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900">
            <Cookie className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cookie & Privacy Preferences</h3>
            <p className="text-xs text-slate-500">Manage how Joy PeopleHR uses cookies and device telemetry.</p>
          </div>
        </div>

        <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {/* Essential */}
          <div className="pt-3 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <strong className="text-slate-900 dark:text-white font-semibold">Strictly Essential Cookies</strong>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Always Active
                </span>
              </div>
              <p className="text-slate-500 leading-relaxed">
                Necessary for secure tenant authentication, session draft preservation, CSRF defense, and load balancing.
              </p>
            </div>
            <div className="pt-1">
              <Lock className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Analytics */}
          <div className="pt-3 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <strong className="text-slate-900 dark:text-white font-semibold">Performance & Diagnostic Analytics</strong>
              <p className="text-slate-500 leading-relaxed">
                Collects anonymized runtime telemetry, API latency metrics, and crash dumps to maintain high availability.
              </p>
            </div>
            <div className="pt-1">
              <Switch
                checked={preferences.analytics}
                onChange={(checked) => setPreferences((p) => ({ ...p, analytics: checked }))}
              />
            </div>
          </div>

          {/* Functional */}
          <div className="pt-3 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <strong className="text-slate-900 dark:text-white font-semibold">Functional Customization</strong>
              <p className="text-slate-500 leading-relaxed">
                Remembers user preferences such as sidebar collapse state, preferred payroll currency, and dark mode.
              </p>
            </div>
            <div className="pt-1">
              <Switch
                checked={preferences.functional}
                onChange={(checked) => setPreferences((p) => ({ ...p, functional: checked }))}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={handleSavePreferences}>
            Save Preferences
          </Button>
          <Button size="sm" onClick={handleAcceptAll} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
            Accept All
          </Button>
        </div>
      </div>
    </Modal>
  );
};
