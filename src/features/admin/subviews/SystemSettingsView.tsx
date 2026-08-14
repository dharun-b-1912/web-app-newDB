import React, { useState, useEffect } from 'react';
import { adminApi } from '../../../services/adminApi';
import { SystemSettingsConfig } from '../../../types/admin';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Settings, Globe, ShieldCheck } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const SystemSettingsView: React.FC = () => {
  const { showToast } = useToast();
  const [config, setConfig] = useState<SystemSettingsConfig | null>(null);

  useEffect(() => {
    setConfig(adminApi.getSystemSettings());
  }, []);

  if (!config) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#07563D]" />
            <span>Organization & Global System Preferences</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Organization legal entity, IST timezone rules, Indian Financial Year schedules, and document retention policies</p>
        </div>

        <Button size="sm" onClick={() => showToast('System settings saved successfully')}>
          Save Configuration
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#07563D]" />
            <span>Organization Localization & Timezone</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Organization Legal Name</label>
              <input type="text" defaultValue={config.organization_name} className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono" />
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1">Primary Operational Timezone</label>
              <input type="text" defaultValue={config.timezone} className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#07563D]" />
            <span>Financial Year & Currency Rules</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Financial Year Schedule</label>
              <input type="text" defaultValue={config.financial_year_start} className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono" />
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1">Base Currency</label>
              <input type="text" defaultValue={config.currency} className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
