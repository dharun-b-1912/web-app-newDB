import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { useToast } from '../../../components/ui/Toast';
import {
  KeyRound,
  Plus,
  Search,
  Mail,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Edit2,
  Trash2,
  SlidersHorizontal,
  X,
  UserCheck,
  Clock,
  Calendar,
  Users,
  Zap,
  DollarSign,
  MessageSquare,
  Sparkles,
  Layers,
  Lock,
} from 'lucide-react';
import {
  hrAuthorizationService,
  EmployeeHrAuthorization,
  HrOperationalModule,
  RolePresetKey,
  MODULE_DESCRIPTIONS,
  ROLE_PRESET_CONFIGS,
  ModuleActionPermissions,
} from '../../../services/hrAuthorizationService';
import { api } from '../../../services/api';
import { Employee } from '../../../types';

export const RoleManagementView: React.FC = () => {
  const { showToast } = useToast();
  const [authorizations, setAuthorizations] = useState<EmployeeHrAuthorization[]>(() =>
    hrAuthorizationService.getAuthorizationsForCompany('comp-joy-01')
  );
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPresetFilter, setSelectedPresetFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAuth, setEditingAuth] = useState<EmployeeHrAuthorization | null>(null);

  // Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [department, setDepartment] = useState('Human Resources');
  const [designation, setDesignation] = useState('HR Executive');
  const [selectedPreset, setSelectedPreset] = useState<RolePresetKey>('JUNIOR_HR');
  const [modulePermissions, setModulePermissions] = useState<
    Record<HrOperationalModule, ModuleActionPermissions>
  >(ROLE_PRESET_CONFIGS.JUNIOR_HR.permissions);

  const refreshData = async () => {
    const data = await hrAuthorizationService.syncFromSupabase();
    setAuthorizations(data.filter(a => a.company_id === 'comp-joy-01' || a.company_id === 'comp-joy-01'));
  };

  useEffect(() => {
    api.getEmployees().then(data => setEmployees(data));
    hrAuthorizationService.syncFromSupabase().then(data => setAuthorizations(data));
    const handleUpdate = () => {
      setAuthorizations(hrAuthorizationService.getAuthorizationsForCompany('comp-joy-01'));
    };
    window.addEventListener('hr-authorizations:updated', handleUpdate);
    return () => window.removeEventListener('hr-authorizations:updated', handleUpdate);
  }, []);

  const openCreateModal = () => {
    setEditingAuth(null);
    setSelectedEmployeeId('');
    setWorkEmail('');
    setEmployeeName('');
    setEmployeeCode('');
    setDepartment('Human Resources');
    setDesignation('HR Executive');
    setSelectedPreset('JUNIOR_HR');
    setModulePermissions(JSON.parse(JSON.stringify(ROLE_PRESET_CONFIGS.JUNIOR_HR.permissions)));
    setIsModalOpen(true);
  };

  const openEditModal = (auth: EmployeeHrAuthorization) => {
    setEditingAuth(auth);
    setSelectedEmployeeId(auth.employee_id);
    setWorkEmail(auth.work_email);
    setEmployeeName(auth.employee_name);
    setEmployeeCode(auth.employee_code);
    setDepartment(auth.department);
    setDesignation(auth.designation);
    setSelectedPreset(auth.preset_name);
    setModulePermissions(JSON.parse(JSON.stringify(auth.module_permissions)));
    setIsModalOpen(true);
  };

  const handleEmployeeSelect = (empId: string) => {
    setSelectedEmployeeId(empId);
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      setEmployeeName(emp.name);
      setEmployeeCode(emp.code || 'JOY-0100');
      setWorkEmail(emp.email);
      setDepartment(emp.department);
      setDesignation(emp.designation);
    }
  };

  const handlePresetSelect = (preset: RolePresetKey) => {
    setSelectedPreset(preset);
    if (preset !== 'CUSTOM') {
      setModulePermissions(JSON.parse(JSON.stringify(ROLE_PRESET_CONFIGS[preset].permissions)));
    }
  };

  const handlePermissionToggle = (
    moduleKey: HrOperationalModule,
    action: keyof ModuleActionPermissions
  ) => {
    setModulePermissions(prev => {
      const current = prev[moduleKey];
      const updated = {
        ...current,
        [action]: !current[action],
      };
      // If action other than can_view is turned on, auto-enable can_view
      if (action !== 'can_view' && updated[action]) {
        updated.can_view = true;
      }
      // If can_view is turned off, turn off all actions
      if (action === 'can_view' && !updated.can_view) {
        updated.can_approve = false;
        updated.can_edit = false;
        updated.can_export = false;
      }
      return {
        ...prev,
        [moduleKey]: updated,
      };
    });
    setSelectedPreset('CUSTOM');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to revoke this employee authorization?')) {
      await hrAuthorizationService.deleteAuthorization(id);
      showToast('Authorization revoked successfully');
      refreshData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workEmail.trim() || !employeeName.trim()) {
      showToast('Please specify a valid employee work email and name');
      return;
    }

    await hrAuthorizationService.saveAuthorization({
      tenant_id: 'default-tenant',
      company_id: 'comp-joy-01',
      employee_id: selectedEmployeeId || `emp-${Date.now()}`,
      employee_name: employeeName,
      employee_code: employeeCode || 'JOY-0100',
      work_email: workEmail,
      department,
      designation,
      preset_name: selectedPreset,
      is_active: true,
      module_permissions: modulePermissions,
      granted_by: 'Hari Priya (HR Head)',
    });

    showToast(`Access permissions authorized for ${workEmail}!`);
    setIsModalOpen(false);
    refreshData();
  };

  const filteredAuthorizations = authorizations.filter(auth => {
    const matchesSearch =
      auth.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      auth.work_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      auth.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      auth.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPreset =
      selectedPresetFilter === 'ALL' || auth.preset_name === selectedPresetFilter;

    return matchesSearch && matchesPreset;
  });

  const getModuleIcon = (mod: HrOperationalModule) => {
    switch (mod) {
      case 'attendance':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'leave':
        return <Calendar className="w-4 h-4 text-emerald-600" />;
      case 'people':
        return <Users className="w-4 h-4 text-purple-600" />;
      case 'work_overtime':
        return <Zap className="w-4 h-4 text-amber-600" />;
      case 'payroll_claims':
        return <DollarSign className="w-4 h-4 text-teal-600" />;
      case 'helpdesk_communication':
        return <MessageSquare className="w-4 h-4 text-rose-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#07563D]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                HR Role Management & Module Authorization
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span className="flex items-center gap-1 font-medium text-emerald-700">
                  <Building2 className="w-3.5 h-3.5" />
                  Joy Corporate Solutions Pvt Ltd
                </span>
                <span>•</span>
                <span>Multi-Tenant Company Scoped</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 max-w-3xl">
            Authorize HR department personnel (Junior HR, Attendance Admin, Leave Coordinators) by their work email ID to access specific operational modules and functional capabilities on their login.
          </p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
          + Authorize HR Employee
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Active HR Staff Authorizations
          </div>
          <div className="text-2xl font-black text-gray-900 mt-0.5">{authorizations.length} Personnel</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Assigned customized scopes</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Operational Modules Protected
          </div>
          <div className="text-2xl font-black text-[#07563D] mt-0.5">6 Module Desks</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Attendance, Leave, People, OT, Payroll, Helpdesk</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Role Preset Configurations
          </div>
          <div className="text-2xl font-black text-blue-700 mt-0.5">6 Standard Profiles</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Junior HR, Attendance, Leave, Onboarding, Payroll</div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Work Email ID, Employee Name, or Code..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#07563D]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-gray-500 shrink-0">Preset:</span>
          {['ALL', 'JUNIOR_HR', 'ATTENDANCE_ADMIN', 'LEAVE_ADMIN', 'ONBOARDING_SPECIALIST', 'CUSTOM'].map(
            presetKey => (
              <button
                key={presetKey}
                onClick={() => setSelectedPresetFilter(presetKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  selectedPresetFilter === presetKey
                    ? 'bg-[#07563D] text-white shadow-2xs'
                    : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {presetKey.replace(/_/g, ' ')}
              </button>
            )
          )}
        </div>
      </div>

      {/* Authorized Staff Table */}
      <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
            Authorized HR Department Personnel & Assigned Access Matrix
          </h3>
          <span className="text-xs text-gray-500">Showing {filteredAuthorizations.length} entries</span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/60">
                <TableHead className="font-bold text-xs text-gray-700">Employee & Work Email</TableHead>
                <TableHead className="font-bold text-xs text-gray-700">Department & Title</TableHead>
                <TableHead className="font-bold text-xs text-gray-700">Assigned Role Profile</TableHead>
                <TableHead className="font-bold text-xs text-gray-700">Authorized Module Desks</TableHead>
                <TableHead className="font-bold text-xs text-gray-700">Capabilities</TableHead>
                <TableHead className="font-bold text-xs text-gray-700">Granted By</TableHead>
                <TableHead className="font-bold text-xs text-gray-700 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAuthorizations.map(auth => {
                const activeModules = (
                  Object.entries(auth.module_permissions) as [HrOperationalModule, ModuleActionPermissions][]
                ).filter(([, perms]) => perms.can_view);
                const permsList = Object.values(auth.module_permissions) as ModuleActionPermissions[];

                return (
                  <TableRow key={auth.id} className="hover:bg-gray-50/60 transition-colors">
                    <TableCell>
                      <div className="font-bold text-xs text-gray-900">{auth.employee_name}</div>
                      <div className="text-[11px] font-mono text-[#07563D] flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-gray-400" />
                        {auth.work_email}
                      </div>
                      <div className="text-[10px] text-gray-500">{auth.employee_code}</div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-semibold text-gray-800">{auth.designation}</div>
                      <div className="text-[10px] text-gray-500">{auth.department}</div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          auth.preset_name === 'FULL_HR_HEAD'
                            ? 'purple'
                            : auth.preset_name === 'JUNIOR_HR'
                            ? 'emerald'
                            : 'blue'
                        }
                        size="sm"
                      >
                        {auth.preset_name.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {activeModules.map(([modKey]) => (
                          <span
                            key={modKey}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-700"
                          >
                            {getModuleIcon(modKey)}
                            <span>{modKey.replace(/_/g, ' ')}</span>
                          </span>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-[11px] space-y-0.5">
                        <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>View: {activeModules.length} Modules</span>
                        </div>
                        <div className="text-[10px] text-gray-500">
                          Approve: {permsList.filter(p => p.can_approve).length} | Edit:{' '}
                          {permsList.filter(p => p.can_edit).length} | Export:{' '}
                          {permsList.filter(p => p.can_export).length}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs text-gray-800 font-medium">{auth.granted_by}</div>
                      <div className="text-[10px] text-gray-400">
                        {new Date(auth.updated_at).toLocaleDateString()}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-gray-200"
                          leftIcon={<Edit2 className="w-3 h-3" />}
                          onClick={() => openEditModal(auth)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                          onClick={() => handleDelete(auth.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredAuthorizations.length === 0 && (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#07563D] flex items-center justify-center mx-auto border border-emerald-100">
                <UserCheck className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-gray-900">No HR Authorizations Granted Yet</h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Authorize employees in the HR department by their work email ID to access Attendance, Leave, Documents, and other operations with real-time SQL synchronization.
              </p>
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateModal} className="mt-2">
                + Authorize First HR Employee
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Authorization Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-gray-200 p-6 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {editingAuth ? 'Modify HR Employee Authorization' : 'Authorize HR Employee by Work Email'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure functional module access and action capabilities for this login.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 text-xs">
              {/* Step 1: Employee Identity & Work Email */}
              <div className="space-y-3 p-4 bg-gray-50/70 rounded-2xl border border-gray-200/80">
                <span className="text-[10px] font-black uppercase text-[#07563D] tracking-wider">
                  Step 1: Employee Identity & Work Email
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Select Company Employee (Quick Fill)
                    </label>
                    <select
                      value={selectedEmployeeId}
                      onChange={e => handleEmployeeSelect(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium bg-white"
                    >
                      <option value="">-- Choose employee from list --</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.name} ({e.email}) - {e.department}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Work Email ID (Login Identifier) *
                    </label>
                    <input
                      type="email"
                      value={workEmail}
                      onChange={e => setWorkEmail(e.target.value)}
                      placeholder="e.g. junior.hr@joycorp.com"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Employee Full Name *</label>
                    <input
                      type="text"
                      value={employeeName}
                      onChange={e => setEmployeeName(e.target.value)}
                      placeholder="e.g. Priya Dharshini"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Employee Code / ID</label>
                    <input
                      type="text"
                      value={employeeCode}
                      onChange={e => setEmployeeCode(e.target.value)}
                      placeholder="e.g. JOY-0103"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      placeholder="e.g. Human Resources"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Designation / Role Title</label>
                    <input
                      type="text"
                      value={designation}
                      onChange={e => setDesignation(e.target.value)}
                      placeholder="e.g. Junior HR Executive"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Role Preset Quick-Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-[#07563D] tracking-wider">
                    Step 2: Apply Role Preset Template
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium">Click to auto-populate module permissions</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(ROLE_PRESET_CONFIGS) as RolePresetKey[]).map(presetKey => {
                    const preset = ROLE_PRESET_CONFIGS[presetKey];
                    const isSelected = selectedPreset === presetKey;
                    return (
                      <button
                        type="button"
                        key={presetKey}
                        onClick={() => handlePresetSelect(presetKey)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-[#07563D] ring-2 ring-[#07563D]/20'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-bold text-gray-900 text-xs">{preset.label}</div>
                        <div className="text-[10px] text-gray-500 line-clamp-2 mt-0.5">{preset.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Granular Functional Module & Capability Matrix */}
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase text-[#07563D] tracking-wider">
                  Step 3: Granular Module Access & Action Capabilities
                </span>

                <div className="space-y-3">
                  {(Object.keys(MODULE_DESCRIPTIONS) as HrOperationalModule[]).map(modKey => {
                    const info = MODULE_DESCRIPTIONS[modKey];
                    const perms = modulePermissions[modKey];

                    return (
                      <div
                        key={modKey}
                        className={`p-4 rounded-2xl border transition-all ${
                          perms.can_view
                            ? 'bg-emerald-50/20 border-emerald-200/80'
                            : 'bg-gray-50/40 border-gray-200/60 opacity-80'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <div className="p-2 rounded-xl bg-white border border-gray-200 shadow-2xs mt-0.5">
                              {getModuleIcon(modKey)}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-gray-900 flex items-center gap-2">
                                <span>{info.label}</span>
                                {perms.can_view && (
                                  <Badge variant="emerald" size="xs">
                                    Enabled
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5">{info.description}</p>
                            </div>
                          </div>

                          {/* Capability Toggles */}
                          <div className="flex items-center gap-3 shrink-0 bg-white p-2 rounded-xl border border-gray-200 shadow-2xs">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={perms.can_view}
                                onChange={() => handlePermissionToggle(modKey, 'can_view')}
                                className="rounded text-[#07563D] focus:ring-[#07563D]"
                              />
                              <span className="text-[11px] font-bold text-gray-800">View</span>
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={perms.can_approve}
                                onChange={() => handlePermissionToggle(modKey, 'can_approve')}
                                className="rounded text-[#07563D] focus:ring-[#07563D]"
                              />
                              <span className="text-[11px] font-semibold text-gray-700">Approve</span>
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={perms.can_edit}
                                onChange={() => handlePermissionToggle(modKey, 'can_edit')}
                                className="rounded text-[#07563D] focus:ring-[#07563D]"
                              />
                              <span className="text-[11px] font-semibold text-gray-700">Edit</span>
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={perms.can_export}
                                onChange={() => handlePermissionToggle(modKey, 'can_export')}
                                className="rounded text-[#07563D] focus:ring-[#07563D]"
                              />
                              <span className="text-[11px] font-semibold text-gray-700">Export</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="text-[10px] text-gray-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Scoped strictly to active legal entity tenant.</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" type="submit">
                    Save & Grant Authorization
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
