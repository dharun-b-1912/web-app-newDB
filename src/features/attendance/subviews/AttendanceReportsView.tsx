import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { FileText, Download, Printer, Filter, ChevronRight, BarChart2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const AttendanceReportsView: React.FC = () => {
  const { showToast } = useToast();
  const [selectedReport, setSelectedReport] = useState('Daily Attendance Register');

  const reportModules = [
    { name: 'Daily Attendance Register', desc: 'Complete daily log of all employees with punch timestamps, net working hours, and sources.' },
    { name: 'Monthly Muster Roll', desc: 'Comprehensive month-wise attendance matrix with P/A/L/WFH/HO status codes for compliance.' },
    { name: 'Late Arrival Report', desc: 'Employees exceeding grace periods, cumulative late minutes, and manager deduction status.' },
    { name: 'Early Departure Report', desc: 'Shortfall hours logged before shift end time.' },
    { name: 'Missing Punch / Anomaly Log', desc: 'Unmatched single punches awaiting regularization.' },
    { name: 'Overtime Ledger', desc: 'Verified overtime hours, rate multipliers, and payroll compensation summary.' },
    { name: 'WFH & Remote Logs', desc: 'Remote attendance breakdown with GPS geofence audit compliance.' },
    { name: 'Shift Compliance Audit', desc: 'Shift adherence, night shift rotations, and split-shift coverage.' },
    { name: 'Biometric Device Hardware Log', desc: 'Terminal uptime, failed sync logs, and offline punch ingestion.' },
    { name: 'Leave & Absence Intersect', desc: 'Cross-verification of Leave module data with daily attendance.' },
    { name: 'Payroll Attendance Snapshot', desc: 'Finalized pay period attendance days and LOP deductions.' },
    { name: 'Departmental Attendance KPI', desc: 'Department-level attendance percentage and absenteeism trends.' },
    { name: 'Location & Branch Summary', desc: 'Attendance breakdown across Bengaluru, Mumbai, and International offices.' },
    { name: 'Regularization Audit Trail', desc: 'History of approved/rejected regularization requests with approver timestamps.' },
    { name: 'Break Time Utilization', desc: 'Analysis of total break durations versus policy limits.' },
    { name: 'Executive Workforce Summary', desc: 'High-level C-suite dashboard export summarizing operational hours.' },
  ];

  const handleExportCsv = (title: string) => {
    showToast(`Generated and exported "${title}" in CSV format.`);
  };

  const handleExportPdf = (title: string) => {
    showToast(`Generated formatted PDF report for "${title}".`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Attendance Reports & Compliance Engine</h2>
          <p className="text-xs text-gray-500 mt-1">
            16 specialized enterprise attendance reports with instant CSV, Excel, and statutory PDF exports
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Report Selector Sidebar */}
        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-1 md:col-span-1 max-h-[600px] overflow-y-auto">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider p-2">Select Report Module</div>
          {reportModules.map((rep, idx) => (
            <button
              key={rep.name}
              onClick={() => setSelectedReport(rep.name)}
              className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                selectedReport === rep.name
                  ? 'bg-[#07563D] text-white shadow-xs'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{idx + 1}. {rep.name}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-70" />
            </button>
          ))}
        </Card>

        {/* Selected Report Details & Controls */}
        <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs md:col-span-2 space-y-6">
          <div className="border-b pb-4">
            <h3 className="text-lg font-extrabold text-gray-900">{selectedReport}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {reportModules.find(m => m.name === selectedReport)?.desc}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
              <input type="date" defaultValue="2026-08-01" className="w-full px-3 py-2 border rounded-xl text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
              <input type="date" defaultValue="2026-08-12" className="w-full px-3 py-2 border rounded-xl text-xs" />
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 space-y-1">
            <div className="font-bold text-gray-900">Report Parameters & Compliance Note</div>
            <div>• Matches statutory Form XVI muster roll formats.</div>
            <div>• All records include immutable biometric hashes & GPS metadata.</div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
            <Button
              className="bg-[#07563D] hover:bg-[#064732]"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={() => handleExportCsv(selectedReport)}
            >
              Export CSV / Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => handleExportPdf(selectedReport)}
            >
              Export PDF
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
