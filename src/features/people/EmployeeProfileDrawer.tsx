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
  Fingerprint,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { biometricGatewayService } from '../../services/attendance/biometricGatewayService';

import { employeeAuthService, EmployeeAuthIdentity, AuthAuditEvent, ActiveSession } from '../../services/auth/employeeAuthService';

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
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const { showToast } = useToast();

  if (!employee) return null;

  const isVendor = employee.employment_source === 'VENDOR' || employee.employment?.employment_source === 'VENDOR';
  const joinDate = employee.employment?.doj || employee.created_at?.split('T')[0] || '2025-01-15';
  const managerName = employee.employment?.reporting_manager_name || 'Not assigned';
  const workLocation = employee.employment?.work_location || 'Coimbatore HQ';

  const authStatus = employeeAuthService.getEmployeeAuthStatus(employee.id, employee.organization_id);
  const activeSessions = employeeAuthService.listActiveSessions(employee.id);
  const auditLogs = employeeAuthService.getAuthAuditLogs(employee.id, employee.organization_id);

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
            { id: 'access', label: 'Access & Security', icon: <ShieldCheck className="w-4 h-4" /> },
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

            {/* Biometric Access & Terminal Mappings */}
            {(() => {
              const bioDevices = biometricGatewayService.getEmployeeBiometricDevices(employee.id);
              const enrollments = biometricGatewayService.getEmployeeExistingEnrollments(employee.id);

              return (
                <Card className="p-4 space-y-3 bg-gray-50/70 border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 text-[#07563D]" />
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Biometric Hardware Access
                      </h3>
                    </div>
                    <Badge variant={bioDevices.length > 0 ? 'emerald' : 'gray'} className="text-[10px]">
                      {bioDevices.length > 0 ? `${bioDevices.length} Terminal Linked` : 'Not Enrolled'}
                    </Badge>
                  </div>

                  {bioDevices.length > 0 ? (
                    <div className="space-y-2.5">
                      {bioDevices.map((dev, i) => {
                        const enr = enrollments.find(e => e.device_id === dev.deviceId);

                        return (
                          <div key={i} className="p-3 bg-white rounded-xl border border-gray-200 text-xs space-y-1.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-900">{dev.deviceName}</span>
                              <Badge variant="blue" className="text-[9px] font-mono font-bold">
                                Machine PIN #{dev.machinePin}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                              <div>
                                <span className="text-gray-400">Location:</span> {dev.branch}
                              </div>
                              <div>
                                <span className="text-gray-400">Finger:</span> {enr ? enr.finger_code : 'Enrolled'}
                              </div>
                              <div>
                                <span className="text-gray-400">Enrolled:</span> {new Date(dev.mappedAt).toLocaleDateString()}
                              </div>
                              <div>
                                <span className="text-gray-400">Status:</span> <span className="text-emerald-700 font-semibold">{dev.status}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">
                      No physical biometric terminals linked to this employee yet. Use the <strong>Hardware Terminals</strong> console to enroll fingerprints or map machine users.
                    </p>
                  )}
                </Card>
              );
            })()}
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

        {/* Tab 4: Access & Security */}
        {activeTab === 'access' && (
          <div className="space-y-4">
            {/* Identity & Account Card */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#07563D]" />
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Authentication Account & Login Identity
                  </h3>
                </div>
                <Badge
                  variant={
                    authStatus?.status === 'ACTIVE'
                      ? 'emerald'
                      : authStatus?.status === 'SUSPENDED'
                      ? 'rose'
                      : 'blue'
                  }
                  className="text-[10px] font-bold"
                >
                  {authStatus?.status || 'INVITED'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div>
                  <span className="text-gray-400 text-[11px] block">Login Phone (E.164)</span>
                  <span className="font-mono font-bold text-gray-900">
                    {authStatus?.phone || employee.profile?.phone || '+91 98401 22334'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Authentication Policy</span>
                  <span className="font-bold text-gray-900">Phone + OTP / Password</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">First-Time Login</span>
                  <span className="font-bold text-[#07563D]">
                    {authStatus?.first_login_completed ? '✅ Completed' : '⏳ Pending Activation'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Last Login</span>
                  <span className="font-mono text-gray-700">
                    {authStatus?.last_login_at
                      ? new Date(authStatus.last_login_at).toLocaleString()
                      : 'Never logged in'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Quick Administrative Security Actions */}
            <Card className="p-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Security Administration & Recovery
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isProcessingAuth}
                  onClick={async () => {
                    setIsProcessingAuth(true);
                    try {
                      const phone = authStatus?.phone || employee.profile?.phone || '+91 98401 22334';
                      await employeeAuthService.requestPasswordResetOtp(phone);
                      showToast(`Password reset SMS sent to ${phone}`, 'success');
                    } catch (e: any) {
                      showToast(e.message || 'Failed to send password reset', 'error');
                    } finally {
                      setIsProcessingAuth(false);
                    }
                  }}
                  className="text-xs font-bold justify-start"
                >
                  <Mail className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  Send Password Reset SMS
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={isProcessingAuth}
                  onClick={async () => {
                    setIsProcessingAuth(true);
                    try {
                      await employeeAuthService.provisionEmployeeAuth({
                        tenantId: employee.organization_id || 'org-joy-01',
                        employeeId: employee.id,
                        phone: authStatus?.phone || employee.profile?.phone || '+91 98401 22334',
                        email: employee.work_email,
                        firstName: employee.first_name,
                        lastName: employee.last_name,
                        role: employee.designation_title || 'Employee',
                        sendSms: true,
                      });
                      showToast('Activation instructions dispatched via SMS', 'success');
                    } catch (e: any) {
                      showToast(e.message || 'Failed to send activation instructions', 'error');
                    } finally {
                      setIsProcessingAuth(false);
                    }
                  }}
                  className="text-xs font-bold justify-start"
                >
                  <Phone className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  Resend Activation Instructions
                </Button>

                {authStatus?.status === 'ACTIVE' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isProcessingAuth}
                    onClick={async () => {
                      setIsProcessingAuth(true);
                      try {
                        await employeeAuthService.suspendEmployeeAuth(employee.id, employee.organization_id);
                        showToast(`Suspended login access for ${employee.first_name}`, 'warning');
                      } catch (e: any) {
                        showToast(e.message || 'Failed to suspend account', 'error');
                      } finally {
                        setIsProcessingAuth(false);
                      }
                    }}
                    className="text-xs font-bold text-amber-700 hover:bg-amber-50 justify-start"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                    Suspend Login Access
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isProcessingAuth}
                    onClick={async () => {
                      setIsProcessingAuth(true);
                      try {
                        await employeeAuthService.activateEmployeeAuth(employee.id, employee.organization_id);
                        showToast(`Reactivated login access for ${employee.first_name}`, 'success');
                      } catch (e: any) {
                        showToast(e.message || 'Failed to reactivate account', 'error');
                      } finally {
                        setIsProcessingAuth(false);
                      }
                    }}
                    className="text-xs font-bold text-emerald-700 hover:bg-emerald-50 justify-start"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    Reactivate Account Access
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  disabled={isProcessingAuth}
                  onClick={() => {
                    employeeAuthService.revokeAllSessions(employee.id, 'HR Admin remote session revocation');
                    showToast('All active sessions revoked successfully', 'info');
                  }}
                  className="text-xs font-bold text-rose-700 hover:bg-rose-50 justify-start"
                >
                  <Clock className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
                  Revoke All Active Sessions
                </Button>
              </div>
            </Card>

            {/* Active Device Sessions */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Device Sessions</h3>
                <span className="text-[10px] font-mono text-gray-400">
                  {activeSessions.length} active session{activeSessions.length === 1 ? '' : 's'}
                </span>
              </div>

              {activeSessions.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No active login sessions recorded for this employee.</p>
              ) : (
                <div className="space-y-2">
                  {activeSessions.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          <span>{s.browser} on {s.os}</span>
                          <Badge variant="emerald" className="text-[9px]">Online</Badge>
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          IP: {s.ip_address} • Last Active: {new Date(s.last_active_at).toLocaleTimeString()}
                        </div>
                      </div>
                      <Button
                        size="xs"
                        variant="destructive"
                        onClick={() => {
                          employeeAuthService.revokeSession(s.id);
                          showToast('Session revoked', 'info');
                        }}
                        className="text-[10px] font-bold"
                      >
                        Sign Out
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Security Audit Trail Summary */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Security & Auth Audit Logs</h3>
                <button
                  type="button"
                  onClick={() => setShowAuditLogs(!showAuditLogs)}
                  className="text-[11px] font-bold text-[#07563D] hover:underline"
                >
                  {showAuditLogs ? 'Hide Details' : `View (${auditLogs.length}) Events`}
                </button>
              </div>

              {showAuditLogs && (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {auditLogs.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No recent authentication events recorded.</p>
                  ) : (
                    auditLogs.map((log, i) => (
                      <div key={i} className="p-2 bg-gray-50 rounded-lg border border-gray-200 text-[11px] space-y-0.5">
                        <div className="flex items-center justify-between font-bold text-gray-800">
                          <span>{log.event_type}</span>
                          <span className="font-mono text-[10px] text-gray-400">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-gray-500 font-mono text-[10px]">
                          Actor: {log.actor_name} ({log.actor_type}) • Status: {log.status}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Tab 5: Lifecycle & Actions */}
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
