// src/features/attendance/components/DeviceUserMappingDrawer.tsx
// ============================================================================
// Joy PeopleHR — Enterprise Biometric Employee Mapping Drawer
// High-Performance Fuzzy Search, Conflict Resolution & Punch Reprocessing
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
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import {
  biometricGatewayService,
  BiometricDevice,
  BiometricDeviceUser,
  MatchSuggestion,
} from '../../../services/attendance/biometricGatewayService';
import { cn } from '../../../lib/utils';

interface DeviceUserMappingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  device: BiometricDevice | null;
  machineUser: BiometricDeviceUser | null;
  employees: any[];
  onMappingSuccess: () => void;
}

export const DeviceUserMappingDrawer: React.FC<DeviceUserMappingDrawerProps> = ({
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

  // Compute Match Suggestions on Open
  useEffect(() => {
    if (isOpen && machineUser && device) {
      const computed = biometricGatewayService.calculateEmployeeMatchSuggestions(
        device.id,
        machineUser,
        employees
      );
      setSuggestions(computed);
      setSelectedEmployee(null);
      setAllowBranchMismatch(false);
      setReplaceConflict(false);

      if (computed.length > 0) {
        setSearchQuery('');
        // Auto-select highest suggestion if > 80% confidence
        if (computed[0].confidenceScore >= 80) {
          setSelectedEmployee(computed[0].employee);
          setSelectedConfidence(computed[0].confidenceScore);
          setSelectedSource(computed[0].isExactId ? 'AUTO_EXACT_ID' : computed[0].isExactName ? 'AUTO_EXACT_NAME' : 'SUGGESTED');
        }
      } else {
        setSearchQuery(machineUser.name || '');
      }
    }
  }, [isOpen, machineUser, device, employees]);

  if (!isOpen || !machineUser || !device) return null;

  // Organization Scoped Employee Filter
  const filteredEmployees = employees.filter(emp => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = (emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || '').toLowerCase();
    const code = (emp.employee_code || emp.employee_id || emp.id || '').toLowerCase();
    const dept = (emp.department_name || emp.department || '').toLowerCase();
    const desig = (emp.designation_title || emp.designation || '').toLowerCase();
    const branch = (emp.branch || emp.location || emp.branch_name || '').toLowerCase();
    return name.includes(q) || code.includes(q) || dept.includes(q) || desig.includes(q) || branch.includes(q);
  });

  const handleSelectSuggestion = (sug: MatchSuggestion) => {
    setSelectedEmployee(sug.employee);
    setSelectedConfidence(sug.confidenceScore);
    setSelectedSource(
      sug.isExactId ? 'AUTO_EXACT_ID' : sug.isExactName ? 'AUTO_EXACT_NAME' : 'SUGGESTED'
    );
  };

  const handleSelectManual = (emp: any) => {
    setSelectedEmployee(emp);
    setSelectedConfidence(100);
    setSelectedSource('MANUAL');
  };

  const handleCommitMapping = async () => {
    if (!selectedEmployee) return;

    setIsSubmitting(true);
    try {
      const res = await biometricGatewayService.mapDeviceUserToEmployee(
        device.id,
        machineUser.device_user_id,
        selectedEmployee.id,
        {
          mappedBy: 'HR Administrator',
          source: selectedSource,
          confidenceScore: selectedConfidence,
          allowBranchMismatch: allowBranchMismatch,
          replaceConflict: replaceConflict,
          reprocessHistorical: reprocessHistorical,
        }
      );

      showToast(
        `✓ PIN #${machineUser.device_user_id} mapped to ${selectedEmployee.display_name || selectedEmployee.name} (${res.reprocessedCount > 0 ? `${res.reprocessedCount} punches reprocessed` : 'mapping active'})`
      );

      onMappingSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Mapping failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 overflow-hidden">
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl border-l border-gray-200 flex flex-col transform transition ease-in-out duration-300 animate-in slide-in-from-right">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-[#07563D] flex items-center justify-center font-bold">
                <Link className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Map Employee Identity</h3>
                <p className="text-xs text-gray-500">
                  Terminal PIN <strong className="text-gray-900 font-mono">#{machineUser.device_user_id}</strong> ({machineUser.name}) → JOY PeopleHR Canonical Master
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

          {/* Search & Suggestions */}
          <div className="p-6 flex-1 overflow-y-auto space-y-5 text-xs">
            {/* Smart Suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Suggested AI / Algorithmic Matches ({suggestions.length})
                </div>
                <div className="space-y-2">
                  {suggestions.map((sug, idx) => {
                    const isSelected = selectedEmployee?.id === sug.employee.id;
                    const empName = sug.employee.display_name || `${sug.employee.first_name || ''} ${sug.employee.last_name || ''}`.trim() || sug.employee.name;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectSuggestion(sug)}
                        className={cn(
                          'p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3',
                          isSelected
                            ? 'bg-emerald-50/80 border-emerald-500 shadow-2xs'
                            : 'bg-white border-gray-200/80 hover:border-emerald-300'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 font-bold flex items-center justify-center text-xs">
                            {empName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-xs">{empName}</div>
                            <div className="text-[10px] text-gray-500 font-mono">
                              {sug.employee.employee_code || sug.employee.employee_id} • {sug.employee.department_name || sug.employee.department || 'Staff'}
                            </div>
                            <div className="text-[9px] text-emerald-700 font-medium mt-0.5">
                              {sug.matchReasons.join(' • ')}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end gap-1">
                          <Badge
                            variant={sug.confidenceLevel === 'HIGH' ? 'emerald' : 'blue'}
                            className="text-[9px] font-mono font-bold"
                          >
                            {sug.confidenceScore}% Match
                          </Badge>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-[#07563D]" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Manual Employee Directory Search */}
            <div className="space-y-2">
              <div className="font-bold text-gray-900 text-xs">Search Complete Organization Directory</div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by Employee Code, Name, Department, Branch..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:border-[#07563D]"
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pt-1">
                {filteredEmployees.slice(0, 30).map(emp => {
                  const isSelected = selectedEmployee?.id === emp.id;
                  const empName = emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name;
                  return (
                    <div
                      key={emp.id}
                      onClick={() => handleSelectManual(emp)}
                      className={cn(
                        'p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between text-xs',
                        isSelected
                          ? 'bg-emerald-50 border-emerald-500 shadow-2xs font-bold'
                          : 'bg-white border-gray-100 hover:border-gray-300'
                      )}
                    >
                      <div>
                        <div className="text-gray-900 font-semibold">{empName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          {emp.employee_code || emp.employee_id} • {emp.department_name || emp.department || 'General'}
                        </div>
                      </div>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-[#07563D]" />
                      ) : (
                        <span className="text-[10px] text-gray-400">Select</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Mapping Options */}
            {selectedEmployee && (
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#07563D]" />
                  Mapping Bridge Options
                </div>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reprocessHistorical}
                    onChange={e => setReprocessHistorical(e.target.checked)}
                    className="mt-0.5 rounded-sm text-[#07563D] focus:ring-[#07563D]"
                  />
                  <div className="text-xs text-gray-700">
                    <span className="font-bold">Reprocess Historical Punches:</span> Automatically attribute all existing raw punches for PIN #{machineUser.device_user_id} to {selectedEmployee.display_name || selectedEmployee.name}.
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowBranchMismatch}
                    onChange={e => setAllowBranchMismatch(e.target.checked)}
                    className="mt-0.5 rounded-sm text-[#07563D] focus:ring-[#07563D]"
                  />
                  <div className="text-xs text-gray-700">
                    <span className="font-bold">Allow Multi-Site Roaming:</span> Allow this employee to record attendance at {device.branch || 'all branches'}.
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!selectedEmployee || isSubmitting}
              onClick={handleCommitMapping}
              className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs rounded-xl font-bold gap-1.5 shadow-xs"
            >
              <Link className={cn('w-3.5 h-3.5', isSubmitting && 'animate-spin')} />
              {isSubmitting ? 'Linking...' : 'Confirm Association'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
