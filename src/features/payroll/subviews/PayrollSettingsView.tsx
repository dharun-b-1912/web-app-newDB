import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';
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
  const [activeTab, setActiveTab] = useState<'payslip' | 'banking' | 'cycle'>('payslip');

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
            Customize tenant payslip branding, company contact info, logo upload, component visibility, and corporate bank disbursement.
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
    </div>
  );
};
