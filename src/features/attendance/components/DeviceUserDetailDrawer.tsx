// src/features/attendance/components/DeviceUserDetailDrawer.tsx
// ============================================================================
// Joy PeopleHR — Enterprise Machine User Detail Drawer
// Multi-modal Biometrics, HR Mapping, Live Punches & Hardware Audit Trail
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  Fingerprint,
  ScanFace,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  ShieldCheck,
  Link,
  Unlink,
  RefreshCw,
  Layers,
  Lock,
  UserCheck,
  Building2,
  Calendar,
  Zap,
  ArrowRight,
  User,
  Radio,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  biometricGatewayService,
  BiometricDevice,
  BiometricDeviceUser,
  BiometricDeviceUserHistory,
} from '../../../services/attendance/biometricGatewayService';
import { useToast } from '../../../components/ui/Toast';
import { hrEventBus } from '../../../services/hrEventBus';
import { cn } from '../../../lib/utils';

interface DeviceUserDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: BiometricDeviceUser | null;
  device: BiometricDevice | null;
  onOpenMappingModal: (user: BiometricDeviceUser) => void;
  onOpenUnmapConfirm: (user: BiometricDeviceUser) => void;
  onUserUpdated?: () => void;
}

export const DeviceUserDetailDrawer: React.FC<DeviceUserDetailDrawerProps> = ({
  isOpen,
  onClose,
  user,
  device,
  onOpenMappingModal,
  onOpenUnmapConfirm,
  onUserUpdated,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'punches' | 'audit'>('overview');
  const [auditHistory, setAuditHistory] = useState<BiometricDeviceUserHistory[]>([]);
  const [punches, setPunches] = useState<any[]>([]);
  const [punchTotal, setPunchTotal] = useState(0);
  const [punchPage, setPunchPage] = useState(1);
  const [isPunchLoading, setIsPunchLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isOpen && user && device) {
      // 1. Load change audit trail
      const hist = biometricGatewayService.getDeviceUserHistory(device.id, user.device_user_id);
      setAuditHistory(hist);

      // 2. Load attendance punch history
      loadUserPunches(user.device_user_id, 1);

      // 3. Real-time subscriptions & polling for live punch feed
      const unsubPunch = hrEventBus.subscribe('attendance.punch_received', () => {
        loadUserPunches(user.device_user_id, punchPage);
      });
      const unsubBio = hrEventBus.subscribe('biometric.updated', () => {
        loadUserPunches(user.device_user_id, punchPage);
        const refreshedHist = biometricGatewayService.getDeviceUserHistory(device.id, user.device_user_id);
        setAuditHistory(refreshedHist);
      });

      const handleLive = () => {
        loadUserPunches(user.device_user_id, punchPage);
      };
      return () => {
        unsubPunch();
        unsubBio();
        window.removeEventListener('biometric:updated', handleLive);
      };
    }
  }, [isOpen, user, device, punchPage]);

  const loadUserPunches = async (pin: string, page = 1) => {
    setIsPunchLoading(true);
    try {
      const res = await biometricGatewayService.getDeviceUserAttendanceHistory(pin, {
        page,
        pageSize: 15,
        deviceId: device?.id,
      });
      setPunches(res.punches);
      setPunchTotal(res.total);
      setPunchPage(page);
    } catch (err) {
      console.error('Failed to load user punch history:', err);
    } finally {
      setIsPunchLoading(false);
    }
  };

  if (!isOpen || !user || !device) return null;

  const rawCard = user.card_number && user.card_number !== 'null' && user.card_number !== 'undefined'
    ? user.card_number
    : (user as any).credentials?.card?.uid;
  const activeCard = rawCard ? String(rawCard).trim() : null;

  const fpCount = Number(user.fingerprint_count || (user as any).credentials?.fingerprint?.count || 0);
  const isFpEnrolled = fpCount > 0 || (user as any).credentials?.fingerprint?.status === 'ENROLLED';

  const faceCred = (user as any).credentials?.face;
  const isFaceEnrolled = Boolean(user.face_enrolled || (user as any).has_face_enrolled || faceCred?.status === 'ENROLLED');
  const isFaceUnknown = !isFaceEnrolled && (faceCred?.status === 'UNKNOWN' || user.face_enrolled === null || user.face_enrolled === undefined);

  return (
    <div className="fixed inset-0 z-60 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl border-l border-gray-200 flex flex-col transform transition ease-in-out duration-300 animate-in slide-in-from-right">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-mono font-bold text-lg shadow-md">
                  #{user.device_user_id}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">{user.name}</h3>
                    <Badge
                      variant={user.privilege === 'ADMIN' || user.privilege === 'SUPERADMIN' ? 'purple' : 'gray'}
                      className="text-[10px] uppercase font-mono font-bold"
                    >
                      {user.privilege}
                    </Badge>
                    <Badge
                      variant={user.enabled !== false ? 'emerald' : 'rose'}
                      className="text-[10px] font-semibold"
                    >
                      {user.enabled !== false ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">
                    Terminal: {device.device_name} ({device.ip_address}:{device.port})
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 mt-5 border-b border-gray-200 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('overview')}
                className={cn(
                  'pb-2 px-1 border-b-2 transition flex items-center gap-1.5',
                  activeTab === 'overview'
                    ? 'border-[#07563D] text-[#07563D] font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                Overview & Credentials
              </button>
              <button
                onClick={() => setActiveTab('punches')}
                className={cn(
                  'pb-2 px-1 border-b-2 transition flex items-center gap-1.5',
                  activeTab === 'punches'
                    ? 'border-[#07563D] text-[#07563D] font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                )}
              >
                <Clock className="w-3.5 h-3.5" />
                Live Punches ({punchTotal})
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={cn(
                  'pb-2 px-1 border-b-2 transition flex items-center gap-1.5',
                  activeTab === 'audit'
                    ? 'border-[#07563D] text-[#07563D] font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                )}
              >
                <History className="w-3.5 h-3.5" />
                Audit Trail ({auditHistory.length})
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
            {/* TAB 1: OVERVIEW & CREDENTIALS */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* 1. HR Mapping Status Card */}
                <div className="p-4 bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                      <UserCheck className="w-4 h-4 text-[#07563D]" />
                      JOY PeopleHR Mapping
                    </div>
                    {user.is_mapped ? (
                      <Badge variant="emerald" className="gap-1 font-semibold text-[10px]">
                        <CheckCircle2 className="w-3 h-3" /> Mapped
                      </Badge>
                    ) : (
                      <Badge variant="amber" className="gap-1 font-semibold text-[10px]">
                        <AlertCircle className="w-3 h-3" /> Unmapped
                      </Badge>
                    )}
                  </div>

                  {user.is_mapped ? (
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-emerald-950 text-sm">{user.mapped_employee_name}</div>
                          <div className="text-[11px] text-emerald-800 font-mono">
                            {user.mapped_employee_code} • {user.mapped_department || 'General'}
                          </div>
                        </div>
                        <div className="text-right text-[10px] text-emerald-700">
                          <div>Mapped by: <span className="font-semibold">{user.mapped_by || 'Admin'}</span></div>
                          <div className="font-mono">{user.mapped_at ? new Date(user.mapped_at).toLocaleDateString() : 'Active'}</div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenMappingModal(user)}
                          className="text-xs h-7 rounded-lg border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50"
                        >
                          <Link className="w-3 h-3 mr-1" /> Re-map
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenUnmapConfirm(user)}
                          className="text-xs h-7 rounded-lg border-rose-200 text-rose-700 bg-white hover:bg-rose-50"
                        >
                          <Unlink className="w-3 h-3 mr-1" /> Unmap
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-2">
                      <p className="text-xs leading-relaxed">
                        This hardware identity is not linked to any JOY PeopleHR employee. Future punches will be logged as unmapped raw events.
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onOpenMappingModal(user)}
                        className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs h-8 rounded-xl font-bold gap-1.5 shadow-xs"
                      >
                        <Link className="w-3.5 h-3.5" /> Map to Employee Now
                      </Button>
                    </div>
                  )}
                </div>

                {/* 2. Hardware Biometric Credentials Card */}
                <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
                  <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    Biometrics & Machine Telemetry
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Fingerprint */}
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#07563D] flex items-center justify-center">
                          <Fingerprint className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">Fingerprint</div>
                          <div className="text-[10px] text-gray-500">
                            {isFpEnrolled ? `${fpCount || 1} template(s) enrolled` : 'No template'}
                          </div>
                        </div>
                      </div>
                      <Badge variant={isFpEnrolled ? 'emerald' : 'gray'} className="text-[9px]">
                        {isFpEnrolled ? 'Enrolled' : 'None'}
                      </Badge>
                    </div>

                    {/* Face */}
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#07563D] flex items-center justify-center">
                          <ScanFace className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">Face Recognition</div>
                          <div className="text-[10px] text-gray-500">
                            {isFaceEnrolled
                              ? 'Verified Live Event'
                              : isFaceUnknown
                              ? 'Requires registration'
                              : 'No face template'}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={isFaceEnrolled ? 'emerald' : isFaceUnknown ? 'gray' : 'gray'}
                        className="text-[9px]"
                      >
                        {isFaceEnrolled ? 'Enrolled' : isFaceUnknown ? 'Unknown' : 'None'}
                      </Badge>
                    </div>

                    {/* Card */}
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">RFID Smart Card</div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            {activeCard ? `#${activeCard}` : 'No card assigned'}
                          </div>
                        </div>
                      </div>
                      <Badge variant={activeCard ? 'blue' : 'gray'} className="text-[9px]">
                        {activeCard ? 'Configured' : 'None'}
                      </Badge>
                    </div>

                    {/* Password */}
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">Machine PIN</div>
                          <div className="text-[10px] text-gray-500">
                            {user.password_configured ? 'Password Configured' : 'No Password'}
                          </div>
                        </div>
                      </div>
                      <Badge variant={user.password_configured ? 'purple' : 'gray'} className="text-[9px]">
                        {user.password_configured ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* 3. Terminal Access Group & Schedule */}
                <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
                  <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Access Group & Schedule
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400">Access Group:</span>{' '}
                      <span className="font-semibold text-gray-800">Group {user.group_id || '1'} (Standard)</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Timezone Policy:</span>{' '}
                      <span className="font-semibold text-gray-800">{user.timezone || 'Asia/Kolkata'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">First Ingestion:</span>{' '}
                      <span className="font-mono text-gray-700">
                        {user.first_seen_at ? new Date(user.first_seen_at).toLocaleString() : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Last Telemetry:</span>{' '}
                      <span className="font-mono text-gray-700">
                        {user.last_seen_at ? new Date(user.last_seen_at).toLocaleString() : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LIVE ATTENDANCE PUNCHES */}
            {activeTab === 'punches' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-900">Recent Terminal Events ({punchTotal})</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadUserPunches(user.device_user_id, 1)}
                    disabled={isPunchLoading}
                    className="text-[11px] h-7 rounded-lg"
                  >
                    <RefreshCw className={cn('w-3 h-3 mr-1', isPunchLoading && 'animate-spin')} />
                    Refresh
                  </Button>
                </div>

                {punches.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 bg-gray-50 rounded-2xl border border-gray-100">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50 text-gray-400" />
                    <p className="font-medium text-xs">No punch records found for Machine PIN #{user.device_user_id}.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {punches.map((p, idx) => (
                      <div
                        key={p.id || idx}
                        className="p-3 bg-white rounded-xl border border-gray-200/80 shadow-2xs flex items-center justify-between gap-3 hover:border-blue-200 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs',
                              p.punch_direction === 'IN' || p.punch_type === 'CHECK_IN'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            )}
                          >
                            {p.punch_direction === 'IN' || p.punch_type === 'CHECK_IN' ? 'IN' : 'OUT'}
                          </div>
                          <div>
                            <div className="font-mono font-bold text-gray-900 text-xs">
                              {new Date(p.punch_time).toLocaleTimeString()}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              {new Date(p.punch_time).toLocaleDateString()} • {p.device_name || device.device_name}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <Badge
                            variant={
                              String(p.verification_mode || '').toLowerCase().includes('face')
                                ? 'emerald'
                                : String(p.verification_mode || '').toLowerCase().includes('finger')
                                ? 'emerald'
                                : 'blue'
                            }
                            className="text-[9px] uppercase font-mono"
                          >
                            {p.verification_mode || 'Fingerprint'}
                          </Badge>
                          <div className="text-[9px] text-gray-400 font-mono mt-0.5">
                            Raw ID: {p.id?.slice(-8) || 'verified'}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Pagination */}
                    {punchTotal > 15 && (
                      <div className="pt-2 flex items-center justify-between text-xs text-gray-500">
                        <span>Page {punchPage} of {Math.ceil(punchTotal / 15)}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={punchPage === 1 || isPunchLoading}
                            onClick={() => loadUserPunches(user.device_user_id, punchPage - 1)}
                            className="h-7 text-xs rounded-lg"
                          >
                            Prev
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={punchPage >= Math.ceil(punchTotal / 15) || isPunchLoading}
                            onClick={() => loadUserPunches(user.device_user_id, punchPage + 1)}
                            className="h-7 text-xs rounded-lg"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: AUDIT TRAIL */}
            {activeTab === 'audit' && (
              <div className="space-y-3">
                <div className="font-bold text-gray-900 text-xs">Immutable Modification History</div>
                {auditHistory.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 bg-gray-50 rounded-2xl border border-gray-100">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-50 text-gray-400" />
                    <p className="font-medium text-xs">No modification entries logged yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditHistory.map(h => (
                      <div
                        key={h.id}
                        className="p-3 bg-white rounded-xl border border-gray-200/80 shadow-2xs flex items-center justify-between text-xs"
                      >
                        <div>
                          <Badge variant="gray" className="text-[10px] font-mono">
                            {h.change_type}
                          </Badge>
                          <div className="text-gray-800 font-medium mt-1">
                            {h.new_value || h.old_value || 'Attribute changed'}
                          </div>
                        </div>
                        <span className="font-mono text-[10px] text-gray-400">
                          {new Date(h.recorded_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs rounded-xl"
            >
              Close
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenMappingModal(user)}
                className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs rounded-xl font-bold shadow-xs"
              >
                <Link className="w-3.5 h-3.5 mr-1" />
                {user.is_mapped ? 'Re-map Employee' : 'Map Employee'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
