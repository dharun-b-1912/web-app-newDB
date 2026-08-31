import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  FileCheck2,
  Calendar,
  Download,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
  FileText,
  Upload,
  Stamp,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { StatutoryReturn, StatutoryReturnType } from '../../../types/vendorPortal';

export const VendorStatutoryReturnsView: React.FC = () => {
  const [returns, setReturns] = useState<StatutoryReturn[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormVModalOpen, setIsFormVModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // Form V State
  const [clientCompany, setClientCompany] = useState('Joy Corporate Solutions Pvt Ltd');
  const [maxWorkers, setMaxWorkers] = useState(50);
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split('T')[0]);
  const [validTo, setValidTo] = useState(new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]);
  const [location, setLocation] = useState('Coimbatore Plant & Industrial Cluster');
  const [scope, setScope] = useState('Technical Support & Skilled Operations');

  // Statutory Return State
  const [formType, setFormType] = useState<StatutoryReturnType>('Form XXIV (Half-Yearly Return)');
  const [returnPeriod, setReturnPeriod] = useState('2026-H1');
  const [dueDate, setDueDate] = useState('2026-07-31');
  const [ackNumber, setAckNumber] = useState('');
  const [remarks, setRemarks] = useState('Statutory return submitted online with Labour Commissioner Portal');

  const loadData = () => {
    setReturns(vendorPortalService.getStatutoryReturns());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('wf-vendor-changed', loadData);
    return () => window.removeEventListener('wf-vendor-changed', loadData);
  }, []);

  const handleIssueFormV = (e: React.FormEvent) => {
    e.preventDefault();
    vendorPortalService.issueFormV({
      client_company_name: clientCompany,
      max_workers: maxWorkers,
      valid_from: validFrom,
      valid_to: validTo,
      work_location: location,
      scope_of_work: scope,
    });
    setIsFormVModalOpen(false);
    loadData();
  };

  const handleAddReturn = (e: React.FormEvent) => {
    e.preventDefault();
    vendorPortalService.addStatutoryReturn({
      form_type: formType,
      return_period: returnPeriod,
      due_date: dueDate,
      acknowledgement_number: ackNumber || `ACK-${Math.floor(100000 + Math.random() * 900000)}`,
      remarks,
      status: 'SUBMITTED',
    });
    setIsReturnModalOpen(false);
    loadData();
  };

  const filtered = returns.filter((r) => {
    return (
      r.form_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.return_period.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.acknowledgement_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Active Form V Certificates</p>
            <p className="text-2xl font-black text-indigo-700 mt-1 font-mono">
              {returns.filter((r) => r.form_type.includes('Form V')).length}
            </p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Filed Half-Yearly Returns (XXIV)</p>
            <p className="text-2xl font-black text-emerald-700 mt-1 font-mono">
              {returns.filter((r) => r.form_type.includes('XXIV')).length}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Annual Returns Filed (XXV)</p>
            <p className="text-2xl font-black text-teal-700 mt-1 font-mono">
              {returns.filter((r) => r.form_type.includes('XXV')).length}
            </p>
          </div>
          <div className="p-3 bg-teal-50 rounded-xl text-teal-600 border border-teal-100">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Form V, XXIV, return period..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <Button
            size="sm"
            onClick={() => setIsReturnModalOpen(true)}
            leftIcon={<Upload className="w-3.5 h-3.5" />}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            Record Statutory Return
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsFormVModalOpen(true)}
            leftIcon={<Stamp className="w-3.5 h-3.5" />}
          >
            Issue Form V Certificate
          </Button>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="font-bold">Form Type & Filing Description</TableHead>
              <TableHead className="font-bold">Return Period</TableHead>
              <TableHead className="font-bold">Due Date</TableHead>
              <TableHead className="font-bold">Acknowledgment / Ref No</TableHead>
              <TableHead className="font-bold">Remarks & Verification</TableHead>
              <TableHead className="text-right font-bold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((ret) => (
              <TableRow key={ret.id} className="hover:bg-gray-50/60 transition">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <FileCheck2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-gray-900 font-bold text-xs">{ret.form_type}</p>
                      <p className="text-[11px] text-gray-500 font-mono mt-0.5">{ret.id}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 text-xs font-mono font-bold">
                    {ret.return_period}
                  </span>
                </TableCell>
                <TableCell className="text-gray-600 text-xs font-medium">
                  {ret.due_date}
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs font-bold text-indigo-700">
                    {ret.acknowledgement_number || 'N/A'}
                  </span>
                </TableCell>
                <TableCell className="text-gray-600 text-xs">
                  {ret.remarks || 'Statutory submission recorded'}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={
                      ret.status === 'VERIFIED' || ret.status === 'FILED'
                        ? 'emerald'
                        : 'info'
                    }
                    size="sm"
                  >
                    {ret.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-400 text-xs">
                  No statutory returns found matching your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Record Statutory Return Modal */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="Record Statutory Return Filing"
      >
        <form onSubmit={handleAddReturn} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Return Form Type</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as StatutoryReturnType)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Form XXIV (Half-Yearly Return)">Form XXIV (CLRA Half-Yearly Return)</option>
              <option value="Form XXV (Annual Return)">Form XXV (CLRA Annual Return)</option>
              <option value="Form V">Form V Certificate Copy</option>
              <option value="Unified Annual Return">State Unified Annual Labour Return</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Return Period</label>
              <input
                type="text"
                required
                placeholder="e.g. 2026-H1 or 2025-2026"
                value={returnPeriod}
                onChange={(e) => setReturnPeriod(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Filing Due Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Government Portal Acknowledgment No *</label>
            <input
              type="text"
              required
              placeholder="e.g. ACK/TN/LAB/2026/90281"
              value={ackNumber}
              onChange={(e) => setAckNumber(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Submission Notes & Remarks</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsReturnModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              Save Return Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* Issue Form V Modal */}
      <Modal
        isOpen={isFormVModalOpen}
        onClose={() => setIsFormVModalOpen(false)}
        title="Issue Form V Certificate (Rule 21(2))"
      >
        <form onSubmit={handleIssueFormV} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Principal Employer Client Entity</label>
            <input
              type="text"
              required
              value={clientCompany}
              onChange={(e) => setClientCompany(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Max Approved Labour Cap</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={maxWorkers}
                onChange={(e) => setMaxWorkers(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Site Premise Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Valid From</label>
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Valid To</label>
              <input
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Nature & Scope of Contract Work</label>
            <input
              type="text"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsFormVModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Sign & Issue Form V
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
