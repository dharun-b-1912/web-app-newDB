import React, { useState, useEffect } from 'react';
import { lmsApi } from '../../../services/lmsApi';
import { EmployeeSkillGap, LearningPath } from '../../../types/lms';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { GitFork, Zap, Plus, ArrowRight } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const SkillDevelopmentView: React.FC = () => {
  const { showToast } = useToast();
  const [gaps, setGaps] = useState<EmployeeSkillGap[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);

  useEffect(() => {
    setGaps(lmsApi.getSkillGaps());
    setPaths(lmsApi.getLearningPaths());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <GitFork className="w-5 h-5 text-[#07563D]" />
            <span>Skill Matrix, Skill Gap Engine & Structured Learning Paths</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Automated skill gap identification from Performance reviews with targeted course recommendations</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Create Learning Path modal opened')}>
          Create Learning Path
        </Button>
      </div>

      {/* Learning Paths */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Role-Based Enterprise Learning Paths ({paths.length})</h3>
        {paths.map(path => (
          <div key={path.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  Target Role: {path.target_role} • {path.total_duration_hours} Total Hours
                </span>
                <h4 className="text-base font-extrabold text-gray-900 mt-1">{path.path_title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{path.description}</p>
              </div>
              <Badge variant="emerald">{path.certification_issued}</Badge>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Sequential Course Sequence</span>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {path.ordered_course_names.map((crs, idx) => (
                  <React.Fragment key={idx}>
                    <span className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 font-bold text-gray-800">
                      {idx + 1}. {crs}
                    </span>
                    {idx < path.ordered_course_names.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
