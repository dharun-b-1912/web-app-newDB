// src/services/payroll/batchPayslipExportService.ts
// ============================================================================
// Joy PeopleHR — Enterprise High-Fidelity A4 Payslip Print & Export Engine
// Full-Page A4 Proportionate Enclosure • Symmetrical Statutory Breakdown • Zero Drift
// ============================================================================

import { PayslipGeneratorService } from './payslipGeneratorService';
import { PayslipViewModel } from '../../types/payslipViewModel';

/**
 * Computes standard CRC-32 checksum for ZIP archive integrity
 */
function crc32(str: string): number {
  const utf8 = new TextEncoder().encode(str);
  let crc = 0 ^ (-1);
  for (let i = 0; i < utf8.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ utf8[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC32_TABLE[i] = c >>> 0;
}

/**
 * Creates a standard compliant ZIP file from an array of text files without external dependencies
 */
function createZipArchive(files: { name: string; content: string }[]): Blob {
  const encoder = new TextEncoder();
  const fileRecords: {
    nameBytes: Uint8Array;
    contentBytes: Uint8Array;
    crc: number;
    offset: number;
  }[] = [];

  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let currentOffset = 0;

  for (const f of files) {
    const nameBytes = encoder.encode(f.name);
    const contentBytes = encoder.encode(f.content);
    const crc = crc32(f.content);
    const offset = currentOffset;

    // Local file header (30 bytes + name + content)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(localHeader.buffer);

    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 0, true);
    dv.setUint16(8, 0, true);
    dv.setUint16(10, 0x5460, true);
    dv.setUint16(12, 0x5891, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, contentBytes.length, true);
    dv.setUint32(22, contentBytes.length, true);
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true);

    localHeader.set(nameBytes, 30);

    chunks.push(localHeader);
    chunks.push(contentBytes);

    currentOffset += localHeader.length + contentBytes.length;

    fileRecords.push({
      nameBytes,
      contentBytes,
      crc,
      offset,
    });
  }

  const centralDirStart = currentOffset;
  let centralDirSize = 0;

  for (const r of fileRecords) {
    const cdHeader = new Uint8Array(46 + r.nameBytes.length);
    const dv = new DataView(cdHeader.buffer);

    dv.setUint32(0, 0x02014b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 20, true);
    dv.setUint16(8, 0, true);
    dv.setUint16(10, 0, true);
    dv.setUint16(12, 0x5460, true);
    dv.setUint16(14, 0x5891, true);
    dv.setUint32(16, r.crc, true);
    dv.setUint32(20, r.contentBytes.length, true);
    dv.setUint32(24, r.contentBytes.length, true);
    dv.setUint16(28, r.nameBytes.length, true);
    dv.setUint16(30, 0, true);
    dv.setUint16(32, 0, true);
    dv.setUint16(34, 0, true);
    dv.setUint16(36, 0, true);
    dv.setUint32(38, 0, true);
    dv.setUint32(42, r.offset, true);

    cdHeader.set(r.nameBytes, 46);
    chunks.push(cdHeader);
    centralDirSize += cdHeader.length;
  }

  const eocd = new Uint8Array(22);
  const dvEocd = new DataView(eocd.buffer);

  dvEocd.setUint32(0, 0x06054b50, true);
  dvEocd.setUint16(4, 0, true);
  dvEocd.setUint16(6, 0, true);
  dvEocd.setUint16(8, fileRecords.length, true);
  dvEocd.setUint16(10, fileRecords.length, true);
  dvEocd.setUint32(12, centralDirSize, true);
  dvEocd.setUint32(16, centralDirStart, true);
  dvEocd.setUint16(20, 0, true);

  chunks.push(eocd);

  return new Blob(chunks, { type: 'application/zip' });
}

