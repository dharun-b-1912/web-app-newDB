import React from 'react';
import { adminApi } from '../../../services/adminApi';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Cpu, ShieldCheck } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const SubscriptionView: React.FC = () => {
  const { showToast } = useToast();
  const sub = adminApi.getSubscription();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#07563D]" />
            <span>Subscription Plan & Entitlements Control</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Enterprise plan license limits, feature entitlements, add-on modules, and renewal schedules</p>
        </div>

        <Button size="sm" onClick={() => showToast('Upgrade Subscription Plan modal opened')}>
          Upgrade Plan
        </Button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-gray-900">{sub.plan_name}</h3>
            <p className="text-xs text-gray-500">Billing Cycle: {sub.billing_cycle} • Renewal Date: {sub.renewal_date}</p>
          </div>
          <Badge variant="emerald">{sub.status}</Badge>
        </div>

        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 font-mono text-xs space-y-1">
          <div className="flex justify-between font-bold text-gray-800">
            <span>Employee Headcount Capacity</span>
            <span>{sub.active_employees} / {sub.employee_limit} License Seats Used</span>
          </div>
          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div className="bg-[#07563D] h-full" style={{ width: `${(sub.active_employees / sub.employee_limit) * 100}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};
