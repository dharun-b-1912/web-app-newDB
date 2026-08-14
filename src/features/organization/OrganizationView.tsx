import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { Building2, Plus, MapPin, Globe, Hash, Clock, Landmark, Edit2, ShieldCheck } from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import { api } from '../../services/api';
import { Company, Branch } from '../../types';
import { useToast } from '../../components/ui/Toast';

import { OrgChart } from './OrgChart';

export const OrganizationView: React.FC = () => {
  const { organization, companies, reloadTenant } = useTenant();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'entities' | 'org_chart' | 'cost_centers'>('entities');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);

  // Form states
  const [compLegalName, setCompLegalName] = useState('');
  const [compRegNo, setCompRegNo] = useState('');
  const [compCountry, setCompCountry] = useState('India');
  const [compCity, setCompCity] = useState('');

  const [branchCompanyId, setBranchCompanyId] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchCity, setBranchCity] = useState('');
  const [branchState, setBranchState] = useState('');

  useEffect(() => {
    api.getBranches().then(setBranches);
  }, []);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compLegalName || !compRegNo) return;

    try {
      await api.createCompany({
        organization_id: organization?.id || 'org-acme-01',
        legal_name: compLegalName,
        statutory_registration_no: compRegNo,
        country: compCountry,
        city: compCity || 'Coimbatore',
      });
      await reloadTenant();
      showToast('Legal Company entity created successfully!');
      setIsCompanyModalOpen(false);
      setCompLegalName('');
      setCompRegNo('');
    } catch {
      showToast('Error creating company entity', 'error');
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName || !branchCode || !branchCompanyId) return;

    try {
      const newBr = await api.createBranch({
        company_id: branchCompanyId,
        name: branchName,
        code: branchCode,
        city: branchCity || 'Coimbatore',
        state: branchState || 'Tamil Nadu',
        timezone: 'Asia/Kolkata',
      });
      setBranches(prev => [newBr, ...prev]);
      showToast('Branch campus added!');
      setIsBranchModalOpen(false);
      setBranchName('');
      setBranchCode('');
    } catch {
      showToast('Error adding branch campus', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Organization & Entities' }]} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Organization Architecture</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage top-level tenant group, legal company entities, and physical branch campuses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsBranchModalOpen(true)} variant="outline" leftIcon={<MapPin className="w-4 h-4" />}>
            Add Branch Campus
          </Button>
          <Button onClick={() => setIsCompanyModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Add Legal Entity
          </Button>
        </div>
      </div>

      {/* Organization Root Card */}
      <Card className="bg-gradient-to-r from-[#073B2A] to-[#0B563D] text-white p-6 shadow-xl border-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Globe className="w-4 h-4" /> Root Enterprise Tenant
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              {organization?.name || 'Acme Global Enterprise'}
            </h2>
            <p className="text-xs text-emerald-100/90 max-w-xl">
              Industry: <span className="font-bold text-white">{organization?.industry}</span> • Default Currency:{' '}
              <span className="font-bold text-white">{organization?.default_currency}</span> • Timezone:{' '}
              <span className="font-bold text-white">{organization?.timezone}</span>
            </p>
          </div>

          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-emerald-800/80 pt-4 md:pt-0 md:pl-6 shrink-0">
            <div>
              <div className="text-2xl font-black text-white">{companies.length}</div>
              <div className="text-[11px] text-emerald-200">Legal Entities</div>
            </div>
            <div className="w-px h-8 bg-emerald-800" />
            <div>
              <div className="text-2xl font-black text-white">{branches.length}</div>
              <div className="text-[11px] text-emerald-200">Branch Campuses</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('entities')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'entities' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Legal Entities & Campuses
        </button>
        <button
          onClick={() => setActiveTab('org_chart')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'org_chart' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Interactive Org Chart
        </button>
      </div>

      {activeTab === 'org_chart' && <OrgChart />}

      {activeTab === 'entities' && (
        <>
          {/* Legal Entities Table Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#07563D]" />
            <h2 className="text-base font-bold text-gray-900">Legal Entities ({companies.length})</h2>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entity Legal Name</TableHead>
              <TableHead>Statutory Reg / CIN</TableHead>
              <TableHead>Tax ID / PAN</TableHead>
              <TableHead>HQ Location</TableHead>
              <TableHead>Country</TableHead>
              <TableHead className="text-right">Campuses</TableHead>
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
                  <TableCell className="font-mono text-xs">{comp.statutory_registration_no}</TableCell>
                  <TableCell className="font-mono text-xs">{comp.tax_id || 'N/A'}</TableCell>
                  <TableCell>{comp.city}</TableCell>
                  <TableCell>
                    <Badge variant="emerald">{comp.country}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-[#07563D]">{compBranches.length}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Branch Campuses Section */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#07563D]" />
          <h2 className="text-base font-bold text-gray-900">Branch Campuses ({branches.length})</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {branches.map(br => {
            const parentComp = companies.find(c => c.id === br.company_id);
            return (
              <Card key={br.id} className="hover:border-emerald-200 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold text-xs">
                    {br.code}
                  </div>
                  <Badge variant="emerald" size="sm">
                    Active
                  </Badge>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mt-3">{br.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{br.city}, {br.state}</p>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                  <span className="truncate max-w-[150px]">{parentComp?.legal_name}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {br.timezone}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
      </>
      )}

      {/* Modal: Add Legal Entity */}
      <Modal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        title="Add Legal Entity Company"
        description="Register a new legal corporate entity under your enterprise group"
      >
        <form onSubmit={handleCreateCompany} className="space-y-4">
          <Input
            label="Legal Corporate Name"
            placeholder="e.g. Acme Innovations Inc"
            value={compLegalName}
            onChange={e => setCompLegalName(e.target.value)}
            required
          />
          <Input
            label="Statutory Registration / CIN"
            placeholder="e.g. CIN-U72200TZ2020PTC034120"
            value={compRegNo}
            onChange={e => setCompRegNo(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Country"
              placeholder="e.g. India"
              value={compCountry}
              onChange={e => setCompCountry(e.target.value)}
              required
            />
            <Input
              label="HQ City"
              placeholder="e.g. Coimbatore"
              value={compCity}
              onChange={e => setCompCity(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCompanyModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Entity</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Branch Campus */}
      <Modal
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        title="Add Branch Campus"
        description="Register an operational branch site or campus under a legal entity"
      >
        <form onSubmit={handleCreateBranch} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Parent Legal Entity *</label>
            <select
              value={branchCompanyId}
              onChange={e => setBranchCompanyId(e.target.value)}
              className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 focus:ring-[#07563D] focus:border-[#07563D]"
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

          <Input
            label="Campus / Branch Name"
            placeholder="e.g. Bengaluru Tech Hub"
            value={branchName}
            onChange={e => setBranchName(e.target.value)}
            required
          />

          <Input
            label="Branch Code"
            placeholder="e.g. BR-BLR"
            value={branchCode}
            onChange={e => setBranchCode(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              placeholder="e.g. Bengaluru"
              value={branchCity}
              onChange={e => setBranchCity(e.target.value)}
              required
            />
            <Input
              label="State / Region"
              placeholder="e.g. Karnataka"
              value={branchState}
              onChange={e => setBranchState(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsBranchModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Branch</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
