// src/services/companyOnboardingService.ts
// ============================================================
// Joy PeopleHR Enterprise — Company Onboarding Lifecycle Service
// Tracks and persists 5-step tenant setup progress with resumable state.
// ============================================================

import { api } from './api';
import { Company, Department, Designation, Role } from '../types';

export type OnboardingStepId = 1 | 2 | 3 | 4 | 5;

export interface CompanyOnboardingProfile {
  companyName: string;
  brandName?: string;
  industry: string;
  companySize: string;
  country: string;
  address: string;
  timezone: string;
  currency: string;
  website?: string;
}

export interface CompanyOnboardingOrgStructure {
  departments: string[];
  designations: string[];
  locations: string[];
}

export interface CompanyOnboardingWorkConfig {
  workDays: string[];
  defaultShiftName: string;
  shiftStartTime: string;
  shiftEndTime: string;
  gracePeriodMinutes: number;
  halfDayHours: number;
  overtimeAllowed: boolean;
}

export interface CompanyOnboardingLeaveConfig {
  casualLeaveDays: number;
  sickLeaveDays: number;
  earnedLeaveDays: number;
  maternityLeaveDays: number;
  probationMonths: number;
}

export interface CompanyOnboardingHrInvite {
  fullName: string;
  email: string;
  phone?: string;
  roleId: string;
}

export interface CompanyOnboardingState {
  tenantId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED_OPTIONAL';
  currentStep: OnboardingStepId;
  completionPercentage: number;
  step1Profile: CompanyOnboardingProfile;
  step2Org: CompanyOnboardingOrgStructure;
  step3Work: CompanyOnboardingWorkConfig;
  step4Leave: CompanyOnboardingLeaveConfig;
  step5HrInvites: CompanyOnboardingHrInvite[];
  updatedAt: number;
}

const STORAGE_KEY_PREFIX = 'wf_company_onboarding_';

class CompanyOnboardingService {
  private getStorageKey(tenantId: string): string {
    return `${STORAGE_KEY_PREFIX}${tenantId || 'default'}`;
  }

  getDefaultState(tenantId: string = 'org-joy-01'): CompanyOnboardingState {
    return {
      tenantId,
      status: 'NOT_STARTED',
      currentStep: 1,
      completionPercentage: 0,
      step1Profile: {
        companyName: 'Joy People Enterprise Ltd',
        brandName: 'Joy People',
        industry: 'Technology & Software',
        companySize: '50-250',
        country: 'India',
        address: 'Bangalore Tech Park, Tower 3',
        timezone: 'Asia/Kolkata (IST)',
        currency: 'INR (₹)',
        website: 'https://joypeoplehr.com',
      },
      step2Org: {
        departments: ['Engineering & Product', 'Human Resources', 'Finance & Accounts', 'Sales & Marketing', 'Operations'],
        designations: ['Software Engineer', 'Senior HR Specialist', 'Financial Analyst', 'Account Executive', 'Operations Lead'],
        locations: ['Bangalore HQ', 'Hyderabad Tech Hub', 'Mumbai Office'],
      },
      step3Work: {
        workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        defaultShiftName: 'General Day Shift (9:00 AM - 6:00 PM)',
        shiftStartTime: '09:00',
        shiftEndTime: '18:00',
        gracePeriodMinutes: 15,
        halfDayHours: 4,
        overtimeAllowed: true,
      },
      step4Leave: {
        casualLeaveDays: 12,
        sickLeaveDays: 12,
        earnedLeaveDays: 15,
        maternityLeaveDays: 180,
        probationMonths: 6,
      },
      step5HrInvites: [
        {
          fullName: 'Deepa Sharma',
          email: 'deepa.hr@joypeople.com',
          phone: '+91 98765 43210',
          roleId: 'role-hr-head',
        },
      ],
      updatedAt: Date.now(),
    };
  }

  getOnboardingState(tenantId: string = 'org-joy-01'): CompanyOnboardingState {
    try {
      const raw = localStorage.getItem(this.getStorageKey(tenantId));
      if (!raw) return this.getDefaultState(tenantId);
      return JSON.parse(raw);
    } catch (err) {
      console.warn('[CompanyOnboarding] Error reading state:', err);
      return this.getDefaultState(tenantId);
    }
  }

  saveStepProgress(
    tenantId: string,
    step: OnboardingStepId,
    data: Partial<CompanyOnboardingState>
  ): CompanyOnboardingState {
    const current = this.getOnboardingState(tenantId);
    const nextStep = (Math.min(step + 1, 5) as OnboardingStepId);
    const completionPercentage = Math.round((step / 5) * 100);

    const updated: CompanyOnboardingState = {
      ...current,
      ...data,
      currentStep: nextStep,
      completionPercentage: Math.max(current.completionPercentage, completionPercentage),
      status: step === 5 ? 'COMPLETED' : 'IN_PROGRESS',
      updatedAt: Date.now(),
    };

    localStorage.setItem(this.getStorageKey(tenantId), JSON.stringify(updated));
    return updated;
  }

  async completeAndApplyOnboarding(tenantId: string): Promise<boolean> {
    const state = this.getOnboardingState(tenantId);
    state.status = 'COMPLETED';
    state.completionPercentage = 100;
    state.updatedAt = Date.now();

    localStorage.setItem(this.getStorageKey(tenantId), JSON.stringify(state));

    // Persist company updates
    try {
      const company = api.getActiveCompany();
      if (company) {
        await api.updateCompany(company.id, {
          legal_name: state.step1Profile.companyName,
          trade_name: state.step1Profile.brandName || state.step1Profile.companyName,
          address: state.step1Profile.address,
          country: state.step1Profile.country,
          timezone: state.step1Profile.timezone,
          currency: state.step1Profile.currency,
        });
      }

      await api.updateOrganization({
        name: state.step1Profile.companyName,
        industry: state.step1Profile.industry,
        timezone: state.step1Profile.timezone,
        default_currency: state.step1Profile.currency,
      });

      const activeCompany = api.getActiveCompany();
      const activeCompanyId = activeCompany ? activeCompany.id : 'comp-joy-01';

      // Add departments if not present
      for (const deptName of state.step2Org.departments) {
        try {
          await api.createDepartment({
            name: deptName,
            code: deptName.slice(0, 4).toUpperCase(),
            company_id: activeCompanyId,
          } as any);
        } catch (_) {}
      }

      // Add designations
      for (const desigName of state.step2Org.designations) {
        try {
          await api.createDesignation({
            title: desigName,
            code: desigName.slice(0, 4).toUpperCase(),
            company_id: activeCompanyId,
          } as any);
        } catch (_) {}
      }

      return true;
    } catch (err) {
      console.warn('[CompanyOnboarding] Error applying configured records:', err);
      return true;
    }
  }

  skipOnboarding(tenantId: string): void {
    const current = this.getOnboardingState(tenantId);
    current.status = 'SKIPPED_OPTIONAL';
    localStorage.setItem(this.getStorageKey(tenantId), JSON.stringify(current));
  }
}

export const companyOnboardingService = new CompanyOnboardingService();
