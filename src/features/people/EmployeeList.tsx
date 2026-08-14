import React, { useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Employee } from '../../types';
import { LayoutGrid, List, Mail, Phone, MapPin, Eye, MoreHorizontal, Building2 } from 'lucide-react';

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
          Try adjusting your search query, department filter, or employment status filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode Switcher Bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Showing <strong className="text-gray-900">{employees.length}</strong> employee profiles
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee Name</TableHead>
              <TableHead>Employee Code</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Designation Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map(emp => (
              <TableRow key={emp.id} className="hover:bg-emerald-50/30">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar name={`${emp.first_name} ${emp.last_name}`} src={emp.avatar_url} size="sm" />
                    <div>
                      <div className="font-bold text-gray-900">
                        {emp.first_name} {emp.last_name}
                      </div>
                      <div className="text-[11px] text-gray-400">{emp.work_email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs font-semibold text-gray-700">{emp.employee_code}</TableCell>
                <TableCell className="text-xs text-gray-700 font-medium">{emp.department_name}</TableCell>
                <TableCell className="text-xs text-gray-700">{emp.designation_title}</TableCell>
                <TableCell>
                  <StatusBadge status={emp.status} />
                </TableCell>
                <TableCell className="text-xs text-gray-500">{emp.work_location}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" leftIcon={<Eye className="w-3.5 h-3.5" />} onClick={() => onSelectEmployee(emp)}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map(emp => (
            <Card
              key={emp.id}
              onClick={() => onSelectEmployee(emp)}
              className="p-5 space-y-4 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={`${emp.first_name} ${emp.last_name}`} src={emp.avatar_url} size="md" />
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-900">
                      {emp.first_name} {emp.last_name}
                    </h3>
                    <p className="text-xs text-gray-500">{emp.designation_title}</p>
                  </div>
                </div>
                <StatusBadge status={emp.status} />
              </div>

              <div className="space-y-1.5 text-xs text-gray-600 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  <span>{emp.department_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span className="truncate">{emp.work_email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>{emp.work_location}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-mono text-gray-400">
                <span>ID: {emp.employee_code}</span>
                <span className="text-[#07563D] font-bold font-sans flex items-center gap-1">
                  View Profile →
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
