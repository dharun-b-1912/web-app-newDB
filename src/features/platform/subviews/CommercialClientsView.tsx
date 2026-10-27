// src/features/platform/subviews/CommercialClientsView.tsx
// ============================================================================
// Joy PeopleHR — SaaS Commercial Clients & Enterprise Accounts Directory
// Unified CRM linking Client Master -> Quotations -> Invoicing -> Subscriptions
// ============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Globe,
  FileText,
  DollarSign,
  Briefcase,
  Layers,
  CheckCircle2,
  Clock,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  X,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { CommercialClient, CommercialQuotation, SaaSInvoice } from '../../../types/saasCommercial';
import { saasCommercialService } from '../../../services/platform/saasCommercialService';
import { CompanyLogoUpload } from '../../../components/common/CompanyLogoUpload';

interface CommercialClientsViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const CommercialClientsView: React.FC<CommercialClientsViewProps> = ({ onNavigateTab }) => {
  const [clients, setClients] = useState<CommercialClient[]>(() =>
    saasCommercialService.getClients()
  );
  const [quotations] = useState<CommercialQuotation[]>(() =>
    saasCommercialService.getQuotations()
  );
  const [invoices, setInvoices] = useState<SaaSInvoice[]>(() =>
    saasCommercialService.getInvoices()
  );

