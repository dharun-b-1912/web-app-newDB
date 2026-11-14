import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { CreditCard, Download, ShieldCheck } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { useTenant } from '../../../hooks/useTenant';

export const BillingView: React.FC = () => {
  const { showToast } = useToast();
  const { organization } = useTenant();
  const isDevBenchmarkOrg = organization?.id === '0c621892-e938-4707-9957-13534ea32c19';

  const invoices = isDevBenchmarkOrg
    ? [
        { no: 'INV-2026-001', date: '2026-01-01', amount: '₹14,50,000', status: 'Paid', period: 'Annual License FY 2026-27' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Enterprise Trial Banner for Client Organizations */}
      {!isDevBenchmarkOrg && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/40 border border-emerald-200/90 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 mb-1">
                Active Enterprise Evaluation
              </span>
              <h3 className="text-base font-black text-gray-900 tracking-tight">Full Enterprise 30-Day Evaluation License</h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Your organization is operating with full enterprise access during the onboarding evaluation period. No commercial invoice or payment is due at this time.
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0 font-mono">
            <span className="text-[11px] text-gray-500 block uppercase font-bold tracking-wider">Evaluation Renewal</span>
            <span className="text-sm font-black text-emerald-800">2026-12-14 (Trial Active)</span>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#07563D]" />
            <span>Billing Overview & Invoices Ledger</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">PCI-compliant payment provider integration, tax invoices, GST statements, and credit balances</p>
        </div>

        {invoices.length > 0 && (
          <Button size="sm" variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => showToast('Downloading All GST Tax Invoices (Zip)...')}>
            Download Invoices
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {invoices.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-gray-800">No Commercial Invoices</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Your organization is currently operating on an active 30-day enterprise evaluation. Invoices will be generated upon commercial license renewal.
            </p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
};
