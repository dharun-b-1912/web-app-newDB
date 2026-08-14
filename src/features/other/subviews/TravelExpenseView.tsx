import React, { useState, useEffect } from 'react';
import { otherModulesApi } from '../../../services/otherModulesApi';
import { TravelRequest, ExpenseClaim } from '../../../types/otherModules';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Plane, Receipt, Calendar, Plus, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const TravelExpenseView: React.FC = () => {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<'requests' | 'expenses'>('requests');
  const [travels, setTravels] = useState<TravelRequest[]>([]);
  const [expenses, setExpenses] = useState<ExpenseClaim[]>([]);

  useEffect(() => {
    setTravels(otherModulesApi.getTravelRequests());
    setExpenses(otherModulesApi.getExpenseClaims());
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Plane className="w-5 h-5 text-[#07563D]" />
            <span>Travel & Business Expense Claims Engine</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Domestic/International travel approvals, advances, receipt validation, and payroll reimbursement</p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" leftIcon={<Receipt className="w-4 h-4" />} onClick={() => showToast('Submit Expense Claim modal opened')}>
            Submit Expense Claim
          </Button>
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Create Travel Request modal opened')}>
            Create Travel Request
          </Button>
        </div>
      </div>

      {/* Subtabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setSubTab('requests')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            subTab === 'requests' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Travel Requests ({travels.length})
        </button>
        <button
          onClick={() => setSubTab('expenses')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            subTab === 'expenses' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Expense Claims ({expenses.length})
        </button>
      </div>

      {/* Requests Table */}
      {subTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="p-4">Employee</th>
                <th className="p-4 font-mono">Code & Type</th>
                <th className="p-4">Origin & Destination</th>
                <th className="p-4 font-mono">Dates</th>
                <th className="p-4 text-right">Est. Cost</th>
                <th className="p-4 text-right">Advance Requested</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-mono">
              {travels.map(trv => (
                <tr key={trv.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4 font-sans font-extrabold text-gray-900">
                    {trv.employee_name}
                    <span className="block text-[11px] text-gray-400 font-normal">{trv.department_name}</span>
                  </td>
                  <td className="p-4 text-gray-700">
                    <span className="font-bold block">{trv.request_code}</span>
                    <Badge variant="emerald">{trv.travel_type}</Badge>
                  </td>
                  <td className="p-4 font-sans font-bold text-gray-800">{trv.origin} &rarr; {trv.destination}</td>
                  <td className="p-4 text-gray-600">{trv.departure_date} to {trv.return_date}</td>
                  <td className="p-4 text-right font-black text-gray-900">₹ {trv.estimated_cost.toLocaleString('en-IN')}</td>
                  <td className="p-4 text-right text-emerald-800">₹ {trv.advance_requested.toLocaleString('en-IN')}</td>
                  <td className="p-4 text-center font-sans"><Badge variant="emerald">{trv.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Expenses Table */}
      {subTab === 'expenses' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="p-4">Claim Code</th>
                <th className="p-4">Employee</th>
                <th className="p-4 font-mono">Category</th>
                <th className="p-4 font-mono">Date</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-center">Receipt</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-mono">
              {expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4 font-bold text-gray-900">{exp.claim_code}</td>
                  <td className="p-4 font-sans font-extrabold text-gray-900">{exp.employee_name}</td>
                  <td className="p-4 text-gray-700 font-bold">{exp.category}</td>
                  <td className="p-4 text-gray-600">{exp.expense_date}</td>
                  <td className="p-4 text-right font-black text-[#07563D]">₹ {exp.total_amount.toLocaleString('en-IN')}</td>
                  <td className="p-4 text-center font-sans">{exp.receipt_attached ? <Badge variant="emerald">Attached</Badge> : <Badge variant="amber">Missing</Badge>}</td>
                  <td className="p-4 text-center font-sans"><Badge variant="emerald">{exp.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
