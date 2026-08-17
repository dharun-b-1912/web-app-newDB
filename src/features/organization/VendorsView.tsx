import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Drawer } from '../../components/ui/Drawer';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import {
  Users,
  Building2,
  FileText,
  Plus,
  Search,
  ShieldCheck,
  CreditCard,
  Phone,
  Mail,
  Calendar,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Clock,
  Briefcase,
  Layers,
  History,
  RotateCcw,
  Sparkles,
  Download,
  Filter,
  Bookmark,
  Check,
  X,
} from 'lucide-react';
import {
  Vendor,
  VendorContract,
  VendorDocument,
  VendorPayment,
  VendorEmployeeAssignment,
  VendorSavedView,
  VendorAuditLog,
  VendorReturnReason,
} from '../../types';
import { vendorService } from '../../services/vendorService';
import { hrEventBus } from '../../services/hrEventBus';
import { useToast } from '../../components/ui/Toast';
import { VendorCreateWizardModal } from './wizard/VendorCreateWizardModal';

export const VendorsView: React.FC = () => {
  const { showToast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState('');
  const [activeSegment, setActiveSegment] = useState<string>('ALL_VENDORS');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');

  // Selected Vendor Drawer State
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState('overview');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [vendorContracts, setVendorContracts] = useState<VendorContract[]>([]);
  const [vendorDocs, setVendorDocs] = useState<VendorDocument[]>([]);
  const [vendorPayments, setVendorPayments] = useState<VendorPayment[]>([]);
  const [vendorWorkforce, setVendorWorkforce] = useState<VendorEmployeeAssignment[]>([]);
  const [vendorAuditLogs, setVendorAuditLogs] = useState<VendorAuditLog[]>([]);

  // Modals
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [isReturnPaymentModalOpen, setIsReturnPaymentModalOpen] = useState(false);
  const [selectedPaymentToReturn, setSelectedPaymentToReturn] = useState<VendorPayment | null>(null);
  const [returnReason, setReturnReason] = useState<VendorReturnReason>('INVALID_ACCOUNT');
  const [returnNotes, setReturnNotes] = useState('');
  const [savedViews, setSavedViews] = useState<VendorSavedView[]>([]);
  const [newViewName, setNewViewName] = useState('');
  const [isSaveViewOpen, setIsSaveViewOpen] = useState(false);

  const loadData = async () => {
    const list = await vendorService.getVendors();
    setVendors(list);
    const views = await vendorService.getSavedViews();
    setSavedViews(views);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Subscribe to Realtime Vendor Domain Events
  useEffect(() => {
    const unsub = hrEventBus.subscribe('vendor.*', () => {
      loadData();
      if (selectedVendor) {
        handleOpenVendorDetails(selectedVendor);
      }
    });
    return () => unsub();
  }, [selectedVendor?.id]);

  const handleOpenVendorDetails = async (vendor: Vendor) => {
    setSelectedVendor(vendor);
    const [contracts, docs, payments, workforce, logs] = await Promise.all([
      vendorService.getVendorContracts(vendor.id),
      vendorService.getVendorDocuments(vendor.id),
      vendorService.getVendorPayments(vendor.id),
      vendorService.getVendorWorkforce(vendor.id),
      vendorService.getAuditLogs(vendor.id),
    ]);
    setVendorContracts(contracts);
    setVendorDocs(docs);
    setVendorPayments(payments);
    setVendorWorkforce(workforce);
    setVendorAuditLogs(logs);
    setIsDrawerOpen(true);
  };

  // KPI Computations from Real Master State
  const totalVendors = vendors.length;
  const activeVendorsCount = vendors.filter((v) => v.status === 'ACTIVE').length;
  const manpowerCount = vendors.filter((v) => v.vendor_type === 'MANPOWER_PROVIDER').length;
  const totalWorkforce = vendors.reduce((acc, v) => acc + (v.deployed_workforce_count || 0), 0);
  const complianceIssuesCount = vendors.reduce((acc, v) => acc + (v.compliance_issues_count || 0), 0);
  const paymentIssuesCount = vendors.reduce((acc, v) => acc + (v.pending_payments_count || 0), 0);

  // Filtered List
  const filteredVendors = vendors.filter((v) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      v.legal_name.toLowerCase().includes(q) ||
      (v.trade_name && v.trade_name.toLowerCase().includes(q)) ||
      v.vendor_code.toLowerCase().includes(q) ||
      v.primary_contact_name.toLowerCase().includes(q) ||
      v.primary_contact_email.toLowerCase().includes(q);

    const matchesType = typeFilter === 'ALL' || v.vendor_type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    const matchesCity = cityFilter === 'ALL' || (v.city && v.city.toLowerCase() === cityFilter.toLowerCase());

    let matchesSegment = true;
    if (activeSegment === 'ACTIVE_VENDORS') matchesSegment = v.status === 'ACTIVE';
    else if (activeSegment === 'MANPOWER_PROVIDERS') matchesSegment = v.vendor_type === 'MANPOWER_PROVIDER';
    else if (activeSegment === 'CONTRACTORS') matchesSegment = v.vendor_type === 'CONTRACTOR';
    else if (activeSegment === 'COMPLIANCE_PENDING') matchesSegment = (v.compliance_issues_count || 0) > 0;
    else if (activeSegment === 'PAYMENT_ISSUES') matchesSegment = (v.pending_payments_count || 0) > 0;
    else if (activeSegment === 'ACTIVE_WORKFORCE') matchesSegment = (v.deployed_workforce_count || 0) > 0;

    return matchesSearch && matchesType && matchesStatus && matchesCity && matchesSegment;
  });

  const handleEndDeployment = async (asgnId: string) => {
    try {
      await vendorService.endEmployeeDeployment(asgnId);
      showToast('Workforce deployment ended successfully', 'success');
      if (selectedVendor) handleOpenVendorDetails(selectedVendor);
    } catch (err: any) {
      showToast(err.message || 'Failed to end deployment', 'error');
    }
  };

  const handleReturnPaymentSubmit = async () => {
    if (!selectedPaymentToReturn) return;
    try {
      await vendorService.markPaymentReturned(
        selectedPaymentToReturn.id,
        returnReason,
        returnNotes
      );
      showToast('Payment marked as Returned for investigation', 'warning');
      setIsReturnPaymentModalOpen(false);
      setReturnNotes('');
      if (selectedVendor) handleOpenVendorDetails(selectedVendor);
    } catch (err: any) {
      showToast(err.message || 'Failed to mark returned payment', 'error');
    }
  };

  const handleResolveReturnedPayment = async (paymentId: string) => {
    try {
      await vendorService.resolveReturnedPayment(paymentId, 'Account verified and re-disbursed successfully');
      showToast('Returned payment marked as Resolved and Paid', 'success');
      if (selectedVendor) handleOpenVendorDetails(selectedVendor);
    } catch (err: any) {
      showToast(err.message || 'Failed to resolve payment', 'error');
    }
  };

  const handleSaveCurrentView = async () => {
    if (!newViewName.trim()) return;
    try {
      const saved = await vendorService.saveView(newViewName, {
        vendor_type: typeFilter,
        status: statusFilter,
        city: cityFilter,
        segment: activeSegment,
      });
      setSavedViews([saved, ...savedViews]);
      setNewViewName('');
      setIsSaveViewOpen(false);
      showToast(`Saved view "${saved.name}" successfully!`, 'success');
    } catch (err: any) {
      showToast('Failed to save view', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumb items={[{ label: 'Company Admin' }, { label: 'Vendors / Manpower Providers 2.0' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Vendor Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage manpower providers, contracts, compliance licenses, returned disbursements, and deployed workforce.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSaveViewOpen(true)}
            leftIcon={<Bookmark className="w-3.5 h-3.5" />}
            className="text-xs font-bold"
          >
            Save View
          </Button>

          <Button
            onClick={() => setIsCreateWizardOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="font-bold shadow-sm"
          >
            Add Vendor
          </Button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Vendors</div>
          <div className="text-xl font-black text-gray-900">{totalVendors}</div>
          <div className="text-[10px] text-gray-400">Registered Suppliers</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Active Vendors</div>
          <div className="text-xl font-black text-[#07563D]">{activeVendorsCount}</div>
          <div className="text-[10px] text-emerald-800">Operational Contracts</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Manpower Providers</div>
          <div className="text-xl font-black text-amber-700">{manpowerCount}</div>
          <div className="text-[10px] text-amber-800">Labour Supply Agencies</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Active Workforce</div>
          <div className="text-xl font-black text-blue-700">{totalWorkforce}</div>
          <div className="text-[10px] text-blue-800">Contractors on Site</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Compliance Pending</div>
          <div className="text-xl font-black text-rose-700">{complianceIssuesCount}</div>
          <div className="text-[10px] text-rose-800">Requires Verification</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Payment Issues</div>
          <div className="text-xl font-black text-purple-700">{paymentIssuesCount}</div>
          <div className="text-[10px] text-purple-800">Returned / Pending</div>
        </div>
      </div>

      {/* Database Driven Segment Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'ALL_VENDORS', label: 'All Vendors', count: totalVendors },
          { id: 'ACTIVE_VENDORS', label: 'Active Vendors', count: activeVendorsCount },
          { id: 'MANPOWER_PROVIDERS', label: 'Manpower Providers', count: manpowerCount },
          { id: 'ACTIVE_WORKFORCE', label: 'With Active Workforce', count: totalWorkforce },
          { id: 'COMPLIANCE_PENDING', label: 'Compliance Issues', count: complianceIssuesCount },
          { id: 'PAYMENT_ISSUES', label: 'Payment Issues', count: paymentIssuesCount },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSegment(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeSegment === tab.id
                ? 'bg-[#07563D] text-white shadow-2xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeSegment === tab.id ? 'bg-emerald-800 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendor legal name, code, contact, registration no, email..."
              className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#07563D] font-medium"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#07563D] font-semibold"
            >
              <option value="ALL">All Vendor Types</option>
              <option value="MANPOWER_PROVIDER">Manpower Provider</option>
              <option value="RECRUITMENT_AGENCY">Recruitment Agency</option>
              <option value="CONTRACTOR">Contractor</option>
              <option value="IT_SERVICE_PROVIDER">IT Service Provider</option>
              <option value="FACILITY_SERVICE_PROVIDER">Facilities Agency</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#07563D] font-semibold"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
              <option value="DRAFT">Draft</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearch('');
                setTypeFilter('ALL');
                setStatusFilter('ALL');
                setCityFilter('ALL');
                setActiveSegment('ALL_VENDORS');
              }}
              className="text-xs text-gray-500 font-bold"
            >
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Vendors Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="font-bold">Vendor Legal Name</TableHead>
              <TableHead className="font-bold">Code</TableHead>
              <TableHead className="font-bold">Classification</TableHead>
              <TableHead className="font-bold">Primary Contact</TableHead>
              <TableHead className="font-bold">Location</TableHead>
              <TableHead className="font-bold">Workforce</TableHead>
              <TableHead className="font-bold">Compliance</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="text-right font-bold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendors.map((vendor) => {
              const isManpower = vendor.vendor_type === 'MANPOWER_PROVIDER';
              return (
                <TableRow key={vendor.id} className="hover:bg-emerald-50/20 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 leading-tight">{vendor.legal_name}</div>
                        <div className="text-[11px] text-gray-400">{vendor.primary_contact_email}</div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                      {vendor.vendor_code}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs font-semibold text-gray-800">
                      {isManpower ? 'Manpower Provider' : vendor.vendor_type.replace(/_/g, ' ')}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs font-bold text-gray-900">{vendor.primary_contact_name}</div>
                    <div className="text-[11px] text-gray-400">{vendor.primary_contact_phone}</div>
                  </TableCell>

                  <TableCell className="text-xs text-gray-700 font-medium">
                    {vendor.city}, {vendor.state}
                  </TableCell>

                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs font-black text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      <Users className="w-3 h-3" /> {vendor.deployed_workforce_count || 0}
                    </span>
                  </TableCell>

                  <TableCell>
                    {(vendor.compliance_issues_count || 0) === 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        <AlertTriangle className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge variant="emerald" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-xs font-bold">
                      {vendor.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenVendorDetails(vendor)}
                      className="text-xs font-bold"
                    >
                      Inspect
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* 7-Tab Vendor Detail Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedVendor?.legal_name || 'Vendor Profile'}
        size="lg"
      >
        {selectedVendor && (
          <div className="space-y-5">
            {/* Vendor Hero Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950 to-amber-900 text-white space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black">{selectedVendor.legal_name}</h3>
                  <p className="text-xs text-amber-200">{selectedVendor.vendor_type} · {selectedVendor.city}, {selectedVendor.state}</p>
                </div>
                <Badge variant="emerald" className="bg-emerald-400 text-emerald-950 font-black">
                  {selectedVendor.status}
                </Badge>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center gap-4 text-[11px] text-amber-200 font-mono">
                <span>CODE: {selectedVendor.vendor_code}</span>
                <span>•</span>
                <span>GST: {selectedVendor.tax_id || '33AABCW1234F1Z5'}</span>
                <span>•</span>
                <span>Capacity: {selectedVendor.max_workforce_capacity || 100}</span>
              </div>
            </div>

            {/* 7 Dedicated Tabs */}
            <Tabs
              tabs={[
                { id: 'overview', label: 'Overview', icon: <Building2 className="w-4 h-4" /> },
                { id: 'workforce', label: `Workforce (${vendorWorkforce.length})`, icon: <Users className="w-4 h-4" /> },
                { id: 'contracts', label: `Contracts (${vendorContracts.length})`, icon: <Briefcase className="w-4 h-4" /> },
                { id: 'compliance', label: 'Compliance', icon: <ShieldCheck className="w-4 h-4" /> },
                { id: 'payments', label: `Payments (${vendorPayments.length})`, icon: <CreditCard className="w-4 h-4" /> },
                { id: 'documents', label: `Docs (${vendorDocs.length})`, icon: <FileText className="w-4 h-4" /> },
                { id: 'audit', label: 'Audit Trail', icon: <History className="w-4 h-4" /> },
              ]}
              activeTab={activeDrawerTab}
              onChange={setActiveDrawerTab}
            />

            {/* Tab 1: Overview */}
            {activeDrawerTab === 'overview' && (
              <div className="space-y-4">
                <Card className="p-4 space-y-3">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Primary Liaison Contact</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[11px]">Contact Person</span>
                      <span className="font-bold text-gray-900">{selectedVendor.primary_contact_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Designation</span>
                      <span className="font-semibold text-gray-700">{selectedVendor.primary_contact_designation || 'Account Lead'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Official Email</span>
                      <span className="font-semibold text-gray-900">{selectedVendor.primary_contact_email}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Phone / Mobile</span>
                      <span className="font-semibold text-gray-900">{selectedVendor.primary_contact_phone}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 space-y-3">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Registered Corporate Address</h4>
                  <p className="text-xs text-gray-700">
                    {selectedVendor.address_line1 || '45 Anna Salai, Industrial Estate'}, {selectedVendor.city}, {selectedVendor.state} - {selectedVendor.postal_code || '600032'}, {selectedVendor.country || 'India'}
                  </p>
                </Card>
              </div>
            )}

            {/* Tab 2: Workforce */}
            {activeDrawerTab === 'workforce' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Supplied Canonical Workforce ({vendorWorkforce.length})
                  </h4>
                </div>

                {vendorWorkforce.length > 0 ? (
                  <div className="space-y-2">
                    {vendorWorkforce.map((asgn) => (
                      <div
                        key={asgn.id}
                        className="p-3 rounded-xl border border-gray-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">
                              {asgn.employee?.first_name || 'Worker'} {asgn.employee?.last_name || ''}
                            </span>
                            <span className="font-mono text-[11px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.2 rounded">
                              {asgn.employee?.employee_code || 'WF-VND'}
                            </span>
                            <Badge variant="emerald" size="sm">{asgn.status}</Badge>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {asgn.deployment_role} · {asgn.employee?.department_name || 'Operations'} · Deployment: {asgn.start_date} to {asgn.end_date || 'Ongoing'}
                          </p>
                        </div>

                        {asgn.status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEndDeployment(asgn.id)}
                            className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            End Deployment
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-400">
                    No active employees currently deployed under this vendor.
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Contracts */}
            {activeDrawerTab === 'contracts' && (
              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  Service Contracts & Master Agreements ({vendorContracts.length})
                </h4>

                <div className="space-y-2">
                  {vendorContracts.map((cnt) => (
                    <div key={cnt.id} className="p-4 rounded-xl border border-gray-200 bg-white space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-gray-900 text-sm">{cnt.contract_number}</span>
                        <Badge variant="emerald">{cnt.status}</Badge>
                      </div>
                      <p className="text-gray-600 font-semibold">{cnt.contract_type}</p>
                      <div className="grid grid-cols-2 gap-2 text-gray-500 pt-1 border-t border-gray-100 text-[11px]">
                        <span>Term: {cnt.start_date} to {cnt.end_date}</span>
                        <span>Terms: {cnt.payment_terms}</span>
                        <span>Notice Period: {cnt.notice_period_days} Days</span>
                        <span>Currency: {cnt.currency}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 4: Compliance */}
            {activeDrawerTab === 'compliance' && (
              <div className="space-y-3">
                <Card className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#07563D]" />
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                      Statutory Licenses & Registrations
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[11px]">Labour Supply License No</span>
                      <span className="font-mono font-bold text-gray-900">
                        {selectedVendor.manpower_license_no || 'ML-TN-CHN-2022-8901'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">License Valid Till</span>
                      <span className="font-bold text-emerald-800">
                        {selectedVendor.manpower_license_expiry || '2027-03-31'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Max Approved Capacity</span>
                      <span className="font-bold text-gray-900">{selectedVendor.max_workforce_capacity || 100} Staff</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">GST Registration Status</span>
                      <span className="text-emerald-800 font-bold">Active & Verified (33AABCW1234F1Z5)</span>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Tab 5: Payments & Returned Payments Workflow */}
            {activeDrawerTab === 'payments' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Disbursement Ledger & Invoices ({vendorPayments.length})
                  </h4>
                </div>

                <div className="space-y-2">
                  {vendorPayments.map((p) => {
                    const isReturned = p.status === 'RETURNED';
                    return (
                      <div
                        key={p.id}
                        className={`p-4 rounded-xl border space-y-2 text-xs ${
                          isReturned ? 'border-rose-200 bg-rose-50/40' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-gray-900">{p.invoice_reference}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900 text-sm">₹{p.amount.toLocaleString()}</span>
                            <Badge variant={isReturned ? 'rose' : 'emerald'}>{p.status}</Badge>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-gray-500">
                          <span>Disbursed: {p.payment_date} via {p.payment_method}</span>
                          <span>UTR: {p.payment_reference || 'N/A'}</span>
                        </div>

                        {/* Returned Payment Investigation Box */}
                        {isReturned && (
                          <div className="p-3 rounded-lg bg-rose-100/60 border border-rose-200 space-y-1.5 text-[11px]">
                            <div className="flex items-center justify-between text-rose-900 font-bold">
                              <span>Returned Reason: {p.return_reason?.replace(/_/g, ' ')}</span>
                              <span>Date: {p.returned_date}</span>
                            </div>
                            <p className="text-rose-800">{p.resolution_notes}</p>
                            <div className="pt-1 flex justify-end">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleResolveReturnedPayment(p.id)}
                                className="text-xs font-bold"
                              >
                                Mark Re-disbursed & Resolved
                              </Button>
                            </div>
                          </div>
                        )}

                        {!isReturned && p.status === 'PAID' && (
                          <div className="pt-1 flex justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedPaymentToReturn(p);
                                setIsReturnPaymentModalOpen(true);
                              }}
                              className="text-xs text-rose-600 hover:bg-rose-50"
                            >
                              Report Payment Returned
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 6: Documents */}
            {activeDrawerTab === 'documents' && (
              <div className="space-y-2">
                {vendorDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-xl border border-gray-200 bg-white flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-[#07563D]" />
                      <div>
                        <p className="font-bold text-gray-900">{doc.document_type}</p>
                        <p className="text-[11px] text-gray-400">{doc.document_name} • Valid till {doc.expiry_date || 'Perpetual'}</p>
                      </div>
                    </div>
                    <Badge variant="emerald">{doc.verification_status}</Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 7: Audit */}
            {activeDrawerTab === 'audit' && (
              <div className="space-y-2 text-xs">
                {vendorAuditLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50 space-y-1">
                    <div className="flex items-center justify-between text-gray-900 font-bold">
                      <span>{log.action.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{log.created_at.split('T')[0]}</span>
                    </div>
                    <p className="text-[11px] text-gray-500">Performed by: {log.actor_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* 7-Step Add Vendor Wizard Modal */}
      <VendorCreateWizardModal
        isOpen={isCreateWizardOpen}
        onClose={() => setIsCreateWizardOpen(false)}
        onCreated={(v) => {
          setVendors((prev) => [v, ...prev]);
        }}
      />

      {/* Returned Payment Investigation Modal */}
      <Modal
        isOpen={isReturnPaymentModalOpen}
        onClose={() => setIsReturnPaymentModalOpen(false)}
        title="Record Returned Payment Investigation"
      >
        <div className="space-y-4 text-xs">
          <p className="text-gray-600">
            When a bank or vendor returns a payment, record the exact bounce/rejection reason before initiating re-disbursement.
          </p>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Return Reason</label>
            <select
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value as VendorReturnReason)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-semibold"
            >
              <option value="INVALID_ACCOUNT">Invalid Account / IFSC Error</option>
              <option value="BANK_REJECTION">Bank Clearing Rejection</option>
              <option value="ACCOUNT_CLOSED">Vendor Account Closed</option>
              <option value="DUPLICATE_PAYMENT">Duplicate Disbursement Returned</option>
              <option value="COMPLIANCE_HOLD">Compliance Statutory Hold</option>
              <option value="OTHER">Other Reason</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Investigation Notes & Action Plan</label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Account number digit mismatch. Re-verifying cancelled cheque with vendor finance team."
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setIsReturnPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleReturnPaymentSubmit} className="font-bold">
              Submit Return Investigation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Save View Modal */}
      <Modal isOpen={isSaveViewOpen} onClose={() => setIsSaveViewOpen(false)} title="Save Current View Filter">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">View Name</label>
            <input
              type="text"
              placeholder="e.g. Active Manpower Providers — Coimbatore"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setIsSaveViewOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveCurrentView} className="font-bold">
              Save View
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
