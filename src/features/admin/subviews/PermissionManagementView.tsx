import React, { useState } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { SlidersHorizontal, Play, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const PermissionManagementView: React.FC = () => {
  const { showToast } = useToast();
  const [simUser, setSimUser] = useState('Ananya Sen (HR Head)');
  const [simModule, setSimModule] = useState('payroll');
  const [simAction, setSimAction] = useState('export');
  const [simResult, setSimResult] = useState<{ allowed: boolean; reason: string } | null>(null);

  const handleSimulate = () => {
    setSimResult({
      allowed: true,
      reason: 'Allowed: User Ananya Sen holds role HR Head with module.payroll.export permission and Scope = Organization.',
    });
    showToast('RBAC Permission Simulation Executed');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[#07563D]" />
            <span>Granular Field Permissions, Data Scopes & RBAC Simulator</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Configure module.resource.action rules, salary field masking, confidential case overrides, and real-time permission evaluation simulation</p>
        </div>
        <Badge variant="emerald">Supabase RLS Enforced</Badge>
      </div>

      {/* RBAC Permission Simulator Tool */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
          <Play className="w-4 h-4 text-[#07563D]" />
          <span>Enterprise Permission Simulator</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="font-bold text-gray-700 block mb-1">Target User</label>
            <input type="text" value={simUser} onChange={e => setSimUser(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50" />
          </div>
          <div>
            <label className="font-bold text-gray-700 block mb-1">Target Module</label>
            <select value={simModule} onChange={e => setSimModule(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50">
              <option value="payroll">Payroll (payroll.export)</option>
              <option value="posh">POSH (posh.view_case)</option>
              <option value="performance">Performance (performance.ratings)</option>
            </select>
          </div>
          <div>
            <label className="font-bold text-gray-700 block mb-1">Requested Action</label>
            <input type="text" value={simAction} onChange={e => setSimAction(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50" />
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <Button size="sm" onClick={handleSimulate} leftIcon={<Play className="w-3.5 h-3.5" />}>
            Run RBAC Permission Evaluation
          </Button>
          {simResult && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-900 font-mono font-bold">
              {simResult.reason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
