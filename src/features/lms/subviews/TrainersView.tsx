import React, { useState, useEffect } from 'react';
import { lmsApi } from '../../../services/lmsApi';
import { Trainer } from '../../../types/lms';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Users, Star, Plus } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const TrainersView: React.FC = () => {
  const { showToast } = useToast();
  const [trainers, setTrainers] = useState<Trainer[]>([]);

  useEffect(() => {
    setTrainers(lmsApi.getTrainers());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#07563D]" />
            <span>Trainer Profiles & Vendor Management</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Internal subject experts, external academy vendors, and rating audits</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Add Trainer modal opened')}>
          Add Trainer / Vendor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {trainers.map(trn => (
          <div key={trn.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  Type: {trn.trainer_type}
                </span>
                <h3 className="text-base font-extrabold text-gray-900 mt-1">{trn.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{trn.specialization}</p>
              </div>
              <Badge variant="emerald">{trn.status}</Badge>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs font-mono">
              <span className="text-gray-500 font-sans">Learner Feedback Rating:</span>
              <span className="font-black text-amber-600 flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                {trn.rating} / 5.0 ({trn.total_sessions} Sessions)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
