import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { offboardingService } from '../../../services/offboardingService';
import { api } from '../../../services/api';
import { Employee, SeparationType, SeparationReasonCode } from '../../../types';
import {
  UserMinus,
  Calendar,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Building,
  Briefcase,
  Info,
} from 'lucide-react';

interface InitiateSeparationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialEmployeeId?: string;
  isHrInitiated?: boolean;
}

export const InitiateSeparationModal: React.FC<InitiateSeparationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialEmployeeId,
  isHrInitiated = true,
}) => {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>(initialEmployeeId || '');
  const [separationType, setSeparationType] = useState<SeparationType>('RESIGNATION');
  const [reasonCode, setReasonCode] = useState<SeparationReasonCode>('CAREER_GROWTH');
  const [reasonText, setReasonText] = useState<string>('');
  const [resignationDate, setResignationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [proposedLwd, setProposedLwd] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const fetchEmps = async () => {
        try {
          const all = await api.getEmployees();
          const active = Array.isArray(all) ? all.filter(e => (e.status as string) !== 'Exited') : [];
          setEmployees(active);
          if (initialEmployeeId) {
            setSelectedEmpId(initialEmployeeId);
          } else if (active.length > 0 && !selectedEmpId) {
            setSelectedEmpId(active[0].id);
          }
        } catch {
          setEmployees([]);
        }
      };
      fetchEmps();
    }
  }, [isOpen, initialEmployeeId]);

  const selectedEmployee = employees.find(e => e.id === selectedEmpId);
  const noticeCalc = offboardingService.calculateNoticePeriod(selectedEmployee || null, resignationDate);

  useEffect(() => {
    if (noticeCalc && !proposedLwd) {
      setProposedLwd(noticeCalc.expected_last_working_date);
    }
  }, [selectedEmpId, resignationDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      showToast('Please select an employee.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await offboardingService.initiateSeparation({
        employee_id: selectedEmpId,
        separation_type: separationType,
        reason_code: reasonCode,
        reason_text: reasonText,
        resignation_date: resignationDate,
        proposed_last_working_date: proposedLwd || noticeCalc.expected_last_working_date,
        comments,
        is_hr_initiated: isHrInitiated,
      });

      showToast(`Separation initiated successfully for ${selectedEmployee?.first_name || 'employee'}.`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to initiate separation.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isHrInitiated ? 'Initiate Employee Separation' : 'Submit Employee Resignation'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Banner Alert */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Controlled Lifecycle Rule:</span> Submitting a separation will{' '}
            <strong>NOT</strong> deactivate or delete the employee. The employee remains active throughout the notice period until all clearances and final HR signoff are completed.
          </div>
        </div>

        {/* Employee Selection */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Select Employee *
          </label>
          <select
            value={selectedEmpId}
            onChange={e => {
              setSelectedEmpId(e.target.value);
              setProposedLwd('');
            }}
            disabled={!!initialEmployeeId}
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          >
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name} ({emp.employee_code || emp.id}) — {emp.designation_title || 'Staff'} ({emp.department_name || 'Dept'})
              </option>
            ))}
          </select>
        </div>

        {selectedEmployee && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs text-gray-600 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-gray-400 block font-medium">Department</span>
              <span className="font-bold text-gray-800">{selectedEmployee.department_name || 'Engineering'}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Reporting Manager</span>
              <span className="font-bold text-gray-800">{selectedEmployee.employment?.reporting_manager_name || 'Dharun Joy'}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Employment Type</span>
              <span className="font-bold text-gray-800">{selectedEmployee.employment_type || 'Full Time'}</span>
            </div>
          </div>
        )}

        {/* Separation Type & Reason Taxonomy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Separation Type *
            </label>
            <select
              value={separationType}
              onChange={e => setSeparationType(e.target.value as SeparationType)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            >
              <option value="RESIGNATION">Resignation (Voluntary)</option>
              <option value="TERMINATION">Termination (Involuntary)</option>
              <option value="LAYOFF">Layoff / Redundancy</option>
              <option value="CONTRACT_END">Contract Expiry / SOW Completion</option>
              <option value="RETIREMENT">Superannuation / Retirement</option>
              <option value="ABSCONDING">Absconding / Abandonment</option>
              <option value="DEATH">Deceased / Medical Demise</option>
              <option value="TRANSFER_OUT">Inter-Entity Transfer Out</option>
              <option value="OTHER">Other Separation Category</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Primary Reason Taxonomy *
            </label>
            <select
              value={reasonCode}
              onChange={e => setReasonCode(e.target.value as SeparationReasonCode)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            >
              <option value="CAREER_GROWTH">Career Growth / Better Opportunity</option>
              <option value="COMPENSATION">Compensation / Pay Benchmarking</option>
              <option value="MANAGEMENT">Management / Leadership Realignment</option>
              <option value="WORK_CULTURE">Work Culture / Work-Life Balance</option>
              <option value="RELOCATION">Relocation / Geographical Shift</option>
              <option value="HIGHER_EDUCATION">Higher Education / Academic Sabbatical</option>
              <option value="PERSONAL">Personal / Family Circumstances</option>
              <option value="HEALTH">Health & Medical Needs</option>
              <option value="PERFORMANCE">Performance Underachievement</option>
              <option value="MISCONDUCT">Policy Violation / Misconduct</option>
              <option value="BUSINESS_RESTRUCTURING">Organizational Restructuring</option>
              <option value="CONTRACT_END">End of Fixed Term Contract</option>
              <option value="RETIREMENT">Statutory Retirement</option>
              <option value="OTHER">Other Reason</option>
            </select>
          </div>
        </div>

        {/* Resignation Date & Notice Period Engine Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Resignation / Notice Date *
            </label>
            <input
              type="date"
              value={resignationDate}
              onChange={e => setResignationDate(e.target.value)}
              required
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Proposed Last Working Date (LWD)
            </label>
            <input
              type="date"
              value={proposedLwd}
              onChange={e => setProposedLwd(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Notice Engine Summary Card */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-900">
            <Info className="w-4 h-4 text-emerald-700 shrink-0" />
            <div>
              <span className="font-bold">Notice Policy Applied: </span>
              {noticeCalc.policy_applied}
            </div>
          </div>
          <Badge variant="emerald" className="font-mono text-xs">
            {noticeCalc.notice_period_days} Days Calculated
          </Badge>
        </div>

        {/* Reason Details & Comments */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Detailed Reason & Transition Remarks
          </label>
          <textarea
            rows={3}
            value={reasonText}
            onChange={e => setReasonText(e.target.value)}
            placeholder="Provide context, transition readiness notes, or handover comments..."
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !selectedEmpId}
            className="bg-[#07563D] hover:bg-[#064e37] text-white"
          >
            {isSubmitting ? 'Initiating Workflow...' : 'Initiate Separation Workflow'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
