import React, { useState } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { FileSpreadsheet, Download, Filter } from 'lucide-react';

export const PerformanceReportsView: React.FC = () => {
  const [selectedReportId, setSelectedReportId] = useState<string>('perf-rep-01');

  const reportList = [
    { id: 'perf-rep-01', name: '1. Goal Achievement Register', desc: 'Employee-wise goal progress, status, and weight contribution' },
    { id: 'perf-rep-02', name: '2. OKR Alignment & Progress Report', desc: 'Company, department, and individual OKR target achievement' },
    { id: 'perf-rep-03', name: '3. KPI Achievement Audit', desc: 'Quantitative KPI scores compared against minimum, expected, and stretch targets' },
    { id: 'perf-rep-04', name: '4. KRA Performance Statement', desc: 'Role-based Key Result Areas execution breakdown' },
    { id: 'perf-rep-05', name: '5. Appraisal Review Completion Report', desc: 'Status tracker for self reviews, manager appraisals, and 360° feedback' },
    { id: 'perf-rep-06', name: '6. Rating Bell Curve Distribution Report', desc: 'Calibrated performance ratings distribution by department and manager' },
    { id: 'perf-rep-07', name: '7. 9-Box Talent Matrix Register', desc: 'High Potential (HiPo) star performers vs core contribution inventory' },
    { id: 'perf-rep-08', name: '8. Promotion Recommendation Pipeline', desc: 'Appraisal-driven promotion requests, proposed grades, and approval stamps' },
    { id: 'perf-rep-09', name: '9. Active PIP Tracking Report', desc: 'Employees under Performance Improvement Plans with check-in history' },
    { id: 'perf-rep-10', name: '10. Skill Gap & Development Plan Report', desc: 'Training and certification recommendations from post-appraisal reviews' },
    { id: 'perf-rep-11', name: '11. 360° Peer Feedback Aggregation', desc: 'Anonymized competency scores across cross-functional reviewers' },
    { id: 'perf-rep-12', name: '12. Performance Audit & History Trail', desc: 'Audit log of rating changes, calibration adjustments, and cycle reopenings' },
    { id: 'perf-rep-13', name: '13. High Performer Retention Audit', desc: 'Retention metrics for top-rated employees' },
    { id: 'perf-rep-14', name: '14. Manager Evaluation SLA Audit', desc: 'Average turnaround time for managers to complete subordinate reviews' },
  ];

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'EmpID,Name,Department,Manager,GoalProgress,KPIScore,FinalRating,Status\n' +
      'EMP-101,Rajesh Kumar,Engineering,Anand Viswanathan,85%,94%,4.8,Exceptional\n' +
      'EMP-102,Ananya Sen,Product,Anand Viswanathan,92%,90%,4.5,Exceeds Expectations\n';
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
            <span>Performance Reports & Appraisal Analytics</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Generate 14 specialized performance, OKR, rating, and promotion audit reports</p>
        </div>

        <Button size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportCSV}>
          Export Report (CSV)
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2">14 Performance Reports</h3>
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
            Ready to generate report for active performance cycle (Q3 2026). Click "Export Report" to download CSV file.
          </div>
        </div>
      </div>
    </div>
  );
};
