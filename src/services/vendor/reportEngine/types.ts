// src/services/vendor/reportEngine/types.ts
// ============================================================================
// Joy PeopleHR — Enterprise Workforce XLSX Report Engine Types
// Supports full professional operational reporting for Company -> Vendor
// ============================================================================

import {
  VendorDailyAttendance,
  VendorMRReportRecord,
  VendorOTMatrixRecord,
  AttendanceOTReconciliationRow,
  AttendanceException,
  AttendancePeriod,
} from '../vendorAttendanceEngineService';

export type ReportStatus =
  | 'DRAFT'
  | 'UNDER REVIEW'
  | 'VENDOR SUBMITTED'
  | 'COMPANY VERIFIED'
  | 'APPROVED'
  | 'LOCKED';

export interface CompanyBrandingConfig {
  company_logo?: string;
  company_name: string;
  company_address?: string;
  company_location?: string;
  site_name: string;
  vendor_name: string;
  contract_po?: string;
  report_title?: string;
  report_subtitle?: string;
  primary_brand_color?: string;    // e.g. '#1A4731' (Joy Dark Green) or '#1E293B' (Corporate Slate)
  secondary_brand_color?: string;  // e.g. '#047857' (Emerald)
  accent_brand_color?: string;     // e.g. '#0F766E'
  report_status?: ReportStatus;
  template_version?: string;
  generated_at?: string;
  generated_by?: string;
  period_label?: string;
  from_date: string;
  to_date: string;
  period_from?: string;
  period_to?: string;
  include_cover_sheet?: boolean;
  sheets?: ('attendance' | 'mr_report' | 'ot_report' | 'reconciliation' | 'exceptions')[];
}

export interface KpiCardItem {
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
}

export interface SheetHeaderOptions {
  sheetTitle: string;
  sheetCode: string;
  config: CompanyBrandingConfig;
  kpis?: KpiCardItem[];
  hasRecords: boolean;
  emptyStateMessage?: string;
}

export interface ReportValidationResult {
  isValid: boolean;
  issues: string[];
  summary: {
    attendanceCount: number;
    mrCount: number;
    otCount: number;
    reconciliationCount: number;
    exceptionsCount: number;
    attendanceOtTotal: number;
    matrixOtTotal: number;
    otVariance: number;
  };
}

export interface WorkforceWorkbookDataset {
  attendance: VendorDailyAttendance[];
  mrReport: VendorMRReportRecord[];
  otMatrix: VendorOTMatrixRecord[];
  reconciliation: AttendanceOTReconciliationRow[];
  exceptions: AttendanceException[];
  period: AttendancePeriod;
  config: CompanyBrandingConfig;
}
