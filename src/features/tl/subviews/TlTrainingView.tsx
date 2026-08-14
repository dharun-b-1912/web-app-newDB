import React, { useState, useEffect } from 'react';
import { tlApi } from '../../../services/tlApi';
import { TlTrainingItem } from '../../../types/tl';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { GraduationCap, Plus, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const TlTrainingView: React.FC = () => {
  const { showToast } = useToast();
  const [trainings, setTrainings] = useState<TlTrainingItem[]>([]);

  useEffect(() => {
    setTrainings(tlApi.getTeamTraining());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#07563D]" />
            <span>Team LMS Training & Skill Gap Recommendations</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Assign mandatory & skill training to team members, track progress, monitor expiring certifications</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Assign Course to Team Member modal opened')}>
          Assign Training
        </Button>
      </div>

      <div className="space-y-4">
        {trainings.map(t => (
          <div key={t.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-gray-700 block font-sans">Team Member: {t.employee_name}</span>
                <h4 className="text-base font-extrabold text-gray-900 mt-1">{t.course_title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">Category: {t.category} • Due: {t.due_date}</p>
              </div>
              <Badge variant="emerald">{t.status}</Badge>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span>Progress: {t.progress_pct}%</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#07563D] h-full" style={{ width: `${t.progress_pct}%` }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
