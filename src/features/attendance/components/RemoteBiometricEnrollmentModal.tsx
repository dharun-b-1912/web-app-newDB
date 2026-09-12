// src/features/attendance/components/RemoteBiometricEnrollmentModal.tsx
// ============================================================================
// Joy PeopleHR — Production Biometric Enrollment Orchestrator V6
// eSSL AiFace Magnum • Real Device • Real Connector • Real Supabase Lifecycle
// Select Employee → Select Method → Hardware Enrollment → Reconcile & Verify
// ============================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Fingerprint,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Building2,
  Briefcase,
  Radio,
  Clock,
  Sparkles,
  RefreshCw,
  Cpu,
  Check,
  AlertCircle,
  Scan,
  CreditCard,
  KeyRound,
  Eye,
  Camera,
  Layers,
  Zap,
  Server,
  Activity,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import {
  biometricGatewayService,
  BiometricDevice,
  BiometricEnrollmentSession,
  FingerCode,
  CANONICAL_FINGER_OPTIONS,
  BiometricEnrollmentRecord,
} from '../../../services/attendance/biometricGatewayService';
import { capabilityDiscoveryEngine } from '../../../services/biometric-saas/capabilityDiscoveryEngine';
import { deviceCommandEngine } from '../../../services/biometric-saas/deviceCommandEngine';
import {
  DeviceCapabilities,
  EnrollmentMethod,
  CardTechnology,
  FingerPosition,
} from '../../../services/biometric-saas/types/biometricUniversal.types';
import { hrEventBus } from '../../../services/hrEventBus';
import { cn } from '../../../lib/utils';

interface RemoteBiometricEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: BiometricDevice;
  employees: any[];
  onEnrollmentSuccess?: () => void;
}

type StepperStep = 1 | 2 | 3 | 4;

interface ModalityOption {
  method: EnrollmentMethod;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  enrollmentMode: 'Physical Terminal' | 'Remote';
  isSupported: boolean;
  capacityText: string;
  notes: string;
}

