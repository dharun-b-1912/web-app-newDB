import React, { useState } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { Card } from '../../components/ui/Card';
import { Employee, EmployeeStatus } from '../../types';
import { Mail, Phone, MapPin, Calendar, Building2, Briefcase, CreditCard, ShieldCheck, UserCheck, AlertTriangle } from 'lucide-react';
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

  const handleStatusChange = async (newStatus: EmployeeStatus) => {
    setIsUpdatingStatus(true);
    try {
      const updated = await api.updateEmployeeStatus(employee.id, newStatus);
      onUpdated(updated);
      showToast(`Employee status updated to '${newStatus}'`);
    } catch {
      showToast('Failed to update status', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Employee Master Profile" size="lg">
      <div className="space-y-6">
        {/* Profile Header Header Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#073B2A] to-[#0B563D] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar
              name={`${employee.first_name} ${employee.last_name}`}
              src={employee.avatar_url}
              size="xl"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white">
                  {employee.first_name} {employee.last_name}
                </h2>
                <Badge variant="emerald" size="sm" className="bg-emerald-400 text-[#073B2A] font-extrabold">
                  {employee.status}
                </Badge>
              </div>
              <p className="text-xs text-emerald-200 mt-0.5">{employee.designation_title}</p>
              <div className="text-[11px] text-emerald-300 font-mono mt-1">
                EMP ID: {employee.employee_code} • Joined {employee.joining_date}
              </div>
            </div>
          </div>
        </div>

        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview', icon: <UserCheck className="w-4 h-4" /> },
            { id: 'organization', label: 'Entity & Dept', icon: <Building2 className="w-4 h-4" /> },
            { id: 'compensation', label: 'Compensation & Tax', icon: <CreditCard className="w-4 h-4" /> },
            { id: 'lifecycle', label: 'Status & Lifecycle', icon: <AlertTriangle className="w-4 h-4" /> },
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
                  <span>{employee.phone_number || '+91 98765 43210'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{employee.work_location}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <span>Type: {employee.employment_type}</span>
                </div>
              </div>
            </Card>

            <Card className="p-4 space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reporting Hierarchy</h3>
              <div className="flex items-center gap-3 pt-1">
                <Avatar name={employee.reporting_manager_name || 'HR Admin'} size="sm" />
                <div>
                  <div className="text-xs font-bold text-gray-900">
                    {employee.reporting_manager_name || 'Ananya Rao (HR Director)'}
                  </div>
                  <div className="text-[11px] text-gray-400">Primary Reporting Manager</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 2: Entity & Dept */}
        {activeTab === 'organization' && (
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Legal & Organizational Mapping</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Legal Company Entity:</span>
                  <span className="font-bold text-gray-900">{employee.company_name || 'Joy Corporate Solutions Pvt Ltd'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Department Unit:</span>
                  <span className="font-bold text-gray-900">{employee.department_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Designation Title:</span>
                  <span className="font-bold text-gray-900">{employee.designation_title}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Branch Campus:</span>
                  <span className="font-bold text-gray-900">{employee.work_location}</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 3: Compensation */}
        {activeTab === 'compensation' && (
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Compensation Breakdown</h3>
              <div className="p-4 rounded-xl bg-emerald-50 text-[#07563D] flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Annual Fixed CTC</div>
                  <div className="text-2xl font-black text-[#07563D] mt-0.5">
                    ₹{(employee.annual_ctc || 1800000).toLocaleString('en-IN')} / yr
                  </div>
                </div>
                <Badge variant="emerald" className="bg-[#07563D] text-white">
                  INR
                </Badge>
              </div>

              <div className="pt-2 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">PAN Identifier:</span>
                  <span className="font-mono font-bold text-gray-900">{employee.pan_number || 'ABCDE1234F'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Universal Account No (UAN):</span>
                  <span className="font-mono font-bold text-gray-900">{employee.uan_number || '101234567890'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Provident Fund (PF) No:</span>
                  <span className="font-mono font-bold text-gray-900">TN/CBE/0034120/000/1004</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 4: Lifecycle & Status */}
        {activeTab === 'lifecycle' && (
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Employment Lifecycle Status</h3>
              <p className="text-xs text-gray-500">
                Current State: <strong className="text-gray-900">{employee.status}</strong>
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  size="sm"
                  variant={employee.status === 'Active' ? 'default' : 'outline'}
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusChange('Active')}
                >
                  Active
                </Button>
                <Button
                  size="sm"
                  variant={employee.status === 'Probation' ? 'default' : 'outline'}
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusChange('Probation')}
                >
                  Probation
                </Button>
                <Button
                  size="sm"
                  variant={employee.status === 'On Leave' ? 'default' : 'outline'}
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusChange('On Leave')}
                >
                  On Leave
                </Button>
                <Button
                  size="sm"
                  variant={employee.status === 'Resigned' ? 'default' : 'outline'}
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusChange('Resigned')}
                >
                  Resigned
                </Button>
                <Button
                  size="sm"
                  variant={employee.status === 'Terminated' ? 'default' : 'outline'}
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusChange('Terminated')}
                >
                  Terminated
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Drawer>
  );
};
