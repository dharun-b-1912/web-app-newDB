import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import {
  Building2,
  MapPin,
  Clock,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorOrganization } from '../../../types/vendorPortal';

interface VendorAssignmentsViewProps {
  activeVendor: VendorOrganization;
}

export const VendorAssignmentsView: React.FC<VendorAssignmentsViewProps> = ({
  activeVendor,
}) => {
  const [search, setSearch] = useState('');
  const employees = vendorPortalService.getEmployees(activeVendor.id);

  const filtered = employees.filter(
    (e) =>
      e.display_name.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      (e.project_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.work_location || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Client Assignments & Site Deployment
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Track individual work site locations, project allocations, shift rosters, and client authorizations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" size="sm">
            <Building2 className="w-3.5 h-3.5 mr-1" />
            1 Client (Joy Corporate Solutions)
          </Badge>
          <Badge variant="blue" size="sm">
            {employees.length} Active Deployments
          </Badge>
        </div>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by worker name, project, shift, or plant location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="font-bold text-gray-700 text-xs">Contract Employee</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs">Client Organization</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs">Project & Department</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs">Plant / Work Location</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs">Roster Shift</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs">Deployment Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((emp) => (
              <TableRow key={emp.id} className="hover:bg-gray-50/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs">
                      {emp.first_name[0]}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-gray-900">{emp.display_name}</div>
                      <div className="text-[11px] text-gray-500 font-mono">{emp.employee_code}</div>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="text-xs font-semibold text-gray-900">
                    {emp.current_client_name || 'Joy Corporate Solutions Pvt Ltd'}
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">comp-joy-01</span>
                </TableCell>

                <TableCell>
                  <div className="text-xs text-gray-900 font-medium">
                    {emp.project_name || 'Core Precision Production'}
                  </div>
                  <span className="text-[11px] text-gray-500">{emp.department}</span>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1 text-xs text-gray-700">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{emp.work_location || 'Coimbatore Plant 1'}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1 text-xs text-gray-700">
                    <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{emp.shift_name || 'Day Shift (08:30 - 17:30)'}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge variant="success" size="sm">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Deployed
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
