import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import {
  profileService,
  FullProfileContext,
  PersonalDetails,
  ContactDetails,
  AddressDetails,
  EmergencyContactRecord,
  NomineeRecord,
} from '../../services/profileService';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  Calendar,
  CreditCard,
  FileText,
  Shield,
  ShieldCheck,
  Bell,
  History,
  Users,
  Camera,
  Edit2,
  Check,
  X,
  AlertCircle,
  Lock,
  Smartphone,
  Laptop,
  CheckCircle2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export const MyProfileView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<FullProfileContext | null>(null);
  const [activeTab, setActiveTab] = useState<string>('personal');

  // Edit Modes
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState<PersonalDetails | null>(null);

  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState<ContactDetails | null>(null);

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressDetails | null>(null);

  // Bank & Statutory Request Modals
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankForm, setBankForm] = useState({ bankName: '', accountNumber: '', ifscCode: '', branchName: '', reason: '' });

  const [isStatutoryModalOpen, setIsStatutoryModalOpen] = useState(false);
  const [statutoryForm, setStatutoryForm] = useState({ field: 'PAN Number', newValue: '', reason: '' });

  // Emergency Contact & Nominee Modals
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [emergencyForm, setEmergencyForm] = useState<Omit<EmergencyContactRecord, 'id'>>({
    name: '',
    relationship: 'Spouse',
    primaryPhone: '',
    alternatePhone: '',
    email: '',
    address: '',
    isPrimary: false,
  });

  const [isNomineeModalOpen, setIsNomineeModalOpen] = useState(false);
  const [nomineeForm, setNomineeForm] = useState<Omit<NomineeRecord, 'id'>>({
    schemeType: 'PF Nominee',
    name: '',
    relationship: 'Spouse',
    dateOfBirth: '',
    phone: '',
    sharePercent: 100,
    address: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await profileService.getProfileContext(user);
      setProfile(data);
      setPersonalForm(data.personal);
      setContactForm(data.contact);
      setAddressForm(data.address);
    } catch (err) {
      showToast('Unable to load employee profile.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  // Avatar Upload Handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 3 * 1024 * 1024) {
      showToast('Photo size must be under 3MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const updated = await profileService.updateProfilePhoto(user, dataUrl);
        setProfile(updated);
        showToast('Profile photo updated successfully!');
      } catch {
        showToast('Failed to update profile photo.', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  // Personal Info Submit
  const handleSavePersonal = async () => {
    if (!user || !personalForm) return;
    try {
      const updated = await profileService.updatePersonalDetails(user, personalForm);
      setProfile(updated);
      setIsEditingPersonal(false);
      showToast('Personal details updated successfully!');
    } catch {
      showToast('Failed to update personal details.', 'error');
    }
  };

  // Contact Info Submit
  const handleSaveContact = async () => {
    if (!user || !contactForm) return;
    try {
      const updated = await profileService.updateContactDetails(user, contactForm);
      setProfile(updated);
      setIsEditingContact(false);
      showToast('Contact details updated successfully!');
    } catch {
      showToast('Failed to update contact details.', 'error');
    }
  };

  // Address Submit
  const handleSaveAddress = async () => {
    if (!user || !addressForm) return;
    try {
      const updated = await profileService.updateAddressDetails(user, addressForm);
      setProfile(updated);
      setIsEditingAddress(false);
      showToast('Address details updated successfully!');
    } catch {
      showToast('Failed to update address details.', 'error');
    }
  };

  // Bank Change Request
  const handleRequestBankChange = async () => {
    if (!user || !bankForm.bankName || !bankForm.accountNumber || !bankForm.ifscCode) {
      showToast('Please fill all required bank fields.', 'error');
      return;
    }
    await profileService.requestBankDetailsChange(user, bankForm);
    setIsBankModalOpen(false);
    setBankForm({ bankName: '', accountNumber: '', ifscCode: '', branchName: '', reason: '' });
    showToast('Bank change request submitted for HR verification!', 'info');
    loadProfile();
  };

  // Statutory Correction Request
  const handleRequestStatutoryCorrection = async () => {
    if (!user || !statutoryForm.newValue || !statutoryForm.reason) {
      showToast('Please specify the new value and reason.', 'error');
      return;
    }
    await profileService.requestStatutoryCorrection(user, statutoryForm);
    setIsStatutoryModalOpen(false);
    setStatutoryForm({ field: 'PAN Number', newValue: '', reason: '' });
    showToast('Statutory correction request submitted!', 'info');
    loadProfile();
  };

  if (isLoading || !profile) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="h-40 bg-gray-100 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-80 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="md:col-span-3 h-96 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  const { employee, legalEntity, organization, personal, contact, address, employment, bank, statutory } = profile;

  const TABS = [
    { id: 'personal', label: 'Personal Information', icon: User },
    { id: 'contact', label: 'Contact & Addresses', icon: MapPin },
    { id: 'employment', label: 'Employment Profile', icon: Briefcase },
    { id: 'bank', label: 'Bank & Payroll', icon: CreditCard },
    { id: 'statutory', label: 'PF / ESI / Tax', icon: FileText },
    { id: 'nominees', label: 'Family & Nominees', icon: Users },
    { id: 'emergency', label: 'Emergency Contacts', icon: Phone },
    { id: 'documents', label: 'My Documents', icon: FileText },
    { id: 'security', label: 'Account & Security', icon: ShieldCheck },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'activity', label: 'Activity Log', icon: History },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <Breadcrumb items={[{ label: 'Home' }, { label: 'My Profile' }]} />

      {/* 1. Large Enterprise Profile Header Card */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-100/40 via-transparent to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar with Upload Trigger */}
            <div className="relative group shrink-0">
              <Avatar
                name={employee.display_name || user?.name || 'Hari Priya'}
                src={employee.avatar_url || user?.avatar_url}
                size="2xl"
                className="w-24 h-24 sm:w-28 sm:h-28 text-2xl font-black shadow-md border-4 border-white"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload profile photo"
                className="absolute bottom-0 right-0 p-2 bg-[#07563D] hover:bg-[#0b7a57] text-white rounded-full shadow-lg transition-transform transform group-hover:scale-110 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            {/* Profile Info Summary */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  {personal.preferredName || employee.display_name || 'Hari Priya'}
                </h1>
                <Badge variant="emerald" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-xs font-bold px-2.5 py-0.5">
                  {employment.status}
                </Badge>
                <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-mono font-bold">
                  {employment.employeeCode}
                </span>
              </div>

              <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-gray-400" />
                <span>{employment.designationTitle}</span>
                <span className="text-gray-300">•</span>
                <span>{employment.departmentName}</span>
              </p>

              <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap pt-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  {legalEntity.legal_name}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {employment.workLocation}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  Joined {employment.joiningDate}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('personal')}
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Edit Profile
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveTab('security')}
              leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Security Settings
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Main Workspace: Vertical Navigation & Section Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Nav Tabs */}
        <div className="lg:col-span-3 space-y-1">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-2 shadow-2xs space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 text-[#07563D] font-extrabold shadow-2xs border border-emerald-100'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#07563D]' : 'text-gray-400'}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Section Content */}
        <div className="lg:col-span-9 space-y-6">
          {/* TAB 1: PERSONAL INFORMATION */}
          {activeTab === 'personal' && (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-base font-black text-gray-900">Personal Information</h2>
                  <p className="text-xs text-gray-500">Legal names, identity, and personal demographic records.</p>
                </div>
                {!isEditingPersonal ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditingPersonal(true)} leftIcon={<Edit2 className="w-3.5 h-3.5" />}>
                    Edit Details
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditingPersonal(false)}>Cancel</Button>
                    <Button variant="primary" size="sm" onClick={handleSavePersonal} leftIcon={<Check className="w-3.5 h-3.5" />}>Save</Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Legal First Name</label>
                  {isEditingPersonal ? (
                    <input
                      type="text"
                      value={personalForm?.legalFirstName || ''}
                      onChange={(e) => setPersonalForm(prev => prev ? { ...prev, legalFirstName: e.target.value } : null)}
                      className="mt-1 w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold"
                    />
                  ) : (
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{personal.legalFirstName}</p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Legal Last Name</label>
                  {isEditingPersonal ? (
                    <input
                      type="text"
                      value={personalForm?.legalLastName || ''}
                      onChange={(e) => setPersonalForm(prev => prev ? { ...prev, legalLastName: e.target.value } : null)}
                      className="mt-1 w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold"
                    />
                  ) : (
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{personal.legalLastName}</p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Preferred Display Name</label>
                  {isEditingPersonal ? (
                    <input
                      type="text"
                      value={personalForm?.preferredName || ''}
                      onChange={(e) => setPersonalForm(prev => prev ? { ...prev, preferredName: e.target.value } : null)}
                      className="mt-1 w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold"
                    />
                  ) : (
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{personal.preferredName}</p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Date of Birth</label>
                  {isEditingPersonal ? (
                    <input
                      type="date"
                      value={personalForm?.dateOfBirth || ''}
                      onChange={(e) => setPersonalForm(prev => prev ? { ...prev, dateOfBirth: e.target.value } : null)}
                      className="mt-1 w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold"
                    />
                  ) : (
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{personal.dateOfBirth || '14 Aug 1993'}</p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Gender</label>
                  {isEditingPersonal ? (
                    <select
                      value={personalForm?.gender || 'Female'}
                      onChange={(e) => setPersonalForm(prev => prev ? { ...prev, gender: e.target.value } : null)}
                      className="mt-1 w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold bg-white"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Non-Binary">Non-Binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  ) : (
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{personal.gender || 'Female'}</p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Marital Status</label>
                  {isEditingPersonal ? (
                    <select
                      value={personalForm?.maritalStatus || 'Married'}
                      onChange={(e) => setPersonalForm(prev => prev ? { ...prev, maritalStatus: e.target.value } : null)}
                      className="mt-1 w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold bg-white"
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                    </select>
                  ) : (
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{personal.maritalStatus || 'Married'}</p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Blood Group</label>
                  {isEditingPersonal ? (
                    <input
                      type="text"
                      value={personalForm?.bloodGroup || 'O+'}
                      onChange={(e) => setPersonalForm(prev => prev ? { ...prev, bloodGroup: e.target.value } : null)}
                      className="mt-1 w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold"
                    />
                  ) : (
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{personal.bloodGroup || 'O+'}</p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Nationality</label>
                  {isEditingPersonal ? (
                    <input
                      type="text"
                      value={personalForm?.nationality || 'Indian'}
                      onChange={(e) => setPersonalForm(prev => prev ? { ...prev, nationality: e.target.value } : null)}
                      className="mt-1 w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold"
                    />
                  ) : (
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{personal.nationality || 'Indian'}</p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Preferred Language</label>
                  {isEditingPersonal ? (
                    <input
                      type="text"
                      value={personalForm?.preferredLanguage || 'English'}
                      onChange={(e) => setPersonalForm(prev => prev ? { ...prev, preferredLanguage: e.target.value } : null)}
                      className="mt-1 w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold"
                    />
                  ) : (
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{personal.preferredLanguage || 'English'}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTACT & ADDRESSES */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              {/* Contact Details Card */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div>
                    <h2 className="text-base font-black text-gray-900">Contact Information</h2>
                    <p className="text-xs text-gray-500">Corporate work email, personal email, and verified mobile numbers.</p>
                  </div>
                  {!isEditingContact ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditingContact(true)} leftIcon={<Edit2 className="w-3.5 h-3.5" />}>
                      Edit Contacts
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsEditingContact(false)}>Cancel</Button>
                      <Button variant="primary" size="sm" onClick={handleSaveContact} leftIcon={<Check className="w-3.5 h-3.5" />}>Save</Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Work Email (Authoritative)</label>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm font-bold text-gray-900">{contact.workEmail}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Personal Email</label>
                    {isEditingContact ? (
                      <input
                        type="email"
                        value={contactForm?.personalEmail || ''}
                        onChange={(e) => setContactForm(prev => prev ? { ...prev, personalEmail: e.target.value } : null)}
                        className="mt-1 w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold"
                      />
                    ) : (
                      <p className="text-sm font-bold text-gray-900 mt-1">{contact.personalEmail || 'haripriya.personal@gmail.com'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Primary Mobile Number</label>
                    {isEditingContact ? (
                      <input
                        type="tel"
                        value={contactForm?.primaryMobile || ''}
                        onChange={(e) => setContactForm(prev => prev ? { ...prev, primaryMobile: e.target.value } : null)}
                        className="mt-1 w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold"
                      />
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-bold text-gray-900">{contact.primaryMobile}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Alternate Mobile Number</label>
                    {isEditingContact ? (
                      <input
                        type="tel"
                        value={contactForm?.alternateMobile || ''}
                        onChange={(e) => setContactForm(prev => prev ? { ...prev, alternateMobile: e.target.value } : null)}
                        className="mt-1 w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold"
                      />
                    ) : (
                      <p className="text-sm font-bold text-gray-900 mt-1">{contact.alternateMobile || '+91 98409 87654'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Address Details Card */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div>
                    <h2 className="text-base font-black text-gray-900">Residential Addresses</h2>
                    <p className="text-xs text-gray-500">Current residence and permanent home address records.</p>
                  </div>
                  {!isEditingAddress ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditingAddress(true)} leftIcon={<Edit2 className="w-3.5 h-3.5" />}>
                      Edit Address
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsEditingAddress(false)}>Cancel</Button>
                      <Button variant="primary" size="sm" onClick={handleSaveAddress} leftIcon={<Check className="w-3.5 h-3.5" />}>Save</Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Current Address */}
                  <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
                    <div className="text-xs font-extrabold text-[#07563D] uppercase">Current Address</div>
                    {isEditingAddress ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Line 1"
                          value={addressForm?.currentAddress.line1 || ''}
                          onChange={(e) => setAddressForm(prev => prev ? { ...prev, currentAddress: { ...prev.currentAddress, line1: e.target.value } } : null)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold"
                        />
                        <input
                          type="text"
                          placeholder="City"
                          value={addressForm?.currentAddress.city || ''}
                          onChange={(e) => setAddressForm(prev => prev ? { ...prev, currentAddress: { ...prev.currentAddress, city: e.target.value } } : null)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="State"
                            value={addressForm?.currentAddress.state || ''}
                            onChange={(e) => setAddressForm(prev => prev ? { ...prev, currentAddress: { ...prev.currentAddress, state: e.target.value } } : null)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold"
                          />
                          <input
                            type="text"
                            placeholder="Postal Code"
                            value={addressForm?.currentAddress.postalCode || ''}
                            onChange={(e) => setAddressForm(prev => prev ? { ...prev, currentAddress: { ...prev.currentAddress, postalCode: e.target.value } } : null)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-gray-700 leading-relaxed">
                        {address.currentAddress.line1}, {address.currentAddress.line2}<br />
                        {address.currentAddress.city}, {address.currentAddress.state} - {address.currentAddress.postalCode}<br />
                        {address.currentAddress.country}
                      </p>
                    )}
                  </div>

                  {/* Permanent Address */}
                  <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
                    <div className="text-xs font-extrabold text-[#07563D] uppercase">Permanent Address</div>
                    <p className="text-xs font-semibold text-gray-700 leading-relaxed">
                      {address.permanentAddress.line1}, {address.permanentAddress.line2}<br />
                      {address.permanentAddress.city}, {address.permanentAddress.state} - {address.permanentAddress.postalCode}<br />
                      {address.permanentAddress.country}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EMPLOYMENT PROFILE (MANAGED BY HR) */}
          {activeTab === 'employment' && (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-base font-black text-gray-900">Employment Master Profile</h2>
                  <p className="text-xs text-gray-500">Official workplace parameters, reporting structure, and employment contracts.</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                  <Lock className="w-3.5 h-3.5 text-amber-600" /> Managed by HR Operations
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Employee Code</label>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{employment.employeeCode}</p>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Designation</label>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{employment.designationTitle}</p>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Department</label>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{employment.departmentName}</p>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Legal Entity</label>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{employment.legalEntityName}</p>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Employment Type</label>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{employment.employmentType}</p>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Work Location</label>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{employment.workLocation}</p>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Date of Joining</label>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{employment.joiningDate}</p>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Confirmation Date</label>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{employment.confirmationDate || '01 Jul 2024'}</p>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Reporting Supervisor</label>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{employment.reportingManagerName}</p>
                </div>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/70 flex items-center justify-between text-xs text-gray-600">
                <span>To request an official transfer, promotion, or reporting line change:</span>
                <Button variant="outline" size="sm" className="text-xs">
                  Request HR Change
                </Button>
              </div>
            </div>
          )}

          {/* TAB 4: BANK & PAYROLL */}
          {activeTab === 'bank' && (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-base font-black text-gray-900">Bank & Salary Account</h2>
                  <p className="text-xs text-gray-500">Registered bank details for monthly payroll disbursement.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsBankModalOpen(true)} leftIcon={<CreditCard className="w-3.5 h-3.5" />}>
                  Request Account Update
                </Button>
              </div>

              {bank ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Bank Name</label>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{bank.bankName}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Account Number (Masked)</label>
                    <p className="text-sm font-mono font-bold text-gray-900 mt-0.5">{bank.accountNumberMasked}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Account Holder</label>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{bank.accountHolderName}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase">IFSC Code</label>
                    <p className="text-sm font-mono font-bold text-gray-900 mt-0.5">{bank.ifscCode}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Branch Name</label>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{bank.branchName}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Payment Method</label>
                    <p className="text-sm font-bold text-emerald-800 mt-0.5">{bank.paymentMethod}</p>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400 text-xs">No salary account registered.</div>
              )}
            </div>
          )}

          {/* TAB 5: STATUTORY / PF / ESI / TAX */}
          {activeTab === 'statutory' && (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-base font-black text-gray-900">PF, ESI & Statutory Identifiers</h2>
                  <p className="text-xs text-gray-500">Government statutory registrations and tax regime configuration.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsStatutoryModalOpen(true)} leftIcon={<FileText className="w-3.5 h-3.5" />}>
                  Request Correction
                </Button>
              </div>

              {statutory ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Permanent Account Number (PAN)</label>
                    <p className="text-sm font-mono font-bold text-gray-900 mt-1">{statutory.panMasked}</p>
                    <span className="text-[10px] text-emerald-700 font-semibold">Verified with NSDL</span>
                  </div>

                  <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Universal Account Number (UAN)</label>
                    <p className="text-sm font-mono font-bold text-gray-900 mt-1">{statutory.uanMasked}</p>
                    <span className="text-[10px] text-emerald-700 font-semibold">EPFO Registered</span>
                  </div>

                  <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Provident Fund Member ID</label>
                    <p className="text-sm font-mono font-bold text-gray-900 mt-1">{statutory.pfNumber}</p>
                    <span className="text-[10px] text-gray-500 font-medium">Status: {statutory.pfStatus}</span>
                  </div>

                  <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                    <label className="text-[11px] font-bold text-gray-500 uppercase">ESI IP Number</label>
                    <p className="text-sm font-mono font-bold text-gray-900 mt-1">{statutory.esiNumberMasked}</p>
                    <span className="text-[10px] text-gray-500 font-medium">Status: {statutory.esiStatus}</span>
                  </div>

                  <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Income Tax Regime</label>
                    <p className="text-sm font-bold text-indigo-700 mt-1">{statutory.taxRegime} Tax Regime</p>
                    <span className="text-[10px] text-gray-500 font-medium">Sec 115BAC Default</span>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 6: FAMILY & NOMINEES */}
          {activeTab === 'nominees' && (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-base font-black text-gray-900">Family & Nominees</h2>
                  <p className="text-xs text-gray-500">Designated beneficiaries for statutory schemes (PF, Gratuity, Insurance).</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsNomineeModalOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Add Nominee
                </Button>
              </div>

              <div className="space-y-3">
                {profile.nominees.map((nom) => (
                  <div key={nom.id} className="p-4 rounded-xl border border-gray-200/80 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{nom.name}</span>
                        <Badge variant="emerald" className="text-[10px] font-bold">{nom.schemeType}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        Relationship: <strong className="text-gray-700">{nom.relationship}</strong> • Share: <strong className="text-emerald-700">{nom.sharePercent}%</strong>
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={async () => {
                      if (!user) return;
                      const updated = await profileService.deleteNominee(user, nom.id);
                      setProfile(updated);
                      showToast('Nominee deleted.');
                    }}>
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: EMERGENCY CONTACTS */}
          {activeTab === 'emergency' && (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-base font-black text-gray-900">Emergency Contacts</h2>
                  <p className="text-xs text-gray-500">Critical contacts reachable during medical or workplace emergencies.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEmergencyModalOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Add Contact
                </Button>
              </div>

              <div className="space-y-3">
                {profile.emergencyContacts.map((emg) => (
                  <div key={emg.id} className="p-4 rounded-xl border border-gray-200/80 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{emg.name}</span>
                        {emg.isPrimary && (
                          <Badge variant="emerald" className="text-[10px] font-bold">Primary Contact</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Relationship: <strong className="text-gray-700">{emg.relationship}</strong> • Phone: <strong className="text-gray-900">{emg.primaryPhone}</strong>
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={async () => {
                      if (!user) return;
                      const updated = await profileService.deleteEmergencyContact(user, emg.id);
                      setProfile(updated);
                      showToast('Emergency contact deleted.');
                    }}>
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: MY DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-base font-black text-gray-900">Official Documents Repository</h2>
                  <p className="text-xs text-gray-500">Verified KYC, appointment contracts, and statutory certificates.</p>
                </div>
                <Button variant="outline" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Upload Document
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.documents.map((doc) => (
                  <div key={doc.id} className="p-4 rounded-xl border border-gray-200/80 flex items-center justify-between hover:bg-gray-50/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900">{doc.type}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{doc.fileName}</div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 9: ACCOUNT & SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Active Sessions */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div>
                    <h2 className="text-base font-black text-gray-900">Active Login Sessions</h2>
                    <p className="text-xs text-gray-500">Devices currently authenticated to your WorkForceOS account.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {profile.sessions.map((sess) => (
                    <div key={sess.id} className="p-4 rounded-xl border border-gray-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold">
                          {sess.deviceName.includes('iPhone') ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900">{sess.deviceName}</span>
                            {sess.isCurrent && (
                              <Badge variant="emerald" className="text-[10px] font-bold">Current Session</Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {sess.ipAddress} • {sess.locationName} • Last active: {sess.lastActive}
                          </div>
                        </div>
                      </div>
                      {!sess.isCurrent && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!user) return;
                            const updated = await profileService.revokeSession(user, sess.id);
                            setProfile(updated);
                            showToast('Session revoked.');
                          }}
                          className="text-xs text-rose-600"
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs space-y-6">
              <div className="pb-4 border-b border-gray-100">
                <h2 className="text-base font-black text-gray-900">Notification Preferences</h2>
                <p className="text-xs text-gray-500">Control alert delivery channels for leave, attendance, payroll, and security.</p>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'leave', label: 'Leave Requests & Approvals', desc: 'Alerts when leave is submitted, approved, or rejected.' },
                  { key: 'attendance', label: 'Attendance & Regularization', desc: 'Notifications on missing check-outs and regularization status.' },
                  { key: 'payroll', label: 'Payslip & Salary Credit', desc: 'Monthly payslip published notifications.' },
                  { key: 'security', label: 'Security & Sign-in Alerts', desc: 'Mandatory alerts on unrecognized device logins and password updates.' },
                ].map((item) => (
                  <div key={item.key} className="p-4 rounded-xl border border-gray-200/80 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-gray-900">{item.label}</div>
                      <div className="text-[11px] text-gray-500">{item.desc}</div>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#07563D] rounded cursor-pointer" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 11: ACTIVITY LOG */}
          {activeTab === 'activity' && (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-2xs space-y-6">
              <div className="pb-4 border-b border-gray-100">
                <h2 className="text-base font-black text-gray-900">Profile Audit Activity</h2>
                <p className="text-xs text-gray-500">Complete immutable record of all profile changes, requests, and updates.</p>
              </div>

              <div className="space-y-3">
                {profile.recentActivity.map((act) => (
                  <div key={act.id} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-gray-900">{act.details}</div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> {new Date(act.timestamp).toLocaleString()} • Actor: {act.actorName}
                      </div>
                    </div>
                    <Badge variant="gray" className="text-[10px] font-mono">{act.action}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bank Change Request Modal */}
      {isBankModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-gray-900">Request Bank Account Update</h3>
            <p className="text-xs text-gray-500">Changes will be reviewed by HR Finance Operations before taking effect.</p>

            <div className="space-y-3 text-xs">
              <input
                type="text"
                placeholder="Bank Name (e.g. HDFC Bank)"
                value={bankForm.bankName}
                onChange={(e) => setBankForm(p => ({ ...p, bankName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
              />
              <input
                type="text"
                placeholder="Account Number"
                value={bankForm.accountNumber}
                onChange={(e) => setBankForm(p => ({ ...p, accountNumber: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold font-mono"
              />
              <input
                type="text"
                placeholder="IFSC Code"
                value={bankForm.ifscCode}
                onChange={(e) => setBankForm(p => ({ ...p, ifscCode: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold font-mono"
              />
              <input
                type="text"
                placeholder="Branch Name"
                value={bankForm.branchName}
                onChange={(e) => setBankForm(p => ({ ...p, branchName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
              />
              <textarea
                placeholder="Reason for change"
                value={bankForm.reason}
                onChange={(e) => setBankForm(p => ({ ...p, reason: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsBankModalOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleRequestBankChange}>Submit Request</Button>
            </div>
          </div>
        </div>
      )}

      {/* Statutory Correction Modal */}
      {isStatutoryModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-gray-900">Request Statutory Correction</h3>
            <p className="text-xs text-gray-500">Request corrections for PAN, UAN, or PF member details.</p>

            <div className="space-y-3 text-xs">
              <select
                value={statutoryForm.field}
                onChange={(e) => setStatutoryForm(p => ({ ...p, field: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold bg-white"
              >
                <option value="PAN Number">PAN Number</option>
                <option value="UAN Number">UAN Number</option>
                <option value="PF Member ID">PF Member ID</option>
                <option value="Tax Regime">Tax Regime</option>
              </select>
              <input
                type="text"
                placeholder="New Value"
                value={statutoryForm.newValue}
                onChange={(e) => setStatutoryForm(p => ({ ...p, newValue: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold font-mono"
              />
              <textarea
                placeholder="Reason for correction"
                value={statutoryForm.reason}
                onChange={(e) => setStatutoryForm(p => ({ ...p, reason: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsStatutoryModalOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleRequestStatutoryCorrection}>Submit Correction</Button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Contact Modal */}
      {isEmergencyModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-gray-900">Add Emergency Contact</h3>
            <div className="space-y-3 text-xs">
              <input
                type="text"
                placeholder="Contact Name"
                value={emergencyForm.name}
                onChange={(e) => setEmergencyForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
              />
              <input
                type="text"
                placeholder="Relationship (e.g. Spouse, Parent)"
                value={emergencyForm.relationship}
                onChange={(e) => setEmergencyForm(p => ({ ...p, relationship: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
              />
              <input
                type="tel"
                placeholder="Primary Phone Number"
                value={emergencyForm.primaryPhone}
                onChange={(e) => setEmergencyForm(p => ({ ...p, primaryPhone: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
              />
              <input
                type="text"
                placeholder="Address"
                value={emergencyForm.address}
                onChange={(e) => setEmergencyForm(p => ({ ...p, address: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsEmergencyModalOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={async () => {
                if (!user || !emergencyForm.name || !emergencyForm.primaryPhone) {
                  showToast('Name and phone are required.', 'error');
                  return;
                }
                const updated = await profileService.saveEmergencyContact(user, emergencyForm);
                setProfile(updated);
                setIsEmergencyModalOpen(false);
                showToast('Emergency contact added!');
              }}>Save Contact</Button>
            </div>
          </div>
        </div>
      )}

      {/* Nominee Modal */}
      {isNomineeModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-gray-900">Add Scheme Nominee</h3>
            <div className="space-y-3 text-xs">
              <select
                value={nomineeForm.schemeType}
                onChange={(e) => setNomineeForm(p => ({ ...p, schemeType: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold bg-white"
              >
                <option value="PF Nominee">PF Nominee</option>
                <option value="Gratuity Nominee">Gratuity Nominee</option>
                <option value="ESI Nominee">ESI Nominee</option>
                <option value="Insurance Nominee">Insurance Nominee</option>
              </select>
              <input
                type="text"
                placeholder="Nominee Name"
                value={nomineeForm.name}
                onChange={(e) => setNomineeForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
              />
              <input
                type="text"
                placeholder="Relationship"
                value={nomineeForm.relationship}
                onChange={(e) => setNomineeForm(p => ({ ...p, relationship: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
              />
              <input
                type="number"
                placeholder="Share Percentage (e.g. 100)"
                value={nomineeForm.sharePercent}
                onChange={(e) => setNomineeForm(p => ({ ...p, sharePercent: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsNomineeModalOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={async () => {
                if (!user || !nomineeForm.name) {
                  showToast('Nominee name is required.', 'error');
                  return;
                }
                const updated = await profileService.saveNominee(user, nomineeForm);
                setProfile(updated);
                setIsNomineeModalOpen(false);
                showToast('Nominee saved successfully!');
              }}>Save Nominee</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
