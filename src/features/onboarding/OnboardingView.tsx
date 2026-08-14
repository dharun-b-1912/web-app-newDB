import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import {
  UserPlus,
  CheckSquare,
  FileCheck,
  ShieldCheck,
  Laptop,
  Users,
  Award,
  Clock,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface OnboardingCandidate {
  id: string;
  name: string;
  code: string;
  role: string;
  department: string;
  doj: string;
  status: 'In Progress' | 'Completed' | 'Pending Documents';
  progress: number;
  tasks_completed: number;
  total_tasks: number;
  manager: string;
  policy_accepted: boolean;
}

const mockCandidates: OnboardingCandidate[] = [
  {
    id: 'ONB-01',
    name: 'Priya Sundaram',
    code: 'EMP-1040',
    role: 'Senior Staff Frontend Architect',
    department: 'Engineering',
    doj: '2026-08-15',
    status: 'In Progress',
    progress: 75,
    tasks_completed: 6,
    total_tasks: 8,
    manager: 'Anand Viswanathan',
    policy_accepted: true,
  },
  {
    id: 'ONB-02',
    name: 'Vikram Sethi',
    code: 'EMP-1041',
    role: 'Lead HR Business Partner',
    department: 'People Operations',
    doj: '2026-08-18',
    status: 'Pending Documents',
    progress: 40,
    tasks_completed: 3,
    total_tasks: 8,
    manager: 'Deepa Sundaram',
    policy_accepted: false,
  },
  {
    id: 'ONB-03',
    name: 'Arjun R.',
    code: 'EMP-1042',
    role: 'DevOps Security Specialist',
    department: 'DevOps & Infrastructure',
    doj: '2026-08-20',
    status: 'In Progress',
    progress: 90,
    tasks_completed: 7,
    total_tasks: 8,
    manager: 'Anand Viswanathan',
    policy_accepted: true,
  },
];

export const OnboardingView: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'pipeline' | 'checklists' | 'probation'>('pipeline');
  const [candidates, setCandidates] = useState<OnboardingCandidate[]>(mockCandidates);
  const [selectedCand, setSelectedCand] = useState<OnboardingCandidate | null>(null);

  const handleTaskToggle = (candId: string) => {
    setCandidates(prev =>
      prev.map(c =>
        c.id === candId
          ? {
              ...c,
              tasks_completed: Math.min(c.total_tasks, c.tasks_completed + 1),
              progress: Math.round((Math.min(c.total_tasks, c.tasks_completed + 1) / c.total_tasks) * 100),
            }
          : c
      )
    );
    showToast('Onboarding task marked complete!');
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'CORE HR' }, { label: 'Onboarding Engine' }]} />

      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#07563D]" /> Enterprise Onboarding Engine & Checklists
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Automated new joiner workflows, IT asset allocations, document collection, policy acknowledgements, and probation review tracking.
          </p>
        </div>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('New Joiner Onboarding wizard opened')}>
          Initiate Onboarding
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1 bg-white border border-gray-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase">Active Onboardings</div>
          <div className="text-2xl font-black text-[#07563D]">14 Joiners</div>
          <div className="text-[11px] text-emerald-700 font-semibold">Joining this month</div>
        </Card>
        <Card className="p-4 space-y-1 bg-white border border-gray-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase">Avg. Completion Time</div>
          <div className="text-2xl font-black text-gray-900">2.4 Days</div>
          <div className="text-[11px] text-gray-500 font-semibold">Target: ≤ 3 Days</div>
        </Card>
        <Card className="p-4 space-y-1 bg-white border border-gray-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase">Policy Acceptance Rate</div>
          <div className="text-2xl font-black text-blue-700">96.8%</div>
          <div className="text-[11px] text-blue-600 font-semibold">POSH & Code of Conduct</div>
        </Card>
        <Card className="p-4 space-y-1 bg-white border border-gray-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase">Pending Probation Reviews</div>
          <div className="text-2xl font-black text-amber-600">8 Employees</div>
          <div className="text-[11px] text-amber-700 font-semibold">Review Due in 15 Days</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'pipeline' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          New Joiners Pipeline
        </button>
        <button
          onClick={() => setActiveTab('checklists')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'checklists' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Onboarding Checklists & Policies
        </button>
        <button
          onClick={() => setActiveTab('probation')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'probation' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Probation & Confirmation Evaluation
        </button>
      </div>

      {/* TAB 1: PIPELINE */}
      {activeTab === 'pipeline' && (
        <Card className="p-5 space-y-4 bg-white border border-gray-200/80 shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Joiner</TableHead>
                <TableHead>Department & Manager</TableHead>
                <TableHead>Date of Joining</TableHead>
                <TableHead>Onboarding Progress</TableHead>
                <TableHead>Policy Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map(cand => (
                <TableRow key={cand.id}>
                  <TableCell>
                    <div className="font-bold text-gray-900 text-xs">{cand.name}</div>
                    <div className="text-[11px] text-gray-500">{cand.role} ({cand.code})</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>{cand.department}</div>
                    <div className="text-[10px] text-gray-400">Mgr: {cand.manager}</div>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-gray-700">{cand.doj}</TableCell>
                  <TableCell>
                    <div className="w-32 space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span>{cand.progress}%</span>
                        <span>{cand.tasks_completed}/{cand.total_tasks} tasks</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#07563D] rounded-full" style={{ width: `${cand.progress}%` }} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={cand.policy_accepted ? 'emerald' : 'amber'} size="sm">
                      {cand.policy_accepted ? 'Accepted' : 'Pending Signature'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelectedCand(cand)}>
                      Inspect Tasks
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* TAB 2: CHECKLISTS & POLICIES */}
      {activeTab === 'checklists' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 space-y-3 bg-white border border-gray-200/80 shadow-xs">
            <h3 className="text-xs font-extrabold text-gray-900 uppercase">Automated Task Categories</h3>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-900">HR Operations Checklist</span>
                  <p className="text-[10px] text-gray-500">Employee Master setup, Bank details, Statutory forms</p>
                </div>
                <Badge variant="emerald" size="sm">4 Tasks</Badge>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-900">IT Provisioning & Laptop</span>
                  <p className="text-[10px] text-gray-500">Email, Slack, VPN, Hardware asset assignment</p>
                </div>
                <Badge variant="emerald" size="sm">3 Tasks</Badge>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-900">Manager Orientation & Goals</span>
                  <p className="text-[10px] text-gray-500">1-on-1 intro, 30-60-90 day goal setting</p>
                </div>
                <Badge variant="neutral" size="sm">2 Tasks</Badge>
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-3 bg-white border border-gray-200/80 shadow-xs">
            <h3 className="text-xs font-extrabold text-gray-900 uppercase">Policy Acknowledgement Portal</h3>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#07563D]">POSH & Prevention of Harassment</span>
                  <p className="text-[10px] text-gray-500">Mandatory annual compliance acknowledgement</p>
                </div>
                <Badge variant="emerald" size="sm">Active Policy</Badge>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#07563D]">Code of Business Conduct</span>
                  <p className="text-[10px] text-gray-500">Ethics, Data Privacy & Security Policy</p>
                </div>
                <Badge variant="emerald" size="sm">Active Policy</Badge>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* INSPECT CANDIDATE MODAL */}
      {selectedCand && (
        <Modal isOpen={Boolean(selectedCand)} onClose={() => setSelectedCand(null)} title={`Onboarding Checklist: ${selectedCand.name}`} size="lg">
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-gray-900">{selectedCand.role}</span>
                <p className="text-[11px] text-gray-500">{selectedCand.department} (Mgr: {selectedCand.manager})</p>
              </div>
              <Badge variant="emerald" size="sm">Progress: {selectedCand.progress}%</Badge>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-gray-900">Checklist Execution Matrix:</h4>
              <div className="space-y-1.5">
                <div className="p-2.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between">
                  <span>1. Verify Identity Documents (Aadhaar/PAN)</span>
                  <Badge variant="emerald" size="sm">Completed</Badge>
                </div>
                <div className="p-2.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between">
                  <span>2. Provision MacBook & IT Credentials</span>
                  <Badge variant="emerald" size="sm">Completed</Badge>
                </div>
                <div className="p-2.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between">
                  <span>3. Sign POSH & Code of Conduct Policies</span>
                  <Button size="sm" variant="outline" onClick={() => handleTaskToggle(selectedCand.id)}>
                    Mark Done
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => setSelectedCand(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
