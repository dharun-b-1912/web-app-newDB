import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Tabs } from '../../components/ui/Tabs';
import { Avatar } from '../../components/ui/Avatar';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { ShieldCheck, Users, Key, Lock, Eye, Check, X, ShieldAlert, Cpu, Sparkles, Plus, Trash2, Edit2, CheckSquare, Square } from 'lucide-react';
import { User, Role, ScopeLevel } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/usePermission';

// Master Permission Matrix Catalog
const PERMISSION_MODULES = [
  {
    category: 'Core HR & Employee Directory',
    permissions: [
      { id: 'employees.view', label: 'View Employee Directory', defaultScope: 'Organization' as ScopeLevel },
      { id: 'employees.create', label: 'Onboard & Create Employees', defaultScope: 'Organization' as ScopeLevel },
      { id: 'employees.edit', label: 'Edit Employee Profiles & Statutory', defaultScope: 'Organization' as ScopeLevel },
      { id: 'employees.delete', label: 'Offboard & Delete Employee Records', defaultScope: 'Organization' as ScopeLevel },
    ],
  },
  {
    category: 'Attendance & Biometric Devices',
    permissions: [
      { id: 'attendance.view', label: 'View Attendance Records & Daily Logs', defaultScope: 'Organization' as ScopeLevel },
      { id: 'attendance.manage', label: 'Manual Check-in & Punch Corrections', defaultScope: 'Organization' as ScopeLevel },
      { id: 'attendance.biometric_sync', label: 'Sync Biometric & Face Recognition Hardware', defaultScope: 'Organization' as ScopeLevel },
      { id: 'attendance.regularize', label: 'Approve Attendance Regularization Requests', defaultScope: 'Department' as ScopeLevel },
    ],
  },
  {
    category: 'Shift Rostering & Scheduling',
    permissions: [
      { id: 'shifts.view', label: 'View Shift Calendars & Master Timings', defaultScope: 'Organization' as ScopeLevel },
      { id: 'shifts.roster_manage', label: 'Manage Shift Rosters & Assign Schedules', defaultScope: 'Department' as ScopeLevel },
    ],
  },
  {
    category: 'Leave & Time Off Management',
    permissions: [
      { id: 'leave.view', label: 'View Leave Balances & Company Calendars', defaultScope: 'Organization' as ScopeLevel },
      { id: 'leave.apply', label: 'Apply for Leave on behalf of Employees', defaultScope: 'Department' as ScopeLevel },
      { id: 'leave.approve', label: 'Approve Leave Applications (L1/L2/HR)', defaultScope: 'Department' as ScopeLevel },
      { id: 'leave.policy_manage', label: 'Configure Leave Policies & Accruals', defaultScope: 'Organization' as ScopeLevel },
    ],
  },
  {
    category: 'Payroll, Compensation & Statutory',
    permissions: [
      { id: 'payroll.view', label: 'View Salary Structures & Compensation', defaultScope: 'Organization' as ScopeLevel },
      { id: 'payroll.process', label: 'Run Monthly Payroll & Generate Slips', defaultScope: 'Organization' as ScopeLevel },
      { id: 'payroll.freeze', label: 'Freeze Attendance & Lock Payroll Runs', defaultScope: 'Organization' as ScopeLevel },
      { id: 'payroll.statutory', label: 'Generate PF, ESI, PT & Form 16 Tax Filings', defaultScope: 'Organization' as ScopeLevel },
    ],
  },
  {
    category: 'Recruitment & ATS Pipeline',
    permissions: [
      { id: 'ats.view', label: 'View ATS Job Postings & Candidate Pipeline', defaultScope: 'Organization' as ScopeLevel },
      { id: 'ats.manage', label: 'Post Jobs & Move Candidate Pipeline Stages', defaultScope: 'Organization' as ScopeLevel },
      { id: 'ats.offers', label: 'Generate & Release Digital Offer Letters', defaultScope: 'Organization' as ScopeLevel },
    ],
  },
  {
    category: 'Document Vault & Digital E-Sign',
    permissions: [
      { id: 'documents.view', label: 'View Company Documents & Policy Vault', defaultScope: 'Organization' as ScopeLevel },
      { id: 'documents.upload', label: 'Upload Organizational Documents', defaultScope: 'Organization' as ScopeLevel },
      { id: 'documents.esign', label: 'Trigger Aadhaar & Electronic Signatures', defaultScope: 'Organization' as ScopeLevel },
    ],
  },
  {
    category: 'Security, Scope & RBAC Governance',
    permissions: [
      { id: 'rbac.view', label: 'View RBAC Security Matrices & User Roles', defaultScope: 'Organization' as ScopeLevel },
      { id: 'rbac.manage', label: 'Manage Roles, Permissions & Create HR Accounts', defaultScope: 'Organization' as ScopeLevel },
    ],
  },
];

