import React, { useState } from 'react';
import { Badge } from '../../../components/ui/Badge';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  Filter,
  CheckCircle,
  BarChart,
  FileText,
} from 'lucide-react';

export const LeaveReportsView: React.FC = () => {
  const [selectedReportId, setSelectedReportId] = useState<string>('rep-01');

  const reportList = [
    { id: 'rep-01', name: '1. Leave Summary Report', desc: 'High-level aggregate leave utilization by department and branch' },
    { id: 'rep-02', name: '2. Detailed Leave Register', desc: 'Line-by-line employee request transactions with approval audit stamps' },
    { id: 'rep-03', name: '3. Leave Balance Statement', desc: 'Opening, accrued, consumed, pending, and closing balance per employee' },
    { id: 'rep-04', name: '4. LOP & Unpaid Leave Register', desc: 'Loss-of-pay deductions fed into monthly payroll computation' },
    { id: 'rep-05', name: '5. Accrual & Grant Ledger Audit', desc: 'Audit log of automated monthly accrual batches and manual HR grants' },
    { id: 'rep-06', name: '6. Year-End Carry Forward Audit', desc: 'Lapsed, encashed, and carried-forward leave days at fiscal year end' },
    { id: 'rep-07', name: '7. Encashment Statement', desc: 'Approved leave encashments and corresponding monetary calculations' },
    { id: 'rep-08', name: '8. Comp-Off Utilization Audit', desc: 'Credits earned from weekend work vs claims consumed and expired' },
    { id: 'rep-09', name: '9. Holiday & Calendar Master', desc: 'List of mandatory and restricted holidays configured across branches' },
    { id: 'rep-10', name: '10. Department Absence Heatmap', desc: 'SLA analysis of peak leave days and team capacity bottlenecks' },
    { id: 'rep-11', name: '11. Leave Utilization Rate', desc: 'Percentage of allocated leave taken per department' },
    { id: 'rep-12', name: '12. Approval SLA & Turnaround', desc: 'Average time taken by line managers to approve/reject requests' },
    { id: 'rep-13', name: '13. Negative Balance Audit', desc: 'Tracking employees with overdrafted leave balances' },
    { id: 'rep-14', name: '14. Statutory Maternity/Paternity Compliance', desc: 'Statutory compliance register for parental leaves' },
    { id: 'rep-15', name: '15. Year-End Leave Reconciliation', desc: 'Comprehensive fiscal year-end leave balance audit' },
  ];

  const mockReportData = [
    { empId: 'EMP-101', name: 'Rajesh Kumar', dept: 'Engineering', cl: 6, sl: 8, pl: 18, lop: 0, totalTaken: 8 },
    { empId: 'EMP-102', name: 'Ananya Sen', dept: 'Product', cl: 4, sl: 7, pl: 20, lop: 0, totalTaken: 11 },
    { empId: 'EMP-103', name: 'Vikramaditya Rao', dept: 'Engineering', cl: 8, sl: 10, pl: 15, lop: 2, totalTaken: 14 },
    { empId: 'EMP-104', name: 'Priya Sharma', dept: 'DevOps & Cloud', cl: 5, sl: 6, pl: 22, lop: 0, totalTaken: 7 },
  ];

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'EmpID,Name,Department,CL,SL,PL,LOP,TotalTaken\n' +
      mockReportData.map(r => `${r.empId},${r.name},${r.dept},${r.cl},${r.sl},${r.pl},${r.lop},${r.totalTaken}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedReportId}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedReportName = reportList.find(r => r.id === selectedReportId)?.name || 'Report';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#07563D]" />
            <span>Leave Reports & Compliance Analytics</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Generate 15+ specialized leave management reports with CSV data export and print view
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Report (CSV)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports Catalog Sidebar */}
        <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2">15 Specialized Reports</h3>
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

        {/* Selected Report Output Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">{selectedReportName}</h3>
              <p className="text-xs text-gray-500">Live data preview generated for current fiscal period</p>
            </div>
            <Badge variant="emerald" size="sm">
              Ready to Export
            </Badge>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 font-black text-gray-500 text-[11px] uppercase">
                  <th className="p-3">Emp ID</th>
                  <th className="p-3">Employee Name</th>
                  <th className="p-3">Department</th>
                  <th className="p-3 text-right">CL Avail</th>
                  <th className="p-3 text-right">SL Avail</th>
                  <th className="p-3 text-right">PL Avail</th>
                  <th className="p-3 text-right">LOP Days</th>
                  <th className="p-3 text-right">Total Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mockReportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="p-3 font-mono font-bold text-gray-900">{row.empId}</td>
                    <td className="p-3 font-extrabold text-gray-900">{row.name}</td>
                    <td className="p-3 font-medium text-gray-600">{row.dept}</td>
                    <td className="p-3 text-right font-mono font-bold text-gray-800">{row.cl}</td>
                    <td className="p-3 text-right font-mono font-bold text-gray-800">{row.sl}</td>
                    <td className="p-3 text-right font-mono font-bold text-gray-800">{row.pl}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-700">{row.lop}</td>
                    <td className="p-3 text-right font-mono font-black text-[#07563D]">{row.totalTaken} d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
