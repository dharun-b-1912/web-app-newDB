import React, { useState, useEffect } from 'react';
import { lmsApi } from '../../../services/lmsApi';
import { TrainingProgram } from '../../../types/lms';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { GraduationCap, Calendar, Plus, Users } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const TrainingProgramsView: React.FC = () => {
  const { showToast } = useToast();
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);

  useEffect(() => {
    setPrograms(lmsApi.getPrograms());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#07563D]" />
            <span>Enterprise Training Programs & Track Sessions</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Multi-course cohort programs for onboarding, leadership, and reskilling</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Create Training Program modal opened')}>
          Create Training Program
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {programs.map(prog => (
          <div key={prog.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {prog.code} • {prog.program_type}
                </span>
                <h3 className="text-base font-extrabold text-gray-900 mt-1">{prog.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{prog.description}</p>
              </div>
              <Badge variant="emerald">{prog.status}</Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs p-3 rounded-xl bg-gray-50 border border-gray-100 text-center font-mono">
              <div>
                <span className="text-gray-400 font-bold uppercase text-[10px] block font-sans">Duration</span>
                <span className="font-bold text-gray-900">{prog.duration_days} Days</span>
              </div>
              <div>
                <span className="text-gray-400 font-bold uppercase text-[10px] block font-sans">Total Hours</span>
                <span className="font-bold text-gray-900">{prog.total_training_hours} Hrs</span>
              </div>
              <div>
                <span className="text-gray-400 font-bold uppercase text-[10px] block font-sans">Capacity</span>
                <span className="font-bold text-gray-900">{prog.capacity} Cohorts</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Scheduled Live Sessions ({prog.sessions.length})</span>
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden text-xs">
                {prog.sessions.map(sess => (
                  <div key={sess.id} className="p-3 bg-gray-50/50 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-gray-900 block">{sess.title}</span>
                      <span className="text-[11px] text-gray-500 font-mono">{sess.date} ({sess.start_time} - {sess.end_time}) • {sess.location}</span>
                    </div>
                    <Badge variant="emerald">{sess.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
