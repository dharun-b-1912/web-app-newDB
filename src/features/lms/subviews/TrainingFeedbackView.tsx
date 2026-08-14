import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { MessageSquare, Star, Plus } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const TrainingFeedbackView: React.FC = () => {
  const { showToast } = useToast();

  const feedbackList = [
    { id: 'fb-1', course: 'POSH Policy 2026', employee: 'Ananya Sen', trainerRating: 5.0, contentRating: 4.8, relevanceRating: 5.0, comment: 'Extremely well structured with clear real-world scenario examples.', date: '2026-08-05' },
    { id: 'fb-2', course: 'Microservices Architecture', employee: 'Vikramaditya Rao', trainerRating: 4.9, contentRating: 5.0, relevanceRating: 4.8, comment: 'Hands-on Cloud Run labs were fantastic for DevOps teams.', date: '2026-08-10' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#07563D]" />
            <span>Training Feedback & Learner Satisfaction Audit</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Course utility, trainer effectiveness ratings, and training ROI metrics</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Submit Course Feedback modal opened')}>
          Submit Course Feedback
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {feedbackList.map(fb => (
          <div key={fb.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">{fb.course}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Learner: {fb.employee} • Date: {fb.date}</p>
              </div>
              <div className="flex items-center gap-1 font-mono font-black text-amber-600">
                <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                {fb.trainerRating} / 5.0
              </div>
            </div>

            <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 italic">
              "{fb.comment}"
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
