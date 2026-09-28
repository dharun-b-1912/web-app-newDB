// src/services/vendor/vendorAttendanceIngestionService.ts
// ============================================================================
// Joy People HR — Vendor Attendance Bulk Ingestion & Daily OT Engine
// Supports Mode B (Vendor Upload) with Row Validation & Shift Alignment
// ============================================================================

import {
  VendorAttendanceBatch,
  VendorAttendanceRow,
  DailyOvertimeRecord,
} from '../../types/vendorPortal';

export interface IngestionValidationResult {
  batchId: string;
  totalRecords: number;
  validRecords: number;
  errorRecords: number;
  rows: VendorAttendanceRow[];
  generatedOtRecords: DailyOvertimeRecord[];
  isEligibleForIngestion: boolean;
}

export class VendorAttendanceIngestionService {
  private inMemoryBatches: Map<string, VendorAttendanceBatch> = new Map();
  private inMemoryDailyOt: Map<string, DailyOvertimeRecord> = new Map();

  /**
   * Process raw tabular attendance data uploaded by Vendor
   */
  public processVendorUpload(params: {
    organizationId: string;
    vendorId: string;
    clientSiteContractId: string;
    batchName: string;
    periodMonth: string;
    uploadedBy: string;
    rawRows: Array<{
      employeeCode: string;
      employeeName?: string;
      date: string;
      shiftCode: string;
      inTime: string;
      outTime: string;
      status: string;
      breakDurationMinutes?: number;
    }>;
    validEmployeeCodes: Set<string>;
    standardShiftHours?: number;
    otHourlyRate?: number;
  }): IngestionValidationResult {
    const batchId = `batch-${params.vendorId}-${Date.now()}`;
    const standardShift = params.standardShiftHours || 8;
    const defaultOtRate = params.otHourlyRate || 81.73;

    const processedRows: VendorAttendanceRow[] = [];
    const generatedOtRecords: DailyOvertimeRecord[] = [];
    let validCount = 0;
    let errorCount = 0;

    const seenEmployeeDates = new Set<string>();

    params.rawRows.forEach((raw, idx) => {
      const rowErrors: string[] = [];
      const rowNum = idx + 1;

      // 1. Employee Code Validation
      if (!raw.employeeCode || !raw.employeeCode.trim()) {
        rowErrors.push('Employee ID is missing');
      } else if (!params.validEmployeeCodes.has(raw.employeeCode.trim())) {
        rowErrors.push(`Employee code ${raw.employeeCode} not mapped to this vendor contract`);
      }

      // 2. Date Validation
      if (!raw.date || isNaN(Date.parse(raw.date))) {
        rowErrors.push(`Invalid date format: ${raw.date}`);
      }

      // 3. Duplicate row in batch check
      const compositeKey = `${raw.employeeCode}_${raw.date}`;
      if (seenEmployeeDates.has(compositeKey)) {
        rowErrors.push(`Duplicate attendance record for employee on date ${raw.date}`);
      } else {
        seenEmployeeDates.add(compositeKey);
      }

      // 4. Time & Hour Calculations
      let regularHours = 0;
      let rawOtHours = 0;
      const breakMins = raw.breakDurationMinutes !== undefined ? Number(raw.breakDurationMinutes) : 60;

      if (raw.status === 'PRESENT' && raw.inTime && raw.outTime) {
        const [inH, inM] = raw.inTime.split(':').map(Number);
        const [outH, outM] = raw.outTime.split(':').map(Number);

        if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) {
          rowErrors.push(`Invalid time format inTime=${raw.inTime}, outTime=${raw.outTime}`);
        } else {
          let totalMinutesWorked = (outH * 60 + outM) - (inH * 60 + inM);
          if (totalMinutesWorked < 0) {
            // Over-midnight night shift handling
            totalMinutesWorked += 24 * 60;
          }
          const netWorkingMinutes = Math.max(0, totalMinutesWorked - breakMins);
          const netHours = Math.round((netWorkingMinutes / 60) * 100) / 100;

          if (netHours >= standardShift) {
            regularHours = standardShift;
            rawOtHours = Math.round((netHours - standardShift) * 100) / 100;
          } else {
            regularHours = netHours;
            rawOtHours = 0;
          }
        }
      }

      const isValid = rowErrors.length === 0;
      if (isValid) {
        validCount++;
      } else {
        errorCount++;
      }

      const rowStatus = (raw.status as VendorAttendanceRow['status']) || 'PRESENT';

      const rowRecord: VendorAttendanceRow = {
        rowNumber: rowNum,
        employeeCode: raw.employeeCode,
        employeeName: raw.employeeName,
        date: raw.date,
        shiftCode: raw.shiftCode || 'GENERAL',
        inTime: raw.inTime,
        outTime: raw.outTime,
        status: rowStatus,
        breakDurationMinutes: breakMins,
        regularWorkingHours: regularHours,
        rawOtHours,
        approvedOtHours: rawOtHours, // Default to raw pending approval
        source: 'VENDOR_UPLOAD',
        validationErrors: rowErrors.length > 0 ? rowErrors : undefined,
      };

      processedRows.push(rowRecord);

      // Generate daily OT record if OT exists and row is valid
      if (isValid && rawOtHours > 0) {
        const otRecordId = `ot-${params.vendorId}-${raw.employeeCode}-${raw.date}`;
        const otPayable = Math.round(rawOtHours * defaultOtRate * 100) / 100;

        const otRecord: DailyOvertimeRecord = {
          id: otRecordId,
          organizationId: params.organizationId,
          vendorId: params.vendorId,
          clientSiteContractId: params.clientSiteContractId,
          employeeId: `emp-${raw.employeeCode}`,
          employeeCode: raw.employeeCode,
          employeeName: raw.employeeName || raw.employeeCode,
          date: raw.date,
          shiftHours: standardShift,
          actualWorkedHours: regularHours + rawOtHours,
          breakDurationMinutes: breakMins,
          potentialOtHours: rawOtHours,
          approvedOtHours: rawOtHours,
          otHourlyRate: defaultOtRate,
          otPayableAmount: otPayable,
          approvalStatus: 'PENDING',
        };

        generatedOtRecords.push(otRecord);
        this.inMemoryDailyOt.set(otRecord.id, otRecord);
      }
    });

