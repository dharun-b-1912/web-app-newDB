import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { ShieldCheck, ShieldAlert, FileText, CheckCircle2, AlertTriangle, Scale, Lock, Download } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

export const ComplianceView: React.FC = () => {
  const { showToast } = useToast();

  const auditLogs = [
    { id: 'AUD-901', actor: 'Anand V (Admin)', action: 'Updated Salary Structure for EMP-1024', timestamp: '10 mins ago', category: 'Payroll Audit' },
    { id: 'AUD-902', actor: 'Deepa S (HR Dir)', action: 'Assigned "HR Director" Role to User U-88', timestamp: '1 hour ago', category: 'RBAC Audit' },
    { id: 'AUD-903', actor: 'System Auto-Policy', action: 'Annual POSH Policy Acknowledgements Sent', timestamp: '5 hours ago', category: 'Compliance' },
    { id: 'AUD-904', actor: 'System Backup', action: 'Automated encrypted tenant database backup completed', timestamp: '12 hours ago', category: 'Security' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-[#07563D]">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Enterprise POSH & Legal Compliance</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1 pl-11">
            Statutory compliance tracking, POSH policy certifications, GDPR data privacy, and immutable audit logs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={() => showToast('Compliance certificate downloaded')}>
            Download Compliance Report
          </Button>
        </div>
      </div>

      {/* Compliance Health Score Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-xs font-semibold text-gray-500">POSH Policy Completion</div>
          <div className="text-2xl font-extrabold text-[#07563D] mt-1">98.4%</div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">421 / 428 Employees Certified</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-xs font-semibold text-gray-500">Internal Complaints Committee</div>
          <div className="text-2xl font-extrabold text-gray-900 mt-1">5 Members</div>
          <div className="text-[11px] text-gray-500 font-medium mt-1">Active Presiding Officer Appointed</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-xs font-semibold text-gray-500">Open Grievances</div>
          <div className="text-2xl font-extrabold text-emerald-800 mt-1">0 Pending</div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">100% Resolved in SLA</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-xs font-semibold text-gray-500">GDPR & Statutory Audit</div>
          <div className="text-2xl font-extrabold text-gray-900 mt-1">Compliant</div>
          <div className="text-[11px] text-gray-500 font-medium mt-1">Next audit due Q4 2026</div>
        </Card>
      </div>

      {/* Immutable System Audit Log */}
      <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Tenant Immutable Audit Trail</h2>
            <p className="text-xs text-gray-500">Every administrative action, permission update, and payroll change is cryptographic timestamped.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => showToast('Audit log export triggered')}>
            Export Immutable Log
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Audit ID</TableHead>
              <TableHead>Actor Identity</TableHead>
              <TableHead>Action Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditLogs.map(log => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-xs font-bold text-gray-700">{log.id}</TableCell>
                <TableCell className="font-bold text-gray-900 text-xs">{log.actor}</TableCell>
                <TableCell className="text-xs text-gray-700">{log.action}</TableCell>
                <TableCell>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#07563D] border border-emerald-100">
                    {log.category}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-gray-500">{log.timestamp}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
