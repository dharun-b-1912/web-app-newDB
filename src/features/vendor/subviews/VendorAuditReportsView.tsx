import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { useToast } from '../../../components/ui/Toast';
import {
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorOrganization } from '../../../types/vendorPortal';

interface VendorAuditReportsViewProps {
  activeVendor: VendorOrganization;
  activePeriod: string;
}

export const VendorAuditReportsView: React.FC<VendorAuditReportsViewProps> = ({
  activeVendor,
  activePeriod,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'REPORTS'>('AUDIT');
  const [filterEntity, setFilterEntity] = useState('ALL');

  const logs = vendorPortalService.getAuditLogs(activeVendor.id);

  const filteredLogs = logs.filter(
    (l) => filterEntity === 'ALL' || l.entity_type === filterEntity
  );

  const handleExport = (reportName: string) => {
    showToast(`Generating export package for ${reportName} (${activePeriod})...`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Governance, Audit Trails & Compliance Reports
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Immutable operation history, user action audit records, and exportable financial settlement ledgers.
          </p>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'AUDIT'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Audit Trail ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('REPORTS')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'REPORTS'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Exportable Reports
          </button>
        </div>
      </div>

      {activeTab === 'AUDIT' && (
        <>
          {/* Entity Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Filter Entity:</span>
            {['ALL', 'EMPLOYEE', 'ATTENDANCE', 'PAYROLL', 'PO', 'INVOICE', 'PAYMENT'].map((ent) => (
              <button
                key={ent}
                onClick={() => setFilterEntity(ent)}
                className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                  filterEntity === ent
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {ent}
              </button>
            ))}
          </div>

          {/* Audit Log Table */}
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead className="font-bold text-gray-700 text-xs">Timestamp</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs">Module Entity</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs">Action</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs">Operational Remarks</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs">Performed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-gray-50/50">
                    <TableCell className="font-mono text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.performed_at).toLocaleString()}
                    </TableCell>

                    <TableCell>
                      <Badge variant="blue" size="sm">
                        {log.entity_type}
                      </Badge>
                    </TableCell>

                    <TableCell className="font-bold text-xs text-gray-900 font-mono">
                      {log.action}
                    </TableCell>

                    <TableCell className="text-xs text-gray-700 max-w-md">
                      {log.remarks || 'Standard workflow transition'}
                    </TableCell>

                    <TableCell className="text-xs text-gray-800">
                      <div>
                        <strong>{log.performed_by}</strong>
                      </div>
                      <span className="text-[10px] text-gray-400">{log.role}</span>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-gray-500 text-xs">
                      Zero audit entries found for selected entity.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {activeTab === 'REPORTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: 'Workforce Deployment Master Report',
              desc: 'Complete roster of active contractor staff with client locations and statutory identifiers.',
              key: 'WORKFORCE',
            },
            {
              title: 'Monthly Biometric Timesheet & OT Ledger',
              desc: 'Working days, present shifts, approved overtime hours, and LOP deductions.',
              key: 'TIMESHEET',
            },
            {
              title: 'Wage Register & Net Payout Schedule',
              desc: 'Gross wages, PF/ESI deductions, professional tax, and net worker take-home breakdown.',
              key: 'WAGE_REGISTER',
            },
            {
              title: 'Statutory EPFO / ESIC Remittance Pack',
              desc: 'Contribution schedules, TRRN challans, and electronic receipt certificates.',
              key: 'STATUTORY',
            },
            {
              title: '3-Way Invoice Reconciliation Report',
              desc: 'PO contract limits vs approved payroll vs invoice billed values and variances.',
              key: '3WAY_RECON',
            },
            {
              title: 'General Ledger Payment Settlement Statement',
              desc: 'Invoice settlement status, bank UTR references, and outstanding balance summary.',
              key: 'GL_STATEMENT',
            },
          ].map((rep) => (
            <Card key={rep.key} className="p-5 flex flex-col justify-between space-y-4 hover:border-indigo-300 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" size="sm">
                    {activePeriod}
                  </Badge>
                </div>
                <h4 className="font-bold text-sm text-gray-900">{rep.title}</h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{rep.desc}</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleExport(rep.title)}
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Export CSV / Excel
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
