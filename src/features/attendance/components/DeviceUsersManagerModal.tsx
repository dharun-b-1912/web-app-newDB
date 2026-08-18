// src/features/attendance/components/DeviceUsersManagerModal.tsx
// ============================================================================
// WorkForceOS — Biometric Hardware User Pull & Employee Directory Mapper
// Fetches users over LAN TCP socket (Port 4370) and triggers Remote Biometric Enrollment
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
  Radio,
  Zap,
  Power,
  Sparkles,
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

  // Remote Enrollment Modal State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollPin, setEnrollPin] = useState('1005');
  const [enrollEmpId, setEnrollEmpId] = useState('');
  const [enrollFingerIndex, setEnrollFingerIndex] = useState(0); // 0 = Right Thumb, 1 = Right Index, 2 = Left Thumb, 3 = Left Index
  const [isTriggeringEnroll, setIsTriggeringEnroll] = useState(false);
  const [enrollStatusFeedback, setEnrollStatusFeedback] = useState<string | null>(null);

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
      showToast(`Created employee profile for ${user.name} (${newEmp.employee_id || newEmp.id})!`);
      loadDeviceUsers();
      loadEmployees();
    } catch (err: any) {
      showToast(err.message || 'Failed to import employee', 'error');
    }
  };

  const handleAutoMatchAll = async () => {
    if (!device || users.length === 0) return;
    let matchedCount = 0;
    for (const u of users) {
      if (!u.is_mapped) {
        const emp: any = employees.find(
          e =>
            e.employee_code === u.biometric_pin ||
            e.employee_code === `EMP-${u.biometric_pin}` ||
            (e.display_name && e.display_name.toLowerCase() === u.name.toLowerCase())
        );
        if (emp) {
          await biometricGatewayService.mapDeviceUserToEmployee(device.id, u.biometric_pin, emp.id);
          matchedCount++;
        }
      }
    }
    showToast(
      matchedCount > 0
        ? `Auto-matched ${matchedCount} biometric PINs with employees!`
        : 'All eligible PINs are already mapped or need manual matching.'
    );
    loadDeviceUsers();
  };

  const handleTriggerEnrollment = async () => {
    if (!device || !enrollPin.trim()) return;
    setIsTriggeringEnroll(true);
    setEnrollStatusFeedback(null);

    const emp: any = employees.find(e => e.id === enrollEmpId);
    const empName = emp ? (emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()) : `User ${enrollPin}`;

    try {
      const res = await biometricGatewayService.triggerRemoteEnrollment(device.id, {
        pin: enrollPin.trim(),
        fingerIndex: Number(enrollFingerIndex),
        userName: empName,
      });

      setEnrollStatusFeedback(res.message);
      showToast(res.message);

      // If mapped to employee, link automatically
      if (enrollEmpId) {
        await biometricGatewayService.mapDeviceUserToEmployee(device.id, enrollPin.trim(), enrollEmpId);
      }

      loadDeviceUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to trigger enrollment', 'error');
    } finally {
      setIsTriggeringEnroll(false);
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
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] shadow-2xl border border-gray-200/80 flex flex-col overflow-hidden">
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
              variant="primary"
              size="sm"
              onClick={() => setIsEnrollModalOpen(true)}
              className="text-xs rounded-xl bg-[#07563D] hover:bg-[#0b7a57] text-white shadow-xs"
            >
              <Fingerprint className="w-3.5 h-3.5 mr-1.5" />
              Enroll Fingerprint / Face
            </Button>
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
            {unmappedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoMatchAll}
                className="text-[11px] h-7 px-2.5 rounded-lg border-blue-200 text-blue-800 bg-blue-50/60 hover:bg-blue-100"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Auto-Match All
              </Button>
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
              <p className="text-[11px] text-gray-400 mt-1">Enroll users on the physical machine or click "Enroll Fingerprint / Face" above.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200/80 overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 text-[11px] font-bold text-gray-600">
                    <TableHead>PIN (UID)</TableHead>
                    <TableHead>Hardware Name</TableHead>
                    <TableHead>Biometric Credentials</TableHead>
                    <TableHead>Privilege</TableHead>
                    <TableHead>Mapped Employee Profile</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(u => (
                    <TableRow key={u.biometric_pin} className="hover:bg-gray-50/50">
                      <TableCell className="font-mono text-xs font-bold text-gray-900">
                        #{u.biometric_pin}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-gray-800">
                        {u.name}
                        {u.card_number && (
                          <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1 mt-0.5">
                            <CreditCard className="w-3 h-3" /> {u.card_number}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {u.fingerprints_count > 0 ? (
                            <Badge variant="blue" className="text-[10px] gap-1">
                              <Fingerprint className="w-3 h-3" /> {u.fingerprints_count} FP
                            </Badge>
                          ) : null}
                          {u.has_face_enrolled ? (
                            <Badge variant="emerald" className="text-[10px] gap-1">
                              <ScanFace className="w-3 h-3" /> Face
                            </Badge>
                          ) : null}
                          {u.fingerprints_count === 0 && !u.has_face_enrolled ? (
                            <span className="text-[10px] text-gray-400 font-mono">Card/PIN Only</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.privilege === 'Admin' ? 'purple' : 'gray'} className="text-[10px]">
                          {u.privilege}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.is_mapped && u.mapped_employee_name ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div>
                              <div className="text-xs font-bold text-gray-900">{u.mapped_employee_name}</div>
                              <div className="text-[10px] text-gray-500 font-mono">{u.mapped_employee_code}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-700 text-xs">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <span className="font-medium text-[11px]">Unmapped Device User</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {u.is_mapped ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUserForMapping(u);
                                setSelectedEmployeeId(u.mapped_employee_id || '');
                              }}
                              className="text-[11px] h-7 px-2.5 rounded-lg border-gray-200 text-gray-600 hover:text-blue-700"
                            >
                              <Link className="w-3 h-3 mr-1" /> Re-map
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUserForMapping(u);
                                  setSelectedEmployeeId('');
                                }}
                                className="text-[11px] h-7 px-2.5 rounded-lg border-blue-300 text-blue-800 bg-blue-50/50 hover:bg-blue-100"
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

        {/* Remote Enrollment Modal */}
        {isEnrollModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Remote Biometric Enrollment</h4>
                    <p className="text-[10px] text-gray-500 font-mono">Terminal {device.ip_address}:{device.port}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Select Employee to Enroll</label>
                  <select
                    value={enrollEmpId}
                    onChange={e => {
                      setEnrollEmpId(e.target.value);
                      const emp = employees.find(x => x.id === e.target.value);
                      if (emp && emp.employee_code) {
                        setEnrollPin(emp.employee_code.replace(/[^0-9]/g, '') || '1005');
                      }
                    }}
                    className="w-full p-2 text-xs rounded-xl border border-gray-200 bg-white font-medium"
                  >
                    <option value="">-- Choose Employee (Optional) --</option>
                    {employees.map(emp => {
                      const empName = emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name;
                      const empCode = emp.employee_code || emp.employee_id || emp.id;
                      return (
                        <option key={emp.id} value={emp.id}>
                          {empName} ({empCode})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Terminal User PIN *</label>
                    <input
                      type="text"
                      value={enrollPin}
                      onChange={e => setEnrollPin(e.target.value)}
                      placeholder="e.g. 1005"
                      className="w-full p-2 text-xs font-mono font-bold rounded-xl border border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Finger Index *</label>
                    <select
                      value={enrollFingerIndex}
                      onChange={e => setEnrollFingerIndex(Number(e.target.value))}
                      className="w-full p-2 text-xs rounded-xl border border-gray-200 bg-white"
                    >
                      <option value={0}>Right Thumb (#0)</option>
                      <option value={1}>Right Index (#1)</option>
                      <option value={2}>Right Middle (#2)</option>
                      <option value={6}>Left Thumb (#6)</option>
                      <option value={7}>Left Index (#7)</option>
                    </select>
                  </div>
                </div>

                {enrollStatusFeedback && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-emerald-900">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Terminal Sensor Active
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">{enrollStatusFeedback}</p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setIsEnrollModalOpen(false)} className="rounded-xl text-xs">
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isTriggeringEnroll || !enrollPin.trim()}
                  onClick={handleTriggerEnrollment}
                  className="rounded-xl text-xs bg-[#07563D] hover:bg-[#0b7a57] text-white"
                >
                  <Zap className={cn('w-3.5 h-3.5 mr-1', isTriggeringEnroll && 'animate-spin')} />
                  {isTriggeringEnroll ? 'Sending CMD_STARTENROLL...' : 'Trigger Sensor on Device'}
                </Button>
              </div>
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
