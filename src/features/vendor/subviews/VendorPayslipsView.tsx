import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import {
  Download,
  Search,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorOrganization, EmployeeWageBreakdown } from '../../../types/vendorPortal';

interface VendorPayslipsViewProps {
  activeVendor: VendorOrganization;
  activePeriod: string;
}

export const VendorPayslipsView: React.FC<VendorPayslipsViewProps> = ({
  activeVendor,
  activePeriod,
}) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedWageForSlip, setSelectedWageForSlip] = useState<EmployeeWageBreakdown | null>(null);

  const wageList = vendorPortalService.getEmployeeWageBreakdowns(activePeriod, activeVendor.id);
  const status = vendorPortalService.getPayrollVerificationStatus(activePeriod, activeVendor.id);

  const filtered = wageList.filter(
    (w) =>
      w.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      w.employee_code.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownloadBulk = () => {
    showToast(`Generating and downloading consolidated PDF payslip bundle for ${wageList.length} staff members...`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Worker Payslips & Form 16/Wage Slips
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Compliant digital wage slips generated from frozen payroll for distribution to contract workforce.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={handleDownloadBulk}>
            <Download className="w-4 h-4 mr-1.5" />
            Download Bulk Payslip Package ({wageList.length})
          </Button>
        </div>
      </div>

      {/* Payslip Table */}
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="font-bold text-gray-700 text-xs">Worker</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-center">Payable Days</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Gross Earnings</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Total Deductions</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Net Payable</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-center">Payslip Status</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((w) => (
              <TableRow key={w.employee_id} className="hover:bg-gray-50/50">
                <TableCell>
                  <div>
                    <div className="font-bold text-xs text-gray-900">{w.employee_name}</div>
                    <div className="text-[11px] text-gray-500 font-mono">{w.employee_code}</div>
                  </div>
                </TableCell>

                <TableCell className="text-center font-mono text-xs">{w.payable_days} Days</TableCell>

                <TableCell className="text-right font-mono text-xs text-gray-900">
                  ₹{w.gross_payable.toLocaleString()}
                </TableCell>

                <TableCell className="text-right font-mono text-xs text-rose-600">
                  -₹{w.total_deductions.toLocaleString()}
                </TableCell>

                <TableCell className="text-right font-mono text-xs font-bold text-emerald-800 bg-emerald-50/50">
                  ₹{w.net_salary.toLocaleString()}
                </TableCell>

                <TableCell className="text-center">
                  <Badge variant="success" size="sm">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Generated
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-indigo-600 hover:bg-indigo-50"
                    onClick={() => setSelectedWageForSlip(w)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    View Slip
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Single Payslip Modal */}
      <Modal
        isOpen={!!selectedWageForSlip}
        onClose={() => setSelectedWageForSlip(null)}
        title="Official Monthly Contract Payslip"
        maxWidth="lg"
      >
        {selectedWageForSlip && (
          <div className="space-y-5 p-2 bg-white text-gray-900">
            {/* Payslip Header */}
            <div className="text-center pb-4 border-b border-gray-200">
              <h3 className="font-bold text-base text-gray-900">{activeVendor.name}</h3>
              <p className="text-xs text-gray-500">
                Manpower Contractor to: <strong>Joy Corporate Solutions Pvt Ltd</strong>
              </p>
              <div className="text-xs font-mono font-semibold text-indigo-700 mt-1">
                Payslip for Period: {activePeriod}
              </div>
            </div>

            {/* Worker Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-xl border border-gray-200">
              <div>
                <span className="text-gray-500">Worker Name:</span> <strong>{selectedWageForSlip.employee_name}</strong>
              </div>
              <div>
                <span className="text-gray-500">Employee Code:</span> <strong className="font-mono">{selectedWageForSlip.employee_code}</strong>
              </div>
              <div>
                <span className="text-gray-500">Working Days:</span> <strong>{selectedWageForSlip.working_days} Days</strong>
              </div>
              <div>
                <span className="text-gray-500">Paid Days:</span> <strong className="text-emerald-700">{selectedWageForSlip.payable_days} Days</strong>
              </div>
            </div>

            {/* Earnings vs Deductions Table */}
            <div className="grid grid-cols-2 gap-4">
              {/* Earnings */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 border-b">
                  Earnings Breakdown
                </div>
                <div className="p-3 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span>Basic Wage:</span>
                    <strong className="font-mono">₹{selectedWageForSlip.basic_wage.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>HRA:</span>
                    <strong className="font-mono">₹{selectedWageForSlip.hra.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Special Allowance:</span>
                    <strong className="font-mono">₹{selectedWageForSlip.special_allowance.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between text-indigo-700 font-semibold">
                    <span>Overtime ({selectedWageForSlip.ot_hours} hrs):</span>
                    <strong className="font-mono">+₹{selectedWageForSlip.ot_wages.toLocaleString()}</strong>
                  </div>
                  <div className="pt-2 border-t font-bold flex justify-between">
                    <span>Gross Earnings:</span>
                    <strong className="font-mono">₹{selectedWageForSlip.gross_payable.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 border-b">
                  Deductions Breakdown
                </div>
                <div className="p-3 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span>Provident Fund (PF):</span>
                    <strong className="font-mono text-rose-600">₹{selectedWageForSlip.employee_pf.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>ESI Contribution:</span>
                    <strong className="font-mono text-rose-600">₹{selectedWageForSlip.employee_esi.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Professional Tax (PT):</span>
                    <strong className="font-mono text-rose-600">₹{selectedWageForSlip.professional_tax.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>LWF:</span>
                    <strong className="font-mono text-rose-600">₹{selectedWageForSlip.lwf}</strong>
                  </div>
                  <div className="pt-2 border-t font-bold flex justify-between">
                    <span>Total Deductions:</span>
                    <strong className="font-mono text-rose-700">₹{selectedWageForSlip.total_deductions.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Pay Banner */}
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-900 block">NET TAKE-HOME SALARY</span>
                <span className="text-[11px] text-emerald-700">Disbursed directly to worker bank account</span>
              </div>
              <span className="text-xl font-bold font-mono text-emerald-800">
                ₹{selectedWageForSlip.net_salary.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedWageForSlip(null)}>
                Close
              </Button>
              <Button variant="primary" size="sm" onClick={() => showToast('Printing / exporting PDF payslip...')}>
                <Download className="w-3.5 h-3.5 mr-1" />
                Print Payslip
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
