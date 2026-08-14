import React, { useState, useEffect } from 'react';
import { performanceApi } from '../../../services/performanceApi';
import { Goal } from '../../../types/performance';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Target, Users, Building2, BookOpen, GitFork, Plus, Search } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

interface GoalsViewProps {
  initialSubTab?: string;
}

export const GoalsView: React.FC<GoalsViewProps> = ({ initialSubTab }) => {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<string>(initialSubTab || 'my-goals');
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    setGoals(performanceApi.getGoals());
  }, []);

  const subTabs = [
    { id: 'my-goals', label: 'My Goals', icon: Target },
    { id: 'team-goals', label: 'Team Goals', icon: Users },
    { id: 'company-goals', label: 'Company Goals', icon: Building2 },
    { id: 'library', label: 'Goal Library', icon: BookOpen },
    { id: 'alignment', label: 'Goal Alignment Matrix', icon: GitFork },
  ];

  return (
    <div className="space-y-6">
      {/* Subnav Ribbon */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {subTabs.map(t => {
            const Icon = t.icon;
            const isActive = subTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                  isActive ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Create Goal modal opened')}>
          Create Goal
        </Button>
      </div>

      {/* Goal Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map(goal => (
          <div key={goal.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {goal.goal_type} • Weight: {goal.weight}%
                </span>
                <h3 className="text-base font-extrabold text-gray-900 mt-1">{goal.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{goal.description}</p>
              </div>
              <Badge variant={goal.status === 'OnTrack' || goal.status === 'Completed' ? 'emerald' : 'amber'}>
                {goal.status}
              </Badge>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-gray-800">
                <span>Progress ({goal.current_value} / {goal.target_value} {goal.unit})</span>
                <span className="font-mono text-[#07563D]">{goal.progress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#07563D]" style={{ width: `${goal.progress}%` }} />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-100 font-medium">
              <span>Owner: <strong>{goal.employee_name}</strong></span>
              <span>Due: <strong className="font-mono">{goal.due_date}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
