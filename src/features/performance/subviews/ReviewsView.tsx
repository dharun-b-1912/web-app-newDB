import React, { useState } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Award, UserCheck, Users, MessageSquare, History } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

interface ReviewsViewProps {
  initialSubTab?: string;
}

export const ReviewsView: React.FC<ReviewsViewProps> = ({ initialSubTab }) => {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<string>(initialSubTab || 'self');

  const subTabs = [
    { id: 'self', label: 'Self Review Form', icon: Award },
    { id: 'manager', label: 'Manager Evaluation', icon: UserCheck },
    { id: 'peer', label: 'Peer Review', icon: Users },
    { id: '360', label: '360° Feedback Requests', icon: MessageSquare },
    { id: 'history', label: 'Review History', icon: History },
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
      </div>

      {/* Form Content */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base font-black text-gray-900">Q3 2026 Appraisal Form — Self Assessment</h3>
            <p className="text-xs text-gray-500">Evaluate key achievements, goal progress, and development priorities</p>
          </div>
          <Badge variant="emerald">Self Review Submitted</Badge>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-gray-700 block mb-1">Key Q3 Accomplishments & Milestones</label>
            <textarea
              rows={3}
              defaultValue="Completed microservices migration to Cloud Run with 99.99% uptime. Automated statutory Form 16 batch processing for 428 employees."
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50/50"
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Key Development Priorities & Skill Growth Needs</label>
            <textarea
              rows={2}
              defaultValue="GCP Advanced Cloud Architecture & Kubernetes Chaos Engineering."
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50/50"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={() => showToast('Saved draft self-review')}>
            Save Draft
          </Button>
          <Button size="sm" onClick={() => showToast('Submitted self-review for manager appraisal')}>
            Submit Self Review
          </Button>
        </div>
      </div>
    </div>
  );
};
