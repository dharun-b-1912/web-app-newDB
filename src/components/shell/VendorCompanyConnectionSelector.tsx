// src/components/shell/VendorCompanyConnectionSelector.tsx
// ============================================================================
// Joy PeopleHR — Scoped Vendor Portal Header Connection Selector
// Explicitly represents Vendor Identity and its Contractual Connection
// to Client Legal Entities, assigned sites, POs, and workforce scopes
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  ChevronDown,
  Check,
  ShieldCheck,
  Link2,
  ArrowRightLeft,
  Briefcase,
  MapPin,
  FileText,
  Users,
  Percent,
  Calendar,
  Mail,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export interface ConnectedClientCompany {
  id: string;
  clientCode: string;
  legalName: string;
  tradeName?: string;
  siteName: string;
  siteCode: string;
  contractCode: string;
  masterPoNumber: string;
  activeWorkforceCount: number;
  serviceChargePct: number;
  contractPeriod: string;
  contactPerson: string;
  contactEmail: string;
  statutoryPfCode: string;
  statutoryEsiCode: string;
  status: 'ACTIVE' | 'PENDING' | 'RENEWAL';
  isPrimary?: boolean;
}

export const CONNECTED_CLIENT_COMPANIES: ConnectedClientCompany[] = [
  {
    id: 'comp-joy-cbe',
    clientCode: 'CLI-JOY-01',
    legalName: 'Joy Corporate Solutions Pvt Ltd',
    tradeName: 'Joy Corporate Solutions',
    siteName: 'Chennai Manufacturing Plant',
    siteCode: 'CHE-01',
    contractCode: 'CON-JOY-CORP-2026-01',
    masterPoNumber: 'PO-JOY-2026-01',
    activeWorkforceCount: 36,
    serviceChargePct: 8.0,
    contractPeriod: '01 Jul 2026 – 30 Jun 2027',
    contactPerson: 'Kavitha R (HR Procurement Lead)',
    contactEmail: 'kavitha@joycorporate.com',
    statutoryPfCode: 'CB/CBE/1724259000',
    statutoryEsiCode: '56001195190001001',
    status: 'ACTIVE',
    isPrimary: true,
  },
  {
    id: 'arjuna-natural-coimbatore',
    clientCode: 'CLI-ARJUNA-02',
    legalName: 'Arjuna Natural Pvt Ltd',
    tradeName: 'Arjuna Natural Extracts',
    siteName: 'Factory Premises — Unit 2 Plant',
    siteCode: 'UNIT-2-CBE',
    contractCode: 'CON-ARJUNA-MANPOWER-2026',
    masterPoNumber: 'PO-ARJUNA-2026-07-E2E',
    activeWorkforceCount: 50,
    serviceChargePct: 8.0,
    contractPeriod: '01 Jul 2026 – 30 Jun 2027',
    contactPerson: 'Suresh Kumar (Factory HR Operations)',
    contactEmail: 'procurement@arjunanatural.com',
    statutoryPfCode: 'KR/KCH/0023412000',
    statutoryEsiCode: '47000214580000606',
    status: 'ACTIVE',
    isPrimary: false,
  },
];

export interface VendorCompanyConnectionSelectorProps {
  onClientSelect?: (client: ConnectedClientCompany) => void;
}

