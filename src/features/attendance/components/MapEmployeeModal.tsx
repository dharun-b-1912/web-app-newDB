// src/features/attendance/components/MapEmployeeModal.tsx
// ============================================================================
// WorkForceOS — Biometric Employee Mapping 2.0 Drawer / Dialog
// Machine User → Employee Mapping → Identity Bridge & Punch Reprocessing
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  Link,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building2,
  Briefcase,
  User,
  Radio,
  Clock,
  Sparkles,
  RefreshCw,
  Cpu,
  Fingerprint,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import {
  biometricGatewayService,
  BiometricDevice,
  BiometricDeviceUser,
  MatchSuggestion,
} from '../../../services/attendance/biometricGatewayService';
import { cn } from '../../../lib/utils';

interface MapEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: BiometricDevice;
  machineUser: BiometricDeviceUser;
  employees: any[];
  onMappingSuccess: () => void;
}

export const MapEmployeeModal: React.FC<MapEmployeeModalProps> = ({
  isOpen,
  onClose,
  device,
  machineUser,
  employees,
  onMappingSuccess,
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [selectedConfidence, setSelectedConfidence] = useState<number>(100);
  const [selectedSource, setSelectedSource] = useState<'MANUAL' | 'AUTO_EXACT_ID' | 'AUTO_EXACT_NAME' | 'SUGGESTED'>('MANUAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allowBranchMismatch, setAllowBranchMismatch] = useState(false);
  const [replaceConflict, setReplaceConflict] = useState(false);
  const [reprocessHistorical, setReprocessHistorical] = useState(true);
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  // Compute Match Suggestions on Open
  useEffect(() => {
    if (isOpen && machineUser) {
      const computed = biometricGatewayService.calculateEmployeeMatchSuggestions(
        device.id,
        machineUser,
        employees
      );
      setSuggestions(computed);
      setStep('select');
      setSelectedEmployee(null);
      setAllowBranchMismatch(false);
      setReplaceConflict(false);

      // Pre-fill search query with clean machine user name
      if (computed.length > 0) {
        setSearchQuery('');
      } else {
        setSearchQuery(machineUser.name || '');
      }
    }
  }, [isOpen, machineUser, device, employees]);

  if (!isOpen) return null;

  // Organization Scoped Filter
  const filteredEmployees = employees.filter(emp => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = (emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || '').toLowerCase();
    const code = (emp.employee_code || emp.employee_id || emp.id || '').toLowerCase();
    const dept = (emp.department_name || emp.department || '').toLowerCase();
    const desig = (emp.designation_title || emp.designation || '').toLowerCase();
    const branch = (emp.branch || emp.location || emp.branch_name || '').toLowerCase();
    const email = (emp.work_email || emp.email || '').toLowerCase();
    const phone = (emp.phone || emp.mobile || '').toLowerCase();
    return (
      name.includes(q) ||
      code.includes(q) ||
      dept.includes(q) ||
      desig.includes(q) ||
      branch.includes(q) ||
      email.includes(q) ||
      phone.includes(q)
    );
  });

  const handleSelectEmployee = (emp: any, confidence = 100, source: any = 'MANUAL') => {
    setSelectedEmployee(emp);
    setSelectedConfidence(confidence);
    setSelectedSource(source);
    setStep('confirm');
  };

  const handleExecuteMapping = async () => {
    if (!selectedEmployee) return;
    setIsSubmitting(true);
    try {
      const res = await biometricGatewayService.mapDeviceUserToEmployee(
        device.id,
        machineUser.device_user_id,
        selectedEmployee.id,
        {
          mappedBy: 'Administrator',
          source: selectedSource,
          confidenceScore: selectedConfidence,
          allowBranchMismatch: true,
          replaceConflict: true,
          reprocessHistorical,
        }
      );

      showToast(
        `Mapped #${machineUser.device_user_id} (${machineUser.name}) → ${res.user.mapped_employee_name} (${res.user.mapped_employee_code}). ${res.reprocessedCount > 0 ? `${res.reprocessedCount} punches reprocessed!` : ''}`
      );
      onMappingSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Mapping failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBranchMismatch = selectedEmployee && (
    (device.branch || '').toLowerCase() !== (selectedEmployee.branch || selectedEmployee.location || selectedEmployee.branch_name || '').toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-gray-200/80 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/60 via-white to-emerald-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#07563D] text-white flex items-center justify-center shadow-xs">
              <Link className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Map Machine User to WorkForceOS Employee</h3>
              <p className="text-[11px] text-gray-500">
                Establish canonical identity link for real-time punch resolution & shift attendance
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

        {/* Machine Identity Banner */}
        <div className="p-4 bg-gray-50/80 border-b border-gray-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600">
              <Cpu className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-900">{machineUser.name}</span>
                <Badge variant="blue" className="text-[9px] font-mono">
                  Machine ID: #{machineUser.device_user_id}
                </Badge>
                {machineUser.device_user_uid && (
                  <Badge variant="gray" className="text-[9px] font-mono">
                    UID: {machineUser.device_user_uid}
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {device.device_name} • {device.branch}
              </div>
            </div>
          </div>

          <div className="text-right">
            <Badge variant="emerald" className="text-[10px] gap-1">
              <Fingerprint className="w-3 h-3" /> {machineUser.fingerprint_count || 1} Enrolled
            </Badge>
          </div>
        </div>

        {/* STEP 1: SELECT EMPLOYEE */}
        {step === 'select' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Top Suggested Matches */}
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Suggested AI & Normalized Matches ({suggestions.length})
                  </span>
                  <span className="text-[10px] text-gray-400">Ranked by Name, ID & Branch signals</span>
                </div>

                <div className="space-y-2">
                  {suggestions.slice(0, 3).map((sug, idx) => {
                    const emp = sug.employee;
                    const empName = emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name;
                    const empCode = emp.employee_code || emp.employee_id || emp.id;
                    const dept = emp.department_name || emp.department || 'Engineering';
                    const branch = emp.branch || emp.location || emp.branch_name || 'Campus';

                    return (
                      <div
                        key={emp.id}
                        className={cn(
                          'p-3.5 rounded-2xl border transition shadow-2xs flex items-center justify-between',
                          sug.confidenceLevel === 'HIGH'
                            ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300'
                            : 'bg-white border-gray-200 hover:border-blue-300'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#07563D] flex items-center justify-center font-bold text-xs">
                            {empName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-900">{empName}</span>
                              <span className="text-[10px] font-mono text-gray-500 font-bold">{empCode}</span>
                              <Badge
                                variant={sug.confidenceLevel === 'HIGH' ? 'emerald' : 'blue'}
                                className="text-[9px] font-bold font-mono"
                              >
                                {sug.confidenceScore}% Match
                              </Badge>
                            </div>
                            <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                              <span>{dept}</span>
                              <span>•</span>
                              <span>{branch}</span>
                              <span>•</span>
                              <span className="text-emerald-700 font-semibold text-[10px]">
                                {sug.matchReasons.join(', ')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            handleSelectEmployee(
                              emp,
                              sug.confidenceScore,
                              sug.isExactId ? 'AUTO_EXACT_ID' : sug.isExactName ? 'AUTO_EXACT_NAME' : 'SUGGESTED'
                            )
                          }
                          className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1 rounded-xl shadow-xs"
                        >
                          Select & Confirm <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Scoped Employee Directory Search */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-700">
                Or Search Entire Organization Directory
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by Employee ID, Name, Email, Dept, Designation..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Employee Results List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pt-1">
                {filteredEmployees.slice(0, 10).map(emp => {
                  const empName = emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name;
                  const empCode = emp.employee_code || emp.employee_id || emp.id;
                  const dept = emp.department_name || emp.department || 'General';
                  const desig = emp.designation_title || emp.designation || 'Team Member';
                  const branch = emp.branch || emp.location || emp.branch_name || 'Campus';
                  const isAlreadyMapped = machineUser.mapped_employee_id === emp.id;

                  return (
                    <div
                      key={emp.id}
                      onClick={() => handleSelectEmployee(emp, 100, 'MANUAL')}
                      className={cn(
                        'p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between',
                        isAlreadyMapped
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-[11px]">
                          {empName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900">{empName}</span>
                            <span className="text-[10px] font-mono text-gray-500 font-bold">{empCode}</span>
                            {emp.status && (
                              <Badge variant={emp.status === 'Active' ? 'emerald' : 'gray'} className="text-[9px]">
                                {emp.status}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                            <span>{dept}</span>
                            <span>•</span>
                            <span>{desig}</span>
                            <span>•</span>
                            <span>{branch}</span>
                          </div>
                        </div>
                      </div>

                      <Button variant="outline" size="sm" className="text-xs rounded-xl border-gray-200">
                        {isAlreadyMapped ? 'Current Mapping' : 'Select'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: CONFIRM MAPPING & REPROCESS NOTICE */}
        {step === 'confirm' && selectedEmployee && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Confirm Biometric Identity Mapping
            </h4>

            {/* Comparison Visual Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase">1. Machine Terminal Identity</span>
                <div className="text-sm font-bold text-gray-900">{machineUser.name}</div>
                <div className="text-[11px] font-mono text-gray-600">
                  PIN: #{machineUser.device_user_id} • UID: {machineUser.device_user_uid || '1'}
                </div>
                <div className="text-[11px] text-gray-500">
                  {device.device_name} ({device.branch})
                </div>
              </Card>

              <Card className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-1.5">
                <span className="text-[10px] font-bold text-[#07563D] uppercase">2. WorkForceOS HR Master Profile</span>
                <div className="text-sm font-bold text-gray-900">
                  {selectedEmployee.display_name || `${selectedEmployee.first_name || ''} ${selectedEmployee.last_name || ''}`.trim() || selectedEmployee.name}
                </div>
                <div className="text-[11px] font-mono text-emerald-800 font-bold">
                  Code: {selectedEmployee.employee_code || selectedEmployee.id}
                </div>
                <div className="text-[11px] text-gray-600">
                  {selectedEmployee.department_name || selectedEmployee.department || 'General'} • {selectedEmployee.branch || 'Campus'}
                </div>
              </Card>
            </div>

            {/* Branch Mismatch Alert */}
            {isBranchMismatch && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-1 text-xs text-amber-900">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Cross-Campus / Branch Mismatch Warning
                </div>
                <p className="text-[11px] text-amber-800">
                  Terminal is located in <strong>{device.branch}</strong>, but this employee is assigned to <strong>{selectedEmployee.branch || selectedEmployee.location || 'Another Campus'}</strong>.
                </p>
              </div>
            )}

            {/* Reprocess Historical Punches Option */}
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reprocessHistorical}
                  onChange={e => setReprocessHistorical(e.target.checked)}
                  className="mt-0.5 rounded-sm border-gray-300 text-[#07563D] focus:ring-[#07563D]"
                />
                <div>
                  <span className="text-xs font-bold text-blue-950">
                    Reprocess Historical Punches for PIN #{machineUser.device_user_id}
                  </span>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    Automatically resolve all prior raw attendance punches from this machine PIN into this employee's official attendance card.
                  </p>
                </div>
              </label>
            </div>

            {/* Impact Notice */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] text-gray-600">
              ℹ️ <strong>Impact Notice:</strong> Future live punches from machine user #{machineUser.device_user_id} on {device.device_name} will automatically calculate shifts, overtime, and attendance for <strong>{selectedEmployee.display_name || selectedEmployee.name}</strong>.
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          {step === 'confirm' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('select')}
                disabled={isSubmitting}
                className="text-xs rounded-xl"
              >
                Back to Selection
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                onClick={handleExecuteMapping}
                className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl px-5 shadow-xs font-bold"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', isSubmitting && 'animate-spin')} />
                {isSubmitting ? 'Saving Mapping...' : 'Confirm & Save Mapping'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={onClose} className="text-xs rounded-xl">
                Cancel
              </Button>
              <span className="text-[11px] text-gray-400">Select an employee card above to proceed</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
