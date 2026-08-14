import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Cpu, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Server, Plus, Activity } from 'lucide-react';
import { BiometricDevice, BiometricSyncLog } from '../../../types/attendance';
import { attendanceApi } from '../../../services/attendanceApi';
import { useToast } from '../../../components/ui/Toast';

export const BiometricIntegrationView: React.FC = () => {
  const { showToast } = useToast();
  const [devices, setDevices] = useState<BiometricDevice[]>(() => attendanceApi.getBiometricDevices());
  const [syncLogs, setSyncLogs] = useState<BiometricSyncLog[]>([]);

  const handleSyncDevice = (deviceId: string) => {
    const log = attendanceApi.syncBiometricDevice(deviceId);
    setSyncLogs(prev => [log, ...prev]);
    setDevices(attendanceApi.getBiometricDevices());
    showToast(`Device ${log.device_name} synced successfully. Processed ${log.records_processed} biometric events without duplicates.`);
  };

  const handleSyncAll = () => {
    devices.forEach(d => {
      const log = attendanceApi.syncBiometricDevice(d.id);
      setSyncLogs(prev => [log, ...prev]);
    });
    setDevices(attendanceApi.getBiometricDevices());
    showToast('Triggered full enterprise biometric network sync across all devices.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Biometric Devices & Hardware Sync Adapter</h2>
          <p className="text-xs text-gray-500 mt-1">
            Real-time biometric terminal integration, hardware adapter status, offline event deduplication, and sync logs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={handleSyncAll}>
            Sync All Terminals
          </Button>
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Registering new ZKTeco / Suprema terminal...')}>
            Add Biometric Terminal
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Terminals</div>
          <div className="text-2xl font-black text-gray-900">{devices.length} Devices</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">100% Online & Active</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Events Ingested Today</div>
          <div className="text-2xl font-black text-emerald-700">1,842 Punches</div>
          <div className="text-[10px] text-gray-500 mt-1">Facial, Fingerprint, RFID</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Deduplication Engine</div>
          <div className="text-2xl font-black text-blue-700">0 Duplicates</div>
          <div className="text-[10px] text-gray-500 mt-1">Fingerprint Hash Matched</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Provider Adapter Status</div>
          <div className="text-2xl font-black text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Connected
          </div>
          <div className="text-[10px] text-gray-500 mt-1">TCP/IP Port 4370 & 51211</div>
        </Card>
      </div>

      <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-gray-900">Configured Biometric Terminals</h3>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Terminal Name & Model</TableHead>
              <TableHead>Vendor & Type</TableHead>
              <TableHead>Location & Branch</TableHead>
              <TableHead>IP Address : Port</TableHead>
              <TableHead>Sync Frequency</TableHead>
              <TableHead>Last Sync</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map(dev => (
              <TableRow key={dev.id}>
                <TableCell>
                  <div className="font-bold text-gray-900 text-xs">{dev.device_name}</div>
                  <div className="text-[10px] text-gray-500 font-mono">SN: {dev.serial_number}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-semibold text-gray-800">{dev.vendor}</div>
                  <Badge variant="emerald" size="xs">{dev.device_type}</Badge>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-gray-800 font-medium">{dev.branch}</div>
                  <div className="text-[10px] text-gray-500">{dev.location}</div>
                </TableCell>
                <TableCell className="text-xs font-mono text-gray-700">{dev.ip_address}:{dev.port}</TableCell>
                <TableCell className="text-xs text-gray-600">Every {dev.sync_frequency_mins} mins</TableCell>
                <TableCell className="text-xs font-mono text-gray-800">{dev.last_sync}</TableCell>
                <TableCell>
                  <Badge variant={dev.status === 'Online' ? 'emerald' : 'rose'} size="sm">
                    {dev.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="xs"
                    variant="outline"
                    leftIcon={<RefreshCw className="w-3 h-3" />}
                    onClick={() => handleSyncDevice(dev.id)}
                  >
                    Sync Device
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Sync Logs */}
      {syncLogs.length > 0 && (
        <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
          <h3 className="text-sm font-extrabold text-gray-900">Recent Biometric Sync Logs</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sync ID</TableHead>
                <TableHead>Terminal Name</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Processed</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {syncLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs font-mono">{log.id}</TableCell>
                  <TableCell className="text-xs font-bold text-gray-900">{log.device_name}</TableCell>
                  <TableCell className="text-xs font-mono">{log.start_time}</TableCell>
                  <TableCell className="text-xs font-bold text-emerald-800">{log.records_received}</TableCell>
                  <TableCell className="text-xs font-bold text-gray-900">{log.records_processed}</TableCell>
                  <TableCell>
                    <Badge variant="emerald" size="xs">{log.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};
