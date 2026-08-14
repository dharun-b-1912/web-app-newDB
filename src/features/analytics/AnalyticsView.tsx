import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { Tabs } from '../../components/ui/Tabs';
import { BarChart3, PieChart, Activity, Clock, CircleDollarSign, FileText, Download, Sparkles, TrendingUp, Users } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart as RePie, Pie, Cell } from 'recharts';
import { useToast } from '../../components/ui/Toast';

const monthlyPayrollData = [
  { month: 'Jan', cost: 420 },
  { month: 'Feb', cost: 435 },
  { month: 'Mar', cost: 450 },
  { month: 'Apr', cost: 468 },
  { month: 'May', cost: 485 },
  { month: 'Jun', cost: 510 },
  { month: 'Jul', cost: 535 },
  { month: 'Aug', cost: 570 },
];

export const AnalyticsView: React.FC<{ initialTab?: string }> = ({ initialTab = 'analytics' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const { showToast } = useToast();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'ANALYTICS' }, { label: 'HR Analytics & Reports Engine' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#07563D]" /> Enterprise HR Intelligence & Custom Reports
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Predictive attrition modeling, compensation distribution, time-to-hire metrics, and downloadable executive PDF/Excel exports.
          </p>
        </div>
        <Button leftIcon={<Download className="w-4 h-4" />} onClick={() => showToast('Generating Comprehensive HR Master Report...')}>
          Export Master Data
        </Button>
      </div>

      <Tabs
        tabs={[
          { id: 'analytics', label: 'HR Analytics Hub', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'workforce-analytics', label: 'Workforce Demographics', icon: <PieChart className="w-4 h-4" /> },
          { id: 'recruitment-analytics', label: 'Recruitment Analytics', icon: <Activity className="w-4 h-4" /> },
          { id: 'attendance-analytics', label: 'Attendance Analytics', icon: <Clock className="w-4 h-4" /> },
          { id: 'payroll-analytics', label: 'Payroll & Cost Analytics', icon: <CircleDollarSign className="w-4 h-4" /> },
          { id: 'reports', label: 'Custom Reports', icon: <FileText className="w-4 h-4" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Analytics Content */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4 space-y-1">
            <div className="text-xs font-bold text-gray-400 uppercase">Annual Attrition Rate</div>
            <div className="text-2xl font-black text-[#07563D]">4.2%</div>
            <div className="text-[11px] text-emerald-600 font-semibold">Industry Avg: 12.8% (Healthy)</div>
          </Card>
          <Card className="p-4 space-y-1">
            <div className="text-xs font-bold text-gray-400 uppercase">Avg Time-to-Fill</div>
            <div className="text-2xl font-black text-gray-900">22 Days</div>
            <div className="text-[11px] text-emerald-600 font-semibold">-4 Days Improvement</div>
          </Card>
          <Card className="p-4 space-y-1">
            <div className="text-xs font-bold text-gray-400 uppercase">Gender Diversity Ratio</div>
            <div className="text-2xl font-black text-blue-700">42% F / 58% M</div>
            <div className="text-[11px] text-blue-600 font-semibold">+6% Female Tech Hiring</div>
          </Card>
          <Card className="p-4 space-y-1">
            <div className="text-xs font-bold text-gray-400 uppercase">Cost Per Hire</div>
            <div className="text-2xl font-black text-purple-700">₹42,500</div>
            <div className="text-[11px] text-purple-600 font-semibold">In-house Referral Driven</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-8 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">Monthly Payroll & Personnel Expenditure (₹ Lakhs)</h3>
                <p className="text-xs text-gray-500">2026 YTD Payroll Budget vs Actual Spend</p>
              </div>
              <Badge variant="emerald">₹570L Current Run-rate</Badge>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyPayrollData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="cost" stroke="#07563D" fill="#07563D" fillOpacity={0.2} strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="lg:col-span-4 p-6 space-y-4">
            <h3 className="text-base font-extrabold text-gray-900">Quick Standard Reports</h3>
            <div className="space-y-2">
              {[
                'Form 16 Tax Deduction Master Report',
                'Monthly EPF & ESI Compliance Statement',
                'Headcount & Department Cost Allocation',
                'Attendance & Overtime Log Summary',
                'Performance Appraisal & Increment Distribution',
              ].map((rep, idx) => (
                <button
                  key={idx}
                  onClick={() => showToast(`Exporting ${rep} (CSV)...`)}
                  className="w-full text-left p-2.5 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50 text-xs font-bold text-gray-700 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>{rep}</span>
                  <Download className="w-3.5 h-3.5 text-[#07563D]" />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
