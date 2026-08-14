import React, { useState, useEffect } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { PayrollRun } from '../../../types/payroll';
import { Badge } from '../../../components/ui/Badge';
import {
  CircleDollarSign,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  Building2,
  Coins,
  ArrowUpRight,
  ChevronRight,
  PieChart as PieChartIcon,
  BarChart3,
  LineChart,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart as ReLineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface PayrollDashboardViewProps {
  onNavigateTab?: (tabKey: string) => void;
  onOpenPayslip?: (employeeId: string) => void;
}

export const PayrollDashboardView: React.FC<PayrollDashboardViewProps> = ({
  onNavigateTab,
  onOpenPayslip,
}) => {
  const [runs, setRuns] = useState<PayrollRun[]>([]);

  useEffect(() => {
    setRuns(payrollApi.getPayrollRuns());
  }, []);

  const totalHeadcount = 428;
  const currentMonthGross = '₹ 4,95,00,000';
  const currentMonthNet = '₹ 4,23,00,000';
  const statutoryDues = '₹ 72,00,000';
  const pendingApprovals = 1;
  const lopDeductionsTotal = '₹ 1,84,000';
  const activeLoansCount = 12;

  const kpiCards = [
    { key: 'runs', label: 'Monthly Gross Payroll', value: currentMonthGross, sub: 'Aug 2026 Estimate', icon: CircleDollarSign, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { key: 'runs', label: 'Net Employee Disbursement', value: currentMonthNet, sub: 'Bank Credit Pool', icon: TrendingUp, color: 'text-[#07563D]', bg: 'bg-emerald-50/70' },
    { key: 'statutory', label: 'Statutory Compliance Dues', value: statutoryDues, sub: 'PF + ESI + PT + TDS', icon: ShieldCheck, color: 'text-blue-700', bg: 'bg-blue-50' },
    { key: 'employees', label: 'Payroll Headcount', value: totalHeadcount, sub: 'Active Salaried Employees', icon: Users, color: 'text-purple-700', bg: 'bg-purple-50' },
    { key: 'deductions', label: 'LOP Salary Deductions', value: lopDeductionsTotal, sub: 'Synced from Leave Engine', icon: AlertCircle, color: 'text-rose-700', bg: 'bg-rose-50' },
    { key: 'loans', label: 'Active Loan Accounts', value: activeLoansCount, sub: 'Monthly EMI Auto-Deductions', icon: Coins, color: 'text-amber-700', bg: 'bg-amber-50' },
  ];

  // Chart Data
  const payrollTrendData = [
    { month: 'Mar', gross: 4.62, net: 3.94, statutory: 0.68 },
    { month: 'Apr', gross: 4.68, net: 3.99, statutory: 0.69 },
    { month: 'May', gross: 4.75, net: 4.05, statutory: 0.70 },
    { month: 'Jun', gross: 4.82, net: 4.12, statutory: 0.70 },
    { month: 'Jul', gross: 4.88, net: 4.17, statutory: 0.71 },
    { month: 'Aug (Est)', gross: 4.95, net: 4.23, statutory: 0.72 },
  ];

  const deptCostData = [
    { dept: 'Engineering', cost: 1.85 },
    { dept: 'Product', cost: 0.82 },
    { dept: 'Sales & Mktg', cost: 0.95 },
    { dept: 'HR & Ops', cost: 0.48 },
    { dept: 'Finance', cost: 0.42 },
    { dept: 'Customer Success', cost: 0.43 },
  ];

  const statutoryShareData = [
    { name: 'Employee EPF (12%)', value: 38, color: '#07563D' },
    { name: 'Income Tax (TDS)', value: 42, color: '#3B82F6' },
    { name: 'Professional Tax', value: 8, color: '#F59E0B' },
    { name: 'ESIC (0.75%)', value: 7, color: '#10B981' },
    { name: 'LWF & Other', value: 5, color: '#8B5CF6' },
  ];

  return (
    <div className="space-y-6">
      {/* Top KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigateTab?.(kpi.key)}
              className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className={`p-2 rounded-xl ${kpi.bg} ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-600 transition-colors" />
              </div>
              <div className="mt-3">
                <span className="text-[11px] font-bold text-gray-500 block truncate">{kpi.label}</span>
                <span className="text-base font-black text-gray-900 font-mono tracking-tight block mt-0.5">{kpi.value}</span>
                <span className="text-[10px] text-gray-400 font-medium truncate block mt-0.5">{kpi.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payroll Trend Line Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                <LineChart className="w-4 h-4 text-[#07563D]" />
                <span>Monthly Payroll & Disbursement Trend (Cr ₹)</span>
              </h3>
              <p className="text-[11px] text-gray-500">6-month comparison of Gross Pay, Net Pay, and Statutory Withholdings</p>
            </div>
            <Badge variant="emerald">FY 2026-27 Active</Badge>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ReLineChart data={payrollTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                />
                <Line type="monotone" dataKey="gross" stroke="#07563D" strokeWidth={3} name="Gross Payroll (Cr)" />
                <Line type="monotone" dataKey="net" stroke="#3B82F6" strokeWidth={2.5} name="Net Disbursement (Cr)" />
                <Line type="monotone" dataKey="statutory" stroke="#F59E0B" strokeWidth={2} strokeDasharray="4 4" name="Statutory Dues (Cr)" />
              </ReLineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Statutory Distribution Donut */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-[#07563D]" />
              <span>Statutory Breakdown</span>
            </h3>
            <p className="text-[11px] text-gray-500">PF, ESIC, PT, and TDS tax withholdings</p>
          </div>
          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statutoryShareData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {statutoryShareData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-gray-100 text-[10px]">
            {statutoryShareData.map((s, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-gray-600 truncate">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department Cost Bar Chart & Recent Payroll Runs List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Salary Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#07563D]" />
            <span>Payroll Cost by Department (Cr ₹)</span>
          </h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptCostData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="dept" stroke="#94A3B8" fontSize={10} />
                <YAxis stroke="#94A3B8" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                <Bar dataKey="cost" fill="#07563D" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Payroll Runs Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs font-black text-gray-900 uppercase tracking-wider">Recent Payroll Executions</span>
            <button
              onClick={() => onNavigateTab?.('processing')}
              className="text-xs font-bold text-[#07563D] hover:underline cursor-pointer"
            >
              View All Runs →
            </button>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="p-3.5">Run Code</th>
                <th className="p-3.5">Pay Period</th>
                <th className="p-3.5 text-right">Headcount</th>
                <th className="p-3.5 text-right">Gross Payroll</th>
                <th className="p-3.5 text-right">Net Disbursement</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {runs.map(run => (
                <tr key={run.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-3.5 font-bold font-mono text-gray-900">{run.run_code}</td>
                  <td className="p-3.5 font-bold text-gray-800">{run.pay_period}</td>
                  <td className="p-3.5 text-right font-mono text-gray-600">{run.total_employees}</td>
                  <td className="p-3.5 text-right font-mono font-bold text-gray-900">₹ {run.total_gross_pay.toLocaleString('en-IN')}</td>
                  <td className="p-3.5 text-right font-mono font-bold text-[#07563D]">₹ {run.total_net_pay.toLocaleString('en-IN')}</td>
                  <td className="p-3.5 text-center">
                    <Badge variant={run.status === 'Finalized' || run.status === 'Paid' ? 'emerald' : 'amber'}>
                      {run.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
