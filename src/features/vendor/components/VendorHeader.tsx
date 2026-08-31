import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import {
  Building2,
  Calendar,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorOrganization } from '../../../types/vendorPortal';

interface VendorHeaderProps {
  activePeriod: string;
  onChangePeriod: (p: string) => void;
  onRefresh: () => void;
  activeVendor: VendorOrganization;
  onSelectVendor: (vId: string) => void;
  allVendors: VendorOrganization[];
}

export const VendorHeader: React.FC<VendorHeaderProps> = ({
  activePeriod,
  onChangePeriod,
  onRefresh,
  activeVendor,
  onSelectVendor,
  allVendors,
}) => {
  const status = vendorPortalService.getPayrollVerificationStatus(activePeriod, activeVendor.id);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-indigo-100 flex-shrink-0">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              {activeVendor.name}
            </h1>
            <Badge variant="success" size="sm">
              <ShieldCheck className="w-3 h-3 mr-1" />
              {activeVendor.status}
            </Badge>
            <Badge variant="outline" size="sm">
              {activeVendor.code}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-1">
            <span>
              GSTIN: <strong className="text-gray-700 font-mono">{activeVendor.gstin}</strong>
            </span>
            <span>•</span>
            <span>
              PAN: <strong className="text-gray-700 font-mono">{activeVendor.pan}</strong>
            </span>
            <span>•</span>
            <span>
              Svc Charge: <strong className="text-indigo-600 font-semibold">{activeVendor.service_charge_percentage}%</strong>
            </span>
            <span>•</span>
            <span>
              Contact: <strong className="text-gray-700">{activeVendor.contact_person}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Vendor Switcher */}
        {allVendors.length > 1 && (
          <div className="relative">
            <select
              value={activeVendor.id}
              onChange={(e) => onSelectVendor(e.target.value)}
              className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {allVendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Period Selector */}
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700">
          <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
          <select
            value={activePeriod}
            onChange={(e) => onChangePeriod(e.target.value)}
            className="bg-transparent font-semibold text-gray-800 focus:outline-none cursor-pointer"
          >
            <option value="2026-08">August 2026</option>
            <option value="2026-07">July 2026</option>
            <option value="2026-06">June 2026</option>
          </select>
        </div>

        {/* Stage Status Chip */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
          <span>Stage: {status.replace(/_/g, ' ')}</span>
        </div>

        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Sync
        </Button>
      </div>
    </div>
  );
};
