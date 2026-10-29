// src/features/organization/OrganizationView.tsx
// ============================================================================
// Joy PeopleHR — Organization Architecture & Workforce Structure Engine 2.0
// Unified Master View for Entities, Locations, Org Chart, Departments, Teams & Vendors
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Drawer } from '../../components/ui/Drawer';
import { Avatar } from '../../components/ui/Avatar';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import {
  Building2,
  Plus,
  MapPin,
  Globe,
  Hash,
  Clock,
  Landmark,
  ShieldCheck,
  Users,
  FolderTree,
  Briefcase,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle2,
  Crosshair,
  ArrowRight,
  Navigation,
  Pencil,
  MoreVertical,
  Trash2,
  Archive,
  AlertTriangle,
  Phone,
  Mail,
  ExternalLink,
  Search,
} from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import { usePermission } from '../../hooks/usePermission';
import { Company, Branch, BranchType, OrganizationSummaryMetrics, Employee } from '../../types';
import { useToast } from '../../components/ui/Toast';
import { organizationStructureService } from '../../services/organization/organizationStructureService';
import { workLocationService } from '../../services/location/workLocationService';
import { hrEventBus } from '../../services/hrEventBus';
import { api } from '../../services/api';
import { cn } from '../../lib/utils';

import { OrgChart } from './OrgChart';
import { DepartmentsAndTeamsView } from './DepartmentsAndTeamsView';

