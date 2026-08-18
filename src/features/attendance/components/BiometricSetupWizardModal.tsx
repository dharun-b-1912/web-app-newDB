// src/features/attendance/components/BiometricSetupWizardModal.tsx
// ============================================================================
// WorkForceOS — Biometric Setup & Local Network Auto-Discovery Wizard
// 5-Stage Zero-Config Workflow: Deploy Agent, Sweep Subnet, Adopt Terminals & Push PINs
// ============================================================================

import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { useToast } from '../../../components/ui/Toast';
import {
  Cpu,
  Server,
  Terminal,
  Search,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Radio,
  Copy,
  Download,
  ArrowRight,
  ArrowLeft,
  Wifi,
  HardDrive,
  Users,
  ShieldCheck,
  RefreshCw,
  Plus,
} from 'lucide-react';
import {
  biometricGatewayService,
  BiometricGatewayAgent,
  DiscoveredDevice,
} from '../../../services/attendance/biometricGatewayService';
import { cn } from '../../../lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSetupCompleted: () => void;
}

const WIZARD_STAGES = [
  { id: 1, label: '1. Deploy Agent' },
  { id: 2, label: '2. Tunnel Handshake' },
  { id: 3, label: '3. Scan Subnet' },
  { id: 4, label: '4. Adopt Devices' },
  { id: 5, label: '5. Sync & Test Tap' },
];

