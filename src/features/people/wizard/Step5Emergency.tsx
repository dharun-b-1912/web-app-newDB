import React, { useState } from 'react';
import { ShieldAlert, Plus, Trash2, Heart, Users, User } from 'lucide-react';
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
          Emergency Contacts & Family Details
        </h3>
        <p className="text-xs text-gray-500">
          Designate primary point of contact during health/safety emergencies and optional dependents.
        </p>
      </div>

      {/* Primary Emergency Contact */}
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

      {/* Optional Family & Dependents */}
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
