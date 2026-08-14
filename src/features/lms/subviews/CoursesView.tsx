import React, { useState, useEffect } from 'react';
import { lmsApi } from '../../../services/lmsApi';
import { Course } from '../../../types/lms';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { BookOpen, Play, CheckCircle2, Clock, Plus, Award } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

interface CoursesViewProps {
  initialSubTab?: string;
}

export const CoursesView: React.FC<CoursesViewProps> = ({ initialSubTab }) => {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<string>(initialSubTab || 'library');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  useEffect(() => {
    const list = lmsApi.getCourses();
    setCourses(list);
    if (list.length > 0) setSelectedCourse(list[0]);
  }, []);

  const subTabs = [
    { id: 'library', label: 'Course Library', icon: BookOpen },
    { id: 'my-courses', label: 'My Learning Enrolments', icon: Play },
    { id: 'categories', label: 'Course Categories', icon: BookOpen },
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

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Create Course builder opened')}>
          Create Course
        </Button>
      </div>

      {/* Grid of Courses */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {courses.map(crs => (
          <div
            key={crs.id}
            onClick={() => setSelectedCourse(crs)}
            className={`p-6 rounded-2xl border cursor-pointer transition-all space-y-4 ${
              selectedCourse?.id === crs.id ? 'border-[#07563D] bg-white ring-2 ring-[#07563D]/10 shadow-md' : 'border-gray-200/80 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {crs.code} • {crs.category}
                </span>
                <h3 className="text-base font-extrabold text-gray-900 mt-1">{crs.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{crs.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <Badge variant="emerald">{crs.difficulty_level}</Badge>
              <span className="text-gray-500">{crs.duration_hours} Hours</span>
              {crs.is_mandatory && <Badge variant="amber">Mandatory</Badge>}
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-100 font-medium">
              <span>Trainer: <strong>{crs.trainer_name}</strong></span>
              <Button size="sm" variant="outline" leftIcon={<Play className="w-3.5 h-3.5" />} onClick={() => showToast(`Launching lesson player for ${crs.name}`)}>
                Launch Course
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
