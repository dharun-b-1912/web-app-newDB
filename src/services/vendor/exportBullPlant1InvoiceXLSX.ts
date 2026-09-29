// src/services/vendor/exportBullPlant1InvoiceXLSX.ts
// ============================================================================
// Joy PeopleHR — Bull Plant 1 Invoice Workings XLSX Export Service
// Spec Section 1 & 2: Template-driven payroll/invoice output via BullPlant1ExcelExporter
// Never blindly reproduces source Excel dataset; computes authoritative data & maps semantically.
// ============================================================================

import {
  BULL_PLANT_1_WORKERS,
  BULL_PLANT_1_INVOICE,
  BullPlant1WorkerWorking,
  BullPlant1InvoiceSummary,
} from './fixtures/bullPlant1InvoiceFixture';
import { BullPlant1PayrollMapper, BullPlant1ValidationSummary } from './bullPlant1/bullPlant1PayrollMapper';
import { BullPlant1ExcelExporter } from './bullPlant1/bullPlant1ExcelExporter';

export async function exportBullPlant1InvoiceXLSX(
  invoice: BullPlant1InvoiceSummary = BULL_PLANT_1_INVOICE,
  workers: BullPlant1WorkerWorking[] = BULL_PLANT_1_WORKERS
): Promise<BullPlant1ValidationSummary> {
  // 1. Map input workers to authoritative BullPlant1PayrollRow[] (matched by Employee ID)
  const rows = BullPlant1PayrollMapper.mapBenchmarkWorkersToBullPlant1Rows(workers);

  // 2. Delegate to the dedicated Bull Plant template exporter (with pre-export math validations)
  return await BullPlant1ExcelExporter.exportToBullPlant1Workbook(rows, invoice);
}

export * from './bullPlant1/bullPlant1PayrollMapper';
export * from './bullPlant1/bullPlant1ColumnMap';
export * from './bullPlant1/bullPlant1TemplateService';
export * from './bullPlant1/bullPlant1ExcelExporter';
