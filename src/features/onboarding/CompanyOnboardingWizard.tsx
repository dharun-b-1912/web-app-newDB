// src/features/onboarding/CompanyOnboardingWizard.tsx
// ============================================================
// Joy PeopleHR Enterprise — 5-Step Resumable Company Onboarding Wizard
// Configures Company Profile, Org Structure, Shifts, Policies, & HR Invites.
// ============================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { 
  Building2, 
  Users, 
  Clock, 
  Calendar, 
  Mail, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Plus, 
  Trash2, 
  Save, 
  ShieldCheck, 
  Layers, 
  Award,
  Globe,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { companyOnboardingService, CompanyOnboardingState, OnboardingStepId } from '../../services/companyOnboardingService';
import { useWorkflowState } from '../../hooks/useWorkflowState';
import { ActionSuccessState } from '../../components/states/UniversalStateView';

export interface CompanyOnboardingWizardProps {
  tenantId?: string;
  onFinish?: () => void;
  onSkip?: () => void;
}

export const CompanyOnboardingWizard: React.FC<CompanyOnboardingWizardProps> = ({
  tenantId = 'org-joy-01',
  onFinish,
  onSkip,
}) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<CompanyOnboardingState>(() =>
    companyOnboardingService.getOnboardingState(tenantId)
  );

  const [newDept, setNewDept] = useState('');
  const [newDesig, setNewDesig] = useState('');
  const [newLoc, setNewLoc] = useState('');

  const [newHrName, setNewHrName] = useState('');
  const [newHrEmail, setNewHrEmail] = useState('');
  const [newHrPhone, setNewHrPhone] = useState('');

  const workflow = useWorkflowState();

  const currentStep = formData.currentStep;

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!formData.step1Profile.companyName.trim()) {
        showToast('Please enter your Company Name', 'error');
        return;
      }
    }

    if (currentStep < 5) {
      const nextStep = (currentStep + 1) as OnboardingStepId;
      const updated = companyOnboardingService.saveStepProgress(tenantId, currentStep, formData);
      setFormData(updated);
      showToast(`Step ${currentStep} saved!`);
    } else {
      // Step 5 Submit & Apply
      handleCompleteOnboarding();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setFormData((prev) => ({
        ...prev,
        currentStep: (prev.currentStep - 1) as OnboardingStepId,
      }));
    }
  };

  const handleCompleteOnboarding = async () => {
    await workflow.execute(async () => {
      await companyOnboardingService.completeAndApplyOnboarding(tenantId);
      return true;
    }, {
      onSuccess: () => {
        showToast('Organization setup completed successfully!', 'success');
      }
    });
  };

  const handleAddDept = () => {
    if (!newDept.trim()) return;
    setFormData((prev) => ({
      ...prev,
      step2Org: {
        ...prev.step2Org,
        departments: [...prev.step2Org.departments, newDept.trim()],
      },
    }));
    setNewDept('');
  };

  const handleRemoveDept = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      step2Org: {
        ...prev.step2Org,
        departments: prev.step2Org.departments.filter((_, i) => i !== idx),
      },
    }));
  };

  const handleAddDesig = () => {
    if (!newDesig.trim()) return;
    setFormData((prev) => ({
      ...prev,
      step2Org: {
        ...prev.step2Org,
        designations: [...prev.step2Org.designations, newDesig.trim()],
      },
    }));
    setNewDesig('');
  };

  const handleRemoveDesig = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      step2Org: {
        ...prev.step2Org,
        designations: prev.step2Org.designations.filter((_, i) => i !== idx),
      },
    }));
  };

  const handleAddHrInvite = () => {
    if (!newHrName.trim() || !newHrEmail.trim()) {
      showToast('Please provide HR full name and email', 'error');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      step5HrInvites: [
        ...prev.step5HrInvites,
        {
          fullName: newHrName.trim(),
          email: newHrEmail.trim(),
          phone: newHrPhone.trim(),
          roleId: 'role-hr-head',
        },
      ],
    }));
    setNewHrName('');
    setNewHrEmail('');
    setNewHrPhone('');
    showToast(`HR invitation prepared for ${newHrName}`);
  };

  const handleRemoveHrInvite = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      step5HrInvites: prev.step5HrInvites.filter((_, i) => i !== idx),
    }));
  };

  // Completion Success Screen
  if (workflow.isSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <ActionSuccessState
          title="Welcome to Joy PeopleHR!"
          description="Your enterprise organization, departments, working schedules, and policy rules are now active and ready for workforce operations."
          summaryBadge="100% SETUP COMPLETE"
          details={[
            { label: 'Company', value: formData.step1Profile.companyName },
            { label: 'Departments', value: `${formData.step2Org.departments.length} Configured` },
            { label: 'Shift Timing', value: formData.step3Work.defaultShiftName },
            { label: 'HR Team', value: `${formData.step5HrInvites.length} Invited` },
          ]}
          primaryActionLabel="Go to HR Operations Dashboard"
          onPrimaryAction={onFinish}
        />
      </div>
    );
  }

  const STEPS_NAV = [
    { id: 1, label: 'Company Profile', icon: Building2 },
    { id: 2, label: 'Org Structure', icon: Layers },
    { id: 3, label: 'Work & Shifts', icon: Clock },
    { id: 4, label: 'Leave Policies', icon: Calendar },
    { id: 5, label: 'Invite HR Team', icon: Users },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#07563D] to-[#0D7A57] text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-xs mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Enterprise Customer Onboarding
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Let's Set Up Your Workforce
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-lg">
              Follow this 5-step guided wizard to customize policies, structure departments, and invite your HR administrator.
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs uppercase font-bold tracking-wider text-emerald-200">Progress</div>
            <div className="text-3xl font-black text-white">{Math.round((currentStep / 5) * 100)}%</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-black/20 h-2 rounded-full mt-6 overflow-hidden">
          <div
            className="bg-amber-400 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Steps Breadcrumb */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {STEPS_NAV.map((s) => {
          const Icon = s.icon;
          const isCurrent = currentStep === s.id;
          const isDone = currentStep > s.id;

          return (
            <div
              key={s.id}
              onClick={() => {
                if (s.id <= currentStep) {
                  setFormData((prev) => ({ ...prev, currentStep: s.id as OnboardingStepId }));
                }
              }}
              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                isCurrent
                  ? 'bg-[#07563D] text-white border-[#07563D] shadow-sm'
                  : isDone
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                <span>Step {s.id}</span>
              </div>
              <div className="text-[11px] font-medium mt-0.5 truncate">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Main Wizard Form Container */}
      <Card className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        {/* Step 1: Company Profile */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Company Profile & Identity</h2>
              <p className="text-xs text-slate-500">Provide official legal entity details for tax documents, invoices, and payslips.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Company Legal Name *</label>
                <Input
                  value={formData.step1Profile.companyName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      step1Profile: { ...prev.step1Profile, companyName: e.target.value },
                    }))
                  }
                  placeholder="e.g. Acme Technologies Private Limited"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Brand / Display Name</label>
                <Input
                  value={formData.step1Profile.brandName || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      step1Profile: { ...prev.step1Profile, brandName: e.target.value },
                    }))
                  }
                  placeholder="e.g. Acme Tech"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Industry Sector</label>
                <Input
                  value={formData.step1Profile.industry}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      step1Profile: { ...prev.step1Profile, industry: e.target.value },
                    }))
                  }
                  placeholder="e.g. Information Technology"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Company Size</label>
                <Input
                  value={formData.step1Profile.companySize}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      step1Profile: { ...prev.step1Profile, companySize: e.target.value },
                    }))
                  }
                  placeholder="e.g. 50-250 Employees"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Default Timezone</label>
                <Input
                  value={formData.step1Profile.timezone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      step1Profile: { ...prev.step1Profile, timezone: e.target.value },
                    }))
                  }
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Payroll Currency</label>
                <Input
                  value={formData.step1Profile.currency}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      step1Profile: { ...prev.step1Profile, currency: e.target.value },
                    }))
                  }
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Registered Address</label>
                <Input
                  value={formData.step1Profile.address}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      step1Profile: { ...prev.step1Profile, address: e.target.value },
                    }))
                  }
                  placeholder="Street address, City, State, Pincode, Country"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Org Structure */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Organization Structure & Hierarchy</h2>
              <p className="text-xs text-slate-500">Define foundational departments and job designations for employee classification.</p>
            </div>

            {/* Departments */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Departments ({formData.step2Org.departments.length})</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.step2Org.departments.map((dept, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1.5 py-1 px-3 text-xs">
                    <span>{dept}</span>
                    <button onClick={() => handleRemoveDept(idx)} className="hover:text-rose-600">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2 max-w-md">
                <Input
                  placeholder="Add Department name..."
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDept()}
                />
                <Button size="sm" onClick={handleAddDept} leftIcon={<Plus className="w-4 h-4" />}>
                  Add
                </Button>
              </div>
            </div>

            {/* Designations */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Designations & Titles ({formData.step2Org.designations.length})</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.step2Org.designations.map((desig, idx) => (
                  <Badge key={idx} variant="outline" className="gap-1.5 py-1 px-3 text-xs">
                    <span>{desig}</span>
                    <button onClick={() => handleRemoveDesig(idx)} className="hover:text-rose-600">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2 max-w-md">
                <Input
                  placeholder="Add Designation title..."
                  value={newDesig}
                  onChange={(e) => setNewDesig(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDesig()}
                />
                <Button size="sm" variant="outline" onClick={handleAddDesig} leftIcon={<Plus className="w-4 h-4" />}>
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Working Schedule */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Shift Timings & Attendance Rules</h2>
              <p className="text-xs text-slate-500">Configure business working hours, grace periods, and overtime eligibility.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Default Shift Title</label>
                <Input
                  value={formData.step3Work.defaultShiftName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      step3Work: { ...prev.step3Work, defaultShiftName: e.target.value },
                    }))
                  }
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Grace Period (Minutes)</label>
                <Input
                  type="number"
                  value={formData.step3Work.gracePeriodMinutes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      step3Work: { ...prev.step3Work, gracePeriodMinutes: Number(e.target.value) },
                    }))
                  }
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Shift Start Time</label>
                <Input
                  type="time"
                  value={formData.step3Work.shiftStartTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      step3Work: { ...prev.step3Work, shiftStartTime: e.target.value },
                    }))
                  }
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Shift End Time</label>
                <Input
                  type="time"
                  value={formData.step3Work.shiftEndTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      step3Work: { ...prev.step3Work, shiftEndTime: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Leave Policies */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">4. Leave Policies & Accruals</h2>
              <p className="text-xs text-slate-500">Set annual statutory and paid time-off quotas for employee leave balances.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">Casual Leave (Days / Year)</label>
                <Input
                  type="number"
                  value={formData.step4Leave.casualLeaveDays}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      step4Leave: { ...prev.step4Leave, casualLeaveDays: Number(e.target.value) },
                    }))
                  }
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">Sick Leave (Days / Year)</label>
                <Input
                  type="number"
                  value={formData.step4Leave.sickLeaveDays}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      step4Leave: { ...prev.step4Leave, sickLeaveDays: Number(e.target.value) },
                    }))
                  }
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">Earned / Privilege Leave</label>
                <Input
                  type="number"
                  value={formData.step4Leave.earnedLeaveDays}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      step4Leave: { ...prev.step4Leave, earnedLeaveDays: Number(e.target.value) },
                    }))
                  }
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">Probation Period (Months)</label>
                <Input
                  type="number"
                  value={formData.step4Leave.probationMonths}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      step4Leave: { ...prev.step4Leave, probationMonths: Number(e.target.value) },
                    }))
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Invite HR */}
        {currentStep === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">5. Invite HR Administrators & Officers</h2>
              <p className="text-xs text-slate-500">Add HR leadership team members who will manage employees, payroll, and attendance.</p>
            </div>

            {/* List of pending invites */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">HR Team Invitations ({formData.step5HrInvites.length})</label>
              {formData.step5HrInvites.map((invite, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                  <div>
                    <strong className="text-slate-900 dark:text-white font-semibold">{invite.fullName}</strong>
                    <span className="text-slate-500 ml-2">({invite.email})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-[#07563D] dark:text-emerald-300 font-bold text-[10px]">
                      HR Head
                    </span>
                    <button onClick={() => handleRemoveHrInvite(idx)} className="text-slate-400 hover:text-rose-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add new invite form */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Add Another HR Specialist</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  placeholder="Full Name..."
                  value={newHrName}
                  onChange={(e) => setNewHrName(e.target.value)}
                />
                <Input
                  type="email"
                  placeholder="Work Email..."
                  value={newHrEmail}
                  onChange={(e) => setNewHrEmail(e.target.value)}
                />
                <Input
                  placeholder="Phone Number..."
                  value={newHrPhone}
                  onChange={(e) => setNewHrPhone(e.target.value)}
                />
              </div>
              <Button size="sm" variant="outline" onClick={handleAddHrInvite} leftIcon={<Plus className="w-4 h-4" />}>
                Add to Invitations
              </Button>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" size="sm" onClick={handlePrevStep} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Previous Step
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {onSkip && (
              <Button variant="ghost" size="sm" onClick={onSkip}>
                Skip for Now
              </Button>
            )}
            <Button
              size="md"
              onClick={handleNextStep}
              isLoading={workflow.isProcessing}
              rightIcon={currentStep === 5 ? <CheckCircle2 className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            >
              {currentStep === 5 ? 'Complete & Launch Organization' : 'Save & Continue'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
