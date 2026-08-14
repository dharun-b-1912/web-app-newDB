import React, { useState, useEffect } from 'react';
import { performanceApi } from '../../../services/performanceApi';
import { KRA } from '../../../types/performance';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Layers, Plus } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const KraView: React.FC = () => {
  const { showToast } = useToast();
  const [kras, setKras] = useState<KRA[]>([]);

  useEffect(() => {
    setKras(performanceApi.getKRAs());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#07563D]" />
            <span>Key Result Areas (KRA) Framework</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Define core role responsibilities and link to measurable KPIs</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Define KRA modal opened')}>
          Add KRA
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {kras.map(kra => (
          <div key={kra.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {kra.code} • Weight: {kra.weight}%
                </span>
                <h3 className="text-base font-extrabold text-gray-900 mt-1">{kra.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{kra.description}</p>
              </div>
              <Badge variant="emerald">{kra.department_name}</Badge>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
              <span className="font-bold text-gray-400 uppercase text-[10px] block">Mapped Key Metrics</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {kra.mapped_kpi_names.map((kpi, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700 font-semibold">
                    {kpi}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
