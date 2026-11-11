// Shared view props & reference types for Garment Workforce UI subviews
import {
  GarmentAdvanceLedgerEntry,
  GarmentCorrectionRequest,
  GarmentFloorAttendance,
  GarmentIncentiveAward,
  GarmentIncentiveRule,
  GarmentOperation,
  GarmentOrgSettings,
  GarmentPayrollCycle,
  GarmentPieceRateCard,
  GarmentProductionAllocation,
  GarmentProductionEntry,
  GarmentProductionOrder,
  GarmentProductionTeam,
  GarmentProductionUnit,
  GarmentStyle,
  GarmentWageAssignment,
  GarmentWorkerProfile,
} from '../../types/garment';

export interface CoreEmployeeLite {
  id: string;
  employee_code?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  department?: string;
  designation?: string;
  branch_id?: string | null;
  company_id?: string | null;
  work_email?: string;
  employment_status?: string;
}

export interface CoreWorkLocationLite {
  id: string;
  name: string;
  city?: string | null;
}

export interface CoreShiftLite {
  id: string;
  name: string;
  code?: string;
  start_time?: string;
  end_time?: string;
}

export interface CoreVendorLite {
  id: string;
  name: string;
}

export interface GarmentWorkspaceData {
  orgId: string;
  currency: string;
  settings: GarmentOrgSettings;
  units: GarmentProductionUnit[];
  teams: GarmentProductionTeam[];
  workers: GarmentWorkerProfile[];
  wageAssignments: GarmentWageAssignment[];
  styles: GarmentStyle[];
  operations: GarmentOperation[];
  orders: GarmentProductionOrder[];
  rateCards: GarmentPieceRateCard[];
  incentiveRules: GarmentIncentiveRule[];
  incentiveAwards: GarmentIncentiveAward[];
  advances: GarmentAdvanceLedgerEntry[];
  attendance: GarmentFloorAttendance[];
  productionEntries: GarmentProductionEntry[];
  allocations: GarmentProductionAllocation[];
  cycles: GarmentPayrollCycle[];
  corrections: GarmentCorrectionRequest[];
  employees: CoreEmployeeLite[];
  workLocations: CoreWorkLocationLite[];
  shifts: CoreShiftLite[];
  vendors: CoreVendorLite[];
  empNameMap: Record<string, string>;
}

export interface GarmentSubviewProps {
  data: GarmentWorkspaceData;
  onRefresh: () => Promise<void>;
  onNavigateTab: (tabId: string) => void;
}

