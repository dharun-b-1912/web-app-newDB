// src/features/talent/recruitment/InterviewScorecardModal.tsx
// ============================================================================
// Joy PeopleHR — Interview Evaluation Scorecard Modal
// Structured 5-Point Competency Scoring with Hiring Recommendation & Feedback
// ============================================================================

import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { Star, Award, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Interview } from '../../../types/ats';
import { recruitmentService } from '../../../services/recruitment/recruitmentService';

interface Props {
  interview: Interview | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export const InterviewScorecardModal: React.FC<Props> = ({
  interview,
  isOpen,
  onClose,
  onSubmitted,
}) => {
  const { showToast } = useToast();
  const [technicalScore, setTechnicalScore] = useState(4);
  const [communicationScore, setCommunicationScore] = useState(4);
  const [problemSolvingScore, setProblemSolvingScore] = useState(4);
  const [cultureFitScore, setCultureFitScore] = useState(5);
  const [leadershipScore, setLeadershipScore] = useState(4);
  const [recommendation, setRecommendation] = useState<'Strong Hire' | 'Hire' | 'Hold' | 'No Hire'>('Hire');
  const [strengths, setStrengths] = useState('');
  const [areasOfConcern, setAreasOfConcern] = useState('');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!interview) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await recruitmentService.submitScorecard({
        interview_id: interview.id,
        interviewer_name: interview.interviewer_name || 'Interview Panel',
        technical_skills_score: technicalScore,
        communication_score: communicationScore,
        problem_solving_score: problemSolvingScore,
        culture_fit_score: cultureFitScore,
        leadership_score: leadershipScore,
        recommendation,
        strengths,
        areas_of_concern: areasOfConcern,
        feedback_notes: feedbackNotes || `Candidate evaluated for ${interview.round_name}. Recommendation: ${recommendation}`,
      });
      showToast('Interview scorecard submitted successfully!');
      onSubmitted();
      onClose();
    } catch {
      showToast('Error submitting scorecard', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRatingStars = (val: number, setVal: (n: number) => void) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          type="button"
          key={star}
          onClick={() => setVal(star)}
          className={`p-1 rounded-md transition ${star <= val ? 'text-amber-500 hover:text-amber-600' : 'text-gray-200 hover:text-gray-300'}`}
        >
          <Star className="w-5 h-5 fill-current" />
        </button>
      ))}
      <span className="text-xs font-bold text-gray-700 ml-2 font-mono">{val} / 5</span>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Evaluation Scorecard: ${interview.candidate_name}`}
      description={`${interview.round_name} • ${interview.job_title}`}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Competency Ratings Grid */}
        <div className="space-y-3 bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800">1. Technical & Functional Skills</span>
            {renderRatingStars(technicalScore, setTechnicalScore)}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-200/60">
            <span className="text-xs font-bold text-gray-800">2. Communication & Clarity</span>
            {renderRatingStars(communicationScore, setCommunicationScore)}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-200/60">
            <span className="text-xs font-bold text-gray-800">3. Problem Solving & Reasoning</span>
            {renderRatingStars(problemSolvingScore, setProblemSolvingScore)}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-200/60">
            <span className="text-xs font-bold text-gray-800">4. Culture & Values Alignment</span>
            {renderRatingStars(cultureFitScore, setCultureFitScore)}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-200/60">
            <span className="text-xs font-bold text-gray-800">5. Leadership & Ownership</span>
            {renderRatingStars(leadershipScore, setLeadershipScore)}
          </div>
        </div>

        {/* Overall Recommendation */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Overall Hiring Recommendation *</label>
          <div className="grid grid-cols-4 gap-2">
            {(['Strong Hire', 'Hire', 'Hold', 'No Hire'] as const).map(rec => (
              <button
                type="button"
                key={rec}
                onClick={() => setRecommendation(rec)}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                  recommendation === rec
                    ? rec === 'Strong Hire'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : rec === 'Hire'
                      ? 'bg-[#07563D] text-white border-[#07563D]'
                      : rec === 'Hold'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {rec}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Key Strengths</label>
            <input
              type="text"
              placeholder="e.g. Deep architecture experience, clear communicator"
              value={strengths}
              onChange={e => setStrengths(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Areas for Development</label>
            <input
              type="text"
              placeholder="e.g. Needs more cloud scaling exposure"
              value={areasOfConcern}
              onChange={e => setAreasOfConcern(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Evaluation & Feedback Summary *</label>
          <textarea
            placeholder="Summarize candidate discussion, technical problem solving, and reasons for recommendation..."
            value={feedbackNotes}
            onChange={e => setFeedbackNotes(e.target.value)}
            rows={3}
            required
            className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
          />
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
            {isSubmitting ? 'Submitting...' : 'Submit Evaluation Scorecard'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
