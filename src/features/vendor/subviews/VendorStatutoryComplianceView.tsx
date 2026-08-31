import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import {
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorOrganization } from '../../../types/vendorPortal';

interface VendorStatutoryComplianceViewProps {
  activeVendor: VendorOrganization;
  activePeriod: string;
}

export const VendorStatutoryComplianceView: React.FC<VendorStatutoryComplianceViewProps> = ({
  activeVendor,
  activePeriod,
}) => {
  const challans = vendorPortalService.getStatutoryChallans(activePeriod, activeVendor.id);
  const payable = vendorPortalService.getVendorPayableBreakdown(activePeriod, activeVendor.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Statutory Compliance & Remittance Challans
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Official EPFO, ESIC, and State Labour Welfare remittance proof, TRRN tracking, and electronic receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" size="sm">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            100% Compliant
          </Badge>
        </div>
      </div>

      {/* Compliance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 uppercase">EPFO (PF) Compliance</span>
            <Badge variant="success" size="sm">
              Remitted
            </Badge>
          </div>
          <div className="text-2xl font-bold text-indigo-950 font-mono mt-2">
            ₹{(payable.total_employer_pf + Math.round(payable.total_gross_wages * 0.12)).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-2 space-y-0.5">
            <div>Employer Share (13%): ₹{payable.total_employer_pf.toLocaleString()}</div>
            <div>Employee Share (12%): ₹{Math.round(payable.total_gross_wages * 0.12).toLocaleString()}</div>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 uppercase">ESIC Compliance</span>
            <Badge variant="success" size="sm">
              Remitted
            </Badge>
          </div>
          <div className="text-2xl font-bold text-blue-950 font-mono mt-2">
            ₹{(payable.total_employer_esi + Math.round(payable.total_gross_wages * 0.0075)).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-2 space-y-0.5">
            <div>Employer Share (3.25%): ₹{payable.total_employer_esi.toLocaleString()}</div>
            <div>Employee Share (0.75%): ₹{Math.round(payable.total_gross_wages * 0.0075).toLocaleString()}</div>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase">Labour Welfare Fund</span>
            <Badge variant="success" size="sm">
              Compliant
            </Badge>
          </div>
          <div className="text-2xl font-bold text-emerald-950 font-mono mt-2">
            ₹{(payable.headcount * 30).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-2 space-y-0.5">
            <div>Headcount Covered: {payable.headcount} Workers</div>
            <div>State: Tamil Nadu Labour Board</div>
          </div>
        </Card>
      </div>

      {/* Challans Table */}
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="font-bold text-gray-700 text-xs">Statutory Body</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs">TRRN / Challan Ref</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-center">Headcount</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Wage Base</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Total Remitted</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-center">Status</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Receipt Document</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {challans.map((ch) => (
              <TableRow key={ch.id} className="hover:bg-gray-50/50">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-bold text-xs text-gray-900">{ch.type === 'PF' ? 'EPFO (Provident Fund)' : 'ESIC (Health Insurance)'}</div>
                      <span className="text-[10px] text-gray-400 font-mono">Period: {ch.period}</span>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="font-mono text-xs font-semibold text-indigo-700">
                  {ch.trrn_or_challan_no}
                </TableCell>

                <TableCell className="text-center font-mono text-xs">{ch.headcount} Staff</TableCell>

                <TableCell className="text-right font-mono text-xs text-gray-700">
                  ₹{ch.wage_base.toLocaleString()}
                </TableCell>

                <TableCell className="text-right font-mono text-xs font-bold text-gray-900">
                  ₹{ch.total_remitted.toLocaleString()}
                </TableCell>

                <TableCell className="text-center">
                  <Badge variant="success" size="sm">
                    {ch.status}
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  <span className="text-xs text-indigo-600 font-medium flex items-center justify-end gap-1 cursor-pointer hover:underline">
                    <FileText className="w-3.5 h-3.5" />
                    {ch.receipt_doc_url}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