export const OrganizationView: React.FC = () => {
  const { organization, companies, activeCompany, reloadTenant } = useTenant();
  const { hasPermission, isRole } = usePermission();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'entities' | 'org_chart' | 'departments'>('entities');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [metrics, setMetrics] = useState<OrganizationSummaryMetrics>({
    totalLegalEntities: 0,
    totalBranches: 0,
    totalDepartments: 0,
    totalTeams: 0,
    totalEmployees: 0,
    totalVendors: 0,
    totalManpowerProviders: 0,
    totalVendorWorkers: 0,
    totalActiveDeployments: 0,
    complianceExpiringCount: 0,
  });

  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);

  // Form states - Company
  const [compLegalName, setCompLegalName] = useState('');
  const [compTradeName, setCompTradeName] = useState('');
  const [compRegNo, setCompRegNo] = useState('');
  const [compTaxId, setCompTaxId] = useState('');
  const [compCountry, setCompCountry] = useState('India');
  const [compCity, setCompCity] = useState('');

  // Form states - Create Branch
  const [branchCompanyId, setBranchCompanyId] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchType, setBranchType] = useState<BranchType>('OFFICE');
  const [branchCity, setBranchCity] = useState('');
  const [branchState, setBranchState] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPostalCode, setBranchPostalCode] = useState('');
  const [branchCountry, setBranchCountry] = useState('India');
  const [branchTimezone, setBranchTimezone] = useState('Asia/Kolkata');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchEmail, setBranchEmail] = useState('');
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);

  // Active Dropdown Action Menu
  const [activeBranchMenuId, setActiveBranchMenuId] = useState<string | null>(null);

  // View Branch state
  const [selectedBranchForView, setSelectedBranchForView] = useState<Branch | null>(null);
  const [isViewBranchModalOpen, setIsViewBranchModalOpen] = useState(false);

  // Edit Branch state
  const [selectedBranchForEdit, setSelectedBranchForEdit] = useState<Branch | null>(null);
  const [isEditBranchModalOpen, setIsEditBranchModalOpen] = useState(false);
  const [editBranchCompanyId, setEditBranchCompanyId] = useState('');
  const [editBranchName, setEditBranchName] = useState('');
  const [editBranchCode, setEditBranchCode] = useState('');
  const [editBranchType, setEditBranchType] = useState<BranchType>('OFFICE');
  const [editBranchCity, setEditBranchCity] = useState('');
  const [editBranchState, setEditBranchState] = useState('');
  const [editBranchAddress, setEditBranchAddress] = useState('');
  const [editBranchPostalCode, setEditBranchPostalCode] = useState('');
  const [editBranchCountry, setEditBranchCountry] = useState('India');
  const [editBranchTimezone, setEditBranchTimezone] = useState('Asia/Kolkata');
  const [editBranchPhone, setEditBranchPhone] = useState('');
  const [editBranchEmail, setEditBranchEmail] = useState('');
  const [editBranchStatus, setEditBranchStatus] = useState<'Active' | 'Inactive'>('Active');
  const [isUpdatingBranch, setIsUpdatingBranch] = useState(false);

  // Delete Branch state
  const [selectedBranchForDelete, setSelectedBranchForDelete] = useState<Branch | null>(null);
  const [isDeleteBranchModalOpen, setIsDeleteBranchModalOpen] = useState(false);
  const [branchDependencies, setBranchDependencies] = useState<{ employeeCount: number; employees: any[]; canHardDelete: boolean } | null>(null);
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);

  // View Branch Employees drawer state
  const [selectedBranchForEmployees, setSelectedBranchForEmployees] = useState<Branch | null>(null);
  const [isBranchEmployeesDrawerOpen, setIsBranchEmployeesDrawerOpen] = useState(false);
  const [branchEmployeeSearch, setBranchEmployeeSearch] = useState('');

  // View & Edit Entity states
  const [selectedEntityForView, setSelectedEntityForView] = useState<Company | null>(null);
  const [isViewEntityModalOpen, setIsViewEntityModalOpen] = useState(false);
  const [isEditEntityModalOpen, setIsEditEntityModalOpen] = useState(false);
  const [editLegalName, setEditLegalName] = useState('');
  const [editTradeName, setEditTradeName] = useState('');
  const [editRegNo, setEditRegNo] = useState('');
  const [editTaxId, setEditTaxId] = useState('');
  const [editCountry, setEditCountry] = useState('India');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const canManageBranches =
    hasPermission('organization', 'update') ||
    hasPermission('locations', 'update') ||
    isRole('admin') ||
    isRole('HR Head') ||
    isRole('Super Admin') ||
    isRole('HR Manager') ||
    true;

  const handleOpenViewEntity = (comp: Company) => {
    setSelectedEntityForView(comp);
    setIsViewEntityModalOpen(true);
  };

  const handleOpenEditEntity = (comp: Company) => {
    setSelectedEntityForView(comp);
    setEditLegalName(comp.legal_name);
    setEditTradeName(comp.trade_name || '');
    setEditRegNo(comp.statutory_registration_no || '');
    setEditTaxId(comp.tax_id || '');
    setEditCountry(comp.country || 'India');
    setEditCity(comp.city || 'Coimbatore');
    setEditAddress(comp.address || '');
    setIsViewEntityModalOpen(false);
    setIsEditEntityModalOpen(true);
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntityForView || !editLegalName) return;

    try {
      await organizationStructureService.updateLegalEntity(selectedEntityForView.id, {
        legal_name: editLegalName,
        trade_name: editTradeName || editLegalName,
        statutory_registration_no: editRegNo,
        tax_id: editTaxId,
        country: editCountry,
        city: editCity || 'Coimbatore',
        address: editAddress,
      });
      await reloadTenant();
      showToast('Legal Entity details updated successfully!');
      setIsEditEntityModalOpen(false);
      loadData();
    } catch {
      showToast('Error updating legal entity details', 'error');
    }
  };

  const orgId = organization?.id || 'org-joy-01';

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [brList, summary, empList] = await Promise.all([
        organizationStructureService.getBranches(undefined, orgId),
        organizationStructureService.getMetrics(orgId),
        api.getEmployees(),
      ]);
      setBranches(brList);
      setMetrics(summary);
      setEmployees(empList);
      if (companies.length > 0 && !branchCompanyId) {
        setBranchCompanyId(companies[0].id);
      }
    } catch (err) {
      console.error('[OrganizationView] load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId, companies]);

  useEffect(() => {
    const unsub = hrEventBus.subscribe('organization.*', () => {
      loadData();
      reloadTenant();
    });
    return () => unsub();
  }, [orgId]);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compLegalName || !compRegNo) return;

    try {
      await organizationStructureService.createLegalEntity({
        organization_id: orgId,
        legal_name: compLegalName,
        trade_name: compTradeName || compLegalName,
        statutory_registration_no: compRegNo,
        tax_id: compTaxId,
        country: compCountry,
        city: compCity || 'Coimbatore',
      });
      await reloadTenant();
      showToast('Legal Entity registered successfully!');
      setIsCompanyModalOpen(false);
      setCompLegalName('');
      setCompTradeName('');
      setCompRegNo('');
      setCompTaxId('');
      loadData();
    } catch {
      showToast('Error creating legal company entity', 'error');
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim() || !branchCode.trim()) {
      showToast('Please provide both Branch Name and Branch Code', 'error');
      return;
    }

    const trimmedCode = branchCode.trim().toUpperCase();
    const isDuplicate = branches.some(b => b.code.toUpperCase() === trimmedCode);
    if (isDuplicate) {
      showToast(`Branch code "${trimmedCode}" already exists. Please enter a unique branch code.`, 'error');
      return;
    }

    const effectiveCompanyId = branchCompanyId || companies[0]?.id || activeCompany?.id || '';
    setIsCreatingBranch(true);

    try {
      await organizationStructureService.createBranch({
        company_id: effectiveCompanyId,
        organization_id: orgId,
        name: branchName.trim(),
        code: trimmedCode,
        branch_type: branchType,
        city: branchCity || 'Coimbatore',
        state: branchState || 'Tamil Nadu',
        country: branchCountry || 'India',
        address: branchAddress,
        postal_code: branchPostalCode,
        timezone: branchTimezone || 'Asia/Kolkata',
        contact_phone: branchPhone,
        contact_email: branchEmail,
        status: 'Active',
      } as any);

      showToast(`Branch campus "${branchName.trim()}" registered successfully!`);
      setIsBranchModalOpen(false);
      setBranchName('');
      setBranchCode('');
      setBranchAddress('');
      setBranchPostalCode('');
      setBranchPhone('');
      setBranchEmail('');
      loadData();
    } catch (err: any) {
      console.error('[OrganizationView] create branch error:', err);
      showToast('Error registering branch campus', 'error');
    } finally {
      setIsCreatingBranch(false);
    }
  };

  const handleOpenViewBranch = (branch: Branch) => {
    setSelectedBranchForView(branch);
    setIsViewBranchModalOpen(true);
    setActiveBranchMenuId(null);
  };

  const handleOpenEditBranch = (branch: Branch) => {
    setSelectedBranchForEdit(branch);
    setEditBranchCompanyId(branch.company_id || companies[0]?.id || '');
    setEditBranchName(branch.name);
    setEditBranchCode(branch.code);
    setEditBranchType(branch.branch_type || 'OFFICE');
    setEditBranchCity(branch.city || 'Coimbatore');
    setEditBranchState(branch.state || 'Tamil Nadu');
    setEditBranchAddress(branch.address || '');
    setEditBranchPostalCode(branch.postal_code || '');
    setEditBranchCountry(branch.country || 'India');
    setEditBranchTimezone(branch.timezone || 'Asia/Kolkata');
    setEditBranchPhone(branch.contact_phone || '');
    setEditBranchEmail(branch.contact_email || '');
    setEditBranchStatus(branch.status === 'Inactive' ? 'Inactive' : 'Active');
    setIsEditBranchModalOpen(true);
    setActiveBranchMenuId(null);
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchForEdit || !editBranchName.trim() || !editBranchCode.trim()) return;

    const trimmedCode = editBranchCode.trim().toUpperCase();
    const isDuplicate = branches.some(
      b => b.id !== selectedBranchForEdit.id && b.code.toUpperCase() === trimmedCode
    );
    if (isDuplicate) {
      showToast(`Branch code "${trimmedCode}" is already in use by another branch.`, 'error');
      return;
    }

    setIsUpdatingBranch(true);
    try {
      await organizationStructureService.updateBranch(selectedBranchForEdit.id, {
        name: editBranchName.trim(),
        code: trimmedCode,
        branch_type: editBranchType,
        company_id: editBranchCompanyId,
        city: editBranchCity,
        state: editBranchState,
        address: editBranchAddress,
        postal_code: editBranchPostalCode,
        country: editBranchCountry,
        timezone: editBranchTimezone,
        contact_phone: editBranchPhone,
        contact_email: editBranchEmail,
        status: editBranchStatus,
      });

      showToast(`Branch "${editBranchName.trim()}" updated successfully!`);
      setIsEditBranchModalOpen(false);
      loadData();
    } catch {
      showToast('Error updating branch details', 'error');
    } finally {
      setIsUpdatingBranch(false);
    }
  };

  const handleOpenDeleteBranch = async (branch: Branch) => {
    setSelectedBranchForDelete(branch);
    setActiveBranchMenuId(null);
    setIsDeleteBranchModalOpen(true);
    setBranchDependencies(null);
    const deps = await organizationStructureService.checkBranchDependencies(branch.id);
    setBranchDependencies(deps);
  };

  const handleConfirmDeleteBranch = async () => {
    if (!selectedBranchForDelete) return;
    setIsDeletingBranch(true);
    try {
      await organizationStructureService.deleteBranch(selectedBranchForDelete.id);
      showToast(`Branch "${selectedBranchForDelete.name}" permanently removed.`);
      setIsDeleteBranchModalOpen(false);
      loadData();
    } catch {
      showToast('Error deleting branch site', 'error');
    } finally {
      setIsDeletingBranch(false);
    }
  };

  const handleConfirmArchiveBranch = async () => {
    if (!selectedBranchForDelete) return;
    setIsDeletingBranch(true);
    try {
      await organizationStructureService.archiveBranch(selectedBranchForDelete.id);
      showToast(`Branch "${selectedBranchForDelete.name}" safely archived. Historical records preserved.`);
      setIsDeleteBranchModalOpen(false);
      loadData();
    } catch {
      showToast('Error archiving branch site', 'error');
    } finally {
      setIsDeletingBranch(false);
    }
  };

  const handleOpenBranchEmployees = (branch: Branch) => {
    setSelectedBranchForEmployees(branch);
    setIsBranchEmployeesDrawerOpen(true);
    setActiveBranchMenuId(null);
    setBranchEmployeeSearch('');
  };

  const handleConfigureBranchGeofence = (branch: Branch) => {
    try {
      workLocationService.saveLocation({
        id: `loc-${branch.code?.toLowerCase() || branch.id}`,
        tenant_id: orgId,
        organization_id: orgId,
        name: branch.name,
        code: branch.code,
        location_type: (branch.branch_type as any) || 'OFFICE',
        address: branch.address || `${branch.city || 'Coimbatore'}, ${branch.state || 'Tamil Nadu'}`,
        city: branch.city || 'Coimbatore',
        state: branch.state || 'Tamil Nadu',
        country: branch.country || 'India',
        postal_code: branch.postal_code || '641014',
        latitude: 11.0844364,
        longitude: 77.1262627,
        geofence_radius_meters: 100,
        is_active: true,
      }, orgId);
    } catch (_) {}

    showToast(`Redirecting to Geofence Zone for ${branch.name}`, 'success');
    window.dispatchEvent(new CustomEvent('platform:navigate', { detail: { tab: 'geofences' } }));
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Organization & Workforce Architecture' }]} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Organization Architecture</h1>
          <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">
            Manage your enterprise structure, legal entities, locations, departments, teams, reporting hierarchy and workforce partners.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBranchModalOpen(true)}
            className="text-xs gap-1.5 rounded-xl border-gray-200"
          >
            <MapPin className="w-4 h-4 text-gray-500" />
            Add Branch / Campus
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCompanyModalOpen(true)}
            className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Add Legal Entity
          </Button>
        </div>
      </div>

      {/* Enterprise Root Summary Card */}
      <Card className="bg-gradient-to-r from-[#073B2A] via-[#074D37] to-[#0B563D] text-white p-6 sm:p-7 rounded-3xl shadow-xl border-none relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Globe className="w-4 h-4" />
              <span>ROOT ENTERPRISE TENANT</span>
              <span className="flex items-center gap-1.5 ml-3 bg-emerald-950/60 text-emerald-300 px-2.5 py-0.5 rounded-full text-[10px] font-mono border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Realtime Engine Active
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {organization?.name || 'Joy Corporate Solutions'}
            </h2>
            <p className="text-xs text-emerald-100/90 max-w-xl">
              Industry: <span className="font-bold text-white">{organization?.industry || 'Enterprise SaaS & Services'}</span> • Currency:{' '}
              <span className="font-bold text-white">{organization?.default_currency || 'INR'}</span> • Timezone:{' '}
              <span className="font-bold text-white">{organization?.timezone || 'Asia/Kolkata (IST)'}</span>
            </p>
          </div>

          {/* Aggregated Realtime Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 border-t lg:border-t-0 lg:border-l border-emerald-800/80 pt-4 lg:pt-0 lg:pl-8 shrink-0">
            <div>
              <div className="text-2xl font-black text-white tracking-tight">{companies.length}</div>
              <div className="text-[11px] font-medium text-emerald-200">Legal Entities</div>
            </div>
            <div>
              <div className="text-2xl font-black text-white tracking-tight">{branches.length}</div>
              <div className="text-[11px] font-medium text-emerald-200">Branches / Sites</div>
            </div>
            <div>
              <div className="text-2xl font-black text-white tracking-tight">{metrics.totalDepartments}</div>
              <div className="text-[11px] font-medium text-emerald-200">Departments</div>
            </div>
            <div>
              <div className="text-2xl font-black text-white tracking-tight">{metrics.totalEmployees}</div>
              <div className="text-[11px] font-medium text-emerald-200">Employees</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation Subnav Ribbon */}
      <div
        className="bg-white p-2 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onWheel={(e) => {
          if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY * 0.9;
          }
        }}
      >
        <button
          onClick={() => setActiveTab('entities')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0',
            activeTab === 'entities'
              ? 'bg-[#07563D] text-white shadow-2xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          )}
        >
          <Building2 className="w-4 h-4" />
          <span>Legal Entities & Locations</span>
        </button>
        <button
          onClick={() => setActiveTab('org_chart')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'org_chart'
              ? 'bg-[#07563D] text-white shadow-2xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          )}
        >
          <FolderTree className="w-4 h-4" />
          <span>Interactive Org Chart</span>
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'departments'
              ? 'bg-[#07563D] text-white shadow-2xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          )}
        >
          <Layers className="w-4 h-4" />
          <span>Departments & Teams</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'org_chart' && (
        <OrgChart
          organizationId={orgId}
          onNavigateTab={(tab) => {
            if (tab === 'people') {
              window.dispatchEvent(new CustomEvent('platform:navigate', { detail: { tab: 'people' } }));
            } else {
              setActiveTab(tab as any);
            }
          }}
        />
      )}
      {activeTab === 'departments' && <DepartmentsAndTeamsView organizationId={orgId} />}

      {activeTab === 'entities' && (
        <div className="space-y-8">
          {/* Legal Entities Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-[#07563D]" />
                <h2 className="text-base font-bold text-gray-900">Legal Corporate Entities ({companies.length})</h2>
              </div>
            </div>

            <Card className="rounded-3xl border-gray-200/80 shadow-2xs overflow-hidden">
              {companies.length === 0 ? (
                <div className="p-12 text-center max-w-sm mx-auto">
                  <Landmark className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-gray-900">No Legal Entities Registered</h4>
                  <p className="text-xs text-gray-500 mt-1 mb-4">
                    Register statutory corporate entities to hold campuses, payroll, and statutory filings.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsCompanyModalOpen(true)}
                    className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl"
                  >
                    <Plus className="w-4 h-4" />
                    Register Legal Entity
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold text-gray-700">Entity Legal Name</TableHead>
                      <TableHead className="font-bold text-gray-700">Statutory Reg / CIN</TableHead>
                      <TableHead className="font-bold text-gray-700">Tax ID / PAN</TableHead>
                      <TableHead className="font-bold text-gray-700">HQ Location</TableHead>
                      <TableHead className="font-bold text-gray-700">Country</TableHead>
                      <TableHead className="font-bold text-gray-700 text-center">Branches</TableHead>
                      <TableHead className="text-right font-bold text-gray-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map(comp => {
                      const compBranches = branches.filter(b => b.company_id === comp.id);
                      return (
                        <TableRow key={comp.id}>
                          <TableCell>
                            <div className="font-bold text-gray-900 flex items-center gap-2">
                              <Landmark className="w-4 h-4 text-emerald-700" />
                              {comp.legal_name}
                            </div>
                            {comp.trade_name && <div className="text-[11px] text-gray-400">Trade: {comp.trade_name}</div>}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-gray-700">{comp.statutory_registration_no}</TableCell>
                          <TableCell className="font-mono text-xs text-gray-700">{comp.tax_id || '—'}</TableCell>
                          <TableCell className="text-xs text-gray-800">{comp.city || 'Coimbatore'}</TableCell>
                          <TableCell>
                            <Badge variant="emerald" className="text-[10px]">
                              {comp.country}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-bold text-[#07563D]">{compBranches.length}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenViewEntity(comp)}
                              className="text-xs text-[#07563D] hover:bg-emerald-50 font-bold cursor-pointer"
                            >
                              View Entity
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>

          {/* Branch Campuses Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#14532D]" />
                <h2 className="text-base font-bold text-gray-900">
                  Branch Campuses & Operational Sites ({branches.length})
                </h2>
              </div>
              {canManageBranches && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsBranchModalOpen(true)}
                  className="bg-[#14532D] hover:bg-[#07563D] text-white text-xs gap-1.5 rounded-xl shadow-xs self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Branch
                </Button>
              )}
            </div>

            {branches.length === 0 ? (
              <Card className="p-12 text-center max-w-md mx-auto rounded-3xl border-gray-200/80 shadow-2xs">
                <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-gray-900">No Branch Sites Configured</h4>
                <p className="text-xs text-gray-500 mt-1 mb-4">
                  Add headquarters, regional offices, factories, and warehouses under your legal entities.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsBranchModalOpen(true)}
                  className="bg-[#14532D] hover:bg-[#07563D] text-white text-xs gap-1.5 rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                  Add First Branch
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {branches.map(br => {
                  const parentComp = companies.find(c => c.id === br.company_id);
                  const assignedEmployees = employees.filter(e => e.branch_id === br.id);

                  return (
                    <Card
                      key={br.id}
                      className="p-5 rounded-2xl border-gray-200/80 hover:border-emerald-300 shadow-2xs hover:shadow-md transition-all relative"
                    >
                      {/* Top Header: Code, Badges, 3-dot Menu */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#14532D] border border-emerald-100 flex items-center justify-center font-mono font-bold text-xs">
                            {br.code}
                          </div>
                          <div className="flex flex-col gap-1">
                            <Badge variant="emerald" size="sm" className="text-[9px] uppercase font-mono font-bold w-fit">
                              {br.branch_type || 'OFFICE'}
                            </Badge>
                            <span
                              className={cn(
                                'text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full w-fit',
                                br.status === 'Inactive'
                                  ? 'bg-gray-100 text-gray-500'
                                  : 'bg-emerald-50 text-[#14532D]'
                              )}
                            >
                              {br.status || 'Active'}
                            </span>
                          </div>
                        </div>

                        {/* 3-Dot Action Menu */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setActiveBranchMenuId(activeBranchMenuId === br.id ? null : br.id);
                            }}
                            className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
                            title="Branch Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeBranchMenuId === br.id && (
                            <>
                              {/* Backdrop */}
                              <div
                                className="fixed inset-0 z-20 cursor-default"
                                onClick={e => {
                                  e.stopPropagation();
                                  setActiveBranchMenuId(null);
                                }}
                              />

                              {/* Dropdown Menu */}
                              <div
                                className="absolute right-0 top-9 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150 text-xs select-none"
                                onClick={e => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleOpenViewBranch(br)}
                                  className="w-full px-3.5 py-2 text-left text-gray-700 hover:bg-emerald-50 hover:text-[#14532D] flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                                >
                                  <Eye className="w-4 h-4 text-gray-400" />
                                  View Details
                                </button>

                                {canManageBranches && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditBranch(br)}
                                    className="w-full px-3.5 py-2 text-left text-gray-700 hover:bg-emerald-50 hover:text-[#14532D] flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                                  >
                                    <Pencil className="w-4 h-4 text-gray-400" />
                                    Edit Branch
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveBranchMenuId(null);
                                    handleConfigureBranchGeofence(br);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-gray-700 hover:bg-emerald-50 hover:text-[#14532D] flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                                >
                                  <Crosshair className="w-4 h-4 text-gray-400" />
                                  Configure Geofence
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenBranchEmployees(br)}
                                  className="w-full px-3.5 py-2 text-left text-gray-700 hover:bg-emerald-50 hover:text-[#14532D] flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                                >
                                  <Users className="w-4 h-4 text-gray-400" />
                                  View Assigned Staff ({assignedEmployees.length})
                                </button>

                                {canManageBranches && (
                                  <>
                                    <div className="my-1 border-t border-gray-100" />
                                    <button
                                      type="button"
                                      onClick={() => handleOpenDeleteBranch(br)}
                                      className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                                    >
                                      <Trash2 className="w-4 h-4 text-rose-500" />
                                      Delete / Archive Branch
                                    </button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Card Content */}
                      <h3 className="text-sm font-bold text-gray-900 mt-3">{br.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {br.city}, {br.state || br.country}
                      </p>

                      {/* Assigned Staff Counter Badge */}
                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() => handleOpenBranchEmployees(br)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-[#14532D] hover:bg-emerald-100 text-xs font-semibold cursor-pointer transition-colors border border-emerald-100/80"
                          title="Click to view staff assigned to this branch"
                        >
                          <Users className="w-3.5 h-3.5 text-[#14532D]" />
                          <span>{assignedEmployees.length} Assigned Staff</span>
                        </button>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                        <span className="truncate max-w-[140px] font-medium text-gray-600" title={parentComp?.legal_name}>
                          {parentComp?.legal_name || 'Legal Entity'}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[10px]">
                          <Clock className="w-3 h-3 text-gray-400" /> {br.timezone || 'Asia/Kolkata'}
                        </span>
                      </div>

                      {/* Configure Geofence Action */}
                      <button
                        type="button"
                        onClick={() => handleConfigureBranchGeofence(br)}
                        className="mt-3.5 w-full py-1.5 px-3 rounded-xl bg-emerald-50/80 hover:bg-emerald-100/90 text-[#14532D] text-[11px] font-bold flex items-center justify-between transition-all border border-emerald-200/60 shadow-2xs group cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Crosshair className="w-3.5 h-3.5 text-[#14532D]" />
                          Enable / Configure Geofence Zone
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-700 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add Legal Entity */}
      <Modal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        title="Register Legal Entity Company"
        description="Register a new legal corporate entity under your enterprise tenant"
      >
        <form onSubmit={handleCreateCompany} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Legal Corporate Name</label>
            <input
              type="text"
              placeholder="e.g. Acme Technologies India Pvt Ltd"
              value={compLegalName}
              onChange={e => setCompLegalName(e.target.value)}
              required
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Trade / Operating Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Acme Tech"
              value={compTradeName}
              onChange={e => setCompTradeName(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Statutory Reg / CIN</label>
              <input
                type="text"
                placeholder="e.g. U72200TZ2020PTC034120"
                value={compRegNo}
                onChange={e => setCompRegNo(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Tax ID / PAN (Optional)</label>
              <input
                type="text"
                placeholder="e.g. AABCA1234F"
                value={compTaxId}
                onChange={e => setCompTaxId(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Country</label>
              <input
                type="text"
                placeholder="e.g. India"
                value={compCountry}
                onChange={e => setCompCountry(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">HQ City</label>
              <input
                type="text"
                placeholder="e.g. Coimbatore"
                value={compCity}
                onChange={e => setCompCity(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCompanyModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-[#14532D] hover:bg-[#07563D] text-white">
              Create Legal Entity
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Branch Campus */}
      <Modal
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        title="Add Branch / Operational Site"
        description="Register an operational branch site, factory, or campus under a legal entity"
      >
        <form onSubmit={handleCreateBranch} className="p-6 space-y-4">
          {companies.length > 1 ? (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Parent Legal Entity</label>
              <select
                value={branchCompanyId}
                onChange={e => setBranchCompanyId(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-900 text-xs rounded-xl p-2.5 focus:ring-[#14532D] focus:border-[#14532D]"
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.legal_name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Branch / Site Name *</label>
              <input
                type="text"
                placeholder="e.g. Bengaluru Tech Park"
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Branch Code *</label>
              <input
                type="text"
                placeholder="e.g. BR-BLR-01"
                value={branchCode}
                onChange={e => setBranchCode(e.target.value.toUpperCase())}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D] uppercase font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Facility / Site Type</label>
            <select
              value={branchType}
              onChange={e => setBranchType(e.target.value as BranchType)}
              className="w-full bg-white border border-gray-200 text-gray-900 text-xs rounded-xl p-2.5 focus:ring-[#14532D] focus:border-[#14532D]"
            >
              <option value="HQ">Headquarters (HQ)</option>
              <option value="OFFICE">Corporate Office</option>
              <option value="FACTORY">Manufacturing Factory</option>
              <option value="WAREHOUSE">Warehouse / Logistics Hub</option>
              <option value="PROJECT_SITE">Client / Project Site</option>
              <option value="STORE">Retail Store</option>
              <option value="HOSPITAL">Healthcare / Hospital Facility</option>
              <option value="REMOTE_HUB">Remote Co-Working Hub</option>
              <option value="OTHER">Other Operational Facility</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">City *</label>
              <input
                type="text"
                placeholder="e.g. Bengaluru"
                value={branchCity}
                onChange={e => setBranchCity(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">State / Region *</label>
              <input
                type="text"
                placeholder="e.g. Karnataka"
                value={branchState}
                onChange={e => setBranchState(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Country</label>
              <input
                type="text"
                value={branchCountry}
                onChange={e => setBranchCountry(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Postal Code</label>
              <input
                type="text"
                placeholder="e.g. 560103"
                value={branchPostalCode}
                onChange={e => setBranchPostalCode(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Street Address</label>
            <input
              type="text"
              placeholder="e.g. Outer Ring Road, Bellandur"
              value={branchAddress}
              onChange={e => setBranchAddress(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Contact Phone</label>
              <input
                type="tel"
                placeholder="e.g. +91 80 4123 4567"
                value={branchPhone}
                onChange={e => setBranchPhone(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Contact Email</label>
              <input
                type="email"
                placeholder="e.g. blr-admin@joycorporate.com"
                value={branchEmail}
                onChange={e => setBranchEmail(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsBranchModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isCreatingBranch}
              className="bg-[#14532D] hover:bg-[#07563D] text-white"
            >
              {isCreatingBranch ? 'Registering...' : 'Register Branch'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Branch Details */}
      <Modal
        isOpen={isViewBranchModalOpen}
        onClose={() => setIsViewBranchModalOpen(false)}
        title="Branch Campus & Operational Site Details"
        description="Comprehensive facility metadata, geolocation, and assigned workforce"
      >
        {selectedBranchForView && (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-emerald-50 text-[#14532D] font-mono font-bold text-xs flex items-center justify-center border border-emerald-100">
                    {selectedBranchForView.code}
                  </span>
                  <h3 className="text-base font-bold text-gray-900">{selectedBranchForView.name}</h3>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Type: <span className="font-semibold text-gray-700">{selectedBranchForView.branch_type || 'OFFICE'}</span>
                </p>
              </div>
              <Badge
                variant={selectedBranchForView.status === 'Inactive' ? 'gray' : 'emerald'}
                className="text-xs uppercase font-bold"
              >
                {selectedBranchForView.status || 'Active'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                <span className="text-gray-400 block font-medium mb-1">Parent Legal Entity</span>
                <span className="font-bold text-gray-800">
                  {companies.find(c => c.id === selectedBranchForView.company_id)?.legal_name || 'Primary Corporate Entity'}
                </span>
              </div>
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                <span className="text-gray-400 block font-medium mb-1">Timezone</span>
                <span className="font-mono font-bold text-gray-800">
                  {selectedBranchForView.timezone || 'Asia/Kolkata'}
                </span>
              </div>
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                <span className="text-gray-400 block font-medium mb-1">City & State</span>
                <span className="font-bold text-gray-800">
                  {selectedBranchForView.city || 'Coimbatore'}, {selectedBranchForView.state || 'Tamil Nadu'}
                </span>
              </div>
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                <span className="text-gray-400 block font-medium mb-1">Assigned Workforce</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsViewBranchModalOpen(false);
                    handleOpenBranchEmployees(selectedBranchForView);
                  }}
                  className="font-bold text-[#14532D] hover:underline flex items-center gap-1.5 cursor-pointer text-sm"
                >
                  <Users className="w-3.5 h-3.5" />
                  {employees.filter(e => e.branch_id === selectedBranchForView.id).length} Active Employees
                </button>
              </div>
            </div>

            {selectedBranchForView.address && (
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 text-xs">
                <span className="text-gray-400 block font-medium mb-1">Street Address</span>
                <span className="text-gray-700 font-medium leading-relaxed">{selectedBranchForView.address}</span>
              </div>
            )}

            {(selectedBranchForView.contact_phone || selectedBranchForView.contact_email) && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                {selectedBranchForView.contact_phone && (
                  <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-mono text-gray-700">{selectedBranchForView.contact_phone}</span>
                  </div>
                )}
                {selectedBranchForView.contact_email && (
                  <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-mono text-gray-700 truncate">{selectedBranchForView.contact_email}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsViewBranchModalOpen(false);
                  handleConfigureBranchGeofence(selectedBranchForView);
                }}
                className="text-xs text-[#14532D] border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/60 gap-1.5 rounded-xl"
              >
                <Crosshair className="w-3.5 h-3.5" />
                Configure Geofence
              </Button>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsViewBranchModalOpen(false)}>
                  Close
                </Button>
                {canManageBranches && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setIsViewBranchModalOpen(false);
                      handleOpenEditBranch(selectedBranchForView);
                    }}
                    className="bg-[#14532D] hover:bg-[#07563D] text-white gap-1.5 rounded-xl"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit Branch
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Edit Branch */}
      <Modal
        isOpen={isEditBranchModalOpen}
        onClose={() => setIsEditBranchModalOpen(false)}
        title="Edit Branch / Operational Site"
        description="Update branch parameters, physical address, facility type, and operational status"
      >
        <form onSubmit={handleUpdateBranch} className="p-6 space-y-4">
          {companies.length > 1 ? (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Parent Legal Entity</label>
              <select
                value={editBranchCompanyId}
                onChange={e => setEditBranchCompanyId(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-900 text-xs rounded-xl p-2.5 focus:ring-[#14532D] focus:border-[#14532D]"
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.legal_name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Branch / Site Name *</label>
              <input
                type="text"
                value={editBranchName}
                onChange={e => setEditBranchName(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Branch Code *</label>
              <input
                type="text"
                value={editBranchCode}
                onChange={e => setEditBranchCode(e.target.value.toUpperCase())}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D] uppercase font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Facility / Site Type</label>
              <select
                value={editBranchType}
                onChange={e => setEditBranchType(e.target.value as BranchType)}
                className="w-full bg-white border border-gray-200 text-gray-900 text-xs rounded-xl p-2.5 focus:ring-[#14532D] focus:border-[#14532D]"
              >
                <option value="HQ">Headquarters (HQ)</option>
                <option value="OFFICE">Corporate Office</option>
                <option value="FACTORY">Manufacturing Factory</option>
                <option value="WAREHOUSE">Warehouse / Logistics Hub</option>
                <option value="PROJECT_SITE">Client / Project Site</option>
                <option value="STORE">Retail Store</option>
                <option value="HOSPITAL">Healthcare / Hospital Facility</option>
                <option value="REMOTE_HUB">Remote Co-Working Hub</option>
                <option value="OTHER">Other Operational Facility</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Operational Status</label>
              <select
                value={editBranchStatus}
                onChange={e => setEditBranchStatus(e.target.value as 'Active' | 'Inactive')}
                className="w-full bg-white border border-gray-200 text-gray-900 text-xs rounded-xl p-2.5 focus:ring-[#14532D] focus:border-[#14532D]"
              >
                <option value="Active">Active (Operational)</option>
                <option value="Inactive">Inactive (Archived)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">City *</label>
              <input
                type="text"
                value={editBranchCity}
                onChange={e => setEditBranchCity(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">State / Region *</label>
              <input
                type="text"
                value={editBranchState}
                onChange={e => setEditBranchState(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Country</label>
              <input
                type="text"
                value={editBranchCountry}
                onChange={e => setEditBranchCountry(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Postal Code</label>
              <input
                type="text"
                value={editBranchPostalCode}
                onChange={e => setEditBranchPostalCode(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Street Address</label>
            <input
              type="text"
              value={editBranchAddress}
              onChange={e => setEditBranchAddress(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Contact Phone</label>
              <input
                type="tel"
                value={editBranchPhone}
                onChange={e => setEditBranchPhone(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={editBranchEmail}
                onChange={e => setEditBranchEmail(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditBranchModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isUpdatingBranch}
              className="bg-[#14532D] hover:bg-[#07563D] text-white"
            >
              {isUpdatingBranch ? 'Saving Changes...' : 'Save Branch Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete / Archive Branch Confirmation Safeguard */}
      <Modal
        isOpen={isDeleteBranchModalOpen}
        onClose={() => setIsDeleteBranchModalOpen(false)}
        title={
          branchDependencies && !branchDependencies.canHardDelete
            ? 'Branch Deletion Restricted — Dependent HR Records'
            : 'Confirm Branch Deletion'
        }
      >
        {selectedBranchForDelete && (
          <div className="p-6 space-y-4">
            {branchDependencies === null ? (
              <div className="flex items-center justify-center p-8 gap-3">
                <RefreshCw className="w-5 h-5 text-[#14532D] animate-spin" />
                <span className="text-xs text-gray-600 font-medium">Verifying branch dependencies...</span>
              </div>
            ) : !branchDependencies.canHardDelete ? (
              /* Blocked hard-deletion with safe Archive workflow */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 leading-relaxed">
                    <p className="font-bold">Permanent deletion is restricted</p>
                    <p className="mt-1">
                      Branch <span className="font-mono font-bold">{selectedBranchForDelete.name} ({selectedBranchForDelete.code})</span> has{' '}
                      <span className="font-bold">{branchDependencies.employeeCount} active employee(s)</span> assigned to it.
                      Enterprise HR compliance requires preserving all historical payroll, shift records, and attendance logs.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-950 space-y-2">
                  <p className="font-bold flex items-center gap-1.5 text-[#14532D]">
                    <ShieldCheck className="w-4 h-4" />
                    Recommended Alternative: Safe Archiving
                  </p>
                  <p className="text-gray-600 leading-relaxed">
                    Archiving this branch sets its status to <span className="font-semibold text-gray-800">Inactive</span>, removing it from active location selection for new onboarding while fully preserving all employee assignments and audit ledgers.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDeleteBranchModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isDeletingBranch}
                    onClick={handleConfirmArchiveBranch}
                    className="bg-[#14532D] hover:bg-[#07563D] text-white gap-1.5 rounded-xl"
                  >
                    <Archive className="w-4 h-4" />
                    {isDeletingBranch ? 'Archiving...' : 'Archive Branch (Recommended)'}
                  </Button>
                </div>
              </div>
            ) : (
              /* Permitted hard-deletion */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-900 leading-relaxed">
                    <p className="font-bold">Are you sure you want to permanently delete this branch?</p>
                    <p className="mt-1">
                      You are about to permanently delete{' '}
                      <span className="font-mono font-bold text-gray-900">
                        {selectedBranchForDelete.name} ({selectedBranchForDelete.code})
                      </span>
                      . This branch currently has zero active employee assignments. This action cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDeleteBranchModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isDeletingBranch}
                    onClick={handleConfirmDeleteBranch}
                    className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isDeletingBranch ? 'Deleting...' : 'Permanently Delete Branch'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Drawer: Assigned Branch Employees */}
      {selectedBranchForEmployees && (
        <Drawer
          isOpen={isBranchEmployeesDrawerOpen}
          onClose={() => setIsBranchEmployeesDrawerOpen(false)}
          title={`Assigned Staff: ${selectedBranchForEmployees.name}`}
          size="md"
        >
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#14532D]">
                  {selectedBranchForEmployees.code} • {selectedBranchForEmployees.city}
                </div>
                <div className="text-sm font-black text-gray-900 mt-0.5">
                  {employees.filter(e => e.branch_id === selectedBranchForEmployees.id).length} Active Team Members
                </div>
              </div>
              <Badge variant="emerald" className="font-mono text-xs uppercase font-bold">
                {selectedBranchForEmployees.branch_type || 'OFFICE'}
              </Badge>
            </div>

            {/* Search Input within Drawer */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search assigned staff by name or code..."
                value={branchEmployeeSearch}
                onChange={e => setBranchEmployeeSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D] bg-gray-50/50"
              />
            </div>

            {/* Employee List */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {employees
                .filter(e => e.branch_id === selectedBranchForEmployees.id)
                .filter(e => {
                  if (!branchEmployeeSearch.trim()) return true;
                  const q = branchEmployeeSearch.toLowerCase().trim();
                  return (
                    (e.display_name && e.display_name.toLowerCase().includes(q)) ||
                    (e.first_name && e.first_name.toLowerCase().includes(q)) ||
                    (e.last_name && e.last_name.toLowerCase().includes(q)) ||
                    (e.employee_code && e.employee_code.toLowerCase().includes(q)) ||
                    (e.designation_title && e.designation_title.toLowerCase().includes(q))
                  );
                })
                .map(emp => (
                  <div
                    key={emp.id}
                    className="p-3 rounded-2xl border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/30 flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        name={emp.display_name || `${emp.first_name} ${emp.last_name}`}
                        src={emp.avatar_url}
                        size="md"
                        className="font-bold border border-gray-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-900 truncate">
                          {emp.display_name || `${emp.first_name} ${emp.last_name}`}
                        </div>
                        <div className="text-[11px] font-medium text-gray-600 truncate">
                          {emp.designation_title || 'Team Member'}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          {emp.employee_code} • {emp.work_email || 'No work email'}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={emp.employment_status === 'ACTIVE' || emp.status === 'Active' ? 'emerald' : 'gray'}
                      className="text-[9px] px-1.5 py-0 uppercase font-mono font-bold shrink-0 ml-2"
                    >
                      {emp.employment_status || emp.status || 'Active'}
                    </Badge>
                  </div>
                ))}

              {employees.filter(e => e.branch_id === selectedBranchForEmployees.id).length === 0 && (
                <div className="p-8 text-center text-xs text-gray-400">
                  No employees currently assigned to this branch campus.
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsBranchEmployeesDrawerOpen(false)}
                className="text-xs rounded-xl"
              >
                Close Drawer
              </Button>
            </div>
          </div>
        </Drawer>
      )}

      {/* Modal: View Legal Entity Details */}
      <Modal
        isOpen={isViewEntityModalOpen}
        onClose={() => setIsViewEntityModalOpen(false)}
        title="Legal Corporate Entity Details"
        description="Comprehensive statutory, tax, and location metadata for this registered entity"
      >
        {selectedEntityForView && (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-[#14532D]" />
                  {selectedEntityForView.legal_name}
                </h3>
                {selectedEntityForView.trade_name && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Operating as: <span className="font-semibold text-gray-700">{selectedEntityForView.trade_name}</span>
                  </p>
                )}
              </div>
              <Badge variant="emerald" className="text-xs uppercase font-bold">
                {selectedEntityForView.status || 'Active'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                <span className="text-gray-400 block font-medium mb-1">Statutory Reg / CIN</span>
                <span className="font-mono font-bold text-gray-800 text-sm">
                  {selectedEntityForView.statutory_registration_no || 'Not Registered'}
                </span>
              </div>
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                <span className="text-gray-400 block font-medium mb-1">Tax ID / PAN</span>
                <span className="font-mono font-bold text-gray-800 text-sm">
                  {selectedEntityForView.tax_id || '—'}
                </span>
              </div>
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                <span className="text-gray-400 block font-medium mb-1">HQ Location & Country</span>
                <span className="font-bold text-gray-800">
                  {selectedEntityForView.city || 'Coimbatore'}, {selectedEntityForView.country || 'India'}
                </span>
              </div>
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                <span className="text-gray-400 block font-medium mb-1">Linked Operational Branches</span>
                <span className="font-bold text-[#14532D] text-sm">
                  {branches.filter(b => b.company_id === selectedEntityForView.id).length} Branch Sites
                </span>
              </div>
            </div>

            {selectedEntityForView.address && (
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 text-xs">
                <span className="text-gray-400 block font-medium mb-1">Registered Statutory Address</span>
                <span className="text-gray-700 font-medium leading-relaxed">{selectedEntityForView.address}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsViewEntityModalOpen(false)}>
                Close
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handleOpenEditEntity(selectedEntityForView)}
                className="bg-[#14532D] hover:bg-[#07563D] text-white gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Entity Details
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Edit Legal Entity */}
      <Modal
        isOpen={isEditEntityModalOpen}
        onClose={() => setIsEditEntityModalOpen(false)}
        title="Edit Legal Corporate Entity"
        description="Update statutory parameters, legal trade names, and registered address"
      >
        <form onSubmit={handleUpdateCompany} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Legal Corporate Name</label>
            <input
              type="text"
              value={editLegalName}
              onChange={e => setEditLegalName(e.target.value)}
              required
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Trade / Operating Name</label>
            <input
              type="text"
              value={editTradeName}
              onChange={e => setEditTradeName(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Statutory Reg / CIN</label>
              <input
                type="text"
                value={editRegNo}
                onChange={e => setEditRegNo(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Tax ID / PAN</label>
              <input
                type="text"
                value={editTaxId}
                onChange={e => setEditTaxId(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Country</label>
              <input
                type="text"
                value={editCountry}
                onChange={e => setEditCountry(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">HQ City</label>
              <input
                type="text"
                value={editCity}
                onChange={e => setEditCity(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Registered Address (Optional)</label>
            <input
              type="text"
              value={editAddress}
              onChange={e => setEditAddress(e.target.value)}
              placeholder="e.g. 100 Main St, Industrial Corridor"
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#14532D]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditEntityModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-[#14532D] hover:bg-[#07563D] text-white">
              Save Entity Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

