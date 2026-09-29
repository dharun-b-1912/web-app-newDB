import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { UniversalWorkbookInspector } from '../vendor/universalSheetParsers';
import { AttendanceMasterService } from '../vendor/attendanceMasterService';

describe('Test Master Dataset from JOY SEP IN & OUT.xlsx', () => {
  it('inspects workbook and builds master dataset', async () => {
    const filePath = 'D:\\web-app (2)\\Joy PeopleHR\\Test Data\\Ref\\JOY SEP IN & OUT.xlsx';
    const buffer = fs.readFileSync(filePath);
    const file = new File([buffer], 'JOY SEP IN & OUT.xlsx');

    const inspection = await UniversalWorkbookInspector.inspectWorkbook(file);
    console.log('Inspection sheet names:', Object.keys(inspection.sheets));
    for (const [name, s] of Object.entries(inspection.sheets)) {
      console.log(`Sheet "${name}": classification=${s.classification}, rows=${s.rowCount}`);
    }

    const master = AttendanceMasterService.buildMasterFromInspection(inspection, {
      name: file.name,
      vendorId: 'VEN-JOY-001',
      companyId: 'org-joy-main',
    });

    console.log('Built master:');
    console.log('  totalMasterWorkers:', master.stats.totalMasterWorkers);
    console.log('  employeeSummaries count:', master.employeeSummaries.length);
    console.log('  dailyOtRecords count:', master.dailyOtRecords.length);
    console.log('  masterRecords count:', master.masterRecords.length);

    expect(master.employeeSummaries.length).toBe(43);

    AttendanceMasterService.setActiveMaster(master);
    const active = AttendanceMasterService.getActiveMaster('VND-JOY-01');
    console.log('Active master workers:', active.stats.totalMasterWorkers);
    expect(active.stats.totalMasterWorkers).toBe(43);

    const { WageEngineService } = await import('../vendor/wageEngineService');
    const wageRun = WageEngineService.calculateWageRun('VND-JOY-01');
    console.log('Wage Run contracted roster count:', wageRun.contracted_roster_count);
    console.log('Wage Run payable workforce count:', wageRun.payable_workforce_count);
    console.log('Wage Run total gross earnings:', wageRun.total_gross_earnings);
    console.log('Wage Run total deductions:', wageRun.total_deductions);
    console.log('Wage Run total net pay:', wageRun.total_net_pay);
    console.log('Wage Run total billing amount:', wageRun.total_billing_amount);

    const totalPf = wageRun.employee_results.reduce((s, r) => s + (r.deductions.find(d => d.component_code === 'PF')?.amount || 0), 0);
    const totalEsi = wageRun.employee_results.reduce((s, r) => s + (r.deductions.find(d => d.component_code === 'ESI')?.amount || 0), 0);
    const totalCanteen = wageRun.employee_results.reduce((s, r) => s + (r.deductions.find(d => d.component_code === 'FOOD_D' || d.component_code === 'CANTEEN')?.amount || 0), 0);
    const totalLwf = wageRun.employee_results.reduce((s, r) => s + (r.deductions.find(d => d.component_code === 'LWF')?.amount || 0), 0);
    const totalFa = wageRun.employee_results.reduce((s, r) => s + (r.earnings.find(e => e.component_code === 'FOOD_E')?.amount || 0), 0);
    const totalNa = wageRun.employee_results.reduce((s, r) => s + (r.earnings.find(e => e.component_code === 'NIGHT_E')?.amount || 0), 0);
    const totalOt = wageRun.employee_results.reduce((s, r) => s + (r.earnings.find(e => e.component_code === 'OT')?.amount || 0), 0);

    console.log('Detailed Reconciliation Totals:');
    console.log('  PF (12%):', totalPf, 'vs Excel D WAGES: 35138');
    console.log('  ESI (0.75%):', totalEsi, 'vs Excel D WAGES: 3153');
    console.log('  Canteen:', totalCanteen, 'vs Excel D WAGES: 6240');
    console.log('  LWF (Sep=0):', totalLwf, 'vs Excel D WAGES: 0');
    console.log('  Food Allowance (FA):', totalFa, 'vs Excel D WAGES: 6460');
    console.log('  Night Allowance (NA):', totalNa, 'vs Excel D WAGES: 6795');
    console.log('  OT Stipend:', totalOt, 'vs Excel D WAGES: 111973');

    expect(wageRun.contracted_roster_count).toBe(43);
    expect(wageRun.payable_workforce_count).toBeGreaterThan(0);
    expect(wageRun.total_gross_earnings).toBeGreaterThan(0);
    expect(totalFa).toBe(6460);
    expect(totalNa).toBe(6795);
    expect(totalCanteen).toBe(6240);
    expect(totalLwf).toBe(0);
  });
});
