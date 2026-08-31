import React, { useState } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { FileSpreadsheet, Download } from 'lucide-react';
import { api } from '../../../services/api';

export const LmsReportsView: React.FC = () => {
  const [selectedReportId, setSelectedReportId] = useState<string>('lms-rep-01');

  const reportList = [
    { id: 'lms-rep-01', name: '1. Mandatory Training Compliance Register', desc: 'Enterprise-wide completion rates for POSH, InfoSec, and Safety compliance' },
    { id: 'lms-rep-02', name: '2. Course Enrollment & Completion Statement', desc: 'Department-wise catalog enrollments, active in-progress learners, and dropouts' },
    { id: 'lms-rep-03', name: '3. Skill Gap & Competency Assessment Audit', desc: 'Pre and post-training competency score deltas by job role grade' },
    { id: 'lms-rep-04', name: '4. Professional Certification Pipeline', desc: 'Cloud, project management, and domain certification tracking with expiry alerts' },
    { id: 'lms-rep-05', name: '5. Assessment Score & Pass Rate Ledger', desc: 'Detailed score logs, pass percentages, and retake counts per exam' },
    { id: 'lms-rep-06', name: '6. Training Attendance & Session Log', desc: 'Live training session participant attendance and duration logs' },
    { id: 'lms-rep-07', name: '7. Trainer Effectiveness & Feedback Report', desc: 'Learner feedback scores for internal and external vendor trainers' },
    { id: 'lms-rep-08', name: '8. Department Training Cost & Budget Ledger', desc: 'Training program costs, vendor invoices, and department budget utilization' },
    { id: 'lms-rep-09', name: '9. Employee Learning History Register', desc: 'Comprehensive historical transcript of all completed learning modules' },
    { id: 'lms-rep-10', name: '10. New Hire Onboarding Training Audit', desc: 'Completion rates for 5-day orientation and initial policy training' },
    { id: 'lms-rep-11', name: '11. Training Exemption & Waiver Audit', desc: 'Approved mandatory training exemptions with HR authorization timestamps' },
    { id: 'lms-rep-12', name: '12. Question Bank & Assessment Metrics', desc: 'Item difficulty analysis and question pass rates' },
    { id: 'lms-rep-13', name: '13. Training ROI & Effectiveness Index', desc: 'Correlation of post-training completion with performance rating improvements' },
    { id: 'lms-rep-14', name: '14. Vendor Contract & External Provider Statement', desc: 'Active training vendor contracts, deliverables, and session counts' },
    { id: 'lms-rep-15', name: '15. Retake & Exam Re-attempt Audit', desc: 'Logs of assessment retakes and scoring progressions' },
    { id: 'lms-rep-16', name: '16. LMS Audit & Certificate Verification Log', desc: 'Audit trail of digital certificate generations and HR verifications' },
  ];

  const handleExportCSV = () => {
    const employees = api.getEmployeesSync();
    const rows = employees.length > 0
      ? employees.map(e => `${e.employee_code || e.id},"${(e.display_name || `${e.first_name} ${e.last_name}`).replace(/"/g, '""')}",${e.department_name || 'Staff'},Workplace Policy 2026,${new Date().toISOString().split('T')[0]},100%,CERT-${e.employee_code || '101'},Completed`).join('\n')
      : 'EMP-001,"Learner",Engineering,Workplace Policy 2026,2026-08-01,100%,CERT-101,Completed';

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'EmpID,Name,Department,CourseName,CompletionDate,Score,CertificateNo,Status\n' +
      rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedReportId}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#07563D]" />
            <span>Training & LMS Master Reports</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Generate 16 specialized learning, compliance, and certification audit reports</p>
        </div>

        <Button size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportCSV}>
          Export Report (CSV)
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2">16 LMS Reports</h3>
          {reportList.map(rep => (
            <div
              key={rep.id}
              onClick={() => setSelectedReportId(rep.id)}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                selectedReportId === rep.id
                  ? 'border-[#07563D] bg-[#07563D]/5 shadow-2xs'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <h4 className="text-xs font-extrabold text-gray-900">{rep.name}</h4>
              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{rep.desc}</p>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-gray-900">
            {reportList.find(r => r.id === selectedReportId)?.name}
          </h3>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600">
            Ready to generate report for active learning period (Q3 2026). Click "Export Report" to download CSV file.
          </div>
        </div>
      </div>
    </div>
  );
};
