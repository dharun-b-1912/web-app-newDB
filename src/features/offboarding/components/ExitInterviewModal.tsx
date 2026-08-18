import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { offboardingService } from '../../../services/offboardingService';
import { EmployeeSeparation, SeparationReasonCode, RehireEligibility } from '../../../types';
import { HelpCircle, Star, MessageSquare, ShieldCheck, HeartHandshake } from 'lucide-react';

interface ExitInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  separation: EmployeeSeparation | null;
}

export const ExitInterviewModal: React.FC<ExitInterviewModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  separation,
}) => {
  const { showToast } = useToast();
  const [primaryReason, setPrimaryReason] = useState<SeparationReasonCode>(
    separation?.reason_code || 'CAREER_GROWTH'
  );
  const [secondaryReason, setSecondaryReason] = useState<string>('');
  const [managerFeedback, setManagerFeedback] = useState<string>('');
  const [cultureFeedback, setCultureFeedback] = useState<string>('');
  const [compensationFeedback, setCompensationFeedback] = useState<string>('');
  const [generalFeedback, setGeneralFeedback] = useState<string>('');
  const [rehireEligible, setRehireEligible] = useState<RehireEligibility>('ELIGIBLE');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!separation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await offboardingService.submitExitInterview({
        separation_id: separation.id,
        employee_id: separation.employee_id,
        primary_reason: primaryReason,
        secondary_reason: secondaryReason,
        manager_feedback: managerFeedback,
        culture_feedback: cultureFeedback,
        compensation_feedback: compensationFeedback,
        general_feedback: generalFeedback,
        rehire_eligible: rehireEligible,
        notes,
      });

      showToast('Exit interview record submitted successfully.', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit exit interview.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Conduct & Record Exit Interview" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Header summary */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-900">
          <div>
            <span className="font-bold text-sm text-emerald-950 block">
              {separation.employee?.first_name} {separation.employee?.last_name} ({separation.employee?.employee_code || separation.employee_id})
            </span>
            <span>{separation.employee?.designation_title} • {separation.employee?.department_name}</span>
          </div>
          <HeartHandshake className="w-6 h-6 text-emerald-700" />
        </div>

        {/* Primary & Secondary Reasons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Primary Exit Driver *
            </label>
            <select
              value={primaryReason}
              onChange={e => setPrimaryReason(e.target.value as SeparationReasonCode)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            >
              <option value="CAREER_GROWTH">Career Growth & Tech Stack</option>
              <option value="COMPENSATION">Compensation & Total Rewards</option>
              <option value="MANAGEMENT">Leadership & Team Dynamics</option>
              <option value="WORK_CULTURE">Workplace Culture & Flexibility</option>
              <option value="RELOCATION">Relocation / Geography</option>
              <option value="HIGHER_EDUCATION">Higher Education / Academic Sabbatical</option>
              <option value="PERSONAL">Personal / Family Matters</option>
              <option value="HEALTH">Health & Well-being</option>
              <option value="OTHER">Other Factors</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Secondary Contributing Factor
            </label>
            <input
              type="text"
              value={secondaryReason}
              onChange={e => setSecondaryReason(e.target.value)}
              placeholder="e.g. Commute duration, shift timings..."
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Feedback Section */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Feedback on Direct Manager & Team Leadership
            </label>
            <textarea
              rows={2}
              value={managerFeedback}
              onChange={e => setManagerFeedback(e.target.value)}
              placeholder="Supportiveness, clarity of goals, feedback frequency..."
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Feedback on Company Culture & Work-Life Balance
            </label>
            <textarea
              rows={2}
              value={cultureFeedback}
              onChange={e => setCultureFeedback(e.target.value)}
              placeholder="Collaboration, transparency, organizational trust..."
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Feedback on Compensation & Benefits Structure
            </label>
            <textarea
              rows={2}
              value={compensationFeedback}
              onChange={e => setCompensationFeedback(e.target.value)}
              placeholder="Salary competitiveness, incentives, medical coverage..."
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Rehire Eligibility & Confidential Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Rehire Eligibility Rating *
            </label>
            <select
              value={rehireEligible}
              onChange={e => setRehireEligible(e.target.value as RehireEligibility)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            >
              <option value="ELIGIBLE">Eligible for Rehire (High Performer / Good Standing)</option>
              <option value="REVIEW_REQUIRED">Review Required upon Future Application</option>
              <option value="NOT_ELIGIBLE">Not Eligible for Rehire (Policy/Integrity Flag)</option>
              <option value="UNKNOWN">Undetermined / Standard Exit</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Confidential HR Interviewer Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Internal notes for leadership review..."
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#07563D] hover:bg-[#064e37] text-white"
          >
            {isSubmitting ? 'Saving Interview...' : 'Complete & Save Exit Interview'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
