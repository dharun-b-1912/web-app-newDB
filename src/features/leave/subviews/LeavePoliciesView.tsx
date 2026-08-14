import React, { useState } from 'react';
import { LeavePolicy } from '../../../types/leave';
import { Badge } from '../../../components/ui/Badge';
import {
  FileCheck,
  Plus,
  Play,
  Sliders,
  CheckCircle,
  Building,
  Layers,
  Sparkles,
  HelpCircle,
  Clock,
} from 'lucide-react';

export const LeavePoliciesView: React.FC = () => {
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('pol-ind-01');
  const [simulatedDays, setSimulatedDays] = useState<number>(4);

  const initialPolicies: LeavePolicy[] = [
    {
      id: 'pol-ind-01',
      code: 'POL-IND-FT-2026',
      name: 'Acme India Standard Full-Time Policy',
      description: 'Standard leave allocation rules for India campus staff (Coimbatore & Bengaluru).',
      company_id: 'comp-01',
      applicable_groups: ['Full-Time India'],
      employment_types: ['Full Time', 'Confirmed'],
      departments: ['All'],
      locations: ['loc-cbe-01', 'loc-blr-01'],
      grades: ['L1', 'L2', 'L3', 'L4'],
      effective_from: '2026-01-01',
      status: 'Active',
      priority: 1,
      version: 2,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      rules: [
        {
          leave_type_id: 'lt-pl',
          annual_entitlement: 24,
          accrual_frequency: 'Monthly',
          accrual_amount_per_cycle: 2,
          accrual_start: 'JoiningDate',
          proration_method: 'CalendarDays',
          allow_carry_forward: true,
          max_carry_forward_days: 10,
          carry_forward_expiry_months: 3,
          allow_encashment: true,
          max_encashment_days_per_year: 10,
          min_balance_for_encashment: 15,
          encashment_calculation_basis: 'BasicSalary',
          allow_half_day: false,
          allow_hourly: false,
          max_hourly_per_month: 0,
          allow_negative_balance: false,
          max_negative_balance: 0,
          advance_notice_days: 3,
          allow_backdated: false,
          max_backdated_days: 0,
          attachment_required: false,
          sandwich_rule_enabled: true,
          exclude_holidays: true,
          exclude_weekly_offs: true,
        },
        {
          leave_type_id: 'lt-cl',
          annual_entitlement: 12,
          accrual_frequency: 'Quarterly',
          accrual_amount_per_cycle: 3,
          accrual_start: 'JoiningDate',
          proration_method: 'CalendarDays',
          allow_carry_forward: false,
          max_carry_forward_days: 0,
          carry_forward_expiry_months: 0,
          allow_encashment: false,
          max_encashment_days_per_year: 0,
          min_balance_for_encashment: 0,
          encashment_calculation_basis: 'BasicSalary',
          allow_half_day: true,
          allow_hourly: false,
          max_hourly_per_month: 0,
          allow_negative_balance: false,
          max_negative_balance: 0,
          advance_notice_days: 0,
          allow_backdated: true,
          max_backdated_days: 2,
          attachment_required: false,
          sandwich_rule_enabled: false,
          exclude_holidays: true,
          exclude_weekly_offs: true,
        },
      ],
    },
  ];

  const activePol = initialPolicies.find(p => p.id === selectedPolicyId) || initialPolicies[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-[#07563D]" />
            <span>Leave Policy Matrix & Rule Engine</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Define accrual frequencies, sandwich rules, carry-forward limits, and policy assignment hierarchy
          </p>
        </div>
        <button className="px-4 py-2.5 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>New Policy Version</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Policies Selector List */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Active Leave Policies</h3>
          {initialPolicies.map(pol => (
            <div
              key={pol.id}
              onClick={() => setSelectedPolicyId(pol.id)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                selectedPolicyId === pol.id
                  ? 'border-[#07563D] bg-[#07563D]/5 shadow-xs'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-gray-800">{pol.code}</span>
                <Badge variant="emerald" size="sm">
                  v{pol.version}.0 Active
                </Badge>
              </div>
              <h4 className="text-sm font-extrabold text-gray-900 mt-2">{pol.name}</h4>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{pol.description}</p>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <span>Priority: #{pol.priority}</span>
                <span>Effective: {pol.effective_from}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Policy Rules Matrix Detail */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-black text-gray-900">{activePol.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{activePol.description}</p>
              </div>
              <span className="text-xs font-bold text-[#07563D] bg-emerald-50 px-3 py-1 rounded-full">
                {activePol.rules.length} Configured Rules
              </span>
            </div>

            {/* Rules Matrix Table */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Entitlement & Accrual Rules</h4>
              <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                {activePol.rules.map((rule, idx) => (
                  <div key={idx} className="p-4 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#07563D] uppercase">
                        Rule #{idx + 1}: {rule.leave_type_id === 'lt-pl' ? 'Privilege Leave' : 'Casual Leave'}
                      </span>
                      <span className="text-xs font-mono font-bold text-gray-900">
                        {rule.annual_entitlement} Days / Year ({rule.accrual_frequency} Accrual)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-gray-50 p-3 rounded-lg">
                      <div>
                        <span className="text-gray-400 font-bold block text-[10px]">Sandwich Rule</span>
                        <span className="font-extrabold text-gray-800">
                          {rule.sandwich_rule_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold block text-[10px]">Carry Forward Cap</span>
                        <span className="font-extrabold text-gray-800">{rule.max_carry_forward_days} Days</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold block text-[10px]">Advance Notice</span>
                        <span className="font-extrabold text-gray-800">{rule.advance_notice_days} Days Required</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold block text-[10px]">Encashment Limit</span>
                        <span className="font-extrabold text-gray-800">{rule.max_encashment_days_per_year} Days</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Policy Precedence Priority Order Box */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-2">
              <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#07563D]" />
                <span>Policy Evaluation Hierarchy Precedence</span>
              </h4>
              <p className="text-xs text-gray-600">
                Individual Employee Specific → Employee Group → Department → Branch → Company Default
              </p>
            </div>
          </div>

          {/* Interactive Policy Simulator / Tester */}
          <div className="bg-white p-6 rounded-2xl border border-emerald-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 text-emerald-900">
              <Sparkles className="w-5 h-5 text-[#07563D]" />
              <h3 className="text-sm font-black">Interactive Policy Simulation Engine</h3>
            </div>
            <p className="text-xs text-gray-500">
              Test how this policy behaves for a proposed leave request range before deploying version updates.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-bold text-gray-700">Test Employee Group</label>
                <select className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-xs font-semibold">
                  <option>Full-Time India Software Engineers</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-700">Simulated Request Days</label>
                <input
                  type="number"
                  value={simulatedDays}
                  onChange={e => setSimulatedDays(parseInt(e.target.value) || 1)}
                  className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div className="flex items-end">
                <button className="w-full py-2 px-3 rounded-lg bg-[#07563D] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs">
                  <Play className="w-3.5 h-3.5" />
                  <span>Run Rule Simulation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
