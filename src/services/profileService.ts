import { User, Employee, Company, Organization } from '../types';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { api } from './api';
import { organizationContextService } from './organizationContextService';
import { hrEventBus } from './hrEventBus';

export interface PersonalDetails {
  legalFirstName: string;
  legalMiddleName?: string;
  legalLastName: string;
  preferredName: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  bloodGroup?: string;
  preferredLanguage?: string;
}

export interface ContactDetails {
  workEmail: string;
  personalEmail?: string;
  primaryMobile: string;
  alternateMobile?: string;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
}

export interface AddressDetails {
  currentAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  permanentAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  sameAsPermanent: boolean;
}

export interface BankDetails {
  id: string;
  bankName: string;
  accountNumberMasked: string;
  accountHolderName: string;
  ifscCode: string;
  branchName: string;
  paymentMethod: string;
  isPrimary: boolean;
}

export interface StatutoryDetails {
  panMasked: string;
  uanMasked: string;
  pfNumber: string;
  pfStatus: string;
  pfJoiningDate?: string;
  esiNumberMasked?: string;
  esiStatus: string;
  taxRegime: 'Old' | 'New';
}

export interface NomineeRecord {
  id: string;
  schemeType: string;
  name: string;
  relationship: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  sharePercent: number;
  address?: string;
}

export interface EmergencyContactRecord {
  id: string;
  name: string;
  relationship: string;
  primaryPhone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  isPrimary: boolean;
}

export interface DocumentRecord {
  id: string;
  category: 'Identity' | 'Tax' | 'Bank' | 'Employment' | 'Education' | 'Certificates' | 'Other';
  type: string;
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  verificationStatus: 'Verified' | 'Pending' | 'Rejected';
  uploadedAt: string;
}

