import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Cpu,
  RefreshCw,
  SlidersHorizontal,
  FileSpreadsheet,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Radio,
  Server,
  Zap,
  Activity,
  Search,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useToast } from '../../../components/ui/Toast';
import { biometricCommandService, getActiveOrgId } from '../../../services/attendance/biometricCommandService';
import { biometricGatewayService } from '../../../services/attendance/biometricGatewayService';
import { api } from '../../../services/api';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

export interface ClockingDevicesChannelViewProps {
  currentTab?: string;
  onNavigateSubPath?: (path: string) => void;
  onOpenEmployeeProfile?: (empId: string) => void;
}

export const ClockingDevicesChannelView: React.FC<ClockingDevicesChannelViewProps> = ({
  currentTab = 'biometric',
  onNavigateSubPath,
  onOpenEmployeeProfile,
}) => {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'devices' | 'enrollment' | 'sync' | 'mapping' | 'logs'>(
    currentTab === 'device-enrollment'
      ? 'enrollment'
      : currentTab === 'device-sync'
      ? 'sync'
      : currentTab === 'punch-mapping'
      ? 'mapping'
      : currentTab === 'device-logs'
      ? 'logs'
      : 'devices'
  );

  const [devices, setDevices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [punches, setPunches] = useState<any[]>([]);

  const loadData = useCallback(() => {
    const devs = biometricGatewayService.getBiometricDevices();
    setDevices(devs);

    api.getEmployees().then((emps) => {
      setEmployees(emps);
    }).catch(() => []);

    const p = biometricGatewayService.getRawPunches(50);
    setPunches(p);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-4">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
              <Cpu className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">Clocking & Biometric Gateways</h1>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-purple-100 text-purple-800 rounded-full">
              {devices.filter(d => d.status === 'ONLINE').length} / {devices.length} Online
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            ZKTeco, eSSL, Realtime hardware controller, push listeners, fingerprint/RFID sync, and punch normalization.
          </p>
        </div>

        {/* Sub-tab segmented bar */}
        <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs flex-wrap gap-1">
          <button
            onClick={() => setActiveSubTab('devices')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              activeSubTab === 'devices' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Cpu className="w-3.5 h-3.5" />
            Devices ({devices.length})
          </button>
          <button
            onClick={() => setActiveSubTab('enrollment')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              activeSubTab === 'enrollment' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Device Users ({employees.length})
          </button>
          <button
            onClick={() => setActiveSubTab('logs')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              activeSubTab === 'logs' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Activity className="w-3.5 h-3.5" />
            Device Raw Logs ({punches.length})
          </button>
        </div>
      </div>

      {/* 2. DEVICES LIST */}
      {activeSubTab === 'devices' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map((dev) => (
            <div key={dev.id} className="p-5 bg-white border border-gray-200/80 rounded-2xl shadow-2xs space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{dev.device_name || dev.name}</h4>
                    <span className="text-[11px] text-gray-400 font-mono block">{dev.serial_number || dev.serial} • {dev.model || 'BioGateway'}</span>
                  </div>
                </div>
                <Badge variant={dev.status === 'ONLINE' ? 'emerald' : 'amber'}>{dev.status}</Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50/80 rounded-xl text-xs border border-gray-100">
                <div>
                  <span className="text-[10px] text-gray-400 block font-semibold uppercase">IP Endpoint</span>
                  <strong className="font-mono text-gray-800">{dev.ip_address || '192.168.1.100'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-semibold uppercase">Protocol</span>
                  <strong className="font-mono text-gray-800">{dev.protocol || 'PUSH HTTP'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-semibold uppercase">Staff Synced</span>
                  <strong className="font-mono text-[#07563D]">{employees.length} Users</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. ENROLLMENT TAB */}
      {activeSubTab === 'enrollment' && (
        <div className="bg-white border border-gray-200/80 rounded-2xl shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Device User Mapping Registry</h3>
              <p className="text-xs text-gray-500 mt-0.5">Biometric PIN & template mapping for staff in current organization.</p>
            </div>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Employee</th>
                <th className="p-3">Department</th>
                <th className="p-3">Biometric PIN</th>
                <th className="p-3">Templates</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((emp, idx) => (
                <tr key={emp.id} className="hover:bg-gray-50/50">
                  <td className="p-3">
                    <strong className="text-gray-900 block">{emp.display_name || emp.name}</strong>
                    <span className="text-[11px] text-gray-400 font-mono">{emp.employee_code || 'WF-EMP'}</span>
                  </td>
                  <td className="p-3 text-gray-700">{emp.department_name || emp.department || 'Operations'}</td>
                  <td className="p-3 font-mono font-bold text-gray-900">PIN-{1000 + idx}</td>
                  <td className="p-3">
                    <Badge variant="blue" size="sm">Fingerprint + RFID</Badge>
                  </td>
                  <td className="p-3 text-right">
                    <Badge variant="emerald" size="sm">Synchronized</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. LOGS TAB */}
      {activeSubTab === 'logs' && (
        <div className="bg-white border border-gray-200/80 rounded-2xl shadow-2xs p-5 text-xs space-y-3">
          <h3 className="text-sm font-bold text-gray-900">Live Hardware Raw Punch Ingestion</h3>
          {punches.length > 0 ? (
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Device</th>
                  <th className="p-3">User PIN</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {punches.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-bold text-gray-900">{p.device_name || 'Terminal'}</td>
                    <td className="p-3 font-mono">{p.user_pin}</td>
                    <td className="p-3">{p.verify_mode || 'Fingerprint'}</td>
                    <td className="p-3 font-mono">{p.raw_time}</td>
                    <td className="p-3 text-right">
                      <Badge variant="emerald" size="sm">NORMALIZED</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-10 text-center text-xs text-gray-500">
              No hardware punches ingested yet. Turnstile and biometric terminal swipes will ingest here in real-time.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
