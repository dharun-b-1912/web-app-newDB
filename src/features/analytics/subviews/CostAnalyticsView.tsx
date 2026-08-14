import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { CircleDollarSign, PieChart } from 'lucide-react';

export const CostAnalyticsView: React.FC = () => {
  const costBreakdown = [
    { category: '1. Gross Employee Payroll Base', amount: '₹5,70,00,000', pct: '88.5%', source: 'Payroll Engine' },
    { category: '2. Employer Statutory PF & ESIC Remittance', amount: '₹48,20,000', pct: '7.5%', source: 'Statutory Module' },
    { category: '3. Overtime Pay Disbursement', amount: '₹4,25,000', pct: '0.7%', source: 'Attendance Overtime' },
    { category: '4. Business Travel & Expense Claims', amount: '₹3,17,000', pct: '0.5%', source: 'Travel & Expense' },
    { category: '5. Training & External Vendor Academy', amount: '₹14,50,000', pct: '2.3%', source: 'LMS Engine' },
    { category: '6. Recruitment Agency & Job Board Costs', amount: '₹3,80,000', pct: '0.5%', source: 'Recruitment Module' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CircleDollarSign className="w-5 h-5 text-[#07563D]" />
            <span>Total Known Workforce Cost Ledger</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Comprehensive audit of Payroll, Statutory PF/ESIC, Overtime, Travel, Training, and Recruitment costs</p>
        </div>
        <Badge variant="emerald">Total Monthly: ₹6,43,92,000</Badge>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">Cost Category</th>
              <th className="p-4 font-mono text-right">Monthly Amount</th>
              <th className="p-4 font-mono text-right">% Share</th>
              <th className="p-4">Source Module</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-mono">
            {costBreakdown.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-sans font-extrabold text-gray-900">{row.category}</td>
                <td className="p-4 text-right font-black text-[#07563D]">{row.amount}</td>
                <td className="p-4 text-right font-bold text-gray-700">{row.pct}</td>
                <td className="p-4 font-sans"><Badge variant="emerald">{row.source}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