export interface ActiveSessionRecord {
  id: string;
  deviceName: string;
  browserName: string;
  ipAddress: string;
  locationName: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface NotificationPreferences {
  email: { leave: boolean; attendance: boolean; payroll: boolean; approvals: boolean; security: boolean };
  sms: { leave: boolean; attendance: boolean; payroll: boolean; approvals: boolean; security: boolean };
  whatsapp: { leave: boolean; attendance: boolean; payroll: boolean; approvals: boolean; security: boolean };
  inApp: { leave: boolean; attendance: boolean; payroll: boolean; approvals: boolean; security: boolean };
}

export interface ProfileActivityRecord {
  id: string;
  action: string;
  timestamp: string;
  details: string;
  actorName: string;
}

export interface FullProfileContext {
  user: User;
  employee: Employee;
  organization: Organization;
  legalEntity: Company;
  personal: PersonalDetails;
  contact: ContactDetails;
  address: AddressDetails;
  employment: {
    employeeId: string;
    employeeCode: string;
    legalEntityName: string;
    departmentName: string;
    designationTitle: string;
    employmentType: string;
    joiningDate: string;
    confirmationDate?: string;
    workLocation: string;
    reportingManagerName?: string;
    hrbpName?: string;
    status: string;
  };
  bank: BankDetails | null;
  statutory: StatutoryDetails | null;
  nominees: NomineeRecord[];
  emergencyContacts: EmergencyContactRecord[];
  documents: DocumentRecord[];
  sessions: ActiveSessionRecord[];
  notificationPreferences: NotificationPreferences;
  recentActivity: ProfileActivityRecord[];
}

const STORAGE_KEYS = {
  PROFILE_PREFIX: 'workforceos_profile_ctx_',
};

class ProfileService {
  /**
   * Resolves the canonical authenticated employee profile from database/state.
   */
  async getProfileContext(user: User): Promise<FullProfileContext> {
    const orgContext = await organizationContextService.resolveUserContext(user);
    const storageKey = `${STORAGE_KEYS.PROFILE_PREFIX}${user.id}`;
    const cached = localStorage.getItem(storageKey);

    // Initial Authoritative Template based on verified User / Employee
    const isHrHead = user.email.includes('hari') || (user.roles || []).some((r) => r.name === 'HR Head');

    let baseEmployee: Employee = {
      id: user.employee_id || 'emp-hr-001',
      employee_code: 'WF-1001',
      first_name: isHrHead ? 'Hari' : user.name.split(' ')[0] || 'Hari',
      last_name: isHrHead ? 'Priya' : user.name.split(' ').slice(1).join(' ') || 'Priya',
      display_name: isHrHead ? 'Hari Priya' : user.name,
      work_email: user.email,
      organization_id: orgContext.activeOrganization.id,
      company_id: orgContext.activeLegalEntity.id,
      department_id: 'dept-hr-01',
      department_name: isHrHead ? 'People & HR' : 'Management',
      designation_id: 'desig-hr-01',
      designation_title: isHrHead ? 'HR Head' : (user.roles || [])[0]?.name || 'HR Head',
      status: 'Active',
      employment_type: 'Full Time',
      branch_name: 'Coimbatore Campus',
      avatar_url: user.avatar_url || '',
      profile: {
        preferred_name: 'Hari Priya',
        personal_email: 'haripriya.personal@gmail.com',
        phone: '+91 98401 23456',
        date_of_birth: '1993-08-14',
        gender: 'Female',
        marital_status: 'Married',
        blood_group: 'O+',
        nationality: 'Indian',
      },
      employment: {
        doj: '2024-01-01',
        employment_type: 'Full Time',
        work_location: 'Coimbatore HQ, Joy Tech Park',
        reporting_manager_name: 'Dharun Joy (Company Admin)',
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return {
          ...parsed,
          user,
          organization: orgContext.activeOrganization,
          legalEntity: orgContext.activeLegalEntity,
        };
      } catch (_) {}
    }

    const defaultProfile: FullProfileContext = {
      user,
      employee: baseEmployee,
      organization: orgContext.activeOrganization,
      legalEntity: orgContext.activeLegalEntity,
      personal: {
        legalFirstName: baseEmployee.first_name,
        legalMiddleName: '',
        legalLastName: baseEmployee.last_name,
        preferredName: 'Hari Priya',
        dateOfBirth: '1993-08-14',
        gender: 'Female',
        maritalStatus: 'Married',
        nationality: 'Indian',
        bloodGroup: 'O+',
        preferredLanguage: 'English',
      },
      contact: {
        workEmail: user.email,
        personalEmail: 'haripriya.personal@gmail.com',
        primaryMobile: '+91 98401 23456',
        alternateMobile: '+91 98409 87654',
        isEmailVerified: true,
        isMobileVerified: true,
      },
      address: {
        currentAddress: {
          line1: 'Flat 402, Green Meadows',
          line2: 'Avinashi Road, Peelamedu',
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          postalCode: '641004',
          country: 'India',
        },
        permanentAddress: {
          line1: 'Flat 402, Green Meadows',
          line2: 'Avinashi Road, Peelamedu',
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          postalCode: '641004',
          country: 'India',
        },
        sameAsPermanent: true,
      },
      employment: {
        employeeId: baseEmployee.id,
        employeeCode: baseEmployee.employee_code || 'WF-1001',
        legalEntityName: orgContext.activeLegalEntity.legal_name,
        departmentName: baseEmployee.department_name || 'People & HR',
        designationTitle: baseEmployee.designation_title || 'HR Head',
        employmentType: 'Full Time',
        joiningDate: '01 Jan 2024',
        confirmationDate: '01 Jul 2024',
        workLocation: 'Coimbatore HQ, Joy Tech Park',
        reportingManagerName: 'Dharun Joy (Company Admin)',
        hrbpName: 'Self (HR Head)',
        status: 'Active',
      },
      bank: {
        id: 'bank-01',
        bankName: 'HDFC Bank',
        accountNumberMasked: '•••• •••• 4521',
        accountHolderName: 'Hari Priya',
        ifscCode: 'HDFC0001234',
        branchName: 'Peelamedu, Coimbatore',
        paymentMethod: 'Bank Transfer (NEFT/RTGS)',
        isPrimary: true,
      },
      statutory: {
        panMasked: 'ABCDE••••F',
        uanMasked: '1012 •••• 7890',
        pfNumber: 'TN/CBE/1234567/001',
        pfStatus: 'Active',
        pfJoiningDate: '01 Jan 2024',
        esiNumberMasked: '3312 •••• 0001',
        esiStatus: 'Not Applicable (Exempted)',
        taxRegime: 'New',
      },
      nominees: [
        {
          id: 'nom-01',
          schemeType: 'PF Nominee',
          name: 'Karthik Natarajan',
          relationship: 'Spouse',
          dateOfBirth: '1990-05-14',
          phone: '+91 98409 87654',
          sharePercent: 100,
          address: 'Flat 402, Green Meadows, Coimbatore 641004',
        },
        {
          id: 'nom-02',
          schemeType: 'Gratuity Nominee',
          name: 'Karthik Natarajan',
          relationship: 'Spouse',
          dateOfBirth: '1990-05-14',
          phone: '+91 98409 87654',
          sharePercent: 100,
          address: 'Flat 402, Green Meadows, Coimbatore 641004',
        },
      ],
      emergencyContacts: [
        {
          id: 'emg-01',
          name: 'Karthik Natarajan',
          relationship: 'Spouse',
          primaryPhone: '+91 98409 87654',
          alternatePhone: '+91 98401 11223',
          email: 'karthik.n@gmail.com',
          address: 'Flat 402, Green Meadows, Coimbatore 641004',
          isPrimary: true,
        },
      ],
      documents: [
        {
          id: 'doc-01',
          category: 'Identity',
          type: 'PAN Card',
          fileName: 'pan_card_verified.pdf',
          fileUrl: '#',
          fileSizeBytes: 420000,
          verificationStatus: 'Verified',
          uploadedAt: '2024-01-02T10:00:00Z',
        },
        {
          id: 'doc-02',
          category: 'Identity',
          type: 'Aadhaar Card',
          fileName: 'aadhaar_card_verified.pdf',
          fileUrl: '#',
          fileSizeBytes: 580000,
          verificationStatus: 'Verified',
          uploadedAt: '2024-01-02T10:05:00Z',
        },
        {
          id: 'doc-03',
          category: 'Employment',
          type: 'Appointment Letter',
          fileName: 'appointment_letter_hr_head.pdf',
          fileUrl: '#',
          fileSizeBytes: 1200000,
          verificationStatus: 'Verified',
          uploadedAt: '2024-01-01T09:00:00Z',
        },
        {
          id: 'doc-04',
          category: 'Bank',
          type: 'Bank Passbook / Cancelled Cheque',
          fileName: 'hdfc_cancelled_cheque.pdf',
          fileUrl: '#',
          fileSizeBytes: 310000,
          verificationStatus: 'Verified',
          uploadedAt: '2024-01-02T11:00:00Z',
        },
      ],
      sessions: [
        {
          id: 'sess-01',
          deviceName: 'Windows 11 PC (Chrome 126)',
          browserName: 'Google Chrome',
          ipAddress: '103.24.12.88',
          locationName: 'Coimbatore, India',
          lastActive: 'Just now',
          isCurrent: true,
        },
        {
          id: 'sess-02',
          deviceName: 'Apple iPhone 15 Pro (Safari Mobile)',
          browserName: 'Mobile Safari',
          ipAddress: '49.207.198.14',
          locationName: 'Coimbatore, India',
          lastActive: '3 hours ago',
          isCurrent: false,
        },
      ],
      notificationPreferences: {
        email: { leave: true, attendance: true, payroll: true, approvals: true, security: true },
        sms: { leave: false, attendance: false, payroll: true, approvals: true, security: true },
        whatsapp: { leave: true, attendance: false, payroll: true, approvals: true, security: true },
        inApp: { leave: true, attendance: true, payroll: true, approvals: true, security: true },
      },
      recentActivity: [
        {
          id: 'act-01',
          action: 'PROFILE_VIEWED',
          timestamp: new Date().toISOString(),
          details: 'Accessed personal HR identity & statutory profile',
          actorName: user.name,
        },
      ],
    };

    localStorage.setItem(storageKey, JSON.stringify(defaultProfile));
    return defaultProfile;
  }

