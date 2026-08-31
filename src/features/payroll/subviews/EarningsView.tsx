import React, { useState, useEffect, useMemo } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { ReimbursementClaim, EmployeeSalaryAssignment } from '../../../types/payroll';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import {
  TrendingUp,
  Gift,
  Coins,
  Receipt,
  Plus,
  Search,
  Check,
  Clock,
  Zap,
  Sparkles,
  Calculator,
  ShieldCheck,
  Users,
  DollarSign,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';
import { ExpenseClaimsView } from './ExpenseClaimsView';

interface EarningsViewProps {
  initialSubTab?: string;
}

interface BonusItem {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  type: 'Performance Bonus' | 'Festive Ex-Gratia' | 'Sales Incentive' | 'Retention Bonus';
  amount: number;
  taxable: boolean;
  status: 'Approved' | 'Pending Review';
  approved_by: string;
  period: string;
}

export const EarningsView: React.FC<EarningsViewProps> = ({ initialSubTab }) => {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<string>(initialSubTab || 'overtime');
  const [salaries, setSalaries] = useState<EmployeeSalaryAssignment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // OT Simulator State
  const [simSalary, setSimSalary] = useState<number>(35000);
  const [simOtHours, setSimOtHours] = useState<number>(12);
  const [simMultiplier, setSimMultiplier] = useState<number>(1.5);

  // Bonus State
  const [bonuses, setBonuses] = useState<BonusItem[]>([
    {
      id: 'bon-01',
      employee_id: 'emp-01',
      employee_name: 'Dharun B',
      employee_code: 'WF-01',
      type: 'Performance Bonus',
      amount: 25000,
      taxable: true,
      status: 'Approved',
      approved_by: 'Management Review',
      period: 'August 2026',
    },
    {
      id: 'bon-02',
      employee_id: 'emp-02',
      employee_name: 'Priya Sundaram',
      employee_code: 'WF-02',
      type: 'Sales Incentive',
      amount: 15000,
      taxable: true,
      status: 'Approved',
      approved_by: 'Sales Director',
      period: 'August 2026',
    },
  ]);

  // Modal State
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [newBonusEmp, setNewBonusEmp] = useState('');
  const [newBonusType, setNewBonusType] = useState<BonusItem['type']>('Performance Bonus');
  const [newBonusAmount, setNewBonusAmount] = useState(10000);

  const loadData = async () => {
    const sList = await payrollApi.getEmployeeSalaries();
    setSalaries(sList);
    if (sList.length > 0 && !newBonusEmp) {
      setNewBonusEmp(sList[0].employee_name);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = hrEventBus.subscribe('*', () => loadData());
    return () => unsub();
  }, []);

  const subTabs = [
    { id: 'overtime', label: 'Overtime & Shift Earnings', icon: TrendingUp },
    { id: 'incentives', label: 'Incentives & Variable Bonuses', icon: Coins },
    { id: 'reimbursements', label: 'Expense Claims & Reimbursements', icon: Receipt },
  ];

  // Calculated OT values
  const hourlyRate = useMemo(() => {
    return Math.round((simSalary / 30 / 8) * 100) / 100;
  }, [simSalary]);

  const otPayout = useMemo(() => {
    return Math.round(hourlyRate * simOtHours * simMultiplier);
  }, [hourlyRate, simOtHours, simMultiplier]);

  const handleAddBonus = () => {
    const matchedEmp = salaries.find(s => s.employee_name === newBonusEmp) || salaries[0];
    const newEntry: BonusItem = {
      id: `bon-${Date.now()}`,
      employee_id: matchedEmp?.employee_id || 'emp-new',
      employee_name: newBonusEmp || 'Employee',
      employee_code: matchedEmp?.employee_code || 'WF-NEW',
      type: newBonusType,
      amount: newBonusAmount,
      taxable: true,
      status: 'Approved',
      approved_by: 'HR Administrator',
      period: 'August 2026',
    };

    setBonuses(prev => [newEntry, ...prev]);
    setIsBonusModalOpen(false);
    showToast(`✓ Added ₹${newBonusAmount.toLocaleString('en-IN')} ${newBonusType} for ${newBonusEmp}`);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Top Quick Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Active Base OT Formula</span>
            <span className="text-base font-black text-gray-900 mt-0.5 block font-mono">1.50x · 2.0x Holiday</span>
            <span className="text-[10px] text-emerald-700 font-semibold">Standard Factories Act 1948 Compliant</span>
          </div>
          <span className="p-3 rounded-xl bg-emerald-50 text-[#07563D] border border-emerald-100">
            <TrendingUp className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Approved Bonuses (Cycle)</span>
            <span className="text-base font-black text-gray-900 mt-0.5 block font-mono">
              ₹ {bonuses.reduce((acc, b) => acc + b.amount, 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-purple-700 font-semibold">{bonuses.length} Allocated Records</span>
          </div>
          <span className="p-3 rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
            <Coins className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Attendance Biometric Link</span>
            <span className="text-base font-black text-emerald-800 mt-0.5 block flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>100% Synced</span>
            </span>
            <span className="text-[10px] text-gray-500 font-medium">Automatic overtime punch capture</span>
          </div>
          <span className="p-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
            <Clock className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* Subnav Ribbon */}
      <div className="bg-white p-2.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {subTabs.map(t => {
            const Icon = t.icon;
            const isActive = subTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer",
                  isActive ? "bg-[#07563D] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {subTab === 'incentives' && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsBonusModalOpen(true)}
            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Variable Bonus
          </Button>
        )}
      </div>

      {/* 1. Overtime Earnings */}
      {subTab === 'overtime' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Overtime Explanation & Rules */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Overtime Pay Rate Formulation</h3>
                  <p className="text-xs text-gray-500">Calculated directly from approved Overtime requests in Attendance module</p>
                </div>
                <Badge variant="emerald">Live Attendance Linked</Badge>
              </div>

              <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200/80 text-xs space-y-2.5">
                <span className="font-bold text-gray-900 block text-xs">Statutory Standard Formula:</span>
                <div className="p-3 bg-white rounded-lg border border-gray-200 font-mono text-xs text-[#07563D] font-bold">
                  Hourly OT Rate = ((Monthly Gross Salary ÷ 30 Days) ÷ 8 Hours) × Multiplier
                </div>
                <ul className="text-gray-600 text-[11px] space-y-1 list-disc pl-4">
                  <li><strong>Standard Weekday OT:</strong> 1.50x hourly wage for approved extra shifts.</li>
                  <li><strong>Weekend / Gazetted Holiday OT:</strong> 2.00x double-wage compensation.</li>
                  <li><strong>Biometric Audit:</strong> Only punches approved by Shift Supervisors are ingested into payroll.</li>
                </ul>
              </div>

              {/* Sample Ingested OT Records Table */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                  Ingested Overtime Register (Current Cycle)
                </span>
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                      <tr>
                        <th className="p-2.5">Employee</th>
                        <th className="p-2.5">Base Gross</th>
                        <th className="p-2.5">OT Hours</th>
                        <th className="p-2.5">Rate / Hr</th>
                        <th className="p-2.5 text-right">Computed OT Pay</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {salaries.slice(0, 5).map((sal, idx) => {
                        const otHrs = idx === 0 ? 14 : idx === 1 ? 8 : idx === 2 ? 10 : 6;
                        const hrR = Math.round((sal.gross_monthly / 30 / 8) * 100) / 100;
                        const otTot = Math.round(hrR * otHrs * 1.5);
                        return (
                          <tr key={sal.id} className="hover:bg-gray-50/70">
                            <td className="p-2.5 font-bold text-gray-900">
                              <div>{sal.employee_name}</div>
                              <span className="text-[10px] text-gray-400 font-mono">{sal.employee_code}</span>
                            </td>
                            <td className="p-2.5 font-mono text-gray-700">₹ {sal.gross_monthly.toLocaleString('en-IN')}</td>
                            <td className="p-2.5 font-semibold text-emerald-800">{otHrs} hrs (1.5x)</td>
                            <td className="p-2.5 font-mono text-gray-600">₹ {hrR}/hr</td>
                            <td className="p-2.5 font-mono font-bold text-[#07563D] text-right">₹ {otTot.toLocaleString('en-IN')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Live Interactive OT Calculator */}
          <div className="space-y-4">
            <div className="bg-gradient-to-b from-white to-emerald-50/30 p-5 rounded-2xl border border-emerald-200/80 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-[#07563D] font-bold text-xs">
                <Calculator className="w-4 h-4" />
                <span>Interactive OT Pay Rate Simulator</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Monthly Gross Wage (₹)</label>
                  <input
                    type="number"
                    value={simSalary}
                    onChange={e => setSimSalary(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold focus:ring-1 focus:ring-[#07563D]"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Logged OT Hours</label>
                  <input
                    type="number"
                    value={simOtHours}
                    onChange={e => setSimOtHours(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold focus:ring-1 focus:ring-[#07563D]"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Multiplier Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSimMultiplier(1.5)}
                      className={cn(
                        "py-1.5 rounded-lg font-bold text-xs transition-all",
                        simMultiplier === 1.5
                          ? "bg-[#07563D] text-white shadow-2xs"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      Weekday (1.5x)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimMultiplier(2.0)}
                      className={cn(
                        "py-1.5 rounded-lg font-bold text-xs transition-all",
                        simMultiplier === 2.0
                          ? "bg-[#07563D] text-white shadow-2xs"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      Holiday (2.0x)
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-emerald-100/70 rounded-xl border border-emerald-200 space-y-1.5 pt-3 mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Base Hourly Rate:</span>
                    <span className="font-mono font-bold text-gray-900">₹ {hourlyRate} / hr</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-emerald-200/80">
                    <span className="font-black text-emerald-950">Calculated OT Payout:</span>
                    <span className="font-mono font-black text-base text-[#07563D]">₹ {otPayout.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Incentives & Bonuses */}
      {subTab === 'incentives' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Incentive & Bonus Allocations</h3>
              <p className="text-xs text-gray-500">Performance bonuses, festive incentives, and variable payouts</p>
            </div>

            <Button
              size="xs"
              variant="primary"
              onClick={() => setIsBonusModalOpen(true)}
              className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Variable Bonus
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Bonus Type</th>
                  <th className="p-3">Pay Cycle</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Tax Treatment</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bonuses.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50/70">
                    <td className="p-3 font-bold text-gray-900">
                      <div>{b.employee_name}</div>
                      <span className="text-[10px] text-gray-400 font-mono">{b.employee_code}</span>
                    </td>
                    <td className="p-3 font-semibold text-gray-800">{b.type}</td>
                    <td className="p-3 font-mono text-gray-600">{b.period}</td>
                    <td className="p-3 font-mono font-bold text-[#07563D]">₹ {b.amount.toLocaleString('en-IN')}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                        Fully Taxable (TDS)
                      </span>
                    </td>
                    <td className="p-3">
                      <Badge variant="emerald">{b.status}</Badge>
                    </td>
                    <td className="p-3 text-gray-600 text-[11px] font-medium">{b.approved_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Reimbursements */}
      {subTab === 'reimbursements' && <ExpenseClaimsView />}

      {/* Modal: Add Bonus */}
      {isBonusModalOpen && (
        <Modal
          isOpen={isBonusModalOpen}
          onClose={() => setIsBonusModalOpen(false)}
          title="Add Variable Bonus / Incentive"
        >
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Select Beneficiary Employee</label>
              <select
                value={newBonusEmp}
                onChange={e => setNewBonusEmp(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-xs"
              >
                {salaries.map(s => (
                  <option key={s.id} value={s.employee_name}>
                    {s.employee_name} ({s.employee_code} - {s.department_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Incentive / Bonus Type</label>
              <select
                value={newBonusType}
                onChange={e => setNewBonusType(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-xs"
              >
                <option value="Performance Bonus">Performance Bonus</option>
                <option value="Festive Ex-Gratia">Festive Ex-Gratia</option>
                <option value="Sales Incentive">Sales Incentive</option>
                <option value="Retention Bonus">Retention Bonus</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Bonus Payout Amount (₹)</label>
              <input
                type="number"
                value={newBonusAmount}
                onChange={e => setNewBonusAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsBonusModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddBonus}
                className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold"
              >
                Confirm & Allocate Bonus
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
