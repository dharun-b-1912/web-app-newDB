import React, { useState, useRef, useEffect } from 'react';
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
  MapPin,
  Eye,
  Building2,
  Users,
  UserCheck,
  Pencil,
  Trash2,
  AlertTriangle,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Clock,
  LogOut,
  Shield,
  ShieldCheck,
  UserX,
  CheckCircle2,
  FileText,
  Archive,
} from 'lucide-react';

export type SortField = 'name' | 'code' | 'department' | 'designation' | 'status' | 'none';
export type SortDir = 'asc' | 'desc';

export interface EmployeeListProps {
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
  onEditEmployee?: (emp: Employee) => void;
  onDeleteEmployee?: (emp: Employee) => void;
  onArchiveEmployee?: (emp: Employee, reason?: string) => Promise<void> | void;
  onToggleStatus?: (emp: Employee, newStatus: string) => void;
  onViewAttendance?: (emp: Employee) => void;
  onViewDocuments?: (emp: Employee) => void;
  onManageAccess?: (emp: Employee) => void;
  onStartOffboarding?: (emp: Employee) => void;
  sortField?: SortField;
  sortDir?: SortDir;
  onSort?: (field: SortField) => void;
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

// ─── Row Action Dropdown ──────────────────────────────────────────────────────
interface ActionMenuProps {
  emp: Employee;
  onView: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onArchive: () => void;
  onViewAttendance?: () => void;
  onViewDocuments?: () => void;
  onManageAccess?: () => void;
  onStartOffboarding?: () => void;
  isActive: boolean;
  isToggling: boolean;
}

const RowActionMenu: React.FC<ActionMenuProps> = ({
  emp,
  onView,
  onEdit,
  onToggleStatus,
  onArchive,
  onViewAttendance,
  onViewDocuments,
  onManageAccess,
  onStartOffboarding,
  isActive,
  isToggling,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const item = (icon: React.ReactNode, label: string, onClick: () => void, cls = '') => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setOpen(false);
        onClick();
      }}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold rounded-lg transition-colors hover:bg-gray-50 cursor-pointer',
        cls
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        className={cn(
          'h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 hover:border-gray-300 transition-all cursor-pointer',
          open && 'bg-gray-100 border-gray-300 text-gray-900'
        )}
        title="More administrative actions"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-gray-100 mb-0.5 bg-gray-50/70">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider truncate">
              {emp.first_name} {emp.last_name} ({emp.employee_code || 'No Code'})
            </p>
          </div>

          {item(<Eye className="w-3.5 h-3.5 text-emerald-600" />, 'View Profile & 360°', onView, 'text-gray-700')}
          {item(<Pencil className="w-3.5 h-3.5 text-blue-600" />, 'Edit Master Record', onEdit, 'text-gray-700')}

          <div className="my-1 border-t border-gray-100" />

          {item(
            <Clock className="w-3.5 h-3.5 text-purple-600" />,
            'View Attendance & Logs',
            () => {
              if (onViewAttendance) {
                onViewAttendance();
              } else {
                const code = emp.employee_code || '';
                window.dispatchEvent(new CustomEvent('navigate', { detail: { nav: 'attendance-employees', query: code, employeeId: emp.id } }));
              }
            },
            'text-gray-700'
          )}
          {item(
            <FileText className="w-3.5 h-3.5 text-indigo-600" />,
            'Employment Documents',
            () => {
              if (onViewDocuments) {
                onViewDocuments();
              } else {
                window.dispatchEvent(new CustomEvent('navigate', { detail: { nav: 'documents', employeeId: emp.id, search: emp.employee_code || emp.first_name } }));
              }
            },
            'text-gray-700'
          )}
          {item(
            <Shield className="w-3.5 h-3.5 text-slate-600" />,
            'Manage Access & IAM',
            () => {
              if (onManageAccess) {
                onManageAccess();
              } else {
                window.dispatchEvent(new CustomEvent('navigate', { detail: { nav: 'admin-roles', employeeId: emp.id } }));
              }
            },
            'text-gray-700'
          )}

          <div className="my-1 border-t border-gray-100" />

