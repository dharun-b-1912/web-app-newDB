import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import {
  ShieldCheck,
  Plus,
  Calendar,
  AlertTriangle,
  FileCheck,
  Building2,
  Clock,
  Download,
  Upload,
  CheckCircle2,
  X,
} from 'lucide-react';
import { ComplianceRecord, ComplianceCategory, ComplianceFrequency } from '../../types/employeeRelations';
import { employeeRelationsService } from '../../services/employeeRelationsService';

export const StatutoryComplianceView: React.FC = () => {
  const { showToast } = useToast();
  const [records, setRecords] = useState<ComplianceRecord[]>(() =>
    employeeRelationsService.getComplianceRecords()
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ComplianceCategory>('LABOUR_LAWS');
  const [jurisdiction, setJurisdiction] = useState('Tamil Nadu, India');
  const [frequency, setFrequency] = useState<ComplianceFrequency>('MONTHLY');
  const [dueDate, setDueDate] = useState('2026-09-15');
  const [ownerName, setOwnerName] = useState('Haripriya (HR Head)');

  const refreshData = () => {
    setRecords(employeeRelationsService.getComplianceRecords());
  };

  useEffect(() => {
    const handleUpdate = () => refreshData();
    window.addEventListener('er:compliance_updated', handleUpdate);
    return () => window.removeEventListener('er:compliance_updated', handleUpdate);
  }, []);

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Please enter statutory requirement title');
      return;
    }

    employeeRelationsService.saveComplianceRecord({
      requirement_title: title,
      jurisdiction,
      category,
      frequency,
      due_date: dueDate,
      owner_name: ownerName,
      owner_email: 'haripriya@joycorporate.com',
      status: 'DUE_SOON',
      evidence_document_name: 'Filing_Receipt_Draft.pdf',
    });

    showToast('Statutory compliance obligation added to tracking calendar!');
    setIsModalOpen(false);
    setTitle('');
    refreshData();
  };

  const handleMarkCompliant = (id: string) => {
    const r = records.find(item => item.id === id);
    if (!r) return;
    r.status = 'COMPLIANT';
    r.last_filed_at = new Date().toISOString();
    employeeRelationsService.saveComplianceRecord(r);
    showToast(`Compliance requirement marked as COMPLIANT!`);
    refreshData();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Statutory & Labour Law Compliance Calendar</h2>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span className="text-teal-700 font-medium">Jurisdiction Obligations Tracking</span>
                <span>•</span>
                <span>Audit Evidence Repository</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 max-w-3xl">
            Track mandatory labour law returns, statutory registers (Form A/B/C/D), POSH annual filings, and social security payments with automated reminders and evidence uploads.
          </p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          + Add Statutory Obligation
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Due This Month</div>
          <div className="text-2xl font-black text-amber-600 mt-0.5">
            {records.filter(r => r.status === 'DUE_SOON').length} Filings
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">Reminders Active</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Compliant / Completed</div>
          <div className="text-2xl font-black text-emerald-700 mt-0.5">
            {records.filter(r => r.status === 'COMPLIANT').length} Filings
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Receipts uploaded</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Overdue Risk</div>
          <div className="text-2xl font-black text-rose-700 mt-0.5">
            {records.filter(r => r.status === 'OVERDUE').length}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Zero penalty exposure</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Jurisdiction</div>
          <div className="text-2xl font-black text-gray-900 mt-0.5">Tamil Nadu</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Central + State Rules</div>
        </Card>
      </div>

      {/* Compliance Table */}
      <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/60">
              <TableHead className="font-bold text-xs text-gray-700">Requirement & Act</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Category</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Frequency</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Due Date</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Owner</TableHead>
              <TableHead className="font-bold text-xs text-gray-700">Status</TableHead>
              <TableHead className="font-bold text-xs text-gray-700 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map(r => (
              <TableRow key={r.id} className="hover:bg-gray-50/60 transition-colors">
                <TableCell>
                  <div className="font-bold text-xs text-gray-900">{r.requirement_title}</div>
                  <div className="text-[10px] text-gray-500">{r.jurisdiction}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" size="sm">
                    {r.category.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-gray-700 font-medium">{r.frequency}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-bold text-gray-900">{r.due_date}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-gray-800">{r.owner_name}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={r.status === 'COMPLIANT' ? 'emerald' : 'amber'} size="sm">
                    {r.status.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {r.status !== 'COMPLIANT' ? (
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleMarkCompliant(r.id)}
                    >
                      File & Complete
                    </Button>
                  ) : (
                    <span className="text-[10px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Complied
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {records.length === 0 && (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto border border-teal-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-gray-900">No Compliance Obligations Registered</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Configure your statutory calendar to track PF/ESI returns, labour welfare, and mandatory registers.
            </p>
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
              + Add Statutory Obligation
            </Button>
          </div>
        )}
      </Card>

      {/* Add Compliance Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Add Statutory Compliance Obligation</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRecord} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Requirement Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Monthly PF & ESI Statutory Return Filing"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium bg-white"
                  >
                    <option value="LABOUR_LAWS">Labour Laws</option>
                    <option value="EMPLOYEE_REGISTERS">Employee Registers (Form A-D)</option>
                    <option value="MANDATORY_NOTICES">Mandatory Workplace Notices</option>
                    <option value="WORKPLACE_SAFETY">Workplace Safety & Factory Act</option>
                    <option value="SOCIAL_SECURITY">Social Security (PF / ESI)</option>
                    <option value="POSH_ANNUAL_REPORT">POSH Annual Report</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium bg-white"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="HALF_YEARLY">Half Yearly</option>
                    <option value="ANNUAL">Annual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Jurisdiction</label>
                  <input
                    type="text"
                    value={jurisdiction}
                    onChange={e => setJurisdiction(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Save Obligation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
