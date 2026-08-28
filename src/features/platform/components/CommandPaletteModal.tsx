// src/features/platform/components/CommandPaletteModal.tsx
// ============================================================
// Joy PeopleHR — Global Command Palette (Ctrl + K)
// ============================================================

import React, { useState, useEffect } from 'react';
import { Search, Building2, Shield, CreditCard, Activity, Plus, Key, Terminal, ArrowRight } from 'lucide-react';
import { platformTenantService } from '../../../services/platform';
import { TenantOrganization } from '../../../types/platformAdmin';

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  onSelectTenant?: (tenant: TenantOrganization) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onSelectTenant,
}) => {
  const [query, setQuery] = useState('');
  const [tenants, setTenants] = useState<TenantOrganization[]>([]);

  useEffect(() => {
    if (isOpen) {
      platformTenantService.getTenants().then(setTenants);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredTenants = tenants.filter(t =>
    t.legal_name.toLowerCase().includes(query.toLowerCase()) ||
    t.owner_email.toLowerCase().includes(query.toLowerCase()) ||
    t.id.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  const quickActions = [
    { label: 'Provision New Organization', icon: Plus, tab: 'platform-tenants', shortcut: 'P' },
    { label: 'View Platform Telemetry & Health', icon: Activity, tab: 'platform-dashboard', shortcut: 'H' },
    { label: 'Manage Feature Flags & Toggles', icon: Terminal, tab: 'platform-features', shortcut: 'F' },
    { label: 'Review Overdue Invoices', icon: CreditCard, tab: 'platform-billing', shortcut: 'B' },
    { label: 'Audit Log & Security Sessions', icon: Shield, tab: 'platform-security', shortcut: 'S' },
  ].filter(a => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-gray-950/50 backdrop-blur-2xs animate-in fade-in duration-100">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tenants, invoices, feature flags, or run command..."
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-hidden font-medium"
          />
          <kbd className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-300 text-[10px] font-mono text-gray-500">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-3 divide-y divide-gray-100 text-xs">
          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <div className="space-y-1 pt-1">
              <div className="px-3 py-1 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                Quick Actions
              </div>
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onNavigateTab(action.tab);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-gray-700 hover:bg-emerald-50 hover:text-[#07563D] transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <action.icon className="w-4 h-4 text-gray-400 group-hover:text-[#07563D]" />
                    <span className="font-bold">{action.label}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                </button>
              ))}
            </div>
          )}

          {/* Tenants Section */}
          {filteredTenants.length > 0 && (
            <div className="space-y-1 pt-2">
              <div className="px-3 py-1 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                Organizations & Tenants
              </div>
              {filteredTenants.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    if (onSelectTenant) onSelectTenant(t);
                    else onNavigateTab('platform-tenants');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-bold text-gray-900">{t.legal_name}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{t.id} • {t.owner_email}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                    {t.plan}
                  </span>
                </button>
              ))}
            </div>
          )}

          {filteredTenants.length === 0 && quickActions.length === 0 && (
            <div className="p-8 text-center text-xs text-gray-400">
              No matching tenants or commands found for "{query}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
          <span>Navigate with arrow keys • Press Enter to select</span>
          <span className="font-mono text-[10px]">Joy PeopleHR v5.0 Control Plane</span>
        </div>
      </div>
    </div>
  );
};