  /**
   * Updates self-service personal information.
   */
  async updatePersonalDetails(user: User, data: Partial<PersonalDetails>): Promise<FullProfileContext> {
    const current = await this.getProfileContext(user);
    const updated: FullProfileContext = {
      ...current,
      personal: { ...current.personal, ...data },
      recentActivity: [
        {
          id: `act-${Date.now()}`,
          action: 'PERSONAL_DETAILS_UPDATED',
          timestamp: new Date().toISOString(),
          details: `Updated personal information (${Object.keys(data).join(', ')})`,
          actorName: user.name,
        },
        ...current.recentActivity,
      ],
    };
    localStorage.setItem(`${STORAGE_KEYS.PROFILE_PREFIX}${user.id}`, JSON.stringify(updated));
    return updated;
  }

  /**
   * Updates self-service contact details.
   */
  async updateContactDetails(user: User, data: Partial<ContactDetails>): Promise<FullProfileContext> {
    const current = await this.getProfileContext(user);
    const updated: FullProfileContext = {
      ...current,
      contact: { ...current.contact, ...data },
      recentActivity: [
        {
          id: `act-${Date.now()}`,
          action: 'CONTACT_DETAILS_UPDATED',
          timestamp: new Date().toISOString(),
          details: 'Updated contact details',
          actorName: user.name,
        },
        ...current.recentActivity,
      ],
    };
    localStorage.setItem(`${STORAGE_KEYS.PROFILE_PREFIX}${user.id}`, JSON.stringify(updated));
    return updated;
  }

