import React, { useState } from 'react';
import {
  Building2,
  Search,
  Filter,
  Plus,
  CheckCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Shield,
  RefreshCw,
  X,
  ChevronRight,
} from 'lucide-react';
import { platformAdminApi } from '../../../services/platformAdminApi';
import { TenantOrganization, TenantStatus } from '../../../types/platformAdmin';

export const TenantsView: React.FC = () => {
  const [tenants, setTenants] = useState<TenantOrganization[]>(() => platformAdminApi.getTenants());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Tenant Form State
  const [formData, setFormData] = useState({
    legal_name: '',
    trade_name: '',
    owner_name: '',
    owner_email: '',
    industry: 'Software & IT Services',
    city: 'Coimbatore',
    employee_count: 50,
    plan: 'Professional' as TenantOrganization['plan'],
  });

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.legal_name || !formData.owner_email) return;

    const created = platformAdminApi.createTenant(formData);
    setTenants([created, ...tenants]);
    setIsCreateModalOpen(false);
    setFormData({
      legal_name: '',
      trade_name: '',
      owner_name: '',
      owner_email: '',
      industry: 'Software & IT Services',
      city: 'Coimbatore',
      employee_count: 50,
      plan: 'Professional',
    });
  };

  const handleStatusChange = (id: string, status: TenantStatus) => {
    platformAdminApi.updateTenantStatus(id, status);
    setTenants(tenants.map(t => (t.id === id ? { ...t, status } : t)));
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch =
      t.legal_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.owner_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Tenant & Organization Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Provision, manage, and monitor all multi-tenant customer organizations across WorkForceOS SaaS platform.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#07563D] hover:bg-[#064733] text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Provision New Organization
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by legal name, email, or tenant ID..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none"
          >
            <option value="ALL">All Statuses ({tenants.length})</option>
            <option value="Active">Active</option>
            <option value="Trial">Trial</option>
            <option value="Payment Pending">Payment Pending</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Organizations Enterprise Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Organization & Tenant ID</th>
                <th className="py-3 px-4">Owner & Admin</th>
                <th className="py-3 px-4">Plan & Headcount</th>
                <th className="py-3 px-4">MRR</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Health</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredTenants.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#07563D] font-bold text-xs flex items-center justify-center border border-emerald-100 shrink-0">
                        {t.legal_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{t.legal_name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{t.id} • {t.city}, {t.country}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-gray-800">{t.owner_name}</div>
                    <div className="text-[10px] text-gray-400">{t.owner_email}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-md font-bold text-[10px]">
                      {t.plan}
                    </span>
                    <div className="text-[10px] text-gray-500 mt-0.5">{t.employee_count} Employees</div>
                  </td>

                  <td className="py-3.5 px-4 font-bold text-gray-900">
                    ₹{(t.mrr / 1000).toFixed(0)}k <span className="text-[10px] text-gray-400 font-normal">/mo</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <select
                      value={t.status}
                      onChange={e => handleStatusChange(t.id, e.target.value as TenantStatus)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border focus:outline-none ${
                        t.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : t.status === 'Trial'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : t.status === 'Payment Pending'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      <option value="Active">Active</option>
                      <option value="Trial">Trial</option>
                      <option value="Payment Pending">Payment Pending</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.health === 'Healthy' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {t.health === 'Healthy' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {t.health}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => alert(`Viewing tenant detail experience for ${t.legal_name}`)}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision New Organization Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">Provision New Organization</h3>
                <p className="text-xs text-gray-500">Initialize tenant database schema, roles & default configuration</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Company Legal Name</label>
                <input
                  type="text"
                  required
                  value={formData.legal_name}
                  onChange={e => setFormData({ ...formData, legal_name: e.target.value })}
                  placeholder="e.g. NextGen Robotics Pvt Ltd"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Owner Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.owner_name}
                    onChange={e => setFormData({ ...formData, owner_name: e.target.value })}
                    placeholder="e.g. Anand Mahindra"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Owner Email</label>
                  <input
                    type="email"
                    required
                    value={formData.owner_email}
                    onChange={e => setFormData({ ...formData, owner_email: e.target.value })}
                    placeholder="admin@nextgen.in"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Subscription Plan</label>
                  <select
                    value={formData.plan}
                    onChange={e => setFormData({ ...formData, plan: e.target.value as TenantOrganization['plan'] })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none font-semibold"
                  >
                    <option value="Starter">Starter (₹18,000/mo)</option>
                    <option value="Professional">Professional (₹45,000/mo)</option>
                    <option value="Business">Business (₹85,000/mo)</option>
                    <option value="Enterprise">Enterprise (₹1,80,000/mo)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Initial Employees</label>
                  <input
                    type="number"
                    value={formData.employee_count}
                    onChange={e => setFormData({ ...formData, employee_count: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#07563D] hover:bg-[#064733] text-white font-bold rounded-xl shadow-sm"
                >
                  Start Provisioning Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
