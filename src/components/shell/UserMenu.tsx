import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, Shield, LogOut, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { api } from '../../services/api';

export const UserMenu: React.FC = () => {
  const { user, login, logout } = useAuth();
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

  if (!user) return null;

  const currentRole = user.roles?.[0]?.name || 'Employee';

  const switchPersona = async (email: string) => {
    const users = await api.getUsers();
    const target = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (target) {
      login(target);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
      >
        <Avatar src={user.avatar_url} name={user.name} size="md" />
        <div className="hidden lg:block text-left shrink-0">
          <div className="text-xs font-bold text-gray-900 leading-tight whitespace-nowrap">{user.name}</div>
          <div className="text-[10px] text-gray-500 font-medium whitespace-nowrap">{currentRole}</div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
            <Avatar src={user.avatar_url} name={user.name} size="lg" />
            <div>
              <div className="text-sm font-bold text-gray-900">{user.name}</div>
              <div className="text-xs text-gray-500 truncate max-w-[170px]">{user.email}</div>
              <Badge variant="emerald" size="sm" className="mt-1">
                <Shield className="w-3 h-3 mr-1 inline" />
                {currentRole}
              </Badge>
            </div>
          </div>

          {/* Quick Persona Switcher for HRMS Testing */}
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
              Switch Test Role Context
            </div>
            <div className="space-y-1">
              {[
                { name: 'Platform Admin', email: 'superadmin@workforceos.com', role: 'Super Admin (Platform)' },
                { name: 'Dharun Joy', email: 'admin@acme.com', role: 'Company Admin (Company)' },
                { name: 'Arun Kumar', email: 'arun.kumar@acme.com', role: 'HR Head (Company HR)' },
                { name: 'Karthik N.', email: 'karthik.n@acme.com', role: 'Manager (Department)' },
                { name: 'Deepa S.', email: 'deepa.s@acme.com', role: 'Team Lead (Team)' },
                { name: 'Priya Sharma', email: 'priya.sharma@acme.com', role: 'Employee (Self)' },
              ].map(persona => {
                const isCurrent = user.email === persona.email;
                return (
                  <button
                    key={persona.email}
                    onClick={() => switchPersona(persona.email)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isCurrent ? 'bg-emerald-100/70 font-bold text-[#07563D]' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div>
                      <div>{persona.name}</div>
                      <div className="text-[10px] text-gray-400">{persona.role}</div>
                    </div>
                    {isCurrent && <Check className="w-3.5 h-3.5 text-[#07563D]" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="py-1">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
            >
              <UserIcon className="w-4 h-4 text-gray-400" />
              My Profile Settings
            </button>
            <button
              onClick={logout}
              className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