  /**
   * Updates self-service address information.
   */
  async updateAddressDetails(user: User, data: AddressDetails): Promise<FullProfileContext> {
    const current = await this.getProfileContext(user);
    const updated: FullProfileContext = {
      ...current,
      address: data,
      recentActivity: [
        {
          id: `act-${Date.now()}`,
          action: 'ADDRESS_UPDATED',
          timestamp: new Date().toISOString(),
          details: 'Updated residential address details',
          actorName: user.name,
        },
        ...current.recentActivity,
      ],
    };
    localStorage.setItem(`${STORAGE_KEYS.PROFILE_PREFIX}${user.id}`, JSON.stringify(updated));
    return updated;
  }

  /**
   * Submits a controlled change request for Bank Account.
   */
  async requestBankDetailsChange(user: User, data: { bankName: string; accountNumber: string; ifscCode: string; branchName: string; reason: string }): Promise<void> {
    const current = await this.getProfileContext(user);
    const pcrId = `pcr-${Date.now()}`;
    const logEntry = {
      id: `act-${Date.now()}`,
      action: 'BANK_CHANGE_REQUESTED',
      timestamp: new Date().toISOString(),
      details: `Submitted change request for bank account (${data.bankName} - IFSC ${data.ifscCode}). Reason: ${data.reason}`,
      actorName: user.name,
    };
    const updated: FullProfileContext = {
      ...current,
      recentActivity: [logEntry, ...current.recentActivity],
    };
    localStorage.setItem(`${STORAGE_KEYS.PROFILE_PREFIX}${user.id}`, JSON.stringify(updated));

    if (isSupabaseEnabled) {
      Promise.resolve(
        supabase.from('employee_profile_change_requests').insert({
          id: pcrId,
          employee_id: current.employee.id,
          field_category: 'Bank',
          field_name: 'Salary Account',
          old_value: current.bank?.bankName || 'HDFC Bank',
          new_value: `${data.bankName} - ${data.accountNumber} (${data.ifscCode})`,
          reason: data.reason,
          status: 'Pending',
          requested_at: new Date().toISOString(),
        })
      ).catch((e: any) => console.warn('[ProfileService] PCR insert failed:', e));
    }
  }