export class BatchPayslipExportService {
  /**
   * Generates pure HTML template for a single full-page enclosed A4 payslip document
   */
  public static generateSinglePayslipHtml(vm: PayslipViewModel): string {
    const isPaid = (vm.payroll as any)?.disbursedAt || (vm.payroll.payrollStatus as string) === 'PAID' || (vm as any)?.payment?.status === 'PAID';
    const paymentStatusText = isPaid ? 'Disbursed / Paid' : 'Payment Scheduled';
    const paymentStatusClass = isPaid ? 'status-paid' : 'status-scheduled';

    const hasDeductions = vm.deductions && vm.deductions.length > 0;
    const workedDays = (vm.attendance as any).workedDays ?? vm.attendance.presentDays ?? 0;
    const weeklyOffDays = vm.attendance.weeklyOffDays ?? 4;
    const paidHolidays = vm.attendance.paidHolidays ?? 0;
    const lopDays = vm.attendance.lopDays ?? 0;
    const calendarDays = vm.attendance.calendarDays || 30;
    const payableDays = vm.attendance.payableDays || (vm.attendance as any).paidDays || 0;
    const otHours = vm.attendance.overtimeHours || vm.overtime?.actualOtHours || 0;

    const pfEmployer = vm.employerContributions.find(e => e.code === 'PF_ER')?.amount || 0;
    const esiEmployer = vm.employerContributions.find(e => e.code === 'ESI_ER')?.amount || 0;
    const totalEmployer = pfEmployer + esiEmployer;
    const totalCtc = vm.totals.grossEarnings + totalEmployer;

    const pfEmployee = vm.deductions.find(d => d.code === 'PF_EE' || d.label?.includes('PF'))?.amount || 0;
    const esiEmployee = vm.deductions.find(d => d.code === 'ESI_EE' || d.label?.includes('ESI'))?.amount || 0;
    const ptEmployee = vm.deductions.find(d => d.code === 'PT' || d.label?.includes('Professional'))?.amount || 0;
    const tdsEmployee = vm.deductions.find(d => d.code === 'TDS' || d.label?.includes('TDS'))?.amount || 0;
    const lwfEmployee = vm.deductions.find(d => d.code === 'LWF' || d.label?.includes('Welfare'))?.amount || 0;

    const hasExtensiveStatutory = (pfEmployer > 0 || esiEmployer > 0 || pfEmployee > 0 || esiEmployee > 0 || (vm.earnings?.length || 0) > 4);

    return `
      <!-- ==================== PAGE 1: SALARY STATEMENT ==================== -->
      <div class="payslip-sheet">
        
        <!-- 1. Header -->
        <div class="company-header">
          <div class="company-branding">
            <div class="company-logo">
              <img src="${vm.company.logoUrl || '/logo.png'}" alt="Logo" class="logo-img" onerror="this.style.display='none'; document.getElementById('logo-fallback-${vm.employee.employeeCode}').style.display='flex';" />
              <div id="logo-fallback-${vm.employee.employeeCode}" class="logo-fallback" style="${vm.company.logoUrl ? 'display:none;' : 'display:flex;'}">
                JOY
              </div>
            </div>
            <div class="company-details">
              <h1>${vm.company.legalName}</h1>
              ${vm.company.displayName && vm.company.displayName !== vm.company.legalName ? `<div class="trade-name">${vm.company.displayName}</div>` : ''}
              <div class="address">${vm.company.address || 'Corporate Headquarters & Registered Office'}</div>
              <div class="statutory-ids font-mono">
                ${vm.company.gstin ? `GSTIN: <strong>${vm.company.gstin}</strong> · ` : ''}
                ${vm.company.pan ? `PAN: <strong>${vm.company.pan}</strong> · ` : ''}
                ${vm.company.pfEstablishmentCode ? `PF: <strong>${vm.company.pfEstablishmentCode}</strong>` : ''}
                ${vm.company.esiEmployerCode ? ` · ESI: <strong>${vm.company.esiEmployerCode}</strong>` : ''}
              </div>
            </div>
          </div>

          <div class="payslip-title-block">
            <div class="payslip-pill">PAYSLIP FOR ${vm.payroll.periodMonth?.toUpperCase() || 'AUGUST'} ${vm.payroll.periodYear || 2026}</div>
            <div class="meta-details font-mono">
              <div>Pay Date: <strong>${vm.payroll.payDate}</strong></div>
              <div>Period: <strong>${vm.payroll.periodStart} to ${vm.payroll.periodEnd}</strong></div>
              <div>Ref: <strong>${vm.metadata.payslipNumber}</strong></div>
            </div>
          </div>
        </div>

        <!-- 2. Employee Info 2-Column Grid -->
        <div class="emp-info-card">
          <div class="emp-grid-2col">
            <div class="emp-grid-col">
              <div class="emp-row"><span class="emp-lbl">EMPLOYEE ID</span><span class="emp-val font-mono">${vm.employee.employeeCode}</span></div>
              <div class="emp-row"><span class="emp-lbl">EMPLOYEE NAME</span><span class="emp-val font-bold uppercase">${vm.employee.employeeName}</span></div>
              <div class="emp-row"><span class="emp-lbl">DESIGNATION</span><span class="emp-val">${vm.employee.designation}</span></div>
              <div class="emp-row"><span class="emp-lbl">DEPARTMENT</span><span class="emp-val">${vm.employee.department}</span></div>
              <div class="emp-row"><span class="emp-lbl">DATE OF JOINING</span><span class="emp-val font-mono">${vm.employee.dateOfJoining}</span></div>
              <div class="emp-row"><span class="emp-lbl">WORK LOCATION</span><span class="emp-val">${vm.employee.workLocation || 'Main Campus'}</span></div>
            </div>

            <div class="emp-grid-col">
              <div class="emp-row"><span class="emp-lbl">BANK ACCOUNT</span><span class="emp-val font-mono font-bold">${vm.employee.bankAccountMasked}</span></div>
              <div class="emp-row"><span class="emp-lbl">BANK &amp; IFSC</span><span class="emp-val font-mono">${vm.employee.bankName} (${vm.employee.ifscCode})</span></div>
              <div class="emp-row"><span class="emp-lbl">PAYMENT STATUS</span><span class="emp-val"><span class="${paymentStatusClass}">${paymentStatusText}</span></span></div>
              <div class="emp-row"><span class="emp-lbl">UAN / EPF NO.</span><span class="emp-val font-mono">${vm.employee.uanMasked || 'Not Applicable'}</span></div>
              <div class="emp-row"><span class="emp-lbl">ESIC NUMBER</span><span class="emp-val font-mono">${vm.employee.esiMasked || 'Not Applicable'}</span></div>
              <div class="emp-row"><span class="emp-lbl">PAN NUMBER</span><span class="emp-val font-mono">${vm.employee.panMasked || '—'}</span></div>
            </div>
          </div>
        </div>

        <!-- 3. Attendance Summary Ribbon -->
        <div class="attendance-card">
          <div class="att-primary-row">
            <div class="att-card att-card-payable">
              <span class="att-card-lbl">PAYABLE DAYS</span>
              <span class="att-card-val font-mono">${payableDays} Days</span>
            </div>
            <div class="att-card att-card-worked">
              <span class="att-card-lbl">WORKED DAYS</span>
              <span class="att-card-val font-mono">${workedDays} Days</span>
            </div>
            <div class="att-card att-card-ot">
              <span class="att-card-lbl">OVERTIME (OT)</span>
              <span class="att-card-val font-mono">${otHours} Hrs</span>
            </div>
          </div>
          <div class="att-secondary-row font-mono">
            <span>Calendar Days: <strong>${calendarDays}</strong></span>
            <span>Weekly Offs: <strong>${weeklyOffDays}</strong></span>
            <span>Paid Holidays: <strong>${paidHolidays}</strong></span>
            <span>Loss of Pay (LOP): <strong class="${lopDays > 0 ? 'text-rose-700 font-black' : ''}">${lopDays}</strong></span>
          </div>
        </div>

        <!-- 4. Financial Statements -->
        ${hasDeductions ? `
          <div class="fin-grid-2col">
            <!-- Earnings Statement -->
            <div class="fin-table-box" style="margin-bottom: 0;">
              <table class="fin-table">
                <thead>
                  <tr>
                    <th style="width: 50%; text-align: left;">EARNINGS COMPONENT</th>
                    <th style="width: 20%; text-align: center;">UNITS</th>
                    <th style="width: 30%; text-align: right;">AMOUNT (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${(vm.earnings || []).map(e => `
                    <tr>
                      <td style="font-weight: 600;">${e.label}</td>
                      <td style="text-align: center; color: #64748b;" class="font-mono">${e.units || '—'}</td>
                      <td style="text-align: right; font-weight: 700;" class="font-mono">₹${Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="fin-subtotal-bar earn-subtotal">
                <span>GROSS EARNINGS</span>
                <span class="font-mono font-black">₹${Number(vm.totals.grossEarnings).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <!-- Deductions Statement -->
            <div class="fin-table-box" style="margin-bottom: 0;">
              <table class="fin-table">
                <thead>
                  <tr>
                    <th style="width: 50%; text-align: left;">DEDUCTIONS COMPONENT</th>
                    <th style="width: 20%; text-align: center;">CATEGORY</th>
                    <th style="width: 30%; text-align: right;">AMOUNT (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${(vm.deductions || []).map(d => `
                    <tr>
                      <td style="font-weight: 600;">${d.label}</td>
                      <td style="text-align: center; color: #64748b;" class="font-mono">${d.units || 'Employee'}</td>
                      <td style="text-align: right; font-weight: 700; color: #b91c1c;" class="font-mono">₹${Number(d.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="fin-subtotal-bar ded-subtotal">
                <span>TOTAL DEDUCTIONS</span>
                <span class="font-mono font-black">₹${Number(vm.totals.totalDeductions).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        ` : `
          <!-- Single Earnings Table (Zero Deductions Case) -->
          <div class="fin-table-box">
            <table class="fin-table">
              <thead>
                <tr>
                  <th style="width: 55%; text-align: left;">EARNINGS COMPONENT</th>
                  <th style="width: 20%; text-align: center;">RATE / UNITS</th>
                  <th style="width: 25%; text-align: right;">AMOUNT (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${(vm.earnings || []).map(e => `
                  <tr>
                    <td style="font-weight: 600;">${e.label}</td>
                    <td style="text-align: center; color: #64748b;" class="font-mono">${e.units || '—'}</td>
                    <td style="text-align: right; font-weight: 700;" class="font-mono">₹${Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="fin-subtotal-bar earn-subtotal">
              <span>GROSS EARNINGS</span>
              <span class="font-mono text-base font-black">₹${Number(vm.totals.grossEarnings).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div class="zero-deductions-box font-mono">
            <span><strong>DEDUCTIONS:</strong> No statutory or voluntary deductions applied for this payroll cycle.</span>
            <strong>₹0.00</strong>
          </div>
        `}

        <!-- 5. Net Take-Home Hero Card -->
        <div class="net-hero-card">
          <div class="net-hero-left">
            <div class="net-hero-badge-row">
              <span class="net-hero-title">NET TAKE-HOME SALARY</span>
              <span class="${paymentStatusClass}">${paymentStatusText}</span>
            </div>
            <div class="net-hero-words">
              Amount in Words: <strong>${vm.totals.netPayableInWords}</strong>
            </div>
          </div>
          <div class="net-hero-amount font-mono">
            ₹${Number(vm.totals.netPayable).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <!-- 6. Sign-off & Footer -->
        <div class="footer-auth-row font-mono">
          <div class="footer-auth-left">
            <div>Ref: ${vm.metadata.payslipNumber} · Status: Finalized</div>
            <div style="font-size: 7.5pt; color: #94a3b8; margin-top: 2px;">
              ${hasExtensiveStatutory ? 'Page 1 of 2 — Continue to Page 2 for Statutory Compliance & Employer CTC Ledger' : 'Computer-generated payslip. No physical signature required.'}
            </div>
          </div>
          <div class="footer-auth-right">
            <div class="signatory-title">Manager - Human Resources &amp; Compliance</div>
            <div class="signatory-company">${vm.company.legalName}</div>
          </div>
        </div>

      </div>

      ${hasExtensiveStatutory ? `
        <!-- ==================== PAGE 2: STATUTORY & CTC LEDGER ==================== -->
        <div class="payslip-sheet page-break">
          <div class="ledger-header">
            <div class="ledger-title">STATUTORY COMPLIANCE &amp; EMPLOYER COST (CTC) LEDGER</div>
            <div class="ledger-subtitle font-mono">
              Employee: <strong>${vm.employee.employeeName} (${vm.employee.employeeCode})</strong> · Period: <strong>${vm.payroll.payrollPeriod}</strong> · Ref: <strong>${vm.metadata.payslipNumber}</strong>
            </div>
          </div>

          <div class="ledger-grid">
            <!-- Section A: Employee Statutory Deductions -->
            <div class="ledger-box">
              <div class="ledger-box-title">
                <span>EMPLOYEE STATUTORY CONTRIBUTIONS</span>
                <span style="font-size: 7.5pt; color: #15803d; background: #dcfce7; padding: 1px 6px; border-radius: 9999px; border: 1px solid #86efac; font-weight: 800;">Reconciled</span>
              </div>
              <div class="ledger-box-body font-mono">
                <div class="ledger-item"><span>Employee PF (12%):</span> <strong>${pfEmployee > 0 ? `₹${pfEmployee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Not Applicable'}</strong></div>
                <div class="ledger-item"><span>Employee ESI (0.75%):</span> <strong>${esiEmployee > 0 ? `₹${esiEmployee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Not Applicable'}</strong></div>
                <div class="ledger-item"><span>Professional Tax (PT):</span> <strong>${ptEmployee > 0 ? `₹${ptEmployee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Nil'}</strong></div>
                <div class="ledger-item"><span>Tax Deducted at Source (TDS):</span> <strong>${tdsEmployee > 0 ? `₹${tdsEmployee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Nil'}</strong></div>
                <div class="ledger-item"><span>Labour Welfare Fund (LWF):</span> <strong>${lwfEmployee > 0 ? `₹${lwfEmployee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Nil'}</strong></div>
                <div class="ledger-item highlight-total"><span>TOTAL STATUTORY DEDUCTIONS:</span> <span>₹${(pfEmployee + esiEmployee + ptEmployee + tdsEmployee + lwfEmployee).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
              </div>
            </div>

            <!-- Section B: Employer Contributions & CTC -->
            <div class="ledger-box">
              <div class="ledger-box-title">
                <span>EMPLOYER CONTRIBUTIONS (CTC IMPACT)</span>
                <span style="font-size: 7.5pt; color: #1e3a8a; background: #dbeafe; padding: 1px 6px; border-radius: 9999px; border: 1px solid #93c5fd; font-weight: 800;">Non-Deductible</span>
              </div>
              <div class="ledger-box-body font-mono">
                <div class="ledger-item"><span>Employer EPF (12%):</span> <strong>${pfEmployer > 0 ? `₹${pfEmployer.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Not Applicable'}</strong></div>
                <div class="ledger-item"><span>Employer ESIC (3.25%):</span> <strong>${esiEmployer > 0 ? `₹${esiEmployer.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Not Applicable'}</strong></div>
                <div class="ledger-item"><span>Other Company Benefits:</span> <strong>Nil</strong></div>
                <div class="ledger-item" style="border-top: 1px dashed #cbd5e1; margin-top: 3px; padding-top: 3px;"><span>Total Employer Contribution:</span> <strong>₹${totalEmployer.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
                <div class="ledger-item highlight-total"><span>TOTAL EMPLOYER COST (CTC):</span> <span>₹${totalCtc.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
              </div>
            </div>
          </div>

          <!-- Compliance & Verification Record -->
          <div class="ledger-box" style="margin-bottom: 16px;">
            <div class="ledger-box-title">
              <span>STATUTORY IDENTIFIERS &amp; COMPLIANCE MAPPING</span>
              <span style="font-size: 7.5pt; color: #475569;">Section 14/21 Compliance</span>
            </div>
            <div class="ledger-box-body font-mono" style="font-size: 8.5pt; color: #475569; line-height: 1.6;">
              <div>Universal Account Number (UAN): <strong>${vm.employee.uanMasked || 'Not Applicable'}</strong> · ESIC Insurance IP: <strong>${vm.employee.esiMasked || 'Not Applicable'}</strong> · Income Tax PAN: <strong>${vm.employee.panMasked || '—'}</strong></div>
              <div style="margin-top: 4px;">Establishment PF Code: <strong>${vm.company.pfEstablishmentCode || 'TN/CBE/0048192/000'}</strong> · ESI Employer Code: <strong>${vm.company.esiEmployerCode || '51000849200001001'}</strong></div>
              <div style="margin-top: 4px; font-size: 8pt; color: #64748b;">
                Note: Employer contributions listed above reflect direct corporate statutory deposits and are not deducted from employee net pay.
              </div>
            </div>
          </div>

          <div class="footer-auth-row font-mono">
            <div class="footer-auth-left">
              <div>Page 2 of 2 — Statutory Compliance &amp; CTC Impact Ledger</div>
              <div style="font-size: 7.5pt; color: #94a3b8; margin-top: 2px;">Official record of ${vm.company.legalName}.</div>
            </div>
            <div class="footer-auth-right">
              <div class="signatory-title">Manager - Human Resources &amp; Compliance</div>
              <div class="signatory-company">${vm.company.legalName}</div>
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }

  /**
   * Common print/A4 CSS styles designed for mobile readability and A4 print quality
   */
  public static getMasterA4Styles(): string {
    return `
      @page {
        size: A4 portrait;
        margin: 8mm 10mm 8mm 10mm;
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #0f172a;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 10pt;
        line-height: 1.4;
        -webkit-font-smoothing: antialiased;
      }
      .font-mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      }

      .payslip-sheet {
        width: 100%;
        max-width: 190mm;
        margin: 0 auto;
        background: #ffffff;
        padding: 4px;
        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
      }
      .payslip-sheet:last-child {
        page-break-after: auto;
        break-after: auto;
      }
      .page-break {
        page-break-before: always;
        break-before: page;
        padding-top: 14px;
      }

      /* 1. Header */
      .company-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2.5px solid #034078;
        padding-bottom: 10px;
        margin-bottom: 12px;
        gap: 12px;
      }
      .company-branding {
        display: flex;
        align-items: center;
        gap: 14px;
        flex: 1;
      }
      .company-logo {
        width: 52px;
        height: 52px;
        border: 1.5px solid #93c5fd;
        background: #034078;
        color: #ffffff;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-shrink: 0;
        padding: 2px;
      }
      .logo-img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
      .logo-fallback {
        font-weight: 900;
        color: #ffffff;
        font-size: 16pt;
        letter-spacing: 1.5px;
      }
      .company-details h1 {
        margin: 0;
        font-size: 12.5pt;
        font-weight: 900;
        color: #034078;
        line-height: 1.25;
        letter-spacing: 0.2px;
        text-transform: uppercase;
      }
      .company-details .trade-name {
        font-size: 9.5pt;
        font-weight: 700;
        color: #059669;
        margin-top: 1px;
      }
      .company-details .address {
        font-size: 8.5pt;
        color: #475569;
        margin-top: 2px;
        line-height: 1.35;
      }
      .company-details .statutory-ids {
        font-size: 8pt;
        color: #0f172a;
        margin-top: 3px;
        font-weight: 600;
      }

      .payslip-title-block {
        text-align: right;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        flex-shrink: 0;
      }
      .payslip-pill {
        background: #034078;
        color: #ffffff;
        font-weight: 800;
        font-size: 10pt;
        padding: 5px 12px;
        border-radius: 4px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .meta-details {
        margin-top: 5px;
        font-size: 8.5pt;
        color: #334155;
        line-height: 1.45;
        white-space: nowrap;
      }
      .meta-details strong {
        color: #0f172a;
      }

      /* 2. Employee Info 2-Column Grid */
      .emp-info-card {
        border: 1.5px solid #cbd5e1;
        border-radius: 6px;
        overflow: hidden;
        margin-bottom: 12px;
        background: #ffffff;
      }
      .emp-grid-2col {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
      .emp-grid-col {
        padding: 8px 14px;
      }
      .emp-grid-col:first-child {
        border-right: 1.5px solid #e2e8f0;
      }
      .emp-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 0;
        border-bottom: 1px dashed #f1f5f9;
        gap: 10px;
      }
      .emp-row:last-child {
        border-bottom: none;
      }
      .emp-lbl {
        font-size: 8pt;
        font-weight: 800;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        flex-shrink: 0;
      }
      .emp-val {
        font-size: 9.5pt;
        font-weight: 700;
        color: #0f172a;
        text-align: right;
      }

      .status-scheduled {
        background: #e0f2fe;
        color: #0284c7;
        padding: 1.5px 8px;
        border-radius: 9999px;
        font-size: 8pt;
        font-weight: 800;
        border: 1px solid #bae6fd;
        white-space: nowrap;
      }
      .status-paid {
        background: #dcfce7;
        color: #166534;
        padding: 1.5px 8px;
        border-radius: 9999px;
        font-size: 8pt;
        font-weight: 800;
        border: 1px solid #bbf7d0;
        white-space: nowrap;
      }

      /* 3. Attendance Ribbon */
      .attendance-card {
        border: 1.5px solid #cbd5e1;
        border-radius: 6px;
        overflow: hidden;
        margin-bottom: 12px;
        background: #ffffff;
      }
      .att-primary-row {
        display: grid;
        grid-template-columns: 1.2fr 1fr 1fr;
        border-bottom: 1.5px solid #e2e8f0;
      }
      .att-card {
        padding: 8px 10px;
        text-align: center;
        border-right: 1px solid #e2e8f0;
      }
      .att-card:last-child {
        border-right: none;
      }
      .att-card-payable { background: #f0fdf4; }
      .att-card-worked { background: #f8fafc; }
      .att-card-ot { background: #fffbeb; }

      .att-card-lbl {
        font-size: 7.5pt;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: block;
        margin-bottom: 2px;
      }
      .att-card-payable .att-card-lbl { color: #166534; }
      .att-card-worked .att-card-lbl { color: #475569; }
      .att-card-ot .att-card-lbl { color: #92400e; }

      .att-card-val {
        font-size: 13pt;
        font-weight: 900;
        display: block;
      }
      .att-card-payable .att-card-val { color: #14532d; }
      .att-card-worked .att-card-val { color: #0f172a; }
      .att-card-ot .att-card-val { color: #78350f; }

      .att-secondary-row {
        display: flex;
        justify-content: space-around;
        align-items: center;
        padding: 6px 12px;
        background: #ffffff;
        font-size: 8.5pt;
        color: #334155;
        flex-wrap: wrap;
        gap: 8px;
      }
      .att-secondary-row strong {
        color: #0f172a;
        font-weight: 800;
      }

      /* 4. Financial Statements */
      .fin-grid-2col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-bottom: 9px;
        align-items: start;
      }
      .fin-table-box {
        border: 1.5px solid #cbd5e1;
        border-radius: 6px;
        overflow: hidden;
        margin-bottom: 9px;
        background: #ffffff;
      }
      .fin-table {
        width: 100%;
        border-collapse: collapse;
      }
      .fin-table th {
        background: #f1f5f9;
        color: #334155;
        font-size: 8pt;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 6px 9px;
        border-bottom: 1.5px solid #cbd5e1;
      }
      .fin-table td {
        padding: 5.5px 9px;
        font-size: 9pt;
        border-bottom: 1px solid #f1f5f9;
        color: #1e293b;
      }
      .fin-subtotal-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 9px;
        font-weight: 800;
        font-size: 9.5pt;
      }
      .earn-subtotal {
        background: #f0fdf4;
        color: #166534;
        border-top: 1.5px solid #bbf7d0;
      }
      .ded-subtotal {
        background: #fff1f2;
        color: #9f1239;
        border-top: 1.5px solid #fecdd3;
      }

      .zero-deductions-box {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: #f8fafc;
        border: 1.5px solid #e2e8f0;
        border-radius: 6px;
        margin-bottom: 9px;
        font-size: 8.5pt;
        color: #475569;
      }
      .zero-deductions-box strong {
        color: #047857;
        font-weight: 800;
        font-size: 10.5pt;
      }

      /* 5. Net Pay Hero Card */
      .net-hero-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 16px;
        background: #ecfdf5;
        border: 2.5px solid #059669;
        border-radius: 8px;
        margin-bottom: 11px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        gap: 14px;
      }
      .net-hero-left {
        flex: 1;
      }
      .net-hero-badge-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 3px;
      }
      .net-hero-title {
        font-size: 11pt;
        font-weight: 900;
        color: #064e3b;
        letter-spacing: 0.5px;
      }
      .net-hero-words {
        font-size: 8.5pt;
        color: #047857;
        line-height: 1.4;
        margin-top: 2px;
      }
      .net-hero-words strong {
        color: #064e3b;
      }
      .net-hero-amount {
        font-size: 21pt;
        font-weight: 900;
        color: #064e3b;
        letter-spacing: -0.5px;
        text-align: right;
        white-space: nowrap;
      }

      /* 6. Footer */
      .footer-auth-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        padding-top: 8px;
        border-top: 1.5px solid #e2e8f0;
        font-size: 8pt;
        color: #64748b;
        gap: 12px;
      }
      .footer-auth-left {
        line-height: 1.45;
      }
      .footer-auth-right {
        text-align: right;
        white-space: nowrap;
      }
      .signatory-title {
        font-size: 8.5pt;
        font-weight: 800;
        color: #0f172a;
      }
      .signatory-company {
        font-size: 7.5pt;
        color: #475569;
      }

      /* 7. Page 2 Statutory Ledger */
      .ledger-header {
        border-bottom: 2.5px solid #034078;
        padding-bottom: 8px;
        margin-bottom: 14px;
      }
      .ledger-title {
        font-size: 13pt;
        font-weight: 900;
        color: #034078;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .ledger-subtitle {
        font-size: 8.5pt;
        color: #475569;
        margin-top: 3px;
      }
      .ledger-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        margin-bottom: 14px;
      }
      .ledger-box {
        border: 1.5px solid #cbd5e1;
        border-radius: 6px;
        overflow: hidden;
        background: #ffffff;
      }
      .ledger-box-title {
        background: #f1f5f9;
        padding: 8px 12px;
        font-size: 8.5pt;
        font-weight: 800;
        color: #1e293b;
        border-bottom: 1.5px solid #cbd5e1;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .ledger-box-body {
        padding: 10px 12px;
      }
      .ledger-item {
        display: flex;
        justify-content: space-between;
        padding: 5px 0;
        font-size: 9pt;
        border-bottom: 1px dashed #f1f5f9;
      }
      .ledger-item:last-child {
        border-bottom: none;
      }
      .ledger-item.highlight-total {
        border-top: 1.5px solid #cbd5e1;
        margin-top: 6px;
        padding-top: 6px;
        font-weight: 900;
        color: #034078;
        font-size: 9.5pt;
      }

      /* 8. RESPONSIVE MOBILE VIEWPORT (Phones < 640px) */
      @media (max-width: 640px) {
        body {
          font-size: 9.5pt;
        }
        .payslip-sheet {
          max-width: 100% !important;
          padding: 8px !important;
        }
        .company-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
        }
        .company-branding {
          max-width: 100%;
        }
        .payslip-title-block {
          text-align: left;
          align-items: flex-start;
          width: 100%;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
        }
        .emp-grid-2col {
          grid-template-columns: 1fr !important;
        }
        .emp-grid-col:first-child {
          border-right: none !important;
          border-bottom: 1.5px solid #e2e8f0;
        }
        .emp-row {
          padding: 5px 0;
        }
        .emp-lbl {
          font-size: 7.5pt;
        }
        .emp-val {
          font-size: 9pt;
        }
        .att-primary-row {
          grid-template-columns: 1fr 1fr 1fr;
        }
        .att-card-val {
          font-size: 11pt;
        }
        .att-secondary-row {
          font-size: 7.5pt;
          justify-content: space-between;
        }
        .fin-grid-2col {
          grid-template-columns: 1fr !important;
          gap: 8px !important;
        }
        .net-hero-card {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
        .net-hero-amount {
          font-size: 18pt;
          text-align: left;
        }
        .ledger-grid {
          grid-template-columns: 1fr !important;
        }
        .footer-auth-row {
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
        }
        .footer-auth-right {
          text-align: left;
        }
      }

      @media print {
        body {
          background: #ffffff !important;
        }
        .payslip-sheet {
          box-shadow: none !important;
          margin: 0 auto !important;
          max-width: 100% !important;
          width: 100% !important;
          page-break-after: always !important;
          break-after: page !important;
          page-break-inside: avoid !important;
        }
        .payslip-sheet:last-child {
          page-break-after: auto !important;
          break-after: auto !important;
        }
      }
    `;
  }

  /**
   * Generates pure HTML string containing all payslips separated by A4 page breaks
   */
  public static generateMultiPageHtml(employeeCodes: string[], payPeriod = 'August 2026'): string {
    const vms = employeeCodes.map(code => {
      const { viewModel } = PayslipGeneratorService.buildPayslipViewModel(code, payPeriod);
      return viewModel;
    });

    const pagesHtml = vms.map(vm => BatchPayslipExportService.generateSinglePayslipHtml(vm)).join('\n');

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>Master_Payslips_${payPeriod.replace(/\s+/g, '_')}_All_${vms.length}_Staff</title>
          <style>
            ${BatchPayslipExportService.getMasterA4Styles()}
          </style>
        </head>
        <body>
          ${pagesHtml}
        </body>
      </html>
    `;
  }

  /**
   * Prepares the list of files to be zipped
   */
  public static generateZipFilesData(employeeCodes: string[], payPeriod = 'August 2026'): { name: string; content: string }[] {
    const files: { name: string; content: string }[] = [];

    for (const code of employeeCodes) {
      const { viewModel: vm } = PayslipGeneratorService.buildPayslipViewModel(code, payPeriod);
      const singleSlipHtml = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <title>Payslip_${vm.employee.employeeCode}_${payPeriod.replace(/\s+/g, '_')}</title>
            <style>
              ${BatchPayslipExportService.getMasterA4Styles()}
            </style>
          </head>
          <body>
            ${BatchPayslipExportService.generateSinglePayslipHtml(vm)}
          </body>
        </html>
      `;

      files.push({
        name: `Payslip_${vm.employee.employeeCode}_${vm.employee.employeeName.replace(/[^a-zA-Z0-9]/g, '_')}_${payPeriod.replace(/\s+/g, '_')}.html`,
        content: singleSlipHtml.trim(),
      });
    }

    return files;
  }

  /**
   * Generates a multi-page consolidated print window containing all payslips
   */
  public static printAllPayslipsCombinedPdf(employeeCodes: string[], payPeriod = 'August 2026'): void {
    if (typeof window === 'undefined') {
      return;
    }

    const fullHtml = BatchPayslipExportService.generateMultiPageHtml(employeeCodes, payPeriod);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(fullHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 450);
  }

  /**
   * Generates and downloads a ZIP package containing standalone HTML payslips for each employee
   */
  public static async downloadAllPayslipsZip(employeeCodes: string[], payPeriod = 'August 2026'): Promise<Blob | void> {
    const files = BatchPayslipExportService.generateZipFilesData(employeeCodes, payPeriod);
    const zipBlob = createZipArchive(files);

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return zipBlob;
    }

    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Joy_PeopleHR_Payslips_${payPeriod.replace(/\s+/g, '_')}_${employeeCodes.length}_Staff.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return zipBlob;
  }
}

export { createZipArchive, crc32 };
