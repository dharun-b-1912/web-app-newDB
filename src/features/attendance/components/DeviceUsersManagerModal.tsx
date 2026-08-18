// src/features/attendance/components/DeviceUsersManagerModal.tsx
// ============================================================================
// WorkForceOS — Biometric Hardware User Pull & Employee Directory Mapper
// Fetches users over LAN TCP socket (Port 4370) and links to Employee profiles
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Fingerprint,
  ScanFace,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UserPlus,
  Link,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/Table';
import { useToast } from '../../../components/ui/Toast';
import {
  biometricGatewayService,
  BiometricDevice,
  DeviceEnrolledUser,
} from '../../../services/attendance/biometricGatewayService';
import { api } from '../../../services/api';
import { cn } from '../../../lib/utils';

interface DeviceUsersManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: BiometricDevice | null;
}

export const DeviceUsersManagerModal: React.FC<DeviceUsersManagerModalProps> = ({
  isOpen,
  onClose,
  device,
}) => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<DeviceEnrolledUser[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserForMapping, setSelectedUserForMapping] = useState<DeviceEnrolledUser | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  useEffect(() => {
    if (isOpen && device) {
      loadDeviceUsers();
      loadEmployees();
    }
  }, [isOpen, device]);

  const loadEmployees = async () => {
    try {
      const emps = await api.getEmployees();
      setEmployees(emps);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  const loadDeviceUsers = async () => {
    if (!device) return;
    setIsLoading(true);
    try {
      const list = await biometricGatewayService.fetchUsersFromDevice(device.id);
      setUsers(list);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch users over TCP socket', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMapUser = async () => {
    if (!device || !selectedUserForMapping || !selectedEmployeeId) return;
    try {
      await biometricGatewayService.mapDeviceUserToEmployee(
        device.id,
        selectedUserForMapping.biometric_pin,
        selectedEmployeeId
      );
      showToast(`Biometric PIN ${selectedUserForMapping.biometric_pin} mapped successfully!`);
      setSelectedUserForMapping(null);
      setSelectedEmployeeId('');
      loadDeviceUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to map user', 'error');
    }
  };

  const handleImportAsEmployee = async (user: DeviceEnrolledUser) => {
    if (!device) return;
    try {
      const newEmp = await biometricGatewayService.importDeviceUserAsEmployee(
        device.id,
        user,
        'Operations',
        'Staff Member'
      );
      showToast(`Created employee profile for ${user.name} (${newEmp.employee_id})!`);
      loadDeviceUsers();
      loadEmployees();
    } catch (err: any) {
      showToast(err.message || 'Failed to import employee', 'error');
    }
  };

  if (!isOpen || !device) return null;

  const filteredUsers = users.filter(
    u =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.biometric_pin.includes(searchQuery) ||
      (u.mapped_employee_name && u.mapped_employee_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const mappedCount = users.filter(u => u.is_mapped).length;
  const unmappedCount = users.length - mappedCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-gray-200/80 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">Enrolled Users on Hardware Terminal</h3>
                <Badge variant="blue" className="text-[10px] font-mono">
                  TCP {device.ip_address}:{device.port}
                </Badge>
              </div>
              <p className="text-xs text-gray-500">
                {device.device_name} ({device.vendor} {device.model}) • {device.branch}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadDeviceUsers}
              disabled={isLoading}
              className="text-xs rounded-xl"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1', isLoading && 'animate-spin')} />
              Refresh via TCP
            </Button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Stats & Search Bar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs">
            <div className="px-3 py-1.5 bg-white rounded-xl border border-gray-200 font-medium text-gray-700">
              Total Enrolled: <span className="font-bold text-gray-900">{users.length}</span>
            </div>
            <div className="px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-200 font-medium text-emerald-800">
              Mapped to Employee: <span className="font-bold">{mappedCount}</span>
            </div>
            {unmappedCount > 0 && (
              <div className="px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-200 font-medium text-amber-800">
                Unmapped: <span className="font-bold">{unmappedCount}</span>
              </div>
            )}
          </div>

          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search PIN, name or employee..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#07563D]/20 focus:border-[#07563D]"
            />
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="py-16 text-center">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold text-gray-700">Querying TCP Port {device.port} (CMD_USER_RRQ)...</p>
              <p className="text-[11px] text-gray-400 mt-1">Reading biometric templates and user credentials from memory.</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium text-gray-600">No users found on this terminal</p>
              <p className="text-[11px] text-gray-400 mt-1">Enroll users on the physical machine or sync from WorkForceOS.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200/80 overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/70 text-[11px]">
                    <TableHead className="font-bold text-gray-700">Device PIN & Name</TableHead>
                    <TableHead className="font-bold text-gray-700">Biometrics Enrolled</TableHead>
                    <TableHead className="font-bold text-gray-700">Privilege</TableHead>
                    <TableHead className="font-bold text-gray-700">WorkForceOS Directory Link</TableHead>
                    <TableHead className="font-bold text-gray-700 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(u => (
                    <TableRow key={u.biometric_pin} className="hover:bg-blue-50/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">
                            #{u.biometric_pin}
                          </span>
                          <span className="text-xs font-bold text-gray-800">{u.name}</span>
                        </div>
                        {u.card_number && (
                          <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1 mt-0.5">
                            <CreditCard className="w-3 h-3" /> {u.card_number}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs">
                          {u.fingerprints_count > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              <Fingerprint className="w-3 h-3" /> {u.fingerprints_count} FP
                            </span>
                          )}
                          {u.has_face_enrolled && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                              <ScanFace className="w-3 h-3" /> Face
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.privilege === 'Admin' ? 'purple' : 'gray'} className="text-[10px]">
                          {u.privilege}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.is_mapped ? (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>
                              {u.mapped_employee_name} ({u.mapped_employee_code})
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-amber-700 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                            <span>Unlinked Hardware User</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {u.is_mapped ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUserForMapping(u)}
                              className="text-[11px] h-7 px-2.5 rounded-lg border-gray-300"
                            >
                              <Link className="w-3 h-3 mr-1 text-gray-500" /> Re-map
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedUserForMapping(u)}
                                className="text-[11px] h-7 px-2.5 rounded-lg border-blue-300 text-blue-800 bg-blue-50/50"
                              >
                                <Link className="w-3 h-3 mr-1" /> Link Employee
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleImportAsEmployee(u)}
                                className="text-[11px] h-7 px-2.5 rounded-lg bg-[#07563D] hover:bg-[#0b7a57] text-white"
                              >
                                <UserPlus className="w-3 h-3 mr-1" /> Import as Emp
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Map to Employee Pop-up Drawer */}
        {selectedUserForMapping && (
          <div className="p-4 border-t border-gray-200 bg-blue-50/60 flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-700" />
              <div>
                <div className="text-xs font-bold text-gray-900">
                  Link PIN #{selectedUserForMapping.biometric_pin} ({selectedUserForMapping.name})
                </div>
                <div className="text-[11px] text-gray-500">Select employee from company directory to associate with this biometric template</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-hidden"
              >
                <option value="">-- Choose Employee --</option>
                {employees.map(emp => {
                  const empName = emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || 'Employee';
                  const empCode = emp.employee_code || emp.employee_id || emp.id;
                  const dept = emp.department_name || emp.department || 'General';
                  return (
                    <option key={emp.id} value={emp.id}>
                      {empName} ({empCode}) - {dept}
                    </option>
                  );
                })}
              </select>
              <Button
                variant="primary"
                size="sm"
                onClick={handleMapUser}
                disabled={!selectedEmployeeId}
                className="text-xs rounded-xl bg-blue-700 hover:bg-blue-800 text-white"
              >
                Confirm Link
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUserForMapping(null)}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/80 text-xs text-gray-500">
          <div>
            Hardware Protocol: <span className="font-mono text-gray-700 font-semibold">{device.vendor} Standalone Protocol</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
