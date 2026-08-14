import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { CreditCard, Download } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const BillingView: React.FC = () => {
  const { showToast } = useToast();

  const invoices = [
    { no: 'INV-2026-001', date: '2026-01-01', amount: '₹14,50,000', status: 'Paid', period: 'Annual License FY 2026-27' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#07563D]" />
            <span>Billing Overview & Invoices Ledger</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">PCI-compliant payment provider integration, tax invoices, GST statements, and credit balances</p>
        </div>

        <Button size="sm" variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => showToast('Downloading All GST Tax Invoices (Zip)...')}>
          Download Invoices
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-mono">Invoice No</th>
              <th className="p-4">Billing Period</th>
              <th className="p-4 font-mono">Date</th>
              <th className="p-4 font-mono text-right">Amount</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-mono">
            {invoices.map(inv => (
              <tr key={inv.no} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-bold text-gray-900">{inv.no}</td>
                <td className="p-4 font-sans font-extrabold text-gray-900">{inv.period}</td>
                <td className="p-4 text-gray-600">{inv.date}</td>
                <td className="p-4 text-right font-black text-[#07563D]">{inv.amount}</td>
                <td className="p-4 text-center font-sans"><Badge variant="emerald">{inv.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
