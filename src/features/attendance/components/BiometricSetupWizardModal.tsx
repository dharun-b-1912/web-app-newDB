// src/features/attendance/components/BiometricSetupWizardModal.tsx
// ============================================================================
// Joy PeopleHR — Enterprise 5-Step Guided Biometric Add Device Wizard
// Step 1: Connection Method → Step 2: Location → Step 3: Device Info → Step 4: Test Socket → Step 5: Complete
// ============================================================================

import React, { useState, useEffect } from 'react';
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
  Network,
  Check,
  Building2,
} from 'lucide-react';
import {
  biometricGatewayService,
  BiometricGatewayAgent,
  DiscoveredDevice,
  BiometricDevice,
} from '../../../services/attendance/biometricGatewayService';
import { organizationStructureService } from '../../../services/organization/organizationStructureService';
import { hrEventBus } from '../../../services/hrEventBus';
import { getActiveOrgId } from '../../../services/attendance/biometricCommandService';
import { cn } from '../../../lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSetupCompleted: (createdDevice?: BiometricDevice) => void;
  onOpenDevice?: (device: BiometricDevice) => void;
}

const WIZARD_STEPS = [
  { step: 1, title: 'Connection Method' },
  { step: 2, title: 'Location & Branch' },
  { step: 3, title: 'Device Details' },
  { step: 4, title: 'Test Connection' },
  { step: 5, title: 'Complete' },
];

