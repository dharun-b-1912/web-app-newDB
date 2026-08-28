import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import {
  ShieldAlert,
  Plus,
  Lock,
  UserCheck,
  Calendar,
  FileText,
  CheckCircle2,
  Users,
  Building2,
  EyeOff,
  AlertTriangle,
  X,
} from 'lucide-react';
import { PoshCase, PoshCommitteeMember } from '../../types/employeeRelations';
import { employeeRelationsService } from '../../services/employeeRelationsService';

export const PoshCommitteeView: React.FC = () => {
  const { showToast } = useToast();
  const [members, setMembers] = useState<PoshCommitteeMember[]>(() =>
    employeeRelationsService.getPoshCommitteeMembers()
  );
  const [cases, setCases] = useState<PoshCase[]>(() =>
    employeeRelationsService.getCases('POSH') as PoshCase[]
  );
  const [activeTab, setActiveTab] = useState<'CASES' | 'COMMITTEE' | 'ANNUAL_REPORT'>('CASES');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Anonymized Registration Form State
  const [anonymizedComplainant, setAnonymizedComplainant] = useState('Complainant-C01');
  const [anonymizedRespondent, setAnonymizedRespondent] = useState('Respondent-R01');
  const [incidentDate, setIncidentDate] = useState('2026-08-20');
  const [location, setLocation] = useState('Main Branch Office');
  const [summary, setSummary] = useState('Confidential complaint received regarding inappropriate conduct.');

  const refreshData = () => {
    setMembers(employeeRelationsService.getPoshCommitteeMembers());
    setCases(employeeRelationsService.getCases('POSH') as PoshCase[]);
  };

  useEffect(() => {
    const handleUpdate = () => refreshData();
    window.addEventListener('er:cases_updated', handleUpdate);
    window.addEventListener('er:posh_updated', handleUpdate);
    return () => {
      window.removeEventListener('er:cases_updated', handleUpdate);
      window.removeEventListener('er:posh_updated', handleUpdate);
    };
  }, []);

  const handleRegisterPoshCase = (e: React.FormEvent) => {
    e.preventDefault();
    const created = employeeRelationsService.saveCase({
      tenant_id: 'default-tenant',
      company_id: 'comp-joy-01',
      employee_id: 'posh-masked',
      employee_name: `[Masked: ${anonymizedComplainant}]`,
      employee_code: 'POSH-MASK',
      work_email: 'posh.confidential@joycorp.com',
      department: 'Corporate',
      location,
      subject: `POSH Inquiry — Ref: ${anonymizedComplainant} vs ${anonymizedRespondent}`,
      description: summary,
      case_type: 'POSH',
      category: 'Workplace Harassment Inquiry',
      priority: 'URGENT',
      severity: 'CRITICAL',
      status: 'INVESTIGATION',
      confidentiality_level: 'HIGHLY_CONFIDENTIAL',
      assigned_to: 'Adv. Meenakshi Sundaram (Presiding Officer)',
      created_by: 'Internal Complaint Committee (ICC)',
      due_date: '2026-11-20', // 90 days statutory inquiry window
      attachments: [],
      internal_notes: [],
      tasks: [],
      is_anonymous: false,
    });

    showToast(`POSH Case registered under secure ICC token: ${created.case_number}`);
    setIsModalOpen(false);
    refreshData();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-700">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Internal Complaints Committee (POSH)</h2>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span className="text-rose-700 font-semibold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  Highly Confidential Restricted Workspace
                </span>
                <span>•</span>
                <span>Statutory 90-Day Inquiry Compliance</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 max-w-3xl">
            Dedicated statutory workspace for the Internal Complaints Committee (ICC). Completely isolated with masked identities, external legal presiding oversight, and annual compliance filing.
          </p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          + Register POSH Case
        </Button>
      </div>

      {/* ICC Committee Overview & Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">ICC Committee Members</div>
          <div className="text-2xl font-black text-gray-900 mt-0.5">{members.length} Members</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">External Legal Officer Active</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active Inquiries</div>
          <div className="text-2xl font-black text-rose-700 mt-0.5">{cases.length} Inquiries</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Within 90-day statutory timeline</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Annual Compliance Filing</div>
          <div className="text-2xl font-black text-blue-700 mt-0.5">Compliant</div>
          <div className="text-[10px] text-gray-500 mt-0.5">District Officer Report Ready</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('CASES')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'CASES' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Confidential Cases ({cases.length})
        </button>
        <button
          onClick={() => setActiveTab('COMMITTEE')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'COMMITTEE' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Committee Members ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('ANNUAL_REPORT')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'ANNUAL_REPORT' ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Statutory Annual Report
        </button>
      </div>

      {/* View Content */}
      {activeTab === 'CASES' && (
        <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/60">
                <TableHead className="font-bold text-xs text-gray-700">Case Reference</TableHead>
                <TableHead className="font-bold text-xs text-gray-700">Anonymized Parties</TableHead>
                <TableHead className="font-bold text-xs text-gray-700">Presiding Officer</TableHead>
                <TableHead className="font-bold text-xs text-gray-700">Inquiry Stage</TableHead>
                <TableHead className="font-bold text-xs text-gray-700">Statutory Deadline</TableHead>
                <TableHead className="font-bold text-xs text-gray-700 text-right">Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map(c => (
                <TableRow key={c.id} className="hover:bg-gray-50/60 transition-colors">
                  <TableCell>
                    <span className="font-mono font-bold text-xs text-rose-700">{c.case_number}</span>
                    <div className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString()}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-xs text-gray-900 flex items-center gap-1">
                      <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                      <span>{c.subject}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-gray-800">{c.assigned_to}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="rose" size="sm">
                      {c.status.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-bold text-gray-900">{c.due_date}</div>
                    <div className="text-[10px] text-emerald-600 font-medium">90-Day Window</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="h-7 text-xs border-rose-200 text-rose-700">
                      Restricted Docket
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {cases.length === 0 && (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center mx-auto border border-rose-100">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-gray-900">No POSH Cases On Record</h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                No workplace harassment complaints are currently registered in the active legal entity.
              </p>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'COMMITTEE' && (
        <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              Registered Internal Complaints Committee (ICC) Members
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {members.map(m => (
              <div key={m.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="font-bold text-sm text-gray-900">{m.name}</div>
                  <Badge variant={m.is_external ? 'purple' : 'emerald'} size="xs">
                    {m.is_external ? 'External Legal' : 'Internal'}
                  </Badge>
                </div>
                <div className="text-xs font-semibold text-[#07563D]">{m.role.replace(/_/g, ' ')}</div>
                <div className="text-[11px] text-gray-500 font-mono">{m.email}</div>
                <div className="text-[10px] text-gray-400 pt-2 border-t border-gray-200">
                  Tenure: {m.effective_from} → {m.effective_to}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'ANNUAL_REPORT' && (
        <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Statutory POSH Annual Report Summary (2026)</h3>
              <p className="text-xs text-gray-500 mt-0.5">Form for submission to the District Officer</p>
            </div>
            <Button size="sm" variant="outline">
              Export Statutory PDF
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500 block">Complaints Received</span>
              <span className="text-lg font-black text-gray-900">{cases.length}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500 block">Inquiries Completed</span>
              <span className="text-lg font-black text-emerald-700">
                {cases.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500 block">Pending Beyond 90 Days</span>
              <span className="text-lg font-black text-blue-700">0</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500 block">Awareness Workshops</span>
              <span className="text-lg font-black text-purple-700">4 Conducted</span>
            </div>
          </div>
        </Card>
      )}

      {/* POSH Case Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Register Confidential POSH Case</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPoshCase} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Anonymized Complainant Ref *</label>
                  <input
                    type="text"
                    value={anonymizedComplainant}
                    onChange={e => setAnonymizedComplainant(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Anonymized Respondent Ref *</label>
                  <input
                    type="text"
                    value={anonymizedRespondent}
                    onChange={e => setAnonymizedRespondent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Date of Incident</label>
                  <input
                    type="date"
                    value={incidentDate}
                    onChange={e => setIncidentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Incident Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Brief Description / Intake Summary</label>
                <textarea
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium h-24"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Securely Register Case
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
