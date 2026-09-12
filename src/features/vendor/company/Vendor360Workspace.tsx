import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Building2,
  Users,
  Briefcase,
  ShieldCheck,
  FileText,
  CreditCard,
  History,
  Calendar,
  DollarSign,
  Layers,
  ExternalLink,
  Download,
  Eye,
  EyeOff,
  MoreHorizontal,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Stamp,
  Send,
  Scale,
  Search,
  Filter,
  X,
  Plus,
  RefreshCw,
  FileCheck,
  Building,
  Phone,
  Mail,
  MapPin,
  FileSpreadsheet,
  ArrowUpRight,
  UserCheck,
  Lock,
  Key,
  Trash2,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/Toast';
import { VendorEditModal } from '../components/VendorEditModal';
import { VendorDeleteModal } from '../components/VendorDeleteModal';
import { VendorCredentialsModal } from '../components/VendorCredentialsModal';
import { vendorService } from '../../../services/vendorService';
import { vendorCredentialService } from '../../../services/vendor/vendorCredentialService';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorThreeWayMatchEngine } from '../../../services/vendor/vendorThreeWayMatchEngine';
import type {
  Vendor,
  VendorContract,
  VendorDocument,
  VendorPayment,
} from '../../../types';
import type {
  VendorEmployee,
  WorkerDeployment,
  PrincipalEmployerFormV,
  StatutoryReturn,
  VendorLicense,
  VendorAuditLog,
  VendorUser,
  VendorUserRelationship,
  VendorCompanyRelationship,
} from '../../../types/vendorPortal';

export interface Vendor360WorkspaceProps {
  vendorId?: string;
  vendor?: Vendor | null;
  isOpen?: boolean;
  onClose?: () => void;
  onNavigateToTab?: (tabId: string) => void;
  initialTab?: string;
}

export type TabId =
  | 'overview'
  | 'workforce'
  | 'deployments'
  | 'contracts'
  | 'compliance'
  | 'documents'
  | 'attendance'
  | 'invoices'
  | 'settlement'
  | 'requisitions'
  | 'form-v'
  | 'audit'
  | 'access';

