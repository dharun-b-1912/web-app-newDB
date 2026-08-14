import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { Tabs } from '../../components/ui/Tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Award, GraduationCap, TrendingUp, Coins, Plus, CheckCircle2, Star, Target, Sparkles, Download, ArrowUpRight } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

export const TalentManagementView: React.FC<{ initialTab?: string }> = ({ initialTab = 'performance' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const { showToast } = useToast();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'TALENT' }, { label: 'Talent, Performance & Learning' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-[#07563D]" /> Talent, Appraisal & Skills Center
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage OKR goal setting, 360° feedback reviews, 9-box talent grids, LMS course enrollments, and CTC compensation structures.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('New Review Cycle Launched!')}>
            Launch Cycle
          </Button>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'performance', label: 'Performance & 360', icon: <Award className="w-4 h-4" /> },
          { id: 'lms', label: 'Training & LMS', icon: <GraduationCap className="w-4 h-4" /> },
          { id: 'career-dev', label: 'Career & 9-Box Grid', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'compensation', label: 'Compensation & Increments', icon: <Coins className="w-4 h-4" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Performance */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 space-y-1">
              <div className="text-xs font-bold text-gray-400 uppercase">Q3 Appraisal Cycle</div>
              <div className="text-2xl font-black text-gray-900">88% Complete</div>
              <div className="text-[11px] text-emerald-600 font-semibold">376 / 428 Reviews Done</div>
            </Card>
            <Card className="p-4 space-y-1">
              <div className="text-xs font-bold text-gray-400 uppercase">Avg Goal Progress</div>
              <div className="text-2xl font-black text-[#07563D]">91.4%</div>
              <div className="text-[11px] text-gray-500 font-semibold">1,240 OKRs On Track</div>
            </Card>
            <Card className="p-4 space-y-1">
              <div className="text-xs font-bold text-gray-400 uppercase">Top Performers (4.5+)</div>
              <div className="text-2xl font-black text-amber-700">64</div>
              <div className="text-[11px] text-amber-600 font-semibold">Eligible for Promotion</div>
            </Card>
            <Card className="p-4 space-y-1">
              <div className="text-xs font-bold text-gray-400 uppercase">PIP Tracked</div>
              <div className="text-2xl font-black text-rose-600">4</div>
              <div className="text-[11px] text-rose-500 font-semibold">Under Active Mentorship</div>
            </Card>
          </div>

          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-gray-900">Q3 2026 Appraisal Tracker</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Manager Rating</TableHead>
                  <TableHead>Peer Rating</TableHead>
                  <TableHead>Self Rating</TableHead>
                  <TableHead>Final Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { name: 'Priya Sharma', dept: 'Product & Design', mgr: '4.8', peer: '4.7', self: '4.5', final: '4.75 / 5.0', status: 'Submitted' },
                  { name: 'Ananya Reddy', dept: 'Engineering', mgr: '4.6', peer: '4.4', self: '4.3', final: '4.50 / 5.0', status: 'Submitted' },
                  { name: 'Vikram Srinivasan', dept: 'Finance & Payroll', mgr: '4.2', peer: '4.3', self: '4.0', final: '4.15 / 5.0', status: 'Submitted' },
                  { name: 'Sneha Mukherjee', dept: 'Human Resources', mgr: '4.5', peer: '4.6', self: '4.4', final: '4.50 / 5.0', status: 'Submitted' },
                ].map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-bold text-gray-900">{row.name}</TableCell>
                    <TableCell>{row.dept}</TableCell>
                    <TableCell className="font-semibold">{row.mgr}</TableCell>
                    <TableCell className="font-semibold">{row.peer}</TableCell>
                    <TableCell className="font-semibold">{row.self}</TableCell>
                    <TableCell className="font-black text-[#07563D]">{row.final}</TableCell>
                    <TableCell><Badge variant="emerald">{row.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => showToast(`Viewing appraisal for ${row.name}`)}>
                        View Summary
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* Tab 2: LMS */}
      {activeTab === 'lms' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 space-y-1">
              <div className="text-xs font-bold text-gray-400 uppercase">Active LMS Courses</div>
              <div className="text-2xl font-black text-gray-900">28 Modules</div>
              <div className="text-[11px] text-emerald-600 font-semibold">POSH, Security, AI & DevOps</div>
            </Card>
            <Card className="p-4 space-y-1">
              <div className="text-xs font-bold text-gray-400 uppercase">Total Completion Rate</div>
              <div className="text-2xl font-black text-[#07563D]">88.5%</div>
              <div className="text-[11px] text-gray-500 font-semibold">1,842 Badges Awarded</div>
            </Card>
            <Card className="p-4 space-y-1">
              <div className="text-xs font-bold text-gray-400 uppercase">Mandatory Compliance Due</div>
              <div className="text-2xl font-black text-amber-700">12 Employees</div>
              <div className="text-[11px] text-amber-600 font-semibold">POSH & Anti-Bribery 2026</div>
            </Card>
          </div>

          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-gray-900">Company Learning Library & Certification Tracker</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: 'POSH & Workplace Code of Conduct 2026', enrolled: 428, completed: 416, required: 'Mandatory All Staff' },
                { title: 'Information Security & GDPR / Data Privacy', enrolled: 428, completed: 410, required: 'Mandatory All Staff' },
                { title: 'Fullstack Microservices Architecture on Cloud Run', enrolled: 85, completed: 72, required: 'Engineering' },
                { title: 'Strategic HR Business Partnering Masterclass', enrolled: 16, completed: 16, required: 'HR Dept' },
              ].map((c, i) => (
                <div key={i} className="p-4 rounded-xl border border-gray-100 hover:border-emerald-200 bg-gray-50/50 space-y-2">
                  <Badge variant="emerald" size="sm">{c.required}</Badge>
                  <h4 className="text-sm font-bold text-gray-900">{c.title}</h4>
                  <div className="text-xs text-gray-500">
                    Enrolled: <strong>{c.enrolled}</strong> • Completed: <strong className="text-[#07563D]">{c.completed}</strong>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#07563D]" style={{ width: `${Math.round((c.completed / c.enrolled) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3: Career & 9-Box */}
      {activeTab === 'career-dev' && (
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-extrabold text-gray-900">9-Box Talent Matrix (Performance vs Potential)</h3>
          <p className="text-xs text-gray-500">Strategic headcount planning and succession management.</p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { label: 'High Potential / Medium Performance', count: '18 Stars', color: 'bg-emerald-50 border-emerald-200 text-[#07563D]' },
              { label: 'High Potential / High Performance', count: '24 Star Performers (HiPo)', color: 'bg-emerald-100 border-emerald-300 text-[#07563D]' },
              { label: 'High Potential / Low Performance', count: '6 Enigmas', color: 'bg-blue-50 border-blue-200 text-blue-800' },
              { label: 'Medium Potential / Medium Performance', count: '140 Core Performers', color: 'bg-gray-50 border-gray-200 text-gray-800' },
              { label: 'Medium Potential / High Performance', count: '52 High Impact Players', color: 'bg-emerald-50 border-emerald-200 text-[#07563D]' },
              { label: 'Low Potential / High Performance', count: '30 Workhorses', color: 'bg-amber-50 border-amber-200 text-amber-800' },
            ].map((box, idx) => (
              <div key={idx} className={`p-4 rounded-xl border ${box.color} font-bold text-xs space-y-1`}>
                <div className="text-[10px] uppercase font-bold opacity-75">{box.label}</div>
                <div className="text-lg font-black">{box.count}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 4: Compensation */}
      {activeTab === 'compensation' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-gray-900">Annual Salary Revision & Banding Matrix</h3>
            <Button size="sm" variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => showToast('Exporting Compensation Report (Excel)...')}>
              Export Payroll CTC
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50 text-[#07563D] space-y-1">
              <div className="text-xs font-bold uppercase">Total Annual Payroll Budget</div>
              <div className="text-2xl font-black">₹68,40,00,000 / yr</div>
              <div className="text-[11px]">Avg CTC: ₹16.0 LPA</div>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 text-blue-900 space-y-1">
              <div className="text-xs font-bold uppercase">Q3 Increment Pool Approved</div>
              <div className="text-2xl font-black">₹4,20,00,000</div>
              <div className="text-[11px]">Average Increment: +11.2%</div>
            </div>
            <div className="p-4 rounded-xl bg-purple-50 text-purple-900 space-y-1">
              <div className="text-xs font-bold uppercase">Variable / Bonus Allocation</div>
              <div className="text-2xl font-black">₹1,85,00,000</div>
              <div className="text-[11px]">Performance Linked Pay</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
