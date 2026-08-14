import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { Tabs } from '../../components/ui/Tabs';
import { Workflow, CheckSquare, Bell, Timer, Plus, CheckCircle2, Play, Sparkles, Sliders } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

export const AutomationView: React.FC<{ initialTab?: string }> = ({ initialTab = 'workflows' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const { showToast } = useToast();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'AUTOMATION' }, { label: 'Workflow & Trigger Engine' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Workflow className="w-5 h-5 text-[#07563D]" /> Workflow Automation & Multi-Tier Approval Engine
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Configure multi-step conditional approval chains, email/Slack notification rules, and background cron jobs.
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Workflow Builder Canvas Opened')}>
          Create Workflow
        </Button>
      </div>

      <Tabs
        tabs={[
          { id: 'workflows', label: 'Workflow Engine', icon: <Workflow className="w-4 h-4" /> },
          { id: 'approvals', label: 'Unified Approval Hub', icon: <CheckSquare className="w-4 h-4" /> },
          { id: 'notifications', label: 'Notification Triggers', icon: <Bell className="w-4 h-4" /> },
          { id: 'scheduled-jobs', label: 'Scheduled Cron Jobs', icon: <Timer className="w-4 h-4" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Workflows */}
      {activeTab === 'workflows' && (
        <div className="space-y-4">
          {[
            { name: 'Standard Employee Onboarding Chain', trigger: 'When Employee Status = Hired', steps: 'IT Provisioning → HR Document Verification → ID Badge Creation', status: 'Active' },
            { name: 'High-Value Expense Approval (> ₹50,000)', trigger: 'Expense Request Submitted', steps: 'Direct Manager → Finance Lead → HR Head Approval', status: 'Active' },
            { name: 'Employee Offboarding & Clearance', trigger: 'Resignation Submitted & Accepted', steps: 'IT Wipe → Asset Return → No Dues Certificate → Final Settlement', status: 'Active' },
            { name: 'Automated POSH Compliance Reminder', trigger: 'On 1st of every Quarter', steps: 'Check Uncertified Employees → Send Slack & Email Digest', status: 'Active' },
          ].map((wf, idx) => (
            <Card key={idx} className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{wf.name}</span>
                  <Badge variant="emerald">{wf.status}</Badge>
                </div>
                <div className="text-xs text-gray-500">
                  Trigger: <strong className="text-gray-700">{wf.trigger}</strong>
                </div>
                <div className="text-xs text-emerald-800 font-medium">{wf.steps}</div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => showToast(`Testing Trigger for ${wf.name}`)}>
                  Test Trigger
                </Button>
                <Button size="sm" onClick={() => showToast(`Editing Workflow ${wf.name}`)}>
                  Configure
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 2: Scheduled Jobs */}
      {activeTab === 'scheduled-jobs' && (
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-extrabold text-gray-900">Background System Cron Jobs</h3>
          <div className="space-y-3">
            {[
              { job: 'Daily Attendance LOP Auto-Calculation', cron: '0 0 * * * (Every midnight)', lastRun: '12-Aug-2026 00:00 AM', result: 'Success (428 Checked)' },
              { job: 'Monthly EPF Statutory Remittance Sync', cron: '0 2 1 * * (1st of Month)', lastRun: '01-Aug-2026 02:00 AM', result: 'Success' },
              { job: 'Nightly Supabase RLS Audit Scan', cron: '0 3 * * * (Every night)', lastRun: '12-Aug-2026 03:00 AM', result: 'Success (0 Leakages)' },
            ].map((j, i) => (
              <div key={i} className="p-3.5 rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-900">{j.job}</div>
                  <div className="text-[11px] text-gray-500">Cron: {j.cron} • Last Execution: {j.lastRun}</div>
                </div>
                <Badge variant="emerald">{j.result}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
