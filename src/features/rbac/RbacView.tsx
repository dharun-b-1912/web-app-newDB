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
import { ShieldCheck, Users, Key, Lock, Eye, Check, X, ShieldAlert, Cpu, Sparkles } from 'lucide-react';
import { User, Role, ScopeLevel } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/usePermission';

export const RbacView: React.FC = () => {
  const { hasPermission } = usePermission();
  const canManageRbac = hasPermission('rbac', 'manage');
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // RLS Tester State
  const [testUserId, setTestUserId] = useState('');
  const [testResource, setTestResource] = useState('employee_records');
  const [testCompanyId, setTestCompanyId] = useState('comp-joy-01');
  const [testDeptId, setTestDeptId] = useState('dept-eng');
  const [rlsResult, setRlsResult] = useState<any | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    Promise.all([api.getUsers(), api.getRoles()]).then(([uData, rData]) => {
      setUsers(uData);
      setRoles(rData);
      if (uData.length > 0) setTestUserId(uData[0].id);
    });
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
            Manage system roles, scope-restricted permission matrices (Org, Entity, Branch, Dept, Self), and test RLS simulator.
          </p>
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
                  {role.is_system ? (
                    <Badge variant="emerald" size="sm">
                      System Defined
                    </Badge>
                  ) : (
                    <Badge variant="secondary" size="sm">
                      Custom
                    </Badge>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-gray-900">{role.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{role.description}</p>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Permission Scopes ({role.permissions.length})
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {role.permissions.map((p: any, pIdx: number) => (
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
    </div>
  );
};
