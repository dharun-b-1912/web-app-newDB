import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../../../services/analyticsApi';
import { MetricCatalogItem } from '../../../types/analytics';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Settings, ShieldCheck, Lock, BookOpen } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const AnalyticsSettingsView: React.FC = () => {
  const { showToast } = useToast();
  const [catalog, setCatalog] = useState<MetricCatalogItem[]>([]);

  useEffect(() => {
    setCatalog(analyticsApi.getMetricCatalog());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#07563D]" />
            <span>Analytics Governance, Metric Catalog & Privacy Settings</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Configurable financial year rules, reporting currencies, privacy thresholds (e.g. min group size = 5) and metric catalog versions</p>
        </div>

        <Button size="sm" onClick={() => showToast('Analytics configuration saved')}>
          Save Configuration
        </Button>
      </div>

      {/* Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#07563D]" />
            <span>Financial Year & Reporting Currency</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Organization Financial Year Schedule</label>
              <input type="text" defaultValue="April 1 to March 31 (Indian FY 2026-27)" className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono" />
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1">Default Reporting Base Currency</label>
              <input type="text" defaultValue="INR (₹ - Indian Rupee)" className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#07563D]" />
            <span>Privacy & Small-Group Reporting Thresholds</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Minimum Reporting Group Size Threshold</label>
              <input type="text" defaultValue="5 Employees (Prevents Individual Identification)" className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono" />
            </div>
          </div>
        </div>
      </div>

      {/* Metric Catalog */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#07563D]" />
          <span>Metric Catalog & Formula Definitions</span>
        </h3>
        <div className="space-y-3 text-xs font-mono">
          {catalog.map(m => (
            <div key={m.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-sans font-bold text-gray-900">{m.name} ({m.metric_code})</span>
                <Badge variant="emerald">{m.version}</Badge>
              </div>
              <p className="font-sans text-gray-500">{m.description}</p>
              <p className="text-[#07563D] font-bold">Formula: {m.formula}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
