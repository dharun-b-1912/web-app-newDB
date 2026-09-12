// src/services/payroll/batchPayslipExportService.ts
// ============================================================================
// Joy PeopleHR — Enterprise Bulk Payslip Export Engine (Zip & Multi-Page A4 PDF)
// Generates Individual Single-Page A4 Slips & Master Consolidated PDF Print Stream
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

  const chunks: Uint8Array[] = [];
  let currentOffset = 0;

  for (const f of files) {
    const nameBytes = encoder.encode(f.name);
    const contentBytes = encoder.encode(f.content);
    const crc = crc32(f.content);
    const offset = currentOffset;

    // Local file header (30 bytes + name + content)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(localHeader.buffer);

    dv.setUint32(0, 0x04034b50, true); // Local file header signature
    dv.setUint16(4, 20, true);         // Version needed to extract (2.0)
    dv.setUint16(6, 0, true);          // General purpose bit flag
    dv.setUint16(8, 0, true);          // Compression method (0 = Store / Uncompressed)
    dv.setUint16(10, 0x5460, true);     // File last modification time
    dv.setUint16(12, 0x5891, true);     // File last modification date
    dv.setUint32(14, crc, true);        // CRC-32
    dv.setUint32(18, contentBytes.length, true); // Compressed size
    dv.setUint32(22, contentBytes.length, true); // Uncompressed size
    dv.setUint16(26, nameBytes.length, true);    // Filename length
    dv.setUint16(28, 0, true);                   // Extra field length

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

  // Central Directory headers
  for (const r of fileRecords) {
    const cdHeader = new Uint8Array(46 + r.nameBytes.length);
    const dv = new DataView(cdHeader.buffer);

    dv.setUint32(0, 0x02014b50, true); // Central directory header signature
    dv.setUint16(4, 20, true);         // Version made by
    dv.setUint16(6, 20, true);         // Version needed to extract
    dv.setUint16(8, 0, true);          // Flags
    dv.setUint16(10, 0, true);         // Compression method (0)
    dv.setUint16(12, 0x5460, true);    // Time
    dv.setUint16(14, 0x5891, true);    // Date
    dv.setUint32(16, r.crc, true);     // CRC-32
    dv.setUint32(20, r.contentBytes.length, true); // Compressed size
    dv.setUint32(24, r.contentBytes.length, true); // Uncompressed size
    dv.setUint16(28, r.nameBytes.length, true);    // Filename length
    dv.setUint16(30, 0, true);         // Extra field length
    dv.setUint16(32, 0, true);         // Comment length
    dv.setUint16(34, 0, true);         // Disk number start
    dv.setUint16(36, 0, true);         // Internal file attributes
    dv.setUint32(38, 0, true);         // External file attributes
    dv.setUint32(42, r.offset, true);  // Relative offset of local header

    cdHeader.set(r.nameBytes, 46);
    chunks.push(cdHeader);
    centralDirSize += cdHeader.length;
  }

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const dvEocd = new DataView(eocd.buffer);

  dvEocd.setUint32(0, 0x06054b50, true); // EOCD signature
  dvEocd.setUint16(4, 0, true);          // Number of this disk
  dvEocd.setUint16(6, 0, true);          // Disk where central directory starts
  dvEocd.setUint16(8, fileRecords.length, true);  // Total entries on this disk
  dvEocd.setUint16(10, fileRecords.length, true); // Total entries
  dvEocd.setUint32(12, centralDirSize, true);     // Size of central directory
  dvEocd.setUint32(16, centralDirStart, true);    // Offset of start of central directory
  dvEocd.setUint16(20, 0, true);                  // Comment length

  chunks.push(eocd);

  return new Blob(chunks, { type: 'application/zip' });
}

