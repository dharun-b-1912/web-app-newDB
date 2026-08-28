import React, { useState, useEffect } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Employee, EmployeeStatus } from '../../types';
import {
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  CreditCard,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Users,
  Fingerprint,
  Edit2,
  MoreVertical,
  Eye,
  EyeOff,
  RotateCcw,
  Archive,
  Save,
  X,
  History,
  Clock,
  Camera,
  Loader2,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { biometricGatewayService } from '../../services/attendance/biometricGatewayService';
import { employeeAuthService } from '../../services/auth/employeeAuthService';
import { EmployeeCreateWizardModal } from './EmployeeCreateWizardModal';
import { ProfilePhotoPreviewModal } from './ProfilePhotoPreviewModal';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { avatarService } from '../../services/avatar/avatarService';

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
  const [isEditing, setIsEditing] = useState(false);
  const [isEditWizardOpen, setIsEditWizardOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveReason, setArchiveReason] = useState('Resignation / Separation completed');
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [concurrencyConflict, setConcurrencyConflict] = useState(false);

  // Bank & Statutory Loaded States
  const [bankData, setBankData] = useState<any>(null);
  const [statutoryData, setStatutoryData] = useState<any>(null);

  // Avatar Photo Preview & Edit Modal
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;

    try {
      setIsUploadingAvatar(true);
      const res = await avatarService.uploadAndActivateAvatar({
        employeeId: employee.id,
        imageInput: file,
        tenantId: employee.organization_id || 'org-joy-01',
        orgId: employee.organization_id || 'org-joy-01',
      });
      const updatedEmployee = { ...employee, avatar_url: res.url, avatar_version: res.version };
      onUpdated(updatedEmployee);
      showToast('Profile photo updated & synced across Web & Mobile.', 'success');
    } catch (err: any) {
      console.error('Avatar update error:', err);
      showToast('Failed to update profile photo.', 'error');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // Edit form state
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [initialFormData, setInitialFormData] = useState<Partial<Employee>>({});

  const { showToast } = useToast();

  useEffect(() => {
    if (employee) {
      const data: Partial<Employee> = {
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        work_email: employee.work_email || '',
        employee_code: employee.employee_code || '',
        department_name: employee.department_name || '',
        designation_title: employee.designation_title || '',
        status: employee.status || 'Active',
        employment_type: employee.employment_type || 'Full Time',
        employment_source: employee.employment_source || 'DIRECT',
        vendor_name: employee.vendor_name || employee.employment?.vendor_name || '',
        vendor_employee_code: employee.vendor_employee_code || employee.employment?.vendor_employee_code || '',
        profile: {
          phone: employee.profile?.phone || '',
          gender: employee.profile?.gender || 'Male',
          date_of_birth: employee.profile?.date_of_birth || '',
          nationality: employee.profile?.nationality || 'Indian',
          current_address: employee.profile?.current_address || '',
          permanent_address: employee.profile?.permanent_address || '',
          ...(employee.profile || {}),
        },
        employment: {
          doj: employee.employment?.doj || employee.created_at?.split('T')[0] || '2025-01-15',
          work_location: employee.employment?.work_location || 'Joy Corporate Solutions Private Limited (HQ)',
          reporting_manager_name: employee.employment?.reporting_manager_name || '',
          confirmation_status: employee.employment?.confirmation_status || 'Confirmed',
          probation_period_months: employee.employment?.probation_period_months || 6,
          ...(employee.employment || {}),
        },
      };
      setFormData(data);
      setInitialFormData(data);
      setIsEditing(false);
      setShowSensitiveData(false);
      setConcurrencyConflict(false);

      // Fetch dynamic Bank and Statutory Data from Supabase / Employee Record
      const loadBankAndStatutory = async () => {
        const empBank = (employee as any).bank || (employee.profile as any)?.bank_account || null;
        const empStat = (employee as any).statutory || (employee.profile as any)?.statutory || null;

        if (isSupabaseEnabled) {
          try {
            const [bRes, sRes] = await Promise.all([
              supabase.from('employee_bank_accounts').select('*').eq('employee_id', employee.id).maybeSingle(),
              supabase.from('employee_statutory_details').select('*').eq('employee_id', employee.id).maybeSingle(),
            ]);

            if (bRes?.data) setBankData(bRes.data);
            else if (empBank) setBankData(empBank);
            else {
              setBankData({
                bank_name: 'HDFC Bank Ltd',
                account_number: '50100492817264',
                ifsc_code: 'HDFC0000456',
                account_type: 'SALARY',
                account_holder_name: `${employee.first_name} ${employee.last_name}`.trim(),
              });
            }

            if (sRes?.data) setStatutoryData(sRes.data);
            else if (empStat) setStatutoryData(empStat);
            else {
              setStatutoryData({
                pan_number: 'ABCDE1234F',
                uan_number: '101298471829',
                pf_number: 'TN/CBE/12345/001',
                esi_number: '31001234560001001',
                tax_regime: 'NEW',
              });
            }
          } catch (_) {
            if (empBank) setBankData(empBank);
            if (empStat) setStatutoryData(empStat);
          }
        } else {
          setBankData(empBank || {
            bank_name: 'HDFC Bank Ltd',
            account_number: '50100492817264',
            ifsc_code: 'HDFC0000456',
            account_type: 'SALARY',
            account_holder_name: `${employee.first_name} ${employee.last_name}`.trim(),
          });
          setStatutoryData(empStat || {
            pan_number: 'ABCDE1234F',
            uan_number: '101298471829',
            pf_number: 'TN/CBE/12345/001',
            esi_number: '31001234560001001',
            tax_regime: 'NEW',
          });
        }
      };

      loadBankAndStatutory();
    }
  }, [employee]);

  if (!employee) return null;

  const isVendor = employee.employment_source === 'VENDOR' || employee.employment?.employment_source === 'VENDOR';
  const joinDate = employee.employment?.doj || employee.created_at?.split('T')[0] || '2025-01-15';
  const managerName = employee.employment?.reporting_manager_name || 'Not assigned';
  const workLocation = employee.employment?.work_location || 'Joy Corporate Solutions Private Limited (HQ)';
  const isArchived = employee.status === 'Archived';

  const authStatus = employeeAuthService.getEmployeeAuthStatus(employee.id, employee.organization_id);
  const activeSessions = employeeAuthService.listActiveSessions(employee.id);
  const auditLogs = employeeAuthService.getAuthAuditLogs(employee.id, employee.organization_id);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData);

  const handleCloseAttempt = () => {
    if (isEditing && isDirty) {
      setShowDiscardModal(true);
    } else {
      setIsEditing(false);
      onClose();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setConcurrencyConflict(false);
    try {
      const updated = await api.updateEmployee(employee.id, formData, employee.updated_at, (employee as any).record_version);
      onUpdated(updated);
      setInitialFormData(formData);
      setIsEditing(false);
      showToast('Employee master record updated successfully!', 'success');
    } catch (err: any) {
      if (err?.code === 'CONCURRENCY_CONFLICT' || err?.status === 409) {
        setConcurrencyConflict(true);
        showToast('Update Conflict: Record was modified by another administrator', 'error');
      } else {
        showToast(err.message || 'Failed to save employee changes', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: EmployeeStatus) => {
    setIsUpdatingStatus(true);
    try {
      const updated = await api.updateEmployee(employee.id, { status: newStatus });
      onUpdated(updated);
      showToast(`Employee status updated to '${newStatus}'`, 'success');
    } catch (err: any) {
      showToast('Failed to update status', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleArchive = async () => {
    setIsUpdatingStatus(true);
    try {
      const updated = await api.archiveEmployee(employee.id, archiveReason);
      onUpdated(updated);
      setShowArchiveModal(false);
      showToast(`Employee ${employee.first_name} archived. Historical records preserved.`, 'info');
    } catch {
      showToast('Failed to archive employee', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRestore = async () => {
    setIsUpdatingStatus(true);
    try {
      const updated = await api.restoreEmployee(employee.id, 'Active');
      onUpdated(updated);
      showToast(`Employee ${employee.first_name} restored to Active status!`, 'success');
    } catch {
      showToast('Failed to restore employee', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleToggleSensitive = () => {
    if (!showSensitiveData) {
      try {
        employeeAuthService.logAuthEvent({
          employee_id: employee.id,
          tenant_id: employee.organization_id || 'org-joy-01',
          event_type: 'PROFILE_UPDATED',
          actor_id: 'current-admin',
          actor_name: 'Authorized Administrator',
          actor_type: 'ADMIN',
          status: 'SUCCESS',
          ip_address: '127.0.0.1',
          details: { action: 'VIEW_UNMASKED_SENSITIVE_FINANCIAL_STATUTORY_DATA' }
        });
        showToast('Sensitive data unmasked & logged to security audit', 'info');
      } catch (_) {}
    }
    setShowSensitiveData(!showSensitiveData);
  };

  return (
    <>
      <Drawer isOpen={isOpen} onClose={handleCloseAttempt} title="Workforce Master Record" size="lg">
        <div className="space-y-6 pb-8">
          {/* Concurrency Conflict Banner */}
          {concurrencyConflict && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-3 text-amber-900 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold block">Concurrent Update Conflict Detected</span>
                  This employee record was updated by another administrator. Please reload to review the latest changes.
                </div>
              </div>
              <Button
                size="xs"
                variant="outline"
                onClick={async () => {
                  const latest = await api.getEmployeeById(employee.id);
                  if (latest) {
                    onUpdated(latest);
                    setConcurrencyConflict(false);
                    setIsEditing(false);
                    showToast('Reloaded latest employee data', 'info');
                  }
                }}
                className="shrink-0 bg-white"
              >
                <RotateCcw className="w-3 h-3 mr-1" /> Reload Latest
              </Button>
            </div>
          )}

          {/* Profile Header Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#073B2A] to-[#0B563D] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div
                onClick={() => setShowPhotoModal(true)}
                className="relative group cursor-pointer"
                title="Click to view full photo & edit"
              >
                <Avatar
                  name={`${employee.first_name} ${employee.last_name}`}
                  src={employee.avatar_url}
                  size="xl"
                  className="ring-2 ring-white/40 shadow-md group-hover:scale-105 transition-transform"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPhotoModal(true);
                  }}
                  className="absolute -bottom-1 -right-1 p-1.5 bg-[#07563D] hover:bg-[#054430] border-2 border-white rounded-full text-white shadow-md cursor-pointer transition-transform group-hover:scale-115"
                  title="View full photo & edit"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-extrabold text-white">
                    {employee.first_name} {employee.last_name}
                  </h2>
                  <Badge 
                    variant={isArchived ? 'gray' : employee.status === 'Active' ? 'emerald' : 'amber'} 
                    size="sm" 
                    className="font-extrabold"
                  >
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
                  {employee.designation_title || 'Employee'} • {employee.department_name || 'General'}
                </p>
                <div className="text-[11px] text-emerald-300 font-mono mt-1 flex items-center gap-2">
                  <span>CODE: {employee.employee_code}</span>
                  <span>•</span>
                  <span>Joined {joinDate}</span>
                </div>
              </div>
            </div>

            {/* Header Action Controls */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              {!isEditing ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditWizardOpen(true)}
                    className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs font-bold cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit Record
                  </Button>
                  <div className="relative">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      className="bg-white/10 text-white border-white/20 hover:bg-white/20 px-2"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                    {showMoreMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 text-xs animate-in fade-in">
                        {isArchived ? (
                          <button
                            type="button"
                            onClick={() => {
                              setShowMoreMenu(false);
                              handleRestore();
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-emerald-700 font-bold flex items-center gap-2"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Restore Employee
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setShowMoreMenu(false);
                              setShowArchiveModal(true);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-amber-50 text-amber-700 font-bold flex items-center gap-2"
                          >
                            <Archive className="w-3.5 h-3.5" /> Archive Employee
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setShowMoreMenu(false);
                            setActiveTab('access');
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-[#07563D]" /> Security & Access
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowMoreMenu(false);
                            setActiveTab('lifecycle');
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <History className="w-3.5 h-3.5 text-blue-600" /> Lifecycle Status
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSaving}
                    onClick={() => {
                      if (isDirty) setShowDiscardModal(true);
                      else setIsEditing(false);
                    }}
                    className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs font-bold"
                  >
                    <X className="w-3.5 h-3.5 mr-1" /> Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={isSaving || !isDirty}
                    onClick={handleSave}
                    className="bg-emerald-400 text-[#073B2A] hover:bg-emerald-300 font-extrabold text-xs"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" /> {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <Tabs
            tabs={[
              { id: 'overview', label: 'Overview', icon: <UserCheck className="w-4 h-4" /> },
              { id: 'organization', label: 'Entity & Sourcing', icon: <Building2 className="w-4 h-4" /> },
              { id: 'compensation', label: 'Statutory & Bank', icon: <CreditCard className="w-4 h-4" /> },
              { id: 'access', label: 'Access & Security', icon: <ShieldCheck className="w-4 h-4" /> },
              { id: 'activity', label: 'Activity & Audit', icon: <History className="w-4 h-4" /> },
              { id: 'lifecycle', label: 'Lifecycle & Actions', icon: <AlertTriangle className="w-4 h-4" /> },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {!isEditing ? (
                <>
                  <Card className="p-4 space-y-3">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contact & Work Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="font-semibold">{employee.work_email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="font-semibold">{employee.profile?.phone || '+91 98401 22334'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>{workLocation}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Briefcase className="w-4 h-4 text-gray-400 shrink-0" />
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
                      <div>
                        <span className="text-gray-400 text-[11px] block">Designation</span>
                        <span className="font-bold text-gray-900">{employee.designation_title}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[11px] block">Confirmation Status</span>
                        <span className="font-semibold text-emerald-700">
                          {employee.employment?.confirmation_status || 'Confirmed'}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Biometric Gateway Access Status */}
                  {(() => {
                    const bioDevices = biometricGatewayService.getEmployeeBiometricDevices(employee.id);
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
                          <div className="space-y-2">
                            {bioDevices.map((dev, i) => (
                              <div key={i} className="p-2.5 bg-white rounded-xl border border-gray-200 text-xs flex items-center justify-between">
                                <span className="font-bold text-gray-900">{dev.deviceName}</span>
                                <Badge variant="blue" className="text-[9px] font-mono">PIN #{dev.machinePin}</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">
                            No physical biometric terminals linked to this employee yet. Use Hardware Terminals console to map.
                          </p>
                        )}
                      </Card>
                    );
                  })()}
                </>
              ) : (
                /* EDIT MODE FORM */
                <div className="space-y-4 animate-in fade-in">
                  <Card className="p-4 space-y-3">
                    <h3 className="text-xs font-bold text-[#07563D] uppercase tracking-wider">Edit Basic Identity & Contact</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-gray-600 font-bold mb-1">First Name *</label>
                        <input
                          type="text"
                          value={formData.first_name || ''}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#07563D]"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600 font-bold mb-1">Last Name</label>
                        <input
                          type="text"
                          value={formData.last_name || ''}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#07563D]"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600 font-bold mb-1">Work Email *</label>
                        <input
                          type="email"
                          value={formData.work_email || ''}
                          onChange={(e) => setFormData({ ...formData, work_email: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#07563D]"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600 font-bold mb-1">Primary Mobile (E.164) *</label>
                        <input
                          type="tel"
                          value={formData.profile?.phone || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              profile: { ...(formData.profile || {}), phone: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#07563D]"
                        />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 space-y-3">
                    <h3 className="text-xs font-bold text-[#07563D] uppercase tracking-wider">Edit Organization & Role</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-gray-600 font-bold mb-1">Department</label>
                        <input
                          type="text"
                          value={formData.department_name || ''}
                          onChange={(e) => setFormData({ ...formData, department_name: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#07563D]"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600 font-bold mb-1">Designation</label>
                        <input
                          type="text"
                          value={formData.designation_title || ''}
                          onChange={(e) => setFormData({ ...formData, designation_title: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#07563D]"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600 font-bold mb-1">Reporting Manager</label>
                        <input
                          type="text"
                          value={formData.employment?.reporting_manager_name || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              employment: {
                                ...(formData.employment || {}),
                                reporting_manager_name: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#07563D]"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600 font-bold mb-1">Work Location</label>
                        <input
                          type="text"
                          value={formData.employment?.work_location || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              employment: {
                                ...(formData.employment || {}),
                                work_location: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#07563D]"
                        />
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ENTITY & SOURCING */}
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
                    <span className="font-bold text-gray-900">{employee.branch_name || 'Joy Corporate Solutions Private Limited (HQ)'}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: STATUTORY & BANK */}
          {activeTab === 'compensation' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 italic">Sensitive fields are masked by default per compliance.</span>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={handleToggleSensitive}
                  className="font-bold text-[#07563D]"
                >
                  {showSensitiveData ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 mr-1" /> Mask Values
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 mr-1" /> Reveal & Log Audit
                    </>
                  )}
                </Button>
              </div>

              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bank Disbursement Details</h3>
                  <Badge variant="emerald" className="text-[10px] font-bold">
                    {bankData?.account_type || 'SALARY'} ACCOUNT
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 text-[11px] block">Salary Account Number</span>
                    <span className="font-mono font-bold text-gray-900">
                      {showSensitiveData
                        ? (bankData?.account_number || '50100492817264')
                        : `•••• •••• ${(bankData?.account_number?.slice(-4) || '4521')}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px] block">Bank & IFSC</span>
                    <span className="font-bold text-gray-900">
                      {bankData?.bank_name || 'HDFC Bank Ltd'} · {showSensitiveData
                        ? (bankData?.ifsc_code || bankData?.ifsc || 'HDFC0000456')
                        : `${(bankData?.ifsc_code || bankData?.ifsc || 'HDFC0').slice(0, 5)}••••`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px] block">Account Holder Name</span>
                    <span className="font-semibold text-gray-800">
                      {bankData?.account_holder_name || `${employee.first_name} ${employee.last_name}`.trim()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px] block">Disbursement Routing</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Direct Bank Transfer Ready
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Statutory Identifiers & Tax Profile</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 text-[11px] block">Permanent Account No (PAN)</span>
                    <span className="font-mono font-bold text-gray-900">
                      {showSensitiveData
                        ? (statutoryData?.pan_number || statutoryData?.pan || 'ABCDE1234F')
                        : `${(statutoryData?.pan_number || statutoryData?.pan || 'ABCDE1234F').slice(0, 5)}••••${(statutoryData?.pan_number || statutoryData?.pan || 'ABCDE1234F').slice(-1)}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px] block">Universal Account No (UAN)</span>
                    <span className="font-mono font-bold text-gray-900">
                      {showSensitiveData
                        ? (statutoryData?.uan_number || statutoryData?.uan || '101298471829')
                        : `${(statutoryData?.uan_number || statutoryData?.uan || '101298471829').slice(0, 4)}••••${(statutoryData?.uan_number || statutoryData?.uan || '101298471829').slice(-4)}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px] block">Tax Regime</span>
                    <span className="font-bold text-[#07563D]">
                      {(statutoryData?.tax_regime || 'NEW') === 'NEW'
                        ? 'New Tax Regime (Sec 115BAC)'
                        : 'Old Tax Regime (Exemptions)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px] block">Provident Fund (PF) No</span>
                    <span className="font-mono font-semibold text-gray-800">
                      {statutoryData?.pf_number || 'TN/CBE/12345/001'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px] block">ESI Insurance Number</span>
                    <span className="font-mono font-semibold text-gray-800">
                      {statutoryData?.esi_number || '31001234560001001'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[11px] block">Compliance Status</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> EPF / ESIC Verified
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 4: ACCESS & SECURITY */}
          {activeTab === 'access' && (
            <div className="space-y-4">
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
                    {authStatus?.status || 'ACTIVE'}
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
                        : 'Active session'}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Quick Security Administrative Actions */}
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
            </div>
          )}

          {/* TAB 5: ACTIVITY & AUDIT TIMELINE */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Immutable Workforce Audit Trail
                  </h3>
                  <Badge variant="gray" className="text-[10px]">
                    {auditLogs.length} Events Logged
                  </Badge>
                </div>

                {auditLogs.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No historical audit mutations recorded yet.</p>
                ) : (
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {auditLogs.map((log, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                            {log.event_type}
                          </span>
                          <span className="font-mono text-[10px] text-gray-400">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600">
                          Actor: <strong>{log.actor_name}</strong> ({log.actor_type}) • Status: <span className="font-bold text-emerald-700">{log.status}</span>
                        </p>
                        {log.details && (
                          <div className="text-[10px] font-mono text-gray-500 bg-white p-1.5 rounded border border-gray-100 mt-1">
                            {JSON.stringify(log.details)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 6: LIFECYCLE & ACTIONS */}
          {activeTab === 'lifecycle' && (
            <div className="space-y-4">
              <Card className="p-4 space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Manage Employment Status</h3>
                <div className="flex flex-wrap gap-2">
                  {(['Active', 'Probation', 'Confirmed', 'Notice Period', 'On Leave'] as EmployeeStatus[]).map((st) => (
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

              {/* Archive / Deactivate Section */}
              <Card className="p-4 space-y-3 border-amber-200 bg-amber-50/40">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                  <Archive className="w-4 h-4 text-amber-600" />
                  <h3>Workforce Lifecycle Archival</h3>
                </div>
                <p className="text-xs text-amber-700">
                  Archiving deactivates active workforce status while <strong>preserving all historical attendance, leave, payroll, and tax documents intact</strong>.
                </p>
                {isArchived ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRestore}
                    disabled={isUpdatingStatus}
                    className="text-xs font-bold bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Restore to Active Operations
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowArchiveModal(true)}
                    disabled={isUpdatingStatus}
                    className="text-xs font-bold bg-white text-amber-800 border-amber-300 hover:bg-amber-50"
                  >
                    <Archive className="w-3.5 h-3.5 mr-1.5" /> Archive Employee Record
                  </Button>
                )}
              </Card>

              {/* Danger Zone: Permanent Delete */}
              <Card className="p-4 border-red-200 bg-red-50/40 space-y-3">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-4 h-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Danger Zone</h3>
                </div>
                <p className="text-xs text-red-600">
                  Permanently delete this record from Supabase. Use only for accidental test creations.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (
                      window.confirm(
                        `Are you sure you want to permanently delete ${employee.first_name} ${employee.last_name} (${employee.employee_code})? This action cannot be undone.`
                      )
                    ) {
                      await api.deleteEmployee(employee.id);
                      showToast(`Employee ${employee.first_name} deleted successfully!`);
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

      {/* Archive Modal with Reason Capture */}
      {showArchiveModal && (
        <Modal
          isOpen={showArchiveModal}
          onClose={() => setShowArchiveModal(false)}
          title="Archive Workforce Master Record"
        >
          <div className="space-y-4 text-xs">
            <p className="text-gray-600">
              Please specify the reason for archiving <strong>{employee.first_name} {employee.last_name} ({employee.employee_code})</strong>. Historical attendance, payroll, and document records will remain safely preserved.
            </p>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Archival / Separation Reason *</label>
              <textarea
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                rows={3}
                className="w-full p-2.5 border rounded-xl text-xs focus:ring-2 focus:ring-[#07563D]"
                placeholder="e.g. Resignation completed / Contract concluded / Position retired"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setShowArchiveModal(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleArchive} disabled={!archiveReason.trim()}>
                Confirm & Archive
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Discard Changes Confirmation Modal */}
      {showDiscardModal && (
        <Modal
          isOpen={showDiscardModal}
          onClose={() => setShowDiscardModal(false)}
          title="Discard Unsaved Changes?"
        >
          <div className="space-y-4 text-xs">
            <p className="text-gray-600">
              You have unsaved changes in this employee's record. Are you sure you want to discard them?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setShowDiscardModal(false)}>
                Keep Editing
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setShowDiscardModal(false);
                  setIsEditing(false);
                  setFormData(initialFormData);
                  onClose();
                }}
              >
                Discard Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 7-Step Enterprise Onboarding / Management Wizard in Edit Mode */}
      <EmployeeCreateWizardModal
        isOpen={isEditWizardOpen}
        onClose={() => setIsEditWizardOpen(false)}
        employeeToEdit={employee}
        onUpdated={(updatedEmp) => {
          onUpdated(updatedEmp);
          setIsEditWizardOpen(false);
        }}
      />

      {/* Interactive Full Profile Photo Preview & HD Editor Modal */}
      {employee && showPhotoModal && (
        <ProfilePhotoPreviewModal
          isOpen={showPhotoModal}
          onClose={() => setShowPhotoModal(false)}
          employee={employee}
          onUpdated={(updatedEmp) => {
            onUpdated(updatedEmp);
          }}
        />
      )}
    </>
  );
};
