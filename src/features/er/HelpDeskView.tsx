import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  MessageSquare,
  FileText,
  Lock,
  Send,
  X,
} from 'lucide-react';
import { ErCase, PriorityLevel } from '../../types/employeeRelations';
import { employeeRelationsService } from '../../services/employeeRelationsService';

export const HelpDeskView: React.FC = () => {
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<ErCase[]>(() =>
    employeeRelationsService.getCases('HR_SUPPORT')
  );
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<ErCase | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal State
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Payroll & Salary');
  const [priority, setPriority] = useState<PriorityLevel>('NORMAL');
  const [description, setDescription] = useState('');

  // Drawer Message State
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  const refreshData = () => {
    const data = employeeRelationsService.getCases('HR_SUPPORT');
    setTickets(data);
    if (selectedTicket) {
      const updated = data.find(t => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
    }
  };

  useEffect(() => {
    const handleUpdate = () => refreshData();
    window.addEventListener('er:cases_updated', handleUpdate);
    return () => window.removeEventListener('er:cases_updated', handleUpdate);
  }, [selectedTicket]);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      showToast('Please enter subject and description');
      return;
    }

    const created = employeeRelationsService.saveCase({
      tenant_id: 'default-tenant',
      company_id: 'comp-joy-01',
      employee_id: 'emp-001',
      employee_name: 'Arun Kumar',
      employee_code: 'JOY-0101',
      work_email: 'arun.k@joycorp.com',
      department: 'Engineering',
      location: 'Coimbatore HQ',
      subject,
      description,
      case_type: 'HR_SUPPORT',
      category,
      priority,
      severity: 'MILD',
      status: 'SUBMITTED',
      confidentiality_level: 'NORMAL',
      assigned_to: category.includes('Payroll')
        ? 'Payroll Operations Team'
        : category.includes('Leave')
        ? 'Leave Desk Coordinator'
        : 'HR Helpdesk Lead',
      created_by: 'Arun Kumar',
      due_date: '2026-09-02',
      attachments: [],
      internal_notes: [],
      tasks: [],
      is_anonymous: false,
    });

    showToast(`Helpdesk ticket generated with ID: ${created.case_number}`);
    setIsModalOpen(false);
    setSubject('');
    setDescription('');
    refreshData();
  };

  const handleSendReply = () => {
    if (!selectedTicket || !replyText.trim()) return;

    employeeRelationsService.addInternalNote(
      selectedTicket.id,
      'Haripriya (HR Head)',
      'HR Support Agent',
      replyText,
      isInternalNote ? 'INTERNAL' : 'EMPLOYEE_VISIBLE'
    );

    showToast(isInternalNote ? 'Internal agent note added' : 'Response dispatched to employee!');
    setReplyText('');
    refreshData();
  };

  const handleResolveTicket = () => {
    if (!selectedTicket) return;
    employeeRelationsService.updateCaseStatus(
      selectedTicket.id,
      'RESOLVED',
      'Haripriya (HR Head)',
      'Issue resolved and clarification provided.'
    );
    showToast(`Ticket ${selectedTicket.case_number} marked as RESOLVED!`);
    refreshData();
  };

  const filteredTickets = tickets.filter(t => {
    const matchesCategory =
      activeCategory === 'ALL' || t.category.toLowerCase().includes(activeCategory.toLowerCase());
    const matchesSearch =
      t.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.employee_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">HR Help Desk & Service Ticket Center</h2>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span>Auto-Routing to Payroll, Leave & Operations</span>
                <span>•</span>
                <span className="text-teal-700 font-medium">SLA Timers & Dual-Channel Replies</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 max-w-3xl">
            Single entry point for employee queries regarding salary statements, leave encashment, bank updates, and employment certificates.
          </p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          + Raise Help Request
        </Button>
      </div>

      {/* Ticket Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Open Tickets</div>
          <div className="text-2xl font-black text-gray-900 mt-0.5">
            {tickets.filter(t => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length}
          </div>
          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">Auto-routed</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">First Response SLA</div>
          <div className="text-2xl font-black text-emerald-700 mt-0.5">1.2h</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Target: 4.0h</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Resolved Today</div>
          <div className="text-2xl font-black text-blue-700 mt-0.5">
            {tickets.filter(t => t.status === 'RESOLVED').length}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">100% satisfaction</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Top Category</div>
          <div className="text-2xl font-black text-[#07563D] mt-0.5">Payroll</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Form 16 & Tax slips</div>
        </Card>
      </div>

      {/* Filter Categories */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        {['ALL', 'Payroll', 'Leave', 'Attendance', 'Document', 'General'].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeCategory === cat
                ? 'bg-[#07563D] text-white shadow-2xs'
                : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            {cat} Queries
          </button>
        ))}
      </div>

      {/* Tickets Table */}
      <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/60">
              <TableHead className="font-bold text-xs text-gray-700">Ticket ID</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Subject & Category</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Employee</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Auto-Routed Team</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Priority</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Status</TableHead>
              <TableHead className="font-bold text-xs text-gray-700 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTickets.map(t => (
              <TableRow key={t.id} className="hover:bg-gray-50/60 transition-colors">
                <TableCell>
                  <span className="font-mono font-bold text-xs text-teal-800">{t.case_number}</span>
                  <div className="text-[10px] text-gray-400">{new Date(t.created_at).toLocaleDateString()}</div>
                </TableCell>
                <TableCell>
                  <div className="font-bold text-xs text-gray-900">{t.subject}</div>
                  <div className="text-[10px] text-gray-500">{t.category}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-semibold text-gray-800">{t.employee_name}</div>
                  <div className="text-[10px] text-gray-500">{t.department}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-medium text-[#07563D]">{t.assigned_to}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={t.priority === 'HIGH' ? 'amber' : 'gray'} size="sm">
                    {t.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={t.status === 'RESOLVED' ? 'emerald' : 'amber'} size="sm">
                    {t.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-teal-200 text-teal-800 hover:bg-teal-50"
                    onClick={() => setSelectedTicket(t)}
                  >
                    Ticket Thread
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredTickets.length === 0 && (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto border border-teal-100">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-gray-900">No Support Tickets Found</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              All employee queries and support requests are resolved.
            </p>
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
              + Raise Help Request
            </Button>
          </div>
        )}
      </Card>

      {/* Ticket Drawer */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-gray-200 p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <span className="font-mono font-black text-sm text-teal-800">{selectedTicket.case_number}</span>
                  <h3 className="text-base font-bold text-gray-900 mt-0.5">{selectedTicket.subject}</h3>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl text-xs space-y-1">
                <span className="text-gray-500 block">Requester: <strong>{selectedTicket.employee_name}</strong> ({selectedTicket.work_email})</span>
                <span className="text-gray-500 block">Routing Queue: <strong>{selectedTicket.assigned_to}</strong></span>
              </div>

              <div className="space-y-1 text-xs">
                <span className="font-bold text-gray-700 block">Employee Query</span>
                <p className="p-3 bg-gray-50 rounded-xl text-gray-800 border border-gray-100">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Conversation thread */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-900 block">Conversation & Agent Notes</span>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedTicket.internal_notes.map(note => (
                    <div
                      key={note.id}
                      className={`p-3 rounded-xl text-xs border ${
                        note.visibility === 'INTERNAL'
                          ? 'bg-purple-50 border-purple-100 text-purple-950'
                          : 'bg-teal-50 border-teal-100 text-teal-950'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold text-gray-600 mb-1">
                        <span>{note.author_name}</span>
                        <Badge variant={note.visibility === 'INTERNAL' ? 'purple' : 'emerald'} size="xs">
                          {note.visibility === 'INTERNAL' ? 'Internal Note' : 'Sent to Employee'}
                        </Badge>
                      </div>
                      <p>{note.note}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Type reply or internal resolution note..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium h-16"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={e => setIsInternalNote(e.target.checked)}
                        className="rounded text-[#07563D]"
                      />
                      <span>Internal agent note (hidden from employee)</span>
                    </label>
                    <Button size="sm" onClick={handleSendReply}>
                      Send Message
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleResolveTicket}
              >
                Mark as Resolved
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Raise HR Support Request</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Subject *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Request for Form 16 Part B for FY 2025-26"
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
                    <option value="Payroll & Salary">Payroll & Salary</option>
                    <option value="Leave Encashment">Leave & Holidays</option>
                    <option value="Attendance Regularization">Attendance & Clocking</option>
                    <option value="Employment Certificate">Documents & Letters</option>
                    <option value="Health Benefits">Insurance & Benefits</option>
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
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Query Details *</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Explain what help you need from HR operations..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium h-24"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Dispatch Ticket
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