  useEffect(() => {
    const handleUpdate = () => {
      setClients([...saasCommercialService.getClients()]);
      setInvoices([...saasCommercialService.getInvoices()]);
    };
    window.addEventListener('commercial:data_updated', handleUpdate);
    return () => window.removeEventListener('commercial:data_updated', handleUpdate);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tierFilter, setTierFilter] = useState('ALL');

  // Preview Drawer & Modal
  const [selectedClient, setSelectedClient] = useState<CommercialClient | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Add / Edit Form State
  const [formData, setFormData] = useState({
    legalName: '',
    tradeName: '',
    logoUrl: '',
    gstin: '',
    pan: '',
    contactPerson: '',
    designation: '',
    email: '',
    phone: '',
    website: '',
    line1: '',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pinCode: '',
    industry: 'Manufacturing',
    employeeCount: 250,
    customerType: 'Mid-Market' as 'Enterprise' | 'Mid-Market' | 'SMB',
    status: 'Active' as 'Active' | 'Lead' | 'Churned',
  });

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (tierFilter !== 'ALL' && c.customerType !== tierFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.legalName.toLowerCase().includes(q) ||
          c.clientCode.toLowerCase().includes(q) ||
          c.gstin.toLowerCase().includes(q) ||
          c.contactPerson.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [clients, statusFilter, tierFilter, searchQuery]);

  // Dynamic Live KPIs
  const clientMetrics = useMemo(() => {
    const total = clients.length;
    const active = clients.filter((c) => c.status === 'Active').length;
    const totalEmployees = clients.reduce((acc, c) => acc + (c.employeeCount || 0), 0);
    const totalBilled = invoices.reduce((acc, i) => acc + (i.totalInvoiceAmount || 0), 0);

    return {
      total,
      active,
      totalEmployees,
      totalBilledFormatted: `₹${(totalBilled / 1000).toFixed(1)}k`,
    };
  }, [clients, invoices]);

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setFormData({
      legalName: '',
      tradeName: '',
      logoUrl: '',
      gstin: '',
      pan: '',
      contactPerson: '',
      designation: '',
      email: '',
      phone: '',
      website: '',
      line1: '',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pinCode: '',
      industry: 'Technology',
      employeeCount: 150,
      customerType: 'Mid-Market',
      status: 'Lead',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.legalName || !formData.email) return;

    if (isEditing && selectedClient) {
      const updated: CommercialClient = {
        ...selectedClient,
        legalName: formData.legalName,
        tradeName: formData.tradeName || formData.legalName,
        logoUrl: formData.logoUrl || selectedClient.logoUrl,
        gstin: formData.gstin || 'Unregistered',
        pan: formData.pan || formData.gstin.slice(2, 12),
        contactPerson: formData.contactPerson,
        designation: formData.designation,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        billingAddress: {
          line1: formData.line1,
          city: formData.city,
          state: formData.state,
          country: 'India',
          pinCode: formData.pinCode,
        },
        industry: formData.industry,
        employeeCount: Number(formData.employeeCount),
        customerType: formData.customerType,
        status: formData.status,
      };

      saasCommercialService.updateClient(updated);
      setClients([...saasCommercialService.getClients()]);
      setSelectedClient(updated);
      setIsAddModalOpen(false);
    } else {
      const newClient: CommercialClient = {
        id: `cli-${Date.now().toString().slice(-4)}`,
        clientCode: `CLI-2026-00${clients.length + 125}`,
        legalName: formData.legalName,
        tradeName: formData.tradeName || formData.legalName,
        logoUrl: formData.logoUrl,
        gstin: formData.gstin || 'Unregistered',
        pan: formData.pan || (formData.gstin.length >= 12 ? formData.gstin.slice(2, 12) : 'PANAP1234F'),
        contactPerson: formData.contactPerson,
        designation: formData.designation,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        billingAddress: {
          line1: formData.line1,
          city: formData.city,
          state: formData.state,
          country: 'India',
          pinCode: formData.pinCode,
        },
        industry: formData.industry,
        employeeCount: Number(formData.employeeCount),
        customerType: formData.customerType,
        status: formData.status,
        createdAt: new Date().toISOString().slice(0, 10),
      };

      saasCommercialService.addClient(newClient);
      setClients([...saasCommercialService.getClients()]);
      setIsAddModalOpen(false);
    }
  };

  const getClientQuotationsCount = (clientId: string) => {
    return quotations.filter((q) => q.clientId === clientId).length;
  };

  const getClientInvoicesCount = (clientId: string) => {
    return invoices.filter((i) => i.clientId === clientId).length;
  };

  return (
    <div className="space-y-6 pb-20 font-sans pt-1">
      {/* ── 1. Top Header & Actions ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">SaaS Clients & Enterprise CRM</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Unified Commercial Directory
            </span>
          </div>
          <p className="text-[13.5px] text-[#64748B] mt-1 max-w-3xl">
            Directory of enterprise customer accounts, statutory GSTIN profiles, contract scopes, and commercial relationships.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onNavigateTab) onNavigateTab('platform-quotations');
            }}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-slate-50"
          >
            <FileText className="h-4 w-4 text-[#64748B]" />
            Quotations
          </Button>

          <Button
            size="sm"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 bg-[#0F172B] text-white hover:bg-slate-800 border-none shadow-xs"
          >
            <Plus className="h-4 w-4 text-emerald-400" />
            + Add New Client
          </Button>
        </div>
      </div>

      {/* ── 2. Dynamic KPI Metrics Bar ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Accounts</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">{clientMetrics.total}</div>
          <p className="text-[11.5px] text-blue-600 font-medium mt-1">Enterprise & Mid-Market</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Subscribed</span>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{clientMetrics.active}</div>
          <p className="text-[11.5px] text-emerald-700 font-medium mt-1">
            {clientMetrics.total > 0 ? Math.round((clientMetrics.active / clientMetrics.total) * 100) : 0}% Active Conversion
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Managed Workforce</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {clientMetrics.totalEmployees.toLocaleString('en-IN')}
          </div>
          <p className="text-[11.5px] text-slate-500 mt-1">Subscribed Seats</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Commercial Billing</span>
          <div className="mt-2 text-2xl font-bold text-purple-700">{clientMetrics.totalBilledFormatted}</div>
          <p className="text-[11.5px] text-purple-600 font-medium mt-1">Total Invoiced Volume</p>
        </div>
      </div>

      {/* ── 3. Search & Filter Bar ──────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search client name, code, GSTIN, contact person, or email..."
            className="w-full pl-10 pr-4 py-2 text-[13.5px] rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-[13px] rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Lead">Lead</option>
            <option value="Churned">Churned</option>
          </select>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-2 text-[13px] rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Tiers</option>
            <option value="Enterprise">Enterprise</option>
            <option value="Mid-Market">Mid-Market</option>
            <option value="SMB">SMB</option>
          </select>
        </div>
      </div>

      {/* ── 4. Clients Table ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-3">Client Account</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap">Statutory ID</th>
                <th className="py-2.5 px-3">Primary Contact</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap">Industry & Tier</th>
                <th className="py-2.5 px-2.5 text-center whitespace-nowrap">Workforce</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Status</th>
                <th className="py-2.5 px-2.5 text-center whitespace-nowrap">Commercials</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No matching clients found</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Try clearing your search query or filters, or register a new client account.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const quotesCount = getClientQuotationsCount(client.id);
                  const invCount = getClientInvoicesCount(client.id);

                  return (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          {client.logoUrl ? (
                            <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                              <img src={client.logoUrl} alt={client.legalName} className="max-h-full max-w-full object-contain" />
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                              {client.legalName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-xs truncate max-w-[150px] lg:max-w-[180px] xl:max-w-[220px]" title={client.legalName}>
                              {client.legalName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[150px] lg:max-w-[180px] xl:max-w-[220px]">
                              {client.clientCode} • {client.tradeName || client.industry}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-2.5 whitespace-nowrap font-mono">
                        <div className="font-bold text-slate-800 text-[11px]">{client.gstin}</div>
                        <div className="text-[9.5px] text-slate-400">PAN: {client.pan}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800 text-xs truncate max-w-[120px] lg:max-w-[150px]">{client.contactPerson}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate max-w-[120px] lg:max-w-[150px]" title={client.email}>
                          <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <span className="font-medium text-slate-800 text-xs truncate max-w-[110px] block">{client.industry}</span>
                        <div className="text-[10px] text-emerald-700 font-semibold">{client.customerType}</div>
                      </td>

                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        <div className="font-bold text-slate-800 text-xs">
                          {client.employeeCount.toLocaleString('en-IN')} seats
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[100px] mx-auto">
                          {client.billingAddress.city}
                        </div>
                      </td>

                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        {client.status === 'Active' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            Active
                          </span>
                        ) : client.status === 'Lead' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Lead
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            {client.status}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        <div className="text-[10.5px] font-semibold text-slate-700">
                          {quotesCount}Q · {invCount}Inv
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedClient(client)}
                            className="text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded inline-flex items-center gap-1 transition"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </button>

                          <button
                            onClick={() => {
                              if (onNavigateTab) {
                                onNavigateTab('platform-quotations', { clientId: client.id });
                              }
                            }}
                            className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded shadow-xs inline-flex items-center gap-1 transition"
                          >
                            <FileText className="h-3 w-3" />
                            Quote
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. Client Detail Drawer ─────────────────────────────────────────── */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-200 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                {selectedClient.logoUrl ? (
                  <div className="h-12 w-16 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                    <img src={selectedClient.logoUrl} alt={selectedClient.legalName} className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
                    {selectedClient.legalName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-700 font-mono">
                    {selectedClient.clientCode}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-0.5">{selectedClient.legalName}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-6 text-xs">
              {/* Account Highlights */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">GSTIN</span>
                  <div className="font-mono font-bold text-slate-900 mt-1">{selectedClient.gstin}</div>
                  <div className="text-[10.5px] text-slate-500 font-mono mt-0.5">PAN: {selectedClient.pan}</div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Customer Tier</span>
                  <div className="font-bold text-emerald-800 mt-1">{selectedClient.customerType}</div>
                  <div className="text-[10.5px] text-slate-600 mt-0.5">{selectedClient.industry}</div>
                </div>
              </div>

              {/* Primary Contact */}
              <div className="border border-slate-200 p-4 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block">
                  Primary Commercial Contact
                </span>
                <div className="font-bold text-slate-900 text-sm">{selectedClient.contactPerson}</div>
                <div className="text-slate-600">{selectedClient.designation}</div>
                <div className="flex items-center gap-2 text-slate-600 mt-2">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>{selectedClient.email}</span>
                </div>
                {selectedClient.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{selectedClient.phone}</span>
                  </div>
                )}
              </div>

              {/* Billing Address */}
              <div className="border border-slate-200 p-4 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block">
                  Official Billing Address
                </span>
                <div className="text-slate-700 leading-relaxed">
                  {selectedClient.billingAddress.line1}
                  <br />
                  {selectedClient.billingAddress.city}, {selectedClient.billingAddress.state} — {selectedClient.billingAddress.pinCode}
                  <br />
                  {selectedClient.billingAddress.country}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedClient(null);
                    if (onNavigateTab) {
                      onNavigateTab('platform-quotations', { clientId: selectedClient.id });
                    }
                  }}
                  className="flex items-center gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                >
                  <FileText className="h-4 w-4" />
                  Create Quotation for Client
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedClient(null);
                    if (onNavigateTab) {
                      onNavigateTab('platform-invoices');
                    }
                  }}
                  className="bg-[#0F172B] text-white hover:bg-slate-800"
                >
                  View Invoices
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Add Client Modal ─────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Add New Enterprise Client</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="mt-4 space-y-4 text-xs">
              {/* Company Logo Upload & Compression */}
              <CompanyLogoUpload
                value={formData.logoUrl}
                onChange={(url) => setFormData({ ...formData, logoUrl: url })}
                companyName={formData.tradeName || formData.legalName}
                label="Company Brand Logo (Auto-Compressed for Quotations & Proposals)"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Company Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    placeholder="e.g. Acme Industries Ltd"
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Trade Name / Brand</label>
                  <input
                    type="text"
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                    placeholder="e.g. Acme Tech"
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    placeholder="33AABCA4589E1Z2"
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Industry</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="Manufacturing / IT / Logistics"
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Full Name"
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@company.com"
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98401 23456"
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Customer Tier</label>
                  <select
                    value={formData.customerType}
                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white"
                  >
                    <option value="Enterprise">Enterprise</option>
                    <option value="Mid-Market">Mid-Market</option>
                    <option value="SMB">SMB</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Workforce Seats</label>
                  <input
                    type="number"
                    value={formData.employeeCount}
                    onChange={(e) => setFormData({ ...formData, employeeCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Initial Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Lead">Lead</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Billing Street Address</label>
                <input
                  type="text"
                  value={formData.line1}
                  onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                  placeholder="Plot / Street / Area"
                  className="w-full px-3 py-2 border rounded-lg border-slate-300"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={formData.pinCode}
                    onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save Client Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