export const Vendor360Workspace: React.FC<Vendor360WorkspaceProps> = ({
  vendorId,
  vendor: initialVendor,
  isOpen = true,
  onClose,
  initialTab = 'overview',
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab as TabId);
  const [showPan, setShowPan] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isHeaderActionsOpen, setIsHeaderActionsOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const headerActionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as TabId);
    }
  }, [initialTab]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (headerActionsRef.current && !headerActionsRef.current.contains(e.target as Node)) {
        setIsHeaderActionsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMoreMenuOpen(false);
        setIsHeaderActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Active vendor state
  const targetVendorId = vendorId || initialVendor?.id || '';

  // Vendor Organization details
  const [vendorData, setVendorData] = useState<any>(() => {
    if (initialVendor) return initialVendor;
    const orgs = vendorPortalService.getVendors();
    const found = orgs.find((o) => o.id === targetVendorId || o.code === targetVendorId);
    return found || null;
  });

  // Modals & sub-state
  const [selectedWorker, setSelectedWorker] = useState<VendorEmployee | null>(null);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [isThreeWayMatchModalOpen, setIsThreeWayMatchModalOpen] = useState(false);
  const [isRequestDocModalOpen, setIsRequestDocModalOpen] = useState(false);
  const [isIssueFormVModalOpen, setIsIssueFormVModalOpen] = useState(false);
  const [isEditVendorModalOpen, setIsEditVendorModalOpen] = useState(false);
  const [isDeleteVendorModalOpen, setIsDeleteVendorModalOpen] = useState(false);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [docRequestType, setDocRequestType] = useState('Labour License Renewal');
  const [docRequestNotes, setDocRequestNotes] = useState('');

  // Vendor Users & Access state
  const [vendorUsers, setVendorUsers] = useState<VendorUser[]>(() => {
    return vendorCredentialService.getVendorUsers(targetVendorId);
  });
  const reloadVendorUsers = () => {
    setVendorUsers(vendorCredentialService.getVendorUsers(targetVendorId));
  };

  const [companyRelationships, setCompanyRelationships] = useState<VendorCompanyRelationship[]>(() => {
    return vendorPortalService.getVendorCompanyRelationships(targetVendorId) as any;
  });
  const reloadRelationships = () => {
    setCompanyRelationships(vendorPortalService.getVendorCompanyRelationships(targetVendorId) as any);
  };

  // Authority & Management Modals
  const [isAddRelationshipModalOpen, setIsAddRelationshipModalOpen] = useState(false);
  const [isInviteUserModalOpen, setIsInviteUserModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isManageScopeModalOpen, setIsManageScopeModalOpen] = useState(false);
  const [selectedUserForScope, setSelectedUserForScope] = useState<VendorUser | null>(null);

  // Form states
  const [newRelCompanyId, setNewRelCompanyId] = useState('comp-joy-cbe');
  const [newRelSiteName, setNewRelSiteName] = useState('JOY Coimbatore - Plant 2');
  const [newRelServiceCharge, setNewRelServiceCharge] = useState<number>(8.5);
  const [newRelPaymentTerms, setNewRelPaymentTerms] = useState('Net 30 Days');
  const [newRelRateCardType, setNewRelRateCardType] = useState<'MONTHLY_FIXED' | 'DAILY_RATE' | 'HOURLY'>('DAILY_RATE');
  const [newRelCapacity, setNewRelCapacity] = useState<number>(30);

  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<'VENDOR_ADMIN' | 'VENDOR_COORDINATOR' | 'VENDOR_FINANCE'>('VENDOR_ADMIN');
  const [inviteValidityHours, setInviteValidityHours] = useState<number>(48);
  const [inviteSelectedRelIds, setInviteSelectedRelIds] = useState<string[]>(['rel-stream-b-joy-che-01']);

  const [suspendReason, setSuspendReason] = useState('Statutory Non-Compliance / Expired License');
  const [suspendEffectiveDate, setSuspendEffectiveDate] = useState('2026-09-09');
  const [suspendNotes, setSuspendNotes] = useState('');

  const [archiveReason, setArchiveReason] = useState('Contract lifecycle concluded & audit completed');
  const [archiveConfirmed, setArchiveConfirmed] = useState(false);

  const [scopeSelectedRelIds, setScopeSelectedRelIds] = useState<string[]>([]);

  // Action handlers
  const handleAddRelationship = async () => {
    try {
      await vendorService.createCompanyRelationship({
        vendorId: targetVendorId,
        companyId: newRelCompanyId,
        companyName: newRelSiteName,
        siteLocation: newRelSiteName,
        serviceChargePercentage: Number(newRelServiceCharge),
        paymentTerms: newRelPaymentTerms,
        rateCardType: newRelRateCardType,
        maxWorkforceCapacity: Number(newRelCapacity),
      });
      reloadRelationships();
      setIsAddRelationshipModalOpen(false);
      showToast(`Company relationship created with ${newRelSiteName}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to create relationship', 'error');
    }
  };

  const handleInviteUser = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      showToast('Name and email are required', 'error');
      return;
    }
    try {
      const res = await vendorCredentialService.inviteVendorUser({
        vendorId: targetVendorId,
        fullName: inviteName,
        email: inviteEmail,
        phone: invitePhone,
        role: inviteRole,
        relationshipIds: inviteSelectedRelIds,
        validityHours: inviteValidityHours,
      });
      reloadVendorUsers();
      setIsInviteUserModalOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInvitePhone('');
      showToast(`Invitation created for ${res.user.full_name}. Secure token dispatched.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to invite user', 'error');
    }
  };

  const handleSuspendVendor = async () => {
    try {
      const updated = await vendorService.suspendVendor(targetVendorId, {
        reason: suspendReason,
        comments: suspendNotes,
        effectiveDate: suspendEffectiveDate,
        performedBy: 'Company Admin',
      });
      if (updated) {
        setVendorData((prev: any) => ({ ...prev, status: 'SUSPENDED', is_active: false }));
      }
      setIsSuspendModalOpen(false);
      showToast('Vendor organization suspended. Deployments & billing locked.', 'warning');
    } catch (err: any) {
      showToast(err.message || 'Failed to suspend vendor', 'error');
    }
  };

  const handleReactivateVendor = async () => {
    try {
      const updated = await vendorService.reactivateVendor(targetVendorId, {
        reason: 'Reactivated by Company Admin after compliance review',
        performedBy: 'Company Admin',
      });
      if (updated) {
        setVendorData((prev: any) => ({ ...prev, status: 'ACTIVE', is_active: true }));
      }
      setIsHeaderActionsOpen(false);
      showToast('Vendor organization reactivated successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to reactivate vendor', 'error');
    }
  };

  const handleArchiveVendor = async () => {
    if (!archiveConfirmed) {
      showToast('Please confirm understanding of the soft-delete archive action', 'error');
      return;
    }
    try {
      const updated = await vendorService.archiveVendor(targetVendorId, {
        reason: archiveReason,
        archivedBy: 'Company Admin',
      });
      if (updated) {
        setVendorData((prev: any) => ({ ...prev, status: 'ARCHIVED', is_active: false }));
      }
      setIsArchiveModalOpen(false);
      showToast('Vendor record archived (Soft Delete). Historical data permanently preserved.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to archive vendor', 'error');
    }
  };

  const handleResetAccess = async (email: string) => {
    try {
      await vendorCredentialService.requestPasswordReset(email);
      showToast(`Password reset link dispatched to ${email}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to reset access', 'error');
    }
  };

  const handleToggleUserStatus = async (userId: string, action: 'DISABLE' | 'REACTIVATE') => {
    try {
      if (action === 'DISABLE') {
        await vendorCredentialService.disableVendorUser(userId);
        showToast('Vendor user disabled. Portal session terminated.', 'info');
      } else {
        await vendorCredentialService.reactivateVendorUser(userId);
        showToast('Vendor user reactivated successfully.', 'success');
      }
      reloadVendorUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status', 'error');
    }
  };

  const handleOpenManageScope = (u: VendorUser) => {
    setSelectedUserForScope(u);
    const assigned = vendorCredentialService.getUserRelationships(u.id).map(r => r.vendor_relationship_id || r.relationship_id || '');
    setScopeSelectedRelIds(assigned);
    setIsManageScopeModalOpen(true);
  };

  const handleSaveScope = async () => {
    if (!selectedUserForScope) return;
    try {
      const uId = selectedUserForScope.id;
      const currentRels = vendorCredentialService.getUserRelationships(uId).map(r => r.vendor_relationship_id || r.relationship_id || '');
      for (const rId of currentRels) {
        if (!scopeSelectedRelIds.includes(rId)) {
          await vendorCredentialService.revokeRelationshipAccess(uId, rId);
        }
      }
      for (const rId of scopeSelectedRelIds) {
        if (!currentRels.includes(rId)) {
          await vendorCredentialService.assignRelationshipAccess(uId, rId, 'Company Admin');
        }
      }
      reloadVendorUsers();
      setIsManageScopeModalOpen(false);
      showToast('User relationship scope updated successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update user scope', 'error');
    }
  };

  // Workforce filtering
  const [workerSearch, setWorkerSearch] = useState('');
  const [workerShiftFilter, setWorkerShiftFilter] = useState('ALL');

  // Deployments filtering & action state
  const [deploymentSearch, setDeploymentSearch] = useState('');
  const [selectedDeployment, setSelectedDeployment] = useState<WorkerDeployment | null>(null);
  const [isEditDeploymentModalOpen, setIsEditDeploymentModalOpen] = useState(false);
  const [editSiteName, setEditSiteName] = useState('');
  const [editWageRate, setEditWageRate] = useState<number>(600);

  // Form V generation modal state
  const [formVContractLabourCount, setFormVContractLabourCount] = useState(50);
  const [formVSiteLocation, setFormVSiteLocation] = useState('Joy Chennai - Unit 1');

  // Data collections
  const workers: VendorEmployee[] = useMemo(() => {
    return vendorPortalService.getEmployees(vendorData?.id || targetVendorId);
  }, [vendorData?.id, targetVendorId]);

  const [deployments, setDeployments] = useState<WorkerDeployment[]>(() => {
    return vendorPortalService.getDeployments(targetVendorId);
  });

  // Synchronize deployments when vendor changes
  useEffect(() => {
    const list = vendorPortalService.getDeployments(targetVendorId);
    setDeployments(list);
  }, [targetVendorId]);

  const contracts: VendorContract[] = useMemo(() => {
    return vendorPortalService.getContracts(targetVendorId);
  }, [targetVendorId]);

  const licenses: VendorLicense[] = useMemo(() => {
    return vendorPortalService.getLicenses(targetVendorId);
  }, [targetVendorId]);

  const statutoryReturns: StatutoryReturn[] = useMemo(() => {
    return vendorPortalService.getStatutoryReturns(targetVendorId);
  }, [targetVendorId]);

  const formVs: PrincipalEmployerFormV[] = useMemo(() => {
    return vendorPortalService.getFormVs(targetVendorId);
  }, [targetVendorId]);

  const auditLogs: VendorAuditLog[] = useMemo(() => {
    return vendorPortalService.getAuditLogs(targetVendorId);
  }, [targetVendorId]);

  const monthlyAttendance = useMemo(() => {
    return vendorPortalService.getMonthlyAttendance('2026-08', targetVendorId);
  }, [targetVendorId]);

  const invoices = useMemo(() => {
    return vendorPortalService.getInvoices(targetVendorId);
  }, [targetVendorId]);

  const purchaseOrders = useMemo(() => {
    return vendorPortalService.getPurchaseOrders(targetVendorId);
  }, [targetVendorId]);

  const disbursements = useMemo(() => {
    return vendorPortalService.getPayments(targetVendorId);
  }, [targetVendorId]);

  const activeInvoice = invoices[0] || null;
  const activePo = purchaseOrders[0] || null;

  // Commercial 3-Way Match calculation
  const matchResult = useMemo(() => {
    const manDays = monthlyAttendance.reduce((s, r) => s + (r.present_days || 0), 0);
    const otHours = monthlyAttendance.reduce((s, r) => s + (r.ot_hours || 0), 0);
    const dailyRate = 450;
    const otRate = 80;
    const serviceCharge = vendorData?.service_charge_percentage || 8.5;
    const claimedAmount = activeInvoice?.total_invoice_amount || 0;

    return VendorThreeWayMatchEngine.reconcile({
      vendorId: targetVendorId,
      companyId: vendorData?.tenant_id || 'comp-joy-che',
      period: '2026-08',
      invoiceNumber: activeInvoice?.invoice_number || `INV-${vendorData?.code || 'VND'}-2026-08`,
      approvedManDays: manDays,
      approvedOtHours: otHours,
      contractNumber: activePo?.po_number || `CNT-${vendorData?.code || 'VND'}-01`,
      poNumber: activePo?.po_number || `PO-${vendorData?.code || 'VND'}-01`,
      dailyRate,
      otHourlyRate: otRate,
      serviceChargePct: serviceCharge,
      poBudgetAvailable: activePo?.remaining_balance || activePo?.contract_value || 0,
      maxAllowedCapacity: vendorData?.max_workforce_capacity || 50,
      claimedInvoiceAmount: claimedAmount,
      claimedManDays: manDays,
      claimedOtHours: otHours,
    });
  }, [targetVendorId, vendorData, monthlyAttendance, activeInvoice, activePo]);

  // Health Metrics
  const activeWorkersCount = workers.length;
  const activeDeploymentsCount = deployments.filter((d) => d.status === 'ACTIVE').length;
  const activeContractsCount = contracts.filter((c) => c.status === 'ACTIVE').length;
  const complianceScore = 100;
  const expiringLicensesCount = licenses.filter((l) => (l.days_until_expiry || 999) <= 30).length;
  const openIssuesCount = 0;
  const outstandingBilling = activeInvoice?.total_invoice_amount || 0;

  // Filtered workers
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      const matchesSearch =
        workerSearch === '' ||
        `${w.first_name} ${w.last_name}`.toLowerCase().includes(workerSearch.toLowerCase()) ||
        w.employee_code.toLowerCase().includes(workerSearch.toLowerCase()) ||
        (w.designation || '').toLowerCase().includes(workerSearch.toLowerCase());
      return matchesSearch;
    });
  }, [workers, workerSearch]);

  // Handlers
  const handleOpenWorkerModal = (worker: VendorEmployee) => {
    setSelectedWorker(worker);
    setIsWorkerModalOpen(true);
  };

  const handleEditDeployment = (dep: WorkerDeployment) => {
    setSelectedDeployment(dep);
    setEditSiteName(dep.site_name || 'Joy Chennai - Unit 1');
    setEditWageRate(dep.daily_wage_rate || 600);
    setIsEditDeploymentModalOpen(true);
  };

  const handleSaveDeployment = () => {
    if (!selectedDeployment) return;
    vendorPortalService.updateDeployment(selectedDeployment.id, {
      site_name: editSiteName,
      daily_wage_rate: editWageRate,
    });
    setDeployments(vendorPortalService.getDeployments(targetVendorId, 'rel-stream-b-joy-che-01'));
    setIsEditDeploymentModalOpen(false);
    showToast('Deployment terms updated successfully', 'success');
  };

  const handleEndDeployment = (depId: string) => {
    vendorPortalService.updateDeploymentStatus(depId, 'ENDED');
    setDeployments(vendorPortalService.getDeployments(targetVendorId, 'rel-stream-b-joy-che-01'));
    showToast('Deployment ended successfully', 'info');
  };

  const handleRequestDocument = () => {
    vendorPortalService.createDocumentRequest({
      vendor_id: targetVendorId,
      document_type: docRequestType,
      due_date: '2026-10-15',
      priority: 'HIGH',
      description: docRequestNotes || `Statutory request for ${docRequestType} issued by Principal Employer`,
    });
    setIsRequestDocModalOpen(false);
    setDocRequestNotes('');
    showToast(`Document request for "${docRequestType}" transmitted to Vendor`, 'success');
  };

  const handleIssueFormV = () => {
    vendorPortalService.issuePrincipalEmployerFormV({
      vendor_id: targetVendorId,
      site_location: formVSiteLocation,
      nature_of_work: 'Security & Surveillance Services',
      max_workers: formVContractLabourCount,
      duration_from: '2026-04-01',
      duration_to: '2027-03-31',
      issued_by_name: 'Director of Human Resources',
      issued_by_designation: 'Principal Employer Authorized Signatory',
    });
    setIsIssueFormVModalOpen(false);
    showToast('Principal Employer Form V Certificate issued successfully', 'success');
  };

  if (!isOpen) return null;

  // Masked PAN
  const rawPan = vendorData.pan || 'AABCS1234F';
  const displayedPan = showPan
    ? rawPan
    : `${rawPan.slice(0, 3)}*****${rawPan.slice(-2)}`;

  // Canonical Primary Tabs (7 Main Daily Operational Views)
  const PRIMARY_TABS: { id: TabId; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    { id: 'overview', label: 'Overview', icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'workforce', label: 'Workforce', icon: <Users className="w-3.5 h-3.5" />, badge: activeWorkersCount },
    { id: 'deployments', label: 'Deployments', icon: <Layers className="w-3.5 h-3.5" />, badge: activeDeploymentsCount },
    { id: 'contracts', label: 'Contracts', icon: <Briefcase className="w-3.5 h-3.5" /> },
    { id: 'compliance', label: 'Compliance', icon: <ShieldCheck className="w-3.5 h-3.5" />, badge: `${complianceScore}%` },
    { id: 'attendance', label: 'Attendance', icon: <Calendar className="w-3.5 h-3.5" />, badge: 'Locked' },
    { id: 'invoices', label: 'Invoices & Match', icon: <Scale className="w-3.5 h-3.5" />, badge: 'Matched' },
  ];

  // Canonical Secondary Tabs (5 Specialized Governance & Procurement Views accessed via More Options)
  const SECONDARY_TABS: {
    id: TabId;
    label: string;
    description: string;
    category: 'GOVERNANCE' | 'COMMERCIAL';
    icon: React.ReactNode;
    badge?: string | number;
  }[] = [
    {
      id: 'documents',
      label: 'Documents',
      description: 'Labour licenses, GST, agreements & statutory certificates',
      category: 'GOVERNANCE',
      icon: <FileText className="w-4 h-4 text-amber-600" />,
      badge: 'Verified',
    },
    {
      id: 'settlement',
      label: 'Settlement',
      description: 'Disbursement ledger, bank payouts & UTR verification',
      category: 'COMMERCIAL',
      icon: <CreditCard className="w-4 h-4 text-emerald-600" />,
      badge: 'Scheduled',
    },
    {
      id: 'requisitions',
      label: 'Requisitions',
      description: 'Job orders, staffing demands & candidate submissions',
      category: 'GOVERNANCE',
      icon: <Send className="w-4 h-4 text-blue-600" />,
      badge: '1 Active',
    },
    {
      id: 'form-v',
      label: 'Form V',
      description: 'Principal Employer Form V under CLRA Rule 21(2)',
      category: 'GOVERNANCE',
      icon: <Stamp className="w-4 h-4 text-teal-600" />,
      badge: `${formVs.length} Issued`,
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      description: 'Immutable timeline of compliance actions & statutory events',
      category: 'GOVERNANCE',
      icon: <History className="w-4 h-4 text-purple-600" />,
      badge: 'Tamper-Proof',
    },
    {
      id: 'access',
      label: 'Users & Access',
      description: 'Vendor portal logins, credentials, MFA & multi-company scopes',
      category: 'GOVERNANCE',
      icon: <Key className="w-4 h-4 text-blue-600" />,
      badge: `${vendorUsers.length} Users`,
    },
  ];

  const activeSecondaryTab = SECONDARY_TABS.find((t) => t.id === activeTab);
  const isSecondaryActive = Boolean(activeSecondaryTab);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-7xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden my-auto"
        id="vendor-360-workspace-container"
      >
        {/* ========================================================================= */}
        {/* 1. STICKY VENDOR IDENTITY HEADER */}
        {/* ========================================================================= */}
        <div className="sticky top-0 z-30 bg-slate-900 text-white px-6 py-4 border-b border-slate-800 shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Vendor Core Metadata */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30">
                  <Building className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-black tracking-tight text-white">
                  {vendorData.legal_name || vendorData.name}
                </h2>
                <Badge className={
                  vendorData.status === 'ACTIVE'
                    ? 'bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 text-xs'
                    : vendorData.status === 'SUSPENDED'
                    ? 'bg-amber-500 text-slate-950 font-bold px-2 py-0.5 text-xs'
                    : 'bg-rose-500 text-white font-bold px-2 py-0.5 text-xs'
                }>
                  {vendorData.status || 'ACTIVE'}
                </Badge>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-indigo-200 border border-slate-700">
                  {vendorData.code || vendorData.vendor_code || 'VEN-000021'}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {vendorData.vendor_type || 'Security Services'}
                </span>
              </div>

              {/* Sub-identity row: Location, GSTIN, Masked PAN, Contact */}
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {vendorData.city || 'Chennai'}, {vendorData.state || 'Tamil Nadu'}
                </span>
                <span>•</span>
                <span className="font-mono">
                  GSTIN: <strong className="text-slate-100">{vendorData.gstin || '33AABCW1234F1Z5'}</strong>
                </span>
                <span>•</span>
                <span className="font-mono flex items-center gap-1">
                  PAN: <strong className="text-slate-100">{displayedPan}</strong>
                  <button
                    type="button"
                    onClick={() => setShowPan(!showPan)}
                    className="text-slate-400 hover:text-white transition ml-1"
                    title={showPan ? 'Mask PAN' : 'Unmask PAN'}
                  >
                    {showPan ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  {vendorData.primary_contact_name || 'Ramesh Kumar'}
                  <span className="text-slate-400">({vendorData.primary_contact_phone || '+91 98401 23456'})</span>
                </span>
              </div>
            </div>

            {/* Header Action Buttons (Section 28 Spec) */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                id="vendor-360-edit-btn"
                onClick={() => setIsEditVendorModalOpen(true)}
                className="bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700 text-xs font-semibold"
              >
                Edit Vendor
              </Button>
              <Button
                size="sm"
                id="vendor-360-add-rel-btn"
                onClick={() => setIsAddRelationshipModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs"
                leftIcon={<Building2 className="w-3.5 h-3.5" />}
                title="Add a new commercial relationship with a Joy company entity"
              >
                Add Company Relationship
              </Button>
              <Button
                size="sm"
                id="vendor-360-invite-admin-btn"
                onClick={() => setIsInviteUserModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs"
                leftIcon={<Key className="w-3.5 h-3.5" />}
                title="Invite dedicated vendor portal admin"
              >
                Invite Vendor Admin
              </Button>
              <Button
                size="sm"
                id="vendor-360-request-doc-btn"
                onClick={() => setIsRequestDocModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs"
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Request Documents
              </Button>
              <Button
                size="sm"
                id="vendor-360-issue-form-v-btn"
                onClick={() => setIsIssueFormVModalOpen(true)}
                className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs"
                leftIcon={<Stamp className="w-3.5 h-3.5" />}
              >
                Issue Form V
              </Button>
              <Button
                size="sm"
                id="vendor-360-match-btn"
                onClick={() => setIsThreeWayMatchModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs"
                leftIcon={<Scale className="w-3.5 h-3.5" />}
              >
                3-Way Match
              </Button>

              {/* More ▼ Dropdown */}
              <div className="relative" ref={headerActionsRef}>
                <Button
                  size="sm"
                  variant="outline"
                  id="vendor-360-more-actions-btn"
                  onClick={() => setIsHeaderActionsOpen(!isHeaderActionsOpen)}
                  className="bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700 text-xs font-semibold flex items-center gap-1"
                >
                  <span>More</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isHeaderActionsOpen ? 'rotate-180' : ''}`} />
                </Button>
                {isHeaderActionsOpen && (
                  <div
                    id="vendor-360-header-actions-menu"
                    className="absolute right-0 top-full mt-1.5 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs"
                  >
                    {vendorData.status === 'SUSPENDED' ? (
                      <button
                        type="button"
                        id="vendor-action-reactivate-btn"
                        onClick={() => handleReactivateVendor()}
                        className="w-full text-left px-3 py-2 text-emerald-400 hover:bg-slate-800 rounded-lg font-semibold flex items-center gap-2 cursor-pointer transition"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Reactivate Vendor
                      </button>
                    ) : (
                      <button
                        type="button"
                        id="vendor-action-suspend-btn"
                        onClick={() => {
                          setIsHeaderActionsOpen(false);
                          setIsSuspendModalOpen(true);
                        }}
                        className="w-full text-left px-3 py-2 text-amber-400 hover:bg-slate-800 rounded-lg font-semibold flex items-center gap-2 cursor-pointer transition"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        Suspend Vendor
                      </button>
                    )}
                    <button
                      type="button"
                      id="vendor-action-archive-btn"
                      onClick={() => {
                        setIsHeaderActionsOpen(false);
                        setIsArchiveModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 text-rose-400 hover:bg-slate-800 rounded-lg font-semibold flex items-center gap-2 cursor-pointer transition"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      Archive Vendor (Soft Delete)
                    </button>
                    <div className="my-1 border-t border-slate-800" />
                    <button
                      type="button"
                      id="vendor-action-audit-btn"
                      onClick={() => {
                        setIsHeaderActionsOpen(false);
                        setActiveTab('audit');
                      }}
                      className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 rounded-lg font-semibold flex items-center gap-2 cursor-pointer transition"
                    >
                      <History className="w-4 h-4 text-purple-400" />
                      View Audit Trail
                    </button>
                    <button
                      type="button"
                      id="vendor-action-access-btn"
                      onClick={() => {
                        setIsHeaderActionsOpen(false);
                        setActiveTab('access');
                      }}
                      className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 rounded-lg font-semibold flex items-center gap-2 cursor-pointer transition"
                    >
                      <Key className="w-4 h-4 text-blue-400" />
                      Manage Access
                    </button>
                  </div>
                )}
              </div>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Close Workspace"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. 8 COMPACT HEALTH METRIC CARDS */}
        {/* ========================================================================= */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {/* Card 1: Workers */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Workers</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black text-slate-900">{activeWorkersCount}</span>
                <span className="text-[11px] font-semibold text-emerald-600">Active</span>
              </div>
            </div>

            {/* Card 2: Deployments */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Deployments</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black text-slate-900">{activeDeploymentsCount}</span>
                <span className="text-[11px] font-semibold text-indigo-600">Active</span>
              </div>
            </div>

            {/* Card 3: Contract */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Contract</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black text-slate-900">{activeContractsCount}</span>
                <span className="text-[11px] font-semibold text-slate-600">Active</span>
              </div>
            </div>

            {/* Card 4: Compliance */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Compliance</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black text-emerald-700">{complianceScore}%</span>
                <span className="text-[11px] font-semibold text-emerald-600">Clear</span>
              </div>
            </div>

            {/* Card 5: Expiring */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Expiring</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black text-slate-900">{expiringLicensesCount}</span>
                <span className="text-[11px] font-semibold text-slate-500">&lt; 30d</span>
              </div>
            </div>

            {/* Card 6: Open Issues */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Open Issues</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black text-slate-900">{openIssuesCount}</span>
                <span className="text-[11px] font-semibold text-emerald-600">0 Flags</span>
              </div>
            </div>

            {/* Card 7: Outstanding Billing */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Outstanding</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm font-black font-mono text-slate-900">₹3,67,430</span>
              </div>
            </div>

            {/* Card 8: Next Action */}
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Next Action</span>
              <div className="mt-0.5 truncate" title="August 2026 Invoice Matched">
                <span className="text-[11px] font-bold text-emerald-900 truncate block">Aug 2026 Matched</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. RESPONSIVE TAB NAVIGATION WITH WORKING ANCHORED MORE DROPDOWN */}
        {/* ========================================================================= */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 relative z-30">
          <div className="flex items-center justify-between gap-2">
            {/* Primary Action Tabs (Scrollable on narrow viewports) */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 scrollbar-none">
              {PRIMARY_TABS.map((t) => {
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(t.id);
                      setIsMoreMenuOpen(false);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
                    }`}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                    {t.badge !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive
                            ? 'bg-indigo-700/90 text-white'
                            : 'bg-slate-100 text-slate-600 border border-slate-200/80'
                        }`}
                      >
                        {t.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Anchored More Options Popover Menu (Never clipped by overflow) */}
            <div className="relative shrink-0 py-2.5" ref={moreMenuRef}>
              <button
                type="button"
                id="vendor-360-more-btn"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                  isSecondaryActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-500/20'
                    : isMoreMenuOpen
                    ? 'bg-slate-100 text-slate-900 border-slate-300'
                    : 'text-slate-700 bg-white border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
                aria-expanded={isMoreMenuOpen}
                aria-haspopup="true"
                title="More vendor governance & commercial modules"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
                <span>{isSecondaryActive ? `More: ${activeSecondaryTab?.label}` : 'More'}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isMoreMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Floating Dropdown Popover */}
              {isMoreMenuOpen && (
                <div
                  id="vendor-360-more-dropdown-menu"
                  className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5"
                  role="menu"
                  aria-orientation="vertical"
                >
                  <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Additional Modules ({SECONDARY_TABS.length})
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                      Vendor 360°
                    </span>
                  </div>

                  <div className="py-1.5 space-y-1">
                    {SECONDARY_TABS.map((item) => {
                      const isItemActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          id={`vendor-more-item-${item.id}`}
                          onClick={() => {
                            setActiveTab(item.id);
                            setIsMoreMenuOpen(false);
                            showToast(`Switched to ${item.label}`, 'info');
                          }}
                          className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all group cursor-pointer ${
                            isItemActive
                              ? 'bg-indigo-50 text-indigo-950 border border-indigo-200/80 shadow-2xs font-semibold'
                              : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                          }`}
                          role="menuitem"
                        >
                          <div
                            className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                              isItemActive
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900'
                            }`}
                          >
                            {item.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <span
                                className={`text-xs font-bold truncate ${
                                  isItemActive ? 'text-indigo-900 font-extrabold' : 'text-slate-900 group-hover:text-indigo-600'
                                }`}
                              >
                                {item.label}
                              </span>
                              {item.badge && (
                                <span
                                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 ${
                                    isItemActive
                                      ? 'bg-indigo-200 text-indigo-900'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200/70'
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-1 pt-2 border-t border-slate-100 px-3 py-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Click to open view</span>
                    <span className="font-mono text-[10px] text-slate-500">Esc to close</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. TAB PANELS CONTENT AREA */}
        {/* ========================================================================= */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-6">
          {/* ----------------------------------------------------------------------- */}
          {/* TAB 1: OVERVIEW */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Top Row: Relationship, Contract, Operational Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Relationship Summary */}
                <Card className="p-5 space-y-3 bg-white border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      Relationship Summary
                    </h3>
                    <Badge variant="emerald">ACTIVE</Badge>
                  </div>
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400">Client Legal Entity:</span>
                      <strong className="text-slate-800">Joy Chennai - Unit 1</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400">Relationship ID:</span>
                      <span className="font-mono font-bold text-slate-700">rel-stream-b-joy-che-01</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400">Service Category:</span>
                      <span className="font-semibold text-slate-800">Security & Surveillance</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400">Vendor Classification:</span>
                      <span className="font-semibold text-slate-800">Strategic Tier-1 Supplier</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Engagement Date:</span>
                      <span className="text-slate-700 font-medium">2026-04-01</span>
                    </div>
                  </div>
                </Card>

                {/* Contract & Commercial Summary */}
                <Card className="p-5 space-y-3 bg-white border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      Contract & Commercials
                    </h3>
                    <Badge variant="info">MSA Active</Badge>
                  </div>
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400">Master Agreement:</span>
                      <strong className="font-mono text-slate-800">MSA-2026-SEC-01</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400">Active PO Number:</span>
                      <strong className="font-mono text-slate-800">PO-JOY-SEC-2026-001</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400">Daily Guard Rate:</span>
                      <span className="font-bold text-slate-900 font-mono">₹600.00 / Day</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400">Overtime Hourly Rate:</span>
                      <span className="font-bold text-slate-900 font-mono">₹75.00 / Hour</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Commercial Terms:</span>
                      <span className="text-slate-700 font-medium">8.5% Service Fee · Net 30</span>
                    </div>
                  </div>
                </Card>

                {/* Operational Summary */}
                <Card className="p-5 space-y-3 bg-white border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      Operational Governance
                    </h3>
                    <Badge variant="emerald">Muster Locked</Badge>
                  </div>
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400">Active Deployed Workforce:</span>
                      <span className="font-bold text-emerald-700">21 Workers (100% capacity)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400">Approved Form V Capacity:</span>
                      <span className="font-bold text-slate-800">50 Workers Max</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400">August 2026 Muster:</span>
                      <span className="font-bold text-slate-900">454 Man-Days · 194.5 OT hrs</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-400">August 3-Way Match:</span>
                      <span className="font-bold text-emerald-700">MATCHED (Variance ₹0)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Disbursement Status:</span>
                      <span className="text-slate-700 font-medium">Scheduled (₹3,67,430)</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Clickable Action Center / Pending Tasks */}
              <Card className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white border-none shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-sm font-black text-white">
                        Operational Status: 100% Reconciled & Ready for Disbursement
                      </h4>
                    </div>
                    <p className="text-xs text-indigo-200">
                      August 2026 Stream B muster roll locked (454 Man-Days). Invoice INV-2026-08-0021 matched with zero variance against PO-JOY-SEC-2026-001.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setIsThreeWayMatchModalOpen(true)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                      leftIcon={<Scale className="w-3.5 h-3.5" />}
                    >
                      View 3-Way Match
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setActiveTab('attendance')}
                      className="bg-white/10 hover:bg-white/20 text-white text-xs border border-white/20"
                    >
                      View August Muster
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Recent Audit Timeline preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Recent Verified Operational Events
                  </h4>
                  <button
                    onClick={() => setActiveTab('audit')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    View Full Audit Trail →
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {auditLogs.slice(0, 4).map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-start justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 block">{log.action}</span>
                        <span className="text-slate-500 text-[11px] block">{log.remarks || log.action}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                        {new Date((log as any).timestamp || (log as any).performed_at || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 2: WORKFORCE */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'workforce' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 flex-1 max-w-md">
                  <Input
                    placeholder="Search by worker name, code, designation..."
                    value={workerSearch}
                    onChange={(e) => setWorkerSearch(e.target.value)}
                    leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                    className="text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="emerald" className="font-bold text-xs">
                    {filteredWorkers.length} Workers Deployed
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      showToast('Workforce roster exported to CSV', 'info');
                    }}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    className="text-xs font-semibold"
                  >
                    Export Roster
                  </Button>
                </div>
              </div>

              {/* Workers Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker</TableHead>
                      <TableHead>Employee Code</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Daily Wage Rate</TableHead>
                      <TableHead>OT Rate</TableHead>
                      <TableHead>Gate Pass Expiry</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWorkers.map((w, idx) => {
                      const dep = deployments.find((d) => d.worker_id === w.id) || deployments[idx % deployments.length];
                      return (
                        <TableRow key={w.id} className="hover:bg-slate-50/70 transition">
                          <TableCell>
                            <div>
                              <strong className="text-slate-900 text-xs block">
                                {w.first_name} {w.last_name}
                              </strong>
                              <span className="text-[10px] text-slate-400">Security Guard</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono font-bold text-indigo-700 text-xs">
                              {w.employee_code}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-700">
                            {w.designation || 'Security Guard'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-medium">
                              {dep?.shift_name || (idx % 2 === 0 ? 'General Shift' : 'Night Shift')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              ₹{dep?.daily_wage_rate || 600} / day
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              ₹{dep?.ot_hourly_rate || 75} / hr
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 font-mono">
                            {dep?.gate_pass_valid_till || '2027-03-31'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="emerald" className="text-[10px] font-bold">
                              ACTIVE
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenWorkerModal(w)}
                              className="text-indigo-600 hover:text-indigo-800 text-xs font-bold"
                            >
                              Profile & KYC
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 3: DEPLOYMENTS */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'deployments' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Site Deployments — Joy Chennai - Unit 1 ({deployments.length} Active)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Governs company-approved work sites, shifts, and wage rate compliance for contract personnel.
                  </p>
                </div>
                <Badge variant="emerald" className="font-bold text-xs">
                  21 / 50 Form V Capacity
                </Badge>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker</TableHead>
                      <TableHead>Deployment Site</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Daily Rate</TableHead>
                      <TableHead>OT Rate</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deployments.map((dep) => (
                      <TableRow key={dep.id} className="hover:bg-slate-50/70 transition">
                        <TableCell>
                          <div>
                            <strong className="text-slate-900 text-xs block">
                              {dep.worker_name || 'Contract Worker'}
                            </strong>
                            <span className="font-mono text-[10px] text-slate-500">
                              {dep.worker_code || 'CW-01'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-800">
                          {dep.site_name || 'Chennai Security Post A'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {dep.department_name || 'Security & Surveillance'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {dep.shift_name || 'General'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-xs text-slate-900">
                          ₹{dep.daily_wage_rate} / day
                        </TableCell>
                        <TableCell className="font-mono font-bold text-xs text-slate-900">
                          ₹{dep.ot_hourly_rate || 75} / hr
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 font-mono">
                          {dep.start_date}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={dep.status === 'ACTIVE' ? 'emerald' : 'rose'}
                            className="text-[10px] font-bold"
                          >
                            {dep.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditDeployment(dep)}
                            className="text-xs text-indigo-600 hover:text-indigo-800"
                          >
                            Adjust Rate / Site
                          </Button>
                          {dep.status === 'ACTIVE' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEndDeployment(dep.id)}
                              className="text-xs text-rose-600 hover:text-rose-800"
                            >
                              End
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 4: CONTRACTS */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'contracts' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Active Master Service Agreement */}
                <Card className="p-5 space-y-4 bg-white border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Master Service Agreement
                      </span>
                      <h4 className="text-base font-black text-slate-900 font-mono">
                        MSA-2026-SEC-01
                      </h4>
                    </div>
                    <Badge variant="emerald">ACTIVE & ENFORCEABLE</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Agreement Period</span>
                      <strong className="text-slate-800">2026-04-01 to 2027-03-31</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Commercial Term</span>
                      <strong className="text-slate-800">Net 30 Days</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Notice Period</span>
                      <strong className="text-slate-800">30 Calendar Days</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Governing Law</span>
                      <strong className="text-slate-800">Tamil Nadu CLRA Rules</strong>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <span className="font-bold text-slate-800 block">SLA Mandates & Obligations:</span>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                      <li>Maintain minimum 95% shift fill rate across all security posts</li>
                      <li>100% Police Verification & Identity vetting prior to site deployment</li>
                      <li>Mandatory statutory compliance: ESI/PF challan submission by 15th of each month</li>
                      <li>Replacement within 4 hours for any unnotified absenteeism</li>
                    </ul>
                  </div>
                </Card>

                {/* Active Purchase Order & Budget Cap */}
                <Card className="p-5 space-y-4 bg-white border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Commercial Purchase Order
                      </span>
                      <h4 className="text-base font-black text-slate-900 font-mono">
                        PO-JOY-SEC-2026-001
                      </h4>
                    </div>
                    <Badge variant="info">PO Linked</Badge>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Annual PO Commitment Cap:</span>
                      <strong className="font-mono text-slate-900">₹45,00,000.00</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Monthly Budget Ceiling:</span>
                      <strong className="font-mono text-slate-900">₹5,00,000.00</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">August 2026 Invoice Claim:</span>
                      <strong className="font-mono text-indigo-700">₹3,67,430.00</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Monthly Headroom Remaining:</span>
                      <strong className="font-mono text-emerald-700">₹1,32,570.00</strong>
                    </div>
                  </div>

                  {/* Rate Card breakdown */}
                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs space-y-1">
                    <span className="font-bold text-indigo-900 block">Agreed Rate Card (August 2026):</span>
                    <div className="grid grid-cols-3 gap-2 text-indigo-950 font-mono text-[11px] pt-1">
                      <div>Guard: ₹600/day</div>
                      <div>OT: ₹75/hour</div>
                      <div>Fee: 8.5%</div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 5: COMPLIANCE */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'compliance' && (
            <div className="space-y-5">
              {/* Statutory Compliance Health Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-emerald-50 border-emerald-200 space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-emerald-900 text-sm">100% Statutory Clearance</span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    All mandatory filings (PF ECR, ESIC Challan, Labour License) are up-to-date for August 2026.
                  </p>
                </Card>

                <Card className="p-4 bg-white border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Labour License Validity
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-slate-900">203 Days</span>
                    <span className="text-xs font-semibold text-emerald-600">Valid till 2027-03-31</span>
                  </div>
                </Card>

                <Card className="p-4 bg-white border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    PF / ESIC Reconciliation
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-slate-900">21 / 21</span>
                    <span className="text-xs font-semibold text-indigo-600">All Workers Covered</span>
                  </div>
                </Card>
              </div>

              {/* Monthly Statutory Returns Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Verified Statutory Monthly Filings
                </h4>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Return / Filing Type</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Filing Date</TableHead>
                        <TableHead>Acknowledgement / Challan TRRN</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statutoryReturns.map((ret) => (
                        <TableRow key={ret.id}>
                          <TableCell className="font-bold text-slate-900 text-xs">
                            {ret.form_type}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{ret.return_period}</TableCell>
                          <TableCell className="text-xs text-slate-600">{ret.due_date}</TableCell>
                          <TableCell className="text-xs font-medium text-emerald-700">
                            {ret.filing_date}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-slate-800">
                            {ret.acknowledgement_number}
                          </TableCell>
                          <TableCell>
                            <Badge variant="emerald" className="text-[10px] font-bold">
                              {ret.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Licenses and Registrations */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Contractor Licenses & Certificates
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {licenses.map((lic) => (
                    <Card key={lic.id} className="p-4 bg-white border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-900 font-mono text-sm">{lic.license_number}</strong>
                        <Badge variant="emerald">{lic.status}</Badge>
                      </div>
                      <p className="text-slate-600 font-semibold">{lic.license_type}</p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>Issued: {lic.issued_date}</span>
                        <span>Expires: <strong>{lic.expiry_date}</strong></span>
                        <span>Authority: {lic.issuing_authority}</span>
                        <span>Capacity: {lic.max_worker_capacity} Workers</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 6: DOCUMENTS */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Vendor Document Vault (Categorized & Verified)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Tamper-proof repository of statutory, contractual, and bank credentials.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsRequestDocModalOpen(true)}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                  className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Request Document
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Category 1: Statutory & Tax */}
                <Card className="p-4 bg-white border-slate-200 space-y-3">
                  <h5 className="text-xs font-black uppercase text-slate-800 tracking-wider border-b border-slate-100 pb-2">
                    Statutory & Tax
                  </h5>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">GST Certificate</span>
                        <span className="text-[10px] text-slate-400">33AABCW1234F1Z5</span>
                      </div>
                      <Badge variant="emerald" className="text-[10px]">Verified</Badge>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">PAN Card</span>
                        <span className="text-[10px] text-slate-400">AABCS1234F</span>
                      </div>
                      <Badge variant="emerald" className="text-[10px]">Verified</Badge>
                    </div>
                  </div>
                </Card>

                {/* Category 2: Service Contracts */}
                <Card className="p-4 bg-white border-slate-200 space-y-3">
                  <h5 className="text-xs font-black uppercase text-slate-800 tracking-wider border-b border-slate-100 pb-2">
                    Contracts & Agreements
                  </h5>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">Executed MSA-2026-SEC-01</span>
                        <span className="text-[10px] text-slate-400">Signed 2026-04-01</span>
                      </div>
                      <Badge variant="emerald" className="text-[10px]">Active</Badge>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">PO-JOY-SEC-2026-001</span>
                        <span className="text-[10px] text-slate-400">Commercial PO</span>
                      </div>
                      <Badge variant="info" className="text-[10px]">Approved</Badge>
                    </div>
                  </div>
                </Card>

                {/* Category 3: Monthly Compliances */}
                <Card className="p-4 bg-white border-slate-200 space-y-3">
                  <h5 className="text-xs font-black uppercase text-slate-800 tracking-wider border-b border-slate-100 pb-2">
                    Monthly Compliance Filing
                  </h5>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">August 2026 PF ECR</span>
                        <span className="text-[10px] text-slate-400">TRRN-2026-09-0881928</span>
                      </div>
                      <Badge variant="emerald" className="text-[10px]">Filed</Badge>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">August 2026 ESIC Challan</span>
                        <span className="text-[10px] text-slate-400">ESIC-CHAL-2026-09-11234</span>
                      </div>
                      <Badge variant="emerald" className="text-[10px]">Paid</Badge>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 7: ATTENDANCE */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              {/* August 2026 Muster Lock Banner */}
              <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-md space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-sm font-black text-white">
                        August 2026 Monthly Muster Roll
                      </h4>
                    </div>
                    <p className="text-xs text-indigo-200 mt-1">
                      {monthlyAttendance.length > 0
                        ? `Attendance records for ${vendorData?.name || 'Vendor Partner'} (${monthlyAttendance.length} workers).`
                        : 'No attendance records uploaded or verified yet for August 2026.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={monthlyAttendance.length > 0 ? 'emerald' : 'neutral'} className="text-xs font-black">
                      {monthlyAttendance.length > 0 ? 'VERIFIED' : 'PENDING'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-indigo-800/40 text-xs">
                  <div>
                    <span className="text-indigo-300 block text-[10px] uppercase font-bold">Total Approved Days</span>
                    <strong className="text-lg font-black text-white">
                      {monthlyAttendance.reduce((sum, r) => sum + (r.present_days || 0), 0)} Man-Days
                    </strong>
                  </div>
                  <div>
                    <span className="text-indigo-300 block text-[10px] uppercase font-bold">Approved Overtime</span>
                    <strong className="text-lg font-black text-white">
                      {monthlyAttendance.reduce((sum, r) => sum + (r.ot_hours || 0), 0)} Hours
                    </strong>
                  </div>
                  <div>
                    <span className="text-indigo-300 block text-[10px] uppercase font-bold">Loss of Pay (LOP)</span>
                    <strong className="text-lg font-black text-white">
                      {monthlyAttendance.reduce((sum, r) => sum + (r.lop_days || 0), 0)} Days
                    </strong>
                  </div>
                  <div>
                    <span className="text-indigo-300 block text-[10px] uppercase font-bold">Total Headcount</span>
                    <strong className="text-lg font-black text-emerald-400 font-mono">
                      {monthlyAttendance.length} Workers
                    </strong>
                  </div>
                </div>
              </div>

              {/* Attendance Records Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Present Days</TableHead>
                      <TableHead>Weekly Off / Holidays</TableHead>
                      <TableHead>Absent / LOP</TableHead>
                      <TableHead>OT Hours</TableHead>
                      <TableHead>Earned Wages (Est.)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyAttendance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-xs text-slate-400 font-sans">
                          No attendance records recorded for this vendor.
                        </TableCell>
                      </TableRow>
                    ) : (
                      monthlyAttendance.map((rec) => {
                        const earned = (rec.present_days || 0) * 600 + (rec.ot_hours || 0) * 75;
                        return (
                          <TableRow key={rec.id} className="hover:bg-slate-50/70 transition">
                            <TableCell className="font-bold text-xs text-slate-900">
                              {rec.employee_name}
                            </TableCell>
                            <TableCell className="font-mono text-xs font-semibold text-indigo-700">
                              {rec.employee_code}
                            </TableCell>
                            <TableCell className="font-mono text-xs font-bold text-emerald-700">
                              {rec.present_days}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-slate-600">
                              {rec.leave_days || 0}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-rose-600">
                              {rec.lop_days || 0}
                            </TableCell>
                            <TableCell className="font-mono text-xs font-bold text-blue-700">
                              {rec.ot_hours} hrs
                            </TableCell>
                            <TableCell className="font-mono text-xs font-bold text-slate-900">
                              ₹{earned.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 8: INVOICES & 3-WAY MATCH */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'invoices' && (
            <div className="space-y-5">
              {/* 3-Way Match Reconciled Hero Card */}
              <Card className="p-6 bg-white border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      August 2026 Commercial Reconciliation
                    </span>
                    <h4 className="text-lg font-black text-slate-900 font-mono">
                      Invoice: {matchResult.invoice_number}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={matchResult.match_status === 'MATCHED' ? 'emerald' : 'neutral'} className="font-black text-sm px-3 py-1">
                      {matchResult.match_status} (Variance ₹{matchResult.variance_amount.toLocaleString()})
                    </Badge>
                  </div>
                </div>

                {/* 3-Way Match Verification Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Pillar 1: Attendance */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-800 uppercase text-[11px] block">
                      1. Approved Muster Roll
                    </span>
                    <div className="space-y-1 text-slate-600">
                      <div>Man-Days: <strong>{matchResult.attendance_man_days} Days</strong></div>
                      <div>Overtime: <strong>{matchResult.attendance_ot_hours} Hours</strong></div>
                      <div>Status: <span className="text-emerald-700 font-bold">{monthlyAttendance.length > 0 ? 'VERIFIED' : 'NO RECORDS'}</span></div>
                    </div>
                  </div>

                  {/* Pillar 2: Contract Rate Card */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-800 uppercase text-[11px] block">
                      2. MSA Contract Terms
                    </span>
                    <div className="space-y-1 text-slate-600">
                      <div>Daily Rate: <strong>₹{matchResult.contract_daily_rate}.00 / day</strong></div>
                      <div>OT Rate: <strong>₹{matchResult.contract_ot_hourly_rate}.00 / hr</strong></div>
                      <div>Agency Fee: <strong>{matchResult.contract_service_charge_pct}% Service Charge</strong></div>
                    </div>
                  </div>

                  {/* Pillar 3: PO Budget */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-800 uppercase text-[11px] block">
                      3. {matchResult.po_number}
                    </span>
                    <div className="space-y-1 text-slate-600">
                      <div>PO Budget Cap: <strong>₹{matchResult.po_budget_available.toLocaleString()}</strong></div>
                      <div>Claimed Value: <strong>₹{matchResult.claimed_amount.toLocaleString()}</strong></div>
                      <div>Status: <span className="text-emerald-700 font-bold">{matchResult.is_po_limit_sufficient ? 'SUFFICIENT' : 'EXCEEDED'}</span></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      showToast(`Invoice ${matchResult.invoice_number} approved for disbursement`, 'success');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Approve for Disbursement
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 9: SETTLEMENT */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'settlement' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Disbursement & Remittance Ledger
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Tracks banking settlement, payment runs, and UTR confirmations.
                  </p>
                </div>
                <Badge variant="emerald" className="font-bold text-xs">
                  {vendorData?.bank_name ? `${vendorData.bank_name} Verified` : 'Bank Ledger'}
                </Badge>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Beneficiary Account</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>UTR / Ref Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disbursements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-xs text-slate-400 font-sans">
                          No settlements or disbursements recorded yet for this vendor.
                        </TableCell>
                      </TableRow>
                    ) : (
                      disbursements.map((pay) => (
                        <TableRow key={pay.id}>
                          <TableCell className="font-mono font-bold text-xs text-slate-900">
                            {pay.invoice_number}
                          </TableCell>
                          <TableCell className="text-xs text-slate-700">
                            {pay.client_company_name || vendorData?.bank_name || 'Bank Account'}
                          </TableCell>
                          <TableCell className="font-mono font-bold text-xs text-slate-900">
                            ₹{pay.paid_amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-slate-600">
                            {pay.payment_mode}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-indigo-700 font-bold">
                            {pay.payment_reference || pay.id}
                          </TableCell>
                          <TableCell>
                            <Badge variant={pay.payment_status === 'PAID' ? 'emerald' : 'neutral'} className="text-[10px] font-bold">
                              {pay.payment_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => showToast('Disbursement advice receipt downloaded', 'info')}
                              className="text-xs text-indigo-600 font-semibold"
                            >
                              Download Advice
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 10: REQUISITIONS */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'requisitions' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Workforce Requisitions — Joy Chennai
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Demand forecasts and candidate submissions from ABC Security Services.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => showToast('New workforce requisition initiated', 'info')}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  + New Requisition
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 bg-white border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <strong className="font-mono text-xs text-slate-900">REQ-2026-042</strong>
                    <Badge variant="emerald">FULFILLED</Badge>
                  </div>
                  <h5 className="font-bold text-slate-800 text-xs">
                    21 Contract Security Personnel for Main Industrial Post
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    Deployment completed on 2026-08-01. All 21 guards deployed under Stream B workforce.
                  </p>
                </Card>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 11: FORM V & STATUTORY CERTIFICATES */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'form-v' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Principal Employer Form V Certificates ({formVs.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Statutory certificate under Rule 21(2) of Tamil Nadu Contract Labour Rules.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsIssueFormVModalOpen(true)}
                  leftIcon={<Stamp className="w-3.5 h-3.5" />}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs"
                >
                  Issue New Form V
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {formVs.map((fv) => (
                  <Card key={fv.id} className="p-5 bg-white border-teal-200 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-100 pb-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Form V Certificate Number
                        </span>
                        <h5 className="text-base font-black text-slate-900 font-mono">
                          {fv.certificate_number}
                        </h5>
                      </div>
                      <Badge variant="emerald">ACTIVE & LEGALLY BINDING</Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Contractor</span>
                        <strong className="text-slate-800">{fv.contractor_name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Approved Max Strength</span>
                        <strong className="text-teal-800 font-mono font-bold">
                          {fv.max_contract_labour_capacity || fv.max_contract_labour || 50} Workers
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Engagement Period</span>
                        <strong className="text-slate-800">
                          {fv.duration_from} to {fv.duration_to}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Authorized Signatory</span>
                        <strong className="text-slate-800">{fv.issued_by_name}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => showToast('Form V Certificate PDF downloaded', 'success')}
                        leftIcon={<Download className="w-3.5 h-3.5" />}
                        className="text-xs font-semibold"
                      >
                        Download Form V PDF
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 12: AUDIT TRAIL */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Append-Only Chronological Audit Trail ({auditLogs.length} Events)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Every vendor lifecycle action, contract execution, and muster certification is cryptographically registered.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Actor / User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">
                          {new Date((log as any).timestamp || (log as any).performed_at || Date.now()).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-900">
                          {(log as any).actor_name || (log as any).performed_by || 'HR Compliance Officer'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">
                          {log.entity_type || 'VENDOR'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">
                          {log.remarks || 'Standard verified compliance operation.'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 13: USERS & ACCESS (SECTION 30 SPECIFICATION) */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'access' && (
            <div className="space-y-6">
              {/* Top Banner & Invite CTA */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                    <Key className="w-4 h-4 text-blue-600" />
                    Vendor Users & Access Management ({vendorUsers.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage authorized portal users, issue credentials, reset access, and scope multi-company relationships.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    id="add-company-relationship-tab-btn"
                    variant="outline"
                    onClick={() => setIsAddRelationshipModalOpen(true)}
                    className="text-xs font-semibold"
                    leftIcon={<Building2 className="w-3.5 h-3.5 text-purple-600" />}
                  >
                    + Add Company Relationship
                  </Button>
                  <Button
                    size="sm"
                    id="invite-vendor-user-tab-btn"
                    onClick={() => setIsInviteUserModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    + Invite Vendor User
                  </Button>
                </div>
              </div>

              {/* Section: Commercial Company Relationships */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    Authorized Company Relationships ({companyRelationships.length})
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {companyRelationships.map((rel) => (
                    <Card key={rel.id} className="p-4 bg-white border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <strong className="text-sm font-bold text-slate-900 block">{rel.site_name}</strong>
                          <span className="font-mono text-xs text-slate-500">{rel.relationship_id || rel.id}</span>
                        </div>
                        <Badge variant={rel.status === 'ACTIVE' ? 'emerald' : 'amber'}>
                          {rel.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 border-t border-slate-100 pt-2">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Service Charge</span>
                          <strong className="text-slate-800">{rel.service_charge_percentage ?? 8.5}%</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Terms</span>
                          <strong className="text-slate-800">{rel.payment_terms || 'Net 30 Days'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Rate Card Type</span>
                          <strong className="text-slate-800">{rel.rate_card_type || 'DAILY_RATE'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Max Workforce</span>
                          <strong className="text-slate-800">{rel.max_workforce_capacity || 50} Workers</strong>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Section: Vendor Users Cards */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  Portal User Accounts ({vendorUsers.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vendorUsers.map((u) => {
                    const uRels = vendorCredentialService.getUserRelationships(u.id);
                    return (
                      <Card key={u.id} className="p-5 bg-white border-slate-200 shadow-xs space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-slate-900">{u.full_name}</h4>
                              <Badge
                                variant={
                                  u.status === 'ACTIVE'
                                    ? 'emerald'
                                    : u.status === 'INVITED'
                                    ? 'amber'
                                    : 'rose'
                                }
                              >
                                {u.status}
                              </Badge>
                            </div>
                            <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block">
                              {u.role}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">User ID: {u.id}</span>
                        </div>

                        <div className="text-xs text-slate-600 space-y-1.5 border-y border-slate-100 py-3">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono text-slate-800">{u.email}</span>
                          </div>
                          {u.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              Last Login:{' '}
                              {u.last_login_at
                                ? new Date(u.last_login_at).toLocaleString()
                                : '2026-09-08 09:30'}
                            </span>
                          </div>
                        </div>

                        {/* Assigned Relationships Scope */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            Assigned Relationships ({uRels.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {uRels.length === 0 ? (
                              <span className="text-xs text-slate-400 italic">
                                No relationships assigned (Isolated)
                              </span>
                            ) : (
                              uRels.map((rel) => (
                                <span
                                  key={rel.id}
                                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                                >
                                  {(rel.vendor_relationship_id || rel.relationship_id) === 'rel-stream-b-joy-che-01'
                                    ? 'JOY Chennai (Unit 1)'
                                    : (rel.vendor_relationship_id || rel.relationship_id) === 'rel-stream-b-joy-cbe-02'
                                    ? 'JOY Coimbatore (Unit 2)'
                                    : (rel.vendor_relationship_id || rel.relationship_id)}
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                          <Button
                            size="xs"
                            variant="outline"
                            id={`reset-access-${u.id}`}
                            onClick={() => handleResetAccess(u.email)}
                            className="text-xs font-semibold text-slate-700"
                            leftIcon={<RefreshCw className="w-3 h-3 text-slate-500" />}
                          >
                            Reset Access
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            id={`manage-scope-${u.id}`}
                            onClick={() => handleOpenManageScope(u)}
                            className="text-xs font-semibold text-blue-700 border-blue-200 hover:bg-blue-50"
                            leftIcon={<Layers className="w-3 h-3 text-blue-600" />}
                          >
                            Manage Scope
                          </Button>
                          {u.status === 'ACTIVE' ? (
                            <Button
                              size="xs"
                              variant="outline"
                              id={`disable-user-${u.id}`}
                              onClick={() => handleToggleUserStatus(u.id, 'DISABLE')}
                              className="text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 ml-auto"
                            >
                              Disable
                            </Button>
                          ) : (
                            <Button
                              size="xs"
                              variant="outline"
                              id={`reactivate-user-${u.id}`}
                              onClick={() => handleToggleUserStatus(u.id, 'REACTIVATE')}
                              className="text-xs font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50 ml-auto"
                            >
                              Reactivate
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MODAL 1: WORKER PROFILE & KYC DETAILS */}
        {/* ========================================================================= */}
        {selectedWorker && (
          <Modal
            isOpen={isWorkerModalOpen}
            onClose={() => setIsWorkerModalOpen(false)}
            title={`Worker Profile — ${selectedWorker.first_name} ${selectedWorker.last_name}`}
            size="lg"
          >
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Employee Code</span>
                  <strong className="font-mono text-indigo-700 text-sm">{selectedWorker.employee_code}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Designation</span>
                  <strong className="text-slate-900">{selectedWorker.designation || 'Security Guard'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Employment Status</span>
                  <Badge variant="emerald">ACTIVE</Badge>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">UAN Number</span>
                  <strong className="font-mono text-slate-800">{selectedWorker.uan || '101298471920'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">ESIC IP Number</span>
                  <strong className="font-mono text-slate-800">{selectedWorker.esic_ip || '5192837192'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Police Clearance</span>
                  <strong className="text-emerald-700 font-semibold">Verified & On File</strong>
                </div>
              </div>

              <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2">
                <span className="font-bold text-indigo-950 block uppercase text-[10px]">Active Deployment</span>
                <div className="grid grid-cols-2 gap-2 text-indigo-900 text-[11px]">
                  <div>Site: <strong>Joy Chennai - Unit 1</strong></div>
                  <div>Shift: <strong>General (09:00 - 18:00)</strong></div>
                  <div>Daily Wage Rate: <strong>₹600.00 / day</strong></div>
                  <div>Overtime Hourly Rate: <strong>₹75.00 / hour</strong></div>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: 3-WAY MATCH MODAL */}
        {/* ========================================================================= */}
        <Modal
          isOpen={isThreeWayMatchModalOpen}
          onClose={() => setIsThreeWayMatchModalOpen(false)}
          title="Commercial 3-Way Match Verification — August 2026"
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-950 text-sm block">
                  Match Status: {matchResult.status}
                </span>
                <p className="text-emerald-700 text-xs">
                  {matchResult.matched
                    ? 'Attendance, Contract Rate Card, and PO Budget reconcile with ZERO variance.'
                    : 'Discrepancies identified.'}
                </p>
              </div>
              <Badge variant="emerald" className="font-black text-sm">
                Variance ₹0.00
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Claimed Amount</span>
                <strong className="font-mono text-base text-slate-900">₹3,67,430.00</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Approved Calculation</span>
                <strong className="font-mono text-base text-emerald-700">₹3,67,430.00</strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => {
                  setIsThreeWayMatchModalOpen(false);
                  showToast('3-Way Match certificate approved', 'success');
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Accept & Proceed
              </Button>
            </div>
          </div>
        </Modal>

        {/* ========================================================================= */}
        {/* MODAL 3: REQUEST DOCUMENT MODAL */}
        {/* ========================================================================= */}
        <Modal
          isOpen={isRequestDocModalOpen}
          onClose={() => setIsRequestDocModalOpen(false)}
          title="Transmit Statutory Document Requisition"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Document Category</label>
              <select
                value={docRequestType}
                onChange={(e) => setDocRequestType(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value="Labour License Renewal">Labour License Renewal</option>
                <option value="Annual PF Return Form 3A">Annual PF Return Form 3A</option>
                <option value="Monthly ESIC Payment Challan">Monthly ESIC Payment Challan</option>
                <option value="Minimum Wages Declaration">Minimum Wages Declaration</option>
                <option value="Police Verification Dossiers">Police Verification Dossiers</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Instructions / Specifics</label>
              <textarea
                value={docRequestNotes}
                onChange={(e) => setDocRequestNotes(e.target.value)}
                placeholder="Provide details or deadline context..."
                className="w-full p-2 border border-slate-300 rounded-lg text-xs h-20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setIsRequestDocModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRequestDocument}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                Send Requisition
              </Button>
            </div>
          </div>
        </Modal>

        {/* ========================================================================= */}
        {/* MODAL 4: ISSUE FORM V CERTIFICATE */}
        {/* ========================================================================= */}
        <Modal
          isOpen={isIssueFormVModalOpen}
          onClose={() => setIsIssueFormVModalOpen(false)}
          title="Issue Principal Employer Form V Certificate"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Site Location</label>
              <Input
                value={formVSiteLocation}
                onChange={(e) => setFormVSiteLocation(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Approved Maximum Labour Capacity</label>
              <Input
                type="number"
                value={formVContractLabourCount}
                onChange={(e) => setFormVContractLabourCount(Number(e.target.value))}
                className="text-xs font-mono"
              />
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
              Form V legally authorizes ABC Security Services Pvt Ltd to apply for a Labour License for up to {formVContractLabourCount} workers at {formVSiteLocation}.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setIsIssueFormVModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleIssueFormV}
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold"
              >
                Issue Certificate
              </Button>
            </div>
          </div>
        </Modal>

        {/* ========================================================================= */}
        {/* MODAL 5: ADJUST DEPLOYMENT RATE / SITE */}
        {/* ========================================================================= */}
        {selectedDeployment && (
          <Modal
            isOpen={isEditDeploymentModalOpen}
            onClose={() => setIsEditDeploymentModalOpen(false)}
            title={`Adjust Deployment — ${selectedDeployment.worker_name}`}
            size="md"
          >
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Deployment Site</label>
                <Input
                  value={editSiteName}
                  onChange={(e) => setEditSiteName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Daily Wage Rate (₹)</label>
                <Input
                  type="number"
                  value={editWageRate}
                  onChange={(e) => setEditWageRate(Number(e.target.value))}
                  className="text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setIsEditDeploymentModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveDeployment}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* ========================================================================= */}
        {/* MODAL 6: EDIT VENDOR PROFILE */}
        {/* ========================================================================= */}
        {isEditVendorModalOpen && (
          <VendorEditModal
            isOpen={isEditVendorModalOpen}
            onClose={() => setIsEditVendorModalOpen(false)}
            vendor={vendorData}
            onSaved={(updated) => {
              setVendorData(updated);
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* MODAL 7: DELETE / TERMINATE VENDOR (WITH SAFETY GUARDRAILS) */}
        {/* ========================================================================= */}
        {isDeleteVendorModalOpen && (
          <VendorDeleteModal
            isOpen={isDeleteVendorModalOpen}
            onClose={() => setIsDeleteVendorModalOpen(false)}
            vendor={vendorData}
            activeWorkersCount={activeWorkersCount}
            activeContractsCount={activeContractsCount}
            onDeleted={(_id, mode) => {
              if (mode === 'DELETED') {
                showToast('Vendor record permanently deleted', 'info');
                onClose?.();
              } else {
                setVendorData((prev: any) => ({ ...prev, status: 'TERMINATED' }));
                showToast('Vendor status updated to TERMINATED', 'info');
              }
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* MODAL 8: DEDICATED VENDOR PORTAL CREDENTIALS & MULTI-TENANT ACCESS */}
        {/* ========================================================================= */}
        {isCredentialsModalOpen && (
          <VendorCredentialsModal
            isOpen={isCredentialsModalOpen}
            onClose={() => setIsCredentialsModalOpen(false)}
            vendor={vendorData}
          />
        )}

        {/* ========================================================================= */}
        {/* MODAL 9: ADD COMPANY RELATIONSHIP */}
        {/* ========================================================================= */}
        {isAddRelationshipModalOpen && (
          <Modal
            isOpen={isAddRelationshipModalOpen}
            onClose={() => setIsAddRelationshipModalOpen(false)}
            title="Add Company Relationship"
            size="md"
          >
            <div className="space-y-4 text-xs">
              <p className="text-slate-500">
                Establish a commercial relationship between this vendor and a Joy legal entity or manufacturing unit.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Joy Company Legal Entity</label>
                <select
                  value={newRelCompanyId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    setNewRelCompanyId(cid);
                    if (cid === 'comp-joy-cbe') setNewRelSiteName('JOY Coimbatore - Plant 2');
                    else if (cid === 'comp-joy-blr') setNewRelSiteName('JOY Bengaluru - Electronics Hub');
                    else if (cid === 'comp-joy-hyd') setNewRelSiteName('JOY Hyderabad - Logistics Center');
                    else setNewRelSiteName('JOY Chennai - Unit 1');
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="comp-joy-cbe">JOY Coimbatore - Manufacturing Unit 2</option>
                  <option value="comp-joy-blr">JOY Bengaluru - Electronics Hub (Unit 3)</option>
                  <option value="comp-joy-hyd">JOY Hyderabad - Logistics Center (Unit 4)</option>
                  <option value="comp-joy-che">JOY Chennai - Automotive Plant (Unit 1)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Site / Facility Name</label>
                <Input
                  value={newRelSiteName}
                  onChange={(e) => setNewRelSiteName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Service Charge (%)</label>
                  <Input
                    type="number"
                    value={newRelServiceCharge}
                    onChange={(e) => setNewRelServiceCharge(Number(e.target.value))}
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Terms</label>
                  <select
                    value={newRelPaymentTerms}
                    onChange={(e) => setNewRelPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="Net 15 Days">Net 15 Days</option>
                    <option value="Net 30 Days">Net 30 Days</option>
                    <option value="Net 45 Days">Net 45 Days</option>
                    <option value="Net 60 Days">Net 60 Days</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rate Card Type</label>
                  <select
                    value={newRelRateCardType}
                    onChange={(e) => setNewRelRateCardType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="DAILY_RATE">DAILY_RATE (Per Manday)</option>
                    <option value="MONTHLY_FIXED">MONTHLY_FIXED (Retainer)</option>
                    <option value="HOURLY">HOURLY (Shift-based)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Workforce Capacity</label>
                  <Input
                    type="number"
                    value={newRelCapacity}
                    onChange={(e) => setNewRelCapacity(Number(e.target.value))}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button size="sm" variant="outline" onClick={() => setIsAddRelationshipModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddRelationship}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Create Relationship
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* ========================================================================= */}
        {/* MODAL 10: INVITE VENDOR USER / ADMIN */}
        {/* ========================================================================= */}
        {isInviteUserModalOpen && (
          <Modal
            isOpen={isInviteUserModalOpen}
            onClose={() => setIsInviteUserModalOpen(false)}
            title="Invite Vendor Portal User"
            size="md"
          >
            <div className="space-y-4 text-xs">
              <p className="text-slate-500">
                Generate an invitation link for a designated vendor representative. The user will set their password upon clicking the secure link.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <Input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. K. Balasubramanian"
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. bala.k@abcsecurity.in"
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <Input
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    placeholder="+91 94432 10987"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Portal Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="VENDOR_ADMIN">Vendor Admin</option>
                    <option value="VENDOR_COORDINATOR">Vendor Coordinator</option>
                    <option value="VENDOR_FINANCE">Vendor Finance</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Invitation Link Validity</label>
                  <select
                    value={inviteValidityHours}
                    onChange={(e) => setInviteValidityHours(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value={24}>24 Hours</option>
                    <option value={48}>48 Hours (Standard)</option>
                    <option value={72}>72 Hours</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Authorized Company Scopes</label>
                <div className="space-y-1.5 border border-slate-200 rounded-lg p-3 bg-slate-50">
                  {companyRelationships.map((rel) => {
                    const rId = rel.relationship_id || rel.id;
                    const isChecked = inviteSelectedRelIds.includes(rId);
                    return (
                      <label key={rId} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setInviteSelectedRelIds([...inviteSelectedRelIds, rId]);
                            } else {
                              setInviteSelectedRelIds(inviteSelectedRelIds.filter((x) => x !== rId));
                            }
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-semibold text-slate-800">{rel.site_name}</span>
                        <span className="text-[10px] font-mono text-slate-400">({rId})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button size="sm" variant="outline" onClick={() => setIsInviteUserModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleInviteUser}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Dispatch Invitation
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* ========================================================================= */}
        {/* MODAL 11: SUSPEND VENDOR */}
        {/* ========================================================================= */}
        {isSuspendModalOpen && (
          <Modal
            isOpen={isSuspendModalOpen}
            onClose={() => setIsSuspendModalOpen(false)}
            title="Suspend Vendor Organization"
            size="md"
          >
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                <strong className="block font-bold mb-1">Operational Impact of Suspension:</strong>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  <li>Vendor users will be locked out from logging into the portal.</li>
                  <li>New worker deployments and staffing requisitions will be blocked.</li>
                  <li>Invoice submission and commercial settlements will be halted.</li>
                  <li>Existing historical records, verified attendance, and audit logs remain intact.</li>
                </ul>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Suspension Reason *</label>
                <select
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="Statutory Non-Compliance / Expired License">Statutory Non-Compliance / Expired License</option>
                  <option value="Contract Breach / Service Quality Failure">Contract Breach / Service Quality Failure</option>
                  <option value="Commercial Dispute / Billing Discrepancy">Commercial Dispute / Billing Discrepancy</option>
                  <option value="Labour Regulatory Notice">Labour Regulatory Notice</option>
                  <option value="Company Administrative Discretion">Company Administrative Discretion</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Effective Date</label>
                <Input
                  type="date"
                  value={suspendEffectiveDate}
                  onChange={(e) => setSuspendEffectiveDate(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Audit Notes / Directives</label>
                <textarea
                  value={suspendNotes}
                  onChange={(e) => setSuspendNotes(e.target.value)}
                  placeholder="Detail any remedial actions required for reactivation..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs min-h-[70px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button size="sm" variant="outline" onClick={() => setIsSuspendModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSuspendVendor}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  Confirm Suspension
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* ========================================================================= */}
        {/* MODAL 12: ARCHIVE VENDOR (SOFT DELETE) */}
        {/* ========================================================================= */}
        {isArchiveModalOpen && (
          <Modal
            isOpen={isArchiveModalOpen}
            onClose={() => setIsArchiveModalOpen(false)}
            title="Archive Vendor (Soft Delete)"
            size="md"
          >
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                <strong className="block font-bold mb-1">Immutable Preservation Guarantee:</strong>
                <p className="text-[11px]">
                  Archiving marks this vendor organization as ARCHIVED (soft-delete). Under no circumstances are statutory muster records, 3-way match invoices, or Form V certificates destroyed. All credential tokens are revoked.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Archive Reason *</label>
                <textarea
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="Specify legal or commercial rationale for archiving..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs min-h-[70px]"
                />
              </div>

              <label className="flex items-start gap-2 cursor-pointer p-2 bg-slate-50 border border-slate-200 rounded-lg">
                <input
                  type="checkbox"
                  checked={archiveConfirmed}
                  onChange={(e) => setArchiveConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-[11px] text-slate-700">
                  I understand that archiving soft-deletes this vendor record and revokes portal access while permanently preserving all historical audit compliance data.
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button size="sm" variant="outline" onClick={() => setIsArchiveModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleArchiveVendor}
                  disabled={!archiveConfirmed}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-50"
                >
                  Archive Vendor
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* ========================================================================= */}
        {/* MODAL 13: MANAGE SCOPE */}
        {/* ========================================================================= */}
        {isManageScopeModalOpen && selectedUserForScope && (
          <Modal
            isOpen={isManageScopeModalOpen}
            onClose={() => setIsManageScopeModalOpen(false)}
            title={`Manage Relationship Scope — ${selectedUserForScope.full_name}`}
            size="md"
          >
            <div className="space-y-4 text-xs">
              <p className="text-slate-500">
                Configure which customer company relationships this vendor user is authorized to view and manage in the Vendor Portal.
              </p>

              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Select Authorized Relationships:</label>
                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                  {companyRelationships.map((rel) => {
                    const rId = rel.relationship_id || rel.id;
                    const isChecked = scopeSelectedRelIds.includes(rId);
                    return (
                      <label key={rId} className="flex items-center justify-between p-2 rounded-lg hover:bg-white transition cursor-pointer border border-transparent hover:border-slate-200">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setScopeSelectedRelIds([...scopeSelectedRelIds, rId]);
                              } else {
                                setScopeSelectedRelIds(scopeSelectedRelIds.filter((x) => x !== rId));
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <strong className="text-slate-800 block text-xs">{rel.site_name}</strong>
                            <span className="font-mono text-[10px] text-slate-500">{rId}</span>
                          </div>
                        </div>
                        <Badge variant={rel.status === 'ACTIVE' ? 'emerald' : 'amber'}>
                          {rel.status}
                        </Badge>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button size="sm" variant="outline" onClick={() => setIsManageScopeModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveScope}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Save Scope
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};
