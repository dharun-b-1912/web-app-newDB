// src/features/talent/recruitment/OfferCreateModal.tsx
// ============================================================================
// WorkForceOS — Employment Offer & CTC Generator Modal
// ============================================================================

import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { Award, DollarSign, Calendar, ShieldCheck } from 'lucide-react';
import { Candidate, Offer } from '../../../types/ats';
import { recruitmentService } from '../../../services/recruitment/recruitmentService';

interface Props {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
  onOfferCreated: () => void;
}

export const OfferCreateModal: React.FC<Props> = ({
  candidate,
  isOpen,
  onClose,
  onOfferCreated,
}) => {
  const { showToast } = useToast();
  const [ctcAnnual, setCtcAnnual] = useState(2400000);
  const [joiningDate, setJoiningDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [probationMonths, setProbationMonths] = useState(6);
  const [noticePeriodDays, setNoticePeriodDays] = useState(60);
  const [reportingManagerName, setReportingManagerName] = useState('Dharun Joy');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!candidate) return null;

  const baseSalary = Math.round(ctcAnnual * 0.7);
  const variablePay = Math.round(ctcAnnual * 0.2);
  const bonus = Math.round(ctcAnnual * 0.1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await recruitmentService.createOffer({
        candidate_id: candidate.id,
        candidate_name: candidate.display_name || `${candidate.first_name} ${candidate.last_name}`,
        candidate_email: candidate.email,
        job_id: candidate.applied_job_id || 'JOB-2026-101',
        job_title: candidate.applied_job_title || 'Software Engineer',
        department_name: candidate.department_name || 'Engineering',
        joining_date: joiningDate,
        ctc_annual: ctcAnnual,
        base_salary: baseSalary,
        variable_pay: variablePay,
        bonus,
        probation_months: probationMonths,
        notice_period_days: noticePeriodDays,
        reporting_manager_name: reportingManagerName,
      });

      // Move candidate stage to 'Offer'
      await recruitmentService.updateCandidateStage(candidate.id, 'Offer', 'Employment offer generated');

      showToast(`Offer generated for ${candidate.display_name || candidate.first_name}!`);
      onOfferCreated();
      onClose();
    } catch {
      showToast('Error generating offer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Draft Offer & Compensation: ${candidate.display_name || candidate.first_name}`}
      description={`Position: ${candidate.applied_job_title || 'Role'} • ${candidate.department_name || 'Engineering'}`}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Annual CTC (INR) *</label>
          <input
            type="number"
            step="50000"
            value={ctcAnnual}
            onChange={e => setCtcAnnual(Number(e.target.value))}
            required
            className="w-full p-2.5 text-sm font-bold text-gray-900 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
          />
        </div>

        {/* Automatic CTC Breakdown Preview */}
        <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-2 text-xs">
          <div className="flex items-center justify-between text-gray-700">
            <span>Base Salary (70%):</span>
            <span className="font-mono font-bold text-gray-900">INR {baseSalary.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-gray-700">
            <span>Performance Variable (20%):</span>
            <span className="font-mono font-bold text-gray-900">INR {variablePay.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-gray-700">
            <span>Annual Retention Bonus (10%):</span>
            <span className="font-mono font-bold text-gray-900">INR {bonus.toLocaleString()}</span>
          </div>
          <div className="pt-2 border-t border-emerald-200 flex items-center justify-between font-black text-[#07563D]">
            <span>Total Guaranteed & Variable CTC:</span>
            <span className="font-mono text-sm">INR {ctcAnnual.toLocaleString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Target Joining Date *</label>
            <input
              type="date"
              value={joiningDate}
              onChange={e => setJoiningDate(e.target.value)}
              required
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Reporting Manager</label>
            <input
              type="text"
              value={reportingManagerName}
              onChange={e => setReportingManagerName(e.target.value)}
              required
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Probation Period (Months)</label>
            <select
              value={probationMonths}
              onChange={e => setProbationMonths(Number(e.target.value))}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D] bg-white"
            >
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>12 Months</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Notice Period (Days)</label>
            <select
              value={noticePeriodDays}
              onChange={e => setNoticePeriodDays(Number(e.target.value))}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D] bg-white"
            >
              <option value={30}>30 Days</option>
              <option value={60}>60 Days</option>
              <option value={90}>90 Days</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="bg-[#07563D] hover:bg-[#0b7a57] text-white"
          >
            {isSubmitting ? 'Generating...' : 'Generate & Release Offer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
