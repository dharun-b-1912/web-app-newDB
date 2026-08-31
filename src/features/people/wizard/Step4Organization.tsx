import React, { useState } from 'react';
import { Employee, Company } from '../../../types';
import { Users, UserCheck, Shield, Building, Network } from 'lucide-react';
import { Avatar } from '../../../components/ui/Avatar';

export interface Step4FormData {
  reporting_manager_id: string;
  reporting_manager_name: string;
  team_lead_id: string;
  team_lead_name: string;
  hr_owner_id: string;
  business_unit: string;
  cost_center: string;
}

interface Props {
  formData: Step4FormData;
  onChange: (fields: Partial<Step4FormData>) => void;
  employees: Employee[];
  activeCompany: Company | null;
  currentEmployeeCode?: string;
}

export const Step4Organization: React.FC<Props> = ({
  formData,
  onChange,
  employees = [],
  activeCompany,
  currentEmployeeCode,
}) => {
  const [managerSearch, setManagerSearch] = useState<string>('');
  const [tlSearch, setTlSearch] = useState<string>('');

  // Active eligible managers (exclude current new employee if matching code)
  const activeEmployees = employees.filter(
    (e) => (!e.status || e.status === 'Active' || e.status === 'Confirmed') && e.employee_code !== currentEmployeeCode
  );

  const filteredManagers = activeEmployees.filter((e) => {
    if (!managerSearch.trim()) return true;
    const q = managerSearch.toLowerCase();
    const fullName = `${e.first_name} ${e.last_name}`.toLowerCase();
    return (
      fullName.includes(q) ||
      (e.department_name && e.department_name.toLowerCase().includes(q)) ||
      (e.designation_title && e.designation_title.toLowerCase().includes(q))
    );
  });

  const filteredTeamLeads = activeEmployees.filter((e) => {
    if (!tlSearch.trim()) return true;
    const q = tlSearch.toLowerCase();
    const fullName = `${e.first_name} ${e.last_name}`.toLowerCase();
    return (
      fullName.includes(q) ||
      (e.department_name && e.department_name.toLowerCase().includes(q)) ||
      (e.designation_title && e.designation_title.toLowerCase().includes(q))
    );
  });

  const handleSelectManager = (empId: string) => {
    const matched = activeEmployees.find((e) => e.id === empId);
    if (matched) {
      onChange({
        reporting_manager_id: matched.id,
        reporting_manager_name: `${matched.first_name} ${matched.last_name}`,
      });
    } else {
      onChange({ reporting_manager_id: '', reporting_manager_name: '' });
    }
  };

  const handleSelectTeamLead = (empId: string) => {
    const matched = activeEmployees.find((e) => e.id === empId);
    if (matched) {
      onChange({
        team_lead_id: matched.id,
        team_lead_name: `${matched.first_name} ${matched.last_name}`,
      });
    } else {
      onChange({ team_lead_id: '', team_lead_name: '' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-black text-gray-900 tracking-tight">
          Organization Hierarchy & Reporting Structure
        </h3>
        <p className="text-xs text-gray-500">
          Assign the supervisor reporting line, team lead, and financial cost center allocation.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-5">
        {/* Legal Entity & Business Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Legal Entity / Company
            </label>
            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-800 truncate">
              {activeCompany?.legal_name || 'Joy Corporate Solutions Pvt Ltd'}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Business Unit
            </label>
            <input
              type="text"
              placeholder="e.g. Enterprise Solutions / Cloud"
              value={formData.business_unit}
              onChange={(e) => onChange({ business_unit: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Cost Center Code
            </label>
            <input
              type="text"
              placeholder="e.g. CC-ENG-2026"
              value={formData.cost_center}
              onChange={(e) => onChange({ cost_center: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
            />
          </div>
        </div>

        {/* Reporting Manager Searchable Selector */}
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-gray-900">
              Primary Reporting Manager <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            {formData.reporting_manager_name && (
              <span className="text-[11px] font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Assigned: {formData.reporting_manager_name}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <select
              value={formData.reporting_manager_id}
              onChange={(e) => handleSelectManager(e.target.value)}
              className="w-full px-3 py-2.5 text-xs bg-gray-50/50 hover:bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold text-gray-900"
            >
              <option value="">-- Choose Reporting Manager --</option>
              {filteredManagers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name} — {m.designation_title || 'Lead'} ({m.department_name || 'Dept'})
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Filter managers by name or dept..."
              value={managerSearch}
              onChange={(e) => setManagerSearch(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
            />
          </div>
        </div>

        {/* Team Lead Searchable Selector */}
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-gray-900">
              Team Lead / Direct Supervisor <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            {formData.team_lead_name && (
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                Assigned: {formData.team_lead_name}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <select
              value={formData.team_lead_id}
              onChange={(e) => handleSelectTeamLead(e.target.value)}
              className="w-full px-3 py-2.5 text-xs bg-gray-50/50 hover:bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold text-gray-900"
            >
              <option value="">-- Choose Team Lead / Supervisor --</option>
              {filteredTeamLeads.map((tl) => (
                <option key={tl.id} value={tl.id}>
                  {tl.first_name} {tl.last_name} — {tl.designation_title || 'TL'} ({tl.department_name || 'Dept'})
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Filter team leads..."
              value={tlSearch}
              onChange={(e) => setTlSearch(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
            />
          </div>
        </div>

        {/* Hierarchy Information Box */}
        <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-start gap-3">
          <Network className="w-4 h-4 text-[#07563D] mt-0.5 flex-shrink-0" />
          <div className="space-y-1 text-xs text-gray-600">
            <p className="font-bold text-gray-900">Automated Approval Routing</p>
            <p>
              Leave requests, attendance regularizations, and appraisals for this employee will automatically route to the selected Reporting Manager and Team Lead.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
