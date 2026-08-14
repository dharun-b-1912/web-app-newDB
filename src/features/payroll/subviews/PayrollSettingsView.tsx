import React from 'react';
import { Button } from '../../../components/ui/Button';
import { Settings, ShieldCheck, Building2, CreditCard } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const PayrollSettingsView: React.FC = () => {
  const { showToast } = useToast();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#07563D]" />
            <span>Payroll Engine System Settings</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure pay cycles, corporate bank disbursement accounts, statutory tax thresholds, and payslip templates
          </p>
        </div>

        <Button size="sm" onClick={() => showToast('Payroll settings saved')}>
          Save Configuration
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#07563D]" />
            <span>Corporate Bank Account Settings</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Corporate Disbursement Bank</label>
              <input type="text" defaultValue="HDFC Bank Ltd - Corporate CMS Branch" className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50" />
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1">Corporate Account Number</label>
              <input type="text" defaultValue="50100091827182" className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono" />
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1">IFSC Code</label>
              <input type="text" defaultValue="HDFC0001242" className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#07563D]" />
            <span>Pay Period & Cutoff Cycle</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Pay Cycle Frequency</label>
              <select className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-bold">
                <option>Monthly (Last Working Day)</option>
                <option>Bi-Weekly</option>
                <option>Semi-Monthly (15th & Last Day)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1">Attendance Cutoff Date</label>
              <input type="text" defaultValue="25th of every month" className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
