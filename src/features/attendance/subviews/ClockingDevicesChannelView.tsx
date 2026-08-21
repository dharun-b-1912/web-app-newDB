import React, { useState } from 'react';
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
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useToast } from '../../../components/ui/Toast';

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

  const devices = [
    { id: 'dev-01', name: 'ZKTeco BioStation Pro 3', serial: 'ZKT-98210384', location: 'Coimbatore HQ · Main Entrance', ip: '192.168.1.102', port: 4370, protocol: 'ADMS / PUSH', status: 'ONLINE', registeredUsers: 142, lastSync: '10s ago', pendingPunches: 0 },
    { id: 'dev-02', name: 'eSSL SilkBio 101TC', serial: 'SSL-77382910', location: 'Chennai Factory · Production Floor', ip: '10.20.1.55', port: 5005, protocol: 'PUSH HTTP', status: 'ONLINE', registeredUsers: 310, lastSync: '30s ago', pendingPunches: 0 },
    { id: 'dev-03', name: 'Realtime T502 Multi-Biometric', serial: 'RTM-44910283', location: 'Hosur Plant · Warehouse Gate', ip: '10.30.1.80', port: 4370, protocol: 'ADMS / PUSH', status: 'ONLINE', registeredUsers: 84, lastSync: '1 min ago', pendingPunches: 0 },
    { id: 'dev-04', name: 'Matrix COSEC VEGA Door Kiosk', serial: 'MTX-11928374', location: 'Bangalore Office · Server Room', ip: '12.97.2.14', port: 8080, protocol: 'API WEBHOOK', status: 'ONLINE', registeredUsers: 25, lastSync: 'Just now', pendingPunches: 0 },
  ];

  const rawLogs = [
    { id: 'log-1', device_name: 'ZKTeco BioStation Pro 3', user_pin: '1001', employee_name: 'Hari Priya', raw_time: '2026-08-20 09:04:12', verify_mode: 'Fingerprint (Sensor 1)', in_out_mode: 'CHECK_IN', sync_status: 'NORMALIZED' },
    { id: 'log-2', device_name: 'ZKTeco BioStation Pro 3', user_pin: '1000', employee_name: 'Dharun Joy', raw_time: '2026-08-20 08:58:30', verify_mode: 'Fingerprint (Sensor 1)', in_out_mode: 'CHECK_IN', sync_status: 'NORMALIZED' },
    { id: 'log-3', device_name: 'eSSL SilkBio 101TC', user_pin: '1002', employee_name: 'Karthik Natarajan', raw_time: '2026-08-20 09:12:05', verify_mode: 'RFID Card (ID-8839)', in_out_mode: 'CHECK_IN', sync_status: 'NORMALIZED' },
    { id: 'log-4', device_name: 'ZKTeco BioStation Pro 3', user_pin: '1003', employee_name: 'Deepa Subramanian', raw_time: '2026-08-20 09:15:40', verify_mode: 'Fingerprint (Sensor 2)', in_out_mode: 'CHECK_IN', sync_status: 'NORMALIZED' },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
              <Cpu className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">Clocking & Biometric Devices</h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-purple-100 text-purple-800 rounded-full">
              4 Gateways Online
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            ZKTeco, eSSL, Realtime hardware controller, push listeners, fingerprint/RFID sync, and punch normalization.
          </p>
        </div>

        {/* Sub-tab segmented bar */}
        <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
          <button
            onClick={() => setActiveSubTab('devices')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5',
              activeSubTab === 'devices' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Cpu className="w-3.5 h-3.5" />
            Devices ({devices.length})
          </button>
          <button
            onClick={() => setActiveSubTab('enrollment')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5',
              activeSubTab === 'enrollment' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Device Enrollment
          </button>
          <button
            onClick={() => setActiveSubTab('sync')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5',
              activeSubTab === 'sync' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync & Health
          </button>
          <button
            onClick={() => setActiveSubTab('mapping')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5',
              activeSubTab === 'mapping' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Punch Mapping
          </button>
          <button
            onClick={() => setActiveSubTab('logs')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5',
              activeSubTab === 'logs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Raw Device Logs
          </button>
        </div>
      </div>

      {/* 2. DEVICE INVENTORY */}
      {activeSubTab === 'devices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
            <div>
              <h3 className="font-bold text-gray-900">Registered Biometric Gateway Controllers</h3>
              <p className="text-gray-500">Live ADMS / ICMS TCP listener active on port 4370 & 5005.</p>
            </div>
            <button
              onClick={() => showToast('Add Biometric Device modal opened.')}
              className="px-3 py-1.5 bg-[#07563D] text-white rounded-lg font-semibold hover:bg-[#064e37] transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Device Gateway
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {devices.map(dev => (
              <div key={dev.id} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{dev.name}</h4>
                    <p className="text-[11px] text-gray-500 font-mono mt-0.5">SN: {dev.serial} · {dev.location}</p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {dev.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2 bg-gray-50 rounded text-[11px] text-gray-600 font-mono">
                  <div>
                    <span className="text-[10px] text-gray-400 block">IP / PORT</span>
                    {dev.ip}:{dev.port}
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">PROTOCOL</span>
                    {dev.protocol}
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">ENROLLED USERS</span>
                    <strong className="text-gray-900">{dev.registeredUsers}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                  <span className="text-gray-400 text-[11px]">Synced: {dev.lastSync}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => showToast(`Syncing punch logs from ${dev.name}...`)}
                      className="px-2.5 py-1 text-[11px] font-semibold border border-gray-200 rounded hover:bg-gray-50"
                    >
                      Pull Punches
                    </button>
                    <button
                      onClick={() => showToast(`Syncing employee registry to ${dev.name}...`)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-[#07563D] text-white rounded hover:bg-[#064e37]"
                    >
                      Push Users
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. DEVICE LOGS */}
      {activeSubTab === 'logs' && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden text-xs">
          <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 uppercase tracking-wider">Raw Biometric Ingestion Log Stream</h3>
            <span className="text-gray-500 font-mono text-[11px]">Real-time TCP Packet Sniffer Active</span>
          </div>

          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3">Device</th>
                <th className="p-3">Employee & PIN</th>
                <th className="p-3">Verify Mode</th>
                <th className="p-3">Raw Timestamp</th>
                <th className="p-3">Punch Type</th>
                <th className="p-3 text-right">Normalization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rawLogs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-900">{log.device_name}</td>
                  <td className="p-3">
                    <div className="font-bold text-gray-900">{log.employee_name}</div>
                    <div className="text-[11px] text-gray-500 font-mono">PIN: {log.user_pin}</div>
                  </td>
                  <td className="p-3 text-gray-600 font-mono">{log.verify_mode}</td>
                  <td className="p-3 font-mono font-semibold text-gray-900">{log.raw_time}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">
                      {log.in_out_mode}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                      ✓ {log.sync_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. PUNCH MAPPING RULES */}
      {activeSubTab === 'mapping' && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg text-xs space-y-3">
          <h3 className="font-bold text-gray-900">Multi-Punch Normalization Engine Rules</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 border border-gray-200 rounded-lg space-y-1">
              <span className="font-bold text-gray-900 block">First In / Last Out (FILO)</span>
              <p className="text-gray-500 text-[11px]">Consolidates multiple intermediate door swipes into one unified daily attendance record.</p>
              <span className="text-[10px] font-bold text-emerald-700 block mt-1">ACTIVE RULE (DEFAULT)</span>
            </div>
            <div className="p-3 border border-gray-200 rounded-lg space-y-1">
              <span className="font-bold text-gray-900 block">De-duplication Threshold</span>
              <p className="text-gray-500 text-[11px]">Ignores consecutive punches within 120 seconds on the same physical biometric sensor.</p>
              <span className="text-[10px] font-bold text-emerald-700 block mt-1">ACTIVE (120 SECONDS)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
