import React, { useState, useEffect } from 'react';
import { lmsApi } from '../../../services/lmsApi';
import { Course, Enrollment, EmployeeCertification } from '../../../types/lms';
import { Badge } from '../../../components/ui/Badge';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  AlertTriangle,
  Users,
  ChevronRight,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface LmsDashboardViewProps {
  onNavigateTab?: (tabKey: string) => void;
}

export const LmsDashboardView: React.FC<LmsDashboardViewProps> = ({ onNavigateTab }) => {
  const [roleScope, setRoleScope] = useState<'HRHead' | 'Manager' | 'Employee'>('HRHead');
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certs, setCerts] = useState<EmployeeCertification[]>([]);

  useEffect(() => {
    setCourses(lmsApi.getCourses());
    setEnrollments(lmsApi.getEnrollments());
    setCerts(lmsApi.getEmployeeCertifications());
  }, []);

  const totalCourses = courses.length + 25;
  const activePrograms = 8;
  const totalEnrollments = enrollments.length + 1840;
  const completionRate = '92.4%';
  const mandatoryCompliance = '97.2%';
  const expiringCerts = certs.filter(c => c.status === 'ExpiringSoon').length + 12;

  const kpis = [
    { key: 'courses', label: 'Active LMS Courses', value: totalCourses, sub: 'POSH, Security & Technical', icon: BookOpen, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { key: 'programs', label: 'Active Programs', value: activePrograms, sub: 'Onboarding & Leadership', icon: GraduationCap, color: 'text-[#07563D]', bg: 'bg-emerald-50/70' },
    { key: 'enrollment', label: 'Total Enrollments', value: totalEnrollments, sub: 'Active Learner Accounts', icon: Users, color: 'text-blue-700', bg: 'bg-blue-50' },
    { key: 'mandatory', label: 'Mandatory Compliance', value: mandatoryCompliance, sub: 'POSH & InfoSec Audit', icon: CheckCircle2, color: 'text-purple-700', bg: 'bg-purple-50' },
    { key: 'certifications', label: 'Expiring Certifications', value: expiringCerts, sub: 'Action Required (30 Days)', icon: AlertTriangle, color: 'text-amber-700', bg: 'bg-amber-50' },
    { key: 'skill-development', label: 'Overall Completion Rate', value: completionRate, sub: 'Avg Assessment Score: 94%', icon: Award, color: 'text-rose-700', bg: 'bg-rose-50' },
  ];

  const courseCompletionData = [
    { name: 'POSH 2026', completed: 416, enrolled: 428 },
    { name: 'InfoSec Masterclass', completed: 410, enrolled: 428 },
    { name: 'GCP Microservices', completed: 45, enrolled: 50 },
    { name: 'Leadership & Management', completed: 16, enrolled: 16 },
    { name: 'Financial Compliance', completed: 88, enrolled: 92 },
  ];

  return (
    <div className="space-y-6">
      {/* Role Switcher Header */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#07563D]" />
          <div>
            <h2 className="text-sm font-black text-gray-900">Learning & LMS Intelligence Dashboard</h2>
            <p className="text-[11px] text-gray-500">Perspective switches automatically based on user RBAC authorization</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          {(['HRHead', 'Manager', 'Employee'] as const).map(role => (
            <button
              key={role}
              onClick={() => setRoleScope(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                roleScope === role ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {role === 'HRHead' ? 'HR Head View' : role === 'Manager' ? 'Manager View' : 'Employee Self View'}
            </button>
          ))}
        </div>
      </div>

      {/* Top KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigateTab?.(kpi.key)}
              className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className={`p-2 rounded-xl ${kpi.bg} ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-600 transition-colors" />
              </div>
              <div className="mt-3">
                <span className="text-[11px] font-bold text-gray-500 block truncate">{kpi.label}</span>
                <span className="text-base font-black text-gray-900 font-mono tracking-tight block mt-0.5">{kpi.value}</span>
                <span className="text-[10px] text-gray-400 font-medium truncate block mt-0.5">{kpi.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Chart */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#07563D]" />
              <span>Mandatory & Technical Course Completion Analytics</span>
            </h3>
            <p className="text-[11px] text-gray-500">Comparison of total enrolled vs completed learners across key modules</p>
          </div>
          <Badge variant="emerald">Audit Compliant (Q3 2026)</Badge>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={courseCompletionData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
              <Bar dataKey="enrolled" name="Total Enrolled" fill="#CBD5E1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="#07563D" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
