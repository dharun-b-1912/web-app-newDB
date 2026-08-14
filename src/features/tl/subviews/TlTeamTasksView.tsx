import React, { useState, useEffect } from 'react';
import { tlApi } from '../../../services/tlApi';
import { TlTaskItem } from '../../../types/tl';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Plus, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const TlTeamTasksView: React.FC = () => {
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<TlTaskItem[]>([]);

  useEffect(() => {
    setTasks(tlApi.getTeamTasks());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#07563D]" />
            <span>Team Task Management & Workload Dispatch</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Create & assign tasks to authorized team members, track progress, manage overdue tasks and verify completion</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Create Team Task modal opened')}>
          Assign New Task
        </Button>
      </div>

      <div className="space-y-4">
        {tasks.map(t => (
          <div key={t.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {t.task_code}
                </span>
                <Badge variant={t.priority === 'Critical' || t.priority === 'High' ? 'rose' : 'emerald'} size="sm" className="ml-2">
                  {t.priority} Priority
                </Badge>
                <h4 className="text-base font-extrabold text-gray-900 mt-1">{t.title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">Assigned to: {t.assigned_to_name} • Due Date: {t.due_date}</p>
              </div>
              <Badge variant={t.is_overdue ? 'rose' : 'emerald'}>
                {t.is_overdue ? 'Overdue' : t.status}
              </Badge>
            </div>

            <p className="text-xs text-gray-700 font-sans">{t.description}</p>

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
