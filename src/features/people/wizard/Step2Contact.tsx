import React from 'react';
import { MapPin, Mail, Phone, Heart, Globe, CheckSquare, Square } from 'lucide-react';

export interface Step2FormData {
  personal_email: string;
  alternate_phone: string;
  marital_status: string;
  nationality: string;
  blood_group: string;
  preferred_language: string;
  current_line1: string;
  current_line2: string;
  current_city: string;
  current_state: string;
  current_country: string;
  current_postal: string;
  same_as_permanent: boolean;
  perm_line1: string;
  perm_line2: string;
  perm_city: string;
  perm_state: string;
  perm_country: string;
  perm_postal: string;
}

interface Props {
  formData: Step2FormData;
  onChange: (fields: Partial<Step2FormData>) => void;
}

export const Step2Contact: React.FC<Props> = ({ formData, onChange }) => {
  const handleToggleSameAddress = () => {
    const nextState = !formData.same_as_permanent;
    if (nextState) {
      onChange({
        same_as_permanent: true,
        perm_line1: formData.current_line1,
        perm_line2: formData.current_line2,
        perm_city: formData.current_city,
        perm_state: formData.current_state,
        perm_country: formData.current_country,
        perm_postal: formData.current_postal,
      });
    } else {
      onChange({ same_as_permanent: false });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-black text-gray-900 tracking-tight">
          Personal & Contact Details
        </h3>
        <p className="text-xs text-gray-500">
          Provide residential address, personal communications, and background demographic details.
        </p>
      </div>

      {/* Contact & Demographics */}
      <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-4">
        <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
          Secondary Contact & Demographics
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Personal Email <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="email"
              placeholder="anand.personal@gmail.com"
              value={formData.personal_email}
              onChange={(e) => onChange({ personal_email: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Alternate Phone
            </label>
            <input
              type="tel"
              placeholder="+91 94433 11223"
              value={formData.alternate_phone}
              onChange={(e) => onChange({ alternate_phone: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Marital Status
            </label>
            <select
              value={formData.marital_status}
              onChange={(e) => onChange({ marital_status: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
            >
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Blood Group
            </label>
            <select
              value={formData.blood_group}
              onChange={(e) => onChange({ blood_group: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
            >
              <option value="O+">O Positive (O+)</option>
              <option value="O-">O Negative (O-)</option>
              <option value="A+">A Positive (A+)</option>
              <option value="A-">A Negative (A-)</option>
              <option value="B+">B Positive (B+)</option>
              <option value="B-">B Negative (B-)</option>
              <option value="AB+">AB Positive (AB+)</option>
              <option value="AB-">AB Negative (AB-)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Nationality
            </label>
            <input
              type="text"
              value={formData.nationality}
              onChange={(e) => onChange({ nationality: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Preferred Language
            </label>
            <input
              type="text"
              placeholder="e.g. English, Tamil, Hindi"
              value={formData.preferred_language}
              onChange={(e) => onChange({ preferred_language: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
            />
          </div>
        </div>
      </div>

      {/* Current Address */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#07563D]" />
          <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
            Current / Residential Address
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Address Line 1
            </label>
            <input
              type="text"
              placeholder="Flat / Door No, Apartment or Building Name"
              value={formData.current_line1}
              onChange={(e) => onChange({ current_line1: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Address Line 2 <span className="text-gray-400 font-normal">(Street / Area)</span>
            </label>
            <input
              type="text"
              placeholder="Street Name, Landmark, Area"
              value={formData.current_line2}
              onChange={(e) => onChange({ current_line2: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={formData.current_city}
              onChange={(e) => onChange({ current_city: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">State</label>
            <input
              type="text"
              value={formData.current_state}
              onChange={(e) => onChange({ current_state: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Country</label>
            <input
              type="text"
              value={formData.current_country}
              onChange={(e) => onChange({ current_country: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Postal Code</label>
            <input
              type="text"
              value={formData.current_postal}
              onChange={(e) => onChange({ current_postal: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Permanent Address */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-700" />
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
              Permanent Address
            </h4>
          </div>

          <button
            type="button"
            onClick={handleToggleSameAddress}
            className="flex items-center gap-1.5 text-xs font-bold text-[#07563D] hover:underline"
          >
            {formData.same_as_permanent ? (
              <CheckSquare className="w-4 h-4 text-[#07563D]" />
            ) : (
              <Square className="w-4 h-4 text-gray-400" />
            )}
            Same as Current Address
          </button>
        </div>

        {!formData.same_as_permanent && (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Permanent Address Line 1
                </label>
                <input
                  type="text"
                  value={formData.perm_line1}
                  onChange={(e) => onChange({ perm_line1: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Permanent Address Line 2
                </label>
                <input
                  type="text"
                  value={formData.perm_line2}
                  onChange={(e) => onChange({ perm_line2: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.perm_city}
                  onChange={(e) => onChange({ perm_city: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={formData.perm_state}
                  onChange={(e) => onChange({ perm_state: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={formData.perm_country}
                  onChange={(e) => onChange({ perm_country: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={formData.perm_postal}
                  onChange={(e) => onChange({ perm_postal: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