export const RbacView: React.FC = () => {
  const { hasPermission } = usePermission();
  const canManageRbac = hasPermission('rbac', 'manage');
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Create / Edit Custom Role Modal State
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormDesc, setRoleFormDesc] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, ScopeLevel>>({});

  // Create HR / Staff User Modal State
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    roleIds: [] as string[],
  });

  // RLS Tester State
  const [testUserId, setTestUserId] = useState('');
  const [testResource, setTestResource] = useState('employee_records');
  const [testCompanyId, setTestCompanyId] = useState('comp-joy-01');
  const [testDeptId, setTestDeptId] = useState('dept-eng');
  const [rlsResult, setRlsResult] = useState<any | null>(null);

  const { showToast } = useToast();

  const loadData = () => {
    Promise.all([api.getUsers(), api.getRoles()]).then(([uData, rData]) => {
      setUsers(uData);
      setRoles(rData);
      if (uData.length > 0 && !testUserId) setTestUserId(uData[0].id);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleChange = async (userId: string, newRoleIds: string[]) => {
    try {
      const updated = await api.assignUserRoles(userId, newRoleIds);
      setUsers(prev => prev.map(u => (u.id === userId ? updated : u)));
      showToast('User roles updated successfully!');
    } catch {
      showToast('Failed to update roles', 'error');
    }
  };

  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setRoleFormName('');
    setRoleFormDesc('');
    setSelectedPermissions({});
    setIsCreateRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleFormName(role.name);
    setRoleFormDesc(role.description);
    const permMap: Record<string, ScopeLevel> = {};
    (role.permissions || []).forEach((p: any) => {
      permMap[p.permission_id || p.resource] = p.scope_level || p.scope || 'Organization';
    });
    setSelectedPermissions(permMap);
    setIsCreateRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (!roleFormName.trim()) {
      showToast('Please enter a role name', 'error');
      return;
    }

    const permissionsList: { permission_id: string; scope_level: ScopeLevel }[] = Object.entries(selectedPermissions).map(
      ([permission_id, scope_level]) => ({
        permission_id,
        scope_level: scope_level as ScopeLevel,
      })
    );

    try {
      if (editingRole) {
        await api.updateRole(editingRole.id, {
          name: roleFormName.trim(),
          description: roleFormDesc.trim(),
          permissions: permissionsList,
        });
        showToast(`Role "${roleFormName}" updated successfully!`);
      } else {
        await api.createRole({
          name: roleFormName.trim(),
          description: roleFormDesc.trim(),
          is_system: false,
          permissions: permissionsList,
        });
        showToast(`Custom Role "${roleFormName}" created successfully!`);
      }
      setIsCreateRoleModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save role', 'error');
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete the role "${roleName}"?`)) return;
    try {
      await api.deleteRole(roleId);
      showToast(`Role "${roleName}" deleted.`);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete role', 'error');
    }
  };

  const handleCreateUser = async () => {
    if (!newUserForm.name.trim() || !newUserForm.email.trim() || newUserForm.roleIds.length === 0) {
      showToast('Please enter full name, valid email, and assign at least one role', 'error');
      return;
    }

    try {
      await api.createUser({
        name: newUserForm.name.trim(),
        email: newUserForm.email.trim(),
        phone: newUserForm.phone.trim(),
        roleIds: newUserForm.roleIds,
      });
      showToast(`User account created for ${newUserForm.name}!`);
      setIsCreateUserModalOpen(false);
      setNewUserForm({ name: '', email: '', phone: '', roleIds: [] });
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create user', 'error');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove user "${userName}"?`)) return;
    try {
      await api.deleteUser(userId);
      showToast(`User "${userName}" removed.`);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user', 'error');
    }
  };

  const togglePermission = (permId: string, defaultScope: ScopeLevel) => {
    setSelectedPermissions((prev) => {
      const copy = { ...prev };
      if (copy[permId]) {
        delete copy[permId];
      } else {
        copy[permId] = defaultScope;
      }
      return copy;
    });
  };

  const updatePermissionScope = (permId: string, newScope: ScopeLevel) => {
    setSelectedPermissions((prev) => ({
      ...prev,
      [permId]: newScope,
    }));
  };

  const runRlsSimulation = () => {
    const user = users.find(u => u.id === testUserId);
    if (!user) return;

    // Simulate RLS Engine evaluation
    let hasAccess = false;
    let effectiveScope: ScopeLevel = 'Self';
    let reason = '';

    const isAdmin = (user.roles || []).some(r => r.name === 'Super Admin' || r.name === 'HR Director' || r.name === 'Company Admin');
    const isDeptHead = (user.roles || []).some(r => r.name === 'Department Head' || r.name === 'Team Lead');
    const isHRMgr = (user.roles || []).some(r => r.name === 'HR Manager' || r.name === 'HR Head');

    if (isAdmin) {
      hasAccess = true;
      effectiveScope = 'Organization';
      reason = 'Super Admin / Company Admin has unrestricted tenant-wide organization access.';
    } else if (isHRMgr) {
      if (testCompanyId === 'comp-joy-01') {
        hasAccess = true;
        effectiveScope = 'Company';
        reason = 'HR Head scoped to Legal Entity (Joy Corporate Solutions Pvt Ltd). Access granted.';
      } else {
        hasAccess = false;
        effectiveScope = 'Company';
        reason = 'HR Manager scope restricted to active legal entity. Access denied for cross-entity query.';
      }
    } else if (isDeptHead) {
      if (testDeptId === 'dept-eng') {
        hasAccess = true;
        effectiveScope = 'Department';
        reason = 'Department Head scope matched Engineering department ID. Access granted for team records.';
      } else {
        hasAccess = false;
        effectiveScope = 'Department';
        reason = 'Department Head scope is restricted to Engineering team records only. Cross-department access denied.';
      }
    } else {
      hasAccess = false;
      effectiveScope = 'Self';
      reason = 'Standard Employee role only possesses "Self" access scope. Direct cross-user record query rejected.';
    }

    setRlsResult({
      user,
      hasAccess,
      effectiveScope,
      reason,
      evaluatedAt: new Date().toLocaleTimeString(),
    });
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Security & Access' }, { label: 'RBAC Policy Center' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Role-Based Access Control (RBAC)</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage company roles, multi-module permission matrices (Org, Entity, Branch, Dept, Self), and provision HR accounts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canManageRbac && (
            <>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={handleOpenCreateRole}
              >
                + Create Custom Role
              </Button>
              <Button
                size="sm"
                leftIcon={<Users className="w-4 h-4" />}
                onClick={() => setIsCreateUserModalOpen(true)}
              >
                + Provision HR / User
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'users', label: 'User Role Assignments', icon: <Users className="w-4 h-4" /> },
          { id: 'roles', label: 'Role & Scope Matrix', icon: <ShieldCheck className="w-4 h-4" /> },
          { id: 'rls', label: 'RLS Scope Inspector', icon: <Cpu className="w-4 h-4" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: User Role Assignments */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Profile</TableHead>
                <TableHead>Work Email</TableHead>
                <TableHead>Assigned Roles</TableHead>
                <TableHead>Account Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} src={user.avatar_url} size="sm" />
                      <div>
                        <div className="font-bold text-gray-900">{user.name}</div>
                        <div className="text-[11px] text-gray-400">ID: {user.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-gray-600">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {(user.roles || []).map((r, rIdx) => (
                        <Badge key={r.id ? `${user.id}-role-${r.id}` : `${user.id}-role-${rIdx}`} variant="emerald" size="sm">
                          {r.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="emerald" size="sm">
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canManageRbac ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsRoleModalOpen(true);
                          }}
                        >
                          Manage Roles
                        </Button>
                        {user.role !== 'Super Admin' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" size="sm">
                        View Only
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Tab 2: Role Matrix */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roles.map(role => (
              <Card key={role.id} className="p-5 space-y-4 hover:border-emerald-200 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#07563D] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    {role.is_system ? (
                      <Badge variant="emerald" size="sm">
                        System Defined
                      </Badge>
                    ) : (
                      <>
                        <Badge variant="secondary" size="sm">
                          Custom Role
                        </Badge>
                        {canManageRbac && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditRole(role)}
                              className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900"
                              title="Edit Permissions"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRole(role.id, role.name)}
                              className="p-1 hover:bg-rose-50 rounded text-rose-500 hover:text-rose-700"
                              title="Delete Role"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-gray-900">{role.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{role.description || 'No description provided.'}</p>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Granted Permissions ({role.permissions?.length || 0})
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {(role.permissions || []).map((p: any, pIdx: number) => (
                      <div
                        key={p.id || p.permission_id ? `${role.id}-${p.id || p.permission_id}-${pIdx}` : `${role.id}-perm-${pIdx}`}
                        className="flex items-center justify-between text-xs p-1.5 bg-gray-50 rounded-lg"
                      >
                        <span className="font-medium text-gray-700 truncate max-w-[160px]">{p.resource || p.permission_id || 'Permission'}</span>
                        <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                          {p.scope || p.scope_level || 'Org'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: RLS Scope Inspector */}
      {activeTab === 'rls' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-5 p-6 space-y-4">
            <div className="flex items-center gap-2 text-[#07563D]">
              <Cpu className="w-5 h-5" />
              <h2 className="text-base font-extrabold text-gray-900">RLS Policy Evaluation Engine</h2>
            </div>
            <p className="text-xs text-gray-500">
              Simulate multi-tenant data access policies to verify that role scope boundaries (Org vs Entity vs Department vs Self) strictly hold.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Active User Context</label>
                <select
                  value={testUserId}
                  onChange={e => setTestUserId(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 focus:ring-[#07563D] focus:border-[#07563D]"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({(u.roles || []).map(r => r.name).join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Resource</label>
                <select
                  value={testResource}
                  onChange={e => setTestResource(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 focus:ring-[#07563D] focus:border-[#07563D]"
                >
                  <option value="employee_records">Employee Records Directory</option>
                  <option value="salary_compensation">Payroll & Salary Compensation</option>
                  <option value="organization_settings">Organization Global Settings</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Legal Entity</label>
                <select
                  value={testCompanyId}
                  onChange={e => setTestCompanyId(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 focus:ring-[#07563D] focus:border-[#07563D]"
                >
                  <option value="comp-01">Acme Technologies Pvt Ltd (Primary)</option>
                  <option value="comp-02">Acme Software Solutions Ltd (Subsidiary)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Department</label>
                <select
                  value={testDeptId}
                  onChange={e => setTestDeptId(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 focus:ring-[#07563D] focus:border-[#07563D]"
                >
                  <option value="dept-eng">Engineering & Product Development</option>
                  <option value="dept-hr">Human Resources & People Ops</option>
                  <option value="dept-fin">Finance & Legal</option>
                </select>
              </div>

              <Button onClick={runRlsSimulation} className="w-full mt-2" leftIcon={<Sparkles className="w-4 h-4" />}>
                Evaluate Policy Decision
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-7">
            {rlsResult ? (
              <Card className="p-6 space-y-5 border-l-4 border-l-[#07563D]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-gray-400">Decision Log @ {rlsResult.evaluatedAt}</span>
                  <Badge variant={rlsResult.hasAccess ? 'emerald' : 'danger'} size="lg">
                    {rlsResult.hasAccess ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                  </Badge>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                  <div className="text-xs font-bold text-gray-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#07563D]" /> User: {rlsResult.user.name}
                  </div>
                  <div className="text-xs text-gray-600">
                    Assigned Roles: <span className="font-semibold text-gray-900">{(rlsResult.user.roles || []).map((r: any) => r.name).join(', ')}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Effective Scope Level: <Badge variant="outline">{rlsResult.effectiveScope}</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">Evaluation Rationale</div>
                  <p className="text-xs text-gray-700 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100/60 leading-relaxed">
                    {rlsResult.reason}
                  </p>
                </div>

                <div className="p-3 bg-gray-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto">
                  {`WHERE tenant_id = '${rlsResult.user.organization_id}' \n  AND (${
                    rlsResult.effectiveScope === 'Organization'
                      ? '1=1 -- Org Level Admin'
                      : rlsResult.effectiveScope === 'Company'
                      ? `company_id = '${testCompanyId}'`
                      : rlsResult.effectiveScope === 'Department'
                      ? `department_id = '${testDeptId}'`
                      : `user_id = '${rlsResult.user.id}'`
                  })`}
                </div>
              </Card>
            ) : (
              <Card className="p-12 text-center text-gray-400 space-y-3 flex flex-col items-center justify-center h-full min-h-[300px]">
                <ShieldAlert className="w-10 h-10 text-gray-300" />
                <div className="text-sm font-bold text-gray-700">No Simulation Evaluated Yet</div>
                <p className="text-xs text-gray-400 max-w-sm">
                  Select a user context and target resource on the left, then click Evaluate Policy Decision.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Modal: Manage User Roles */}
      {selectedUser && (
        <Modal
          isOpen={isRoleModalOpen}
          onClose={() => setIsRoleModalOpen(false)}
          title={`Assign Roles for ${selectedUser.name}`}
          description="Grant or revoke RBAC security roles for this user"
        >
          <div className="space-y-3 py-2">
            {roles.map(role => {
              const isAssigned = selectedUser.roles.some(r => r.id === role.id);
              return (
                <div
                  key={role.id}
                  onClick={() => {
                    const currentRoleIds = selectedUser.roles.map(r => r.id);
                    const updatedRoleIds = isAssigned
                      ? currentRoleIds.filter(id => id !== role.id)
                      : [...currentRoleIds, role.id];

                    handleRoleChange(selectedUser.id, updatedRoleIds);
                    setSelectedUser({
                      ...selectedUser,
                      roles: isAssigned
                        ? selectedUser.roles.filter(r => r.id !== role.id)
                        : [...selectedUser.roles, role],
                    });
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isAssigned
                      ? 'border-[#07563D] bg-emerald-50/50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-gray-900">{role.name}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{role.description}</div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-white ${
                      isAssigned ? 'bg-[#07563D]' : 'border border-gray-300 bg-white'
                    }`}
                  >
                    {isAssigned && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setIsRoleModalOpen(false)}>Done</Button>
          </div>
        </Modal>
      )}

      {/* Modal: Create / Edit Custom Role with Granular Permission Matrix */}
      <Modal
        isOpen={isCreateRoleModalOpen}
        onClose={() => setIsCreateRoleModalOpen(false)}
        title={editingRole ? `Edit Role: ${editingRole.name}` : 'Create Custom Role & Permission Matrix'}
        description="Configure granular module access privileges and data scopes (Org, Company, Dept, Self)"
      >
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1 py-1 text-xs">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Role Name *</label>
              <Input
                placeholder="e.g. Payroll Officer, Factory HR, Attendance Admin"
                value={roleFormName}
                onChange={(e) => setRoleFormName(e.target.value)}
                disabled={editingRole?.is_system}
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Role Description</label>
              <Input
                placeholder="Describe operational responsibilities and authority level"
                value={roleFormDesc}
                onChange={(e) => setRoleFormDesc(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-gray-900 text-xs">Module Permissions & Data Scopes</span>
              <span className="text-[11px] text-gray-500">
                {Object.keys(selectedPermissions).length} permissions active
              </span>
            </div>

            <div className="space-y-4">
              {PERMISSION_MODULES.map((mod) => (
                <div key={mod.category} className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-100 space-y-2.5">
                  <div className="font-bold text-gray-900 text-xs flex items-center justify-between">
                    <span>{mod.category}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = mod.permissions.every((p) => selectedPermissions[p.id]);
                        setSelectedPermissions((prev) => {
                          const copy = { ...prev };
                          mod.permissions.forEach((p) => {
                            if (allSelected) {
                              delete copy[p.id];
                            } else {
                              copy[p.id] = p.defaultScope;
                            }
                          });
                          return copy;
                        });
                      }}
                      className="text-[10px] text-[#07563D] hover:underline font-semibold"
                    >
                      {mod.permissions.every((p) => selectedPermissions[p.id]) ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {mod.permissions.map((perm) => {
                      const isChecked = !!selectedPermissions[perm.id];
                      const currentScope = selectedPermissions[perm.id] || perm.defaultScope;

                      return (
                        <div
                          key={perm.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-200/80 hover:border-gray-300"
                        >
                          <div
                            onClick={() => togglePermission(perm.id, perm.defaultScope)}
                            className="flex items-center gap-2.5 cursor-pointer flex-1 select-none"
                          >
                            <div className={`w-4 h-4 rounded flex items-center justify-center text-white ${isChecked ? 'bg-[#07563D]' : 'border border-gray-300'}`}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="font-medium text-gray-800 text-xs">{perm.label}</span>
                          </div>

                          {isChecked && (
                            <div className="flex items-center gap-1.5 pl-2">
                              <span className="text-[10px] text-gray-400 font-medium">Scope:</span>
                              <select
                                value={currentScope}
                                onChange={(e) => updatePermissionScope(perm.id, e.target.value as ScopeLevel)}
                                className="text-[11px] font-semibold bg-gray-50 border border-gray-200 rounded px-2 py-0.5 text-gray-800 focus:ring-1 focus:ring-[#07563D]"
                              >
                                <option value="Organization">Organization (All)</option>
                                <option value="Company">Legal Entity</option>
                                <option value="Department">Department</option>
                                <option value="Branch">Branch Location</option>
                                <option value="Self">Self Only</option>
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <Button variant="outline" onClick={() => setIsCreateRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole}>
              {editingRole ? 'Update Role' : 'Create Custom Role'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Provision HR / Staff Account */}
      <Modal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        title="Provision HR / Staff Account"
        description="Create an internal administrator, HR manager, or team supervisor account with automatic company tenant binding"
      >
        <div className="space-y-4 py-1 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Full Name *</label>
            <Input
              placeholder="e.g. Priya Sharma"
              value={newUserForm.name}
              onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Work Email *</label>
              <Input
                type="email"
                placeholder="e.g. priya.sharma@joycorporate.com"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Phone Number</label>
              <Input
                placeholder="+91 98765 43210"
                value={newUserForm.phone}
                onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-2">Assign System or Custom Roles *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-100">
              {roles.map((r) => {
                const isSelected = newUserForm.roleIds.includes(r.id);
                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      setNewUserForm((prev) => ({
                        ...prev,
                        roleIds: isSelected
                          ? prev.roleIds.filter((id) => id !== r.id)
                          : [...prev.roleIds, r.id],
                      }));
                    }}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected ? 'border-[#07563D] bg-emerald-50 text-[#07563D] font-bold' : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs">{r.name}</div>
                      <div className="text-[10px] text-gray-400 font-normal">{r.is_system ? 'System Role' : 'Custom Role'}</div>
                    </div>
                    <div className={`w-4 h-4 rounded flex items-center justify-center text-white ${isSelected ? 'bg-[#07563D]' : 'border border-gray-300'}`}>
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-[11px] text-[#07563D]">
            <strong>Tenant Scope Protection</strong>: This user will automatically be bound to <strong>Joy Corporate Solutions Pvt Ltd</strong> (`org-joy-01`). No manual tenant selection is required.
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setIsCreateUserModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser}>
              Provision & Send Invitation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
