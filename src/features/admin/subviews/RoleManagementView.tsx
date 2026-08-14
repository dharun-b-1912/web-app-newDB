import React, { useState, useEffect } from 'react';
import { adminApi } from '../../../services/adminApi';
import { AdminRole } from '../../../types/admin';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { KeyRound, Plus, Lock, ShieldCheck } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const RoleManagementView: React.FC = () => {
  const { showToast } = useToast();
  const [roles, setRoles] = useState<AdminRole[]>([]);

  useEffect(() => {
    setRoles(adminApi.getRoles());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#07563D]" />
            <span>Role Management & Permission Scope Control</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">System & custom role definitions, role templates, temporary role assignments, and organizational hierarchy</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Create Custom Role modal opened')}>
          Create Custom Role
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map(r => (
          <div key={r.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {r.role_type} Role
                </span>
                <h3 className="text-base font-extrabold text-gray-900 mt-1">{r.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
              </div>
              <Badge variant={r.is_protected ? 'purple' : 'emerald'}>
                {r.is_protected ? 'Protected System Role' : 'Custom Configured'}
              </Badge>
            </div>

            <div className="flex justify-between items-center text-xs font-mono p-3 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-gray-500">Data Scope: <strong>{r.data_scope}</strong></span>
              <span className="text-gray-900 font-bold">{r.assigned_users_count} Users Assigned</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
