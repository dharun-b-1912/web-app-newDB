import React, { useState, useEffect } from 'react';
import { essApi } from '../../../services/essApi';
import { EssCourseItem } from '../../../types/ess';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { GraduationCap, Award, Play } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const EssLearningView: React.FC = () => {
  const { showToast } = useToast();
  const [courses, setCourses] = useState<EssCourseItem[]>([]);

  useEffect(() => {
    setCourses(essApi.getCourses());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#07563D]" />
            <span>My Learning, Courses & Digital Certificates</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Enrolled courses, mandatory POSH/InfoSec training, assessments, and downloadable digital certificates</p>
        </div>

        <Badge variant="emerald">LMS Self-Service Active</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courses.map(c => (
          <div key={c.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="emerald" size="sm">{c.category}</Badge>
                {c.is_mandatory && <Badge variant="amber" size="sm" className="ml-2">Mandatory</Badge>}
                <h3 className="text-base font-extrabold text-gray-900 mt-1">{c.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Due Date: {c.due_date}</p>
              </div>
              <Badge variant="emerald">{c.status}</Badge>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span>Progress: {c.progress_pct}%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-[#07563D] h-full" style={{ width: `${c.progress_pct}%` }}></div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <Button size="sm" leftIcon={<Play className="w-3.5 h-3.5" />} onClick={() => showToast(`Launching Course Player for ${c.title}...`)}>
                {c.progress_pct === 100 ? 'Review Modules' : 'Continue Learning'}
              </Button>
              {c.certificate_available && (
                <Badge variant="purple" size="sm">
                  <Award className="w-3.5 h-3.5 mr-1 inline" /> Digital PDF Certificate Ready
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
