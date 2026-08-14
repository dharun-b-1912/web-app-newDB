import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Hourglass,
  Gift,
  RefreshCw,
  Users,
  CircleDollarSign,
  Activity,
  BarChart3,
} from 'lucide-react';
import { platformAdminApi } from '../../../services/platformAdminApi';

const MONTHLY_MRR = [
  { month: 'Mar', mrr: 15.2 },
  { month: 'Apr', mrr: 15.8 },
  { month: 'May', mrr: 16.1 },
  { month: 'Jun', mrr: 16.7 },
  { month: 'Jul', mrr: 17.4 },
  { month: 'Aug', mrr: 18.4 },
];

const TRIALS = [
  { id: 'TRL-101', company: 'ByteForge Systems', plan: 'Professional', started: '2026-07-30', expires: '2026-08-25', employees: 40, contact: 'Kiran V', status: 'Active' },
  { id: 'TRL-102', company: 'Nimbus Cloud Solutions', plan: 'Business', started: '2026-08-01', expires: '2026-08-29', employees: 110, contact: 'Priya S', status: 'Active' },
  { id: 'TRL-103', company: 'OmniRetail Pvt Ltd', plan: 'Starter', started: '2026-07-28', expires: '2026-08-11', employees: 25, contact: 'Arun M', status: 'Expired' },
  { id: 'TRL-104', company: 'CyberSoft Global Tech', plan: 'Professional', started: '2026-08-01', expires: '2026-08-25', employees: 120, contact: 'Anish K', status: 'Active' },
];

const RENEWALS = [
  { tenant: 'TechCorp Solutions Pvt Ltd', plan: 'Business', amount: 85000, date: '2026-08-01', status: 'Upcoming' },
  { tenant: 'Zenith Logistics & Supply Chain', plan: 'Enterprise', amount: 248000, date: '2026-08-10', status: 'Overdue' },
  { tenant: 'Acme Technologies Pvt Ltd', plan: 'Enterprise', amount: 171100, date: '2027-01-15', status: 'Auto-Renew' },
];

const COUPONS = [
  { code: 'LAUNCH50', discount: '50% off first 3 months', used: 12, limit: 50, plan: 'All', expires: '2026-12-31', status: 'Active' },
  { code: 'ENT2026', discount: '₹30,000 off Enterprise Annual', used: 4, limit: 10, plan: 'Enterprise', expires: '2026-09-30', status: 'Active' },
  { code: 'STARTUP25', discount: '25% off Starter/Pro 6 months', used: 28, limit: 30, plan: 'Starter/Pro', expires: '2026-08-31', status: 'Expiring Soon' },
];

const MiniBar: React.FC<{ value: number; max: number }> = ({ value, max }) => (
  <div className="flex items-end gap-0.5 h-8">
    {MONTHLY_MRR.map((m, i) => {
      const pct = (m.mrr / max) * 100;
      const isLast = i === MONTHLY_MRR.length - 1;
      return (
        <div key={m.month} className="flex flex-col items-center gap-0.5 flex-1">
          <div
            className={`w-full rounded-t-sm transition-all ${isLast ? 'bg-[#07563D]' : 'bg-emerald-200'}`}
            style={{ height: `${pct}%` }}
          />
        </div>
      );
    })}
  </div>
);

