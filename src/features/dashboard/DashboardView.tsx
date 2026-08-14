import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Drawer } from '../../components/ui/Drawer';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import {
  Users,
  Building2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  UserPlus,
  Plus,
  TrendingUp,
  FileCheck,
  Activity,
  Calendar,
  Sparkles,
  Search,
  Filter,
  Layers,
  Award,
  CircleDollarSign,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { api } from '../../services/api';
import { ApprovalRequest, AuditLog } from '../../types';
import { useToast } from '../../components/ui/Toast';

const headcountTrend = [
  { month: 'Jan', headcount: 142, hires: 12 },
  { month: 'Feb', headcount: 155, hires: 15 },
  { month: 'Mar', headcount: 168, hires: 14 },
  { month: 'Apr', headcount: 180, hires: 16 },
  { month: 'May', headcount: 195, hires: 18 },
  { month: 'Jun', headcount: 210, hires: 22 },
  { month: 'Jul', headcount: 228, hires: 20 },
  { month: 'Aug', headcount: 245, hires: 19 },
];

const departmentDist = [
  { name: 'Engineering', value: 110, color: '#07563D' },
  { name: 'People & HR', value: 35, color: '#0B7A57' },
  { name: 'Finance & Legal', value: 28, color: '#10B981' },
  { name: 'Sales & Mktg', value: 45, color: '#34D399' },
  { name: 'Product', value: 27, color: '#6EE7B7' },
];

export interface DashboardViewProps {
  onNavigate?: (route: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { activeCompany, organization } = useTenant();
  const { user } = useAuth();
  const { primaryRole, hasPermission } = usePermission();
  const { showToast } = useToast();

  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isApprovalsDrawerOpen, setIsApprovalsDrawerOpen] = useState(false);

  useEffect(() => {
    Promise.all([api.getApprovalRequests(), api.getAuditLogs()]).then(([appData, logData]) => {
      setApprovals(appData);
      setAuditLogs(logData);
    });
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const updated = await api.updateApprovalStatus(id, 'Approved');
      setApprovals(prev => prev.map(a => (a.id === id ? updated : a)));
      showToast('Approval request passed!');
    } catch {
      showToast('Failed to update request', 'error');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const updated = await api.updateApprovalStatus(id, 'Rejected');
      setApprovals(prev => prev.map(a => (a.id === id ? updated : a)));
      showToast('Approval request rejected');
    } catch {
      showToast('Failed to update request', 'error');
    }
  };

  const pendingApprovals = approvals.filter(a => a.status === 'Pending');

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Executive Dashboard' }]} />

      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#07563D] uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-emerald-600" /> Welcome back, {user?.name || 'Administrator'}
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mt-1">
            {activeCompany?.legal_name || 'Acme Global Enterprise'} Overview
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Multi-entity workforce metrics, approvals, department distributions, and real-time audit logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => onNavigate && onNavigate('people')}
            leftIcon={<UserPlus className="w-4 h-4" />}
            size="sm"
          >
            Add Employee
          </Button>
          <Button
            onClick={() => setIsApprovalsDrawerOpen(true)}
            variant="outline"
            size="sm"
            leftIcon={<FileCheck className="w-4 h-4 text-emerald-700" />}
          >
            Approvals ({pendingApprovals.length})
          </Button>
        </div>
      </div>

      {/* KPI Cards - Dynamically Scoped per Role */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryRole === 'Manager' ? (
          <>
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">My Team Scope</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#07563D] flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-gray-900">18</span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Direct & Indirect
                </span>
              </div>
              <p className="text-[11px] text-gray-400">Engineering & Product Unit</p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Team Approvals</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-gray-900">3</span>
                <span className="text-xs font-semibold text-amber-600">Pending Review</span>
              </div>
              <p className="text-[11px] text-gray-400">2 Leave Requests, 1 Expense</p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Team Attendance</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-gray-900">94%</span>
                <span className="text-xs font-semibold text-blue-600">Present Today</span>
              </div>
              <p className="text-[11px] text-gray-400">16 Present, 1 On Leave, 1 WFH</p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Open Positions</span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-gray-900">2</span>
                <span className="text-xs font-semibold text-purple-600">Hiring Pipeline</span>
              </div>
              <p className="text-[11px] text-gray-400">Sr. Fullstack, Lead DevOps</p>
            </Card>
          </>
        ) : primaryRole === 'Team Lead' ? (
          <>
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Direct Team</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#07563D] flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-gray-900">6</span>
                <span className="text-xs font-bold text-emerald-600">Direct Reports</span>
              </div>
              <p className="text-[11px] text-gray-400">Core Frontend & Architecture</p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Shift Clocking</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-gray-900">100%</span>
                <span className="text-xs font-semibold text-blue-600">Shift Logged</span>
              </div>
              <p className="text-[11px] text-gray-400">All 6 members clocked in</p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Leave</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-gray-900">1</span>
                <span className="text-xs font-semibold text-amber-600">Pending Review</span>
              </div>
              <p className="text-[11px] text-gray-400">Privilege Leave request</p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sprint Progress</span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-gray-900">88%</span>
                <span className="text-xs font-semibold text-purple-600">On Track</span>
              </div>
              <p className="text-[11px] text-gray-400">Sprint 14 deliverables</p>
            </Card>
          </>
        ) : primaryRole === 'Employee' ? (
          <>
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Leave Balance</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#07563D] flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-gray-900">14 Days</span>
                <span className="text-xs font-bold text-emerald-600">Available</span>
              </div>
              <p className="text-[11px] text-gray-400">10 Privilege, 4 Casual Days</p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Shift Status</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-gray-900">08:58 AM</span>
                <span className="text-xs font-semibold text-blue-600">Clocked In</span>
              </div>
              <p className="text-[11px] text-gray-400">Standard Shift (9:00 - 18:00)</p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Next Payday</span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <CircleDollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-gray-900">Aug 31</span>
                <span className="text-xs font-semibold text-purple-600">On Schedule</span>
              </div>
              <p className="text-[11px] text-gray-400">Monthly Compensation Run</p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">My Documents</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-gray-900">12</span>
                <span className="text-xs font-semibold text-amber-600">Verified</span>
              </div>
              <p className="text-[11px] text-gray-400">Tax Forms, Contract, ID Proofs</p>
            </Card>
          </>
        ) : (
          <>
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Workforce</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#07563D] flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-gray-900">245</span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +8.4%
                </span>
              </div>
              <p className="text-[11px] text-gray-400">Across {activeCompany?.city} & remote campuses</p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Approvals</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-gray-900">{pendingApprovals.length}</span>
                <span className="text-xs font-semibold text-amber-600">Requires Action</span>
              </div>
              <p className="text-[11px] text-gray-400">Leaves, Onboarding, Job Requisitions</p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Functional Depts</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-gray-900">6</span>
                <span className="text-xs font-semibold text-blue-600">Active Units</span>
              </div>
              <p className="text-[11px] text-gray-400">Cost centers assigned</p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Legal Entities</span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-gray-900">2</span>
                <span className="text-xs font-semibold text-purple-600">Tenant Group</span>
              </div>
              <p className="text-[11px] text-gray-400">{organization?.name}</p>
            </Card>
          </>
        )}
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Headcount Growth Chart */}
        <Card className="lg:col-span-8 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-gray-900">Workforce Growth Trend</h2>
              <p className="text-xs text-gray-500">Total active headcount trajectories (2026 YTD)</p>
            </div>
            <Badge variant="emerald" size="sm">
              +19 New Hires This Month
            </Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={headcountTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="headcountGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#07563D" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#07563D" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    borderColor: '#1f2937',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="headcount"
                  stroke="#07563D"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#headcountGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Department Distribution Pie */}
        <Card className="lg:col-span-4 p-6 space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Department Share</h2>
            <p className="text-xs text-gray-500">Headcount percentage breakdown</p>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={departmentDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {departmentDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-gray-100">
            {departmentDist.map(item => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-700 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-gray-900">{item.value} ({Math.round((item.value / 245) * 100)}%)</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Approvals & Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Approvals Section */}
        <Card className="lg:col-span-7 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#07563D]" />
              <h2 className="text-base font-extrabold text-gray-900">Pending Approvals Inbox</h2>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setIsApprovalsDrawerOpen(true)}>
              View All ({approvals.length})
            </Button>
          </div>

          <div className="space-y-3">
            {pendingApprovals.slice(0, 4).map(req => (
              <div
                key={req.id}
                className="p-3.5 rounded-xl border border-gray-100 hover:border-emerald-200 transition-colors flex items-center justify-between gap-3 bg-gray-50/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={req.requester_name} size="sm" />
                  <div>
                    <div className="text-xs font-bold text-gray-900">{req.title}</div>
                    <div className="text-[11px] text-gray-500">
                      Req by <span className="font-semibold text-gray-700">{req.requester_name}</span> • {req.type}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => handleReject(req.id)}>
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => handleApprove(req.id)}>
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Real-time Audit Feed */}
        <Card className="lg:col-span-5 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#07563D]" />
              <h2 className="text-base font-extrabold text-gray-900">Audit Trail Stream</h2>
            </div>
            <Badge variant="emerald" size="sm">
              Live Feed
            </Badge>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {auditLogs.map(log => (
              <div key={log.id} className="text-xs p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">{log.actor_name}</span>
                  <span className="text-[10px] text-gray-400">{log.timestamp}</span>
                </div>
                <div className="text-gray-600">
                  <span className="font-semibold text-emerald-800">{log.action}:</span> {log.target}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Drawer: Approvals Inbox */}
      <Drawer
        isOpen={isApprovalsDrawerOpen}
        onClose={() => setIsApprovalsDrawerOpen(false)}
        title="Workforce Approvals Center"
      >
        <div className="space-y-4">
          {approvals.map(req => (
            <Card key={req.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant={req.status === 'Pending' ? 'amber' : req.status === 'Approved' ? 'emerald' : 'danger'}>
                  {req.status}
                </Badge>
                <span className="text-[11px] text-gray-400">{req.created_at}</span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-900">{req.title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{req.description}</p>
              </div>

              <div className="text-xs text-gray-600 pt-2 border-t border-gray-100 flex items-center justify-between">
                <span>Requester: <strong>{req.requester_name}</strong></span>
                <span>Type: <strong>{req.type}</strong></span>
              </div>

              {req.status === 'Pending' && (
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => handleReject(req.id)}>
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => handleApprove(req.id)}>
                    Approve Request
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </Drawer>
    </div>
  );
};
