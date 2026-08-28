import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import {
  Scale,
  Plus,
  Search,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Clock,
  Send,
  X,
  Lock,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { DisciplinaryCase, DisciplinaryActionType } from '../../types/employeeRelations';
import { employeeRelationsService } from '../../services/employeeRelationsService';

export const DisciplinaryActionsView: React.FC = () => {
  const { showToast } = useToast();
  const [cases, setCases] = useState<DisciplinaryCase[]>(() =>
    employeeRelationsService.getCases('DISCIPLINARY') as DisciplinaryCase[]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<DisciplinaryCase | null>(null);

  // Form State
  const [employeeName, setEmployeeName] = useState('Dinesh Verma');
  const [employeeCode, setEmployeeCode] = useState('JOY-0120');
  const [department, setDepartment] = useState('Manufacturing Ops');
  const [policyViolated, setPolicyViolated] = useState('Workplace Safety & Equipment SOP');
  const [subject, setSubject] = useState('Repeated disregard of safety helmet & gear in plant bay 3');
  const [description, setDescription] = useState('Observed operating line machinery without mandatory safety boots and eye protection on 3 separate occasions.');
  const [decisionAction, setDecisionAction] = useState<DisciplinaryActionType>('WRITTEN_WARNING');

  const refreshData = () => {
    setCases(employeeRelationsService.getCases('DISCIPLINARY') as DisciplinaryCase[]);
  };

  useEffect(() => {
    const handleUpdate = () => refreshData();
    window.addEventListener('er:cases_updated', handleUpdate);
    return () => window.removeEventListener('er:cases_updated', handleUpdate);
  }, []);

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      showToast('Please specify subject and violation details');
      return;
    }

    const created = employeeRelationsService.saveCase({
      tenant_id: 'default-tenant',
      company_id: 'comp-joy-01',
      employee_id: `emp-${Date.now()}`,
      employee_name: employeeName,
      employee_code: employeeCode,
      work_email: 'dinesh.v@joycorp.com',
      department,
      location: 'Plant Factory A',
      subject,
      description,
      case_type: 'DISCIPLINARY',
      category: 'Safety Violation',
      priority: 'HIGH',
      severity: 'SEVERE',
      status: 'INVESTIGATION',
      confidentiality_level: 'CONFIDENTIAL',
      assigned_to: 'Haripriya (HR Head)',
      created_by: 'Haripriya (HR Head)',
      due_date: '2026-09-10',
      attachments: [],
      internal_notes: [
        {
          id: `note-${Date.now()}`,
          author_name: 'Haripriya (HR Head)',
          author_role: 'HR Lead',
          note: 'Initial show cause notice drafted and issued to employee for written explanation within 48 hours.',
          created_at: new Date().toISOString(),
          visibility: 'INTERNAL',
        },
      ],
      tasks: [],
      is_anonymous: false,
    });

    showToast(`Disciplinary case registered: ${created.case_number}`);
    setIsModalOpen(false);
    refreshData();
  };

  const filteredCases = cases.filter(
    c =>
      c.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Formal Disciplinary Actions & Compliance</h2>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span>Employer-Side Due Process & Inquiry</span>
                <span>•</span>
                <span className="text-purple-700 font-medium">Confidential Notice & Show-Cause Generator</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 max-w-3xl">
            Structured workflow for formal misconduct, safety violations, and policy non-compliance with legal notice generation, employee defense records, and 30-day follow-up tracking.
          </p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          + Initiate Disciplinary Case
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active Inquiries</div>
          <div className="text-2xl font-black text-gray-900 mt-0.5">{cases.length} Cases</div>
          <div className="text-[10px] text-purple-700 font-semibold mt-0.5">Under inquiry panel</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Show-Cause Notices Issued</div>
          <div className="text-2xl font-black text-amber-600 mt-0.5">{cases.length} Issued</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Response window 48h active</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">30-Day Follow-Up Reviews</div>
          <div className="text-2xl font-black text-blue-700 mt-0.5">1 Scheduled</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Performance / Conduct improvement</div>
        </Card>
      </div>

      {/* Search & Action Table */}
      <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search disciplinary cases by ID, Employee, or Violation..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-purple-600"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/60">
              <TableHead className="font-bold text-xs text-gray-700">Case ID</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Employee & Department</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Violation & Subject</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Confidentiality</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Stage / Status</TableHead>
              <TableHead className="font-bold text-xs text-gray-700 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCases.map(c => (
              <TableRow key={c.id} className="hover:bg-gray-50/60 transition-colors">
                <TableCell>
                  <span className="font-mono font-bold text-xs text-purple-800">{c.case_number}</span>
                  <div className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString()}</div>
                </TableCell>

                <TableCell>
                  <div className="font-bold text-xs text-gray-900">{c.employee_name}</div>
                  <div className="text-[10px] text-gray-500">
                    {c.employee_code} • {c.department}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="text-xs font-semibold text-gray-900">{c.subject}</div>
                  <div className="text-[10px] text-gray-500">{c.category}</div>
                </TableCell>

                <TableCell>
                  <Badge variant="purple" size="sm">
                    {c.confidentiality_level}
                  </Badge>
                </TableCell>

                <TableCell>
                  <Badge variant="amber" size="sm">
                    {c.status.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-purple-200 text-purple-800 hover:bg-purple-50"
                    onClick={() => setSelectedCase(c)}
                  >
                    Inquiry Desk
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredCases.length === 0 && (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mx-auto border border-purple-100">
              <Scale className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-gray-900">No Disciplinary Cases on Record</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Workforce compliance is currently 100% compliant with no pending formal inquiries.
            </p>
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
              + Initiate Disciplinary Case
            </Button>
          </div>
        )}
      </Card>

      {/* Case Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Initiate Formal Disciplinary Inquiry</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Employee Name *</label>
                  <input
                    type="text"
                    value={employeeName}
                    onChange={e => setEmployeeName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Employee Code</label>
                  <input
                    type="text"
                    value={employeeCode}
                    onChange={e => setEmployeeCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Policy / Standard Violated *</label>
                <input
                  type="text"
                  value={policyViolated}
                  onChange={e => setPolicyViolated(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Violation Subject / Charges *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Detailed Evidence & Incidents</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium h-24"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Generate Show-Cause & Issue
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
