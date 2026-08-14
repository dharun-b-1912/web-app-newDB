import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import {
  UserMinus,
  CheckSquare,
  FileText,
  ShieldAlert,
  HelpCircle,
  Briefcase,
  Calendar,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Download,
  AlertTriangle,
} from 'lucide-react';

interface OffboardingCase {
  id: string;
  employee_name: string;
  code: string;
  department: string;
  designation: string;
  resignation_date: string;
  last_working_day: string;
  notice_days: number;
  reason: string;
  clearance_status: 'In Progress' | 'Cleared' | 'Blocked';
  it_clearance: boolean;
  hr_clearance: boolean;
  finance_clearance: boolean;
  asset_clearance: boolean;
  exit_interview_done: boolean;
}

const mockCases: OffboardingCase[] = [
  {
    id: 'OFF-101',
    name: 'Suresh Kumar',
    code: 'EMP-1012',
    department: 'Engineering',
    designation: 'Senior Frontend Developer',
    resignation_date: '2026-07-15',
    last_working_day: '2026-08-30',
    notice_days: 45,
    reason: 'Better Career Opportunity',
    clearance_status: 'In Progress',
    it_clearance: true,
    hr_clearance: true,
    finance_clearance: false,
    asset_clearance: false,
    exit_interview_done: true,
  } as any,
  {
    id: 'OFF-102',
    name: 'Meenakshi Iyer',
    code: 'EMP-1018',
    department: 'Operations',
    designation: 'Supply Chain Analyst',
    resignation_date: '2026-08-01',
    last_working_day: '2026-08-31',
    notice_days: 30,
    reason: 'Higher Education / Relocation',
    clearance_status: 'Cleared',
    it_clearance: true,
    hr_clearance: true,
    finance_clearance: true,
    asset_clearance: true,
    exit_interview_done: true,
  } as any,
];