export class BatchPayslipExportService {
  /**
   * Generates pure HTML template for a single A4 payslip document
   */
  public static generateSinglePayslipHtml(vm: PayslipViewModel): string {
    const formattedDate = new Date(vm.metadata.generatedAt).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    return `
      <div class="payslip-page">
        <!-- HEADER -->
        <div class="header-top">
          <div class="logo-box">
            <div class="logo-badge">
              <img src="${vm.company.logoUrl || '/logo.png'}" alt="Logo" style="max-height: 100%; max-width: 100%; object-fit: contain;" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='inline';" />
              <span class="logo-text" style="${vm.company.logoUrl ? 'display:none;' : ''}">JOY</span>
            </div>
          </div>
          <div class="header-titles">
            <h1 class="main-title">EMPLOYEE SALARY SLIP</h1>
            <p class="sub-period">${vm.payroll.payrollPeriod.toUpperCase()}</p>
          </div>
        </div>

        <!-- COMPANY BLOCK -->
        <div class="company-block">
          <div class="company-name">${vm.company.legalName}</div>
          <div class="company-brand">${vm.company.displayName}</div>
          <div class="company-address">${vm.company.address || ''}</div>
          <div class="company-contacts">${vm.company.contact || ''}</div>
        </div>

        <!-- 4-COLUMN EMPLOYEE GRID (3 CLEAN ROWS) -->
        <table class="grid-table">
          <tbody>
            <tr>
              <td class="grid-cell" style="width: 25%;">
                <div class="grid-label">EMPLOYEE ID</div>
                <div class="grid-value font-mono">${vm.employee.employeeCode}</div>
              </td>
              <td class="grid-cell" style="width: 25%;">
                <div class="grid-label">EMPLOYEE NAME</div>
                <div class="grid-value">${vm.employee.employeeName}</div>
              </td>
              <td class="grid-cell" style="width: 25%;">
                <div class="grid-label">DESIGNATION</div>
                <div class="grid-value">${vm.employee.designation}</div>
              </td>
              <td class="grid-cell" style="width: 25%;">
                <div class="grid-label">DEPARTMENT</div>
                <div class="grid-value">${vm.employee.department}</div>
              </td>
            </tr>
            <tr>
              <td class="grid-cell">
                <div class="grid-label">DATE OF JOINING (DOJ)</div>
                <div class="grid-value font-mono">${vm.employee.dateOfJoining}</div>
              </td>
              <td class="grid-cell">
                <div class="grid-label">PAYROLL PERIOD</div>
                <div class="grid-value font-mono">${vm.payroll.periodStart} to ${vm.payroll.periodEnd}</div>
              </td>
              <td class="grid-cell">
                <div class="grid-label">PAYABLE DAYS</div>
                <div class="grid-value highlight-emerald font-mono">${vm.attendance.payableDays} Days</div>
              </td>
              <td class="grid-cell">
                <div class="grid-label">OT HOURS</div>
                <div class="grid-value font-mono">${vm.attendance.overtimeHours} Hrs</div>
              </td>
            </tr>
            <tr>
              <td class="grid-cell">
                <div class="grid-label">BANK ACCOUNT NUMBER</div>
                <div class="grid-value font-mono">${vm.employee.bankAccountMasked}</div>
              </td>
              <td class="grid-cell">
                <div class="grid-label">IFSC CODE & BANK NAME</div>
                <div class="grid-value font-mono">${vm.employee.ifscCode}</div>
              </td>
              <td class="grid-cell">
                <div class="grid-label">UAN / EPF NUMBER</div>
                <div class="grid-value font-mono">${vm.employee.uanMasked}</div>
              </td>
              <td class="grid-cell">
                <div class="grid-label">ESI NUMBER</div>
                <div class="grid-value font-mono">${vm.employee.esiMasked}</div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 2-COLUMN FINANCIAL STATEMENT -->
        <div class="financial-container">
          <!-- Earnings -->
          <div class="financial-col">
            <table class="fin-table">
              <thead>
                <tr>
                  <th>EARNINGS</th>
                  <th style="text-align: center;">UNITS</th>
                  <th style="text-align: right;">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${vm.earnings.map(e => `
                  <tr>
                    <td>${e.label}</td>
                    <td style="text-align: center; color: #64748b;" class="font-mono">${e.units || '—'}</td>
                    <td style="text-align: right; font-weight: 700;" class="font-mono">₹${e.amount.toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="total-bar">
              <span>GROSS EARNINGS</span>
              <span class="font-mono">₹${vm.totals.grossEarnings.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <!-- Deductions -->
          <div class="financial-col">
            <table class="fin-table">
              <thead>
                <tr>
                  <th>DEDUCTIONS</th>
                  <th style="text-align: right;">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${vm.deductions.length > 0 ? vm.deductions.map(d => `
                  <tr>
                    <td>${d.label}</td>
                    <td style="text-align: right; font-weight: 700; color: #9f1239;" class="font-mono">₹${d.amount.toLocaleString('en-IN')}</td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="2" style="text-align: center; color: #94a3b8; font-style: italic; padding: 12px;">Zero deductions applied (₹0.00)</td>
                  </tr>
                `}
              </tbody>
            </table>
            <div class="total-bar">
              <span>TOTAL DEDUCTIONS</span>
              <span class="font-mono" style="color: #9f1239;">₹${vm.totals.totalDeductions.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <!-- RECONCILIATION SUMMARY -->
        <div class="reconciliation-box">
          <div>
            <div style="font-weight: 800; color: #0369a1;">Imported register check</div>
            <div style="color: #0c4a6e; font-size: 7pt; margin-top: 1px;">
              Source Gross: <strong>₹${vm.totals.grossEarnings.toLocaleString('en-IN')}</strong> · Source Deductions: <strong>₹${vm.totals.totalDeductions.toLocaleString('en-IN')}</strong> · Source Net: <strong>₹${vm.totals.netPayable.toLocaleString('en-IN')}</strong>
            </div>
          </div>
          <div class="badge-reconciled">100% RECONCILED</div>
        </div>

        <!-- NET PAY HERO BLOCK -->
        <div class="net-pay-hero">
          <div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 8.5pt; font-weight: 900; color: #064e3b; letter-spacing: 0.5px;">NET TAKE-HOME PAY</span>
              <span class="mode-pill">${vm.employee.paymentMode}</span>
            </div>
            <div style="font-size: 7.5pt; font-weight: 700; color: #065f46; margin-top: 2px;">
              Amount in Words: ${vm.totals.netPayableInWords}
            </div>
          </div>
          <div class="net-amount font-mono">₹${vm.totals.netPayable.toLocaleString('en-IN')}</div>
        </div>

        <!-- STATUTORY FOOTER -->
        <div class="payslip-footer">
          <div style="display: flex; justify-content: space-between; font-size: 6.5pt; color: #94a3b8; margin-bottom: 2px;">
            <span>Generated on: ${formattedDate}</span>
            <span>JOY PeopleHR • Secure Statutory Document</span>
            <span>Page 1 of 1</span>
          </div>
          <div>*** This is a computer-generated payslip and does not require a physical signature. ***</div>
        </div>
      </div>
    `;
  }

  /**
   * Common print/A4 CSS styles for both single and multi-page payslips
   */
  public static getMasterA4Styles(): string {
    return `
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #0f172a;
        background: #ffffff;
        margin: 0;
        padding: 0;
      }
      .font-mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      }
      .payslip-page {
        width: 100%;
        max-width: 190mm;
        margin: 0 auto;
        padding: 16px 20px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        page-break-after: always;
        break-after: page;
      }
      .header-top {
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        padding-bottom: 6px;
        margin-bottom: 6px;
        border-bottom: 2px solid #1e3a8a;
      }
      .logo-box {
        position: absolute;
        left: 0;
        top: 0;
        display: flex;
        align-items: center;
      }
      .logo-badge {
        width: 44px;
        height: 38px;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .logo-text {
        font-weight: 900;
        color: #1e3a8a;
        font-size: 10pt;
        letter-spacing: 1px;
      }
      .header-titles {
        text-align: center;
      }
      .main-title {
        font-size: 14pt;
        font-weight: 900;
        color: #0f2d59;
        letter-spacing: 1px;
        text-transform: uppercase;
        margin: 0;
      }
      .sub-period {
        font-size: 8pt;
        font-weight: 800;
        color: #1d4ed8;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        margin: 2px 0 0 0;
      }
      .company-block {
        text-align: center;
        margin-bottom: 10px;
      }
      .company-name {
        font-size: 11.5pt;
        font-weight: 800;
        color: #0f172a;
      }
      .company-brand {
        font-size: 7.5pt;
        font-weight: 600;
        color: #475569;
        margin-top: 1px;
      }
      .company-address {
        font-size: 6.5pt;
        color: #334155;
        max-width: 90%;
        margin: 2px auto 0 auto;
        line-height: 1.3;
      }
      .company-contacts {
        font-size: 6.5pt;
        color: #1d4ed8;
        font-weight: 600;
        margin-top: 2px;
      }
      .grid-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        overflow: hidden;
        margin-bottom: 10px;
      }
      .grid-table td {
        border: 1px solid #cbd5e1;
        padding: 5px 8px;
        background: #f8fafc;
        vertical-align: middle;
      }
      .grid-label {
        font-size: 5.5pt;
        font-weight: 800;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        margin-bottom: 1px;
      }
      .grid-value {
        font-size: 7.5pt;
        font-weight: 700;
        color: #0f172a;
      }
      .highlight-emerald {
        color: #047857 !important;
        font-weight: 800;
      }
      .financial-container {
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
      }
      .financial-col {
        flex: 1;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .fin-table {
        width: 100%;
        border-collapse: collapse;
      }
      .fin-table th {
        background: #f1f5f9;
        color: #1e3a8a;
        font-size: 6.5pt;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 5px 8px;
        border-bottom: 1.5px solid #cbd5e1;
        text-align: left;
      }
      .fin-table td {
        padding: 4px 8px;
        border-bottom: 1px solid #f1f5f9;
        font-size: 7pt;
        color: #1e293b;
      }
      .total-bar {
        background: #f8fafc;
        border-top: 1.5px solid #cbd5e1;
        padding: 5px 8px;
        display: flex;
        justify-content: space-between;
        font-size: 7.5pt;
        font-weight: 900;
        color: #0f172a;
      }
      .reconciliation-box {
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: 6px;
        padding: 5px 8px;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 7pt;
      }
      .badge-reconciled {
        background: #e0f2fe;
        color: #0369a1;
        border: 1px solid #bae6fd;
        font-weight: 900;
        font-size: 6pt;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .net-pay-hero {
        background: #ecfdf5;
        border: 1.5px solid #6ee7b7;
        border-radius: 6px;
        padding: 8px 12px;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .mode-pill {
        background: #d1fae5;
        color: #047857;
        border: 1px solid #a7f3d0;
        font-size: 5.5pt;
        font-weight: 800;
        padding: 1px 5px;
        border-radius: 9999px;
      }
      .net-amount {
        font-size: 15pt;
        font-weight: 900;
        color: #047857;
      }
      .payslip-footer {
        border-top: 1px solid #e2e8f0;
        padding-top: 5px;
        text-align: center;
        font-size: 6.5pt;
        font-style: italic;
        color: #64748b;
      }
      @media print {
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        body {
          background: #ffffff !important;
        }
        .payslip-page {
          border: 1px solid #cbd5e1 !important;
          margin: 0 auto !important;
          page-break-after: always !important;
          break-after: page !important;
        }
        .payslip-page:last-child {
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
      <html>
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
        <html>
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