  /**
   * Submits a controlled statutory correction request.
   */
  async requestStatutoryCorrection(user: User, data: { field: string; newValue: string; reason: string }): Promise<void> {
    const current = await this.getProfileContext(user);
    const pcrId = `pcr-${Date.now()}`;
    const logEntry = {
      id: `act-${Date.now()}`,
      action: 'STATUTORY_CORRECTION_REQUESTED',
      timestamp: new Date().toISOString(),
      details: `Requested statutory correction for ${data.field}. Reason: ${data.reason}`,
      actorName: user.name,
    };
    const updated: FullProfileContext = {
      ...current,
      recentActivity: [logEntry, ...current.recentActivity],
    };
    localStorage.setItem(`${STORAGE_KEYS.PROFILE_PREFIX}${user.id}`, JSON.stringify(updated));

    if (isSupabaseEnabled) {
      Promise.resolve(
        supabase.from('employee_profile_change_requests').insert({
          id: pcrId,
          employee_id: current.employee.id,
          field_category: 'Statutory',
          field_name: data.field,
          old_value: 'Current Record',
          new_value: data.newValue,
          reason: data.reason,
          status: 'Pending',
          requested_at: new Date().toISOString(),
        })
      ).catch((e: any) => console.warn('[ProfileService] PCR statutory insert failed:', e));
    }
  }

  /**
   * Adds or edits an emergency contact.
   */
  async saveEmergencyContact(user: User, contact: Omit<EmergencyContactRecord, 'id'>, id?: string): Promise<FullProfileContext> {
    const current = await this.getProfileContext(user);
    let contacts = [...current.emergencyContacts];
    if (id) {
      contacts = contacts.map((c) => (c.id === id ? { ...contact, id } : c));
    } else {
      contacts.push({ ...contact, id: `emg-${Date.now()}` });
    }
    const updated: FullProfileContext = {
      ...current,
      emergencyContacts: contacts,
      recentActivity: [
        {
          id: `act-${Date.now()}`,
          action: id ? 'EMERGENCY_CONTACT_UPDATED' : 'EMERGENCY_CONTACT_ADDED',
          timestamp: new Date().toISOString(),
          details: `${id ? 'Updated' : 'Added'} emergency contact: ${contact.name} (${contact.relationship})`,
          actorName: user.name,
        },
        ...current.recentActivity,
      ],
    };
    localStorage.setItem(`${STORAGE_KEYS.PROFILE_PREFIX}${user.id}`, JSON.stringify(updated));
    return updated;
  }

  /**
   * Deletes an emergency contact.
   */
  async deleteEmergencyContact(user: User, id: string): Promise<FullProfileContext> {
    const current = await this.getProfileContext(user);
    const updated: FullProfileContext = {
      ...current,
      emergencyContacts: current.emergencyContacts.filter((c) => c.id !== id),
    };
    localStorage.setItem(`${STORAGE_KEYS.PROFILE_PREFIX}${user.id}`, JSON.stringify(updated));
    return updated;
  }

