import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../../components/ui/Button';
import {
  Sliders,
  CheckCircle2,
  FileText,
  Layers,
  CreditCard,
  Building2,
  Copy,
  Plus,
} from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { payrollApi } from '../../../services/payrollApi';
import { PayslipTemplateConfig, PayslipComponentConfigItem } from '../../../types/payroll';
import { cn } from '../../../lib/utils';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';

export const PayrollSettingsView: React.FC = () => {
  const { showToast } = useToast();

  // Active subnav tab
  const [activeTab, setActiveTab] = useState<'payslip_builder' | 'components_master' | 'banking' | 'cycle'>('payslip_builder');

  // Selected Template State
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('factory_std');
  const [templateConfig, setTemplateConfig] = useState<PayslipTemplateConfig>(() =>
    payrollApi.getPayslipTemplateConfig()
  );

  // Search & Filter in Component Tables
  const [compSearchQuery, setCompSearchQuery] = useState('');
  const [compCategoryFilter, setCompCategoryFilter] = useState<string>('all');

  // New Custom Component Modal State
  const [isNewCompModalOpen, setIsNewCompModalOpen] = useState(false);
  const [customCompName, setCustomCompName] = useState('');
  const [customCompCode, setCustomCompCode] = useState('');
  const [customCompCategory, setCustomCompCategory] = useState<'Earning' | 'Deduction' | 'Employer Contribution' | 'Reimbursement'>('Earning');
  const [customCompCalcRule, setCustomCompCalcRule] = useState('FixedAmount');
  const [customCompVisibility, setCustomCompVisibility] = useState<'always' | 'nonzero' | 'hide'>('always');

  // Dynamic Template Components List
  const [templateComponents, setTemplateComponents] = useState<PayslipComponentConfigItem[]>([
    { id: 'c1', code: 'BASIC', name: 'Basic Wages', category: 'Earning', calculation_rule: '50% of Gross CTC', visibility: 'always', order: 1 },
    { id: 'c2', code: 'DA', name: 'Dearness Allowance (DA)', category: 'Earning', calculation_rule: 'Statutory CPI Index', visibility: 'always', order: 2 },
    { id: 'c3', code: 'HRA', name: 'House Rent Allowance', category: 'Earning', calculation_rule: '40% of Basic (Non-Metro)', visibility: 'always', order: 3 },
    { id: 'c4', code: 'FOOD_ALLOW', name: 'Food / Canteen Allowance', category: 'Earning', calculation_rule: 'Fixed ₹1,500 / month', visibility: 'nonzero', order: 4 },
    { id: 'c5', code: 'NIGHT_ALLOW', name: 'Night Shift Allowance', category: 'Earning', calculation_rule: '₹150 / night shift', visibility: 'nonzero', order: 5 },
    { id: 'c6', code: 'OT_WAGES', name: 'Overtime Wages (OT)', category: 'Earning', calculation_rule: 'OT Hours × 1.5x / 2.0x Rate', visibility: 'nonzero', order: 6 },
    { id: 'c7', code: 'ATT_BONUS', name: 'Attendance Performance Bonus', category: 'Earning', calculation_rule: '₹1,000 for 100% Present', visibility: 'nonzero', order: 7 },
    { id: 'c8', code: 'PF_EMP', name: 'Provident Fund (EPF 12%)', category: 'Deduction', calculation_rule: '12% of Basic (Max ₹15k wage)', visibility: 'always', order: 8 },
    { id: 'c9', code: 'ESI_EMP', name: 'Employee State Insurance (ESIC)', category: 'Deduction', calculation_rule: '0.75% of Gross (<= ₹21k)', visibility: 'nonzero', order: 9 },
    { id: 'c10', code: 'PT', name: 'Professional Tax (Tamil Nadu)', category: 'Deduction', calculation_rule: 'State Slab (₹208 average)', visibility: 'always', order: 10 },
    { id: 'c11', code: 'CANTEEN_DED', name: 'Canteen & Meal Deduction', category: 'Deduction', calculation_rule: '₹40 / registered meal', visibility: 'nonzero', order: 11 },
    { id: 'c12', code: 'SNACKS_DED', name: 'Snacks & Tea Recovery', category: 'Deduction', calculation_rule: 'Monthly token log', visibility: 'nonzero', order: 12 },
    { id: 'c13', code: 'TENT_DED', name: 'Accommodation / Tent Deduction', category: 'Deduction', calculation_rule: 'Fixed ₹800 / month', visibility: 'nonzero', order: 13 },
    { id: 'c14', code: 'LWF', name: 'Labour Welfare Fund (LWF)', category: 'Deduction', calculation_rule: 'Statutory Annual Split', visibility: 'nonzero', order: 14 },
    { id: 'c15', code: 'LOAN_EMI', name: 'Salary Advance & Loan Recovery', category: 'Deduction', calculation_rule: 'Active Amortization Schedule', visibility: 'nonzero', order: 15 },
    { id: 'c16', code: 'ER_PF', name: 'Employer EPF (12%)', category: 'Employer Contribution', calculation_rule: '12% (3.67% EPF + 8.33% EPS)', visibility: 'always', order: 16 },
    { id: 'c17', code: 'ER_ESI', name: 'Employer ESIC (3.25%)', category: 'Employer Contribution', calculation_rule: '3.25% of Gross', visibility: 'always', order: 17 },
  ]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTemplateConfig(prev => ({
          ...prev,
          company_logo_url: reader.result as string,
        }));
        showToast('✓ Company Logo uploaded and previewed in payslip template.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleVisibility = (compId: string, nextVis: 'always' | 'nonzero' | 'hide') => {
    setTemplateComponents(prev =>
      prev.map(c => (c.id === compId ? { ...c, visibility: nextVis } : c))
    );
    showToast(`✓ Updated component visibility to: ${nextVis.toUpperCase()}`);
  };

  const handleSaveAll = () => {
    const payload: PayslipTemplateConfig = {
      ...templateConfig,
      components: templateComponents,
    };
    payrollApi.savePayslipTemplateConfig(payload);
    showToast('✓ Payslip Template and Component Master configurations saved successfully.');
  };

  const handleCreateCustomComponent = () => {
    if (!customCompName.trim() || !customCompCode.trim()) {
      showToast('Please enter both component name and code.', 'error');
      return;
    }
    const newItem: PayslipComponentConfigItem = {
      id: `custom-comp-${Date.now()}`,
      name: customCompName,
      code: customCompCode.toUpperCase(),
      category: customCompCategory,
      calculation_rule: customCompCalcRule,
      visibility: customCompVisibility,
      order: templateComponents.length + 1,
      is_custom: true,
    };
    setTemplateComponents(prev => [...prev, newItem]);
    setIsNewCompModalOpen(false);
    setCustomCompName('');
    setCustomCompCode('');
    showToast(`✓ Added custom component: ${newItem.name} (${newItem.code})`);
  };

  // Filtered components
  const filteredComponents = useMemo(() => {
    return templateComponents.filter(c => {
      const matchesSearch =
        c.name.toLowerCase().includes(compSearchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(compSearchQuery.toLowerCase());
      const matchesCat = compCategoryFilter === 'all' || c.category === compCategoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [templateComponents, compSearchQuery, compCategoryFilter]);

  return (
    <div className="space-y-6 select-none max-w-[1600px] mx-auto">
      {/* 1. Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-[#07563D]">
              <Sliders className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
              Payroll Component Master & Dynamic Payslip Designer
            </h2>
            <Badge variant="emerald">Enterprise v2.0</Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
            Configure dynamic earnings, deductions, per-day/per-month column formats, formula rules, and tenant branding. Seamlessly adapts across factories, contract workforces, and corporate offices.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsNewCompModalOpen(true)}
            className="text-xs font-bold text-[#07563D] hover:bg-emerald-50 border-emerald-200"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> + New Custom Component
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={handleSaveAll}
            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Save Configuration
          </Button>
        </div>
      </div>

      {/* 2. Subnav Ribbon */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('payslip_builder')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap",
            activeTab === 'payslip_builder' ? "bg-[#07563D] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <FileText className="w-4 h-4" />
          <span>Payslip Template Designer & Branding</span>
        </button>

        <button
          onClick={() => setActiveTab('components_master')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap",
            activeTab === 'components_master' ? "bg-[#07563D] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <Layers className="w-4 h-4" />
          <span>Universal Component Master Library ({templateComponents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('banking')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap",
            activeTab === 'banking' ? "bg-[#07563D] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <CreditCard className="w-4 h-4" />
          <span>Corporate Banking & Disbursement</span>
        </button>

        <button
          onClick={() => setActiveTab('cycle')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap",
            activeTab === 'cycle' ? "bg-[#07563D] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <Building2 className="w-4 h-4" />
          <span>Pay Cycle & Cutoff Rules</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PAYSLIP TEMPLATE DESIGNER & BRANDING */}
      {/* ========================================================================= */}
      {activeTab === 'payslip_builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Template Configuration (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Template Selector & Info */}
            <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono">
                    Active Payslip Template Profile
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h3 className="text-sm font-bold text-gray-900">
                      Factory Monthly Payslip (Tamil Nadu Industrial Grid)
                    </h3>
                    <Badge variant="emerald">Active • v2.0</Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => showToast('✓ Duplicated template to: Factory Monthly Payslip (Copy)')}
                    className="text-xs font-bold text-gray-700"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Duplicate
                  </Button>
                </div>
              </div>

              {/* Column Formatting Toggles */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-800 block">
                  Payslip Table Column Formatting Options:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateConfig.show_per_day_column}
                      onChange={e =>
                        setTemplateConfig(prev => ({ ...prev, show_per_day_column: e.target.checked }))
                      }
                      className="mt-0.5 accent-[#07563D] w-4 h-4 rounded"
                    />
                    <div>
                      <span className="font-bold text-gray-900 block">Show Per Day Column (Rate/Day)</span>
                      <span className="text-[11px] text-gray-500">Standard for factory & contract labour payslips</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateConfig.show_ot_breakdown ?? true}
                      onChange={e =>
                        setTemplateConfig(prev => ({ ...prev, show_ot_breakdown: e.target.checked }))
                      }
                      className="mt-0.5 accent-[#07563D] w-4 h-4 rounded"
                    />
                    <div>
                      <span className="font-bold text-gray-900 block">Show OT Hours & Rate Split</span>
                      <span className="text-[11px] text-gray-500">Itemized line item for overtime hours and multiplier</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Structured Components Table */}
            <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Included Payslip Components & Visibility</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Toggle visibility: <span className="font-bold text-emerald-800">Always Show (✓)</span>, <span className="font-bold text-blue-800">Show if Non-Zero (✓*)</span>, or <span className="font-bold text-gray-500">Hide (✕)</span>.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-xl border border-gray-200 text-xs">
                  {['all', 'Earning', 'Deduction'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCompCategoryFilter(cat)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-bold text-[11px] capitalize transition-all",
                        compCategoryFilter === cat ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500 hover:text-gray-900"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="p-3">Component Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Calculation Rule</th>
                      <th className="p-3 text-center">Visibility</th>
                      <th className="p-3 text-center">Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredComponents.map(comp => (
                      <tr key={comp.id} className="hover:bg-gray-50/70">
                        <td className="p-3 font-bold text-gray-900">
                          <div>{comp.name}</div>
                          <span className="text-[10px] text-gray-400 font-mono">{comp.code}</span>
                        </td>
                        <td className="p-3">
                          <Badge variant={comp.category === 'Earning' ? 'emerald' : comp.category === 'Deduction' ? 'rose' : 'blue'}>
                            {comp.category}
                          </Badge>
                        </td>
                        <td className="p-3 text-gray-600 font-medium">{comp.calculation_rule}</td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-[11px]">
                            <button
                              onClick={() => handleToggleVisibility(comp.id, 'always')}
                              className={cn(
                                "px-2 py-0.5 rounded font-bold transition-all",
                                comp.visibility === 'always' ? "bg-[#07563D] text-white shadow-xs" : "text-gray-500 hover:text-gray-900"
                              )}
                              title="Always display on payslip"
                            >
                              Always
                            </button>
                            <button
                              onClick={() => handleToggleVisibility(comp.id, 'nonzero')}
                              className={cn(
                                "px-2 py-0.5 rounded font-bold transition-all",
                                comp.visibility === 'nonzero' ? "bg-blue-700 text-white shadow-xs" : "text-gray-500 hover:text-gray-900"
                              )}
                              title="Show only when amount > 0"
                            >
                              Non-Zero
                            </button>
                            <button
                              onClick={() => handleToggleVisibility(comp.id, 'hide')}
                              className={cn(
                                "px-2 py-0.5 rounded font-bold transition-all",
                                comp.visibility === 'hide' ? "bg-gray-600 text-white shadow-xs" : "text-gray-500 hover:text-gray-900"
                              )}
                              title="Hide from payslip"
                            >
                              Hide
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-gray-600">{comp.order}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Branding & Contact Info */}
            <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
                Company Header Branding & Authorized Contacts
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Company Display Name</label>
                  <input
                    type="text"
                    value={templateConfig.company_name}
                    onChange={e => setTemplateConfig(prev => ({ ...prev, company_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Client Unit Name</label>
                  <input
                    type="text"
                    value={templateConfig.client_name_default}
                    onChange={e => setTemplateConfig(prev => ({ ...prev, client_name_default: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-gray-700 font-bold mb-1">Company Registered Address</label>
                  <textarea
                    rows={2}
                    value={templateConfig.company_address}
                    onChange={e => setTemplateConfig(prev => ({ ...prev, company_address: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Site HR Helpline</label>
                  <input
                    type="text"
                    value={templateConfig.site_hr_phone}
                    onChange={e => setTemplateConfig(prev => ({ ...prev, site_hr_phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">EPF / ESI Helpline</label>
                  <input
                    type="text"
                    value={templateConfig.esi_epf_enquiry_phone}
                    onChange={e => setTemplateConfig(prev => ({ ...prev, esi_epf_enquiry_phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Live Payslip Preview Canvas (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="sticky top-6 bg-white p-5 rounded-3xl border border-gray-300 shadow-md space-y-4 font-serif text-gray-900 text-xs">
              <div className="flex items-center justify-between border-b-2 border-gray-900 pb-2">
                <span className="text-[10px] font-bold text-[#07563D] uppercase font-sans tracking-wider">
                  Live Dynamic Payslip Preview
                </span>
                <Badge variant="emerald">A4 Grid Format</Badge>
              </div>

              {/* Payslip Header */}
              <div className="text-center space-y-1">
                <h2 className="text-base font-black uppercase tracking-wide font-sans">
                  {templateConfig.company_name || 'Joy Corporate Solutions'}
                </h2>
                <p className="text-[10px] text-gray-600 font-sans leading-tight">
                  {templateConfig.company_address}
                </p>
                <div className="text-[11px] font-bold font-sans pt-1 border-t border-gray-200">
                  PAYSLIP FOR AUGUST 2026 — {templateConfig.client_name_default}
                </div>
              </div>

              {/* Sample Employee Info */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-sans p-2 bg-gray-50 border border-gray-200 rounded-lg">
                <div>Emp Name: <strong>Dharun B</strong></div>
                <div>Emp Code: <strong>WF-1001</strong></div>
                <div>Designation: <strong>Senior Specialist</strong></div>
                <div>Payable Days: <strong>30 / 31</strong></div>
                <div>PF UAN: <strong>100918234812</strong></div>
                <div>Bank: <strong>HDFC Bank Ltd</strong></div>
              </div>

              {/* Dynamic Earnings vs Deductions Table */}
              <div className="border border-gray-900 font-sans text-xs">
                <div className="grid grid-cols-2 divide-x divide-gray-900 border-b border-gray-900 bg-gray-100 font-bold text-center">
                  <div className="p-1.5">EARNINGS</div>
                  <div className="p-1.5">DEDUCTIONS</div>
                </div>

                <div className="grid grid-cols-2 divide-x divide-gray-900 text-[11px]">
                  {/* Earnings column */}
                  <div className="p-2 space-y-1">
                    <div className="flex justify-between font-medium">
                      <span>Basic Wages</span>
                      <span className="font-mono">₹ 25,000</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>HRA</span>
                      <span className="font-mono">₹ 10,000</span>
                    </div>
                    {templateComponents.find(c => c.code === 'FOOD_ALLOW')?.visibility !== 'hide' && (
                      <div className="flex justify-between font-medium text-gray-700">
                        <span>Food Allowance</span>
                        <span className="font-mono">₹ 1,500</span>
                      </div>
                    )}
                    {templateComponents.find(c => c.code === 'OT_WAGES')?.visibility !== 'hide' && (
                      <div className="flex justify-between font-medium text-emerald-800 font-semibold">
                        <span>OT Wages (14h)</span>
                        <span className="font-mono">₹ 2,100</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium">
                      <span>Special Allowance</span>
                      <span className="font-mono">₹ 8,400</span>
                    </div>
                  </div>

                  {/* Deductions column */}
                  <div className="p-2 space-y-1">
                    <div className="flex justify-between font-medium">
                      <span>Provident Fund (EPF)</span>
                      <span className="font-mono">₹ 1,800</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Professional Tax (PT)</span>
                      <span className="font-mono">₹ 208</span>
                    </div>
                    {templateComponents.find(c => c.code === 'CANTEEN_DED')?.visibility !== 'hide' && (
                      <div className="flex justify-between font-medium text-rose-800">
                        <span>Canteen Recovery</span>
                        <span className="font-mono">₹ 450</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium">
                      <span>TDS / Income Tax</span>
                      <span className="font-mono">₹ 1,200</span>
                    </div>
                  </div>
                </div>

                {/* Gross vs Total Deductions */}
                <div className="grid grid-cols-2 divide-x divide-gray-900 border-t border-gray-900 bg-gray-50 font-bold text-[11px]">
                  <div className="p-1.5 flex justify-between">
                    <span>Gross Earnings:</span>
                    <span className="font-mono">₹ 47,000</span>
                  </div>
                  <div className="p-1.5 flex justify-between text-rose-800">
                    <span>Total Deductions:</span>
                    <span className="font-mono">₹ 3,658</span>
                  </div>
                </div>

                {/* Net Pay */}
                <div className="p-2 bg-emerald-50/70 border-t-2 border-gray-900 flex justify-between items-center font-bold text-sm">
                  <span className="text-[#07563D] uppercase font-black">NET TAKE-HOME PAY:</span>
                  <span className="text-[#07563D] font-mono text-base font-black">₹ 43,342</span>
                </div>
              </div>

              {/* Amount in words */}
              <div className="p-2 bg-gray-50 border border-gray-200 rounded text-[11px] font-sans">
                Amount in Words: <strong>Rupees Forty-Three Thousand Three Hundred Forty-Two Only</strong>
              </div>

              {/* Footer disclaimer */}
              <p className="text-[9px] text-gray-400 font-sans text-center italic">
                {templateConfig.footer_disclaimer || '***This is a computer-generated payslip and does not require a physical signature.***'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: UNIVERSAL COMPONENT MASTER LIBRARY */}
      {/* ========================================================================= */}
      {activeTab === 'components_master' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Tenant Payroll Component Library</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Centralized repository of all system and custom salary components with formula expressions and statutory tags.
              </p>
            </div>

            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsNewCompModalOpen(true)}
              className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> + Create Component
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-3">Component Name</th>
                  <th className="p-3 font-mono">Code</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Calculation Logic</th>
                  <th className="p-3">Statutory Mapping</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {templateComponents.map(comp => (
                  <tr key={comp.id} className="hover:bg-gray-50/70">
                    <td className="p-3 font-bold text-gray-900">
                      <div>{comp.name}</div>
                      {comp.is_custom && (
                        <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                          Custom Company Rule
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-gray-700">{comp.code}</td>
                    <td className="p-3">
                      <Badge variant={comp.category === 'Earning' ? 'emerald' : comp.category === 'Deduction' ? 'rose' : 'blue'}>
                        {comp.category}
                      </Badge>
                    </td>
                    <td className="p-3 font-medium text-gray-800">{comp.calculation_rule}</td>
                    <td className="p-3 text-gray-500 font-mono text-[11px]">
                      {comp.category === 'Earning' ? 'PF: Y • ESI: Y • PT: Y' : 'Statutory Deduction'}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="emerald">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CORPORATE BANKING */}
      {/* ========================================================================= */}
      {activeTab === 'banking' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Corporate Funding Accounts & Payment Advice Config</h3>
              <p className="text-xs text-gray-500 mt-0.5">Debit accounts and bank formats for salary batch settlement</p>
            </div>
            <Badge variant="emerald">Dual Maker-Checker Active</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <span className="text-xs font-bold text-gray-900 block">Primary Corporate Payout Account (HDFC Bank)</span>
              <div className="text-gray-600 font-mono text-[11px]">Account No: 50200081928471 • IFSC: HDFC0001242</div>
              <div className="text-gray-500 text-[11px]">Branch: Avinashi Road, Coimbatore, Tamil Nadu</div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <span className="text-xs font-bold text-gray-900 block">Secondary Escrow & Tax Account (SBI)</span>
              <div className="text-gray-600 font-mono text-[11px]">Account No: 38192847192 • IFSC: SBIN0000842</div>
              <div className="text-gray-500 text-[11px]">Branch: Main Branch, Coimbatore, Tamil Nadu</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PAY CYCLE & CUTOFF RULES */}
      {/* ========================================================================= */}
      {activeTab === 'cycle' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-900">Monthly Payroll Execution Calendar & Cutoff Policies</h3>
            <p className="text-xs text-gray-500 mt-0.5">Deterministic cutoff rules for attendance synchronization and LOP calculation</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">Monthly Pay Cycle</span>
              <div className="text-sm font-black text-gray-900 font-mono">01st to End of Month</div>
              <p className="text-[11px] text-gray-500">Standard 30/31 days calendar basis</p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">Attendance Cutoff Date</span>
              <div className="text-sm font-black text-gray-900 font-mono">25th of Every Month</div>
              <p className="text-[11px] text-gray-500">Biometric punches freeze for calculation</p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">Disbursement Day</span>
              <div className="text-sm font-black text-[#07563D] font-mono">Last Working Day (31st)</div>
              <p className="text-[11px] text-gray-500">Bank transfer file staged for Maker signoff</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE CUSTOM COMPONENT */}
      {isNewCompModalOpen && (
        <Modal
          isOpen={isNewCompModalOpen}
          onClose={() => setIsNewCompModalOpen(false)}
          title="Create Custom Payroll Component"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Component Name *</label>
              <input
                type="text"
                placeholder="e.g. Production Attendance Incentive"
                value={customCompName}
                onChange={e => setCustomCompName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Component Code *</label>
                <input
                  type="text"
                  placeholder="e.g. PAI_BONUS"
                  value={customCompCode}
                  onChange={e => setCustomCompCode(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono uppercase font-bold"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Component Category</label>
                <select
                  value={customCompCategory}
                  onChange={e => setCustomCompCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                >
                  <option value="Earning">Earning</option>
                  <option value="Deduction">Deduction</option>
                  <option value="Employer Contribution">Employer Contribution</option>
                  <option value="Reimbursement">Reimbursement</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Calculation Rule Expression</label>
              <input
                type="text"
                placeholder="e.g. ₹500 for > 26 attendance days or 10% of Basic"
                value={customCompCalcRule}
                onChange={e => setCustomCompCalcRule(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Default Payslip Visibility</label>
              <select
                value={customCompVisibility}
                onChange={e => setCustomCompVisibility(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
              >
                <option value="always">Always Show (✓)</option>
                <option value="nonzero">Show if Non-Zero (✓*)</option>
                <option value="hide">Hide (✕)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsNewCompModalOpen(false)}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleCreateCustomComponent}
                className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add to Component Library
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