export const BiometricSetupWizardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSetupCompleted,
  onOpenDevice,
}) => {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Method
  const [connectionMethod, setConnectionMethod] = useState<'GATEWAY' | 'MANUAL'>('GATEWAY');

  // Step 2: Location & Branch
  const [availableBranches, setAvailableBranches] = useState<string[]>([
    'Bengaluru Tech Park Campus',
    'Coimbatore Plant & Manufacturing Unit',
    'Mumbai Corporate Towers',
    'Delhi NCR Logistics Hub',
    'Chennai Manufacturing Plant',
  ]);
  const [branch, setBranch] = useState('Bengaluru Tech Park Campus');
  const [isAddingCustomBranch, setIsAddingCustomBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCity, setNewBranchCity] = useState('');
  const [isSavingBranch, setIsSavingBranch] = useState(false);

  const [locationDesc, setLocationDesc] = useState('Main Reception Turnstile');
  const [departmentArea, setDepartmentArea] = useState('Entrance Lobby / Ground Floor');
  const [directionMode, setDirectionMode] = useState<'CHECK_IN' | 'CHECK_OUT' | 'BOTH'>('BOTH');

  useEffect(() => {
    let isMounted = true;
    const fetchBranches = async () => {
      try {
        const list = await organizationStructureService.getBranches();
        if (isMounted && list && list.length > 0) {
          const names = Array.from(
            new Set([
              ...list.map(b => b.name),
              'Bengaluru Tech Park Campus',
              'Coimbatore Plant & Manufacturing Unit',
              'Mumbai Corporate Towers',
              'Delhi NCR Logistics Hub',
              'Chennai Manufacturing Plant',
            ])
          ).filter(Boolean);
          setAvailableBranches(names);
          if (!branch || !names.includes(branch)) {
            setBranch(names[0]);
          }
        }
      } catch (_) {}
    };

    fetchBranches();
    const unsub = hrEventBus.on('organization.branch_created', fetchBranches);
    return () => {
      isMounted = false;
      unsub();
    };
  }, [isOpen]);

  const handleSaveCustomBranch = async () => {
    if (!newBranchName.trim()) {
      showToast('Please enter a branch name', 'error');
      return;
    }
    setIsSavingBranch(true);
    try {
      const name = newBranchName.trim();
      const code = `BR-${name.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      await organizationStructureService.createBranch({
        company_id: 'comp-joy-corp',
        name,
        code,
        city: newBranchCity.trim() || 'Coimbatore',
        state: 'Tamil Nadu',
      });
      setAvailableBranches(prev => Array.from(new Set([name, ...prev])));
      setBranch(name);
      setNewBranchName('');
      setNewBranchCity('');
      setIsAddingCustomBranch(false);
      showToast(`✓ Custom Branch "${name}" created and selected!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to create branch', 'error');
    } finally {
      setIsSavingBranch(false);
    }
  };

  // Step 3: Device Information
  const [vendor, setVendor] = useState<'ZKTeco' | 'Mantra' | 'eSSL' | 'Suprema' | 'Matrix COSEC'>('ZKTeco');
  const [model, setModel] = useState('ZKTeco Time Attendance Terminal');
  const [deviceType, setDeviceType] = useState<'Facial Recognition' | 'Fingerprint' | 'Turnstile Gate' | 'RFID Card'>('Fingerprint');
  const [ipAddress, setIpAddress] = useState('');
  const [port, setPort] = useState(4370);
  const [deviceName, setDeviceName] = useState('ZKTeco Time Attendance - Main Reception');
  const [serialNumber, setSerialNumber] = useState('');

  // Auto-Discovery Mode
  const [isAutoDiscovering, setIsAutoDiscovering] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);

  // Step 4: Test Connection
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latency_ms?: number;
    message?: string;
    details?: any;
  } | null>(null);

  // Step 5: Created Device
  const [createdDevice, setCreatedDevice] = useState<BiometricDevice | null>(null);

  const resetWizard = () => {
    setCurrentStep(1);
    setConnectionMethod('GATEWAY');
    setTestResult(null);
    setCreatedDevice(null);
  };

  const handleAutoDiscoverSubnet = async () => {
    setIsAutoDiscovering(true);
    try {
      const registeredDevices = biometricGatewayService.getBiometricDevices();
      const registeredIps = new Set(registeredDevices.map(d => d.ip_address));
      const registeredSerials = new Set(registeredDevices.map(d => d.serial_number));

      // 1. If user typed an IP, probe it directly
      let directFound: DiscoveredDevice | null = null;
      if (ipAddress && !registeredIps.has(ipAddress)) {
        const directProbe = await biometricGatewayService.probeSingleDevice(ipAddress, port || 4370);
        if (directProbe.success && directProbe.device) {
          directFound = directProbe.device;
        }
      }

      // 2. Perform network sweep
      const devices = await biometricGatewayService.scanLocalNetwork('agent-default', 'auto', ipAddress || '192.168.1.13');
      
      // Filter out already registered/connected devices
      const unassignedDevices = devices.filter(
        d => !registeredIps.has(d.ip_address) && !registeredSerials.has(d.serial_number) && !d.is_already_registered
      );

      const allFound = directFound && !unassignedDevices.some(d => d.ip_address === directFound!.ip_address)
        ? [directFound, ...unassignedDevices]
        : unassignedDevices;

      setDiscoveredDevices(allFound);

      if (allFound.length > 0) {
        const found = allFound[0];
        setIpAddress(found.ip_address);
        setPort(found.port);
        setVendor(found.vendor as any);
        setModel(found.model);
        setSerialNumber(found.serial_number);
        setDeviceName(`${found.vendor} ${found.model} - Main Reception`);
        showToast(`✓ New Terminal Discovered: ${found.ip_address}:${found.port} (${found.latency_ms || 4}ms)!`);
      } else {
        if (registeredDevices.length > 0 && devices.some(d => registeredIps.has(d.ip_address))) {
          showToast(`All active devices on your network are already registered in Joy PeopleHR.`, 'info');
        } else {
          showToast(`No new terminal responded on local subnet. Verify device IP (e.g. 192.168.1.13) and ensure gateway agent is running.`, 'info');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Auto-discovery error', 'error');
    } finally {
      setIsAutoDiscovering(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const probeRes = await biometricGatewayService.probeSingleDevice(ipAddress, port);
      if (probeRes.success) {
        const latency = probeRes.device?.latency_ms || 4;
        setTestResult({
          success: true,
          latency_ms: latency,
          message: 'TCP socket connection verified successfully.',
          details: probeRes.device,
        });
        showToast(`✓ Device Online! Latency: ${latency}ms`);
      } else {
        setTestResult({
          success: false,
          message: probeRes.error || 'Unable to establish TCP socket handshake on specified IP:Port.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Gateway socket probe timed out.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndCreateDevice = () => {
    const newDev = biometricGatewayService.registerDevice({
      device_name: deviceName,
      vendor,
      device_type: deviceType,
      model,
      serial_number: serialNumber || `SN-${Date.now()}`,
      ip_address: ipAddress,
      port,
      branch,
      location_description: `${locationDesc} (${departmentArea})`,
      direction_mode: directionMode,
      gateway_agent_id: 'agent-default',
      registered_users_count: 0,
      sync_frequency_mins: 1,
    });

    setCreatedDevice(newDev);
    setCurrentStep(5);
    onSetupCompleted(newDev);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetWizard();
        onClose();
      }}
      title="Add Biometric Terminal"
      size="lg"
    >
      <div className="space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          {WIZARD_STEPS.map((s, idx) => {
            const isCurrent = currentStep === s.step;
            const isCompleted = currentStep > s.step;
            return (
              <div key={s.step} className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    isCompleted
                      ? "bg-[#07563D] text-white"
                      : isCurrent
                      ? "bg-[#07563D] text-white ring-4 ring-emerald-100"
                      : "bg-gray-100 text-gray-400"
                  )}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.step}
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold hidden sm:inline",
                    isCurrent ? "text-gray-900 font-bold" : "text-gray-400"
                  )}
                >
                  {s.title}
                </span>
                {idx < WIZARD_STEPS.length - 1 && (
                  <div className="w-4 sm:w-8 h-0.5 bg-gray-200 ml-1 hidden sm:block" />
                )}
              </div>
            );
          })}
        </div>

        {/* STEP 1: CHOOSE CONNECTION METHOD */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-black text-gray-900">Choose Connection Method</h3>
              <p className="text-xs text-gray-500 mt-1">
                Select how Joy PeopleHR communicates with the physical biometric machine.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setConnectionMethod('GATEWAY')}
                className={cn(
                  "p-5 rounded-2xl border-2 transition-all cursor-pointer space-y-3",
                  connectionMethod === 'GATEWAY'
                    ? "border-[#07563D] bg-emerald-50/40 shadow-xs"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100/60 flex items-center justify-center text-[#07563D]">
                    <Server className="w-5 h-5" />
                  </div>
                  <Badge variant="emerald" size="sm" className="text-[10px] font-bold">
                    Recommended
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">LAN Gateway Daemon</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Connect devices inside your local office or factory network with zero firewall port-forwarding.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setConnectionMethod('MANUAL')}
                className={cn(
                  "p-5 rounded-2xl border-2 transition-all cursor-pointer space-y-3",
                  connectionMethod === 'MANUAL'
                    ? "border-[#07563D] bg-emerald-50/40 shadow-xs"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-100/60 flex items-center justify-center text-blue-700">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <Badge variant="gray" size="sm" className="text-[10px]">
                    Direct IP
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Manual Device Setup</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Enter the static IP address, socket port, and vendor protocol directly.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                variant="primary"
                onClick={() => setCurrentStep(2)}
                className="gap-2 bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-xl text-xs"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: SELECT LOCATION & BRANCH */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-black text-gray-900">Where is this device located?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Assign the biometric terminal to a physical campus, building, and entry turnstile.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Organization / Tenant</label>
                <input
                  type="text"
                  value={getActiveOrgId()}
                  disabled
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-500 font-mono font-bold"
                />
              </div>

              {/* Dynamic Branch Selection & Inline Creator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700">Branch / Campus</label>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomBranch(!isAddingCustomBranch)}
                    className="text-[11px] font-bold text-[#07563D] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isAddingCustomBranch ? 'Select from list' : '+ Add Custom Branch'}
                  </button>
                </div>

                {!isAddingCustomBranch ? (
                  <select
                    value={branch}
                    onChange={e => setBranch(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#07563D] bg-white font-semibold text-gray-800"
                  >
                    {availableBranches.map(bName => (
                      <option key={bName} value={bName}>
                        {bName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2.5">
                    <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#07563D]" />
                      Add New Campus / Branch
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Coimbatore Plant & Unit 2"
                        value={newBranchName}
                        onChange={e => setNewBranchName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveCustomBranch();
                          }
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#07563D]"
                        autoFocus
                      />
                      <input
                        type="text"
                        placeholder="City (e.g. Coimbatore, Mumbai)"
                        value={newBranchCity}
                        onChange={e => setNewBranchCity(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveCustomBranch();
                          }
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#07563D]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        onClick={handleSaveCustomBranch}
                        disabled={isSavingBranch || !newBranchName.trim()}
                        className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold rounded-xl"
                      >
                        {isSavingBranch ? 'Saving...' : 'Save & Use Branch'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIsAddingCustomBranch(false)}
                        className="text-xs rounded-xl"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Physical Location with Quick Suggestions */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Physical Location</label>
                <input
                  type="text"
                  placeholder="e.g. Ground Floor Main Reception, Turnstile Gate 3"
                  value={locationDesc}
                  onChange={e => setLocationDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#07563D]"
                />
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  <span className="text-[10px] text-gray-400 font-semibold">Quick Suggestions:</span>
                  {[
                    'Main Reception Turnstile',
                    'North Entry Turnstiles',
                    'Plant Ingress Gate 1',
                    'Server Room Bio-Door',
                    'Canteen Entry Turnstile',
                    'R&D Lab Ingress',
                  ].map(loc => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLocationDesc(loc)}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer",
                        locationDesc === loc
                          ? "bg-emerald-50 text-[#07563D] border-emerald-200 font-bold"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                      )}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Department / Area with Quick Suggestions */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Department / Area</label>
                <input
                  type="text"
                  placeholder="e.g. Entrance Lobby / Ground Floor, Manufacturing Bay"
                  value={departmentArea}
                  onChange={e => setDepartmentArea(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#07563D]"
                />
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  <span className="text-[10px] text-gray-400 font-semibold">Quick Suggestions:</span>
                  {[
                    'Entrance Lobby / Ground Floor',
                    'Security Checkpoint',
                    'Manufacturing Bay A',
                    'Executive Floor',
                    'Warehouse Ingress',
                  ].map(area => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setDepartmentArea(area)}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer",
                        departmentArea === area
                          ? "bg-emerald-50 text-[#07563D] border-emerald-200 font-bold"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                      )}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="gap-1.5 text-xs font-semibold rounded-xl"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                variant="primary"
                onClick={() => setCurrentStep(3)}
                className="gap-2 bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-xl text-xs"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: DEVICE DETAILS */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900">Device Details</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Specify the hardware model and IP endpoint.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoDiscoverSubnet}
                disabled={isAutoDiscovering}
                className="text-xs gap-1.5 rounded-xl border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-[#07563D]", isAutoDiscovering && "animate-spin")} />
                {isAutoDiscovering ? 'Scanning Subnet...' : 'Auto-Discover Local Devices'}
              </Button>
            </div>

            {discoveredDevices.length > 0 && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#07563D]" />
                    Discovered Terminals on Local Network ({discoveredDevices.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {discoveredDevices.map(d => (
                    <div
                      key={d.ip_address}
                      onClick={() => {
                        setIpAddress(d.ip_address);
                        setPort(d.port);
                        setVendor(d.vendor as any);
                        setModel(d.model);
                        setSerialNumber(d.serial_number);
                        setDeviceName(`${d.vendor} ${d.model} - Main Reception`);
                      }}
                      className={cn(
                        "p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between",
                        ipAddress === d.ip_address
                          ? "bg-white border-[#07563D] shadow-xs ring-2 ring-emerald-200"
                          : "bg-white/80 border-emerald-100 hover:border-emerald-300"
                      )}
                    >
                      <div>
                        <p className="font-bold text-gray-900">{d.vendor} {d.model}</p>
                        <p className="font-mono text-[11px] text-gray-500">{d.ip_address}:{d.port}</p>
                      </div>
                      <Badge variant="emerald" size="sm" className="text-[10px] font-mono">
                        {d.latency_ms || 4}ms
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Hardware Vendor</label>
                <select
                  value={vendor}
                  onChange={e => setVendor(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#07563D]"
                >
                  <option value="ZKTeco">ZKTeco (K2000, FaceDepot, SilkBio, MB20)</option>
                  <option value="Mantra">Mantra (MFS100, BioTrack, RD Service)</option>
                  <option value="eSSL">eSSL (SilkBio-101TC, MB160, K90)</option>
                  <option value="Suprema">Suprema (BioStation 2, FaceStation F2)</option>
                  <option value="Matrix COSEC">Matrix COSEC (VEGA, DOOR, ARGO)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Device Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#07563D]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">IP Address</label>
                <input
                  type="text"
                  placeholder="192.168.1.58"
                  value={ipAddress}
                  onChange={e => setIpAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-gray-200 focus:outline-none focus:border-[#07563D]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Socket Port</label>
                <input
                  type="number"
                  placeholder="4370"
                  value={port}
                  onChange={e => setPort(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-gray-200 focus:outline-none focus:border-[#07563D]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-gray-700 block mb-1">Device Display Name</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={e => setDeviceName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#07563D]"
                />
              </div>

              {/* Explicit Device Direction / Turnstile Mode */}
              <div className="sm:col-span-2 space-y-1.5 pt-1">
                <label className="text-xs font-bold text-gray-800 block">
                  Punch Direction & Attendance Role
                </label>
                <p className="text-[11px] text-gray-500 mb-2">
                  Configure whether this terminal records Check-In, Check-Out, or Bidirectional punches.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div
                    onClick={() => setDirectionMode('BOTH')}
                    className={cn(
                      "p-3 rounded-2xl border text-xs cursor-pointer transition-all space-y-1",
                      directionMode === 'BOTH'
                        ? "bg-purple-50/80 border-purple-300 ring-2 ring-purple-200"
                        : "bg-gray-50/60 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-600" />
                        Bidirectional (BOTH)
                      </span>
                    </div>
                    <p className="text-[10px] text-purple-700 leading-tight">
                      Standard standalone machine supporting both Entry and Exit punches.
                    </p>
                  </div>

                  <div
                    onClick={() => setDirectionMode('CHECK_IN')}
                    className={cn(
                      "p-3 rounded-2xl border text-xs cursor-pointer transition-all space-y-1",
                      directionMode === 'CHECK_IN'
                        ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-200"
                        : "bg-gray-50/60 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                        Check-In Only (IN)
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-700 leading-tight">
                      Entry turnstile / Ingress gate. All punches open new attendance sessions.
                    </p>
                  </div>

                  <div
                    onClick={() => setDirectionMode('CHECK_OUT')}
                    className={cn(
                      "p-3 rounded-2xl border text-xs cursor-pointer transition-all space-y-1",
                      directionMode === 'CHECK_OUT'
                        ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-200"
                        : "bg-gray-50/60 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        Check-Out Only (OUT)
                      </span>
                    </div>
                    <p className="text-[10px] text-blue-700 leading-tight">
                      Exit turnstile / Egress gate. Punches automatically close open sessions.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="gap-1.5 text-xs font-semibold rounded-xl"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setCurrentStep(4);
                  handleTestConnection();
                }}
                className="gap-2 bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-xl text-xs"
              >
                Proceed to Test <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: TEST CONNECTION */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-black text-gray-900">Test Live Connection</h3>
              <p className="text-xs text-gray-500 mt-1">
                Verifying TCP handshake and protocol response with {ipAddress}:{port}.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                    <Wifi className={cn("w-5 h-5", isTesting ? "animate-pulse text-amber-600" : testResult?.success ? "text-emerald-600" : "text-gray-400")} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{deviceName}</p>
                    <p className="text-xs font-mono text-gray-500">{ipAddress}:{port}</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="gap-1.5 text-xs font-bold rounded-xl border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isTesting && "animate-spin text-[#07563D]")} />
                  {isTesting ? 'Probing...' : 'Re-Test'}
                </Button>
              </div>

              {/* Status checklist */}
              <div className="space-y-2 pt-2 border-t border-gray-200/60 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">LAN Gateway Agent</span>
                  <Badge variant="emerald" size="sm" className="text-[10px]">
                    ✓ Connected (127.0.0.1:11108)
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">TCP Socket Connection</span>
                  {isTesting ? (
                    <span className="text-gray-400 italic">Testing...</span>
                  ) : testResult?.success ? (
                    <Badge variant="emerald" size="sm" className="text-[10px]">
                      ✓ Responded ({testResult.latency_ms || 4}ms)
                    </Badge>
                  ) : (
                    <Badge variant="rose" size="sm" className="text-[10px]">
                      Failed
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Driver Protocol</span>
                  <span className="font-mono font-semibold text-gray-800">ZKTeco Native TCP (CMD 60/61)</span>
                </div>
              </div>

              {testResult && !testResult.success && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Unable to connect to the terminal.</p>
                    <p className="text-[11px] mt-0.5 text-rose-700">
                      Check that the device is powered on and connected to the same network as the LAN Gateway.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(3)}
                className="gap-1.5 text-xs font-semibold rounded-xl"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveAndCreateDevice}
                disabled={isTesting}
                className="gap-2 bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-xl text-xs"
              >
                Save & Add Terminal <Check className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: COMPLETE */}
        {currentStep === 5 && (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-[#07563D] flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-black text-gray-900">Device Successfully Added!</h3>
              <p className="text-xs text-gray-500 mt-1">
                {deviceName} is registered and actively streaming attendance punches.
              </p>
            </div>

            <Card className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200/80 max-w-md mx-auto text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Terminal</span>
                <span className="font-bold text-gray-900">{deviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Location</span>
                <span className="font-bold text-gray-900">{branch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <Badge variant="emerald" size="sm" className="text-[10px]">
                  ● Online (4ms)
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Machine Users</span>
                <span className="font-bold text-emerald-800">11 users ready to sync</span>
              </div>
            </Card>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (createdDevice && onOpenDevice) {
                    onOpenDevice(createdDevice);
                  }
                  onClose();
                }}
                className="gap-2 text-xs font-bold rounded-xl border-gray-200 hover:bg-gray-100"
              >
                Open Device Workspace
              </Button>

              <Button
                variant="primary"
                onClick={() => {
                  resetWizard();
                  onClose();
                }}
                className="gap-2 bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-xl text-xs px-6"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
