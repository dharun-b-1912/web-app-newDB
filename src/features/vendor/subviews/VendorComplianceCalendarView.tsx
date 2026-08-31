import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Bell,
  Filter,
  Search,
  FileCheck,
  Building,
  Upload,
  RefreshCw,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { ComplianceCalendarTask } from '../../../types/vendorPortal';

export const VendorComplianceCalendarView: React.FC = () => {
  const [tasks, setTasks] = useState<ComplianceCalendarTask[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = () => {
    setTasks(vendorPortalService.getComplianceCalendarTasks());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('wf-vendor-changed', loadData);
    return () => window.removeEventListener('wf-vendor-changed', loadData);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdateStatus = (taskId: string, status: ComplianceCalendarTask['status']) => {
    vendorPortalService.updateCalendarTaskStatus(taskId, status);
    loadData();
    showToast(`Task status updated to ${status}`);
  };

  const handleTriggerReminder = (task: ComplianceCalendarTask) => {
    vendorPortalService.logAudit({
      entity_type: 'COMPLIANCE',
      entity_id: task.id,
      action: 'SMART_REMINDER_DISPATCHED',
      remarks: `Manual escalation reminder triggered for ${task.title} (Due: ${task.due_date})`,
    });
    showToast(`Reminder sent to ${task.assigned_to_role} & Compliance Team`);
  };

  const filtered = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.vendor_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = tasks.filter((t) => t.status === 'PENDING').length;
  const submittedCount = tasks.filter((t) => t.status === 'SUBMITTED').length;
  const verifiedCount = tasks.filter((t) => t.status === 'VERIFIED').length;
  const overdueCount = tasks.filter((t) => t.status === 'OVERDUE').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-indigo-600 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <ShieldCheck className="w-4 h-4" /> {toastMessage}
        </div>
      )}

      {/* Top Banner & KPI Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Pending Statutory Filings</p>
            <p className="text-2xl font-black text-amber-600 mt-1 font-mono">{pendingCount}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Submitted for Verification</p>
            <p className="text-2xl font-black text-indigo-700 mt-1 font-mono">{submittedCount}</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Verified & Compliant</p>
            <p className="text-2xl font-black text-emerald-700 mt-1 font-mono">{verifiedCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Overdue Deadlines</p>
            <p className="text-2xl font-black text-rose-600 mt-1 font-mono">{overdueCount}</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600 border border-rose-100">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search compliance tasks, PF, ESI, returns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            {['ALL', 'PENDING', 'SUBMITTED', 'VERIFIED', 'OVERDUE'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg transition ${
                  statusFilter === s
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Compliance Task Table */}
      <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="font-bold">Statutory Obligation & Frequency</TableHead>
              <TableHead className="font-bold">Governing Act</TableHead>
              <TableHead className="font-bold">Assigned Responsibility</TableHead>
              <TableHead className="font-bold">Statutory Due Date</TableHead>
              <TableHead className="font-bold">Reminders</TableHead>
              <TableHead className="text-right font-bold">Status & Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((task) => (
              <TableRow key={task.id} className="hover:bg-gray-50/60 transition">
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="text-gray-900 font-bold text-xs">{task.title}</p>
                    <p className="text-[11px] text-gray-500">{task.description}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 text-xs font-semibold">
                    {task.category}
                  </span>
                </TableCell>
                <TableCell className="text-gray-700 text-xs font-medium">
                  {task.assigned_to_role}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                    <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                    <span>{task.due_date}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleTriggerReminder(task)}
                    className="text-xs text-indigo-600 hover:bg-indigo-50 font-bold"
                    leftIcon={<Bell className="w-3.5 h-3.5" />}
                  >
                    Escalate
                  </Button>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Badge
                      variant={
                        task.status === 'VERIFIED'
                          ? 'emerald'
                          : task.status === 'SUBMITTED'
                          ? 'info'
                          : task.status === 'OVERDUE'
                          ? 'rose'
                          : 'amber'
                      }
                      size="sm"
                    >
                      {task.status}
                    </Badge>
                    {task.status === 'SUBMITTED' && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(task.id, 'VERIFIED')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                      >
                        Verify
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-400 text-xs">
                  No statutory tasks found for this filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
