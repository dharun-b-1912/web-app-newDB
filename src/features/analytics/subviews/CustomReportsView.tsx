import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../../../services/analyticsApi';
import { CustomReportDefinition, ScheduledReportItem } from '../../../types/analytics';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { FileSpreadsheet, Download, Plus, Clock, Play } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const CustomReportsView: React.FC = () => {
  const { showToast } = useToast();
  const [tab, setTab] = useState<'custom' | 'scheduled'>('custom');
  const [reports, setReports] = useState<CustomReportDefinition[]>([]);
  const [schedules, setSchedules] = useState<ScheduledReportItem[]>([]);

  useEffect(() => {
    setReports(analyticsApi.getCustomReports());
    setSchedules(analyticsApi.getScheduledReports());
  }, []);

  const handleExportCSV = (reportName: string) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'EmpID,Name,Department,GrossSalary,PFDeduction,NetSalary\n' +
      'EMP-101,Rajesh Kumar,Engineering,150000,1800,148200\n' +
      'EMP-102,Ananya Sen,Product,135000,1800,133200\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${reportName.replace(/\s+/g, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#07563D]" />
            <span>Custom Report Builder & Scheduled Delivery Engine</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Build custom dataset queries, save report definitions, and configure automated Communication Hub email delivery</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Visual Report Builder modal opened')}>
          Build Custom Report
        </Button>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setTab('custom')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            tab === 'custom' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Custom Reports ({reports.length})
        </button>
        <button
          onClick={() => setTab('scheduled')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            tab === 'scheduled' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Scheduled Reports ({schedules.length})
        </button>
      </div>

      {tab === 'custom' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map(rep => (
            <div key={rep.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    Dataset: {rep.dataset}
                  </span>
                  <h3 className="text-base font-extrabold text-gray-900 mt-1">{rep.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Code: {rep.report_code} • Created: {rep.created_at}</p>
                </div>
                <Badge variant="emerald">{rep.visualization}</Badge>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-xs font-mono">
                <span className="text-gray-400 font-bold uppercase text-[10px] block font-sans">Fields Included</span>
                <span className="text-gray-800 font-bold">{rep.fields.join(', ')}</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <Button size="sm" variant="outline" leftIcon={<Play className="w-3.5 h-3.5" />} onClick={() => showToast(`Executing ${rep.name}...`)}>
                  Run Report Query
                </Button>
                <Button size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={() => handleExportCSV(rep.name)}>
                  Export (CSV)
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'scheduled' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="p-4">Report Name</th>
                <th className="p-4 font-mono">Frequency</th>
                <th className="p-4">Recipient Roles</th>
                <th className="p-4">Delivery Channel</th>
                <th className="p-4 font-mono">Next Scheduled Run</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-mono">
              {schedules.map(sch => (
                <tr key={sch.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4 font-sans font-extrabold text-gray-900">{sch.report_name}</td>
                  <td className="p-4 font-bold text-gray-800">{sch.frequency}</td>
                  <td className="p-4 font-sans text-gray-700">{sch.recipient_roles.join(', ')}</td>
                  <td className="p-4 font-sans"><Badge variant="emerald">{sch.channel}</Badge></td>
                  <td className="p-4 text-gray-600">{sch.next_run}</td>
                  <td className="p-4 text-center font-sans"><Badge variant="emerald">{sch.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
