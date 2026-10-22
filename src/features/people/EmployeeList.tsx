import React, { useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { Employee } from '../../types';
import { api } from '../../services/api';
import { cn } from '../../lib/utils';
import {
  LayoutGrid,
  List,
  Mail,
  Phone,
  MapPin,
  Eye,
  Building2,
  Users,
  UserCheck,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export interface EmployeeListProps {
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
  onEditEmployee?: (emp: Employee) => void;
  onDeleteEmployee?: (emp: Employee) => void;
  onToggleStatus?: (emp: Employee, newStatus: string) => void;
}

const checkIsVendor = (emp: Employee): boolean => {
  const source = emp.employment_source || emp.employment?.employment_source;
  if (source === 'VENDOR' || source === 'MANPOWER_PROVIDER') return true;
  if (source === 'DIRECT') return false;
  if (emp.vendor_name && emp.vendor_name.trim() !== '') return true;
  if (emp.employment?.vendor_name && emp.employment.vendor_name.trim() !== '') return true;
  if (emp.company_name && emp.company_name.toLowerCase().includes('vendor')) return true;
  return false;
};

export const EmployeeList: React.FC<EmployeeListProps> = ({
  employees,
  onSelectEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onToggleStatus,
}) => {
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [confirmDeleteEmp, setConfirmDeleteEmp] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleStatus = async (emp: Employee) => {
    if (togglingId) return;
    const currentStatus = (emp.status || (emp as any).employment_status || 'Active').toLowerCase();
    const newStatus = (currentStatus === 'active' || currentStatus === 'probation') ? 'Inactive' : 'Active';

    setTogglingId(emp.id);
    try {
      if (onToggleStatus) {
        await onToggleStatus(emp, newStatus);
      } else {
        await api.updateEmployeeStatus(emp.id, newStatus);
        showToast(`✓ ${emp.first_name} ${emp.last_name} marked as ${newStatus}`, 'success');
      }
    } catch {
      showToast('Failed to update employee status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDeleteEmp) return;
    setIsDeleting(true);

    try {
      if (onDeleteEmployee) {
        onDeleteEmployee(confirmDeleteEmp);
      } else {
        await api.deleteEmployee(confirmDeleteEmp.id);
        showToast(`Employee ${confirmDeleteEmp.first_name} ${confirmDeleteEmp.last_name} removed`, 'success');
      }
      setConfirmDeleteEmp(null);
    } catch {
      showToast('Failed to delete employee record', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

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
                <TableHead className="font-bold">Branch / Campus</TableHead>
                <TableHead className="font-bold">Reporting Manager</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="text-right font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => {
                const isVendor = checkIsVendor(emp);
                const managerName = emp.employment?.reporting_manager_name || emp.reporting_manager_name || (emp as any).manager_name || 'Not assigned';
                const rawLocation = (emp.employment?.work_location || emp.work_location || emp.location || '').trim();
                const rawBranch = (emp.branch_name || (emp.employment as any)?.branch_name || '').trim();
                const hasBranch = Boolean(rawBranch);
                const showLocation = Boolean(rawLocation && rawLocation.toLowerCase() !== rawBranch.toLowerCase());
                const status = emp.status || (emp as any).employment_status || 'Active';
                const isActive = status.toLowerCase() === 'active';

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

                    <TableCell>
                      {hasBranch || showLocation ? (
                        <div className="space-y-0.5">
                          {hasBranch && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                              <Building2 className="w-3 h-3 text-[#07563D] shrink-0" />
                              <span className="truncate max-w-[170px]">{rawBranch}</span>
                            </span>
                          )}
                          {showLocation && (
                            <div
                              className={cn(
                                "text-[10px] text-gray-400 flex items-center gap-1 font-medium truncate max-w-[190px]",
                                !hasBranch && "text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 text-[11px] font-bold inline-flex"
                              )}
                              title={rawLocation}
                            >
                              <MapPin className={cn("shrink-0", hasBranch ? "w-2.5 h-2.5 text-gray-400" : "w-3 h-3 text-[#07563D]")} />
                              <span className="truncate">{rawLocation}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 font-normal">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-gray-700 font-medium">
                      {managerName}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={status} />
                        <button
                          type="button"
                          disabled={togglingId === emp.id}
                          title={isActive ? 'Click to Deactivate' : 'Click to Activate'}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(emp);
                          }}
                          className={cn(
                            "relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40",
                            isActive ? "bg-emerald-600" : "bg-gray-300"
                          )}
                        >
                          <span
                            className={cn(
                              "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                              isActive ? "translate-x-3" : "translate-x-0"
                            )}
                          />
                        </button>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSelectEmployee(emp)}
                          className="h-7 w-7 p-0 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEditEmployee ? onEditEmployee(emp) : onSelectEmployee(emp)}
                          className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          title="Edit Employee"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmDeleteEmp(emp)}
                          className="h-7 w-7 p-0 text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
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
            const isVendor = checkIsVendor(emp);
            const status = emp.status || (emp as any).employment_status || 'Active';
            const isActive = status.toLowerCase() === 'active';
            const rawLocation = (emp.employment?.work_location || emp.work_location || emp.location || '').trim();
            const rawBranch = (emp.branch_name || (emp.employment as any)?.branch_name || '').trim();
            const hasBranch = Boolean(rawBranch);
            const showLocation = Boolean(rawLocation && rawLocation.toLowerCase() !== rawBranch.toLowerCase());

            return (
              <Card
                key={emp.id}
                className="p-5 hover:border-emerald-300 hover:shadow-sm transition-all space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {emp.employee_code}
                    </span>
                    {hasBranch ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                        <Building2 className="w-2.5 h-2.5 text-[#07563D] shrink-0" />
                        <span className="truncate max-w-[120px]">{rawBranch}</span>
                      </span>
                    ) : showLocation ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                        <MapPin className="w-2.5 h-2.5 text-[#07563D] shrink-0" />
                        <span className="truncate max-w-[120px]">{rawLocation}</span>
                      </span>
                    ) : null}
                  </div>

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

                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => onSelectEmployee(emp)}
                >
                  <Avatar name={`${emp.first_name} ${emp.last_name}`} src={emp.avatar_url} size="md" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-black text-gray-900 group-hover:text-[#07563D] transition-colors truncate">
                      {emp.first_name} {emp.last_name}
                    </h4>
                    <p className="text-xs text-gray-500 font-medium truncate">{emp.designation_title}</p>
                    <p className="text-[11px] text-gray-400 truncate">{emp.department_name}</p>
                    {showLocation && hasBranch && (
                      <div className="text-[10px] text-gray-400 flex items-center gap-1 truncate pt-0.5" title={rawLocation}>
                        <MapPin className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                        <span className="truncate">{rawLocation}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={status} />
                    <button
                      type="button"
                      disabled={togglingId === emp.id}
                      title={isActive ? 'Click to Deactivate' : 'Click to Activate'}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(emp);
                      }}
                      className={cn(
                        "relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40",
                        isActive ? "bg-emerald-600" : "bg-gray-300"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          isActive ? "translate-x-3" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectEmployee(emp)}
                      className="h-7 w-7 p-0 text-gray-600 hover:text-emerald-700"
                      title="View Details"
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEditEmployee ? onEditEmployee(emp) : onSelectEmployee(emp)}
                      className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmDeleteEmp(emp)}
                      className="h-7 w-7 p-0 text-rose-600 hover:text-rose-800"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteEmp && (
        <Modal
          isOpen={Boolean(confirmDeleteEmp)}
          onClose={() => setConfirmDeleteEmp(null)}
          title="Delete Employee Record"
        >
          <div className="space-y-4 p-2">
            <div className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              <div>
                <p className="font-bold">Permanent Deletion Warning</p>
                <p className="text-rose-700 mt-0.5">
                  Are you sure you want to delete <strong className="text-gray-900">{confirmDeleteEmp.first_name} {confirmDeleteEmp.last_name}</strong> ({confirmDeleteEmp.employee_code})?
                  This action will revoke corporate portal credentials and purge related operational rosters.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDeleteEmp(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteConfirmed}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isDeleting ? 'Deleting...' : 'Confirm & Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

