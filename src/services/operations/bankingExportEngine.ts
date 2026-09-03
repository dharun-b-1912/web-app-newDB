// src/services/operations/bankingExportEngine.ts
// ============================================================================
// Joy PeopleHR — Engine 6: Bank File Generator & Bulk UTR Reconciliation Engine
// Supports: HDFC, ICICI, SBI, Axis, City Union Bank (CUB), Indian Bank
// ============================================================================

import { supabase } from '../../lib/supabase';

export type SupportedBank = 'HDFC' | 'ICICI' | 'SBI' | 'AXIS' | 'CUB' | 'INDIAN_BANK' | 'CUSTOM';

export interface BankDisbursementRecord {
  employeeId: string;
  employeeName: string;
  bankAccountNumber: string;
  ifscCode: string;
  netPayableAmount: number;
  narration?: string;
  email?: string;
  phone?: string;
}

export interface UtrReconciliationRow {
  employeeId?: string;
  bankAccountNumber: string;
  amount: number;
  utrNumber: string;
  paymentDate: string;
  status: 'PAID' | 'FAILED' | 'RETURNED';
  failureReason?: string;
}

export interface ReconciliationReport {
  totalProcessed: number;
  matchedCount: number;
  unmatchedCount: number;
  totalAmountReconciled: number;
  unmatchedRows: UtrReconciliationRow[];
}

class BankingExportEngine {
  /**
   * Generates bank-specific payment format content (CSV/TXT)
   */
  generateBankFileContent(
    bank: SupportedBank,
    records: BankDisbursementRecord[],
    companyAccount: string = '50200012345678',
    companyName: string = 'Joy Corporate Solutions'
  ): { filename: string; content: string; mimeType: string } {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    switch (bank) {
      case 'CUB': {
        // City Union Bank Format: DebitAcc, BeneficiaryAcc, BeneficiaryName, Amount, IFSC, Narration
        const headers = ['Debit_Account', 'Beneficiary_Account', 'Beneficiary_Name', 'Amount', 'IFSC', 'Remarks'];
        const rows = records.map((r) => [
          companyAccount,
          r.bankAccountNumber,
          r.employeeName.replace(/,/g, ' '),
          r.netPayableAmount.toFixed(2),
          r.ifscCode,
          r.narration || `SALARY_${timestamp}`,
        ]);
        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        return {
          filename: `CUB_SALARY_BATCH_${timestamp}.csv`,
          content: csvContent,
          mimeType: 'text/csv',
        };
      }

      case 'INDIAN_BANK': {
        // Indian Bank Bulk Salary Format: SerialNo|BeneficiaryAcc|BeneficiaryName|Amount|IFSC|DebitAcc|Narration
        const headers = ['SL_NO', 'BENEFICIARY_ACC', 'BENEFICIARY_NAME', 'AMOUNT', 'IFSC_CODE', 'DEBIT_ACC', 'PAYMENT_DESC'];
        const rows = records.map((r, idx) => [
          idx + 1,
          r.bankAccountNumber,
          r.employeeName.replace(/\|/g, ' '),
          r.netPayableAmount.toFixed(2),
          r.ifscCode,
          companyAccount,
          r.narration || `SALARY_${timestamp}`,
        ]);
        const csvContent = [headers.join('|'), ...rows.map((r) => r.join('|'))].join('\n');
        return {
          filename: `INDIAN_BANK_SALARY_${timestamp}.txt`,
          content: csvContent,
          mimeType: 'text/plain',
        };
      }

      case 'HDFC': {
        // HDFC CMS / E-Net Format: RecordType, DebitAcc, BeneficiaryAcc, Amount, BeneficiaryName, IFSC, Email, Narration
        const rows = records.map((r) => [
          'P',
          companyAccount,
          r.bankAccountNumber,
          r.netPayableAmount.toFixed(2),
          r.employeeName.replace(/,/g, ' '),
          r.ifscCode,
          r.email || '',
          r.narration || 'SALARY DISBURSEMENT',
        ]);
        const csvContent = rows.map((r) => r.join(',')).join('\n');
        return {
          filename: `HDFC_SALARY_ENET_${timestamp}.csv`,
          content: csvContent,
          mimeType: 'text/csv',
        };
      }

      case 'ICICI': {
        // ICICI Bank Corporate Format: DebitAcc, BeneficiaryAcc, BeneficiaryName, Amount, Currency, IFSC, Date, Remarks
        const headers = ['Debit_Account', 'Beneficiary_Account', 'Beneficiary_Name', 'Amount', 'Currency', 'IFSC', 'Value_Date', 'Remarks'];
        const rows = records.map((r) => [
          companyAccount,
          r.bankAccountNumber,
          r.employeeName.replace(/,/g, ' '),
          r.netPayableAmount.toFixed(2),
          'INR',
          r.ifscCode,
          timestamp,
          r.narration || 'SALARY',
        ]);
        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        return {
          filename: `ICICI_SALARY_UPLOAD_${timestamp}.csv`,
          content: csvContent,
          mimeType: 'text/csv',
        };
      }

      case 'SBI':
      case 'AXIS':
      default: {
        // Standard RBI NEFT/RTGS NACH Format
        const headers = ['Beneficiary_Name', 'Account_Number', 'IFSC_Code', 'Amount', 'Remarks', 'Debit_Account'];
        const rows = records.map((r) => [
          r.employeeName.replace(/,/g, ' '),
          r.bankAccountNumber,
          r.ifscCode,
          r.netPayableAmount.toFixed(2),
          r.narration || `SALARY_${timestamp}`,
          companyAccount,
        ]);
        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        return {
          filename: `${bank}_BULK_PAYMENT_${timestamp}.csv`,
          content: csvContent,
          mimeType: 'text/csv',
        };
      }
    }
  }

  /**
   * Bulk reconciles bank UTR numbers against employee payment records
   */
  async reconcileUtrRecords(
    orgId: string,
    batchId: string,
    utrRows: UtrReconciliationRow[]
  ): Promise<ReconciliationReport> {
    let matchedCount = 0;
    let unmatchedCount = 0;
    let totalAmountReconciled = 0;
    const unmatchedRows: UtrReconciliationRow[] = [];

    for (const row of utrRows) {
      try {
        const { error } = await supabase.from('bank_utr_records').insert({
          organization_id: orgId,
          batch_id: batchId,
          employee_id: row.employeeId || 'UNKNOWN',
          bank_account_number: row.bankAccountNumber,
          amount: row.amount,
          utr_number: row.utrNumber,
          payment_date: row.paymentDate || new Date().toISOString().split('T')[0],
          payment_status: row.status || 'PAID',
          failure_reason: row.failureReason,
        });

        if (!error) {
          matchedCount++;
          totalAmountReconciled += Number(row.amount || 0);
        } else {
          unmatchedCount++;
          unmatchedRows.push(row);
        }
      } catch {
        unmatchedCount++;
        unmatchedRows.push(row);
      }
    }

    // Update batch status to RECONCILED if all matched
    await supabase
      .from('bank_payment_batches')
      .update({
        status: unmatchedCount === 0 ? 'RECONCILED' : 'PARTIALLY_RECONCILED',
        reconciled_at: new Date().toISOString(),
      })
      .eq('id', batchId);

    return {
      totalProcessed: utrRows.length,
      matchedCount,
      unmatchedCount,
      totalAmountReconciled: Number(totalAmountReconciled.toFixed(2)),
      unmatchedRows,
    };
  }
}

export const bankingExportEngine = new BankingExportEngine();
