import React, { useState } from 'react';
import { ShieldAlert, Plus, Trash2, Heart, Building2, CreditCard, ShieldCheck } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export interface FamilyMemberItem {
  id: string;
  name: string;
  relationship: string;
  phone?: string;
  is_dependent: boolean;
}

export interface Step5FormData {
  emergency_name: string;
  emergency_relation: string;
  emergency_phone: string;
  emergency_alt_phone: string;
  emergency_email: string;
  emergency_address: string;
  family_members: FamilyMemberItem[];

  // Bank Mapping
  bank_name?: string;
  account_number?: string;
  ifsc?: string;
  account_holder_name?: string;
  account_type?: 'SAVINGS' | 'CURRENT' | 'SALARY';

  // Statutory Identifiers
  pan?: string;
  uan?: string;
  pf_number?: string;
  esi_number?: string;
  pf_applicable?: boolean;
  esi_applicable?: boolean;
  pt_applicable?: boolean;
  tax_regime?: 'NEW' | 'OLD';
}

interface Props {
  formData: Step5FormData;
  onChange: (fields: Partial<Step5FormData>) => void;
}

export const Step5Emergency: React.FC<Props> = ({ formData, onChange }) => {
  const [isAddingFamily, setIsAddingFamily] = useState<boolean>(false);
  const [newFamName, setNewFamName] = useState<string>('');
  const [newFamRelation, setNewFamRelation] = useState<string>('Spouse');
  const [newFamPhone, setNewFamPhone] = useState<string>('');
  const [newFamDependent, setNewFamDependent] = useState<boolean>(true);

  const handleAddFamilyMember = () => {
    if (!newFamName.trim()) return;
    const newMember: FamilyMemberItem = {
      id: `fam-${Date.now()}`,
      name: newFamName.trim(),
      relationship: newFamRelation,
      phone: newFamPhone.trim(),
      is_dependent: newFamDependent,
    };
    onChange({
      family_members: [...(formData.family_members || []), newMember],
    });
    setNewFamName('');
    setNewFamPhone('');
    setIsAddingFamily(false);
  };

  const handleRemoveFamilyMember = (id: string) => {
    onChange({
      family_members: (formData.family_members || []).filter((m) => m.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-black text-gray-900 tracking-tight">
          Emergency Contacts, Bank Account & Statutory Profile
        </h3>
        <p className="text-xs text-gray-500">
          Configure safety contacts, bank disbursement account, and Indian statutory tax profiles (PF, ESI, PAN).
        </p>
      </div>

      {/* 1. Primary Emergency Contact */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-black text-rose-700 uppercase tracking-wider">
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          Primary Emergency Contact Person
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Contact Person Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Priya Kumar"
              value={formData.emergency_name}
              onChange={(e) => onChange({ emergency_name: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Relationship <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.emergency_relation}
              onChange={(e) => onChange({ emergency_relation: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
            >
              <option value="Spouse">Spouse</option>
              <option value="Parent (Father/Mother)">Parent (Father/Mother)</option>
              <option value="Sibling (Brother/Sister)">Sibling (Brother/Sister)</option>
              <option value="Child (Son/Daughter)">Child (Son/Daughter)</option>
              <option value="Guardian">Guardian</option>
              <option value="Friend / Colleague">Friend / Colleague</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Emergency Phone Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="+91 98765 43210"
              value={formData.emergency_phone}
              onChange={(e) => onChange({ emergency_phone: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Alternate Phone <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="tel"
              placeholder="+91 94433 22110"
              value={formData.emergency_alt_phone}
              onChange={(e) => onChange({ emergency_alt_phone: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Contact Email Address <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="email"
              placeholder="priya.emergency@gmail.com"
              value={formData.emergency_email}
              onChange={(e) => onChange({ emergency_email: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 2. Primary Salary Disbursement Bank Account */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-black text-emerald-800 uppercase tracking-wider">
          <CreditCard className="w-4 h-4 text-[#07563D]" />
          Primary Salary Disbursement Bank Account
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Bank Name <span className="text-gray-400 font-normal">(e.g. HDFC Bank)</span>
            </label>
            <input
              type="text"
              placeholder="HDFC Bank / ICICI / SBI"
              value={formData.bank_name || ''}
              onChange={(e) => onChange({ bank_name: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Bank Account Number
            </label>
            <input
              type="text"
              placeholder="50100239481923"
              value={formData.account_number || ''}
              onChange={(e) => onChange({ account_number: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              IFSC Code
            </label>
            <input
              type="text"
              placeholder="HDFC0001234"
              value={formData.ifsc || ''}
              onChange={(e) => onChange({ ifsc: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold uppercase"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Account Holder Name
            </label>
            <input
              type="text"
              placeholder="As per bank passbook"
              value={formData.account_holder_name || ''}
              onChange={(e) => onChange({ account_holder_name: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Account Type
            </label>
            <select
              value={formData.account_type || 'SALARY'}
              onChange={(e) => onChange({ account_type: e.target.value as any })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
            >
              <option value="SALARY">Corporate Salary Account</option>
              <option value="SAVINGS">Savings Account</option>
              <option value="CURRENT">Current Account</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Statutory Profile & Tax Configuration */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-black text-indigo-900 uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          Statutory Identity & Compliance (PF, ESI, PAN)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              PAN Number <span className="text-gray-400 font-normal">(Income Tax)</span>
            </label>
            <input
              type="text"
              placeholder="ABCDE1234F"
              maxLength={10}
              value={formData.pan || ''}
              onChange={(e) => onChange({ pan: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              UAN (Universal Account Number)
            </label>
            <input
              type="text"
              placeholder="101234567890"
              maxLength={12}
              value={formData.uan || ''}
              onChange={(e) => onChange({ uan: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Income Tax Regime
            </label>
            <select
              value={formData.tax_regime || 'NEW'}
              onChange={(e) => onChange({ tax_regime: e.target.value as 'NEW' | 'OLD' })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold text-gray-900"
            >
              <option value="NEW">New Tax Regime (Default / Lower Slabs)</option>
              <option value="OLD">Old Tax Regime (With 80C/80D Exemptions)</option>
            </select>
          </div>
        </div>

        {/* Toggles for PF / ESI / PT */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 bg-gray-50/60 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.pf_applicable !== false}
              onChange={(e) => onChange({ pf_applicable: e.target.checked })}
              className="w-4 h-4 rounded text-[#07563D] focus:ring-0"
            />
            <div>
              <p className="text-xs font-bold text-gray-900">EPF Applicable</p>
              <p className="text-[10px] text-gray-500">12% Employee & Employer Contribution</p>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 bg-gray-50/60 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.esi_applicable === true}
              onChange={(e) => onChange({ esi_applicable: e.target.checked })}
              className="w-4 h-4 rounded text-[#07563D] focus:ring-0"
            />
            <div>
              <p className="text-xs font-bold text-gray-900">ESIC Applicable</p>
              <p className="text-[10px] text-gray-500">Medical cover for wages ≤ ₹21,000</p>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 bg-gray-50/60 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.pt_applicable !== false}
              onChange={(e) => onChange({ pt_applicable: e.target.checked })}
              className="w-4 h-4 rounded text-[#07563D] focus:ring-0"
            />
            <div>
              <p className="text-xs font-bold text-gray-900">Professional Tax (PT)</p>
              <p className="text-[10px] text-gray-500">State statutory half-yearly slab</p>
            </div>
          </label>
        </div>
      </div>

      {/* 4. Optional Family & Dependents */}
      <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#07563D]" />
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
              Family Members & Nominees (Optional)
            </h4>
          </div>

          {!isAddingFamily && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setIsAddingFamily(true)}
              className="text-xs h-7 px-2.5 bg-white text-[#07563D] border-gray-200 font-bold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Family Member
            </Button>
          )}
        </div>

        {/* Add Family Inline Form */}
        {isAddingFamily && (
          <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-xs space-y-3">
            <h5 className="text-xs font-bold text-gray-800">Add New Family Member</h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newFamName}
                  onChange={(e) => setNewFamName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Relationship</label>
                <select
                  value={newFamRelation}
                  onChange={(e) => setNewFamRelation(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none"
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Child">Child</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Dependent">Dependent</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Phone</label>
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={newFamPhone}
                  onChange={(e) => setNewFamPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={newFamDependent}
                  onChange={(e) => setNewFamDependent(e.target.checked)}
                  className="rounded text-[#07563D] focus:ring-0"
                />
                Statutory Dependent for insurance/ESI
              </label>

              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setIsAddingFamily(false)} className="text-xs h-7">
                  Cancel
                </Button>
                <Button size="sm" variant="primary" onClick={handleAddFamilyMember} className="text-xs h-7 bg-[#07563D]">
                  Save Member
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Family Cards List */}
        {(formData.family_members || []).length === 0 && !isAddingFamily ? (
          <p className="text-xs text-gray-400 italic">No family members added yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(formData.family_members || []).map((fam) => (
              <div
                key={fam.id}
                className="p-3 rounded-xl bg-white border border-gray-200 flex items-center justify-between shadow-2xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">{fam.name}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-gray-100 text-gray-700">
                      {fam.relationship}
                    </span>
                  </div>
                  {fam.phone && (
                    <p className="text-[11px] text-gray-500">{fam.phone}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveFamilyMember(fam.id)}
                  className="p-1 text-gray-400 hover:text-rose-600 rounded"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
