import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Workflow, Plus, GitBranch, Play } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const WorkflowBuilderView: React.FC = () => {
  const { showToast } = useToast();

  const workflows = [
    { code: 'WF-TRV-01', name: 'Travel Request Multi-Tier Approval Workflow', module: 'Travel', trigger: 'Record Created', steps: 3, version: 'v2.0', status: 'Active' },
    { code: 'WF-ONB-02', name: 'New Employee Automated Onboarding Task Assignment', module: 'Core HR', trigger: 'Employee Joined', steps: 5, version: 'v1.4', status: 'Active' },
    { code: 'WF-SLA-03', name: 'HR Helpdesk Ticket SLA Escalation Workflow', module: 'Helpdesk', trigger: 'SLA Risk Timer', steps: 2, version: 'v1.1', status: 'Active' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Workflow className="w-5 h-5 text-[#07563D]" />
            <span>Visual Workflow Builder & Trigger Engine</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Automate multi-step approval paths, condition checks, webhook dispatches, and scheduled status transitions</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Create Visual Workflow Builder modal opened')}>
          Create Workflow Rule
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-mono">Code</th>
              <th className="p-4">Workflow Name</th>
              <th className="p-4 font-mono">Target Module</th>
              <th className="p-4">Trigger Event</th>
              <th className="p-4 font-mono">Steps Count</th>
              <th className="p-4 font-mono">Version</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-mono">
            {workflows.map(wf => (
              <tr key={wf.code} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-bold text-gray-900">{wf.code}</td>
                <td className="p-4 font-sans font-extrabold text-gray-900">{wf.name}</td>
                <td className="p-4 font-sans font-bold text-gray-700">{wf.module}</td>
                <td className="p-4 font-sans text-gray-800">{wf.trigger}</td>
                <td className="p-4 text-gray-800 font-bold">{wf.steps} Steps</td>
                <td className="p-4 text-gray-600">{wf.version}</td>
                <td className="p-4 text-center font-sans"><Badge variant="emerald">{wf.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
