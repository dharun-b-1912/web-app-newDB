// src/features/attendance/components/BulkMapModal.tsx
// ============================================================================
// WorkForceOS — Bulk Biometric Employee Mapping Review Modal
// Batch Review, High Confidence Approval & Safe Identity Linking
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Check,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/Table';
import { useToast } from '../../../components/ui/Toast';
import {
  biometricGatewayService,
  BiometricDevice,
  BiometricDeviceUser,
  MatchSuggestion,
} from '../../../services/attendance/biometricGatewayService';
import { cn } from '../../../lib/utils';

interface BulkMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: BiometricDevice;
  selectedUsers: BiometricDeviceUser[];
  employees: any[];
  onBulkMappingSuccess: () => void;
}

interface BulkRowItem {
  user: BiometricDeviceUser;
  suggestion: MatchSuggestion | null;
  selectedEmployeeId: string;
  isApproved: boolean;
}

export const BulkMapModal: React.FC<BulkMapModalProps> = ({
  isOpen,
  onClose,
  device,
  selectedUsers,
  employees,
  onBulkMappingSuccess,
}) => {
  const { showToast } = useToast();
  const [rowItems, setRowItems] = useState<BulkRowItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && selectedUsers.length > 0) {
      const items: BulkRowItem[] = selectedUsers.map(u => {
        const sugs = biometricGatewayService.calculateEmployeeMatchSuggestions(device.id, u, employees);
        const topSug = sugs.length > 0 ? sugs[0] : null;
        return {
          user: u,
          suggestion: topSug,
          selectedEmployeeId: topSug ? topSug.employee.id : '',
          isApproved: topSug ? topSug.confidenceLevel === 'HIGH' : false,
        };
      });
      setRowItems(items);
    }
  }, [isOpen, selectedUsers, device, employees]);

  if (!isOpen) return null;

  const highConfidenceCount = rowItems.filter(r => r.suggestion?.confidenceLevel === 'HIGH').length;
  const reviewCount = rowItems.filter(r => r.suggestion?.confidenceLevel !== 'HIGH').length;
  const approvedCount = rowItems.filter(r => r.isApproved && r.selectedEmployeeId).length;

  const handleApproveAllHigh = () => {
    setRowItems(prev =>
      prev.map(r => ({
        ...r,
        isApproved: r.suggestion?.confidenceLevel === 'HIGH' && !!r.selectedEmployeeId,
      }))
    );
  };

  const handleToggleRow = (pin: string) => {
    setRowItems(prev =>
      prev.map(r => (r.user.device_user_id === pin ? { ...r, isApproved: !r.isApproved } : r))
    );
  };

  const handleEmployeeChange = (pin: string, empId: string) => {
    setRowItems(prev =>
      prev.map(r => (r.user.device_user_id === pin ? { ...r, selectedEmployeeId: empId, isApproved: !!empId } : r))
    );
  };

  const handleExecuteBulkMapping = async () => {
    const toMap = rowItems.filter(r => r.isApproved && r.selectedEmployeeId);
    if (toMap.length === 0) {
      showToast('No approved mappings selected to execute', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const mappingsPayload = toMap.map(r => ({
        pin: r.user.device_user_id,
        employeeId: r.selectedEmployeeId,
        source: (r.suggestion?.isExactId ? 'AUTO_EXACT_ID' : r.suggestion?.isExactName ? 'AUTO_EXACT_NAME' : 'SUGGESTED') as any,
        confidenceScore: r.suggestion?.confidenceScore || 100,
      }));

      const res = await biometricGatewayService.bulkMapDeviceUsers(device.id, mappingsPayload, 'Administrator');

      showToast(
        `Successfully mapped ${res.successfulCount} machine users to employees! (${res.reprocessedPunchesCount} punches reprocessed)`
      );
      onBulkMappingSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Bulk mapping error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-gray-200/80 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/60 via-white to-blue-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#07563D] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Bulk Employee Biometric Mapping Review</h3>
              <p className="text-[11px] text-gray-500">
                Review automated matching confidence before committing biometric identity mappings
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

        {/* Quick Stats Banner */}
        <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="blue" className="text-xs font-mono font-bold">
              {rowItems.length} Machine Users Selected
            </Badge>
            <Badge variant="emerald" className="text-xs font-bold gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {highConfidenceCount} High Confidence
            </Badge>
            {reviewCount > 0 && (
              <Badge variant="amber" className="text-xs font-bold gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {reviewCount} Needs Review
              </Badge>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleApproveAllHigh}
            className="text-xs font-bold border-emerald-300 text-[#07563D] hover:bg-emerald-50 rounded-xl"
          >
            <Check className="w-3.5 h-3.5 mr-1" /> Approve All High Confidence ({highConfidenceCount})
          </Button>
        </div>

        {/* Bulk Review Table */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 text-[11px] font-bold text-gray-600">
                  <TableHead className="w-12 text-center">Approve</TableHead>
                  <TableHead>Machine User</TableHead>
                  <TableHead>Suggested WorkForceOS Employee</TableHead>
                  <TableHead>Confidence & Reason</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowItems.map(row => {
                  const emp = row.suggestion?.employee;
                  const empName = emp ? (emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name) : null;
                  const empCode = emp ? (emp.employee_code || emp.id) : null;

                  return (
                    <TableRow key={row.user.device_user_id} className="hover:bg-gray-50/50">
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={row.isApproved}
                          disabled={!row.selectedEmployeeId}
                          onChange={() => handleToggleRow(row.user.device_user_id)}
                          className="rounded-sm border-gray-300 text-[#07563D] focus:ring-[#07563D]"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-xs text-gray-900">{row.user.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          PIN: #{row.user.device_user_id} {row.user.device_user_uid ? `• UID: ${row.user.device_user_uid}` : ''}
                        </div>
                      </TableCell>
                      <TableCell>
                        {emp ? (
                          <div>
                            <div className="font-bold text-xs text-gray-900">{empName}</div>
                            <div className="text-[10px] text-gray-500 font-mono">
                              {empCode} • {emp.department_name || emp.department || 'General'}
                            </div>
                          </div>
                        ) : (
                          <select
                            value={row.selectedEmployeeId}
                            onChange={e => handleEmployeeChange(row.user.device_user_id, e.target.value)}
                            className="p-1.5 text-xs rounded-lg border border-gray-200 bg-white"
                          >
                            <option value="">-- Select Employee --</option>
                            {employees.slice(0, 50).map(e => (
                              <option key={e.id} value={e.id}>
                                {e.display_name || e.name} ({e.employee_code || e.id})
                              </option>
                            ))}
                          </select>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.suggestion ? (
                          <div>
                            <Badge
                              variant={row.suggestion.confidenceLevel === 'HIGH' ? 'emerald' : 'blue'}
                              className="text-[9px] font-mono font-bold"
                            >
                              {row.suggestion.confidenceScore}% Match
                            </Badge>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {row.suggestion.matchReasons.join(', ')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-italic">No match suggestion</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.isApproved ? (
                          <Badge variant="emerald" className="text-[10px] gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Ready to Map
                          </Badge>
                        ) : (
                          <Badge variant="gray" className="text-[10px]">
                            Pending Review
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs rounded-xl">
            Cancel
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled={isSubmitting || approvedCount === 0}
            onClick={handleExecuteBulkMapping}
            className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl px-5 font-bold shadow-xs"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isSubmitting && 'animate-spin')} />
            {isSubmitting ? 'Mapping Selected...' : `Map Approved Users (${approvedCount})`}
          </Button>
        </div>
      </div>
    </div>
  );
};
