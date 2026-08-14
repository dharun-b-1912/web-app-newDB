import React from 'react';
import { Button } from '../../../components/ui/Button';
import { Settings, ShieldCheck, Award } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const LmsSettingsView: React.FC = () => {
  const { showToast } = useToast();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#07563D]" />
            <span>LMS System Configuration & Rules</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Configure assessment pass thresholds, certificate templates, and expiry reminder intervals</p>
        </div>

        <Button size="sm" onClick={() => showToast('LMS configuration saved')}>
          Save Configuration
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#07563D]" />
            <span>Assessment & Exam Rules</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Default Exam Pass Threshold (%)</label>
              <input type="text" defaultValue="80%" className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono" />
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1">Max Assessment Retake Attempts</label>
              <input type="text" defaultValue="3 Attempts" className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-[#07563D]" />
            <span>Certification Expiry Alerts</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Advance Expiry Notification Days</label>
              <input type="text" defaultValue="90, 60, 30, 7 Days" className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
