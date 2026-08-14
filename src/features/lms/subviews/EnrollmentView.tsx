import React, { useState, useEffect } from 'react';
import { lmsApi } from '../../../services/lmsApi';
import { Enrollment } from '../../../types/lms';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { UserCheck, Plus, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const EnrollmentView: React.FC = () => {
  const { showToast } = useToast();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  useEffect(() => {
    setEnrollments(lmsApi.getEnrollments());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#07563D]" />
            <span>Learner Enrollment & Approval Desk</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Self-enrollments, manager-assigned courses, and mandatory compliance allocations</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Assign Employee Enrollment modal opened')}>
          Enroll Employees
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">Employee</th>
              <th className="p-4">Course Name</th>
              <th className="p-4">Enrollment Source</th>
              <th className="p-4 font-mono">Enrolled Date</th>
              <th className="p-4 font-mono">Due Date</th>
              <th className="p-4 text-center">Progress %</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-mono">
            {enrollments.map(enr => (
              <tr key={enr.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-sans font-extrabold text-gray-900">
                  {enr.employee_name}
                  <span className="block text-[11px] text-gray-400 font-normal">{enr.department_name}</span>
                </td>
                <td className="p-4 font-sans font-bold text-gray-800">{enr.course_name}</td>
                <td className="p-4 font-sans"><Badge variant="emerald">{enr.source}</Badge></td>
                <td className="p-4 text-gray-600">{enr.enrollment_date}</td>
                <td className="p-4 text-gray-600">{enr.due_date}</td>
                <td className="p-4 text-center font-black text-[#07563D]">{enr.progress_percent}%</td>
                <td className="p-4 text-center font-sans"><Badge variant="emerald">{enr.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
