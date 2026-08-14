import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { Tabs } from '../../components/ui/Tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { ShieldAlert, HeartHandshake, MessageSquare, Scale, ShieldCheck, Plus, CheckCircle2, Lock, AlertTriangle } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

export const EmployeeRelationsView: React.FC<{ initialTab?: string }> = ({ initialTab = 'engagement' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const { showToast } = useToast();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'EMPLOYEE RELATIONS' }, { label: 'Relations & POSH Governance' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#07563D]" /> Employee Relations, Grievances & POSH Committee
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Maintain workplace integrity, workplace surveys, grievance handling, disciplinary notices, and statutory POSH compliance.
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Log New Workplace Grievance')}>
          Log Record
        </Button>
      </div>

      <Tabs
        tabs={[
          { id: 'engagement', label: 'Engagement & eNPS', icon: <HeartHandshake className="w-4 h-4" /> },
          { id: 'grievances', label: 'Grievance Desk', icon: <MessageSquare className="w-4 h-4" /> },
          { id: 'discipline', label: 'Disciplinary Actions', icon: <Scale className="w-4 h-4" /> },
          { id: 'posh', label: 'POSH Committee', icon: <ShieldAlert className="w-4 h-4" /> },
          { id: 'compliance', label: 'Statutory Compliance', icon: <ShieldCheck className="w-4 h-4" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Engagement */}
      {activeTab === 'engagement' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 space-y-1">
              <div className="text-xs font-bold text-gray-400 uppercase">Employee Net Promoter Score (eNPS)</div>
              <div className="text-2xl font-black text-[#07563D]">+68 eNPS</div>
              <div className="text-[11px] text-emerald-600 font-semibold">Top 10% Tech Industry Benchmark</div>
            </Card>
            <Card className="p-4 space-y-1">
              <div className="text-xs font-bold text-gray-400 uppercase">Q3 Pulse Survey Participation</div>
              <div className="text-2xl font-black text-gray-900">94.2%</div>
              <div className="text-[11px] text-gray-500 font-semibold">403 Responses Received</div>
            </Card>
            <Card className="p-4 space-y-1">
              <div className="text-xs font-bold text-gray-400 uppercase">Satisfaction Rating</div>
              <div className="text-2xl font-black text-blue-700">4.6 / 5.0</div>
              <div className="text-[11px] text-blue-600 font-semibold">Workplace & Culture Score</div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Grievances */}
      {activeTab === 'grievances' && (
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-extrabold text-gray-900">Active Grievance Log</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case ID</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Filing Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { id: 'GRV-2026-08', cat: 'Workplace Environment', subject: 'Air conditioning malfunction in Tidelfark Module 4', date: '08 Aug 2026', status: 'In Progress' },
                { id: 'GRV-2026-02', cat: 'Manager Feedback', subject: 'Shift roster allocation discrepancy', date: '02 Aug 2026', status: 'Resolved' },
              ].map(g => (
                <TableRow key={g.id}>
                  <TableCell className="font-mono font-bold text-xs">{g.id}</TableCell>
                  <TableCell>{g.cat}</TableCell>
                  <TableCell className="font-medium">{g.subject}</TableCell>
                  <TableCell>{g.date}</TableCell>
                  <TableCell><Badge variant={g.status === 'Resolved' ? 'emerald' : 'amber'}>{g.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => showToast(`Opening Grievance Case File ${g.id}`)}>
                      Review Case
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Tab 3: POSH */}
      {activeTab === 'posh' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Internal Complaints Committee (ICC / POSH)</h3>
              <p className="text-xs text-gray-500">Statutory Prevention of Sexual Harassment Committee Governance</p>
            </div>
            <Badge variant="emerald" size="sm">
              Fully Compliant
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-1">
              <div className="text-xs font-bold text-gray-400 uppercase">Presiding Officer</div>
              <div className="text-sm font-bold text-gray-900">Ananya Rao (VP HR)</div>
              <div className="text-[11px] text-gray-500">External Member: Adv. S. Malini (Madras HC)</div>
            </div>
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-1">
              <div className="text-xs font-bold text-gray-400 uppercase">Annual Filing Status</div>
              <div className="text-sm font-bold text-emerald-700">0 Pending Complaints</div>
              <div className="text-[11px] text-gray-500">Quarterly Return Filed: 30-Jul-2026</div>
            </div>
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-1">
              <div className="text-xs font-bold text-gray-400 uppercase">Staff Awareness Training</div>
              <div className="text-sm font-bold text-gray-900">98.2% Certified</div>
              <div className="text-[11px] text-emerald-600 font-semibold">416 Employees Certified</div>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 4: Statutory Compliance */}
      {activeTab === 'compliance' && (
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-extrabold text-gray-900">Statutory Registers & Legal Audit Logs</h3>
          <div className="space-y-3">
            {[
              { name: 'Form T - Register of Attendance & Overtime (TN Shops Act)', status: 'Updated Daily', compliance: '100%' },
              { name: 'Form 16 - Income Tax Withholding Deductions', status: 'Filed Q1', compliance: '100%' },
              { name: 'EPFO Monthly ECR Return & PF Filing', status: 'Remitted 12-Aug-2026', compliance: '100%' },
              { name: 'ESIC Statutory Monthly Return', status: 'Remitted 12-Aug-2026', compliance: '100%' },
            ].map((c, i) => (
              <div key={i} className="p-3.5 rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-900">{c.name}</div>
                  <div className="text-[11px] text-gray-500">Status: {c.status}</div>
                </div>
                <Badge variant="emerald">{c.compliance} Compliant</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
