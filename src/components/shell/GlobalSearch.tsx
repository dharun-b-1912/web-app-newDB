import React, { useState, useEffect } from 'react';
import { Search, User, Building, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { Employee, Department } from '../../types';

export interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmployee?: (emp: Employee) => void;
  onNavigate?: (route: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isOpen,
  onClose,
  onSelectEmployee,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent, but toggle support
        }
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      api.getEmployees().then(setEmployees);
      api.getDepartments().then(setDepartments);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredEmployees = query
    ? employees.filter(
        e =>
          e.first_name.toLowerCase().includes(query.toLowerCase()) ||
          e.last_name.toLowerCase().includes(query.toLowerCase()) ||
          e.employee_code.toLowerCase().includes(query.toLowerCase()) ||
          (e.department_name && e.department_name.toLowerCase().includes(query.toLowerCase()))
      )
    : employees.slice(0, 4);

  const filteredDepts = query
    ? departments.filter(d => d.name.toLowerCase().includes(query.toLowerCase()))
    : departments.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search employees, departments, approval requests, reports... (Cmd + K)"
            className="w-full text-sm text-gray-900 placeholder:text-gray-400 bg-transparent focus:outline-none"
          />
          <kbd className="px-2 py-1 text-[10px] font-bold text-gray-400 bg-gray-100 rounded-md border border-gray-200">
            ESC
          </kbd>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {/* Quick Actions */}
          {!query && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1">
                Quick Navigation & Actions
              </div>
              <div className="grid grid-cols-2 gap-1.5 px-1">
                <button
                  onClick={() => {
                    onNavigate?.('people');
                    onClose();
                  }}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-emerald-50 text-xs font-semibold text-gray-700 hover:text-[#07563D] transition-colors text-left cursor-pointer"
                >
                  <User className="w-4 h-4 text-[#07563D]" />
                  Employee Directory
                </button>
                <button
                  onClick={() => {
                    onNavigate?.('organization');
                    onClose();
                  }}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-emerald-50 text-xs font-semibold text-gray-700 hover:text-[#07563D] transition-colors text-left cursor-pointer"
                >
                  <Building className="w-4 h-4 text-[#07563D]" />
                  Organization Architecture
                </button>
                <button
                  onClick={() => {
                    onNavigate?.('rbac');
                    onClose();
                  }}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-emerald-50 text-xs font-semibold text-gray-700 hover:text-[#07563D] transition-colors text-left cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#07563D]" />
                  RBAC & Permission System
                </button>
                <button
                  onClick={() => {
                    onNavigate?.('dashboard');
                    onClose();
                  }}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-emerald-50 text-xs font-semibold text-gray-700 hover:text-[#07563D] transition-colors text-left cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#07563D]" />
                  Executive Dashboard
                </button>
              </div>
            </div>
          )}

          {/* Employees List */}
          {filteredEmployees.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1">
                Employees ({filteredEmployees.length})
              </div>
              <div className="space-y-1">
                {filteredEmployees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => {
                      onSelectEmployee?.(emp);
                      onClose();
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-gray-50 flex items-center justify-between transition-colors text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={emp.avatar_url}
                        alt={emp.first_name}
                        className="w-8 h-8 rounded-full object-cover border border-gray-200"
                      />
                      <div>
                        <div className="text-xs font-bold text-gray-900 group-hover:text-[#07563D]">
                          {emp.first_name} {emp.last_name}{' '}
                          <span className="text-[10px] text-gray-400 font-normal">({emp.employee_code})</span>
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {emp.designation_title} • {emp.department_name}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Departments */}
          {filteredDepts.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1">
                Departments
              </div>
              <div className="space-y-1">
                {filteredDepts.map(dept => (
                  <div
                    key={dept.id}
                    onClick={() => {
                      onNavigate?.('organization');
                      onClose();
                    }}
                    className="p-2.5 rounded-xl hover:bg-gray-50 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building className="w-4 h-4 text-emerald-700" />
                      <div>
                        <div className="text-xs font-bold text-gray-800">{dept.name}</div>
                        <div className="text-[10px] text-gray-400">Code: {dept.code} • {dept.employee_count} Members</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