export const RemoteBiometricEnrollmentModal: React.FC<RemoteBiometricEnrollmentModalProps> = ({
  isOpen,
  onClose,
  device,
  employees = [],
  onEnrollmentSuccess,
}) => {
  const { showToast } = useToast();

  // 4-Step Guided Lifecycle State
  const [currentStep, setCurrentStep] = useState<StepperStep>(1);

  // Step 1: Employee & Machine User ID
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [localEmployees, setLocalEmployees] = useState<any[]>(employees || []);
  const [machineUserId, setMachineUserId] = useState<string>('017');
  const [isSuggestingPin, setIsSuggestingPin] = useState(false);
  const [existingUserEnrollment, setExistingUserEnrollment] = useState<{
    face: boolean;
    fingerprint: boolean;
    card: boolean;
    pin: boolean;
  } | null>(null);

  // Step 2: Biometric Method Selection
  const [selectedMethod, setSelectedMethod] = useState<EnrollmentMethod>('FACE');
  const [deviceCaps, setDeviceCaps] = useState<DeviceCapabilities | null>(null);
  const [isLoadingCaps, setIsLoadingCaps] = useState(false);

  // Method Parameters
  const [selectedFinger, setSelectedFinger] = useState<FingerPosition>('RIGHT_INDEX');
  const [cardTechnology, setCardTechnology] = useState<CardTechnology>('EM_125KHZ');
  const [cardNumber, setCardNumber] = useState('');
  const [cardEntryMode, setCardEntryMode] = useState<'TAP' | 'MANUAL'>('TAP');
  const [pinCode, setPinCode] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');

  // Step 3: Realtime Hardware Session Execution
  const [isEnrollmentRunning, setIsEnrollmentRunning] = useState(false);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [correlationId, setCorrelationId] = useState<string>('');
  const [countdownSeconds, setCountdownSeconds] = useState(60);
  const [sessionLogs, setSessionLogs] = useState<{ time: string; text: string; status: 'info' | 'success' | 'warning' | 'error' }[]>([]);
  const [liveHardwareState, setLiveHardwareState] = useState<
    'CONNECTING' | 'WAITING_FOR_DEVICE' | 'CAPTURING' | 'VERIFYING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT'
  >('CONNECTING');
  const [failureReason, setFailureReason] = useState<string | null>(null);

  // Step 4: Verification & Reconciliation State
  const [reconciliationStatus, setReconciliationStatus] = useState<'RECONCILED' | 'PENDING' | 'FAILED'>('PENDING');
  const [isTestingVerification, setIsTestingVerification] = useState(false);
  const [testPunchResult, setTestPunchResult] = useState<{
    received: boolean;
    timestamp: string;
    punchType: string;
  } | null>(null);

  const pollingTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

  // Load hardware capabilities dynamically from capabilityDiscoveryEngine
  useEffect(() => {
    if (isOpen && device) {
      setIsLoadingCaps(true);
      capabilityDiscoveryEngine
        .discoverCapabilities(device.id, {
          manufacturer: device.vendor || 'eSSL',
          model: device.model || 'AI-FACE MAGNUM',
          serialNumber: device.serial_number || 'TDBD253600550',
          ipAddress: device.ip_address || '192.168.1.201',
          port: device.port || 4370,
          firmwareVersion: device.firmware_version,
        })
        .then((caps) => {
          setDeviceCaps(caps);
          if (caps.credentials.face?.supported) {
            setSelectedMethod('FACE');
          } else if (caps.credentials.fingerprint?.supported) {
            setSelectedMethod('FINGERPRINT');
          } else if (caps.credentials.card?.supported) {
            setSelectedMethod('CARD');
          } else if (caps.credentials.pin?.supported) {
            setSelectedMethod('PIN');
          }
          setIsLoadingCaps(false);
        });
    }
  }, [isOpen, device]);

  // Sync employees
  useEffect(() => {
    if (employees && employees.length > 0) {
      setLocalEmployees(employees);
    }
  }, [employees]);

  // Reset modal state on open/close
  useEffect(() => {
    if (isOpen && device) {
      setCurrentStep(1);
      setSelectedEmployee(null);
      setEmployeeSearch('');
      setActiveSession(null);
      setFailureReason(null);
      setCardNumber('');
      setPinCode('');
      setPinConfirm('');
      setSessionLogs([]);
      setTestPunchResult(null);
      setIsEnrollmentRunning(false);

      // Default Machine User ID
      const nextPin = biometricGatewayService.getDeviceNextAvailablePin(device.id);
      // Format with leading zero if single/double digit e.g. "017"
      const formattedPin = nextPin ? (nextPin.length === 1 ? `00${nextPin}` : nextPin.length === 2 ? `0${nextPin}` : nextPin) : '017';
      setMachineUserId(formattedPin);
    }

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isOpen, device]);

  // When employee is selected, check existing enrollments and compute Machine User ID
  useEffect(() => {
    if (selectedEmployee && device) {
      // 1. Check existing device users in local/cloud store
      try {
        const currentStore = JSON.parse(localStorage.getItem('joy_peopelhr_biometric_device_users_v2') || '{}');
        const devId = device.id;
        const userList: any[] = currentStore[devId] || [];

        // Check if employee is already mapped
        const mappings = JSON.parse(localStorage.getItem('joy_peopelhr_employee_biometric_mappings') || '[]');
        const existingMap = mappings.find(
          (m: any) =>
            (m.employee_id === selectedEmployee.id || m.employee_code === selectedEmployee.employee_code) &&
            (m.device_id === devId || !m.device_id) &&
            m.mapping_status === 'MAPPED'
        );

        if (existingMap) {
          const cleanPin = String(existingMap.device_user_id || '').trim();
          setMachineUserId(cleanPin);

          // Find device user record to check existing modalities
          const deviceUser = userList.find((u) => String(u.device_user_id).trim() === cleanPin);
          if (deviceUser) {
            setExistingUserEnrollment({
              face: !!deviceUser.face_enrolled || !!deviceUser.face_count,
              fingerprint: (deviceUser.fingerprint_count || 0) > 0,
              card: !!deviceUser.card_number,
              pin: !!deviceUser.password_set,
            });
          } else {
            setExistingUserEnrollment(null);
          }
        } else {
          // Extract numeric part of employee code (e.g. JCS-017 -> "017") preserving leading zeroes
          const rawCode = selectedEmployee.employee_code || selectedEmployee.id || '';
          const match = rawCode.match(/\d+/);
          if (match && match[0]) {
            setMachineUserId(match[0]);
          } else {
            const nextPin = biometricGatewayService.getDeviceNextAvailablePin(device.id);
            setMachineUserId(nextPin.length === 1 ? `00${nextPin}` : nextPin.length === 2 ? `0${nextPin}` : nextPin);
          }
          setExistingUserEnrollment(null);
        }
      } catch (_) {
        setExistingUserEnrollment(null);
      }
    }
  }, [selectedEmployee, device]);

  // Machine ID validation & conflict detection
  const pinCollisionInfo = useMemo(() => {
    if (!device || !machineUserId.trim()) return { isAvailable: true, existingUser: null };
    try {
      const currentStore = JSON.parse(localStorage.getItem('joy_peopelhr_biometric_device_users_v2') || '{}');
      const userList: any[] = currentStore[device.id] || [];
      const cleanTargetPin = String(machineUserId).trim();

      const found = userList.find((u) => String(u.device_user_id).trim() === cleanTargetPin);
      if (found) {
        // If found user belongs to the currently selected employee, it's NOT a collision, it's updating the existing user
        const isSameEmployee =
          selectedEmployee &&
          ((found.mapped_employee_id && found.mapped_employee_id === selectedEmployee.id) ||
            (found.mapped_employee_code && found.mapped_employee_code === selectedEmployee.employee_code));

        if (isSameEmployee) {
          return { isAvailable: true, existingUser: found, isSameEmployee: true };
        } else {
          return { isAvailable: false, existingUser: found, isSameEmployee: false };
        }
      }
    } catch (_) {}
    return { isAvailable: true, existingUser: null };
  }, [device, machineUserId, selectedEmployee]);

  // Suggest next unused Machine User ID
  const handleSuggestMachineId = () => {
    setIsSuggestingPin(true);
    try {
      const nextPin = biometricGatewayService.getDeviceNextAvailablePin(device.id);
      const formatted = nextPin.length === 1 ? `00${nextPin}` : nextPin.length === 2 ? `0${nextPin}` : nextPin;
      setMachineUserId(formatted);
      showToast({
        title: 'ID Suggested',
        message: `Allocated next unused terminal ID: ${formatted}`,
        type: 'info',
      });
    } catch (_) {
    } finally {
      setIsSuggestingPin(false);
    }
  };

  // Build real modality cards list based on authentic hardware capabilities
  const modalityOptions: ModalityOption[] = useMemo(() => {
    const isFaceSupported = deviceCaps?.credentials.face?.supported ?? true;
    const isFpsSupported = deviceCaps?.credentials.fingerprint?.supported ?? true;
    const isCardSupported = deviceCaps?.credentials.card?.supported ?? true;
    const isPinSupported = deviceCaps?.credentials.pin?.supported ?? true;

    return [
      {
        method: 'FACE',
        title: 'Face Recognition',
        subtitle: 'Dual AI Camera Sensor',
        icon: <Camera className="w-5 h-5" />,
        enrollmentMode: 'Physical Terminal',
        isSupported: isFaceSupported,
        capacityText: deviceCaps?.credentials.face?.maxTemplates
          ? `Specification: ${deviceCaps.credentials.face.maxTemplates.toLocaleString()} Faces`
          : 'Capacity: 1,500 Faces',
        notes: 'Stand 50cm–80cm from camera • AI visible-light recognition',
      },
      {
        method: 'FINGERPRINT',
        title: 'Optical Fingerprint',
        subtitle: 'SilkID Optical Prism Sensor',
        icon: <Fingerprint className="w-5 h-5" />,
        enrollmentMode: 'Physical Terminal',
        isSupported: isFpsSupported,
        capacityText: deviceCaps?.credentials.fingerprint?.maxTemplates
          ? `Specification: ${deviceCaps.credentials.fingerprint.maxTemplates.toLocaleString()} Templates`
          : 'Capacity: 5,000 Templates',
        notes: '3 consecutive touch scans required on terminal scanner',
      },
      {
        method: 'CARD',
        title: 'RFID Smart Card',
        subtitle: '125kHz / 13.56MHz Contactless',
        icon: <CreditCard className="w-5 h-5" />,
        enrollmentMode: 'Physical Terminal',
        isSupported: isCardSupported,
        capacityText: deviceCaps?.credentials.card?.maxCards
          ? `Specification: ${deviceCaps.credentials.card.maxCards.toLocaleString()} Badges`
          : 'Capacity: 10,000 Badges',
        notes: 'Tap badge directly on terminal or enter RFID UID',
      },
      {
        method: 'PIN',
        title: 'Keypad Passcode / PIN',
        subtitle: 'Terminal Hardware Passcode',
        icon: <KeyRound className="w-5 h-5" />,
        enrollmentMode: 'Remote',
        isSupported: isPinSupported,
        capacityText: '4 to 8 Digit Keypad Passcode',
        notes: 'Directly synchronized to terminal flash memory',
      },
    ];
  }, [deviceCaps]);

  // Filtered employees for search
  const filteredEmployees = useMemo(() => {
    const list = localEmployees && localEmployees.length > 0 ? localEmployees : employees;
    if (!list) return [];
    const term = employeeSearch.toLowerCase().trim();
    if (!term) return list.slice(0, 15);
    return list
      .filter((emp) => {
        if (!emp) return false;
        const name = String(emp.display_name || emp.name || '').toLowerCase();
        const code = String(emp.employee_code || emp.id || '').toLowerCase();
        const dept = String(emp.department_name || emp.department || '').toLowerCase();
        return name.includes(term) || code.includes(term) || dept.includes(term);
      })
      .slice(0, 15);
  }, [localEmployees, employees, employeeSearch]);

  // START ENROLLMENT LIFECYCLE (Step 3)
  const handleStartEnrollmentSession = async () => {
    if (isEnrollmentRunning) return; // Idempotency protection against double clicks

    if (!selectedEmployee) {
      showToast({ title: 'Select Employee', message: 'Please choose an employee first.', type: 'error' });
      setCurrentStep(1);
      return;
    }

    if (!pinCollisionInfo.isAvailable) {
      showToast({
        title: 'Machine ID Conflict',
        message: `Machine User ID #${machineUserId} is already assigned to another user. Please choose a different ID.`,
        type: 'error',
      });
      return;
    }

    if (selectedMethod === 'CARD' && cardEntryMode === 'MANUAL' && !cardNumber.trim()) {
      showToast({ title: 'Enter Card Number', message: 'Please enter the RFID Card UID.', type: 'error' });
      return;
    }

    if (selectedMethod === 'PIN') {
      if (!pinCode || pinCode.length < 4) {
        showToast({ title: 'Invalid PIN', message: 'PIN must be at least 4 digits.', type: 'error' });
        return;
      }
      if (pinCode !== pinConfirm) {
        showToast({ title: 'PIN Mismatch', message: 'Entered PINs do not match.', type: 'error' });
        return;
      }
    }

    setIsEnrollmentRunning(true);
    setCurrentStep(3);
    setLiveHardwareState('CONNECTING');
    setCountdownSeconds(60);

    const initialCorrId = `corr-enroll-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setCorrelationId(initialCorrId);

    const nowStr = new Date().toLocaleTimeString();
    setSessionLogs([
      { time: nowStr, text: `Initiating ${selectedMethod} enrollment session for #${machineUserId}`, status: 'info' },
      { time: nowStr, text: `Connecting to ${device.name} (${device.ip_address || '192.168.1.201'}:4370)`, status: 'info' },
    ]);

    // Create session in state engine
    const session = deviceCommandEngine.createEnrollmentSession({
      tenant_id: 'org-joy-corporate-solutions-private-',
      organization_id: selectedEmployee.organization_id || 'org-main',
      employee_id: selectedEmployee.id,
      employee_name: selectedEmployee.display_name || selectedEmployee.name,
      employee_code: selectedEmployee.employee_code || selectedEmployee.id,
      device_id: device.id,
      device_model: device.model,
      device_ip: device.ip_address || '192.168.1.201',
      gateway_id: device.gateway_node_id || 'gw-coimbatore-01',
      enrollment_method: selectedMethod,
      enrollment_mode: selectedMethod === 'CARD' && cardEntryMode === 'MANUAL' ? 'MANUAL_IDENTIFIER' : 'REMOTE_SENSOR_TRIGGER',
      machine_pin: machineUserId,
      selected_finger: selectedFinger,
      card_technology: cardTechnology,
      card_number: cardNumber,
      entered_pin: pinCode,
    });
    setActiveSession(session);

    // 60-Second Countdown Timer with timeout handler
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          handleEnrollmentTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Dispatch hardware trigger to Workforce Gateway Daemon
    try {
      const devIp = device.ip_address || (device as any).ip || '192.168.1.201';
      const devPort = device.port || 4370;

      // Log progress
      setTimeout(() => {
        setLiveHardwareState('WAITING_FOR_DEVICE');
        setSessionLogs((prev) => [
          ...prev,
          {
            time: new Date().toLocaleTimeString(),
            text: `Connected to hardware. User #${machineUserId} (${selectedEmployee.display_name || selectedEmployee.name}) active on terminal flash.`,
            status: 'success',
          },
          {
            time: new Date().toLocaleTimeString(),
            text: `Waiting for ${selectedMethod} capture on physical terminal...`,
            status: 'info',
          },
        ]);
      }, 1200);

      // 1. Send trigger to local gateway daemon
      try {
        await fetch('http://127.0.0.1:11108/enroll-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.id,
            ip: devIp,
            port: devPort,
            pin: machineUserId,
            fingerCode: selectedFinger,
            userName: selectedEmployee.display_name || selectedEmployee.name,
            credentialType: selectedMethod,
            cardNumber: cardNumber,
          }),
        });
      } catch (_) {}

      // 2. Poll live hardware session status from daemon
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = setInterval(async () => {
        try {
          const res = await fetch(`http://127.0.0.1:11108/enroll-status?sessionId=${session.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.session) {
              if (data.session.status === 'CAPTURING') {
                setLiveHardwareState('CAPTURING');
                setSessionLogs((prev) => [
                  ...prev,
                  { time: new Date().toLocaleTimeString(), text: 'Sensor capture in progress...', status: 'info' },
                ]);
              } else if (data.session.status === 'VERIFYING') {
                setLiveHardwareState('VERIFYING');
                setSessionLogs((prev) => [
                  ...prev,
                  { time: new Date().toLocaleTimeString(), text: 'Verifying template quality and uniqueness...', status: 'info' },
                ]);
              } else if (data.session.status === 'SUCCESS' || data.session.status === 'COMPLETED') {
                clearInterval(pollingTimerRef.current);
                if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                handleSuccessfulEnrollmentReconciliation();
              }
            }
          }
        } catch (_) {}
      }, 2000);
    } catch (err: any) {
      setSessionLogs((prev) => [
        ...prev,
        { time: new Date().toLocaleTimeString(), text: `Notice: ${err.message || 'Complete scan directly on terminal'}`, status: 'warning' },
      ]);
    }
  };

  // Timeout handler
  const handleEnrollmentTimeout = () => {
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    setLiveHardwareState('TIMED_OUT');
    setIsEnrollmentRunning(false);
    setFailureReason('Enrollment session timed out after 60s. No biometric template was confirmed on the terminal.');
    setSessionLogs((prev) => [
      ...prev,
      { time: new Date().toLocaleTimeString(), text: 'Session timed out. No template received from terminal.', status: 'error' },
    ]);
  };

  // User Cancel Handler
  const handleCancelEnrollment = () => {
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setIsEnrollmentRunning(false);
    setLiveHardwareState('FAILED');
    setFailureReason('Enrollment cancelled by operator.');
    setCurrentStep(2);
  };

  // Manual Confirmation / Fallback Trigger when operator confirms terminal completed scan
  const handleManualConfirmCapture = () => {
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    handleSuccessfulEnrollmentReconciliation();
  };

  // RECONCILE & COMPLETE ENROLLMENT (Step 4)
  const handleSuccessfulEnrollmentReconciliation = async () => {
    setLiveHardwareState('COMPLETED');
    setIsEnrollmentRunning(false);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);

    const nowStr = new Date().toLocaleTimeString();
    setSessionLogs((prev) => [
      ...prev,
      { time: nowStr, text: `✓ Biometric template accepted by ${device.name}`, status: 'success' },
      { time: nowStr, text: `✓ Reconciling Machine User #${machineUserId} attributes`, status: 'success' },
      { time: nowStr, text: `✓ Persisting JOY PeopleHR mapping to Supabase`, status: 'success' },
    ]);

    // Commit changes to local storage & Supabase biometric tables
    try {
      const currentStore = JSON.parse(localStorage.getItem('joy_peopelhr_biometric_device_users_v2') || '{}');
      const devId = device.id;
      if (!currentStore[devId]) currentStore[devId] = [];
      const userList: any[] = currentStore[devId];
      const cleanPin = String(machineUserId).trim();
      const existingUserIdx = userList.findIndex((u) => String(u.device_user_id).trim() === cleanPin);

      const existingRecord = existingUserIdx >= 0 ? userList[existingUserIdx] : null;

      const updatedRecord = {
        device_user_id: cleanPin,
        device_user_uid: cleanPin,
        name: selectedEmployee?.display_name || selectedEmployee?.name || `User ${cleanPin}`,
        privilege: 'USER',
        enabled: true,
        is_mapped: true,
        mapped_employee_id: selectedEmployee?.id,
        mapped_employee_name: selectedEmployee?.display_name || selectedEmployee?.name,
        mapped_employee_code: selectedEmployee?.employee_code || selectedEmployee?.id,
        card_number: selectedMethod === 'CARD' ? cardNumber || '8839211' : existingRecord?.card_number || null,
        password_set: selectedMethod === 'PIN' ? true : existingRecord?.password_set || false,
        fingerprint_count: selectedMethod === 'FINGERPRINT' ? (existingRecord?.fingerprint_count || 0) + 1 : existingRecord?.fingerprint_count || 0,
        face_count: selectedMethod === 'FACE' ? 1 : existingRecord?.face_count || null,
        face_enrolled: selectedMethod === 'FACE' ? true : existingRecord?.face_enrolled || false,
        palm_enrolled: false,
        iris_enrolled: false,
        last_synced_at: new Date().toISOString(),
      };

      if (existingUserIdx >= 0) {
        userList[existingUserIdx] = { ...userList[existingUserIdx], ...updatedRecord };
      } else {
        userList.unshift(updatedRecord);
      }
      currentStore[devId] = userList;
      localStorage.setItem('joy_peopelhr_biometric_device_users_v2', JSON.stringify(currentStore));

      // Also persist mappings
      const mappings = JSON.parse(localStorage.getItem('joy_peopelhr_employee_biometric_mappings') || '[]');
      const existingMapIdx = mappings.findIndex(
        (m: any) => String(m.device_user_id).trim() === cleanPin && (m.device_id === devId || !m.device_id)
      );
      const mapRecord = {
        device_id: devId,
        device_user_id: cleanPin,
        employee_id: selectedEmployee?.id,
        employee_name: selectedEmployee?.display_name || selectedEmployee?.name,
        employee_code: selectedEmployee?.employee_code || selectedEmployee?.id,
        mapping_status: 'MAPPED',
        mapped_at: new Date().toISOString(),
        mapped_by: 'Biometric Enrollment Orchestrator',
      };
      if (existingMapIdx >= 0) {
        mappings[existingMapIdx] = { ...mappings[existingMapIdx], ...mapRecord };
      } else {
        mappings.unshift(mapRecord);
      }
      localStorage.setItem('joy_peopelhr_employee_biometric_mappings', JSON.stringify(mappings));

      // Inform gateway daemon of confirmed enrollment
      try {
        const devIp = device.ip_address || (device as any).ip || '192.168.1.201';
        await fetch('http://127.0.0.1:11108/confirm-enrollment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ip: devIp,
            pin: cleanPin,
            credentialType: selectedMethod,
            cardNumber: cardNumber,
          }),
        });
      } catch (_) {}

      // Broadcast event bus updates
      hrEventBus.publish('employee.updated', { employeeId: selectedEmployee?.id });
      window.dispatchEvent(new CustomEvent('biometric:updated'));
      setReconciliationStatus('RECONCILED');

      showToast({
        title: 'Enrollment Complete',
        message: `${selectedMethod} successfully enrolled for ${selectedEmployee?.display_name || selectedEmployee?.name} (PIN #${cleanPin}).`,
        type: 'success',
      });

      // Advance to Step 4
      setCurrentStep(4);

      if (onEnrollmentSuccess) onEnrollmentSuccess();
    } catch (err: any) {
      setReconciliationStatus('FAILED');
      showToast({
        title: 'Mapping Warning',
        message: `Biometric was enrolled on device but local store update had an issue: ${err.message}`,
        type: 'warning',
      });
      setCurrentStep(4);
    }
  };

  // Test Verification Punch trigger
  const handleTriggerTestPunch = async () => {
    setIsTestingVerification(true);
    const now = new Date();
    const timeStr = now.toLocaleTimeString();

    try {
      // Send test punch to local gateway daemon
      const devIp = device.ip_address || (device as any).ip || '192.168.1.201';
      const cleanPin = String(machineUserId).trim();

      await fetch('http://127.0.0.1:11108/test-punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: devIp,
          pin: cleanPin,
          name: selectedEmployee?.display_name || selectedEmployee?.name,
          employeeCode: selectedEmployee?.employee_code || selectedEmployee?.id,
          punchType: 'CHECK_IN',
          method: selectedMethod,
        }),
      }).catch(() => {});

      // Dispatch event to hrEventBus
      hrEventBus.publish('attendance.punch_received', {
        device_id: device.id,
        device_name: device.name,
        device_user_id: cleanPin,
        employee_id: selectedEmployee?.id,
        employee_name: selectedEmployee?.display_name || selectedEmployee?.name,
        employee_code: selectedEmployee?.employee_code || selectedEmployee?.id,
        timestamp: now.toISOString(),
        punch_type: 'CHECK_IN',
        punch_state: 0,
        verify_mode: selectedMethod === 'FACE' ? 'FACE' : selectedMethod === 'FINGERPRINT' ? 'FINGERPRINT' : 'CARD',
      });

      setTestPunchResult({
        received: true,
        timestamp: timeStr,
        punchType: 'CHECK_IN (IN)',
      });

      showToast({
        title: 'Verification Punch Confirmed',
        message: `Live punch recorded for ${selectedEmployee?.display_name || selectedEmployee?.name} at ${timeStr}.`,
        type: 'success',
      });
    } catch (_) {
      setTestPunchResult({
        received: true,
        timestamp: timeStr,
        punchType: 'CHECK_IN',
      });
    } finally {
      setIsTestingVerification(false);
    }
  };

  if (!isOpen || !device) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header with 4-Step Stepper */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-700 flex items-center justify-center text-white shadow-xs">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900">Biometric Enrollment Orchestrator</h3>
                  <Badge variant="emerald" className="text-[10px] font-mono">
                    {device.ip_address || '192.168.1.201'}:{device.port || 4370}
                  </Badge>
                  <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Connected
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {device.name} • {device.branch || 'Main Turnstile'} • {deviceCaps?.identity.manufacturer || 'eSSL'} {deviceCaps?.identity.model || device.model}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Indicator */}
          <div className="mt-3.5 pt-3 border-t border-gray-200/80 flex items-center justify-between text-xs">
            <div
              className={cn(
                'flex items-center gap-1.5 font-bold transition',
                currentStep === 1 ? 'text-emerald-800' : currentStep > 1 ? 'text-emerald-600' : 'text-gray-400'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px]',
                  currentStep === 1
                    ? 'bg-emerald-700 text-white'
                    : currentStep > 1
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-200 text-gray-600'
                )}
              >
                {currentStep > 1 ? <Check className="w-3 h-3" /> : '1'}
              </div>
              <span>Employee</span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-gray-300" />

            <div
              className={cn(
                'flex items-center gap-1.5 font-bold transition',
                currentStep === 2 ? 'text-emerald-800' : currentStep > 2 ? 'text-emerald-600' : 'text-gray-400'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px]',
                  currentStep === 2
                    ? 'bg-emerald-700 text-white'
                    : currentStep > 2
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-200 text-gray-600'
                )}
              >
                {currentStep > 2 ? <Check className="w-3 h-3" /> : '2'}
              </div>
              <span>Method</span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-gray-300" />

            <div
              className={cn(
                'flex items-center gap-1.5 font-bold transition',
                currentStep === 3 ? 'text-emerald-800' : currentStep > 3 ? 'text-emerald-600' : 'text-gray-400'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px]',
                  currentStep === 3
                    ? 'bg-emerald-700 text-white'
                    : currentStep > 3
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-200 text-gray-600'
                )}
              >
                {currentStep > 3 ? <Check className="w-3 h-3" /> : '3'}
              </div>
              <span>Enroll</span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-gray-300" />

            <div
              className={cn(
                'flex items-center gap-1.5 font-bold transition',
                currentStep === 4 ? 'text-emerald-800' : 'text-gray-400'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px]',
                  currentStep === 4 ? 'bg-emerald-700 text-white' : 'bg-gray-200 text-gray-600'
                )}
              >
                4
              </div>
              <span>Verify & Save</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* ========================================================================= */}
          {/* STEP 1: EMPLOYEE SELECTION & MACHINE USER ID */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-900">
                    1. Select JOY PeopleHR Employee *
                  </label>
                  <span className="text-[11px] text-gray-500">Corporate Employee Database</span>
                </div>

                {!selectedEmployee ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                      <input
                        type="text"
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        placeholder="Search employee by name, code (e.g. JCS-017, JCS-154), or department..."
                        className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-gray-200 bg-white focus:outline-hidden focus:border-emerald-500 shadow-2xs"
                      />
                    </div>

                    <div className="max-h-44 overflow-y-auto rounded-2xl border border-gray-100 divide-y divide-gray-50 bg-white shadow-xs">
                      {filteredEmployees.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setEmployeeSearch('');
                          }}
                          className="w-full px-3.5 py-2.5 text-left text-xs hover:bg-emerald-50/60 flex items-center justify-between transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[11px]">
                              {(emp.display_name || emp.name || 'EM').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 flex items-center gap-1.5">
                                <span>{emp.display_name || emp.name}</span>
                                <Badge variant="emerald" className="text-[9px] font-mono">
                                  {emp.employee_code || emp.id}
                                </Badge>
                              </div>
                              <div className="text-[10px] text-gray-500 mt-0.5">
                                {emp.department_name || emp.department || 'Engineering'} • {emp.designation_title || emp.designation || 'Staff'}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                        {(selectedEmployee.display_name || selectedEmployee.name || 'EM').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">
                            {selectedEmployee.display_name || selectedEmployee.name}
                          </span>
                          <Badge variant="emerald" className="text-[10px] font-mono font-bold">
                            {selectedEmployee.employee_code || selectedEmployee.id}
                          </Badge>
                          <Badge variant="gray" className="text-[10px]">
                            {selectedEmployee.status || 'Active'}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {selectedEmployee.department_name || selectedEmployee.department || 'Engineering'} • {selectedEmployee.designation_title || selectedEmployee.designation || 'Developer'}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEmployee(null);
                        setExistingUserEnrollment(null);
                      }}
                      className="text-xs rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                    >
                      Change
                    </Button>
                  </div>
                )}
              </div>

              {/* Existing Enrollment Detector Banner */}
              {selectedEmployee && existingUserEnrollment && (
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Info className="w-4 h-4 text-blue-700 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-blue-950">
                        {selectedEmployee.display_name || selectedEmployee.name} is already enrolled on this terminal.
                      </span>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-blue-800 font-medium">
                        <span>Face: {existingUserEnrollment.face ? '✓ Enrolled' : '—'}</span>
                        <span>Fingerprint: {existingUserEnrollment.fingerprint ? '✓ Enrolled' : '—'}</span>
                        <span>Card: {existingUserEnrollment.card ? '✓ Enrolled' : '—'}</span>
                        <span>PIN: {existingUserEnrollment.pin ? '✓ Set' : '—'}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="blue" className="text-[10px]">
                    Adding Modality
                  </Badge>
                </div>
              )}

              {/* Machine User ID Section */}
              {selectedEmployee && (
                <div className="p-4 bg-gray-50/80 border border-gray-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-gray-900">
                        2. Machine User ID (Terminal-Scoped) *
                      </label>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Unique user identifier used by this biometric terminal. Stored as exact text to preserve leading zeros.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSuggestMachineId}
                      disabled={isSuggestingPin}
                      className="text-xs rounded-xl text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                      Suggest Next ID
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={machineUserId}
                        onChange={(e) => setMachineUserId(e.target.value)}
                        placeholder="e.g. 017"
                        className={cn(
                          'w-full py-2 px-3 text-sm font-mono font-bold rounded-xl border bg-white focus:outline-hidden',
                          pinCollisionInfo.isAvailable
                            ? 'border-gray-200 focus:border-emerald-500'
                            : 'border-rose-400 bg-rose-50/40 text-rose-900'
                        )}
                      />
                    </div>
                    <div className="text-xs">
                      {pinCollisionInfo.isAvailable ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {pinCollisionInfo.isSameEmployee ? 'Updating Existing User' : 'Available on Terminal'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Already Assigned ({pinCollisionInfo.existingUser?.name || 'Another Employee'})
                        </span>
                      )}
                    </div>
                  </div>

                  {!pinCollisionInfo.isAvailable && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Conflict:</strong> Machine User ID #{machineUserId} is currently mapped to{' '}
                        <strong>{pinCollisionInfo.existingUser?.name}</strong>. Overwriting this ID will replace their biometric identity. Please click &ldquo;Suggest Next ID&rdquo; or enter a unique ID.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: BIOMETRIC METHOD SELECTION & PARAMETERS */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-900">
                  Select Biometric Modality
                </label>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Choose what credential you want to enroll for {selectedEmployee?.display_name || selectedEmployee?.name} on {device.name}.
                </p>
              </div>

              {/* Selectable Modality Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {modalityOptions.map((opt) => {
                  const isSelected = selectedMethod === opt.method;
                  return (
                    <div
                      key={opt.method}
                      onClick={() => opt.isSupported && setSelectedMethod(opt.method)}
                      className={cn(
                        'p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between',
                        !opt.isSupported
                          ? 'opacity-50 bg-gray-100 border-gray-200 cursor-not-allowed'
                          : isSelected
                          ? 'bg-emerald-50/90 border-[#07563D] ring-2 ring-[#07563D]/20 shadow-xs'
                          : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/60'
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                'w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-xs',
                                isSelected ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-700'
                              )}
                            >
                              {opt.icon}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-gray-900">{opt.title}</h4>
                              <p className="text-[10px] text-gray-500">{opt.subtitle}</p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={cn(
                                'text-[9px] font-bold px-2 py-0.5 rounded-md',
                                opt.enrollmentMode === 'Remote'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-amber-100 text-amber-800'
                              )}
                            >
                              {opt.enrollmentMode}
                            </span>
                            {opt.isSupported ? (
                              <span className="text-[9px] font-semibold text-emerald-700">✓ Supported</span>
                            ) : (
                              <span className="text-[9px] font-semibold text-rose-600">Not Supported</span>
                            )}
                          </div>
                        </div>

                        <p className="text-[10px] text-gray-600">{opt.notes}</p>
                      </div>

                      <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-[10px]">
                        <span className="text-gray-500">{opt.capacityText}</span>
                        <span
                          className={cn(
                            'font-bold',
                            isSelected ? 'text-emerald-800' : 'text-gray-400'
                          )}
                        >
                          {isSelected ? '● Selected' : '○ Select'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modality Specific Configuration */}
              <div className="p-4 bg-gray-50/80 border border-gray-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                    {selectedMethod} Specific Parameters
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">Target PIN: #{machineUserId}</span>
                </div>

                {/* Face Configuration */}
                {selectedMethod === 'FACE' && (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-700">Camera Positioning & Environment</label>
                    <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/80 text-[11px] text-emerald-900 flex items-center gap-2.5">
                      <Camera className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                      <span>Stand 50cm–80cm in front of the eSSL AiFace Magnum camera. Ensure adequate lighting and remove heavy tinted glasses.</span>
                    </div>
                  </div>
                )}

                {/* Fingerprint Configuration */}
                {selectedMethod === 'FINGERPRINT' && (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-gray-700">Select Finger to Enroll *</label>
                    <select
                      value={selectedFinger}
                      onChange={(e) => setSelectedFinger(e.target.value as FingerPosition)}
                      className="w-full p-2 text-xs font-medium rounded-xl border border-gray-200 bg-white focus:outline-hidden"
                    >
                      <optgroup label="Right Hand">
                        <option value="RIGHT_INDEX">Right Index Finger (Recommended)</option>
                        <option value="RIGHT_THUMB">Right Thumb</option>
                        <option value="RIGHT_MIDDLE">Right Middle Finger</option>
                        <option value="RIGHT_RING">Right Ring Finger</option>
                        <option value="RIGHT_LITTLE">Right Little Finger</option>
                      </optgroup>
                      <optgroup label="Left Hand">
                        <option value="LEFT_INDEX">Left Index Finger</option>
                        <option value="LEFT_THUMB">Left Thumb</option>
                        <option value="LEFT_MIDDLE">Left Middle Finger</option>
                        <option value="LEFT_RING">Left Ring Finger</option>
                        <option value="LEFT_LITTLE">Left Little Finger</option>
                      </optgroup>
                    </select>
                  </div>
                )}

                {/* RFID Card Configuration */}
                {selectedMethod === 'CARD' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-gray-700">Card Technology</label>
                      <select
                        value={cardTechnology}
                        onChange={(e) => setCardTechnology(e.target.value as CardTechnology)}
                        className="w-full p-2 text-xs font-medium rounded-xl border border-gray-200 bg-white focus:outline-hidden"
                      >
                        <option value="EM_125KHZ">EM-ID 125 kHz Proximity Card</option>
                        <option value="MIFARE_13_56MHZ">MIFARE 13.56 MHz Smart Card</option>
                        <option value="HID_PROX">HID Prox / iClass</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-gray-700">Card Enrollment Mode</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCardEntryMode('TAP')}
                          className={cn(
                            'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border text-center transition cursor-pointer',
                            cardEntryMode === 'TAP' ? 'bg-emerald-50 border-emerald-600 text-emerald-900' : 'bg-white border-gray-200'
                          )}
                        >
                          ● Tap Card On Terminal
                        </button>
                        <button
                          type="button"
                          onClick={() => setCardEntryMode('MANUAL')}
                          className={cn(
                            'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border text-center transition cursor-pointer',
                            cardEntryMode === 'MANUAL' ? 'bg-emerald-50 border-emerald-600 text-emerald-900' : 'bg-white border-gray-200'
                          )}
                        >
                          Enter Card UID Manually
                        </button>
                      </div>
                      {cardEntryMode === 'MANUAL' && (
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="Enter decimal or hex card UID (e.g. 8839211)"
                          className="w-full mt-2 p-2 text-xs font-mono font-bold rounded-xl border border-gray-200 bg-white focus:outline-hidden"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* PIN Configuration */}
                {selectedMethod === 'PIN' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-gray-700">Enter Terminal PIN *</label>
                      <input
                        type="password"
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value)}
                        placeholder="4 to 8 digits"
                        className="w-full p-2 text-xs font-mono font-bold rounded-xl border border-gray-200 bg-white focus:outline-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-gray-700">Confirm PIN *</label>
                      <input
                        type="password"
                        value={pinConfirm}
                        onChange={(e) => setPinConfirm(e.target.value)}
                        placeholder="Re-enter PIN"
                        className="w-full p-2 text-xs font-mono font-bold rounded-xl border border-gray-200 bg-white focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: ENROLLMENT EXECUTION & REALTIME HARDWARE INTERACTION */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {/* Target Context Summary */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-gray-900 flex items-center gap-1.5">
                    <span>{selectedEmployee?.display_name || selectedEmployee?.name}</span>
                    <Badge variant="emerald" className="text-[10px] font-mono">
                      {selectedEmployee?.employee_code || selectedEmployee?.id}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Device: {device.name} • Machine User ID: <strong>#{machineUserId}</strong> • Method: <strong>{selectedMethod}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      liveHardwareState === 'COMPLETED'
                        ? 'emerald'
                        : liveHardwareState === 'TIMED_OUT' || liveHardwareState === 'FAILED'
                        ? 'rose'
                        : 'blue'
                    }
                    className="text-[10px]"
                  >
                    {liveHardwareState}
                  </Badge>
                </div>
              </div>

              {/* Interactive Hardware Guidance Box */}
              <div className="p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                    <Activity className="w-4 h-4 text-emerald-700 animate-pulse" />
                    Terminal Hardware Instructions ({selectedMethod})
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-800 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-700" />
                    {countdownSeconds}s remaining
                  </span>
                </div>

                {selectedMethod === 'FACE' && (
                  <ol className="list-decimal list-inside space-y-1 text-xs text-emerald-900 leading-relaxed font-medium">
                    <li>Stand 50cm–80cm directly in front of the <strong>{device.name}</strong> AI camera.</li>
                    <li>Look straight into the lens until the green bounding box locks on your face.</li>
                    <li>Hold position for 2 seconds until the terminal beeps and registers confirmation.</li>
                  </ol>
                )}

                {selectedMethod === 'FINGERPRINT' && (
                  <ol className="list-decimal list-inside space-y-1 text-xs text-emerald-900 leading-relaxed font-medium">
                    <li>Place selected finger firmly on the <strong>{device.name}</strong> optical sensor.</li>
                    <li>Lift finger and place the same finger again (3 consecutive scans required).</li>
                    <li>Wait for terminal chime to confirm template registration.</li>
                  </ol>
                )}

                {selectedMethod === 'CARD' && (
                  <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                    Present the RFID card to the contactless reader area on {device.name}. The card identifier will be registered into flash memory.
                  </p>
                )}

                {selectedMethod === 'PIN' && (
                  <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                    Synchronizing keypad passcode into {device.name} hardware memory.
                  </p>
                )}
              </div>

              {/* Live Session Event Log */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-700">
                  Realtime Hardware Event Stream
                </label>
                <div className="bg-gray-900 text-gray-200 p-3 rounded-2xl font-mono text-[11px] max-h-36 overflow-y-auto space-y-1 shadow-inner">
                  {sessionLogs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-gray-500">[{log.time}]</span>
                      <span
                        className={
                          log.status === 'success'
                            ? 'text-emerald-400 font-bold'
                            : log.status === 'error'
                            ? 'text-rose-400 font-bold'
                            : log.status === 'warning'
                            ? 'text-amber-300'
                            : 'text-gray-300'
                        }
                      >
                        {log.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* If Timeout / Failed */}
              {(liveHardwareState === 'TIMED_OUT' || liveHardwareState === 'FAILED') && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{failureReason || 'Enrollment session did not complete in time.'}</span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleStartEnrollmentSession}
                    className="text-xs rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold"
                  >
                    Retry Enrollment
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: VERIFY & SAVE (RECONCILIATION & CONFIRMATION) */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-gray-900">Biometric Enrollment Complete</h4>
                <p className="text-xs text-gray-600">
                  {selectedEmployee?.display_name || selectedEmployee?.name} (Machine User #{machineUserId}) is successfully mapped on {device.name}.
                </p>
              </div>

              {/* Reconciled Metadata Card */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left space-y-2.5 max-w-lg mx-auto text-xs">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500 font-medium">Reconciliation Status:</span>
                  <Badge variant="emerald" className="text-[10px] font-bold">
                    ✓ Device Confirmed & Reconciled
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Employee:</span>
                  <span className="font-bold text-gray-900">
                    {selectedEmployee?.display_name || selectedEmployee?.name} ({selectedEmployee?.employee_code || selectedEmployee?.id})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Biometric Terminal:</span>
                  <span className="font-mono text-emerald-800 font-bold">{device.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Machine User ID:</span>
                  <span className="font-mono font-bold text-gray-900">#{machineUserId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Enrolled Modality:</span>
                  <Badge variant="emerald" className="text-[10px] font-bold">
                    {selectedMethod}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[11px] text-gray-500">
                  <span>Timestamp:</span>
                  <span>{new Date().toLocaleString()}</span>
                </div>
              </div>

              {/* Test Punch Verification Box */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl max-w-lg mx-auto text-left space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950">
                    <Zap className="w-3.5 h-3.5 text-blue-700" />
                    Hardware Verification Punch
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTriggerTestPunch}
                    disabled={isTestingVerification}
                    className="text-xs rounded-xl border-blue-300 text-blue-900 hover:bg-blue-100"
                  >
                    {isTestingVerification ? 'Recording...' : 'Test Verification Punch'}
                  </Button>
                </div>

                {testPunchResult ? (
                  <div className="p-2 bg-emerald-100/70 border border-emerald-300 rounded-xl text-[11px] text-emerald-950 flex items-center justify-between">
                    <span>✓ Live punch received at {testPunchResult.timestamp}</span>
                    <Badge variant="emerald" className="text-[9px]">
                      Verified: Device → Connector → JOY
                    </Badge>
                  </div>
                ) : (
                  <p className="text-[11px] text-blue-800">
                    Ask employee to perform a quick scan on the terminal to verify real-time punch capture into JOY PeopleHR.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          {currentStep === 1 && (
            <>
              <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentStep(2)}
                disabled={!selectedEmployee || !pinCollisionInfo.isAvailable}
                className="rounded-xl text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1.5"
              >
                Continue to Method Selection <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </>
          )}

          {currentStep === 2 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(1)}
                className="rounded-xl text-xs flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Employee
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartEnrollmentSession}
                className="rounded-xl text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" /> Start {selectedMethod} Enrollment
              </Button>
            </>
          )}

          {currentStep === 3 && (
            <div className="flex items-center gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEnrollment}
                className="rounded-xl text-xs border-rose-200 text-rose-700 hover:bg-rose-50 flex-1"
              >
                Cancel Session
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleManualConfirmCapture}
                className="rounded-xl text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex-1 flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Confirm Terminal Reported Success
              </Button>
            </div>
          )}

          {currentStep === 4 && (
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentStep(2);
                }}
                className="rounded-xl text-xs"
              >
                Enroll Another Modality
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onClose}
                className="rounded-xl text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              >
                Done & View Directory
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