export const OffboardingView: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'resignations' | 'clearance' | 'exit_interview' | 'alumni'>('resignations');
  const [cases, setCases] = useState<OffboardingCase[]>(mockCases);
  const [selectedCase, setSelectedCase] = useState<OffboardingCase | null>(null);

  const handleGrantClearance = (caseId: string, dept: 'finance' | 'asset') => {
    setCases(prev =>
      prev.map(c => {
        if (c.id === caseId) {
          const updated = {
            ...c,
            finance_clearance: dept === 'finance' ? true : c.finance_clearance,
            asset_clearance: dept === 'asset' ? true : c.asset_clearance,
          };
          const allCleared = updated.it_clearance && updated.hr_clearance && updated.finance_clearance && updated.asset_clearance;
          return {
            ...updated,
            clearance_status: allCleared ? 'Cleared' : 'In Progress',
          };
        }
        return c;
      })
    );
    showToast(`Department clearance granted for ${caseId}`);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'CORE HR' }, { label: 'Offboarding & Exit Engine' }]} />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <UserMinus className="w-5 h-5 text-red-700" /> Enterprise Offboarding & Separation Master
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Resignation workflows, notice period buyout calculations, exit interview analytics, multi-department NOC clearance matrix, IT access revocation, and F&F settlement.
          </p>
        </div>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Log Resignation modal launched')}>
          Log Resignation / Separation
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1 bg-white border border-gray-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase">Active Notice Period</div>
          <div className="text-2xl font-black text-amber-600">6 Employees</div>
          <div className="text-[11px] text-amber-700 font-semibold">Exiting in 30 Days</div>
        </Card>
        <Card className="p-4 space-y-1 bg-white border border-gray-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase">Pending NOC Clearances</div>
          <div className="text-2xl font-black text-red-600">4 Clearances</div>
          <div className="text-[11px] text-red-600 font-semibold">Finance & Asset Recovery</div>
        </Card>
        <Card className="p-4 space-y-1 bg-white border border-gray-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase">Exit Interviews Done</div>
          <div className="text-2xl font-black text-blue-700">100%</div>
          <div className="text-[11px] text-blue-600 font-semibold">Feedback Collected</div>
        </Card>
        <Card className="p-4 space-y-1 bg-white border border-gray-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase">F&F Ready for Payroll</div>
          <div className="text-2xl font-black text-[#07563D]">2 Accounts</div>
          <div className="text-[11px] text-emerald-800 font-semibold">Relieving Letters Issued</div>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('resignations')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'resignations' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Resignations & Separations
        </button>
        <button
          onClick={() => setActiveTab('clearance')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'clearance' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          NOC & Department Clearance Matrix
        </button>
        <button
          onClick={() => setActiveTab('exit_interview')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'exit_interview' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Exit Interview Analytics
        </button>
        <button
          onClick={() => setActiveTab('alumni')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'alumni' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Exited Employee Alumni Directory
        </button>
      </div>

      {/* TAB 1: RESIGNATIONS */}
      {activeTab === 'resignations' && (
        <Card className="p-5 space-y-4 bg-white border border-gray-200/80 shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exiting Employee</TableHead>
                <TableHead>Resignation / LWD</TableHead>
                <TableHead>Notice Period</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Clearance Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-bold text-gray-900 text-xs">{c.name || c.employee_name}</div>
                    <div className="text-[11px] text-gray-500">{c.designation} ({c.code})</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>Resigned: {c.resignation_date}</div>
                    <div className="font-bold text-gray-900">LWD: {c.last_working_day}</div>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-gray-800">{c.notice_days} Days</TableCell>
                  <TableCell className="text-xs text-gray-600">{c.reason}</TableCell>
                  <TableCell>
                    <Badge variant={c.clearance_status === 'Cleared' ? 'emerald' : 'amber'} size="sm">
                      {c.clearance_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelectedCase(c)}>
                      Manage Separation
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* TAB 2: CLEARANCE MATRIX */}
      {activeTab === 'clearance' && (
        <Card className="p-5 space-y-4 bg-white border border-gray-200/80 shadow-xs">
          <h3 className="text-sm font-extrabold text-gray-900">Multi-Department Clearance Checklist (NOC)</h3>
          <div className="space-y-3">
            {cases.map((c: any) => (
              <div key={c.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                  <div>
                    <span className="font-black text-gray-900 text-xs">{c.name || c.employee_name}</span>
                    <span className="text-[11px] text-gray-500 ml-2">({c.code} — {c.department})</span>
                  </div>
                  <Badge variant={c.clearance_status === 'Cleared' ? 'emerald' : 'amber'} size="sm">
                    NOC {c.clearance_status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
                    <span>IT Access & Laptop</span>
                    {c.it_clearance ? <Badge variant="emerald" size="sm">Cleared</Badge> : <Badge variant="rose" size="sm">Pending</Badge>}
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
                    <span>HR & Documents</span>
                    {c.hr_clearance ? <Badge variant="emerald" size="sm">Cleared</Badge> : <Badge variant="rose" size="sm">Pending</Badge>}
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
                    <span>Finance & Advances</span>
                    {c.finance_clearance ? (
                      <Badge variant="emerald" size="sm">Cleared</Badge>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleGrantClearance(c.id, 'finance')}>Grant</Button>
                    )}
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
                    <span>Asset Recovery</span>
                    {c.asset_clearance ? (
                      <Badge variant="emerald" size="sm">Cleared</Badge>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleGrantClearance(c.id, 'asset')}>Grant</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 3: EXIT INTERVIEW */}
      {activeTab === 'exit_interview' && (
        <Card className="p-5 space-y-4 bg-white border border-gray-200/80 shadow-xs">
          <h3 className="text-sm font-extrabold text-gray-900">Exit Feedback & Attrition Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-gray-50 rounded-xl space-y-2 border border-gray-200">
              <span className="font-bold text-gray-900">Primary Reasons for Leaving</span>
              <p className="text-[11px] text-gray-500">1. Higher Education / Career Growth (50%)</p>
              <p className="text-[11px] text-gray-500">2. Better Compensation & CTC (33%)</p>
              <p className="text-[11px] text-gray-500">3. Relocation / Personal (17%)</p>
            </div>
            <div className="p-4 bg-emerald-50/60 rounded-xl space-y-2 border border-emerald-100">
              <span className="font-bold text-[#07563D]">Company Work Culture Score</span>
              <p className="text-2xl font-black text-[#07563D]">4.6 / 5.0</p>
              <p className="text-[10px] text-gray-500">Exiting employees praise team collaboration & culture</p>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 4: ALUMNI DIRECTORY */}
      {activeTab === 'alumni' && (
        <Card className="p-5 space-y-4 bg-white border border-gray-200/80 shadow-xs">
          <h3 className="text-sm font-extrabold text-gray-900">Historical Exited Employee Records</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alumni Name</TableHead>
                <TableHead>Last Department</TableHead>
                <TableHead>Exit Date</TableHead>
                <TableHead>Relieving Letter Issued</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-bold text-gray-900 text-xs">Meenakshi Iyer (EMP-1018)</TableCell>
                <TableCell className="text-xs">Supply Chain Operations</TableCell>
                <TableCell className="text-xs text-gray-500">2026-08-31</TableCell>
                <TableCell><Badge variant="emerald" size="sm">Issued & Digitally Signed</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}

      {/* CASE DETAIL MODAL */}
      {selectedCase && (
        <Modal isOpen={Boolean(selectedCase)} onClose={() => setSelectedCase(null)} title={`Separation Management: ${selectedCase.employee_name || selectedCase.name}`} size="lg">
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-gray-900">{selectedCase.designation}</span>
                <p className="text-[11px] text-gray-500">{selectedCase.department}</p>
              </div>
              <Badge variant={selectedCase.clearance_status === 'Cleared' ? 'emerald' : 'amber'} size="sm">
                NOC {selectedCase.clearance_status}
              </Badge>
            </div>

            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
              <span className="font-bold text-[#07563D]">Relieving & Experience Letters</span>
              <p className="text-[11px] text-gray-600">Once all NOC clearances are granted, click below to generate the formal Relieving Certificate.</p>
              <Button size="sm" onClick={() => showToast('Generated Relieving Letter PDF for ' + (selectedCase.employee_name || selectedCase.name))} leftIcon={<Download className="w-4 h-4" />}>
                Generate Relieving Letter
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => setSelectedCase(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