export const VendorCompanyConnectionSelector: React.FC<VendorCompanyConnectionSelectorProps> = ({
  onClientSelect,
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Vendor Agency Profile information
  const vendorName = (user as any)?.vendor_name || 'JOY MANPOWER SERVICE';
  const vendorCode = (user as any)?.vendor_code || 'VND-JOY-01';

  // Active Client Scope state
  const [activeClient, setActiveClient] = useState<ConnectedClientCompany>(() => {
    try {
      const savedId = localStorage.getItem('workforce_vendor_active_client');
      const found = CONNECTED_CLIENT_COMPANIES.find((c) => c.id === savedId);
      return found || CONNECTED_CLIENT_COMPANIES[0];
    } catch {
      return CONNECTED_CLIENT_COMPANIES[0];
    }
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelect = (client: ConnectedClientCompany) => {
    setActiveClient(client);
    try {
      localStorage.setItem('workforce_vendor_active_client', client.id);
      localStorage.setItem('workforce_vendor_active_site', client.siteName);
      localStorage.setItem('workforce_vendor_active_po', client.masterPoNumber);
      window.dispatchEvent(
        new CustomEvent('vendor:client_changed', {
          detail: client,
        })
      );
    } catch {}
    if (onClientSelect) {
      onClientSelect(client);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-flex items-center gap-2" ref={dropdownRef}>
      {/* 1. Vendor Agency Badge */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900 text-white border border-slate-700/80 shadow-2xs shrink-0 select-none">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-[11px] tracking-wide shrink-0">
          JMS
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5 leading-tight">
            <span>{vendorName}</span>
            <span className="text-[9px] font-mono text-emerald-400 px-1 py-0.2 rounded bg-emerald-950/80 border border-emerald-800/60">
              {vendorCode}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
            Authorized Manpower Contractor
          </div>
        </div>
      </div>

      {/* Connection Bridge Arrow */}
      <div className="hidden md:flex items-center text-emerald-600 px-0.5 shrink-0" title="Contractual Connection">
        <ArrowRightLeft className="w-3.5 h-3.5" />
      </div>

      {/* 2. Connected Client Company Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="View authorized client companies and active contract assignments"
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-200/90 bg-emerald-50/60 hover:bg-emerald-100/60 transition-all text-left cursor-pointer shadow-2xs shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
      >
        <div className="w-7 h-7 rounded-lg bg-[#07563D] text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs">
          <Building2 className="w-4 h-4 text-emerald-300" />
        </div>

        <div className="text-left shrink-0">
          <div className="text-[10px] font-bold text-[#07563D] uppercase tracking-wider leading-none flex items-center gap-1">
            <span>Connected Client</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
          </div>
          <div className="text-xs font-bold text-gray-900 truncate max-w-[170px] sm:max-w-[210px] whitespace-nowrap leading-tight mt-0.5">
            {activeClient.legalName}
          </div>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-emerald-700 shrink-0 ml-0.5 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* 3. Dropdown: List of Connected Client Companies & Contract Workings */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-[380px] sm:w-[460px] bg-white rounded-2xl shadow-2xl border border-gray-200 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 pb-2.5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#07563D] flex items-center justify-center font-bold">
                  <Link2 className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Connected Client Organizations</h4>
                  <p className="text-[10px] text-gray-500">
                    Authorized enterprise clients contracted with {vendorName}
                  </p>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#07563D] text-[10px] font-bold border border-emerald-200">
                {CONNECTED_CLIENT_COMPANIES.length} Active Contracts
              </span>
            </div>
          </div>

          {/* Relationship Flow Banner */}
          <div className="mx-4 my-2.5 p-2 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-slate-50 border border-emerald-200/60 text-[10px] text-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-800">{vendorName}</span>
              <span className="text-gray-400">➔</span>
              <span className="font-semibold text-slate-800">Assigned Client Scope</span>
            </div>
            <span className="text-emerald-700 font-bold">Verified Direct SOW</span>
          </div>

          {/* Client Company Cards List */}
          <div className="px-3 space-y-2 max-h-[380px] overflow-y-auto">
            {CONNECTED_CLIENT_COMPANIES.map((client) => {
              const isSelected = client.id === activeClient.id;
              return (
                <div
                  key={client.id}
                  onClick={() => handleSelect(client)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-emerald-50/80 border-emerald-400 shadow-xs ring-1 ring-emerald-500/20'
                      : 'bg-white hover:bg-gray-50/90 border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  {/* Top Row: Name and Selection */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? 'bg-[#07563D] text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                          <span>{client.legalName}</span>
                          {client.isPrimary && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-200/80 text-emerald-900">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          Client ID: {client.clientCode}
                        </div>
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                        <Check className="w-3 h-3 text-emerald-600" /> Active Scope
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400 hover:text-emerald-700 font-semibold px-2 py-0.5 shrink-0">
                        Switch ➔
                      </span>
                    )}
                  </div>

                  {/* Contract & Site Details Grid */}
                  <div className="mt-2.5 pt-2 border-t border-gray-100/90 grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-gray-400 block font-medium">Assigned Site:</span>
                      <span className="font-semibold text-gray-800 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">{client.siteName}</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block font-medium">Contract Ref:</span>
                      <span className="font-mono font-semibold text-gray-800 truncate block">
                        {client.contractCode}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block font-medium">Master PO Number:</span>
                      <span className="font-mono font-bold text-emerald-700 truncate block">
                        {client.masterPoNumber}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 block font-medium">Workforce Allocation:</span>
                      <span className="font-semibold text-gray-800 flex items-center gap-1">
                        <Users className="w-3 h-3 text-blue-600 shrink-0" />
                        <span>{client.activeWorkforceCount} Deployed Workers</span>
                      </span>
                    </div>
                  </div>

                  {/* Statutory & Contact Footer */}
                  <div className="mt-2 pt-1.5 border-t border-dashed border-gray-200/80 flex items-center justify-between text-[9px] text-gray-500">
                    <span className="truncate">
                      PF: <span className="font-mono text-gray-700">{client.statutoryPfCode}</span>
                    </span>
                    <span className="truncate">
                      POC: <span className="text-gray-700 font-semibold">{client.contactPerson.split(' ')[0]}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Security / Scope Policy Footer */}
          <div className="px-4 pt-2.5 mt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Isolated Vendor Partner Gateway
            </span>
            <span className="text-[10px] font-mono text-gray-400">
              Active: {activeClient.clientCode}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
