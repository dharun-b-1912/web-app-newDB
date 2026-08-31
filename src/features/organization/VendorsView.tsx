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
  Send,
  Stamp,
  CheckCircle,
  XCircle,
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
import {
  VendorDocumentRequest,
  PrincipalEmployerFormV,
  VendorEmployee,
  VendorOrganization,
} from '../../types/vendorPortal';
import { vendorService } from '../../services/vendorService';
import { vendorPortalService } from '../../services/vendorPortalService';
import { hrEventBus } from '../../services/hrEventBus';
import { useToast } from '../../components/ui/Toast';
import { VendorCreateWizardModal } from './wizard/VendorCreateWizardModal';
import { RequestVendorDocumentModal } from '../vendor/components/RequestVendorDocumentModal';
import { IssueFormVModal } from '../vendor/components/IssueFormVModal';

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

  // Compliance & Requisitions State
  const [docRequests, setDocRequests] = useState<VendorDocumentRequest[]>([]);
  const [formVCertificates, setFormVCertificates] = useState<PrincipalEmployerFormV[]>([]);
  const [contractWorkers, setContractWorkers] = useState<VendorEmployee[]>([]);

  // Modals
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [isRequestDocModalOpen, setIsRequestDocModalOpen] = useState(false);
  const [isIssueFormVModalOpen, setIsIssueFormVModalOpen] = useState(false);
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

    // Load Vendor Portal Requisitions & Form V Certs
    const reqs = vendorPortalService.getDocumentRequests(vendor.id);
    const formVs = vendorPortalService.getPrincipalEmployerFormVs(vendor.id);
    const emps = vendorPortalService.getEmployees(vendor.id);
    setDocRequests(reqs);
    setFormVCertificates(formVs);
    setContractWorkers(emps);

    setIsDrawerOpen(true);
  };

  const handleEndDeployment = async (assignmentId: string) => {
    if (window.confirm('Are you sure you want to end this contractor deployment?')) {
      try {
        await vendorService.endEmployeeDeployment(assignmentId);
        showToast('Workforce deployment ended successfully', 'success');
        if (selectedVendor) handleOpenVendorDetails(selectedVendor);
      } catch (err: any) {
        showToast(err.message || 'Failed to end deployment', 'error');
      }
    }
  };

  const handleApproveContractWorker = (workerId: string) => {
    vendorPortalService.updateVendorEmployeeStatus(
      workerId,
      'ACTIVE',
      'Approved by Principal Employer HR. Biometric & Site Pass active.'
    );
    showToast('Contract worker approved! Gate pass & site access issued.', 'success');
    if (selectedVendor) {
      setContractWorkers(vendorPortalService.getEmployees(selectedVendor.id));
    }
  };

  const handleRejectContractWorker = (workerId: string) => {
    vendorPortalService.updateVendorEmployeeStatus(
      workerId,
      'REJECTED',
      'Rejected by Principal Employer HR due to missing verification.'
    );
    showToast('Contract worker deployment rejected.', 'info');
    if (selectedVendor) {
      setContractWorkers(vendorPortalService.getEmployees(selectedVendor.id));
    }
  };

  const handleVerifyDocumentRequest = (reqId: string) => {
    vendorPortalService.updateDocumentRequestStatus(
      reqId,
      'VERIFIED',
      'Verified by Principal Employer Compliance Officer.',
      'Senthil Nathan (HR Head)'
    );
    showToast('Document marked as Verified & Compliant!', 'success');
    if (selectedVendor) {
      setDocRequests(vendorPortalService.getDocumentRequests(selectedVendor.id));
    }
  };

  const handleRejectDocumentRequest = (reqId: string) => {
    const reason = prompt('Please enter rejection remarks for the vendor:');
    if (reason) {
      vendorPortalService.updateDocumentRequestStatus(
        reqId,
        'REJECTED',
        reason,
        'Senthil Nathan (HR Head)'
      );
      showToast('Document request marked as Rejected.', 'warning');
      if (selectedVendor) {
        setDocRequests(vendorPortalService.getDocumentRequests(selectedVendor.id));
      }
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
      showToast('Returned payment recorded. Investigation logged.', 'success');
      setIsReturnPaymentModalOpen(false);
      setSelectedPaymentToReturn(null);
      setReturnNotes('');
      if (selectedVendor) handleOpenVendorDetails(selectedVendor);
    } catch (err: any) {
      showToast(err.message || 'Failed to record returned payment', 'error');
    }
  };

  const handleResolveReturnedPayment = async (paymentId: string) => {
    try {
      await vendorService.resolveReturnedPayment(paymentId, 'Account verified and re-disbursed via RTGS.');
      showToast('Returned payment resolved and marked as PAID', 'success');
      if (selectedVendor) handleOpenVendorDetails(selectedVendor);
    } catch (err: any) {
      showToast(err.message || 'Failed to resolve payment', 'error');
    }
  };

  // Filter Logic
  const filteredVendors = vendors.filter((v) => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        v.legal_name.toLowerCase().includes(q) ||
        v.vendor_code.toLowerCase().includes(q) ||
        v.primary_contact_name.toLowerCase().includes(q) ||
        v.primary_contact_email.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (typeFilter !== 'ALL' && v.vendor_type !== typeFilter) return false;
    if (statusFilter !== 'ALL' && v.status !== statusFilter) return false;
    if (cityFilter !== 'ALL' && v.city !== cityFilter) return false;

    // Segment filtering
    if (activeSegment === 'ACTIVE_VENDORS' && v.status !== 'ACTIVE') return false;
    if (activeSegment === 'MANPOWER_PROVIDERS' && v.vendor_type !== 'MANPOWER_PROVIDER') return false;
    if (activeSegment === 'ACTIVE_WORKFORCE' && (!v.deployed_workforce_count || v.deployed_workforce_count === 0)) return false;
    if (activeSegment === 'COMPLIANCE_PENDING' && (!v.compliance_issues_count || v.compliance_issues_count === 0)) return false;
    if (activeSegment === 'PAYMENT_ISSUES' && (!v.payment_issues_count || v.payment_issues_count === 0)) return false;

    return true;
  });

  // Calculate Aggregates
  const totalVendors = vendors.length;
  const activeVendorsCount = vendors.filter((v) => v.status === 'ACTIVE').length;
  const manpowerCount = vendors.filter((v) => v.vendor_type === 'MANPOWER_PROVIDER').length;
  const totalWorkforce = vendors.reduce((sum, v) => sum + (v.deployed_workforce_count || 0), 0);
  const complianceIssuesCount = vendors.filter((v) => (v.compliance_issues_count || 0) > 0).length;
  const paymentIssuesCount = vendors.filter((v) => (v.payment_issues_count || 0) > 0).length;

  const handleSaveCurrentView = async () => {
    if (!newViewName.trim()) {
      showToast('Please enter a view name', 'error');
      return;
    }
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

  // Convert selectedVendor to VendorOrganization for modals
  const selectedVendorOrg: VendorOrganization = selectedVendor
    ? {
        id: selectedVendor.id,
        tenant_id: selectedVendor.tenant_id,
        name: selectedVendor.legal_name,
        trade_name: selectedVendor.trade_name || selectedVendor.legal_name,
        code: selectedVendor.vendor_code,
        vendor_type: 'MANPOWER_STAFFING',
        company_type: 'Pvt Ltd',
        registration_number: selectedVendor.tax_id || 'U74999TN2020PTC135892',
        contact_person: selectedVendor.primary_contact_name,
        email: selectedVendor.primary_contact_email,
        phone: selectedVendor.primary_contact_phone,
        gstin: selectedVendor.tax_id || '33AAACA1234F1Z8',
        pan: 'AAACA1234F',
        address: `${selectedVendor.address_line1 || ''}, ${selectedVendor.city || ''}`,
        city: selectedVendor.city,
        state: selectedVendor.state,
        postal_code: selectedVendor.postal_code || '641001',
        status: selectedVendor.status as any,
        service_charge_percentage: 8.5,
        is_gst_applicable: true,
        bank_name: 'HDFC Bank',
        account_number: '50200088192841',
        ifsc_code: 'HDFC0001234',
        created_at: selectedVendor.created_at,
        updated_at: selectedVendor.updated_at,
      }
    : vendorPortalService.getActiveVendor();

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumb items={[{ label: 'Company Admin' }, { label: 'Vendors & Contractor Governance' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Vendor & Contractor Governance Suite
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Principal Employer command center for manpower providers, document requisitions, CLRA Form V certificates, worker approvals, and 3-way match.
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
            className="font-bold shadow-sm bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            Add / Onboard Vendor
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
                    <Badge variant={vendor.status === 'ACTIVE' ? 'emerald' : 'amber'}>
                      {vendor.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenVendorDetails(vendor)}
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                      className="text-xs font-bold"
                    >
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredVendors.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center text-gray-400 space-y-2">
                    <Building2 className="w-8 h-8 text-gray-300" />
                    <p className="text-sm font-semibold">No vendors match your search filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Comprehensive Vendor Detail Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedVendor?.legal_name || 'Vendor Profile'}
        size="lg"
      >
        {selectedVendor && (
          <div className="space-y-5">
            {/* Vendor Hero Card with Quick Actions */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black">{selectedVendor.legal_name}</h3>
                  <p className="text-xs text-indigo-200">
                    {selectedVendor.vendor_type} · {selectedVendor.city}, {selectedVendor.state}
                  </p>
                </div>
                <Badge variant="emerald" className="bg-emerald-400 text-emerald-950 font-black w-fit">
                  {selectedVendor.status}
                </Badge>
              </div>

              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-[11px] text-indigo-200 font-mono">
                  <span>CODE: {selectedVendor.vendor_code}</span>
                  <span>•</span>
                  <span>GST: {selectedVendor.tax_id || '33AABCW1234F1Z5'}</span>
                  <span>•</span>
                  <span>Capacity: {selectedVendor.max_workforce_capacity || 100}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setIsRequestDocModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs"
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                  >
                    Request Document
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsIssueFormVModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs"
                    leftIcon={<Stamp className="w-3.5 h-3.5" />}
                  >
                    Issue Form V
                  </Button>
                </div>
              </div>
            </div>

            {/* Dedicated Tabs */}
            <Tabs
              tabs={[
                { id: 'overview', label: 'Overview', icon: <Building2 className="w-4 h-4" /> },
                { id: 'workforce', label: `Workforce (${vendorWorkforce.length + contractWorkers.length})`, icon: <Users className="w-4 h-4" /> },
                { id: 'doc-requisitions', label: `Requisitions (${docRequests.length})`, icon: <Send className="w-4 h-4" /> },
                { id: 'form-v', label: `Form V (${formVCertificates.length})`, icon: <Stamp className="w-4 h-4" /> },
                { id: 'contracts', label: `Contracts (${vendorContracts.length})`, icon: <Briefcase className="w-4 h-4" /> },
                { id: 'compliance', label: 'Compliance & Licenses', icon: <ShieldCheck className="w-4 h-4" /> },
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

            {/* Tab 2: Workforce Governance */}
            {activeDrawerTab === 'workforce' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Contractor Workers & Site Passes ({contractWorkers.length + vendorWorkforce.length})
                  </h4>
                </div>

                {/* Portal Registered Workers with Approval Actions */}
                {contractWorkers.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block">
                      Contractor Portal Submissions
                    </span>
                    {contractWorkers.map((emp) => {
                      const isPending = emp.status === 'PENDING_COMPANY_APPROVAL';
                      return (
                        <div
                          key={emp.id}
                          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                            isPending ? 'border-amber-200 bg-amber-50/40' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">{emp.display_name}</span>
                              <span className="font-mono text-[11px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.2 rounded">
                                {emp.employee_code}
                              </span>
                              <Badge variant={emp.status === 'ACTIVE' ? 'emerald' : 'amber'} size="sm">
                                {emp.status.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 mt-1">
                              <span>Designation: <strong className="text-gray-700">{emp.designation}</strong></span>
                              <span>•</span>
                              <span>Category: <strong className="text-gray-700">{emp.worker_category}</strong></span>
                              <span>•</span>
                              <span>UAN: <strong className="text-gray-700 font-mono">{emp.uan}</strong></span>
                              <span>•</span>
                              <span>ESIC: <strong className="text-gray-700 font-mono">{emp.esic_number}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isPending ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveContractWorker(emp.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                                  leftIcon={<Check className="w-3.5 h-3.5" />}
                                >
                                  Approve & Issue Gate Pass
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectContractWorker(emp.id)}
                                  className="text-xs text-rose-600 hover:bg-rose-50"
                                >
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Gate Pass Active
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Canonical Deployed Workforce */}
                {vendorWorkforce.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                      Canonical Employee Deployments
                    </span>
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
                )}

                {contractWorkers.length === 0 && vendorWorkforce.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-400">
                    No active employees currently deployed under this vendor.
                  </div>
                )}
              </div>
            )}

            {/* Tab: Document Requisitions */}
            {activeDrawerTab === 'doc-requisitions' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Statutory Document Requisitions ({docRequests.length})
                  </h4>
                  <Button
                    size="sm"
                    onClick={() => setIsRequestDocModalOpen(true)}
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                  >
                    + Request Document
                  </Button>
                </div>

                {docRequests.length > 0 ? (
                  <div className="space-y-2.5">
                    {docRequests.map((req) => {
                      const isRequested = req.status === 'REQUESTED';
                      const isSubmitted = req.status === 'SUBMITTED';
                      const isVerified = req.status === 'VERIFIED';
                      return (
                        <div
                          key={req.id}
                          className="p-4 rounded-xl border border-gray-200 bg-white space-y-2 text-xs shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">{req.document_type}</span>
                              <Badge
                                variant={
                                  isVerified ? 'emerald' : isSubmitted ? 'info' : req.priority === 'CRITICAL' ? 'rose' : 'amber'
                                }
                                size="sm"
                              >
                                {req.status}
                              </Badge>
                            </div>
                            <span className="text-[11px] text-gray-500 font-medium">
                              Due: <strong className="text-gray-800">{req.due_date}</strong>
                            </span>
                          </div>

                          <p className="text-gray-600 text-[11px] leading-relaxed">
                            {req.description}
                          </p>

                          {req.submitted_file_name && (
                            <div className="p-2 bg-indigo-50/70 border border-indigo-200/60 rounded-lg flex items-center justify-between text-[11px]">
                              <span className="font-mono text-indigo-900 font-semibold flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                {req.submitted_file_name}
                              </span>
                              <span className="text-gray-500">Uploaded {req.submitted_at?.split('T')[0]}</span>
                            </div>
                          )}

                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                            <span className="text-gray-400">Requested by: {req.requested_by_name}</span>
                            <div className="flex items-center gap-2">
                              {isSubmitted && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleVerifyDocumentRequest(req.id)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                                    leftIcon={<Check className="w-3.5 h-3.5" />}
                                  >
                                    Verify & Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRejectDocumentRequest(req.id)}
                                    className="text-xs text-rose-600 hover:bg-rose-50"
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              {isVerified && (
                                <span className="text-emerald-700 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified & Compliant
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-400">
                    No document requisitions currently open for this vendor.
                  </div>
                )}
              </div>
            )}

            {/* Tab: Form V Certificates */}
            {activeDrawerTab === 'form-v' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Principal Employer Form V Certificates ({formVCertificates.length})
                  </h4>
                  <Button
                    size="sm"
                    onClick={() => setIsIssueFormVModalOpen(true)}
                    leftIcon={<Stamp className="w-3.5 h-3.5" />}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                  >
                    + Issue Form V
                  </Button>
                </div>

                {formVCertificates.length > 0 ? (
                  <div className="space-y-3">
                    {formVCertificates.map((fv) => (
                      <div
                        key={fv.id}
                        className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-2.5 text-xs shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-emerald-950 text-sm">
                            {fv.certificate_number}
                          </span>
                          <Badge variant="emerald">{fv.status}</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-700 pt-1 border-t border-emerald-100">
                          <div>
                            <span className="text-gray-400 block">Nature of Work</span>
                            <span className="font-semibold text-gray-900">{fv.nature_of_work}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block">Max Approved Strength</span>
                            <span className="font-bold text-emerald-800 font-mono">{fv.max_contract_labour_capacity} Workers</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block">Engagement Period</span>
                            <span className="font-semibold text-gray-900">{fv.duration_from} to {fv.duration_to}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block">Site Location</span>
                            <span className="font-semibold text-gray-900">{fv.site_location}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-emerald-100 flex items-center justify-between text-[10px] text-gray-500">
                          <span>Issued by: <strong>{fv.issued_by_name}</strong> ({fv.issued_by_designation})</span>
                          <span>Dated: {fv.issue_date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-400">
                    No Form V certificates issued yet. Click "Issue Form V" above to generate.
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

            {/* Tab 5: Payments */}
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

      {/* Request Document Modal */}
      {selectedVendor && (
        <RequestVendorDocumentModal
          isOpen={isRequestDocModalOpen}
          onClose={() => setIsRequestDocModalOpen(false)}
          vendor={selectedVendorOrg}
          onSuccess={() => {
            setDocRequests(vendorPortalService.getDocumentRequests(selectedVendor.id));
          }}
        />
      )}

      {/* Issue Form V Modal */}
      {selectedVendor && (
        <IssueFormVModal
          isOpen={isIssueFormVModalOpen}
          onClose={() => setIsIssueFormVModalOpen(false)}
          vendor={selectedVendorOrg}
          onSuccess={() => {
            setFormVCertificates(vendorPortalService.getPrincipalEmployerFormVs(selectedVendor.id));
          }}
        />
      )}

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
