import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import {
  Calculator,
  Search,
} from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorOrganization, EmployeeWageBreakdown } from '../../../types/vendorPortal';
import { CalculationModal } from '../components/CalculationModal';

interface VendorWageBreakdownViewProps {
  activeVendor: VendorOrganization;
  activePeriod: string;
}

export const VendorWageBreakdownView: React.FC<VendorWageBreakdownViewProps> = ({
  activeVendor,
  activePeriod,
}) => {
  const [search, setSearch] = useState('');
  const [calcModalData, setCalcModalData] = useState<any | null>(null);

  const wageList = vendorPortalService.getEmployeeWageBreakdowns(activePeriod, activeVendor.id);

  const filtered = wageList.filter(
    (w) =>
      w.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      w.employee_code.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenLopFormula = (emp: EmployeeWageBreakdown) => {
    setCalcModalData({
      title: `Loss of Pay (LOP) Deduction for ${emp.employee_name}`,
      category: 'Attendance Deduction',
      explanation: 'Deduction applied pro-rata against unworked calendar shifts in accordance with certified wage rules.',
      formula: '(Monthly Gross Wage / Total Payroll Days) × LOP Days',
      inputs: [
        { label: 'Monthly Base Gross Wage', value: emp.monthly_gross, source: 'Employee Master Contract' },
        { label: 'Total Calendar Payroll Days', value: emp.working_days, source: 'Monthly Calendar' },
        { label: 'Verified Unapproved LOP Days', value: emp.lop_days, source: 'Biometric Attendance Engine' },
      ],
      result: (emp.monthly_gross / emp.working_days) * emp.lop_days,
    });
  };

  const handleOpenNetFormula = (emp: EmployeeWageBreakdown) => {
    setCalcModalData({
      title: `Net Salary Formulation for ${emp.employee_name}`,
      category: 'Worker Payroll Settlement',
      explanation: 'Gross payable earnings plus approved overtime compensation minus mandatory statutory employee contributions and professional tax.',
      formula: 'Gross Payable + OT Wages - (Employee PF + Employee ESI + Professional Tax + LWF)',
      inputs: [
        { label: 'Gross Payable (After LOP)', value: emp.gross_payable, source: 'Wage Register' },
        { label: 'Overtime Wages (Double Rate)', value: emp.ot_wages, source: `${emp.ot_hours} OT Hours @ 2x Hourly Rate` },
        { label: 'Employee PF (12% of Basic)', value: emp.employee_pf, source: 'EPFO Regulations' },
        { label: 'Employee ESI (0.75% of Gross)', value: emp.employee_esi, source: 'ESIC Regulations' },
        { label: 'Professional Tax (PT)', value: emp.professional_tax, source: 'State Revenue Slab' },
      ],
      result: emp.net_salary,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Worker Wage Breakdown & Formula Transparency
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Complete mathematical breakdown of earnings, deductions, and statutory bases with audit-traceable formula verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" size="sm">
            Period: {activePeriod}
          </Badge>
          <Badge variant="blue" size="sm">
            {wageList.length} Contract Records
          </Badge>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search worker by name or employee code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </Card>

      {/* Wage Table */}
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="font-bold text-gray-700 text-xs">Worker</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Monthly Gross</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-center">Days (P / LOP)</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Gross Payable</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">OT Wages</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">PF (12%)</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">ESI (0.75%)</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Net Take-Home</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-center">Explain</TableHead>
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

                <TableCell className="text-right font-mono text-xs text-gray-700">
                  ₹{w.monthly_gross.toLocaleString()}
                </TableCell>

                <TableCell className="text-center font-mono text-xs">
                  <span className="text-emerald-700 font-bold">{w.present_days}</span> /{' '}
                  <span className={w.lop_days > 0 ? 'text-rose-600 font-bold' : 'text-gray-400'}>
                    {w.lop_days}
                  </span>
                </TableCell>

                <TableCell className="text-right font-mono text-xs font-bold text-gray-900">
                  ₹{w.gross_payable.toLocaleString()}
                </TableCell>

                <TableCell className="text-right font-mono text-xs text-indigo-600 font-semibold">
                  +₹{w.ot_wages.toLocaleString()}
                </TableCell>

                <TableCell className="text-right font-mono text-xs text-rose-600">
                  -₹{w.employee_pf.toLocaleString()}
                </TableCell>

                <TableCell className="text-right font-mono text-xs text-rose-600">
                  -₹{w.employee_esi.toLocaleString()}
                </TableCell>

                <TableCell className="text-right font-mono text-xs font-bold text-emerald-800 bg-emerald-50/60 px-3">
                  ₹{w.net_salary.toLocaleString()}
                </TableCell>

                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-indigo-600 hover:bg-indigo-50"
                    onClick={() => handleOpenNetFormula(w)}
                  >
                    <Calculator className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Formula Modal */}
      {calcModalData && (
        <CalculationModal
          isOpen={!!calcModalData}
          onClose={() => setCalcModalData(null)}
          {...calcModalData}
        />
      )}
    </div>
  );
};
