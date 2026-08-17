import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { Building2, Globe, Shield, Lock, Sliders, Database, Key } from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import { useToast } from '../../components/ui/Toast';

export const SettingsView: React.FC = () => {
  const { organization, activeCompany, updateOrganization } = useTenant();
  const { showToast } = useToast();

  const [orgName, setOrgName] = useState(organization?.name || 'Joy Corporate Solutions');
  const [industry, setIndustry] = useState(organization?.industry || 'Software & Technology');
  const [currency, setCurrency] = useState(organization?.default_currency || 'INR');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateOrganization({
        name: orgName,
        industry,
        default_currency: currency,
      });
      showToast('Organization settings updated');
    } catch {
      showToast('Error saving settings', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'System & Tenant Settings' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Enterprise Tenant Settings</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure multi-tenant group preferences, statutory compliance defaults, and security configurations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 p-6 space-y-4">
          <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#07563D]" /> Enterprise Tenant Metadata
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Organization Group Name"
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              required
            />

            <Input
              label="Industry Classification"
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Base Reporting Currency"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                required
              />
              <Input label="Default Timezone" value={organization?.timezone || 'Asia/Kolkata'} disabled />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit">Save Configurations</Button>
            </div>
          </form>
        </Card>

        <Card className="lg:col-span-4 p-6 space-y-4">
          <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#07563D]" /> Active Legal Entity Context
          </h2>

          <div className="space-y-2 text-xs text-gray-600">
            <div className="p-3 bg-emerald-50 text-[#07563D] rounded-xl font-bold">
              {activeCompany?.legal_name}
            </div>
            <div className="pt-2 border-t border-gray-100 flex justify-between">
              <span>Statutory Reg No:</span>
              <span className="font-mono text-gray-900">{activeCompany?.statutory_registration_no}</span>
            </div>
            <div className="flex justify-between">
              <span>Headquarters:</span>
              <span className="text-gray-900">{activeCompany?.city}, {activeCompany?.country}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
