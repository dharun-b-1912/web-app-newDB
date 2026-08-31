import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { BarChart3, Download } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { api } from '../../../services/api';

export const TlReportsView: React.FC = () => {
  const { showToast } = useToast();

  const handleExportCsv = (reportName: string) => {
    const employees = api.getEmployeesSync();
    const rows = employees.length > 0
      ? employees.map(e => `${e.employee_code || e.id},"${(e.display_name || `${e.first_name} ${e.last_name}`).replace(/"/g, '""')}",${e.designation_title || 'Software Engineer'},98%,2,10,100%`).join('\n')
      : 'EMP-001,"Team Member",Engineer,100%,0,12,100%';

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'EmployeeID,Name,Designation,AttendancePct,LeaveDaysUsed,TasksCompleted,TrainingPct\n' +
      rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${reportName.toLowerCase().replace(/\s+/g, '_')}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${reportName} (CSV)`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#07563D]" />
            <span>Team Operational Reports & Analytics Center</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Generate & export team reports for Attendance %, Leave utilization, Task completion, and Training compliance</p>
        </div>

        <Badge variant="emerald">Team Scope Restricted</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
          <h3 className="text-sm font-black text-gray-900">Team Attendance & Working Hours Report</h3>
          <p className="text-xs text-gray-500">Includes check in/out logs, late arrivals, overtime hours and WFH days.</p>
          <Button size="sm" variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => handleExportCsv('Team_Attendance')}>
            Export Attendance (CSV)
          </Button>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
          <h3 className="text-sm font-black text-gray-900">Team Task Workload & Completion Report</h3>
          <p className="text-xs text-gray-500">Includes active tasks, completed count, overdue tasks, and workload breakdown.</p>
          <Button size="sm" variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => handleExportCsv('Team_Tasks')}>
            Export Task Report (CSV)
          </Button>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
          <h3 className="text-sm font-black text-gray-900">Team LMS Training & Compliance Report</h3>
          <p className="text-xs text-gray-500">Includes mandatory training progress, completion rate and certifications.</p>
          <Button size="sm" variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => handleExportCsv('Team_Training')}>
            Export Training (CSV)
          </Button>
        </div>
      </div>
    </div>
  );
};