export const SaasBusinessView: React.FC = () => {
  const metrics = platformAdminApi.getDashboardMetrics();
  const [activeTab, setActiveTab] = useState<'overview' | 'trials' | 'renewals' | 'coupons'>('overview');

  const TAB_LIST = [
    { id: 'overview', label: 'Revenue Overview' },
    { id: 'trials', label: 'Trial Management', badge: 37 },
    { id: 'renewals', label: 'Renewals & Churn' },
    { id: 'coupons', label: 'Coupons & Discounts' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <h1 className="text-2xl font-black text-gray-900">SaaS Business & Revenue Analytics</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          MRR/ARR growth, Net Revenue Retention (NRR), customer LTV, trial conversions, churn intelligence, and coupon management.
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100/80 p-1 rounded-xl w-fit">
        {TAB_LIST.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white text-[#07563D] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
            {'badge' in tab && (
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Annual Recurring Revenue (ARR)</span>
              <div className="text-3xl font-black text-gray-900">₹{(metrics.arr / 10000000).toFixed(2)} Cr</div>
              <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /><span>+14.0% YoY Growth</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Monthly Recurring Revenue (MRR)</span>
              <div className="text-3xl font-black text-gray-900">₹{(metrics.mrr / 100000).toFixed(1)} L</div>
              <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /><span>+8.7% MoM</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Net Retention Rate (NRR)</span>
              <div className="text-3xl font-black text-gray-900">{metrics.netRetentionRate}%</div>
              <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /><span>Best-in-class SaaS Metric</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Monthly Churn Rate</span>
              <div className="text-3xl font-black text-gray-900">{metrics.churnRate}%</div>
              <div className="text-xs font-bold text-rose-600 flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5" /><span>-0.3% from last month</span>
              </div>
            </div>
          </div>

          {/* MRR Trend + Plan Mix */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">MRR Growth Trend</h3>
                  <p className="text-[11px] text-gray-500">Last 6 months (₹ Lakhs)</p>
                </div>
                <BarChart3 className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex items-end gap-2 h-24">
                {MONTHLY_MRR.map((m, i) => {
                  const max = Math.max(...MONTHLY_MRR.map(x => x.mrr));
                  const pct = (m.mrr / max) * 100;
                  const isLast = i === MONTHLY_MRR.length - 1;
                  return (
                    <div key={m.month} className="flex flex-col items-center gap-1 flex-1">
                      <div className="text-[9px] font-bold text-gray-600">₹{m.mrr}L</div>
                      <div
                        className={`w-full rounded-t-lg transition-all ${isLast ? 'bg-[#07563D]' : 'bg-emerald-200'}`}
                        style={{ height: `${pct * 0.6}px` }}
                      />
                      <div className="text-[9px] text-gray-500 font-semibold">{m.month}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">Revenue by Plan Mix</h3>
                  <p className="text-[11px] text-gray-500">MRR contribution breakdown</p>
                </div>
                <CircleDollarSign className="w-4 h-4 text-gray-400" />
              </div>
              <div className="space-y-3">
                {[
                  { plan: 'Enterprise', mrr: '₹12.4L', pct: 67, color: 'bg-[#07563D]' },
                  { plan: 'Business', mrr: '₹3.8L', pct: 21, color: 'bg-emerald-400' },
                  { plan: 'Professional', mrr: '₹1.6L', pct: 9, color: 'bg-blue-500' },
                  { plan: 'Starter', mrr: '₹0.6L', pct: 3, color: 'bg-gray-400' },
                ].map(p => (
                  <div key={p.plan} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                      <span>{p.plan}</span>
                      <span className="font-bold text-gray-900">{p.mrr} ({p.pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className={`${p.color} h-full rounded-full`} style={{ width: `${p.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* TRIALS TAB */}
      {activeTab === 'trials' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Trial Organizations</h3>
              <p className="text-[11px] text-gray-500">Active 14-day evaluation accounts — monitor conversion pipeline</p>
            </div>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
              {TRIALS.filter(t => t.status === 'Active').length} Active Trials
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Trial ID & Company</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Employees</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Expires</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {TRIALS.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50/60">
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{t.company}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{t.id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-800 font-bold text-[10px] rounded-md">{t.plan}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800">{t.employees}</td>
                    <td className="py-3 px-4 text-gray-700">{t.contact}</td>
                    <td className="py-3 px-4 font-mono text-gray-600">{t.expires}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 font-bold text-[10px] rounded-md border ${
                        t.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {t.status === 'Active' && (
                        <button
                          onClick={() => alert(`Converting ${t.company} to paid subscription`)}
                          className="px-2.5 py-1 bg-[#07563D] hover:bg-[#064733] text-white font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                        >
                          Convert to Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RENEWALS TAB */}
      {activeTab === 'renewals' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Upcoming Renewals (30 Days)</span>
              <div className="text-3xl font-black text-gray-900">₹8.2L</div>
              <div className="text-xs text-emerald-700 font-bold flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> 12 Accounts Due</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Overdue / Payment Stuck</span>
              <div className="text-3xl font-black text-rose-600">₹2.48L</div>
              <div className="text-xs text-rose-600 font-bold flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5" /> 1 Account Suspended</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Churn This Month</span>
              <div className="text-3xl font-black text-gray-900">2.4%</div>
              <div className="text-xs text-emerald-700 font-bold flex items-center gap-1"><ArrowDownRight className="w-3.5 h-3.5" /> Down from 2.7% last month</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-3">Renewal Pipeline</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Tenant</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Invoice Amount (incl. GST)</th>
                    <th className="py-3 px-4">Renewal Date</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {RENEWALS.map(r => (
                    <tr key={r.tenant} className="hover:bg-gray-50/60">
                      <td className="py-3 px-4 font-bold text-gray-900">{r.tenant}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-800 font-bold text-[10px] rounded-md">{r.plan}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900">₹{r.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-gray-600">{r.date}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 font-bold text-[10px] rounded-md border ${
                          r.status === 'Auto-Renew'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : r.status === 'Upcoming'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* COUPONS TAB */}
      {activeTab === 'coupons' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Coupon & Discount Registry</h3>
              <p className="text-[11px] text-gray-500">Manage promotional codes, discount rules, and usage analytics</p>
            </div>
            <button
              onClick={() => alert('Create Coupon Modal')}
              className="px-3 py-1.5 bg-[#07563D] hover:bg-[#064733] text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-colors"
            >
              + Create Coupon
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Coupon Code</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Applicable Plan</th>
                  <th className="py-3 px-4">Usage</th>
                  <th className="py-3 px-4">Expires</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {COUPONS.map(c => (
                  <tr key={c.code} className="hover:bg-gray-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-[#07563D]">{c.code}</td>
                    <td className="py-3 px-4 font-semibold text-gray-800">{c.discount}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-bold text-[10px] rounded-md">{c.plan}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#07563D] h-full" style={{ width: `${(c.used / c.limit) * 100}%` }} />
                        </div>
                        <span className="font-bold text-[11px] text-gray-700">{c.used}/{c.limit}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-600">{c.expires}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 font-black text-[10px] rounded-full uppercase border ${
                        c.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COHORTS TAB */}
      {activeTab === 'cohorts' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-base font-black text-gray-900">Customer Retention Cohort Analysis</h3>
              <p className="text-xs text-gray-500 mt-0.5">Month-by-month customer net retention percentage tracking</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-[#07563D] border border-emerald-200">
              91.4% Avg 6M Retention
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Cohort Month</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">M1</th>
                  <th className="py-3 px-4">M2</th>
                  <th className="py-3 px-4">M3</th>
                  <th className="py-3 px-4">M6</th>
                  <th className="py-3 px-4">M12</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {[
                  { cohort: 'Jan 2026', size: 34, m1: 100, m2: 97, m3: 94, m6: 91, m12: 88 },
                  { cohort: 'Feb 2026', size: 28, m1: 100, m2: 96, m3: 93, m6: 89, m12: 87 },
                  { cohort: 'Mar 2026', size: 42, m1: 100, m2: 98, m3: 95, m6: 92, m12: 90 },
                  { cohort: 'Apr 2026', size: 38, m1: 100, m2: 97, m3: 94, m6: 91, m12: 89 },
                  { cohort: 'May 2026', size: 45, m1: 100, m2: 98, m3: 96, m6: 93, m12: 91 },
                  { cohort: 'Jun 2026', size: 52, m1: 100, m2: 98, m3: 95, m6: 94, m12: 92 },
                ].map(r => (
                  <tr key={r.cohort} className="hover:bg-gray-50/60">
                    <td className="py-3.5 px-4 font-bold text-gray-900">{r.cohort}</td>
                    <td className="py-3.5 px-4 font-mono">{r.size} orgs</td>
                    <td className="py-3.5 px-4 bg-emerald-100 text-emerald-900 font-bold font-mono text-center">{r.m1}%</td>
                    <td className="py-3.5 px-4 bg-emerald-100/80 text-emerald-900 font-bold font-mono text-center">{r.m2}%</td>
                    <td className="py-3.5 px-4 bg-emerald-50 text-emerald-800 font-bold font-mono text-center">{r.m3}%</td>
                    <td className="py-3.5 px-4 bg-emerald-50/60 text-emerald-800 font-bold font-mono text-center">{r.m6}%</td>
                    <td className="py-3.5 px-4 bg-gray-50 text-gray-700 font-mono text-center">{r.m12}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

