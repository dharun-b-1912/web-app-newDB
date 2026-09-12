// src/features/admin/subviews/DeviceInfrastructureView.tsx
// ============================================================================
// Joy PeopleHR — Enterprise Device Infrastructure & Gateway Management (IT Admin)
// Scoped for IT Engineers: Connector Daemons, Outbound WSS Tunnels, Socket Probes & Diagnostics
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { useToast } from '../../../components/ui/Toast';
import {
  Server,
  Terminal,
  Activity,
  Cpu,
  RefreshCw,
  Zap,
  Radio,
  Copy,
  Trash2,
  Play,
  HardDrive,
  Clock,
  Bug,
  ShieldCheck,
  Search,
  Download,
} from 'lucide-react';
import {
  biometricGatewayService,
  BiometricGatewayAgent,
  BiometricDiagnosticLog,
} from '../../../services/attendance/biometricGatewayService';
import {
  biometricCommandService,
  BiometricDeviceCommand,
  getActiveOrgId,
} from '../../../services/attendance/biometricCommandService';
import { cn } from '../../../lib/utils';

export const DeviceInfrastructureView: React.FC = () => {
  const { showToast } = useToast();
  const [agents, setAgents] = useState<BiometricGatewayAgent[]>([]);
  const [commands, setCommands] = useState<BiometricDeviceCommand[]>([]);
  const [diagnosticLogs, setDiagnosticLogs] = useState<BiometricDiagnosticLog[]>([]);
  const [subTab, setSubTab] = useState<'agents' | 'commands' | 'diagnostics' | 'stress'>('agents');

  // Pairing State
  const [pairingBranch, setPairingBranch] = useState('Bengaluru Tech Park Campus');
  const [generatedPairingData, setGeneratedPairingData] = useState<{
    pairingKey: string;
    oneLinerScript: string;
  } | null>(null);

  // Stress Test
  const [stressCount, setStressCount] = useState(250);
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [stressResult, setStressResult] = useState<any>(null);

  const loadData = () => {
    setAgents(biometricGatewayService.getGatewayAgents());
    setCommands(biometricCommandService.getCommands());
    setDiagnosticLogs(biometricGatewayService.getDiagnosticLogs());
  };

  useEffect(() => {
    loadData();
    const res = biometricGatewayService.generatePairingKey(pairingBranch);
    setGeneratedPairingData(res);
  }, []);

  const handleCopyScript = () => {
    if (generatedPairingData?.oneLinerScript) {
      navigator.clipboard.writeText(generatedPairingData.oneLinerScript);
      showToast('Connector startup script copied to clipboard!');
    }
  };

  const handleRunStress = async () => {
    setIsStressTesting(true);
    setStressResult(null);
    try {
      const res = await biometricGatewayService.simulateHighConcurrencyTaps(stressCount);
      setStressResult(res);
      showToast(`Stress test complete! ${res.processed} punches written in ${res.elapsedMs}ms.`);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Stress test failed', 'error');
    } finally {
      setIsStressTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto p-4 sm:p-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
            <span>Administration</span>
            <span>/</span>
            <span>Integrations</span>
            <span>/</span>
            <span className="text-gray-900 font-bold">Device Infrastructure</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Biometric Edge Infrastructure</h1>
          <p className="text-xs text-gray-500 mt-1">
            IT Administrator console for managing JOY PeopleHR Attendance Connectors, outbound tunnels, raw commands, and stress testing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="emerald" size="md" className="gap-1.5 py-1 px-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Outbound WSS / HTTPS Active
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setSubTab('agents')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
            subTab === 'agents' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          <Server className="w-4 h-4" />
          Attendance Connectors ({agents.length})
        </button>

        <button
          onClick={() => setSubTab('commands')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
            subTab === 'commands' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          <Terminal className="w-4 h-4" />
          Command Ledger ({commands.length})
        </button>

        <button
          onClick={() => setSubTab('diagnostics')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
            subTab === 'diagnostics' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          <Bug className="w-4 h-4" />
          Diagnostic Logs ({diagnosticLogs.length})
        </button>

        <button
          onClick={() => setSubTab('stress')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
            subTab === 'stress' ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          <Zap className="w-4 h-4" />
          Factory Stress Benchmark
        </button>
      </div>

      {/* SUBTAB 1: AGENTS */}
      {subTab === 'agents' && (
        <div className="space-y-6">
          <Card className="p-6 bg-white border border-gray-200/80 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Install JOY PeopleHR Attendance Connector</h2>
                <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                  Install this lightweight service on a customer server or PC inside the factory network. It establishes a secure outbound connection to JOY Cloud without requiring inbound router port forwarding.
                </p>
              </div>

              <a
                href="/downloads/JOY-PeopleHR-Attendance-Connector-Setup.exe"
                download="JOY-PeopleHR-Attendance-Connector-Setup.exe"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold shadow-xs shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download Windows Installer (.exe)
              </a>
            </div>

            <div className="p-4 rounded-xl bg-gray-950 text-gray-100 font-mono text-xs flex items-center justify-between gap-4 overflow-x-auto">
              <span className="truncate">{generatedPairingData?.oneLinerScript}</span>
              <Button size="sm" variant="outline" onClick={handleCopyScript} className="shrink-0 gap-1.5 text-white bg-gray-800 border-gray-700 hover:bg-gray-700">
                <Copy className="w-3.5 h-3.5" /> Copy Command
              </Button>
            </div>
          </Card>

          <Card className="p-6 bg-white border border-gray-200/80 rounded-2xl">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Active Local Connectors</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Connector Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Local / Host IP</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Last Heartbeat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-bold text-gray-900">{a.agent_name}</TableCell>
                    <TableCell className="text-xs text-gray-600">{a.branch_name}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-600">{a.local_ip}</TableCell>
                    <TableCell>
                      <Badge variant={a.status === 'ONLINE' ? 'emerald' : 'rose'} size="sm">
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-600">{a.version}</TableCell>
                    <TableCell className="text-xs text-gray-500">{new Date(a.last_heartbeat).toLocaleTimeString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* SUBTAB 2: COMMANDS */}
      {subTab === 'commands' && (
        <Card className="p-6 bg-white border border-gray-200/80 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900">Dispatched Hardware Commands</h2>
            <Button size="sm" variant="outline" onClick={() => biometricCommandService.clearCommands()}>
              Clear History
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Command ID</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Command Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dispatched At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-xs text-gray-500">
                    No hardware commands queued.
                  </TableCell>
                </TableRow>
              ) : (
                commands.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs font-bold text-gray-800">{c.id}</TableCell>
                    <TableCell className="text-xs text-gray-700">{c.device_name || c.device_id}</TableCell>
                    <TableCell className="text-xs font-semibold text-gray-900">{c.command_type}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'COMPLETED' ? 'emerald' : c.status === 'PENDING' ? 'amber' : 'gray'} size="sm">
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">{new Date(c.created_at).toLocaleTimeString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* SUBTAB 3: DIAGNOSTICS */}
      {subTab === 'diagnostics' && (
        <Card className="p-6 bg-white border border-gray-200/80 rounded-2xl">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Driver & Socket Audit Logs</h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {diagnosticLogs.map(log => (
              <div key={log.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-3 text-xs">
                <Badge variant={log.severity === 'ERROR' || log.severity === 'CRASH' ? 'rose' : log.severity === 'WARN' ? 'amber' : 'gray'} size="sm">
                  {log.severity}
                </Badge>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{log.category}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-gray-700 mt-1 font-mono">{log.message}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* SUBTAB 4: STRESS TEST */}
      {subTab === 'stress' && (
        <Card className="p-6 bg-white border border-gray-200/80 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-gray-900">High-Concurrency Punch Benchmark</h2>
          <p className="text-xs text-gray-500 max-w-xl">
            Stress-test the local connector and cloud event ingestion pipeline with simulated factory shift-change punch bursts.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={stressCount}
              onChange={e => setStressCount(parseInt(e.target.value, 10) || 100)}
              className="w-32 px-3 py-2 text-xs border border-gray-200 rounded-xl"
            />
            <Button size="md" variant="primary" onClick={handleRunStress} disabled={isStressTesting} className="bg-[#07563D] hover:bg-[#064e37] text-white">
              <Play className="w-4 h-4 mr-2" />
              {isStressTesting ? 'Running Simulation...' : `Inject ${stressCount} Punches`}
            </Button>
          </div>

          {stressResult && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <p className="font-bold">✓ Stress Simulation Complete!</p>
              <p>Total Punches Dispatched: {stressResult.totalSent}</p>
              <p>Processed & Stored: {stressResult.processed}</p>
              <p>Deduplicated / Idempotent: {stressResult.deduplicated}</p>
              <p>Total Elapsed Time: {stressResult.elapsedMs}ms</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
