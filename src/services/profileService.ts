import { User, Employee, Company, Organization } from '../types';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { api } from './api';
import { organizationContextService } from './organizationContextService';
import { hrEventBus } from './hrEventBus';
import { profileMediaService } from './profile/profileMediaService';

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
   * Resolves the canonical authenticated employee profile from database/state in strict isolation.
   */
  async getProfileContext(user: User): Promise<FullProfileContext> {
    const orgContext = await organizationContextService.resolveUserContext(user);
    const storageKey = `${STORAGE_KEYS.PROFILE_PREFIX}${user.id || user.email}`;
    const cached = localStorage.getItem(storageKey);

    const nameParts = (user.name || 'User').trim().split(/\s+/);
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';
    const displayName = user.name || `${firstName} ${lastName}`.trim();
    const primaryRole = (user.roles || [])[0]?.name || (user.role === 'superadmin' ? 'Platform Super Admin' : 'Staff Member');
    const isPlatformAdmin = user.role === 'superadmin' || (user.roles || []).some(r => r.name.toLowerCase().includes('admin'));
    const empCode = user.employee_code || `WF-${(user.id || '1001').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase()}`;

    let baseEmployee: Employee = {
      id: user.employee_id || `emp-${user.id || 'user-01'}`,
      employee_code: empCode,
      first_name: firstName,
      last_name: lastName,
      display_name: displayName,
      work_email: user.email,
      organization_id: orgContext.activeOrganization.id,
      company_id: orgContext.activeLegalEntity.id,
      department_id: isPlatformAdmin ? 'dept-admin-01' : 'dept-gen-01',
      department_name: isPlatformAdmin ? 'Platform Management & Operations' : 'Enterprise Operations',
      designation_id: 'desig-01',
      designation_title: primaryRole,
      status: 'Active',
      employment_type: 'Full Time',
      branch_name: 'Coimbatore Campus',
      avatar_url: user.avatar_url || '',
      profile: {
        preferred_name: displayName,
        personal_email: user.email,
        phone: user.phone || '+91 98401 00000',
        date_of_birth: '1995-01-01',
        gender: 'Prefer not to say',
        marital_status: 'Single',
        blood_group: 'O+',
        nationality: 'Indian',
      },
      employment: {
        doj: '2024-01-01',
        employment_type: 'Full Time',
        work_location: 'Coimbatore HQ, Joy Tech Park',
        reporting_manager_name: isPlatformAdmin ? 'Board of Directors' : 'Executive Management',
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    if (cached) {
      try {
        const parsed: FullProfileContext = JSON.parse(cached);
        // Security check: Validate cached profile belongs to this user session
        const isUserMatch =
          (parsed.user?.id && (parsed.user.id === user.id || (parsed.user as any).auth_user_id === user.id)) ||
          (parsed.user?.email && user.email && parsed.user.email.toLowerCase() === user.email.toLowerCase()) ||
          (parsed.contact?.workEmail && user.email && parsed.contact.workEmail.toLowerCase() === user.email.toLowerCase());

        if (isUserMatch && parsed.personal) {
          return {
            ...parsed,
            user,
            organization: orgContext.activeOrganization,
            legalEntity: orgContext.activeLegalEntity,
          };
        }
      } catch (_) {
        localStorage.removeItem(storageKey);
      }
    }

    const defaultProfile: FullProfileContext = {
      user,
      employee: baseEmployee,
      organization: orgContext.activeOrganization,
      legalEntity: orgContext.activeLegalEntity,
      personal: {
        legalFirstName: firstName,
        legalMiddleName: '',
        legalLastName: lastName,
        preferredName: displayName,
        dateOfBirth: '1995-01-01',
        gender: 'Prefer not to say',
        maritalStatus: 'Single',
        nationality: 'Indian',
        bloodGroup: 'O+',
        preferredLanguage: 'English',
      },
      contact: {
        workEmail: user.email,
        personalEmail: user.email,
        primaryMobile: user.phone || '+91 98401 00000',
        alternateMobile: '',
        isEmailVerified: true,
        isMobileVerified: true,
      },
      address: {
        currentAddress: {
          line1: 'Joy Tech Park, Avinashi Road',
          line2: 'Peelamedu',
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          postalCode: '641004',
          country: 'India',
        },
        permanentAddress: {
          line1: 'Joy Tech Park, Avinashi Road',
          line2: 'Peelamedu',
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          postalCode: '641004',
          country: 'India',
        },
        sameAsPermanent: true,
      },
      employment: {
        employeeId: baseEmployee.id,
        employeeCode: empCode,
        legalEntityName: orgContext.activeLegalEntity.legal_name,
        departmentName: baseEmployee.department_name || 'Platform Management',
        designationTitle: primaryRole,
        employmentType: 'Full Time',
        joiningDate: '01 Jan 2024',
        confirmationDate: '01 Jul 2024',
        workLocation: 'Coimbatore HQ, Joy Tech Park',
        reportingManagerName: isPlatformAdmin ? 'Board of Directors' : 'Executive Management',
        hrbpName: 'HR Operations Desk',
        status: 'Active',
      },
      bank: {
        id: `bank-${user.id || '01'}`,
        bankName: 'HDFC Bank',
        accountNumberMasked: '•••• •••• 4521',
        accountHolderName: displayName,
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
      nominees: [],
      emergencyContacts: [],
      documents: [],
      sessions: [
        {
          id: 'sess-current',
          deviceName: 'Desktop (Chrome on Windows)',
          browserName: 'Google Chrome',
          ipAddress: '192.168.1.100 (Internal)',
          locationName: 'Coimbatore, India',
          lastActive: 'Active Now',
          isCurrent: true,
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
          id: `act-${Date.now()}`,
          action: 'PROFILE_LOADED',
          details: 'Profile workspace authenticated session initialized.',
          timestamp: 'Just now',
          actorName: displayName,
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
    if (user.email) {
      localStorage.setItem(`${STORAGE_KEYS.PROFILE_PREFIX}${user.email}`, JSON.stringify(updated));
    }

    if (isSupabaseEnabled) {
      try {
        const fullName = `${data.legalFirstName || ''} ${data.legalLastName || ''}`.trim() || data.preferredName;
        await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            name: fullName,
            first_name: data.legalFirstName,
            last_name: data.legalLastName,
            preferred_name: data.preferredName,
            dob: data.dateOfBirth,
            gender: data.gender,
            marital_status: data.maritalStatus,
            nationality: data.nationality,
            blood_group: data.bloodGroup,
            preferred_language: data.preferredLanguage,
          },
        });
      } catch (err) {
        console.warn('[ProfileService] Supabase profile sync notice:', err);
      }
    }

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
    if (user.email) {
      localStorage.setItem(`${STORAGE_KEYS.PROFILE_PREFIX}${user.email}`, JSON.stringify(updated));
    }
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
    if (user.email) {
      localStorage.setItem(`${STORAGE_KEYS.PROFILE_PREFIX}${user.email}`, JSON.stringify(updated));
    }
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
    const employeeId = current.employee?.id || user.employee_id || user.id;

    // Convert data URL to Blob for canonical profileMediaService upload
    let finalAvatarUrl = avatarDataUrl;
    try {
      if (avatarDataUrl.startsWith('data:')) {
        const parts = avatarDataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const res = await profileMediaService.uploadProfilePhoto({
          employeeId,
          file: blob,
          actorId: user.id,
          actorName: user.name,
        });
        if (res.signedUrl) {
          finalAvatarUrl = res.signedUrl;
        }
      }
    } catch (err) {
      console.warn('[ProfileService] ProfileMediaService photo upload warning:', err);
    }

    const updatedUser = { ...user, avatar_url: finalAvatarUrl };
    api.setCurrentUser(updatedUser);

    const updated: FullProfileContext = {
      ...current,
      user: updatedUser,
      employee: { ...current.employee, avatar_url: finalAvatarUrl },
      recentActivity: [
        {
          id: `act-${Date.now()}`,
          action: 'PROFILE_PHOTO_UPDATED',
          timestamp: new Date().toISOString(),
          details: 'Updated profile display photo (WebP 512x512 with SHA-256)',
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