          {item(
            isActive
              ? <UserX className="w-3.5 h-3.5 text-amber-600" />
              : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
            isActive ? (isToggling ? 'Deactivating…' : 'Deactivate from Roster') : (isToggling ? 'Activating…' : 'Activate to Roster'),
            onToggleStatus,
            isActive ? 'text-amber-700' : 'text-emerald-700'
          )}
          {item(
            <LogOut className="w-3.5 h-3.5 text-rose-500" />,
            'Start Offboarding & Exit',
            () => {
              if (onStartOffboarding) {
                onStartOffboarding();
              } else {
                window.dispatchEvent(new CustomEvent('navigate', { detail: { nav: 'offboarding', employeeId: emp.id, code: emp.employee_code } }));
              }
            },
            'text-rose-700'
          )}

          <div className="my-1 border-t border-gray-100" />

          {item(
            <Archive className="w-3.5 h-3.5 text-slate-600" />,
            'Archive Record (Safe)',
            onArchive,
            'text-slate-700 hover:bg-slate-50'
          )}
        </div>
      )}
    </div>
  );
};

// ─── Sortable Column Header ────────────────────────────────────────────────────
interface SortableHeadProps {
  label: string;
  field: SortField;
  active: SortField;
  dir: SortDir;
  onSort?: (f: SortField) => void;
}
const SortableHead: React.FC<SortableHeadProps> = ({ label, field, active, dir, onSort }) => {
  const isActive = active === field;
  return (
    <TableHead
      className={cn('font-bold cursor-pointer select-none group', onSort && 'hover:bg-gray-100/60 transition-colors')}
      onClick={() => onSort?.(field)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {onSort && (
          <span className="ml-0.5 text-gray-400 group-hover:text-gray-600 transition-colors">
            {isActive ? (
              dir === 'asc' ? <ChevronUp className="w-3 h-3 text-[#07563D]" /> : <ChevronDown className="w-3 h-3 text-[#07563D]" />
            ) : (
              <ChevronsUpDown className="w-3 h-3 opacity-40" />
            )}
          </span>
        )}
      </div>
    </TableHead>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export const EmployeeList: React.FC<EmployeeListProps> = ({
  employees,
  onSelectEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onArchiveEmployee,
  onToggleStatus,
  onViewAttendance,
  onViewDocuments,
  onManageAccess,
  onStartOffboarding,
  sortField = 'none',
  sortDir = 'asc',
  onSort,
}) => {
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [confirmArchiveEmp, setConfirmArchiveEmp] = useState<Employee | null>(null);
  const [archiveReason, setArchiveReason] = useState('Standard separation & exit completed');
  const [isArchiving, setIsArchiving] = useState(false);
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

  const handleArchiveConfirmed = async () => {
    if (!confirmArchiveEmp) return;
    setIsArchiving(true);
    try {
      if (onArchiveEmployee) {
        await onArchiveEmployee(confirmArchiveEmp, archiveReason);
      } else if (onDeleteEmployee) {
        onDeleteEmployee(confirmArchiveEmp);
      } else {
        await api.updateEmployeeStatus(confirmArchiveEmp.id, 'Archived');
        showToast(`✓ ${confirmArchiveEmp.first_name} ${confirmArchiveEmp.last_name} archived. Historical records preserved.`, 'success');
      }
      setConfirmArchiveEmp(null);
    } catch (err: any) {
      showToast('Failed to archive employee record', 'error');
    } finally {
      setIsArchiving(false);
    }
  };

  if (employees.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 text-gray-300 flex items-center justify-center mx-auto">
          <Users className="w-7 h-7" />
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
                <SortableHead label="Employee" field="name" active={sortField} dir={sortDir} onSort={onSort} />
                <SortableHead label="Code" field="code" active={sortField} dir={sortDir} onSort={onSort} />
                <TableHead className="font-bold">Workforce Source</TableHead>
                <SortableHead label="Department & Role" field="department" active={sortField} dir={sortDir} onSort={onSort} />
                <TableHead className="font-bold">Branch / Campus</TableHead>
                <TableHead className="font-bold">Reporting Manager</TableHead>
                <SortableHead label="Status" field="status" active={sortField} dir={sortDir} onSort={onSort} />
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
                  <TableRow
                    key={emp.id}
                    className="hover:bg-emerald-50/20 transition-colors cursor-pointer"
                    onClick={() => onSelectEmployee(emp)}
                  >
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
                                'text-[10px] text-gray-400 flex items-center gap-1 font-medium truncate max-w-[190px]',
                                !hasBranch && 'text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 text-[11px] font-bold inline-flex'
                              )}
                              title={rawLocation}
                            >
                              <MapPin className={cn('shrink-0', hasBranch ? 'w-2.5 h-2.5 text-gray-400' : 'w-3 h-3 text-[#07563D]')} />
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
                      <StatusBadge status={status} />
                    </TableCell>

                    <TableCell className="text-right">
                      <RowActionMenu
                        emp={emp}
                        isActive={isActive}
                        isToggling={togglingId === emp.id}
                        onView={() => onSelectEmployee(emp)}
                        onEdit={() => onEditEmployee ? onEditEmployee(emp) : onSelectEmployee(emp)}
                        onToggleStatus={() => handleToggleStatus(emp)}
                        onArchive={() => setConfirmArchiveEmp(emp)}
                        onViewAttendance={onViewAttendance ? () => onViewAttendance(emp) : undefined}
                        onViewDocuments={onViewDocuments ? () => onViewDocuments(emp) : undefined}
                        onManageAccess={onManageAccess ? () => onManageAccess(emp) : undefined}
                        onStartOffboarding={onStartOffboarding ? () => onStartOffboarding(emp) : undefined}
                      />
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
                  <StatusBadge status={status} />
                  <RowActionMenu
                    emp={emp}
                    isActive={isActive}
                    isToggling={togglingId === emp.id}
                    onView={() => onSelectEmployee(emp)}
                    onEdit={() => onEditEmployee ? onEditEmployee(emp) : onSelectEmployee(emp)}
                    onToggleStatus={() => handleToggleStatus(emp)}
                    onArchive={() => setConfirmArchiveEmp(emp)}
                    onViewAttendance={onViewAttendance ? () => onViewAttendance(emp) : undefined}
                    onViewDocuments={onViewDocuments ? () => onViewDocuments(emp) : undefined}
                    onManageAccess={onManageAccess ? () => onManageAccess(emp) : undefined}
                    onStartOffboarding={onStartOffboarding ? () => onStartOffboarding(emp) : undefined}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Archive / Deactivate Confirmation Modal */}
      {confirmArchiveEmp && (
        <Modal
          isOpen={Boolean(confirmArchiveEmp)}
          onClose={() => setConfirmArchiveEmp(null)}
          title="Archive Employee Record (Enterprise Safe)"
        >
          <div className="space-y-4 p-2">
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
              <ShieldCheck className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Historical Record Protection & Safe Separation</p>
                <p className="text-amber-800 leading-relaxed">
                  Archiving <strong className="text-gray-900">{confirmArchiveEmp.first_name} {confirmArchiveEmp.last_name}</strong> ({confirmArchiveEmp.employee_code}) preserves all historical attendance logs, biometric clockings, digital payslips, and statutory tax calculations for compliance.
                </p>
                <p className="text-amber-800 text-[11px]">
                  • Portal access sessions will be terminated.<br />
                  • Employee will be excluded from daily biometric rosters.<br />
                  • Historical payroll records remain permanently accessible for audits.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Reason for Archival / Separation
              </label>
              <select
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl p-2.5 font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
              >
                <option value="Standard separation & exit completed">Standard separation & exit completed</option>
                <option value="Resignation Accepted">Resignation Accepted</option>
                <option value="Contract Expired / Vendor Rolled Off">Contract Expired / Vendor Rolled Off</option>
                <option value="Administrative Separation">Administrative Separation</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmArchiveEmp(null)}
                disabled={isArchiving}
              >
                Cancel — Keep Active
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleArchiveConfirmed}
                disabled={isArchiving}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                {isArchiving ? 'Archiving…' : 'Confirm & Archive Record'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
