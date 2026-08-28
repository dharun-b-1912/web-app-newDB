// src/features/platform/subviews/SecurityDashboardView.tsx
// ============================================================
// Joy PeopleHR — Platform Security & Session Operations Console
// ============================================================

import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  Key,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Laptop,
  Globe,
  Clock,
  UserX,
  RefreshCw,
} from 'lucide-react';
import { platformSecurityService } from '../../../services/platform';
import { SecuritySessionItem } from '../../../types/platformAdmin';
import { PrivilegedActionModal } from '../components/PrivilegedActionModal';
import { PageHeader, MetricCard, EnterpriseDataTable } from '../../../components/workforce';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';

export const SecurityDashboardView: React.FC = () => {
  const [sessions, setSessions] = useState<SecuritySessionItem[]>(() =>
    platformSecurityService.getSessions()
  );
  const [revokeModal, setRevokeModal] = useState<{
    isOpen: boolean;
    session: SecuritySessionItem | null;
  }>({
    isOpen: false,
    session: null,
  });

  const handleRevokeConfirm = async (reason: string) => {
    if (!revokeModal.session) return;
    const updated = await platformSecurityService.revokeSession(
      revokeModal.session.id,
      reason
    );
    setSessions(sessions.map((s) => (s.id === revokeModal.session!.id ? updated : s)));
    setRevokeModal({ isOpen: false, session: null });
  };

  const columns = [
    {
      id: 'user',
      header: 'User & Role',
      sortable: true,
      accessor: (s: SecuritySessionItem) => (
        <div>
          <div className="font-bold text-slate-900 text-xs">{s.user_name}</div>
          <div className="text-[11px] text-slate-500">
            {s.user_email} • {s.role_name}
          </div>
        </div>
      ),
    },
    {
      id: 'tenant',
      header: 'Tenant Scope',
      sortable: true,
      accessor: (s: SecuritySessionItem) => (
        <span className="font-semibold text-slate-700 text-xs">{s.tenant_name}</span>
      ),
    },
    {
      id: 'ip',
      header: 'IP & Location',
      accessor: (s: SecuritySessionItem) => (
        <div className="font-mono text-xs text-slate-800">
          <div>{s.ip_address}</div>
          <div className="text-[10px] text-slate-400 font-sans">{s.location || 'India'}</div>
        </div>
      ),
    },
    {
      id: 'device',
      header: 'Device & Browser',
      accessor: (s: SecuritySessionItem) => (
        <span className="text-xs text-slate-600">{s.device}</span>
      ),
    },
    {
      id: 'login',
      header: 'Login Time',
      sortable: true,
      accessor: (s: SecuritySessionItem) => (
        <span className="font-mono text-xs text-slate-500">{s.login_time}</span>
      ),
    },
    {
      id: 'risk',
      header: 'Risk Level',
      sortable: true,
      accessor: (s: SecuritySessionItem) => (
        <StatusBadge status={`${s.risk_level} Risk`} size="xs" />
      ),
    },
    {
      id: 'actions',
      header: 'Action',
      align: 'right' as const,
      accessor: (s: SecuritySessionItem) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          {s.status === 'Active' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRevokeModal({ isOpen: true, session: s })}
              className="h-7 text-xs px-2 text-red-600 hover:bg-red-50"
            >
              Revoke
            </Button>
          ) : (
            <span className="text-[11px] font-semibold text-slate-400">Revoked</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Privileged Revocation Modal */}
      <PrivilegedActionModal
        isOpen={revokeModal.isOpen}
        onClose={() => setRevokeModal({ isOpen: false, session: null })}
        onConfirm={handleRevokeConfirm}
        title="Revoke Active Admin Session"
        actionLabel="Terminate Session"
        targetName={`${revokeModal.session?.user_email} (${revokeModal.session?.device})`}
        severity="High"
        description="Terminating this session will immediately invalidate the active JWT access and refresh tokens. The user will be redirected to the login screen on their next request."
      />

      {/* Page Header */}
      <PageHeader
        title="Platform Security & Session Telemetry"
        description="Monitor live administrator sessions, track travel risk anomalies, and enforce immediate token revocations."
        badge={<StatusBadge status="SOC2 Type II Audit Mode" size="xs" />}
      />

      {/* Security Posture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="MFA Adoption Rate"
          value="100% MFA"
          subValue="TOTP Authentication Mandatory"
          icon={<Shield className="w-4 h-4" />}
          trend={{ value: '100%', direction: 'up', label: 'Enforced', isPositive: true }}
        />
        <MetricCard
          label="Threat & Travel Anomalies"
          value="0 Active"
          subValue="No IP brute-force lockouts in last 24h"
          icon={<ShieldAlert className="w-4 h-4" />}
          trend={{ value: '0 Threats', direction: 'neutral', label: 'Secure', isPositive: true }}
        />
        <MetricCard
          label="JWT Token Encryption"
          value="RS256 4096-bit"
          subValue="Key rotation interval: 90 days"
          icon={<Key className="w-4 h-4" />}
          trend={{ value: 'Active', direction: 'up', label: 'Rotated', isPositive: true }}
        />
      </div>

      {/* Live Admin Sessions Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Active Administrator Sessions</h3>
        <EnterpriseDataTable
          columns={columns}
          data={sessions}
          keyExtractor={(s) => s.id}
          pageSize={10}
        />
      </div>
    </div>
  );
};
