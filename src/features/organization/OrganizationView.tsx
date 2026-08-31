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
} from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import { Company, Branch, BranchType, OrganizationSummaryMetrics } from '../../types';
import { useToast } from '../../components/ui/Toast';
import { organizationStructureService } from '../../services/organization/organizationStructureService';
import { workLocationService } from '../../services/location/workLocationService';
import { hrEventBus } from '../../services/hrEventBus';
import { cn } from '../../lib/utils';

import { OrgChart } from './OrgChart';
import { DepartmentsAndTeamsView } from './DepartmentsAndTeamsView';
import { VendorsView } from './VendorsView';

export const OrganizationView: React.FC = () => {
  const { organization, companies, reloadTenant } = useTenant();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'entities' | 'org_chart' | 'departments' | 'vendors'>('entities');

  const [branches, setBranches] = useState<Branch[]>([]);
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

  // Form states - Branch
  const [branchCompanyId, setBranchCompanyId] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchType, setBranchType] = useState<BranchType>('OFFICE');
  const [branchCity, setBranchCity] = useState('');
  const [branchState, setBranchState] = useState('');
  const [branchAddress, setBranchAddress] = useState('');

  const orgId = organization?.id || 'org-joy-01';

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [brList, summary] = await Promise.all([
        organizationStructureService.getBranches(undefined, orgId),
        organizationStructureService.getMetrics(orgId),
      ]);
      setBranches(brList);
      setMetrics(summary);
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
    if (!branchName || !branchCode || !branchCompanyId) return;

    try {
      await organizationStructureService.createBranch({
        company_id: branchCompanyId,
        name: branchName,
        code: branchCode,
        branch_type: branchType,
        city: branchCity || 'Coimbatore',
        state: branchState || 'Tamil Nadu',
        address: branchAddress,
        timezone: 'Asia/Kolkata',
      });
      showToast('Branch campus/site registered!');
      setIsBranchModalOpen(false);
      setBranchName('');
      setBranchCode('');
      setBranchAddress('');
      loadData();
    } catch {
      showToast('Error adding branch campus', 'error');
    }
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
        <button
          onClick={() => setActiveTab('vendors')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'vendors'
              ? 'bg-[#07563D] text-white shadow-2xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          )}
        >
          <Users className="w-4 h-4" />
          <span>Vendors & Manpower Partners</span>
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
      {activeTab === 'vendors' && <VendorsView />}

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
                            <Button variant="ghost" size="sm" className="text-xs text-[#07563D] hover:bg-emerald-50">
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#07563D]" />
                <h2 className="text-base font-bold text-gray-900">Branch Campuses & Operational Sites ({branches.length})</h2>
              </div>
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
                  className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                  Add First Branch
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {branches.map(br => {
                  const parentComp = companies.find(c => c.id === br.company_id);
                  return (
                    <Card key={br.id} className="p-5 rounded-2xl border-gray-200/80 hover:border-emerald-300 shadow-2xs hover:shadow-md transition-all">
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#07563D] border border-emerald-100 flex items-center justify-center font-mono font-bold text-xs">
                          {br.code}
                        </div>
                        <Badge variant="emerald" size="sm" className="text-[10px] uppercase font-mono">
                          {br.branch_type || 'OFFICE'}
                        </Badge>
                      </div>

                      <h3 className="text-sm font-bold text-gray-900 mt-3">{br.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {br.city}, {br.state || br.country}
                      </p>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                        <span className="truncate max-w-[140px] font-medium text-gray-600">
                          {parentComp?.legal_name || 'Legal Entity'}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[10px]">
                          <Clock className="w-3 h-3 text-gray-400" /> {br.timezone}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleConfigureBranchGeofence(br)}
                        className="mt-3.5 w-full py-1.5 px-3 rounded-xl bg-emerald-50/80 hover:bg-emerald-100/90 text-[#07563D] text-[11px] font-bold flex items-center justify-between transition-all border border-emerald-200/60 shadow-2xs group cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Crosshair className="w-3.5 h-3.5 text-[#07563D]" />
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
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Trade / Operating Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Acme Tech"
              value={compTradeName}
              onChange={e => setCompTradeName(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
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
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Tax ID / PAN (Optional)</label>
              <input
                type="text"
                placeholder="e.g. AABCA1234F"
                value={compTaxId}
                onChange={e => setCompTaxId(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
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
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
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
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCompanyModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-[#07563D] hover:bg-[#0b7a57] text-white">
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
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Parent Legal Entity *</label>
            <select
              value={branchCompanyId}
              onChange={e => setBranchCompanyId(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-900 text-xs rounded-xl p-2.5 focus:ring-[#07563D] focus:border-[#07563D]"
              required
            >
              <option value="">Select legal entity...</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.legal_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Branch / Site Name</label>
              <input
                type="text"
                placeholder="e.g. Bengaluru Tech Park"
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Branch Code</label>
              <input
                type="text"
                placeholder="e.g. BR-BLR-01"
                value={branchCode}
                onChange={e => setBranchCode(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Facility / Site Type</label>
            <select
              value={branchType}
              onChange={e => setBranchType(e.target.value as BranchType)}
              className="w-full bg-white border border-gray-200 text-gray-900 text-xs rounded-xl p-2.5 focus:ring-[#07563D] focus:border-[#07563D]"
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
              <label className="block text-xs font-bold text-gray-700 mb-1">City</label>
              <input
                type="text"
                placeholder="e.g. Bengaluru"
                value={branchCity}
                onChange={e => setBranchCity(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">State / Region</label>
              <input
                type="text"
                placeholder="e.g. Karnataka"
                value={branchState}
                onChange={e => setBranchState(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
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
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsBranchModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-[#07563D] hover:bg-[#0b7a57] text-white">
              Register Branch
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