    const batch: VendorAttendanceBatch = {
      id: batchId,
      organizationId: params.organizationId,
      vendorId: params.vendorId,
      clientSiteContractId: params.clientSiteContractId,
      batchName: params.batchName,
      periodMonth: params.periodMonth,
      uploadedAt: new Date().toISOString(),
      uploadedBy: params.uploadedBy,
      totalRecords: params.rawRows.length,
      validRecords: validCount,
      errorRecords: errorCount,
      status: errorCount === 0 ? 'VALIDATED' : 'STAGED',
      records: processedRows,
    };

    this.inMemoryBatches.set(batchId, batch);

    return {
      batchId,
      totalRecords: params.rawRows.length,
      validRecords: validCount,
      errorRecords: errorCount,
      rows: processedRows,
      generatedOtRecords,
      isEligibleForIngestion: errorCount === 0 && validCount > 0,
    };
  }

  /**
   * Approve Daily Overtime
   */
  public approveDailyOt(params: {
    otRecordId: string;
    organizationId: string;
    approvedBy: string;
    approvedOtHours: number;
    remarks?: string;
  }): DailyOvertimeRecord {
    const record = this.inMemoryDailyOt.get(params.otRecordId);
    if (!record) {
      throw new Error(`OT Record ${params.otRecordId} not found`);
    }
    if (record.organizationId !== params.organizationId) {
      throw new Error('Cross-tenant OT approval attempt blocked');
    }

    record.approvedOtHours = params.approvedOtHours;
    record.otPayableAmount = Math.round(params.approvedOtHours * record.otHourlyRate * 100) / 100;
    record.approvalStatus = 'APPROVED';
    record.approvedBy = params.approvedBy;
    record.approvedAt = new Date().toISOString();
    record.remarks = params.remarks;

    this.inMemoryDailyOt.set(record.id, record);
    return record;
  }

  /**
   * List Daily Overtime records for a vendor
   */
  public listDailyOt(params: {
    organizationId: string;
    vendorId: string;
    startDate?: string;
    endDate?: string;
  }): DailyOvertimeRecord[] {
    const results: DailyOvertimeRecord[] = [];
    for (const ot of this.inMemoryDailyOt.values()) {
      if (ot.organizationId === params.organizationId && ot.vendorId === params.vendorId) {
        if (params.startDate && ot.date < params.startDate) continue;
        if (params.endDate && ot.date > params.endDate) continue;
        results.push(ot);
      }
    }
    return results;
  }
}

export const vendorAttendanceIngestionService = new VendorAttendanceIngestionService();
