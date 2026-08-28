// Production Clean Module - Test dataset generator decommissioned
export interface TestDataStatus {
  is_loaded: boolean;
  total_test_employees: number;
  direct_count: number;
  vendor_count: number;
  last_loaded_at?: string;
}

export const excelTestDataService = {
  getTestDataStatus: (): TestDataStatus => ({
    is_loaded: false,
    total_test_employees: 0,
    direct_count: 0,
    vendor_count: 0,
  }),
  loadMasterExcelTestData: async () => ({ onboarded_count: 0, payroll_run_number: '' }),
  purgeMasterExcelTestData: () => ({ deleted_count: 0 }),
};
