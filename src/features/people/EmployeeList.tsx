import React, { useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Employee } from '../../types';
import { LayoutGrid, List, Mail, Phone, MapPin, Eye, MoreHorizontal, Building2, Users, UserCheck } from 'lucide-react';

export interface EmployeeListProps {
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
}

export const EmployeeList: React.FC<EmployeeListProps> = ({ employees, onSelectEmployee }) => {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  if (employees.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-8 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto text-lg font-bold">
          ?
        </div>
        <h3 className="text-sm font-bold text-gray-900">No Employees Match Filter Criteria</h3>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">
          Try adjusting your search query, department filter, or employment source / status filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode Switcher Bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Showing <strong className="text-gray-900">{employees.length}</strong> workforce records
        </span>

        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
              viewMode === 'table' ? 'bg-white text-[#07563D] shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <List className="w-3.5 h-3.5" /> Table
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
              viewMode === 'grid' ? 'bg-white text-[#07563D] shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Grid
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="font-bold">Employee</TableHead>
                <TableHead className="font-bold">Code</TableHead>
                <TableHead className="font-bold">Workforce Source</TableHead>
                <TableHead className="font-bold">Department & Role</TableHead>
                <TableHead className="font-bold">Reporting Manager</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold">Location</TableHead>
                <TableHead className="text-right font-bold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => {
                const isVendor = emp.employment_source === 'VENDOR' || emp.employment?.employment_source === 'VENDOR';
                const managerName = emp.employment?.reporting_manager_name || 'Not assigned';
                const location = emp.employment?.work_location || 'Coimbatore HQ';

                return (
                  <TableRow key={emp.id} className="hover:bg-emerald-50/20 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar name={`${emp.first_name} ${emp.last_name}`} src={emp.avatar_url} size="sm" />
                        <div>
                          <div className="font-bold text-gray-900 leading-tight">
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div className="text-[11px] text-gray-400">{emp.work_email}</div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                        {emp.employee_code}
                      </span>
                    </TableCell>

                    <TableCell>
                      {isVendor ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Users className="w-3 h-3" /> VENDOR
                          </span>
                          <p className="text-[10px] text-gray-500 font-medium truncate max-w-[140px]">
                            {emp.vendor_name || emp.employment?.vendor_name || 'Manpower Provider'}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <UserCheck className="w-3 h-3" /> DIRECT
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-bold text-gray-900">{emp.designation_title}</div>
                      <div className="text-[11px] text-gray-500">{emp.department_name}</div>
                    </TableCell>

                    <TableCell className="text-xs text-gray-700 font-medium">
                      {managerName}
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={emp.status} />
                    </TableCell>

                    <TableCell className="text-xs text-gray-500 font-medium">
                      {location}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => onSelectEmployee(emp)}
                        className="text-xs font-bold"
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Grid Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => {
            const isVendor = emp.employment_source === 'VENDOR' || emp.employment?.employment_source === 'VENDOR';
            return (
              <Card
                key={emp.id}
                onClick={() => onSelectEmployee(emp)}
                className="p-5 hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {emp.employee_code}
                  </span>
                  {isVendor ? (
                    <span className="text-[10px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      VENDOR
                    </span>
                  ) : (
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      DIRECT
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Avatar name={`${emp.first_name} ${emp.last_name}`} src={emp.avatar_url} size="md" />
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-gray-900 group-hover:text-[#07563D] transition-colors truncate">
                      {emp.first_name} {emp.last_name}
                    </h4>
                    <p className="text-xs text-gray-500 font-medium truncate">{emp.designation_title}</p>
                    <p className="text-[11px] text-gray-400 truncate">{emp.department_name}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <StatusBadge status={emp.status} />
                  <span className="text-gray-400 text-[11px]">{emp.employment?.work_location || 'Coimbatore HQ'}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
