// src/features/talent/recruitment/RecruitmentAutomationView.tsx
// ============================================================================
// Joy PeopleHR — Recruitment Automation & Workflow SLA Engine
// Trigger -> Conditions -> Actions: SLA Escalations, Preboarding, Notifications
// ============================================================================

import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import {
  Zap,
  Plus,
  Clock,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Play,
  Settings,
  Mail,
  Calendar,
  UserCheck,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface AutomationRule {
  id: string;
  name: string;
  category: 'SLA Escalation' | 'Lifecycle Trigger' | 'Notification' | 'Integration';
  trigger: string;
  condition: string;
  actions: string[];
  isActive: boolean;
  lastTriggered?: string;
  executionCount: number;
}

const DEFAULT_RULES: AutomationRule[] = [
  {
    id: 'AUTO-01',
    name: '24-Hour Interview Scorecard SLA Escalation',
    category: 'SLA Escalation',
    trigger: 'interview.completed',
    condition: 'Scorecard feedback pending > 24 hours',
    actions: ['Send in-app reminder to interviewer', 'Escalate to hiring manager at 48 hours'],
    isActive: true,
    lastTriggered: '2 hours ago',
    executionCount: 14,
  },
  {
    id: 'AUTO-02',
    name: 'Offer Accepted $\\rightarrow$ Auto-Initiate Preboarding',
    category: 'Lifecycle Trigger',
    trigger: 'offer.accepted',
    condition: 'Candidate signed e-sign envelope',
    actions: ['Publish onboarding.preboarding_started event', 'Generate employee profile draft in Core HR', 'Notify People Operations team'],
    isActive: true,
    lastTriggered: 'Yesterday',
    executionCount: 8,
  },
  {
    id: 'AUTO-03',
    name: 'Requisition SLA Aging Alert (30 Days)',
    category: 'SLA Escalation',
    trigger: 'requisition.created',
    condition: 'Status == Open AND DaysOpen > 30',
    actions: ['Flag requisition as SLA Critical', 'Notify Talent Acquisition Lead & HR Head'],
    isActive: true,
    lastTriggered: '3 days ago',
    executionCount: 5,
  },
  {
    id: 'AUTO-04',
    name: 'New Application Auto-Screening Match Calculation',
    category: 'Lifecycle Trigger',
    trigger: 'application.received',
    condition: 'Resume parsed successfully',
    actions: ['Calculate skill match score (0-100%)', 'Assign candidate to screening queue', 'Notify recruiter assigned to job opening'],
    isActive: true,
    lastTriggered: '10 minutes ago',
    executionCount: 32,
  },
  {
    id: 'AUTO-05',
    name: 'Interview Scheduled $\\rightarrow$ Calendar Sync',
    category: 'Integration',
    trigger: 'interview.scheduled',
    condition: 'Interviewer calendar provider connected',
    actions: ['Create Google/Outlook Calendar event with meeting link', 'Send candidate invitation with timezone details'],
    isActive: true,
    lastTriggered: '1 hour ago',
    executionCount: 19,
  },
];

export const RecruitmentAutomationView: React.FC = () => {
  const { showToast } = useToast();
  const [rules, setRules] = useState<AutomationRule[]>(DEFAULT_RULES);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [ruleName, setRuleName] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('candidate.stage_changed');
  const [conditionText, setConditionText] = useState('New Stage == Interview');
  const [actionText, setActionText] = useState('Send candidate confirmation email, Schedule calendar invite');

  const toggleRule = (id: string) => {
    setRules(prev =>
      prev.map(r => {
        if (r.id === id) {
          const next = !r.isActive;
          showToast(`Automation rule "${r.name}" ${next ? 'enabled' : 'disabled'}`);
          return { ...r, isActive: next };
        }
        return r;
      })
    );
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName) return;

    const newRule: AutomationRule = {
      id: `AUTO-${Math.floor(10 + Math.random() * 90)}`,
      name: ruleName,
      category: 'Lifecycle Trigger',
      trigger: triggerEvent,
      condition: conditionText,
      actions: actionText.split(',').map(a => a.trim()).filter(Boolean),
      isActive: true,
      executionCount: 0,
    };

    setRules([newRule, ...rules]);
    showToast(`Automation workflow "${ruleName}" configured!`);
    setIsCreateModalOpen(false);
    setRuleName('');
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Recruitment Automation & SLA Engine</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure event-driven triggers, SLA escalation policies, auto-preboarding, and recruiter task notifications.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl"
        >
          <Plus className="w-4 h-4" /> Create Automation Rule
        </Button>
      </div>

      {/* Automation Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map(rule => (
          <Card
            key={rule.id}
            className={cn(
              'p-5 rounded-3xl border transition-all shadow-2xs space-y-3 bg-white',
              rule.isActive ? 'border-gray-200/80' : 'border-gray-100 opacity-60'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold text-xs">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-mono text-[10px] font-bold text-gray-400">{rule.id}</span>
                  <h4 className="text-xs font-bold text-gray-900">{rule.name}</h4>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleRule(rule.id)}
                className="p-1 text-gray-500 hover:text-gray-900 transition"
              >
                {rule.isActive ? (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Active
                  </span>
                ) : (
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
                    Disabled
                  </span>
                )}
              </button>
            </div>

            <div className="p-3 bg-gray-50/70 rounded-2xl border border-gray-200/60 space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-gray-400 w-16">Trigger:</span>
                <span className="font-mono font-bold text-[#07563D] bg-white px-2 py-0.5 rounded border border-gray-200">
                  {rule.trigger}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-gray-400 w-16">Condition:</span>
                <span className="text-gray-700 font-medium">{rule.condition}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-gray-400">Automated Actions:</span>
              <ul className="space-y-1">
                {rule.actions.map((act, idx) => (
                  <li key={idx} className="flex items-center gap-1.5 text-xs text-gray-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#07563D] shrink-0" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[10px] text-gray-400 font-mono">
              <span>Executed: {rule.executionCount} times</span>
              <span>Last run: {rule.lastTriggered || 'Never'}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal: Create Automation Rule */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Recruitment Automation Rule"
        description="Configure event trigger, evaluation conditions, and automated actions"
      >
        <form onSubmit={handleCreateRule} className="p-6 space-y-4 max-h-[80vh] overflow-auto">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Rule Name *</label>
            <input
              type="text"
              placeholder="e.g. Candidate Selected $\rightarrow$ Auto-Release Assessment"
              value={ruleName}
              onChange={e => setRuleName(e.target.value)}
              required
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Trigger Event *</label>
            <select
              value={triggerEvent}
              onChange={e => setTriggerEvent(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 bg-white font-mono"
            >
              <option value="candidate.stage_changed">candidate.stage_changed</option>
              <option value="interview.scheduled">interview.scheduled</option>
              <option value="interview.completed">interview.completed</option>
              <option value="offer.accepted">offer.accepted</option>
              <option value="requisition.created">requisition.created</option>
              <option value="requisition.approved">requisition.approved</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Condition</label>
            <input
              type="text"
              placeholder="e.g. Current Stage == Interview"
              value={conditionText}
              onChange={e => setConditionText(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Automated Actions (Comma-separated) *</label>
            <textarea
              placeholder="e.g. Create interview task, Notify recruiter, Send calendar invite"
              value={actionText}
              onChange={e => setActionText(e.target.value)}
              rows={2}
              required
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-[#07563D] hover:bg-[#0b7a57] text-white">
              Save Automation Rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
