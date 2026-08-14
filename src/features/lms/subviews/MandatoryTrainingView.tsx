import React, { useState, useEffect } from 'react';
import { lmsApi } from '../../../services/lmsApi';
import { MandatoryTrainingAssignment } from '../../../types/lms';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ShieldCheck, Plus, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const MandatoryTrainingView: React.FC = () => {
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState<MandatoryTrainingAssignment[]>([]);

  useEffect(() => {
    setAssignments(lmsApi.getMandatoryAssignments());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#07563D]" />
            <span>Mandatory & Compliance Training Desk</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Automated policy allocations (POSH, InfoSec, GDPR) and compliance audit tracking</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Assign Mandatory Policy modal opened')}>
          Assign Mandatory Policy
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {assignments.map(man => (
          <div key={man.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  Target: {man.target_group}
                </span>
                <h3 className="text-base font-extrabold text-gray-900 mt-1">{man.course_name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Due Date: {man.due_date}</p>
              </div>
              <Badge variant="emerald">{man.status}</Badge>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-gray-800">
                <span>Compliance Rate ({man.completed_count} / {man.total_assigned} Completed)</span>
                <span className="font-mono text-[#07563D]">{man.compliance_percent}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#07563D]" style={{ width: `${man.compliance_percent}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