  /**
   * Adds or edits a family nominee record.
   */
  async saveNominee(user: User, nominee: Omit<NomineeRecord, 'id'>, id?: string): Promise<FullProfileContext> {
    const current = await this.getProfileContext(user);
    let nominees = [...current.nominees];
    if (id) {
      nominees = nominees.map((n) => (n.id === id ? { ...nominee, id } : n));
    } else {
      nominees.push({ ...nominee, id: `nom-${Date.now()}` });
    }
    const updated: FullProfileContext = {
      ...current,
      nominees,
      recentActivity: [
        {
          id: `act-${Date.now()}`,
          action: id ? 'NOMINEE_UPDATED' : 'NOMINEE_ADDED',
          timestamp: new Date().toISOString(),
          details: `${id ? 'Updated' : 'Added'} nominee: ${nominee.name} for ${nominee.schemeType}`,
          actorName: user.name,
        },
        ...current.recentActivity,
      ],
    };
    localStorage.setItem(`${STORAGE_KEYS.PROFILE_PREFIX}${user.id}`, JSON.stringify(updated));
    return updated;
  }

  /**
   * Deletes a nominee record.
   */
  async deleteNominee(user: User, id: string): Promise<FullProfileContext> {
    const current = await this.getProfileContext(user);
    const updated: FullProfileContext = {
      ...current,
      nominees: current.nominees.filter((n) => n.id !== id),
    };
    localStorage.setItem(`${STORAGE_KEYS.PROFILE_PREFIX}${user.id}`, JSON.stringify(updated));
    return updated;
  }

  /**
   * Updates profile avatar image across user and employee state.
   */
  async updateProfilePhoto(user: User, avatarDataUrl: string): Promise<FullProfileContext> {
    const current = await this.getProfileContext(user);
    const updatedUser = { ...user, avatar_url: avatarDataUrl };
    api.setCurrentUser(updatedUser);

    const updated: FullProfileContext = {
      ...current,
      user: updatedUser,
      employee: { ...current.employee, avatar_url: avatarDataUrl },
      recentActivity: [
        {
          id: `act-${Date.now()}`,
          action: 'PROFILE_PHOTO_UPDATED',
          timestamp: new Date().toISOString(),
          details: 'Updated profile display photo',
          actorName: user.name,
        },
        ...current.recentActivity,
      ],
    };
    localStorage.setItem(`${STORAGE_KEYS.PROFILE_PREFIX}${user.id}`, JSON.stringify(updated));
    hrEventBus.publish('employee.updated', { avatarUpdated: true, userId: user.id });
    window.dispatchEvent(new CustomEvent('profile:updated', { detail: updated }));
    return updated;
  }

  /**
   * Revokes an active session.
   */
  async revokeSession(user: User, sessionId: string): Promise<FullProfileContext> {
    const current = await this.getProfileContext(user);
    const updated: FullProfileContext = {
      ...current,
      sessions: current.sessions.filter((s) => s.id !== sessionId),
      recentActivity: [
        {
          id: `act-${Date.now()}`,
          action: 'SESSION_REVOKED',
          timestamp: new Date().toISOString(),
          details: `Revoked active session (${sessionId})`,
          actorName: user.name,
        },
        ...current.recentActivity,
      ],
    };
    localStorage.setItem(`${STORAGE_KEYS.PROFILE_PREFIX}${user.id}`, JSON.stringify(updated));
    return updated;
  }

  /**
   * Updates granular notification preferences.
   */
  async updateNotificationPreferences(user: User, prefs: NotificationPreferences): Promise<FullProfileContext> {
    const current = await this.getProfileContext(user);
    const updated: FullProfileContext = {
      ...current,
      notificationPreferences: prefs,
      recentActivity: [
        {
          id: `act-${Date.now()}`,
          action: 'NOTIFICATION_PREFERENCES_UPDATED',
          timestamp: new Date().toISOString(),
          details: 'Updated notification delivery preferences',
          actorName: user.name,
        },
        ...current.recentActivity,
      ],
    };
    localStorage.setItem(`${STORAGE_KEYS.PROFILE_PREFIX}${user.id}`, JSON.stringify(updated));
    return updated;
  }
}

export const profileService = new ProfileService();
