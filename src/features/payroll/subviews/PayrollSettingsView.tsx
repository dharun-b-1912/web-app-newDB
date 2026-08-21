import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { excelTestDataService, TestDataStatus } from '../../../services/excelTestDataService';
import {
  Settings,
  ShieldCheck,
  Building2,
  CreditCard,
  FileText,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Sliders,
  Phone,
  Mail,
  Globe,
  MapPin,
  Sparkles,
  Database,
  Trash2,
  Play,
  Users,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { payrollApi } from '../../../services/payrollApi';
import { PayslipTemplateConfig } from '../../../types/payroll';
import { cn } from '../../../lib/utils';

export const PayrollSettingsView: React.FC = () => {
  const { showToast } = useToast();
  const [templateConfig, setTemplateConfig] = useState<PayslipTemplateConfig>(() =>
    payrollApi.getPayslipTemplateConfig()
  );
  const [activeTab, setActiveTab] = useState<'payslip' | 'banking' | 'cycle' | 'test-data'>('payslip');
  const [testDataStatus, setTestDataStatus] = useState<TestDataStatus>(() =>
    excelTestDataService.getTestDataStatus()
  );
  const [isLoadingTestData, setIsLoadingTestData] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTemplateConfig(prev => ({
          ...prev,
          company_logo_url: reader.result as string,
        }));
        showToast('✓ Company Logo uploaded and previewed.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    payrollApi.savePayslipTemplateConfig(templateConfig);
    showToast('✓ Payslip Template and Payroll Settings saved successfully.');
  };

  const handleLoadExcelData = async () => {
    setIsLoadingTestData(true);
    try {
      const res = await excelTestDataService.loadMasterExcelTestData();
      setTestDataStatus(excelTestDataService.getTestDataStatus());
      showToast(`✓ Onboarded ${res.onboarded_count} employees from Excel file. Run: ${res.payroll_run_number}`);
    } catch (err: any) {
      showToast(err?.message || 'Error loading Excel test data', 'error');
    } finally {
      setIsLoadingTestData(false);
    }
  };

  const handlePurgeExcelData = () => {
    const res = excelTestDataService.purgeMasterExcelTestData();
    setTestDataStatus(excelTestDataService.getTestDataStatus());
    showToast(`✓ Purged ${res.deleted_count} test employee records completely from backend.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-[#07563D]">
              <Settings className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-black text-gray-900 tracking-tight">
              Payroll Engine Configuration & Template Customization
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Customize tenant payslip branding, company contact info, logo upload, component visibility, corporate bank disbursement, and test datasets.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={handleSave}
          className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs"
        >
          <CheckCircle2 className="w-4 h-4 mr-1.5" /> Save All Settings
        </Button>
      </div>

      {/* Subnav Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('payslip')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap",
            activeTab === 'payslip' ? "bg-[#07563D] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <FileText className="w-4 h-4" />
          <span>Payslip Template & Branding</span>
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
        <button
          onClick={() => setActiveTab('test-data')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap",
            activeTab === 'test-data' ? "bg-[#07563D] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <Database className="w-4 h-4" />
          <span>Excel Master Test Data (48 Staff)</span>
        </button>
      </div>

      {/* 1. PAYSLIP TEMPLATE & BRANDING TAB */}
      {activeTab === 'payslip' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Form Customization */}
          <div className="lg:col-span-2 space-y-6">
            {/* Branding & Logo */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <ImageIcon className="w-4 h-4 text-[#07563D]" />
                <span>1. Tenant Company Details & Logo Upload</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Company Display Name</label>
                  <input
                    type="text"
                    value={templateConfig.company_name}
                    onChange={e => setTemplateConfig({ ...templateConfig, company_name: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-semibold"
                    placeholder="e.g. Joy Manpower Service"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Client / Unit Default Name</label>
                  <input
                    type="text"
                    value={templateConfig.client_name_default}
                    onChange={e => setTemplateConfig({ ...templateConfig, client_name_default: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-semibold"
                    placeholder="e.g. Watertec Unit I"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="font-bold text-gray-700 block mb-1">Registered Address (Printed on Payslip Header)</label>
                  <textarea
                    rows={2}
                    value={templateConfig.company_address}
                    onChange={e => setTemplateConfig({ ...templateConfig, company_address: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-medium text-xs"
                    placeholder="Full registered address..."
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Site HR Phone</label>
                  <input
                    type="text"
                    value={templateConfig.site_hr_phone}
                    onChange={e => setTemplateConfig({ ...templateConfig, site_hr_phone: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono"
                    placeholder="+91 7845966580"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Manager Phone</label>
                  <input
                    type="text"
                    value={templateConfig.manager_phone}
                    onChange={e => setTemplateConfig({ ...templateConfig, manager_phone: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono"
                    placeholder="+91 7845966580, +91 7825906580"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">ESI / EPF Enquiry Phone</label>
                  <input
                    type="text"
                    value={templateConfig.esi_epf_enquiry_phone}
                    onChange={e => setTemplateConfig({ ...templateConfig, esi_epf_enquiry_phone: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono"
                    placeholder="+91 7845956580"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">MD Contact Phone</label>
                  <input
                    type="text"
                    value={templateConfig.md_phone}
                    onChange={e => setTemplateConfig({ ...templateConfig, md_phone: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono"
                    placeholder="+91 9080776580"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Email ID</label>
                  <input
                    type="email"
                    value={templateConfig.email}
                    onChange={e => setTemplateConfig({ ...templateConfig, email: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono"
                    placeholder="info@joycorporatesolutions.com"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Website URL</label>
                  <input
                    type="text"
                    value={templateConfig.website}
                    onChange={e => setTemplateConfig({ ...templateConfig, website: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono"
                    placeholder="www.joyindia.in"
                  />
                </div>
              </div>

              {/* Logo Upload Box */}
              <div className="pt-2">
                <label className="font-bold text-gray-700 block mb-2 text-xs">Company Logo (Printed on Header)</label>
                <div className="flex items-center gap-4">
                  {templateConfig.company_logo_url ? (
                    <img
                      src={templateConfig.company_logo_url}
                      alt="Logo Preview"
                      className="w-16 h-16 object-contain rounded-xl border border-gray-200 p-1 bg-white"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-[10px] font-bold">
                      No Logo
                    </div>
                  )}

                  <div>
                    <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#07563D] text-white text-xs font-bold cursor-pointer hover:bg-[#0a7352] transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload New Logo (PNG / JPG)</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    <span className="block text-[11px] text-gray-400 mt-1">Recommended size: 250x100px with transparent background.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Template Style & Visible Columns */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Sliders className="w-4 h-4 text-[#07563D]" />
                <span>2. Payslip Layout & Component Visibility Toggles</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Payslip Layout Template</label>
                  <select
                    value={templateConfig.template_style}
                    onChange={e => setTemplateConfig({ ...templateConfig, template_style: e.target.value as any })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-bold text-gray-800"
                  >
                    <option value="TamilNaduStandardGrid">Tamil Nadu Industrial Grid (Joy Manpower Format)</option>
                    <option value="ModernMinimal">Modern Minimalist Table</option>
                    <option value="CorporateClean">Corporate Standard Grid</option>
                  </select>
                </div>

                <div className="space-y-2 pt-1">
                  <span className="font-bold text-gray-700 block">Display Columns</span>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={templateConfig.show_per_day_column}
                      onChange={e => setTemplateConfig({ ...templateConfig, show_per_day_column: e.target.checked })}
                      className="rounded text-[#07563D] focus:ring-[#07563D]"
                    />
                    <span>Show "Per Day" Wage Rate Column</span>
                  </label>
                </div>
              </div>

              {/* Component Field Toggles */}
              <div className="pt-2 space-y-2 text-xs">
                <span className="font-bold text-gray-700 block">Included Wage & Deduction Components</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateConfig.show_food_allowance}
                      onChange={e => setTemplateConfig({ ...templateConfig, show_food_allowance: e.target.checked })}
                      className="rounded text-[#07563D]"
                    />
                    <span>Food Allowance</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateConfig.show_night_allowance}
                      onChange={e => setTemplateConfig({ ...templateConfig, show_night_allowance: e.target.checked })}
                      className="rounded text-[#07563D]"
                    />
                    <span>Night Allowance</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateConfig.show_ot_wages}
                      onChange={e => setTemplateConfig({ ...templateConfig, show_ot_wages: e.target.checked })}
                      className="rounded text-[#07563D]"
                    />
                    <span>OT Wages</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateConfig.show_attendance_bonus}
                      onChange={e => setTemplateConfig({ ...templateConfig, show_attendance_bonus: e.target.checked })}
                      className="rounded text-[#07563D]"
                    />
                    <span>Attendance Bonus</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateConfig.show_canteen_deduction}
                      onChange={e => setTemplateConfig({ ...templateConfig, show_canteen_deduction: e.target.checked })}
                      className="rounded text-[#07563D]"
                    />
                    <span>Canteen Deduction</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateConfig.show_snacks_deduction}
                      onChange={e => setTemplateConfig({ ...templateConfig, show_snacks_deduction: e.target.checked })}
                      className="rounded text-[#07563D]"
                    />
                    <span>Snacks Deduction</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateConfig.show_tent_deduction}
                      onChange={e => setTemplateConfig({ ...templateConfig, show_tent_deduction: e.target.checked })}
                      className="rounded text-[#07563D]"
                    />
                    <span>Tent Deduction</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateConfig.show_lwf_deduction}
                      onChange={e => setTemplateConfig({ ...templateConfig, show_lwf_deduction: e.target.checked })}
                      className="rounded text-[#07563D]"
                    />
                    <span>LWF Deduction</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Right 1 Col: Live Preview Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-900 block uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#07563D]" />
                <span>Live Template Preview</span>
              </span>

              <div className="border border-black p-3 bg-white text-[10px] text-black font-sans space-y-1.5 rounded">
                <div className="font-black text-center text-xs uppercase border-b border-gray-300 pb-1">
                  EMPLOYEE SALARY SLIP - AUG 2026
                </div>
                <div className="font-extrabold text-[11px]">{templateConfig.company_name}</div>
                <div className="text-[9px] text-gray-700 leading-tight">
                  {templateConfig.company_address} • {templateConfig.site_hr_phone}
                </div>
                <div className="grid grid-cols-2 gap-1 border-t border-b border-black py-1 font-mono text-[9px]">
                  <div>Emp: <strong>EMP-1001</strong></div>
                  <div>Client: <strong>{templateConfig.client_name_default}</strong></div>
                  <div>Payable Days: <strong>30</strong></div>
                  <div>Net Pay: <strong>₹ 45,000.00</strong></div>
                </div>
                <div className="text-[8px] text-center italic text-gray-500 pt-1">
                  {templateConfig.footer_disclaimer}
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="primary"
              onClick={handleSave}
              className="w-full bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" /> Save Payslip Template
            </Button>
          </div>
        </div>
      )}

      {/* 2. CORPORATE BANKING TAB */}
      {activeTab === 'banking' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4 max-w-2xl">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
            <CreditCard className="w-4 h-4 text-[#07563D]" />
            <span>Corporate Disbursement Bank Account Details</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Corporate Disbursement Bank</label>
              <input type="text" defaultValue="HDFC Bank Ltd - Corporate CMS Branch" className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-semibold" />
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1">Corporate Account Number</label>
              <input type="text" defaultValue="50100091827182" className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono" />
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1">IFSC Code</label>
              <input type="text" defaultValue="HDFC0001242" className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-mono" />
            </div>
          </div>
        </div>
      )}

      {/* 3. PAY PERIOD TAB */}
      {activeTab === 'cycle' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4 max-w-2xl">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
            <Building2 className="w-4 h-4 text-[#07563D]" />
            <span>Pay Period & Cutoff Cycle Rules</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Pay Cycle Frequency</label>
              <select className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 font-bold">
                <option>Monthly (Last Working Day)</option>
                <option>Bi-Weekly</option>
                <option>Semi-Monthly (15th & Last Day)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1">Attendance Cutoff Date</label>
              <input type="text" defaultValue="25th of every month" className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50/50" />
            </div>
          </div>
        </div>
      )}

      {/* 4. EXCEL TEST DATA & INGESTION TAB */}
      {activeTab === 'test-data' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-6 max-w-3xl">
          <div className="flex items-start justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-[#07563D]" />
                <span>Excel Master Dataset Ingestion & Testing Engine</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Source: <code className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">Test Data/Master Data Final (4).xlsx</code> (48 Employee records with Real Bank, PF, ESI, VDA, and Gross details).
              </p>
            </div>
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-bold",
              testDataStatus.is_loaded ? "bg-emerald-50 text-[#07563D] border border-emerald-200" : "bg-gray-100 text-gray-600"
            )}>
              {testDataStatus.is_loaded ? `● ${testDataStatus.total_test_employees} Active Test Staff` : 'No Test Data Loaded'}
            </span>
          </div>

          {/* Test Status Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <span className="text-[10px] text-gray-500 font-sans block">Total Excel Staff</span>
              <span className="font-black text-sm text-gray-900">{testDataStatus.total_test_employees || 48}</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] text-emerald-800 font-sans block">Direct Entities</span>
              <span className="font-black text-sm text-emerald-900">{testDataStatus.direct_count || 32}</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
              <span className="text-[10px] text-blue-800 font-sans block">Vendor Units</span>
              <span className="font-black text-sm text-blue-900">{testDataStatus.vendor_count || 16}</span>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
              <span className="text-[10px] text-purple-800 font-sans block">Locations Mapped</span>
              <span className="font-black text-sm text-purple-900">5 Plants</span>
            </div>
          </div>

          {/* Features Included in Test Batch */}
          <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200 space-y-2 text-xs">
            <span className="font-bold text-gray-900 block">Automatic Setup Provided by This Ingestion Engine:</span>
            <ul className="space-y-1.5 text-gray-600 text-[11px] list-disc list-inside">
              <li><strong className="text-gray-900">Direct vs Vendor Distribution:</strong> Automatically places staff into Joy Corporate Solutions (Direct) and 3 Vendor Contractors (Apex, Premier, Balaji) across Rasipalayam, Muthugoundapudur, Thottipalayam, and Sulur.</li>
              <li><strong className="text-gray-900">Real Statutory & Banking:</strong> Configures real UAN, ESI, PAN, Aadhaar, Bank A/C, and KVB / SBI / Canara IFSC codes.</li>
              <li><strong className="text-gray-900">August 2026 Daily Attendance:</strong> Generates 1,440 punch records with present days, approved leaves, and overtime hours.</li>
              <li><strong className="text-gray-900">Complete Payroll & Digital Payslips:</strong> Automatically computes August 2026 payroll run with printable & downloadable payslips and HDFC/ICICI bank disbursement files.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={handleLoadExcelData}
                disabled={isLoadingTestData}
                className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs shadow-xs"
              >
                {isLoadingTestData ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Ingesting & Calculating...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 mr-1.5" /> Onboard Excel Test Data (48 Staff)
                  </>
                )}
              </Button>

              {testDataStatus.is_loaded && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePurgeExcelData}
                  className="text-rose-700 hover:bg-rose-50 border-rose-200 font-bold text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Purge Test Data Batch
                </Button>
              )}
            </div>

            <span className="text-[11px] text-gray-400 font-mono">
              Safe test sandbox • 1-click clean purge
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
