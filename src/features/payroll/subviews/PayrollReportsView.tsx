import React, { useState } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { FileSpreadsheet, Download, Printer, Search, Filter } from 'lucide-react';

export const PayrollReportsView: React.FC = () => {
  const [selectedReportId, setSelectedReportId] = useState<string>('prep-01');

  const reportList = [
    { id: 'prep-01', name: '1. Monthly Salary Register', desc: 'Line-by-line employee gross earnings, deductions, and net payouts' },
    { id: 'prep-02', name: '2. Bank Payment Advice (CSV)', desc: 'Formatted bank transfer upload advice file with IFSC and account numbers' },
    { id: 'prep-03', name: '3. PF / EPF Monthly ECR Return', desc: 'ECR text upload format for EPFO portal filing' },
    { id: 'prep-04', name: '4. ESIC Monthly Contribution Statement', desc: 'Monthly ESIC return register with employee gross wages' },
    { id: 'prep-05', name: '5. Professional Tax (PT) Challan Report', desc: 'State-wise PT withholdings and slab classification summary' },
    { id: 'prep-06', name: '6. TDS / 24Q Quarterly Return Register', desc: 'Section-wise TDS tax withholdings for Form 24Q quarterly filing' },
    { id: 'prep-07', name: '7. Payroll Variance & Reconciliation', desc: 'Month-on-month payroll cost variance and headcount delta report' },
    { id: 'prep-08', name: '8. LOP & Attendance Impact Audit', desc: 'Detailed log of unpaid days and corresponding salary deductions' },
    { id: 'prep-09', name: '9. Loan & Advance Recovery Ledger', desc: 'Outstanding principal balances and monthly EMI deductions' },
    { id: 'prep-10', name: '10. Year-End Form 16 Part B Export', desc: 'Consolidated annual income, deductions, and tax computations' },
  ];

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'EmpID,Name,Department,Basic,HRA,Gross,PF,PT,TDS,NetPay\n' +
      'EMP-101,Rajesh Kumar,Engineering,100000,40000,200000,1800,200,20000,178000\n' +
      'EMP-102,Ananya Sen,Product,87500,35000,175000,1800,200,17500,155500\n';
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
            <span>Payroll Reports & Statutory Returns</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Generate 10+ specialized payroll registers, bank advice files, and statutory challans
          </p>
        </div>

        <Button size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportCSV}>
          Export Report (CSV)
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2">Available Reports</h3>
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
            Ready to generate report for active pay period (August 2026). Click "Export Report" to download the formatted data file.
          </div>
        </div>
      </div>
    </div>
  );
};
