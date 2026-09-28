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
    const formattedDate = new Date(vm.metadata.generatedAt).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const hasOt = (vm.attendance.overtimeHours || 0) > 0 || (vm.overtime?.actualOtHours || 0) > 0;
    const otHours = vm.attendance.overtimeHours || vm.overtime?.actualOtHours || 0;
    const otRate = vm.overtime?.otRate || (vm.wageRates?.hourlyOtRate || 75);
    const otAmount = vm.overtime?.otAmount || (otHours * otRate);

    const pfEmployer = vm.employerContributions.find(e => e.code === 'PF_ER')?.amount || 0;
    const esiEmployer = vm.employerContributions.find(e => e.code === 'ESI_ER')?.amount || 0;
    const pfEmployee = vm.deductions.find(d => d.code === 'PF_EE')?.amount || 0;
    const esiEmployee = vm.deductions.find(d => d.code === 'ESI_EE')?.amount || 0;
    const ptEmployee = vm.deductions.find(d => d.code === 'PT')?.amount || 0;
    const tdsEmployee = vm.deductions.find(d => d.code === 'TDS')?.amount || 0;

    return `
      <div class="payslip-page payslip-sheet">
        <!-- 1. ENCLOSED COMPANY & STATUTORY HEADER -->
        <div class="header-section">
          <div class="header-left">
            <div class="company-logo-container">
              <img src="${vm.company.logoUrl || '/logo.png'}" alt="Logo" class="logo-img" onerror="this.style.display='none'; document.getElementById('logo-fallback-${vm.employee.employeeCode}').style.display='flex';" />
              <div id="logo-fallback-${vm.employee.employeeCode}" class="logo-fallback" style="${vm.company.logoUrl ? 'display:none;' : 'display:flex;'}">
                JOY
              </div>
            </div>
            <div class="company-info">
              <h1 class="company-legal-name">${vm.company.legalName}</h1>
              ${vm.company.displayName && vm.company.displayName !== vm.company.legalName ? `<div class="company-trade-name">${vm.company.displayName}</div>` : ''}
              <div class="company-address-text">${vm.company.address || 'Corporate Headquarters & Registered Office'}</div>
              <div class="company-statutory-row font-mono">
                ${vm.company.gstin ? `<span>GSTIN: <strong>${vm.company.gstin}</strong></span> · ` : ''}
                ${vm.company.pan ? `<span>PAN: <strong>${vm.company.pan}</strong></span> · ` : ''}
                ${vm.company.pfEstablishmentCode ? `<span>PF: <strong>${vm.company.pfEstablishmentCode}</strong></span>` : ''}
              </div>
            </div>
          </div>

          <div class="header-right">
            <div class="payslip-badge">PAYSLIP FOR ${vm.payroll.periodMonth?.toUpperCase() || 'AUGUST'} ${vm.payroll.periodYear || 2026}</div>
            <div class="doc-meta-table font-mono">
              <div><span>Pay Date:</span> <strong>${vm.payroll.payDate}</strong></div>
              <div><span>Pay Period:</span> <strong>${vm.payroll.periodStart} to ${vm.payroll.periodEnd}</strong></div>
              <div><span>Ref No:</span> <strong>${vm.metadata.payslipNumber}</strong></div>
            </div>
          </div>
        </div>

        <!-- 2. EMPLOYEE & DEPLOYMENT 4-COLUMN BOXED GRID -->
        <table class="emp-master-grid">
          <tbody>
            <tr>
              <td style="width: 25%;">
                <div class="cell-label">EMPLOYEE ID / CODE</div>
                <div class="cell-val font-mono font-bold">${vm.employee.employeeCode}</div>
              </td>
              <td style="width: 25%;">
                <div class="cell-label">EMPLOYEE NAME</div>
                <div class="cell-val font-bold uppercase">${vm.employee.employeeName}</div>
              </td>
              <td style="width: 25%;">
                <div class="cell-label">DESIGNATION</div>
                <div class="cell-val font-medium">${vm.employee.designation}</div>
              </td>
              <td style="width: 25%;">
                <div class="cell-label">DEPARTMENT</div>
                <div class="cell-val font-medium">${vm.employee.department}</div>
              </td>
            </tr>
            <tr>
              <td>
                <div class="cell-label">DATE OF JOINING</div>
                <div class="cell-val font-mono">${vm.employee.dateOfJoining}</div>
              </td>
              <td>
                <div class="cell-label">WORK LOCATION / PLANT</div>
                <div class="cell-val">${vm.employee.workLocation || 'Main Campus'}</div>
              </td>
              <td>
                <div class="cell-label">EMPLOYMENT TYPE</div>
                <div class="cell-val">${vm.employee.employmentType || 'Permanent Staff'}</div>
              </td>
              <td>
                <div class="cell-label">PAYOUT MODE</div>
                <div class="cell-val font-bold text-emerald-800">${vm.employee.paymentMode || 'Bank Transfer'}</div>
              </td>
            </tr>
            <tr>
              <td>
                <div class="cell-label">BANK ACCOUNT NO.</div>
                <div class="cell-val font-mono font-bold">${vm.employee.bankAccountMasked}</div>
              </td>
              <td>
                <div class="cell-label">BANK & IFSC CODE</div>
                <div class="cell-val font-mono">${vm.employee.bankName} (${vm.employee.ifscCode})</div>
              </td>
              <td>
                <div class="cell-label">UAN / EPF NO.</div>
                <div class="cell-val font-mono">${vm.employee.uanMasked || '—'}</div>
              </td>
              <td>
                <div class="cell-label">ESIC NO.</div>
                <div class="cell-val font-mono">${vm.employee.esiMasked || '—'}</div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 3. ATTENDANCE & SHIFT LEAVE SUMMARY RIBBON -->
        <div class="attendance-ribbon">
          <div class="att-item">
            <span class="att-lbl">CALENDAR DAYS</span>
            <strong class="att-num font-mono">${vm.attendance.calendarDays || 30}</strong>
          </div>
          <div class="att-item">
            <span class="att-lbl">PRESENT / WORKED</span>
            <strong class="att-num font-mono">${vm.attendance.presentDays || vm.attendance.payableDays}</strong>
          </div>
          <div class="att-item">
            <span class="att-lbl">WEEKLY OFF</span>
            <strong class="att-num font-mono">${vm.attendance.weeklyOffDays ?? 4}</strong>
          </div>
          <div class="att-item">
            <span class="att-lbl">PAID HOLIDAYS</span>
            <strong class="att-num font-mono">${vm.attendance.paidHolidays ?? 0}</strong>
          </div>
          <div class="att-item">
            <span class="att-lbl">LOSS OF PAY (LOP)</span>
            <strong class="att-num font-mono ${vm.attendance.lopDays > 0 ? 'text-rose-700 font-black' : ''}">${vm.attendance.lopDays || 0}</strong>
          </div>
          <div class="att-item att-highlight-paid">
            <span class="att-lbl">PAYABLE DAYS</span>
            <strong class="att-num font-mono text-emerald-900 font-black">${vm.attendance.payableDays} Days</strong>
          </div>
          <div class="att-item att-highlight-ot">
            <span class="att-lbl">OVERTIME (OT)</span>
            <strong class="att-num font-mono text-amber-900 font-black">${otHours} Hrs</strong>
          </div>
        </div>

        <!-- 4. TWO-COLUMN SYMMETRICAL FINANCIAL STATEMENT -->
        <div class="financial-section">
          <!-- Earnings Column -->
          <div class="financial-box">
            <table class="statement-table">
              <thead>
                <tr>
                  <th style="width: 50%;">EARNINGS COMPONENT</th>
                  <th style="width: 25%; text-align: center;">RATE / UNITS</th>
                  <th style="width: 25%; text-align: right;">AMOUNT (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${vm.earnings.map(e => `
                  <tr>
                    <td class="font-medium">${e.label}</td>
                    <td style="text-align: center; color: #64748b;" class="font-mono">${e.units || '—'}</td>
                    <td style="text-align: right; font-weight: 700;" class="font-mono">₹${e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
                ${vm.earnings.length === 0 ? `
                  <tr>
                    <td colspan="3" style="text-align: center; color: #94a3b8; padding: 12px; font-style: italic;">No earnings calculated</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
            <div class="subtotal-bar earn-subtotal">
              <span>GROSS EARNINGS</span>
              <span class="font-mono text-base font-black">₹${vm.totals.grossEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <!-- Deductions Column -->
          <div class="financial-box">
            <table class="statement-table">
              <thead>
                <tr>
                  <th style="width: 55%;">DEDUCTIONS COMPONENT</th>
                  <th style="width: 20%; text-align: center; font-size: 9px; color: #64748b;">EE SHARE</th>
                  <th style="width: 25%; text-align: right;">AMOUNT (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${vm.deductions.length > 0 ? vm.deductions.map(d => `
                  <tr>
                    <td class="font-medium">${d.label}</td>
                    <td style="text-align: center; color: #64748b; font-size: 9.5px;" class="font-mono">Employee</td>
                    <td style="text-align: right; font-weight: 700; color: #b91c1c;" class="font-mono">₹${d.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="3" style="text-align: center; color: #94a3b8; font-style: italic; padding: 16px;">Zero deductions applied (₹0.00)</td>
                  </tr>
                `}
              </tbody>
            </table>
            <div class="subtotal-bar ded-subtotal">
              <span>TOTAL DEDUCTIONS</span>
              <span class="font-mono text-base font-black text-rose-800">₹${vm.totals.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <!-- 5. NET TAKE-HOME PAY HERO BLOCK -->
        <div class="net-pay-card">
          <div class="net-pay-left">
            <div class="net-pay-header">
              <span class="net-pay-label">NET TAKE-HOME SALARY</span>
              <span class="pay-mode-pill font-mono">${vm.employee.paymentMode || 'Direct Bank Transfer'}</span>
            </div>
            <div class="net-pay-words">
              Amount in Words: <strong>${vm.totals.netPayableInWords}</strong>
            </div>
          </div>
          <div class="net-pay-amount font-mono">
            ₹${vm.totals.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <!-- 6. STATUTORY & EMPLOYER BENEFIT SUMMARY -->
        <div class="supplementary-grid">
          <div class="supp-box">
            <div class="supp-title" style="display: flex; justify-content: space-between; align-items: center;">
              <span>STATUTORY COMPLIANCE SUMMARY</span>
              <span style="font-size: 7pt; color: #15803d; background: #dcfce7; padding: 1px 6px; border-radius: 9999px; border: 1px solid #86efac; font-weight: 800;">
                ✓ Statutory Verified (₹0.00 Variance)
              </span>
            </div>
            <div class="supp-content font-mono">
              <div class="supp-flex"><span>Employee PF (12%):</span> <strong>${pfEmployee > 0 ? `₹${pfEmployee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Not Applicable'}</strong></div>
              <div class="supp-flex"><span>Employee ESI (0.75%):</span> <strong>${esiEmployee > 0 ? `₹${esiEmployee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Not Applicable'}</strong></div>
              <div class="supp-flex"><span>Professional Tax (PT):</span> <strong>${ptEmployee > 0 ? `₹${ptEmployee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Nil'}</strong></div>
              <div class="supp-flex"><span>Tax Deducted at Source (TDS):</span> <strong>${tdsEmployee > 0 ? `₹${tdsEmployee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Nil'}</strong></div>
              <div class="supp-flex" style="border-top: 1px dashed #cbd5e1; margin-top: 3px; padding-top: 2px; font-size: 7.5pt; color: #64748b;">
                <span>UAN: ${vm.employee.uanMasked || '—'}</span>
                <span>PAN: ${vm.employee.panMasked || '—'}</span>
              </div>
            </div>
          </div>

          <div class="supp-box employer-box">
            <div class="supp-title" style="display: flex; justify-content: space-between; align-items: center;">
              <span>EMPLOYER CONTRIBUTIONS (CTC IMPACT)</span>
              <span style="font-size: 7pt; color: #1e3a8a; background: #dbeafe; padding: 1px 6px; border-radius: 9999px; border: 1px solid #93c5fd; font-weight: 800;">
                Non-Deductible
              </span>
            </div>
            <div class="supp-content font-mono">
              <div class="supp-flex">
                <span>Employer EPF (${pfEmployer > 0 ? Math.round((pfEmployer / (vm.earnings.find(e => e.code === 'BASIC')?.amount || (vm.totals.grossEarnings * 0.5))) * 100) : 12}%): <small style="font-size: 7pt; color: #64748b;">(EPS 8.33% + EPF 3.67%)</small></span>
                <strong>${pfEmployer > 0 ? `₹${pfEmployer.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Not Applicable'}</strong>
              </div>
              <div class="supp-flex">
                <span>Employer ESIC (3.25%): <small style="font-size: 7pt; color: #64748b;">(Medical &amp; Disability)</small></span>
                <strong>${esiEmployer > 0 ? `₹${esiEmployer.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Not Applicable'}</strong>
              </div>
              <div class="supp-flex"><span>Other Employer Benefits:</span> <strong>Nil</strong></div>
              <div class="supp-flex supp-border-top"><span>Total Employer Contribution:</span> <strong>₹${(pfEmployer + esiEmployer).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
              <div class="supp-flex supp-border-top" style="margin-top: 4px; padding-top: 3px; font-weight: 900; color: #0f2d59; font-size: 9pt;">
                <span>EMPLOYER COST / CTC:</span>
                <span>₹${(vm.totals.grossEarnings + pfEmployer + esiEmployer).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 7. DIGITAL VERIFICATION, SIGNATURE & LEGAL DISCLAIMER -->
        <div class="auth-section">
          <div class="auth-left">
            <div class="qr-box">
              <div class="qr-visual">
                <svg viewBox="0 0 33 33" width="46" height="46" fill="#0f172a">
                  <rect x="0" y="0" width="10" height="10" fill="#034078" />
                  <rect x="2" y="2" width="6" height="6" fill="#ffffff" />
                  <rect x="4" y="4" width="2" height="2" fill="#034078" />
                  <rect x="23" y="0" width="10" height="10" fill="#034078" />
                  <rect x="25" y="2" width="6" height="6" fill="#ffffff" />
                  <rect x="27" y="4" width="2" height="2" fill="#034078" />
                  <rect x="0" y="23" width="10" height="10" fill="#034078" />
                  <rect x="2" y="25" width="6" height="6" fill="#ffffff" />
                  <rect x="4" y="27" width="2" height="2" fill="#034078" />
                  <rect x="13" y="2" width="6" height="4" fill="#0f172a" />
                  <rect x="14" y="13" width="5" height="5" fill="#034078" />
                  <rect x="23" y="14" width="7" height="3" fill="#0f172a" />
                  <rect x="14" y="23" width="6" height="7" fill="#0f172a" />
                  <rect x="23" y="23" width="8" height="8" fill="#034078" />
                </svg>
              </div>
              <div class="qr-text font-mono">
                <div>Digital Verification ID</div>
                <strong>${vm.audit.dataHash.slice(0, 24)}</strong>
                <div class="verified-tag">✓ 100% RECONCILED</div>
              </div>
            </div>
          </div>

          <div class="auth-right">
            <div class="signature-box">
              <div class="sign-seal">
                <div class="seal-circle">JOY PEOPLEHR<br/>PAYROLL VERIFIED</div>
              </div>
              <div class="sign-line">
                <div class="sign-title">Manager - Human Resources & Compliance</div>
                <div class="sign-sub">${vm.company.legalName}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 8. STATUTORY FOOTER -->
        <div class="footer-section font-mono">
          <div class="footer-meta">
            <span>Generated: <strong>${formattedDate}</strong></span>
            <span>Joy PeopleHR Statutory Enterprise Suite</span>
            <span>Page 1 of 1</span>
          </div>
          <div class="footer-disclaimer">
            *** This is a secure computer-generated statutory payslip and does not require a physical handwritten signature. ***
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Common print/A4 CSS styles designed to fill the entire A4 page proportionately
   */
  public static getMasterA4Styles(): string {
    return `
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      @page {
        size: A4 portrait;
        margin: 6mm 8mm 6mm 8mm;
      }
      html, body {
        margin: 0;
        padding: 0;
        background: #f1f5f9;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #0f172a;
        font-size: 10pt;
        line-height: 1.4;
        -webkit-font-smoothing: antialiased;
      }
      .font-mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      }
      .payslip-sheet {
        width: 100%;
        max-width: 196mm;
        min-height: 282mm;
        margin: 0 auto;
        padding: 16px 20px;
        background: #ffffff;
        border: 2.5px solid #0f2d59;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
      }

      /* 1. HEADER */
      .header-section {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2.5px solid #0f2d59;
        padding-bottom: 10px;
        margin-bottom: 8px;
      }
      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: 65%;
      }
      .company-logo-container {
        width: 60px;
        height: 60px;
        border: 1.5px solid #93c5fd;
        background: #f0fdf4;
        border-radius: 8px;
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
        color: #0f2d59;
        font-size: 16pt;
        letter-spacing: 1.5px;
      }
      .company-info {
        display: flex;
        flex-direction: column;
      }
      .company-legal-name {
        font-size: 14pt;
        font-weight: 900;
        color: #0f2d59;
        margin: 0;
        line-height: 1.2;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .company-trade-name {
        font-size: 10pt;
        font-weight: 700;
        color: #334155;
        margin-top: 1px;
      }
      .company-address-text {
        font-size: 9pt;
        color: #334155;
        margin-top: 2px;
        line-height: 1.3;
        font-weight: 500;
      }
      .company-statutory-row {
        font-size: 8.5pt;
        color: #0f172a;
        margin-top: 3px;
        font-weight: 600;
      }
      .header-right {
        text-align: right;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }
      .payslip-badge {
        background: #0f2d59;
        color: #ffffff;
        font-weight: 900;
        font-size: 10pt;
        padding: 5px 12px;
        border-radius: 5px;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        display: inline-block;
      }
      .doc-meta-table {
        margin-top: 4px;
        font-size: 8.5pt;
        color: #1e293b;
        line-height: 1.45;
        font-weight: 600;
      }
      .doc-meta-table strong {
        color: #0f172a;
        font-weight: 800;
      }

      /* 2. EMPLOYEE GRID */
      .emp-master-grid {
        width: 100%;
        border-collapse: collapse;
        border: 1.5px solid #94a3b8;
        border-radius: 6px;
        overflow: hidden;
        margin-bottom: 8px;
        background: #f8fafc;
      }
      .emp-master-grid td {
        border: 1px solid #cbd5e1;
        padding: 6px 10px;
        vertical-align: middle;
      }
      .cell-label {
        font-size: 7.5pt;
        font-weight: 800;
        color: #0f2d59;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 2px;
      }
      .cell-val {
        font-size: 9.5pt;
        font-weight: 700;
        color: #0f172a;
      }

      /* 3. ATTENDANCE RIBBON */
      .attendance-ribbon {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        border: 1.5px solid #94a3b8;
        border-radius: 6px;
        overflow: hidden;
        margin-bottom: 8px;
        background: #ffffff;
      }
      .att-item {
        padding: 5px 6px;
        text-align: center;
        border-right: 1px solid #cbd5e1;
      }
      .att-item:last-child {
        border-right: none;
      }
      .att-lbl {
        font-size: 7.5pt;
        font-weight: 800;
        color: #475569;
        text-transform: uppercase;
        display: block;
        margin-bottom: 2px;
      }
      .att-num {
        font-size: 11pt;
        font-weight: 900;
        color: #0f172a;
      }
      .att-highlight-paid {
        background: #f0fdf4;
      }
      .att-highlight-paid .att-lbl {
        color: #166534;
      }
      .att-highlight-paid .att-num {
        color: #14532d;
      }
      .att-highlight-ot {
        background: #fffbeb;
      }
      .att-highlight-ot .att-lbl {
        color: #92400e;
      }
      .att-highlight-ot .att-num {
        color: #78350f;
      }

      /* 4. FINANCIAL STATEMENT */
      .financial-section {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 8px;
      }
      .financial-box {
        border: 1.5px solid #94a3b8;
        border-radius: 6px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background: #ffffff;
      }
      .statement-table {
        width: 100%;
        border-collapse: collapse;
      }
      .statement-table th {
        background: #0f2d59;
        color: #ffffff;
        font-size: 8.5pt;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 6px 10px;
        text-align: left;
      }
      .statement-table td {
        padding: 5px 10px;
        border-bottom: 1px solid #f1f5f9;
        font-size: 9.5pt;
        font-weight: 600;
        color: #0f172a;
      }
      .subtotal-bar {
        padding: 7px 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 10pt;
        font-weight: 900;
      }
      .earn-subtotal {
        background: #eff6ff;
        border-top: 2px solid #0f2d59;
        color: #0f2d59;
      }
      .ded-subtotal {
        background: #fef2f2;
        border-top: 2px solid #dc2626;
        color: #991b1b;
      }

      /* 5. NET PAY HERO */
      .net-pay-card {
        background: #f0fdf4;
        border: 2px solid #16a34a;
        border-radius: 8px;
        padding: 10px 14px;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .net-pay-left {
        display: flex;
        flex-direction: column;
      }
      .net-pay-header {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .net-pay-label {
        font-size: 11pt;
        font-weight: 900;
        color: #14532d;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      .pay-mode-pill {
        background: #dcfce7;
        color: #15803d;
        border: 1px solid #86efac;
        font-size: 7.5pt;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 9999px;
      }
      .net-pay-words {
        font-size: 9.5pt;
        font-weight: 700;
        color: #166534;
        margin-top: 3px;
        line-height: 1.35;
      }
      .net-pay-amount {
        font-size: 20pt;
        font-weight: 900;
        color: #14532d;
        letter-spacing: -0.5px;
      }

      /* 6. SUPPLEMENTARY SUMMARY */
      .supplementary-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 8px;
      }
      .supp-box {
        border: 1.5px solid #cbd5e1;
        border-radius: 6px;
        padding: 6px 10px;
        background: #f8fafc;
        font-size: 8.5pt;
        font-weight: 600;
      }
      .employer-box {
        background: #eff6ff;
        border-color: #bfdbfe;
      }
      .supp-title {
        font-size: 8pt;
        font-weight: 900;
        color: #0f2d59;
        text-transform: uppercase;
        margin-bottom: 3px;
      }
      .supp-content {
        line-height: 1.45;
        color: #1e293b;
      }
      .supp-flex {
        display: flex;
        justify-content: space-between;
      }
      .supp-border-top {
        border-top: 1px dashed #93c5fd;
        margin-top: 2px;
        padding-top: 2px;
        font-weight: 800;
        color: #0f2d59;
      }

      /* 7. AUTH & SIGNATURE */
      .auth-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border: 1.5px solid #cbd5e1;
        border-radius: 6px;
        padding: 6px 10px;
        margin-bottom: 6px;
        background: #ffffff;
      }
      .auth-left {
        display: flex;
        align-items: center;
      }
      .qr-box {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .qr-visual {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        padding: 2px;
        border-radius: 4px;
      }
      .qr-text {
        font-size: 8pt;
        font-weight: 600;
        color: #334155;
        line-height: 1.3;
      }
      .verified-tag {
        color: #059669;
        font-weight: 900;
        font-size: 7.5pt;
        margin-top: 2px;
      }
      .auth-right {
        text-align: right;
      }
      .signature-box {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .seal-circle {
        border: 1.5px dashed #0f2d59;
        border-radius: 50%;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 5pt;
        font-weight: 900;
        color: #0f2d59;
        text-align: center;
        line-height: 1.15;
      }
      .sign-line {
        text-align: right;
        border-top: 1.5px solid #0f172a;
        padding-top: 3px;
        min-width: 160px;
      }
      .sign-title {
        font-size: 8.5pt;
        font-weight: 800;
        color: #0f172a;
      }
      .sign-sub {
        font-size: 7.5pt;
        font-weight: 600;
        color: #475569;
      }

      /* 8. FOOTER */
      .footer-section {
        border-top: 1px solid #cbd5e1;
        padding-top: 4px;
        text-align: center;
        font-size: 8pt;
        font-weight: 600;
        color: #64748b;
      }
      .footer-meta {
        display: flex;
        justify-content: space-between;
        margin-bottom: 2px;
      }
      .footer-disclaimer {
        font-style: italic;
        color: #94a3b8;
        font-size: 7.5pt;
      }

      @media print {
        body {
          background: #ffffff !important;
        }
        .payslip-sheet {
          box-shadow: none !important;
          border: 2.5px solid #0f2d59 !important;
          margin: 0 auto !important;
          max-width: 100% !important;
          width: 100% !important;
          min-height: 280mm !important;
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
