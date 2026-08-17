import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { X, PlusCircle, Clock, FileText, HelpCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { Employee, User } from '../../../types';
import { hrEventBus } from '../../../services/hrEventBus';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  user: User;
}

export const WorkspaceNewRequestModal: React.FC<Props> = ({
  isOpen,
  onClose,
  employee,
  user,
}) => {
  const { showToast } = useToast();
  const [requestType, setRequestType] = useState<'regularization' | 'certificate' | 'hr_query' | 'profile_correction'>('regularization');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      showToast('Please provide details for your request.', 'error');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      hrEventBus.publish('employee.updated', { id: employee?.id, requestType }, { actorId: user.id });
      showToast('Request submitted to HR operations successfully.', 'success');
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900">New Self-Service Request</h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Submit an inquiry or exception request to HR Operations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Request Type Selector */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-700 block">Request Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'regularization', label: 'Attendance Regularization', icon: Clock },
                { id: 'certificate', label: 'Employment Certificate', icon: FileText },
                { id: 'profile_correction', label: 'Profile / Mobile Update', icon: CheckCircle2 },
                { id: 'hr_query', label: 'General HR Inquiry', icon: HelpCircle },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = requestType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setRequestType(t.id as any)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'border-[#07563D] bg-emerald-50/50 text-[#07563D] font-bold'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-700 block">Subject / Short Summary</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Punch Missed on Aug 14, or Address Update"
              className="w-full p-2.5 rounded-xl border border-gray-200 text-gray-800 font-medium focus:outline-none focus:border-[#07563D]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-gray-700 block">Detailed Description *</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide exact dates, missing punch times, or necessary changes..."
              className="w-full p-2.5 rounded-xl border border-gray-200 text-gray-800 font-medium focus:outline-none focus:border-[#07563D] resize-none"
            />
          </div>

          {/* Routing Preview */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[11px] text-gray-500">
            <span className="font-bold text-gray-700 block">Workflow Routing:</span>
            Assigned to <strong className="text-gray-900">{employee?.employment?.reporting_manager_name || 'Anand Viswanathan'}</strong> for manager endorsement, then routed to HR Desk.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <Button size="md" variant="secondary" onClick={onClose} type="button" className="text-xs font-bold">
              Cancel
            </Button>
            <Button
              size="md"
              variant="primary"
              type="submit"
              disabled={isSubmitting}
              className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold px-5"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
