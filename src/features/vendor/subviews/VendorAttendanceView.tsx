import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import {
  CheckCircle2,
  FileEdit,
  FileText,
  Search,
  Check,
  X,
} from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorOrganization, VendorAttendanceCorrectionRequest } from '../../../types/vendorPortal';

interface VendorAttendanceViewProps {
  activeVendor: VendorOrganization;
  activePeriod: string;
  onRefresh: () => void;
}

export const VendorAttendanceView: React.FC<VendorAttendanceViewProps> = ({
  activeVendor,
  activePeriod,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'CORRECTIONS'>('ATTENDANCE');
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);

  // Correction Form State
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [reqPresentDays, setReqPresentDays] = useState(25);
  const [reqLopDays, setReqLopDays] = useState(1);
  const [reqOtHours, setReqOtHours] = useState(8);
  const [corrReason, setCorrReason] = useState('');
  const [supportingDocName, setSupportingDocName] = useState('Biometric_Device_Punch_Log.pdf');

  const attendance = vendorPortalService.getMonthlyAttendance(activePeriod, activeVendor.id);
  const corrections = vendorPortalService.getAttendanceCorrections(activeVendor.id);
  const employees = vendorPortalService.getEmployees(activeVendor.id);

  const filteredAttendance = attendance.filter(
    (a) =>
      a.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      a.employee_code.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCorrection = (empId?: string) => {
    const target = empId || employees[0]?.id || '';
    setSelectedEmpId(target);
    const rec = attendance.find((a) => a.employee_id === target);
    if (rec) {
      setReqPresentDays(rec.present_days);
      setReqLopDays(rec.lop_days);
      setReqOtHours(rec.ot_hours);
    }
    setIsCorrectionModalOpen(true);
  };

  const handleSubmitCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!corrReason.trim()) {
      showToast('Please provide a specific business justification for this correction');
      return;
    }

    vendorPortalService.submitAttendanceCorrection({
      employee_id: selectedEmpId || employees[0].id,
      month: activePeriod,
      requested_present_days: Number(reqPresentDays),
      requested_lop_days: Number(reqLopDays),
      requested_ot_hours: Number(reqOtHours),
      reason: corrReason,
      supporting_doc_name: supportingDocName,
    });

    showToast('Attendance correction submitted to Client HR for audit review!');
    setIsCorrectionModalOpen(false);
    setCorrReason('');
    onRefresh();
  };

  const handleApproveCorrection = (corrId: string) => {
    vendorPortalService.reviewAttendanceCorrection(corrId, 'APPROVED', 'Approved by Client HR supervisor based on supervisor log sheet.');
    showToast('Attendance correction approved and payroll timesheet recalculated!');
    onRefresh();
  };

  const handleRejectCorrection = (corrId: string) => {
    vendorPortalService.reviewAttendanceCorrection(corrId, 'REJECTED', 'Biometric log does not substantiate overtime claim.');
    showToast('Attendance correction rejected.');
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Monthly Attendance Management & Timesheets
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Period: <strong className="text-indigo-600 font-mono">{activePeriod}</strong> • Biometric & Shift Verified Timesheet Engine
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenCorrection()}
          >
            <FileEdit className="w-4 h-4 mr-1.5" />
            Request Attendance Correction
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'ATTENDANCE'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Employee Timesheets ({attendance.length})
        </button>
        <button
          onClick={() => setActiveTab('CORRECTIONS')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'CORRECTIONS'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Correction Outbox
          {corrections.filter((c) => c.status === 'SUBMITTED').length > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
              {corrections.filter((c) => c.status === 'SUBMITTED').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'ATTENDANCE' && (
        <>
          {/* Search bar */}
          <Card className="p-4">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employee timesheet by name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </Card>

          {/* Attendance Table */}
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead className="font-bold text-gray-700 text-xs">Worker</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs text-center">Working Days</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs text-center">Present Days</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs text-center">LOP Days</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs text-center">OT Hours</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs text-center">Payable Days</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs text-center">Status</TableHead>
                  <TableHead className="font-bold text-gray-700 text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendance.map((rec) => (
                  <TableRow key={rec.id} className="hover:bg-gray-50/50">
                    <TableCell>
                      <div>
                        <div className="font-bold text-xs text-gray-900">{rec.employee_name}</div>
                        <div className="text-[11px] text-gray-500 font-mono">{rec.employee_code}</div>
                      </div>
                    </TableCell>

                    <TableCell className="text-center font-mono text-xs">{rec.total_working_days}</TableCell>

                    <TableCell className="text-center">
                      <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {rec.present_days}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <span
                        className={`font-mono text-xs font-semibold px-2 py-0.5 rounded border ${
                          rec.lop_days > 0
                            ? 'text-rose-700 bg-rose-50 border-rose-100 font-bold'
                            : 'text-gray-500 bg-gray-50 border-gray-100'
                        }`}
                      >
                        {rec.lop_days}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {rec.ot_hours} hrs
                      </span>
                    </TableCell>

                    <TableCell className="text-center font-mono text-xs font-bold text-gray-900">
                      {rec.payable_days}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant="success" size="sm">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {rec.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenCorrection(rec.employee_id)}
                      >
                        <FileEdit className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                        Correct
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {activeTab === 'CORRECTIONS' && (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="font-bold text-gray-700 text-xs">Worker</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs">Original vs Requested</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs">Justification & Evidence</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs">Requested By</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs">Status</TableHead>
                <TableHead className="font-bold text-gray-700 text-xs text-right">HR Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {corrections.map((corr) => (
                <TableRow key={corr.id} className="hover:bg-gray-50/50">
                  <TableCell>
                    <div>
                      <div className="font-bold text-xs text-gray-900">{corr.employee_name}</div>
                      <div className="text-[11px] text-gray-500 font-mono">{corr.employee_code}</div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs space-y-0.5 font-mono">
                      <div>
                        Present:{' '}
                        <span className="text-gray-500 line-through">{corr.original_present_days}</span> →{' '}
                        <strong className="text-emerald-700">{corr.requested_present_days}</strong>
                      </div>
                      <div>
                        LOP:{' '}
                        <span className="text-gray-500 line-through">{corr.original_lop_days}</span> →{' '}
                        <strong className="text-indigo-700">{corr.requested_lop_days}</strong>
                      </div>
                      <div>
                        OT:{' '}
                        <span className="text-gray-500 line-through">{corr.original_ot_hours}</span> →{' '}
                        <strong className="text-indigo-700">{corr.requested_ot_hours}h</strong>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="max-w-xs">
                      <p className="text-xs text-gray-800 font-medium">{corr.reason}</p>
                      {corr.supporting_doc_name && (
                        <div className="flex items-center gap-1 text-[11px] text-indigo-600 mt-1">
                          <FileText className="w-3 h-3" />
                          <span className="underline cursor-pointer">{corr.supporting_doc_name}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs text-gray-700">{corr.requested_by}</div>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(corr.requested_at).toLocaleDateString()}
                    </span>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        corr.status === 'APPROVED'
                          ? 'success'
                          : corr.status === 'REJECTED'
                          ? 'danger'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {corr.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    {corr.status === 'SUBMITTED' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald-600 hover:bg-emerald-50"
                          onClick={() => handleApproveCorrection(corr.id)}
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:bg-rose-50"
                          onClick={() => handleRejectCorrection(corr.id)}
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-400 font-mono">Reviewed</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {corrections.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500 text-xs">
                    Zero attendance correction requests recorded.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Correction Request Modal */}
      <Modal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        title="Submit Attendance Correction Request"
        maxWidth="md"
      >
        <form onSubmit={handleSubmitCorrection} className="space-y-4 p-1">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Contract Worker *</label>
            <select
              value={selectedEmpId}
              onChange={(e) => {
                setSelectedEmpId(e.target.value);
                const rec = attendance.find((a) => a.employee_id === e.target.value);
                if (rec) {
                  setReqPresentDays(rec.present_days);
                  setReqLopDays(rec.lop_days);
                  setReqOtHours(rec.ot_hours);
                }
              }}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.display_name} ({e.employee_code}) - {e.designation}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Requested Present Days</label>
              <input
                type="number"
                min={0}
                max={31}
                value={reqPresentDays}
                onChange={(e) => setReqPresentDays(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Requested LOP Days</label>
              <input
                type="number"
                min={0}
                max={31}
                value={reqLopDays}
                onChange={(e) => setReqLopDays(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Requested OT Hours</label>
              <input
                type="number"
                min={0}
                max={100}
                value={reqOtHours}
                onChange={(e) => setReqOtHours(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Operational Rationale / Reason *
            </label>
            <textarea
              rows={3}
              required
              value={corrReason}
              onChange={(e) => setCorrReason(e.target.value)}
              placeholder="e.g. Biometric punch missing due to device synchronization failure on Line B..."
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Supporting Attachment Name
            </label>
            <input
              type="text"
              value={supportingDocName}
              onChange={(e) => setSupportingDocName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsCorrectionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Submit Correction to Client HR
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
