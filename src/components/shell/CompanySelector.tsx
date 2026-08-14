import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check, Globe } from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';

export const CompanySelector: React.FC = () => {
  const { companies, activeCompany, setActiveCompany, organization } = useTenant();
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

  if (!activeCompany) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200/80 bg-white hover:bg-gray-50/80 transition-colors text-left cursor-pointer shadow-2xs shrink-0"
      >
        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#07563D] flex items-center justify-center shrink-0 border border-emerald-100 font-bold text-xs">
          {activeCompany.legal_name.slice(0, 2).toUpperCase()}
        </div>
        <div className="hidden sm:block shrink-0">
          <div className="text-xs font-bold text-gray-900 truncate max-w-[140px] whitespace-nowrap">
            {activeCompany.legal_name}
          </div>
          <div className="text-[10px] text-gray-400 font-medium truncate max-w-[140px] whitespace-nowrap">
            {activeCompany.city}, {activeCompany.country}
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Organization Scope
            </div>
            <div className="text-xs font-semibold text-gray-800 flex items-center gap-1.5 mt-0.5">
              <Globe className="w-3.5 h-3.5 text-[#07563D]" />
              {organization?.name || 'Acme Global Enterprise'}
            </div>
          </div>

          <div className="py-1">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Legal Entities ({companies.length})
            </div>
            {companies.map(company => {
              const isSelected = company.id === activeCompany.id;
              return (
                <button
                  key={company.id}
                  onClick={() => {
                    setActiveCompany(company);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer ${
                    isSelected ? 'bg-emerald-50/60' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className={`w-4 h-4 ${isSelected ? 'text-[#07563D]' : 'text-gray-400'}`} />
                    <div>
                      <div className={`text-xs font-semibold ${isSelected ? 'text-[#07563D]' : 'text-gray-800'}`}>
                        {company.legal_name}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {company.statutory_registration_no}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#07563D]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
