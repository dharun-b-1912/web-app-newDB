import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import {
  Inbox,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  MessageSquare,
  Lock,
  ChevronRight,
  X,
  Send,
  Building2,
  Paperclip,
  RotateCcw,
} from 'lucide-react';
import { ErCase, CaseStatus, PriorityLevel } from '../../types/employeeRelations';
import { employeeRelationsService } from '../../services/employeeRelationsService';

export const GrievanceDeskView: React.FC = () => {
  const { showToast } = useToast();
  const [cases, setCases] = useState<ErCase[]>(() => employeeRelationsService.getCases('GRIEVANCE'));
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState<ErCase | null>(null);

  // Submission Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Workplace Concern');
  const [priority, setPriority] = useState<PriorityLevel>('NORMAL');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Case Drawer State
  const [internalNoteText, setInternalNoteText] = useState('');
  const [isEmployeeVisibleNote, setIsEmployeeVisibleNote] = useState(false);
  const [resolutionText, setResolutionText] = useState('');

  const refreshData = () => {
    const data = employeeRelationsService.getCases('GRIEVANCE');
    setCases(data);
    if (selectedCase) {
      const updated = data.find(c => c.id === selectedCase.id);
      if (updated) setSelectedCase(updated);
    }
  };

  useEffect(() => {
    const handleUpdate = () => refreshData();
    window.addEventListener('er:cases_updated', handleUpdate);
    return () => window.removeEventListener('er:cases_updated', handleUpdate);
  }, [selectedCase]);

  const handleSubmitGrievance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      showToast('Please enter subject and description');
      return;
    }

    const created = employeeRelationsService.saveCase({
      tenant_id: 'default-tenant',
      company_id: 'comp-joy-01',
      employee_id: isAnonymous ? 'anon' : 'emp-001',
      employee_name: isAnonymous ? 'Anonymous Employee' : 'Arun Kumar',
      employee_code: isAnonymous ? 'ANON' : 'JOY-0101',
      work_email: isAnonymous ? 'anonymous@joycorp.com' : 'arun.k@joycorp.com',
      department: 'Engineering',
      location: 'Coimbatore HQ',
      subject,
      description,
      case_type: 'GRIEVANCE',
      category,
      priority,
      severity: priority === 'URGENT' ? 'SEVERE' : 'MODERATE',
      status: 'SUBMITTED',
      confidentiality_level: 'NORMAL',
      assigned_to: 'Haripriya (HR Head)',
      created_by: isAnonymous ? 'Anonymous' : 'Arun Kumar',
      due_date: '2026-09-05',
      attachments: [],
      internal_notes: [],
      tasks: [],
      is_anonymous: isAnonymous,
    });

    showToast(`Grievance submitted successfully with Case Reference: ${created.case_number}`);
    setIsSubmitModalOpen(false);
    setSubject('');
    setDescription('');
    refreshData();
  };

  const handleAddNote = () => {
    if (!selectedCase || !internalNoteText.trim()) return;
    employeeRelationsService.addInternalNote(
      selectedCase.id,
      'Haripriya (HR Head)',
      'HR Lead',
      internalNoteText,
      isEmployeeVisibleNote ? 'EMPLOYEE_VISIBLE' : 'INTERNAL'
    );
    showToast(isEmployeeVisibleNote ? 'Response sent to employee!' : 'Confidential internal note added');
    setInternalNoteText('');
    refreshData();
  };

  const handleResolveCase = () => {
    if (!selectedCase) return;
    employeeRelationsService.updateCaseStatus(
      selectedCase.id,
      'RESOLVED',
      'Haripriya (HR Head)',
      resolutionText || 'Issue resolved through counseling and manager alignment.'
    );
    showToast(`Case ${selectedCase.case_number} marked as RESOLVED!`);
    refreshData();
  };

  const handleReopenCase = () => {
    if (!selectedCase) return;
    employeeRelationsService.updateCaseStatus(
      selectedCase.id,
      'REOPENED',
      'Haripriya (HR Head)',
      'Employee requested re-investigation following initial resolution.'
    );
    showToast(`Case ${selectedCase.case_number} REOPENED for further review!`);
    refreshData();
  };

  const filteredCases = cases.filter(c => {
    const matchesFilter =
      activeFilter === 'ALL' ||
      (activeFilter === 'OPEN' && c.status !== 'RESOLVED' && c.status !== 'CLOSED') ||
      c.status === activeFilter;

    const matchesSearch =
      c.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Employee Grievance Desk</h2>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span>Structured Concern & Dispute Resolution</span>
                <span>•</span>
                <span className="text-emerald-700 font-medium">SLA Tracking & Confidential Workspaces</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 max-w-3xl">
            Centralized intake for employee workplace concerns, manager conflicts, and facilities disputes with clear escalation timers and private investigation notes.
          </p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsSubmitModalOpen(true)}>
          + Lodge Grievance
        </Button>
      </div>

      {/* SLA Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active Open Cases</div>
          <div className="text-2xl font-black text-gray-900 mt-0.5">
            {cases.filter(c => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length}
          </div>
          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">In Progress</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">SLA Acknowledgement</div>
          <div className="text-2xl font-black text-emerald-700 mt-0.5">100%</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Within 4 Business Hours</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Avg Resolution Time</div>
          <div className="text-2xl font-black text-blue-700 mt-0.5">2.4 Days</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Target: 5 Days Max</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Resolved This Month</div>
          <div className="text-2xl font-black text-[#07563D] mt-0.5">
            {cases.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length} Cases
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">High satisfaction</div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Case ID (e.g. GRV-2026-000101), Subject, or Employee..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#07563D]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {['ALL', 'OPEN', 'SUBMITTED', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'].map(statusKey => (
            <button
              key={statusKey}
              onClick={() => setActiveFilter(statusKey)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                activeFilter === statusKey
                  ? 'bg-[#07563D] text-white shadow-2xs'
                  : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {statusKey.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Grievances Table */}
      <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/60">
              <TableHead className="font-bold text-xs text-gray-700">Case ID</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Subject & Category</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Employee & Dept</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Priority</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Status</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">SLA Due</TableHead>
              <TableHead className="font-bold text-xs text-gray-700 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCases.map(c => (
              <TableRow key={c.id} className="hover:bg-gray-50/60 transition-colors">
                <TableCell>
                  <span className="font-mono font-bold text-xs text-[#07563D]">{c.case_number}</span>
                  <div className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString()}</div>
                </TableCell>

                <TableCell>
                  <div className="font-bold text-xs text-gray-900">{c.subject}</div>
                  <div className="text-[10px] text-gray-500">{c.category}</div>
                </TableCell>

                <TableCell>
                  <div className="text-xs font-semibold text-gray-800">{c.employee_name}</div>
                  <div className="text-[10px] text-gray-500">{c.department}</div>
                </TableCell>

                <TableCell>
                  <Badge
                    variant={
                      c.priority === 'URGENT'
                        ? 'rose'
                        : c.priority === 'HIGH'
                        ? 'amber'
                        : 'gray'
                    }
                    size="sm"
                  >
                    {c.priority}
                  </Badge>
                </TableCell>

                <TableCell>
                  <Badge
                    variant={
                      c.status === 'RESOLVED' || c.status === 'CLOSED'
                        ? 'emerald'
                        : c.status === 'UNDER_REVIEW'
                        ? 'blue'
                        : 'amber'
                    }
                    size="sm"
                  >
                    {c.status.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div className="text-xs font-semibold text-gray-900">{c.due_date}</div>
                  <div className="text-[10px] text-emerald-600 font-medium">On Track</div>
                </TableCell>

                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-gray-200"
                    onClick={() => setSelectedCase(c)}
                  >
                    Workspace
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredCases.length === 0 && (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
              <Inbox className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-gray-900">No Grievance Cases Found</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              All employee concerns are currently addressed and resolved.
            </p>
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsSubmitModalOpen(true)}>
              + Lodge New Grievance
            </Button>
          </div>
        )}
      </Card>

      {/* Grievance Submission Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Lodge Employee Grievance</h3>
              <button onClick={() => setIsSubmitModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitGrievance} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Subject / Summary *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Disagreement over project milestone allocation"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium bg-white"
                  >
                    <option value="Workplace Concern">Workplace Concern</option>
                    <option value="Manager Dispute">Manager Issue / Conflict</option>
                    <option value="Attendance Dispute">Attendance & Timing Dispute</option>
                    <option value="Salary Dispute">Salary / Payroll Dispute</option>
                    <option value="Safety Concern">Safety & Health Concern</option>
                    <option value="Facilities">Facilities & Infrastructure</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Detailed Description *</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the incident, dates, people involved, and desired resolution..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium h-24"
                  required
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-900 block">Lodge Anonymously</span>
                  <span className="text-[10px] text-gray-500">Identity masked from assigned officer.</span>
                </div>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={e => setIsAnonymous(e.target.checked)}
                  className="rounded text-[#07563D] w-4 h-4"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsSubmitModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Submit Grievance
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Case Workspace Drawer / Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl border-l border-gray-200 p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-[#07563D]">{selectedCase.case_number}</span>
                    <Badge variant={selectedCase.priority === 'URGENT' ? 'rose' : 'gray'} size="xs">
                      {selectedCase.priority}
                    </Badge>
                    <Badge variant="emerald" size="xs">
                      {selectedCase.status}
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mt-1">{selectedCase.subject}</h3>
                </div>
                <button onClick={() => setSelectedCase(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Employee & Category Snapshot */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Submitter</span>
                  <span className="font-bold text-gray-900">{selectedCase.employee_name}</span>
                  <span className="text-[10px] text-gray-500 block">{selectedCase.department}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Assigned HR Lead</span>
                  <span className="font-bold text-[#07563D]">{selectedCase.assigned_to || 'Hari Priya'}</span>
                  <span className="text-[10px] text-gray-500 block">SLA Due: {selectedCase.due_date}</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1 text-xs">
                <span className="font-bold text-gray-700 block">Issue Description</span>
                <p className="p-3.5 bg-gray-50 rounded-xl text-gray-800 leading-relaxed border border-gray-100">
                  {selectedCase.description}
                </p>
              </div>

              {/* Internal Confidential Notes Ledger */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-purple-600" />
                    <span>Internal Notes & Communication Thread</span>
                  </span>
                  <span className="text-[10px] text-gray-500">{selectedCase.internal_notes.length} Messages</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedCase.internal_notes.map(note => (
                    <div
                      key={note.id}
                      className={`p-3 rounded-xl text-xs border ${
                        note.visibility === 'INTERNAL'
                          ? 'bg-purple-50/40 border-purple-100 text-purple-950'
                          : 'bg-emerald-50/40 border-emerald-100 text-emerald-950'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold text-gray-600 mb-1">
                        <span>
                          {note.author_name} ({note.author_role})
                        </span>
                        <Badge variant={note.visibility === 'INTERNAL' ? 'purple' : 'emerald'} size="xs">
                          {note.visibility === 'INTERNAL' ? 'Confidential HR Note' : 'Sent to Employee'}
                        </Badge>
                      </div>
                      <p>{note.note}</p>
                    </div>
                  ))}

                  {selectedCase.internal_notes.length === 0 && (
                    <div className="p-3 text-center text-xs text-gray-400 bg-gray-50 rounded-xl">
                      No internal notes logged yet.
                    </div>
                  )}
                </div>

                {/* Note composer */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <textarea
                    value={internalNoteText}
                    onChange={e => setInternalNoteText(e.target.value)}
                    placeholder="Add an internal investigation note or employee response..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium h-16"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isEmployeeVisibleNote}
                        onChange={e => setIsEmployeeVisibleNote(e.target.checked)}
                        className="rounded text-[#07563D]"
                      />
                      <span>Visible to Employee (Notify)</span>
                    </label>
                    <Button size="sm" onClick={handleAddNote}>
                      Post Note
                    </Button>
                  </div>
                </div>
              </div>

              {/* Case Action Controls */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <span className="text-xs font-bold text-gray-900 block">Case Outcome & Status Transition</span>
                <input
                  type="text"
                  value={resolutionText}
                  onChange={e => setResolutionText(e.target.value)}
                  placeholder="Summarize resolution findings..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium bg-white"
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleResolveCase}
                  >
                    Mark as Resolved
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<RotateCcw className="w-3 h-3" />}
                    onClick={handleReopenCase}
                  >
                    Reopen Case
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
              <span>Strict RLS multi-tenant compliance</span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCase(null)}>
                Close Workspace
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
