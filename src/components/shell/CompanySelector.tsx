import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check, Globe, Shield, Lock, MapPin } from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import { usePermission } from '../../hooks/usePermission';

export interface CompanySelectorProps {
  onOpenLocationEdit?: () => void;
}

export const CompanySelector: React.FC<CompanySelectorProps> = ({ onOpenLocationEdit }) => {
  const {
    organization,
    organizations,
    legalEntities,
    activeLegalEntity,
    switchOrganization,
    switchLegalEntity,
    roleTitle,
  } = useTenant();
  const { primaryRole } = usePermission();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (primaryRole === 'Super Admin' || !activeLegalEntity) return null;

  const isCompanyAdmin = primaryRole === 'Company Admin';
  const isHRHead = primaryRole === 'HR Head';
  const canSwitchEntities = legalEntities.length > 1;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 h-10 rounded-xl border border-gray-200/80 bg-white hover:bg-gray-50/80 transition-all text-left cursor-pointer shadow-2xs shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
      >
        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#07563D] flex items-center justify-center shrink-0 border border-emerald-100 font-black text-xs">
          {activeLegalEntity.legal_name.slice(0, 2).toUpperCase()}
        </div>
        <div className="hidden sm:block shrink-0">
          <div className="text-xs font-bold text-gray-900 truncate max-w-[220px] xl:max-w-[270px] whitespace-nowrap">
            {activeLegalEntity.legal_name}
          </div>
          <div className="text-[10px] text-gray-500 font-medium truncate max-w-[220px] xl:max-w-[270px] whitespace-nowrap flex items-center gap-1.5">
            <span>{(activeLegalEntity.city || 'Coimbatore').trim()}, {(activeLegalEntity.country || 'India').trim()}</span>
            <span className="text-gray-300">•</span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded text-[9.5px]">{activeLegalEntity.currency || 'INR'}</span>
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 ml-0.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Customer Organization Section */}
          <div className="px-3.5 py-2.5 border-b border-gray-100 bg-gradient-to-br from-emerald-50/50 to-transparent">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
              <span>Customer Organization</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-100/70 text-[#07563D] text-[9px] font-bold">
                {roleTitle}
              </span>
            </div>
            <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#07563D] shrink-0" />
              <span className="truncate">{organization?.name || 'Joy Corporate Solutions'}</span>
            </div>

            {/* Organization Switcher if multi-org */}
            {organizations.length > 1 && (
              <div className="mt-2 space-y-1">
                <div className="text-[9px] font-bold text-gray-400 uppercase">Your Organizations:</div>
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={async () => {
                      await switchOrganization(org.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                      org.id === organization?.id ? 'bg-emerald-100/60 font-bold text-[#07563D]' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span>{org.name}</span>
                    {org.id === organization?.id && <Check className="w-3 h-3 text-[#07563D]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Legal Entities Section */}
          <div className="py-1.5">
            <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
              <span>Authorized Legal Entities ({legalEntities.length})</span>
              {!canSwitchEntities && (
                <span className="inline-flex items-center gap-1 text-[9px] text-gray-400 font-normal">
                  <Lock className="w-2.5 h-2.5" /> Assigned Scope
                </span>
              )}
            </div>

            <div className="space-y-0.5 px-1.5">
              {legalEntities.map((entity) => {
                const isSelected = entity.id === activeLegalEntity.id;
                return (
                  <button
                    key={entity.id}
                    onClick={async () => {
                      await switchLegalEntity(entity.id);
                      setIsOpen(false);
                    }}
                    className={`w-full px-2.5 py-2 text-left rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-[#07563D] font-bold border border-emerald-200/70 shadow-2xs'
                        : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                          isSelected ? 'bg-[#07563D] text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs truncate leading-tight">
                          {entity.legal_name}
                        </div>
                        <div className="text-[10px] text-gray-400 font-normal flex items-center gap-1 mt-0.5">
                          <span>{entity.country}</span>
                          <span>•</span>
                          <span className="font-semibold text-gray-500">{entity.currency || 'INR'}</span>
                          {entity.statutory_registration_no && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[80px]">{entity.statutory_registration_no}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#07563D] shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick GPS Location Configuration */}
          {onOpenLocationEdit && (
            <div className="pt-1.5 pb-1 px-2 border-t border-gray-100 mt-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenLocationEdit();
                }}
                className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold text-emerald-800 hover:bg-emerald-50 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">View / Edit Live Company GPS Location</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
