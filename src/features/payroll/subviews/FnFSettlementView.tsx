import React, { useState, useEffect } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { FnFSettlement } from '../../../types/payroll';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { UserMinus, Calculator, CheckCircle2, FileText, Plus, AlertCircle } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const FnFSettlementView: React.FC = () => {
  const { showToast } = useToast();
  const [settlements, setSettlements] = useState<FnFSettlement[]>([]);

  useEffect(() => {
    setSettlements(payrollApi.getFnFSettlements());
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <UserMinus className="w-5 h-5 text-[#07563D]" />
            <span>Full & Final (F&F) Settlement Engine</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Automated final exit payout calculation: Earned salary, leave encashment, gratuity, notice period recoveries & IT/Asset clearance
          </p>
        </div>

        <Button size="sm" leftIcon={<Calculator className="w-4 h-4" />} onClick={() => showToast('Initiate Exit F&F Settlement Wizard')}>
          Calculate Exit Settlement
        </Button>
      </div>

      {/* Settlements Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-xs font-black text-gray-900 uppercase tracking-wider">Processed Exit Settlements</span>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">Employee & Exit Date</th>
              <th className="p-4 text-right">Earned Basic</th>
              <th className="p-4 text-right">Leave Encashment</th>
              <th className="p-4 text-right">Gratuity</th>
              <th className="p-4 text-right text-rose-700">Deductions / Recoveries</th>
              <th className="p-4 text-right text-emerald-800">Final Net Settlement</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-mono">
            {settlements.map(fnf => (
              <tr key={fnf.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-sans font-extrabold text-gray-900">
                  {fnf.employee_name}
                  <span className="block text-[11px] text-gray-400 font-normal">Exit Date: {fnf.last_working_day} • {fnf.department_name}</span>
                </td>
                <td className="p-4 text-right text-gray-800">₹ {fnf.earned_basic_salary.toLocaleString('en-IN')}</td>
                <td className="p-4 text-right text-gray-800">
                  ₹ {fnf.leave_encashment_amount.toLocaleString('en-IN')}
                  <span className="block text-[10px] text-gray-400 font-normal">({fnf.leave_encashment_days} Days)</span>
                </td>
                <td className="p-4 text-right text-gray-800">₹ {fnf.gratuity_amount.toLocaleString('en-IN')}</td>
                <td className="p-4 text-right text-rose-700 font-bold">- ₹ {fnf.total_deductions_recovery.toLocaleString('en-IN')}</td>
                <td className="p-4 text-right font-black text-[#07563D] text-sm">
                  ₹ {fnf.final_net_settlement_pay.toLocaleString('en-IN')}
                </td>
                <td className="p-4 text-center font-sans"><Badge variant="emerald">{fnf.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
