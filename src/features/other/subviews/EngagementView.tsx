import React, { useState, useEffect } from 'react';
import { otherModulesApi } from '../../../services/otherModulesApi';
import { SurveyRecord, RecognitionRecord } from '../../../types/otherModules';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { HeartHandshake, Award, Plus, Sparkles, Star } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const EngagementView: React.FC = () => {
  const { showToast } = useToast();
  const [surveys, setSurveys] = useState<SurveyRecord[]>([]);
  const [recognitions, setRecognitions] = useState<RecognitionRecord[]>([]);

  useEffect(() => {
    setSurveys(otherModulesApi.getSurveys());
    setRecognitions(otherModulesApi.getRecognitions());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-[#07563D]" />
            <span>Employee Engagement, eNPS Surveys & Recognition Hub</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Anonymous pulse surveys, eNPS scoring, peer shoutouts, and recognition awards</p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" leftIcon={<Award className="w-4 h-4" />} onClick={() => showToast('Give Recognition Shoutout modal opened')}>
            Give Recognition
          </Button>
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Create Pulse Survey modal opened')}>
            Create Pulse Survey
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Surveys */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Active Culture & Pulse Surveys</h3>
          {surveys.map(surv => (
            <div key={surv.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    {surv.is_anonymous ? '100% Anonymous' : 'Named Survey'}
                  </span>
                  <h4 className="text-base font-extrabold text-gray-900 mt-1">{surv.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{surv.description}</p>
                </div>
                <Badge variant="emerald">{surv.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-gray-50 border border-gray-100 text-center font-mono">
                <div>
                  <span className="text-gray-400 font-bold uppercase text-[10px] block font-sans">eNPS Score</span>
                  <span className="font-black text-[#07563D] text-base">{surv.enps_score}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold uppercase text-[10px] block font-sans">Participation</span>
                  <span className="font-bold text-gray-900">{surv.participation_rate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recognition Shoutouts Feed */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Peer & Manager Recognition Feed</h3>
          {recognitions.map(rec => (
            <div key={rec.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="emerald" size="sm">{rec.badge_name}</Badge>
                  <h4 className="text-sm font-extrabold text-gray-900 mt-1">{rec.employee_name}</h4>
                  <p className="text-[11px] text-gray-500">Awarded by {rec.given_by_name}</p>
                </div>
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 italic">
                "{rec.message}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
