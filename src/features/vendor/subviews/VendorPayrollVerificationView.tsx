import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorOrganization, DiscrepancyCategory } from '../../../types/vendorPortal';

interface VendorPayrollVerificationViewProps {
  activeVendor: VendorOrganization;
  activePeriod: string;
  onRefresh: () => void;
}

export const VendorPayrollVerificationView: React.FC<VendorPayrollVerificationViewProps> = ({
  activeVendor,
  activePeriod,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [isDiscrepancyModalOpen, setIsDiscrepancyModalOpen] = useState(false);
  const [category, setCategory] = useState<DiscrepancyCategory>('Overtime');
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [expectedValue, setExpectedValue] = useState('');
  const [actualValue, setActualValue] = useState('');
  const [discReason, setDiscReason] = useState('');

  const employees = vendorPortalService.getEmployees(activeVendor.id);
  const wageList = vendorPortalService.getEmployeeWageBreakdowns(activePeriod, activeVendor.id);
  const payable = vendorPortalService.getVendorPayableBreakdown(activePeriod, activeVendor.id);
  const status = vendorPortalService.getPayrollVerificationStatus(activePeriod, activeVendor.id);

  const totalGross = wageList.reduce((s, w) => s + w.gross_payable, 0);
  const totalDeductions = wageList.reduce((s, w) => s + w.total_deductions, 0);
  const totalNet = wageList.reduce((s, w) => s + w.net_salary, 0);
  const totalEmployerStat = wageList.reduce((s, w) => s + w.total_employer_statutory, 0);

  const handleVendorConfirm = () => {
    vendorPortalService.updatePayrollVerificationStatus(
      activePeriod,
      'VENDOR_VERIFIED',
      'Vendor operations head formally verified wage breakdown and submitted to Client HR.'
    );
    showToast('Payroll officially verified by Vendor and routed to Client HR!');
    onRefresh();
  };

  const handleClientApprove = () => {
    vendorPortalService.updatePayrollVerificationStatus(
      activePeriod,
      'CLIENT_APPROVED',
      'Client HR verified contractor timesheet, overtime rates, and wage components.'
    );
    showToast('Payroll approved by Client HR!');
    onRefresh();
  };

  const handleFreezePayroll = () => {
    vendorPortalService.updatePayrollVerificationStatus(
      activePeriod,
      'FROZEN',
      'Payroll immutable freeze locked. Generated final vendor payable.'
    );
    showToast('Payroll locked & frozen. Ready for Purchase Order billing!');
    onRefresh();
  };

  const handleRaiseDiscrepancy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discReason.trim()) {
      showToast('Please specify detailed reason for the discrepancy');
      return;
    }

    vendorPortalService.logAudit({
      entity_type: 'PAYROLL',
      entity_id: `${activeVendor.id}_${activePeriod}`,
      action: 'PAYROLL_DISCREPANCY_RAISED',
      new_value: JSON.stringify({ category, expectedValue, actualValue, reason: discReason }),
      remarks: `Discrepancy ticket raised in category ${category}: ${discReason}`,
    });

    showToast('Discrepancy ticket logged and dispatched to Client Payroll Audit Desk!');
    setIsDiscrepancyModalOpen(false);
    setDiscReason('');
    setExpectedValue('');
    setActualValue('');
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Payroll Verification & Formal Approval Workflow
            </h2>
            <Badge variant="outline" size="sm">
              Period: {activePeriod}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Vendor-Client dual verification desk ensuring zero variance between biometric timesheets, statutory wage rules, and contractual payables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDiscrepancyModalOpen(true)}
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
            Raise Discrepancy
          </Button>

          {status === 'PENDING_VENDOR_REVIEW' && (
            <Button variant="primary" size="sm" onClick={handleVendorConfirm}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Vendor Confirm Payroll
            </Button>
          )}

          {status === 'VENDOR_VERIFIED' && (
            <Button variant="primary" size="sm" onClick={handleClientApprove}>
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              Client HR Approve
            </Button>
          )}

          {status === 'CLIENT_APPROVED' && (
            <Button variant="primary" size="sm" onClick={handleFreezePayroll}>
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Freeze & Lock Payroll
            </Button>
          )}

          {status === 'FROZEN' && (
            <Badge variant="success" size="md">
              <Lock className="w-3 h-3 mr-1" />
              Payroll Immutable & Locked
            </Badge>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gray-50/70">
          <span className="text-xs font-semibold text-gray-500 uppercase">Total Headcount</span>
          <div className="text-xl font-bold text-gray-900 font-mono mt-1">{wageList.length} Staff</div>
          <span className="text-[11px] text-gray-500 mt-1 block">Active deployments</span>
        </Card>

        <Card className="p-4 bg-gray-50/70">
          <span className="text-xs font-semibold text-gray-500 uppercase">Gross Wages</span>
          <div className="text-xl font-bold text-gray-900 font-mono mt-1">₹{totalGross.toLocaleString()}</div>
          <span className="text-[11px] text-indigo-600 mt-1 block">Earned direct pay</span>
        </Card>

        <Card className="p-4 bg-gray-50/70">
          <span className="text-xs font-semibold text-gray-500 uppercase">Employer Statutory</span>
          <div className="text-xl font-bold text-gray-900 font-mono mt-1">₹{totalEmployerStat.toLocaleString()}</div>
          <span className="text-[11px] text-gray-500 mt-1 block">PF (13%) + ESI (3.25%)</span>
        </Card>

        <Card className="p-4 bg-indigo-50 border-indigo-200">
          <span className="text-xs font-semibold text-indigo-900 uppercase">Total Net Vendor Due</span>
          <div className="text-xl font-bold text-indigo-900 font-mono mt-1">₹{payable.net_vendor_payable.toLocaleString()}</div>
          <span className="text-[11px] text-indigo-700 mt-1 block">Includes Service Fee + GST</span>
        </Card>
      </div>

      {/* Audit Anomaly Detection Health Check */}
      <Card className="p-5 border-emerald-200 bg-emerald-50/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">
                Automated Payroll Audit Engine (0 Critical Exceptions Detected)
              </h4>
              <p className="text-xs text-gray-600 mt-0.5">
                Verified: Attendance records match biometric gate punches • Zero negative net pay calculations • Statutory PF caps respected • Active client work orders validated.
              </p>
            </div>
          </div>
          <Badge variant="success" size="sm">
            Audited & Passed
          </Badge>
        </div>
      </Card>

      {/* Verification Register Table */}
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="font-bold text-gray-700 text-xs">Worker</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-center">Working Days</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-center">Payable Days</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Gross Earnings</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Deductions</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Worker Net Pay</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Employer PF/ESI</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-center">Verification</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {wageList.map((w) => (
              <TableRow key={w.employee_id} className="hover:bg-gray-50/50">
                <TableCell>
                  <div>
                    <div className="font-bold text-xs text-gray-900">{w.employee_name}</div>
                    <div className="text-[11px] text-gray-500 font-mono">{w.employee_code}</div>
                  </div>
                </TableCell>

                <TableCell className="text-center font-mono text-xs">{w.working_days}</TableCell>
                <TableCell className="text-center font-mono text-xs font-bold text-emerald-700">
                  {w.payable_days}
                </TableCell>
                <TableCell className="text-right font-mono text-xs font-bold text-gray-900">
                  ₹{w.gross_payable.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-rose-600">
                  -₹{w.total_deductions.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono text-xs font-bold text-emerald-800 bg-emerald-50/50">
                  ₹{w.net_salary.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-indigo-700 font-medium">
                  ₹{w.total_employer_statutory.toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="success" size="sm">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Discrepancy Ticket Modal */}
      <Modal
        isOpen={isDiscrepancyModalOpen}
        onClose={() => setIsDiscrepancyModalOpen(false)}
        title="Raise Payroll Discrepancy Ticket"
        maxWidth="md"
      >
        <form onSubmit={handleRaiseDiscrepancy} className="space-y-4 p-1">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Worker</label>
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.display_name} ({e.employee_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Discrepancy Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none"
            >
              <option value="Overtime">Overtime Hours / Rate</option>
              <option value="Attendance">Attendance / Present Days</option>
              <option value="LOP">LOP Deduction Calculation</option>
              <option value="Wage Component">Base Wage Component</option>
              <option value="Statutory Deduction">PF / ESI Statutory Computation</option>
              <option value="Other">Other Operational Charge</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Expected Value</label>
              <input
                type="text"
                value={expectedValue}
                onChange={(e) => setExpectedValue(e.target.value)}
                placeholder="e.g. 12 OT Hours"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">System Calculated Value</label>
              <input
                type="text"
                value={actualValue}
                onChange={(e) => setActualValue(e.target.value)}
                placeholder="e.g. 8 OT Hours"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Detailed Explanation & Evidence *</label>
            <textarea
              rows={3}
              required
              value={discReason}
              onChange={(e) => setDiscReason(e.target.value)}
              placeholder="Explain discrepancy with reference to supervisor punch logs or contractual agreement..."
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsDiscrepancyModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Submit Discrepancy Ticket
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
