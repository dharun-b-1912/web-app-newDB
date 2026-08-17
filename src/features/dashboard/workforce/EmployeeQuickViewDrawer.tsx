import React from 'react';
import { Drawer } from '../../../components/ui/Drawer';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import {
  User,
  Building2,
  MapPin,
  Calendar,
  UserCheck,
  FileText,
  Clock,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { Employee } from '../../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onNavigate: (route: string) => void;
}

export const EmployeeQuickViewDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  employee,
  onNavigate,
}) => {
  if (!employee) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Employee Quick Summary"
      subtitle={`${employee.employee_code} · ${employee.department_name || 'Department'}`}
      width="lg"
    >
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* Header Profile Card */}
        <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 flex items-center gap-4">
          <Avatar
            name={`${employee.first_name} ${employee.last_name}`}
            src={employee.avatar_url}
            size="lg"
            className="w-16 h-16 rounded-2xl ring-2 ring-emerald-500 shadow-sm flex-shrink-0"
          />
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900 truncate">
                {employee.first_name} {employee.last_name}
              </h3>
              <Badge variant="emerald" size="xs">
                {employee.status || 'Active'}
              </Badge>
            </div>
            <p className="text-xs font-semibold text-[#07563D] truncate">
              {employee.designation_title || 'Software Engineer'}
            </p>
            <p className="text-[11px] text-gray-400 font-medium truncate">
              {employee.work_email} · {employee.profile?.phone || 'No phone'}
            </p>
          </div>
        </div>

        {/* Key Operational Details */}
        <div className="space-y-3 text-xs">
          <h4 className="font-bold text-gray-900 uppercase text-[11px] tracking-wider">
            Employment & Hierarchy
          </h4>

          <div className="p-4 rounded-xl bg-white border border-gray-200 space-y-2.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Department:</span>
              <span className="font-bold text-gray-900">{employee.department_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Reporting Manager:</span>
              <span className="font-bold text-gray-900">
                {employee.employment?.reporting_manager_name || 'Unassigned'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Employment Type:</span>
              <span className="font-semibold text-gray-900">{employee.employment_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Work Mode:</span>
              <span className="font-semibold text-gray-900">
                {employee.employment?.work_mode || 'Hybrid'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date of Joining:</span>
              <span className="font-bold text-gray-900">
                {employee.employment?.doj || employee.created_at?.slice(0, 10)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <Button
            size="md"
            variant="primary"
            onClick={() => {
              onClose();
              onNavigate('people');
            }}
            className="w-full text-xs font-bold bg-[#07563D] hover:bg-[#064e37] text-white justify-center shadow-sm"
          >
            <User className="w-4 h-4 mr-1.5" />
            Open Full Employee Profile
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                onClose();
                onNavigate('attendance');
              }}
              className="text-xs font-semibold bg-white text-gray-700 justify-center"
            >
              <UserCheck className="w-3.5 h-3.5 mr-1" />
              Attendance
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                onClose();
                onNavigate('leave-dashboard');
              }}
              className="text-xs font-semibold bg-white text-gray-700 justify-center"
            >
              <Calendar className="w-3.5 h-3.5 mr-1" />
              Leave Ledger
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