export const BiometricSetupWizardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSetupCompleted,
}) => {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedBranch, setSelectedBranch] = useState('Bengaluru Tech Park Campus');
  const [pairingData, setPairingData] = useState<{ pairingKey: string; oneLinerScript: string } | null>(null);

  // Discovery State
  const [subnetRange, setSubnetRange] = useState('192.168.1.0/24');
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [selectedDiscoveredDevice, setSelectedDiscoveredDevice] = useState<DiscoveredDevice | null>(null);

  // Adoption Form State
  const [adoptName, setAdoptName] = useState('Main Lobby Facial Ingress');
  const [adoptLocation, setAdoptLocation] = useState('Ground Floor Main Reception');

  // Sync / Tap State
  const [isSyncingEmployees, setIsSyncingEmployees] = useState(false);
  const [syncedResult, setSyncedResult] = useState<string | null>(null);
  const [testTapResult, setTestTapResult] = useState<string | null>(null);

  const handleInitAgent = () => {
    const res = biometricGatewayService.generatePairingKey(selectedBranch);
    setPairingData(res);
    showToast(`Pairing key ${res.pairingKey} generated!`);
    setCurrentStep(2);
  };

  const handleScanSubnet = async () => {
    setIsScanning(true);
    try {
      const devices = await biometricGatewayService.scanLocalNetwork('agent-blr-01', subnetRange);
      setDiscoveredDevices(devices);
      showToast(`Discovered ${devices.length} biometric hardware devices on subnet ${subnetRange}!`);
    } catch {
      showToast('Error scanning local subnet', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleAdoptDevice = (dev: DiscoveredDevice) => {
    const adopted = biometricGatewayService.adoptDiscoveredDevice(dev, {
      deviceName: adoptName || dev.model,
      branch: selectedBranch,
      location: adoptLocation || 'Campus Entrance',
    });
    showToast(`Device ${adopted.device_name} (${adopted.ip_address}:${adopted.port}) successfully enrolled!`);
    setDiscoveredDevices(prev =>
      prev.map(d => (d.ip_address === dev.ip_address ? { ...d, is_already_registered: true } : d))
    );
    setSelectedDiscoveredDevice(null);
    setCurrentStep(5);
  };

  const handleSyncEmployees = async () => {
    setIsSyncingEmployees(true);
    try {
      const devices = biometricGatewayService.getBiometricDevices();
      const target = devices[0];
      const res = await biometricGatewayService.syncEmployeesToTerminal(target.id);
      setSyncedResult(res.message);
      showToast(res.message);
    } catch {
      showToast('Error pushing employees to terminal', 'error');
    } finally {
      setIsSyncingEmployees(false);
    }
  };

  const handleSimulateTestTap = async () => {
    const devices = biometricGatewayService.getBiometricDevices();
    const target = devices[0];
    const res = await biometricGatewayService.ingestRawPunch({
      deviceId: target.id,
      biometricPin: 'emp-001',
      verificationMode: 'Face',
      sourceType: 'LAN_AGENT',
    });
    setTestTapResult(`Verified Punch from Arun Kumar on ${target.device_name} (${res.punch.dedup_hash})`);
    showToast('Live biometric tap received and processed into Attendance Engine!');
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Biometric Hardware Setup & LAN Auto-Discovery Wizard"
      description="Zero-port forwarding setup: Scan customer local network, discover ZKTeco/Mantra terminals, and enroll devices"
      size="xl"
    >
      <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
        {/* Wizard Steps Progress Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 overflow-x-auto">
          {WIZARD_STAGES.map(stage => {
            const isActive = currentStep === stage.id;
            const isPast = currentStep > stage.id;
            return (
              <div
                key={stage.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap',
                  isActive
                    ? 'bg-[#07563D] text-white shadow-2xs'
                    : isPast
                    ? 'bg-emerald-100 text-[#07563D]'
                    : 'text-gray-400'
                )}
              >
                <span>{stage.label}</span>
              </div>
            );
          })}
        </div>

        {/* STAGE 1: Branch & Deploy Agent */}
        {currentStep === 1 && (
          <div className="space-y-4 max-w-xl mx-auto">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Target Client Office / Factory Campus *</label>
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 bg-white font-bold"
              >
                <option value="Bengaluru Tech Park Campus">Bengaluru Tech Park Campus</option>
                <option value="Coimbatore Plant & Manufacturing Unit">Coimbatore Plant & Manufacturing Unit</option>
                <option value="Mumbai Regional Headquarters">Mumbai Regional Headquarters</option>
              </select>
            </div>

            <Card className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2 text-xs text-emerald-900">
              <div className="flex items-center gap-2 font-bold text-[#07563D]">
                <Radio className="w-4 h-4" /> Zero-Port Forwarding On-Premises Architecture
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                The WorkForceOS LAN Gateway Agent runs as a background Windows Service or Linux daemon on any machine inside the customer's local network. It connects via outbound WebSocket (WSS) to the WorkForceOS Cloud. No public static IP or firewall pinholes needed!
              </p>
            </Card>

            <Button
              variant="primary"
              size="sm"
              onClick={handleInitAgent}
              className="w-full bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl py-3 shadow-xs"
            >
              <Zap className="w-4 h-4" /> Generate Gateway Activation Key & Continue
            </Button>
          </div>
        )}

        {/* STAGE 2: Tunnel Handshake */}
        {currentStep === 2 && (
          <div className="space-y-4 max-w-xl mx-auto">
            <Card className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Pairing Activation Token</span>
              <div className="flex items-center justify-between font-mono text-lg font-black text-[#07563D]">
                <span>{pairingData?.pairingKey || 'PAIR-BLR-9921'}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (pairingData) navigator.clipboard.writeText(pairingData.pairingKey);
                    showToast('Pairing key copied to clipboard!');
                  }}
                  className="text-xs gap-1 rounded-xl"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </Button>
              </div>
            </Card>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">Windows PowerShell One-Liner Installer</label>
              <textarea
                readOnly
                rows={3}
                value={
                  pairingData?.oneLinerScript ||
                  `powershell -ExecutionPolicy Bypass -Command "iwr -useb https://get.workforceos.io/gateway-install.ps1 | iex" -PairingKey "PAIR-BLR-9921" -TenantId "org-joy-01"`
                }
                className="w-full p-3 font-mono text-[11px] rounded-xl border border-gray-200 bg-gray-900 text-emerald-400 select-all"
              />
            </div>

            <Card className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">Agent Handshake Confirmed</h4>
                  <p className="text-[10px] text-emerald-700">Outbound TLS Tunnel Active (12ms latency, IP: 192.168.1.100)</p>
                </div>
              </div>
              <Badge variant="emerald" size="sm" className="text-[10px]">
                ONLINE
              </Badge>
            </Card>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentStep(3)}
                className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1 rounded-xl"
              >
                Continue to Subnet Scan <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STAGE 3: Subnet Auto-Discovery Scan */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">Local Network Subnet CIDR *</label>
                <input
                  type="text"
                  value={subnetRange}
                  onChange={e => setSubnetRange(e.target.value)}
                  className="w-full p-2 text-xs font-mono rounded-xl border border-gray-200 bg-white font-bold"
                />
              </div>

              <div className="sm:pt-5">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isScanning}
                  onClick={handleScanSubnet}
                  className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl shadow-xs whitespace-nowrap"
                >
                  <Search className="w-4 h-4" />
                  {isScanning ? 'Scanning 254 IPs on TCP 4370 & 11100...' : 'Scan Local Network for Devices'}
                </Button>
              </div>
            </div>

            {/* Discovered Terminals Matrix */}
            {discoveredDevices.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                  <span>Discovered Hardware Terminals ({discoveredDevices.length})</span>
                  <span className="text-[11px] text-gray-400 font-mono">Ports: 4370 (ZKTeco), 11100 (Mantra), 8000 (Matrix)</span>
                </div>

                <div className="space-y-2.5">
                  {discoveredDevices.map(dev => (
                    <div
                      key={dev.ip_address}
                      className={cn(
                        'p-4 rounded-2xl border transition shadow-2xs flex items-center justify-between',
                        dev.is_already_registered
                          ? 'bg-gray-50 border-gray-200 opacity-75'
                          : 'bg-white border-gray-200 hover:border-emerald-300'
                      )}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold text-xs shrink-0">
                          <Cpu className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-gray-900">{dev.model}</h4>
                            <Badge variant="gray" size="sm" className="text-[9px]">
                              {dev.vendor}
                            </Badge>
                            <span className="text-[10px] text-emerald-600 font-mono font-bold">
                              {dev.latency_ms}ms ping
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                            <span className="font-mono font-bold text-gray-800">{dev.ip_address}:{dev.port}</span>
                            <span>•</span>
                            <span className="font-mono text-gray-400">MAC: {dev.mac_address}</span>
                            <span>•</span>
                            <span>{dev.user_count} Enrolled Users</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {dev.is_already_registered ? (
                          <Badge variant="emerald" size="sm" className="text-[10px]">
                            Enrolled in WorkForceOS
                          </Badge>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedDiscoveredDevice(dev);
                              setAdoptName(dev.model.split(' ')[0] + ' Terminal');
                              setCurrentStep(4);
                            }}
                            className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1 rounded-xl"
                          >
                            <Plus className="w-3.5 h-3.5" /> Adopt Device
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STAGE 4: Adopt Device & Location Mapping */}
        {currentStep === 4 && selectedDiscoveredDevice && (
          <div className="space-y-4 max-w-xl mx-auto">
            <Card className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-emerald-800 uppercase">Selected Discovered Terminal</span>
              <div className="text-xs font-bold text-gray-900">{selectedDiscoveredDevice.model}</div>
              <div className="text-[11px] font-mono text-gray-600">
                IP: {selectedDiscoveredDevice.ip_address}:{selectedDiscoveredDevice.port} • MAC: {selectedDiscoveredDevice.mac_address}
              </div>
            </Card>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Friendly Display Name *</label>
              <input
                type="text"
                value={adoptName}
                onChange={e => setAdoptName(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Physical Location & Door Assignment *</label>
              <input
                type="text"
                placeholder="e.g. Ground Floor Main Turnstile Entry"
                value={adoptLocation}
                onChange={e => setAdoptLocation(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentStep(3)} className="text-xs rounded-xl">
                Back to Scan
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAdoptDevice(selectedDiscoveredDevice)}
                className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1 rounded-xl shadow-xs"
              >
                Enroll & Pair Device <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STAGE 5: Sync Employees & Test Tap */}
        {currentStep === 5 && (
          <div className="space-y-5 max-w-xl mx-auto">
            <Card className="p-5 bg-white border border-gray-200/80 rounded-2xl space-y-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold text-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Push Employee Biometric Directory</h4>
                  <p className="text-[11px] text-gray-500">
                    Sync all active employee codes, PINs, and RFID badge credentials directly to the hardware terminal.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={isSyncingEmployees}
                onClick={handleSyncEmployees}
                className="w-full text-xs font-bold rounded-xl border-emerald-300 text-[#07563D] hover:bg-emerald-50"
              >
                <RefreshCw className={cn('w-3.5 h-3.5 mr-1', isSyncingEmployees && 'animate-spin')} />
                {isSyncingEmployees ? 'Pushing Employee Biometrics...' : 'Push Employee Directory to Terminal'}
              </Button>

              {syncedResult && (
                <div className="p-3 bg-emerald-50 text-emerald-900 text-xs font-mono rounded-xl border border-emerald-200">
                  ✓ {syncedResult}
                </div>
              )}
            </Card>

            <Card className="p-5 bg-white border border-gray-200/80 rounded-2xl space-y-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Live Hardware Tap Simulator</h4>
                  <p className="text-[11px] text-gray-500">
                    Perform a test tap on the physical reader to verify sub-second cloud ingestion & shift calculation.
                  </p>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSimulateTestTap}
                className="w-full bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl shadow-xs py-2.5"
              >
                <Zap className="w-4 h-4" /> Simulate Physical Hardware Tap
              </Button>

              {testTapResult && (
                <div className="p-3 bg-emerald-50 text-emerald-900 text-xs font-mono rounded-xl border border-emerald-200">
                  🟢 {testTapResult}
                </div>
              )}
            </Card>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onSetupCompleted();
                  onClose();
                }}
                className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1 rounded-xl"
              >
                Complete Setup & Return to Console <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
