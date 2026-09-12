// src/features/attendance/components/UserAttendanceHistoryDrawer.tsx
// ============================================================================
// Joy PeopleHR — Enterprise Individual User Attendance Audit Drawer
// Real-time Event Stream, Multi-modal Punch Verification & Deep Inspection
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Fingerprint,
  ScanFace,
  CreditCard,
  RefreshCw,
  Filter,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  biometricGatewayService,
  BiometricDevice,
  BiometricDeviceUser,
} from '../../../services/attendance/biometricGatewayService';
import { useToast } from '../../../components/ui/Toast';
import { hrEventBus } from '../../../services/hrEventBus';
import { cn } from '../../../lib/utils';

interface UserAttendanceHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: BiometricDeviceUser | null;
  device: BiometricDevice | null;
}

export const UserAttendanceHistoryDrawer: React.FC<UserAttendanceHistoryDrawerProps> = ({
  isOpen,
  onClose,
  user,
  device,
}) => {
  const { showToast } = useToast();
  const [punches, setPunches] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPunch, setSelectedPunch] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadPunches(1);

      const unsubPunch = hrEventBus.subscribe('attendance.punch_received', () => {
        loadPunches(page);
      });
      const unsubBio = hrEventBus.subscribe('biometric.updated', () => {
        loadPunches(page);
      });

      const handleLive = () => {
        loadPunches(page);
      };
      window.addEventListener('biometric:updated', handleLive);

      const livePoll = setInterval(() => {
        if (device) biometricGatewayService.syncLivePunchesFromGateway(device.id);
        loadPunches(page);
      }, 3000);

      return () => {
        clearInterval(livePoll);
        unsubPunch();
        unsubBio();
        window.removeEventListener('biometric:updated', handleLive);
      };
    }
  }, [isOpen, user, device, page]);

  const loadPunches = async (targetPage = 1) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await biometricGatewayService.getDeviceUserAttendanceHistory(user.device_user_id, {
        page: targetPage,
        pageSize,
        deviceId: device?.id,
      });
      setPunches(res.punches);
      setTotal(res.total);
      setPage(targetPage);
      if (res.punches.length > 0 && !selectedPunch) {
        setSelectedPunch(res.punches[0]);
      }
    } catch (err) {
      console.error('Failed to load user punch history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="fixed inset-0 z-60 overflow-hidden">
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl border-l border-gray-200 flex flex-col transform transition ease-in-out duration-300 animate-in slide-in-from-right">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-mono font-bold text-base">
                #{user.device_user_id}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900">{user.name}</h3>
                  {user.is_mapped && (
                    <Badge variant="emerald" className="text-[10px]">
                      {user.mapped_employee_code}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  Attendance Telemetry Stream • {total} Total Verified Punch Events
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

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-bold text-gray-900">All Punch Records</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadPunches(page)}
                disabled={isLoading}
                className="text-xs rounded-xl h-7"
              >
                <RefreshCw className={cn('w-3 h-3 mr-1', isLoading && 'animate-spin')} />
                Refresh
              </Button>
            </div>

            {punches.length === 0 ? (
              <div className="py-16 text-center text-gray-400 bg-gray-50 rounded-2xl border border-gray-100">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No biometric punch events logged for PIN #{user.device_user_id}.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {punches.map(p => {
                  const isSelected = selectedPunch?.id === p.id;
                  const vMode = String(p.verification_mode || '').toLowerCase();
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPunch(p)}
                      className={cn(
                        'p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3',
                        isSelected
                          ? 'bg-blue-50/60 border-blue-400 shadow-2xs'
                          : 'bg-white border-gray-200/80 hover:border-blue-200'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs',
                            p.punch_direction === 'IN' || p.punch_type === 'CHECK_IN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          )}
                        >
                          {p.punch_direction === 'IN' || p.punch_type === 'CHECK_IN' ? 'IN' : 'OUT'}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 font-mono text-xs">
                            {new Date(p.punch_time).toLocaleDateString()} {new Date(p.punch_time).toLocaleTimeString()}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            {p.device_name || 'Physical Terminal'} • Socket TCP 4370
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1">
                        <Badge
                          variant={vMode.includes('face') ? 'emerald' : vMode.includes('finger') ? 'emerald' : 'blue'}
                          className="text-[9px] uppercase font-mono font-bold gap-1"
                        >
                          {vMode.includes('face') ? (
                            <ScanFace className="w-2.5 h-2.5" />
                          ) : vMode.includes('finger') ? (
                            <Fingerprint className="w-2.5 h-2.5" />
                          ) : (
                            <CreditCard className="w-2.5 h-2.5" />
                          )}
                          {p.verification_mode || 'Fingerprint'}
                        </Badge>
                        <span className="text-[9px] text-gray-400 font-mono">
                          Event: {p.id?.slice(-8) || 'verified'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selected Punch Deep Inspection Payload */}
            {selectedPunch && (
              <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Telemetry Forensic Inspection
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                  <div><span className="text-gray-400">Punch ID:</span> <span className="font-mono">{selectedPunch.id}</span></div>
                  <div><span className="text-gray-400">Device User PIN:</span> <span className="font-mono font-bold">#{selectedPunch.biometric_pin || selectedPunch.device_user_id}</span></div>
                  <div><span className="text-gray-400">Exact Timestamp:</span> <span className="font-mono">{selectedPunch.punch_time}</span></div>
                  <div><span className="text-gray-400">Verification Modality:</span> <span className="font-semibold">{selectedPunch.verification_mode}</span></div>
                  <div><span className="text-gray-400">Direction:</span> <span className="font-bold">{selectedPunch.punch_direction || 'IN'}</span></div>
                  <div><span className="text-gray-400">Source:</span> <span className="font-mono">{selectedPunch.source_type || 'LAN_AGENT'}</span></div>
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>Page {page} of {totalPages}</span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1 || isLoading}
                    onClick={() => loadPunches(page - 1)}
                    className="text-xs rounded-xl h-7"
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || isLoading}
                    onClick={() => loadPunches(page + 1)}
                    className="text-xs rounded-xl h-7"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
            <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs">
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
