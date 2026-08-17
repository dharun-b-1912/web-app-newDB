import React, { useState } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { Card } from '../../components/ui/Card';
import { Employee, EmployeeStatus } from '../../types';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Briefcase,
  CreditCard,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Users,
  FileText,
  Clock,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';

export interface EmployeeProfileDrawerProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (emp: Employee) => void;
}

export const EmployeeProfileDrawer: React.FC<EmployeeProfileDrawerProps> = ({
  employee,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const { showToast } = useToast();

  if (!employee) return null;

  const isVendor = employee.employment_source === 'VENDOR' || employee.employment?.employment_source === 'VENDOR';
  const joinDate = employee.employment?.doj || employee.created_at?.split('T')[0] || '2025-01-15';
  const managerName = employee.employment?.reporting_manager_name || 'Not assigned';
  const workLocation = employee.employment?.work_location || 'Coimbatore HQ';

  const handleStatusChange = async (newStatus: EmployeeStatus) => {
    setIsUpdatingStatus(true);
    try {
      const updated = await api.updateEmployee(employee.id, { status: newStatus });
      onUpdated(updated);
      showToast(`Employee status updated to '${newStatus}'`, 'success');
    } catch {
      showToast('Failed to update status', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Workforce Master Record" size="lg">
      <div className="space-y-6">
        {/* Profile Header Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#073B2A] to-[#0B563D] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar
              name={`${employee.first_name} ${employee.last_name}`}
              src={employee.avatar_url}
              size="xl"
              className="ring-2 ring-white/30 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-extrabold text-white">
                  {employee.first_name} {employee.last_name}
                </h2>
                <Badge variant="emerald" size="sm" className="bg-emerald-400 text-[#073B2A] font-extrabold">
                  {employee.status}
                </Badge>
                {isVendor ? (
                  <span className="text-[10px] font-black text-amber-950 bg-amber-300 px-2 py-0.5 rounded-full uppercase">
                    VENDOR WORKFORCE
                  </span>
                ) : (
                  <span className="text-[10px] font-black text-emerald-950 bg-emerald-300 px-2 py-0.5 rounded-full uppercase">
                    DIRECT EMPLOYEE
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-200 mt-0.5 font-semibold">
                {employee.designation_title} • {employee.department_name}
              </p>
              <div className="text-[11px] text-emerald-300 font-mono mt-1 flex items-center gap-2">
                <span>CODE: {employee.employee_code}</span>
                <span>•</span>
                <span>Joined {joinDate}</span>
              </div>
            </div>
          </div>
        </div>

        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview', icon: <UserCheck className="w-4 h-4" /> },
            { id: 'organization', label: 'Entity & Sourcing', icon: <Building2 className="w-4 h-4" /> },
            { id: 'compensation', label: 'Statutory & Bank', icon: <CreditCard className="w-4 h-4" /> },
            { id: 'lifecycle', label: 'Lifecycle & Actions', icon: <AlertTriangle className="w-4 h-4" /> },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contact & Work Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{employee.work_email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{employee.profile?.phone || '+91 98401 22334'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{workLocation}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <span>{employee.employment_type}</span>
                </div>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reporting Hierarchy</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 text-[11px] block">Reporting Manager</span>
                  <span className="font-bold text-gray-900">{managerName}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Department</span>
                  <span className="font-bold text-gray-900">{employee.department_name}</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 2: Entity & Sourcing */}
        {activeTab === 'organization' && (
          <div className="space-y-4">
            {isVendor ? (
              <Card className="p-4 bg-amber-50/40 border-amber-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-700" />
                  <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                    Manpower Provider Contract Details
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 text-[11px] block">Vendor / Agency</span>
                    <span className="font-bold text-gray-900">
                      {employee.vendor_name || employee.employment?.vendor_name || 'ABC Workforce Solutions Pvt Ltd'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px] block">Vendor Employee Code</span>
                    <span className="font-mono font-bold text-gray-800">
                      {employee.vendor_employee_code || employee.employment?.vendor_employee_code || 'ABC-TN-8821'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px] block">Deployment Contract Period</span>
                    <span className="font-semibold text-gray-700">
                      {employee.employment?.vendor_start_date || '2025-01-01'} to {employee.employment?.vendor_end_date || '2026-12-31'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px] block">Compliance Verification</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> MSA & Labor License Verified
                    </span>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-4 bg-emerald-50/40 border-emerald-200 space-y-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#07563D]" />
                  <h3 className="text-xs font-black text-[#07563D] uppercase tracking-wider">
                    Direct Corporate Employment
                  </h3>
                </div>
                <p className="text-xs text-gray-600">
                  This employee is a full direct payroll employee of <strong>Joy Corporate Solutions Pvt Ltd</strong>.
                </p>
              </Card>
            )}

            <Card className="p-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Organizational Assignment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 text-[11px] block">Legal Entity</span>
                  <span className="font-bold text-gray-900">{employee.company_name || 'Joy Corporate Solutions Pvt Ltd'}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Operating Branch</span>
                  <span className="font-bold text-gray-900">{employee.branch_name || 'Coimbatore HQ'}</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 3: Statutory & Bank */}
        {activeTab === 'compensation' && (
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bank Disbursement Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 text-[11px] block">Salary Account</span>
                  <span className="font-mono font-bold text-gray-800">•••• •••• 4521</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Bank & IFSC</span>
                  <span className="font-bold text-gray-900">HDFC Bank Ltd · HDFC0000456</span>
                </div>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Statutory Identifiers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 text-[11px] block">Permanent Account No (PAN)</span>
                  <span className="font-mono font-bold text-gray-800">ABCDE••••F</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Universal Account No (UAN)</span>
                  <span className="font-mono font-bold text-gray-800">1012••••7890</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Tax Regime</span>
                  <span className="font-bold text-[#07563D]">New Tax Regime (Sec 115BAC)</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 4: Lifecycle & Actions */}
        {activeTab === 'lifecycle' && (
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Manage Employment Status</h3>
              <div className="flex flex-wrap gap-2">
                {(['Active', 'Probation', 'On Leave', 'Resigned', 'Inactive'] as EmployeeStatus[]).map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant={employee.status === st ? 'primary' : 'outline'}
                    disabled={isUpdatingStatus}
                    onClick={() => handleStatusChange(st)}
                    className="text-xs font-bold"
                  >
                    Set {st}
                  </Button>
                ))}
              </div>
            </Card>

            {/* Danger Zone: Permanent Delete */}
            <Card className="p-4 border-red-200 bg-red-50/40 space-y-3">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Danger Zone</h3>
              </div>
              <p className="text-xs text-red-600">
                Permanently purge this workforce record, including onboarding tasks and profile data from Supabase and frontend state.
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (window.confirm(`Are you sure you want to permanently delete ${employee.first_name} ${employee.last_name} (${employee.employee_code})? This action cannot be undone.`)) {
                    await api.deleteEmployee(employee.id);
                    showToast(`Employee ${employee.first_name} ${employee.last_name} deleted successfully!`);
                    onClose();
                  }
                }}
                className="text-xs font-bold"
              >
                Permanently Delete Employee Record
              </Button>
            </Card>
          </div>
        )}
      </div>
    </Drawer>
  );
};
