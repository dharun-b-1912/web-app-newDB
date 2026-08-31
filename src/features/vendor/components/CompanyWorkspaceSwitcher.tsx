import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  ChevronDown,
  Search,
  CheckCircle2,
  Clock,
  Ban,
  ShieldCheck,
  Plus,
  Users,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorCompanyRelationship } from '../../../types/vendorPortal';
import { Badge } from '../../../components/ui/Badge';

interface CompanyWorkspaceSwitcherProps {
  onOpenConnectModal?: () => void;
}

export const CompanyWorkspaceSwitcher: React.FC<CompanyWorkspaceSwitcherProps> = ({
  onOpenConnectModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [relationships, setRelationships] = useState<VendorCompanyRelationship[]>([]);
  const [activeRel, setActiveRel] = useState<VendorCompanyRelationship | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadData = () => {
    const rels = vendorPortalService.getVendorCompanyRelationships();
    setRelationships(rels);
    setActiveRel(vendorPortalService.getActiveRelationship());
  };

  useEffect(() => {
    loadData();
    const handleChanged = () => loadData();
    window.addEventListener('wf-vendor-relationship-changed', handleChanged);
    window.addEventListener('wf-vendor-changed', handleChanged);
    return () => {
      window.removeEventListener('wf-vendor-relationship-changed', handleChanged);
      window.removeEventListener('wf-vendor-changed', handleChanged);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectRelationship = (rel: VendorCompanyRelationship) => {
    if (rel.status === 'SUSPENDED') {
      alert(`Access to ${rel.company_name} is suspended. Contact client company administrator.`);
      return;
    }
    if (rel.status === 'PENDING_APPROVAL') {
      alert(`Connection with ${rel.company_name} is awaiting client company approval.`);
      return;
    }
    vendorPortalService.setActiveRelationshipId(rel.id);
    setActiveRel(rel);
    setIsOpen(false);
  };

  const filtered = relationships.filter((r) =>
    r.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.company_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.relationship_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Current Workspace Pill Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white border border-gray-200 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition text-left group"
        title="Switch Client Company Workspace"
      >
        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100 shrink-0">
          <Building2 className="w-4 h-4" />
        </div>
        <div className="flex flex-col min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Client Workspace:
            </span>
            <span className="font-mono text-[10px] font-bold text-indigo-600">
              {activeRel?.relationship_id || 'REL-001'}
            </span>
          </div>
          <span className="text-xs font-bold text-gray-900 truncate max-w-[180px] sm:max-w-[220px]">
            {activeRel?.company_name || 'Select Client Company'}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Multi-Company Dropdown Modal */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-84 sm:w-96 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="p-3.5 bg-gray-50/80 border-b border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Switch Client Company Workspace
              </span>
              <span className="text-[10px] font-bold text-gray-500 font-mono">
                {relationships.filter((r) => r.status === 'ACTIVE').length} Active Clients
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search connected client companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>
          </div>

          {/* Relationship List */}
          <div className="max-h-72 overflow-y-auto p-2 space-y-1">
            {filtered.map((rel) => {
              const isCurrent = activeRel?.id === rel.id;
              const isLocked = rel.status !== 'ACTIVE';

              return (
                <button
                  key={rel.id}
                  onClick={() => handleSelectRelationship(rel)}
                  className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-indigo-50/90 border border-indigo-200 text-indigo-950'
                      : isLocked
                      ? 'bg-gray-50/60 opacity-75 hover:bg-gray-100 border border-transparent'
                      : 'hover:bg-gray-50 border border-transparent text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                        rel.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : rel.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-gray-500">
                          {rel.relationship_id}
                        </span>
                        <p className="font-bold text-xs truncate text-gray-900">
                          {rel.company_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-gray-400" />
                          {rel.active_workers_count} Workers
                        </span>
                        <span>•</span>
                        <span>{rel.site_location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <Badge
                      variant={
                        rel.status === 'ACTIVE'
                          ? 'emerald'
                          : rel.status === 'PENDING_APPROVAL'
                          ? 'amber'
                          : 'rose'
                      }
                      size="sm"
                    >
                      {rel.status === 'ACTIVE' ? 'Active' : rel.status === 'PENDING_APPROVAL' ? 'Pending' : 'Suspended'}
                    </Badge>
                    {isCurrent && (
                      <span className="text-[9px] font-black uppercase text-indigo-700 font-mono tracking-wider">
                        Current
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div className="py-6 text-center text-gray-400 text-xs">
                No matching client company found.
              </div>
            )}
          </div>

          {/* Footer: Request New Client Connection */}
          <div className="p-2.5 bg-gray-50/80 border-t border-gray-100">
            <button
              onClick={() => {
                setIsOpen(false);
                if (onOpenConnectModal) onOpenConnectModal();
              }}
              className="w-full py-2 px-3 rounded-xl bg-white border border-gray-200 hover:border-indigo-400 text-indigo-700 hover:text-indigo-800 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" /> Request Connection to Client Company
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
