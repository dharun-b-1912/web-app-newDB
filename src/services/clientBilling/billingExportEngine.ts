// src/services/clientBilling/billingExportEngine.ts
// ============================================================================
// JOY PeopleHR / JOY Corporate Solutions — Multi-Sheet Excel & PDF Export Engine
// ============================================================================

import {
  BillingRun,
  LegacyClientTemplateConfig,
} from '../../types/clientBilling';
import { ClientMasterService } from './clientMasterService';

export class BillingExportEngine {
  /**
   * Format Indian Rupee currency string
   */
  public static formatINR(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Export Multi-Sheet Comprehensive Excel Package
   * Contains:
   * 1. Employee Wage Register
   * 2. Salary & OT Workings
   * 3. Client Billing Summary
   * 4. Tax Invoice Format
   * 5. Statutory Reconciliation
   */
  public static exportComprehensiveExcel(run: BillingRun): void {
    const client = ClientMasterService.getClientById(run.client_id);
    const fileName = `JOY_Client_Billing_${run.client_name.replace(/[^a-zA-Z0-9]/g, '_')}_${run.period.replace(/[^a-zA-Z0-9]/g, '_')}.xls`;

    // Build standard multi-sheet XML Spreadsheet (supported natively by Excel 2003+ and modern Excel)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>Client Billing &amp; Wage Workings - ${this.escapeXml(run.client_name)}</Title>
  <Author>JOY Corporate Solutions Billing OS 2.0</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#07563D"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#07563D" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#043828"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#043828"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#043828"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#043828"/>
   </Borders>
  </Style>
  <Style ss:ID="SubHeaderStyle">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#07563D"/>
   <Interior ss:Color="#E6F4EA" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CEEAD6"/>
   </Borders>
  </Style>
  <Style ss:ID="DataText">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataNum">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCurrency">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="₹#,##0.00"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalRow">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#000000"/>
   <Interior ss:Color="#F1F3F4" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="₹#,##0.00"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#07563D"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#07563D"/>
   </Borders>
  </Style>
 </Styles>

 <!-- SHEET 1: INVOICE BILLING SUMMARY -->
 <Worksheet ss:Name="Invoice Summary">
  <Table ss:DefaultColumnWidth="120">
   <Column ss:Width="40"/>
   <Column ss:Width="280"/>
   <Column ss:Width="100"/>
   <Column ss:Width="80"/>
   <Column ss:Width="140"/>
   <Row ss:Height="30">
    <Cell ss:MergeAcross="4" ss:StyleID="TitleStyle"><Data ss:Type="String">JOY CORPORATE SOLUTIONS — CLIENT BILLING SUMMARY</Data></Cell>
   </Row>
   <Row>
    <Cell ss:MergeAcross="4" ss:StyleID="SubHeaderStyle"><Data ss:Type="String">Client: ${this.escapeXml(run.client_name)} | Period: ${this.escapeXml(run.period)} | Contract: ${this.escapeXml(run.contract_name)}</Data></Cell>
   </Row>
   <Row><Cell><Data ss:Type="String"></Data></Cell></Row>
   <Row ss:Height="24">
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">S.No</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Particulars / Description</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">SAC / HSN</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Qty</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Amount (INR)</Data></Cell>
   </Row>
   ${run.line_items
     .map(
       (item) => `
   <Row ss:Height="20">
    <Cell ss:StyleID="DataNum"><Data ss:Type="Number">${item.sequence}</Data></Cell>
    <Cell ss:StyleID="DataText"><Data ss:Type="String">${this.escapeXml(item.description)}</Data></Cell>
    <Cell ss:StyleID="DataText"><Data ss:Type="String">${this.escapeXml(item.sac_code)}</Data></Cell>
    <Cell ss:StyleID="DataNum"><Data ss:Type="Number">${item.quantity || 1}</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${item.amount}</Data></Cell>
   </Row>`
     )
     .join('')}
   <Row ss:Height="22">
    <Cell ss:MergeAcross="3" ss:StyleID="TotalRow"><Data ss:Type="String">TAXABLE BILLING VALUE</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${run.taxable_amount}</Data></Cell>
   </Row>
   ${
     run.tax_summary.supply_type === 'INTRASTATE'
       ? `
   <Row ss:Height="20">
    <Cell ss:MergeAcross="3" ss:StyleID="DataText"><Data ss:Type="String">Central GST (CGST @ ${run.tax_summary.cgst_rate_pct}%)</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${run.tax_summary.cgst_amount}</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:MergeAcross="3" ss:StyleID="DataText"><Data ss:Type="String">State GST (SGST @ ${run.tax_summary.sgst_rate_pct}%)</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${run.tax_summary.sgst_amount}</Data></Cell>
   </Row>`
       : `
   <Row ss:Height="20">
    <Cell ss:MergeAcross="3" ss:StyleID="DataText"><Data ss:Type="String">Integrated GST (IGST @ ${run.tax_summary.igst_rate_pct}%)</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${run.tax_summary.igst_amount}</Data></Cell>
   </Row>`
   }
   <Row ss:Height="20">
    <Cell ss:MergeAcross="3" ss:StyleID="DataText"><Data ss:Type="String">Round Off</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${run.tax_summary.round_off_amount}</Data></Cell>
   </Row>
   <Row ss:Height="26">
    <Cell ss:MergeAcross="3" ss:StyleID="TotalRow"><Data ss:Type="String">GRAND TOTAL INVOICE VALUE</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${run.tax_summary.grand_total}</Data></Cell>
   </Row>
   <Row><Cell><Data ss:Type="String"></Data></Cell></Row>
   <Row>
    <Cell ss:MergeAcross="4" ss:StyleID="SubHeaderStyle"><Data ss:Type="String">Amount in Words: ${this.escapeXml(run.tax_summary.amount_in_words)}</Data></Cell>
   </Row>
  </Table>
 </Worksheet>

 <!-- SHEET 2: EMPLOYEE WAGE REGISTER -->
 <Worksheet ss:Name="Wage Register">
  <Table ss:DefaultColumnWidth="90">
   <Column ss:Width="40"/>
   <Column ss:Width="80"/>
   <Column ss:Width="160"/>
   <Column ss:Width="120"/>
   <Column ss:Width="60"/>
   <Column ss:Width="60"/>
   <Column ss:Width="60"/>
   <Column ss:Width="60"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="90"/>
   <Column ss:Width="70"/>
   <Column ss:Width="70"/>
   <Column ss:Width="70"/>
   <Column ss:Width="70"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Row ss:Height="26">
    <Cell ss:MergeAcross="20" ss:StyleID="TitleStyle"><Data ss:Type="String">EMPLOYEE-WISE MONTHLY WAGE REGISTER &amp; STATUTORY STATEMENT</Data></Cell>
   </Row>
   <Row ss:Height="24">
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">S.No</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Emp ID</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Associate Name</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Designation</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Days</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Present</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">LOP</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">OT Hrs</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Basic</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">DA</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">HRA</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Spl Allow</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">OT Wages</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Gross Pay</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Emp PF</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Emp ESI</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">PT</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Canteen</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Net Salary</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Employer PF</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Employer ESI</Data></Cell>
   </Row>
   ${run.employee_results
     .map(
       (emp, idx) => `
   <Row ss:Height="20">
    <Cell ss:StyleID="DataNum"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="DataText"><Data ss:Type="String">${this.escapeXml(emp.employee_code)}</Data></Cell>
    <Cell ss:StyleID="DataText"><Data ss:Type="String">${this.escapeXml(emp.employee_name)}</Data></Cell>
    <Cell ss:StyleID="DataText"><Data ss:Type="String">${this.escapeXml(emp.designation)}</Data></Cell>
    <Cell ss:StyleID="DataNum"><Data ss:Type="Number">${emp.salary_divisor_days}</Data></Cell>
    <Cell ss:StyleID="DataNum"><Data ss:Type="Number">${emp.present_days}</Data></Cell>
    <Cell ss:StyleID="DataNum"><Data ss:Type="Number">${emp.lop_days}</Data></Cell>
    <Cell ss:StyleID="DataNum"><Data ss:Type="Number">${emp.ot_hours}</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${emp.basic_earned}</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${emp.da_earned}</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${emp.hra_earned}</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${emp.special_allowance_earned}</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${emp.ot_amount_earned}</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${emp.gross_earnings}</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${emp.employee_pf}</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${emp.employee_esi}</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${emp.employee_pt}</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${emp.canteen_deduction}</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${emp.net_employee_payable}</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${emp.total_employer_pf_cost}</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${emp.employer_esi_3_25}</Data></Cell>
   </Row>`
     )
     .join('')}
   <Row ss:Height="24">
    <Cell ss:MergeAcross="7" ss:StyleID="TotalRow"><Data ss:Type="String">TOTALS (${run.active_employee_count} ASSOCIATES)</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${run.employee_results.reduce((s, e) => s + e.basic_earned, 0)}</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${run.employee_results.reduce((s, e) => s + e.da_earned, 0)}</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${run.employee_results.reduce((s, e) => s + e.hra_earned, 0)}</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${run.employee_results.reduce((s, e) => s + e.special_allowance_earned, 0)}</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${run.employee_results.reduce((s, e) => s + e.ot_amount_earned, 0)}</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${run.total_employee_gross_earnings}</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${run.employee_results.reduce((s, e) => s + e.employee_pf, 0)}</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${run.employee_results.reduce((s, e) => s + e.employee_esi, 0)}</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${run.employee_results.reduce((s, e) => s + e.employee_pt, 0)}</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${run.total_canteen_recoveries}</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${run.total_employee_net_salary}</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${run.total_employer_pf}</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${run.total_employer_esi}</Data></Cell>
   </Row>
  </Table>
 </Worksheet>

 <!-- SHEET 3: STATUTORY RECONCILIATION -->
 <Worksheet ss:Name="Reconciliation">
  <Table ss:DefaultColumnWidth="160">
   <Row ss:Height="26">
    <Cell ss:MergeAcross="3" ss:StyleID="TitleStyle"><Data ss:Type="String">BILLING VS PAYROLL STATUTORY RECONCILIATION STATEMENT</Data></Cell>
   </Row>
   <Row ss:Height="24">
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Compliance Metric</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Payroll Master Value</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Client Billed Value</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Variance &amp; Status</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="DataText"><Data ss:Type="String">Total Deployed Associates</Data></Cell>
    <Cell ss:StyleID="DataNum"><Data ss:Type="Number">${run.reconciliation.payroll_employee_count}</Data></Cell>
    <Cell ss:StyleID="DataNum"><Data ss:Type="Number">${run.reconciliation.billed_employee_count}</Data></Cell>
    <Cell ss:StyleID="DataText"><Data ss:Type="String">${run.reconciliation.employee_count_status === 'MATCHED' ? '✓ MATCHED (100%)' : '⚠ VARIANCE DETECTED'}</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="DataText"><Data ss:Type="String">Total Payable Days</Data></Cell>
    <Cell ss:StyleID="DataNum"><Data ss:Type="Number">${run.reconciliation.payroll_total_pay_days}</Data></Cell>
    <Cell ss:StyleID="DataNum"><Data ss:Type="Number">${run.reconciliation.billed_total_pay_days}</Data></Cell>
    <Cell ss:StyleID="DataText"><Data ss:Type="String">${run.reconciliation.pay_days_status === 'MATCHED' ? '✓ MATCHED' : '⚠ VARIANCE'}</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="DataText"><Data ss:Type="String">Total Overtime Hours</Data></Cell>
    <Cell ss:StyleID="DataNum"><Data ss:Type="Number">${run.reconciliation.payroll_total_ot_hours}</Data></Cell>
    <Cell ss:StyleID="DataNum"><Data ss:Type="Number">${run.reconciliation.billed_total_ot_hours}</Data></Cell>
    <Cell ss:StyleID="DataText"><Data ss:Type="String">${run.reconciliation.ot_hours_status === 'MATCHED' ? '✓ MATCHED' : '⚠ VARIANCE'}</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="DataText"><Data ss:Type="String">Employer Provident Fund (PF)</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${run.reconciliation.payroll_employer_pf}</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${run.reconciliation.billed_employer_pf}</Data></Cell>
    <Cell ss:StyleID="DataText"><Data ss:Type="String">${run.reconciliation.employer_pf_status === 'MATCHED' ? '✓ MATCHED' : '⚠ VARIANCE'}</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="DataText"><Data ss:Type="String">Employer State Insurance (ESIC)</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${run.reconciliation.payroll_employer_esi}</Data></Cell>
    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${run.reconciliation.billed_employer_esi}</Data></Cell>
    <Cell ss:StyleID="DataText"><Data ss:Type="String">${run.reconciliation.employer_esi_status === 'MATCHED' ? '✓ MATCHED' : '⚠ VARIANCE'}</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`;

    this.downloadBlob(xml, fileName, 'application/vnd.ms-excel');
  }

  /**
   * Export Printable / PDF HTML Document
   */
  public static printOrExportPDF(run: BillingRun): void {
    const client = ClientMasterService.getClientById(run.client_id);
    const win = window.open('', '_blank');
    if (!win) {
      alert('Please allow popups to preview and print the tax invoice document.');
      return;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>TAX INVOICE - ${run.invoice_number || run.run_number}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; padding: 20px; font-size: 13px; line-height: 1.4; }
    .header { border-bottom: 2px solid #07563D; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
    .company-title { font-size: 20px; font-weight: 800; color: #07563D; margin: 0; }
    .invoice-title { font-size: 22px; font-weight: 900; color: #111827; text-align: right; margin: 0; }
    .meta-box { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
    .meta-col { flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; font-size: 12px; }
    .meta-col h4 { margin: 0 0 6px 0; color: #07563D; font-size: 13px; font-weight: 700; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #07563D; color: white; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; font-weight: 700; }
    td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals-table { width: 350px; margin-left: auto; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; margin-bottom: 20px; }
    .totals-table td { padding: 6px 12px; }
    .grand-total { background: #07563D; color: white; font-weight: 800; font-size: 15px; }
    .words-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 10px; font-weight: 600; color: #065f46; margin-bottom: 20px; font-size: 12px; }
    .bank-box { border: 1px dashed #9ca3af; border-radius: 6px; padding: 10px; font-size: 11px; margin-top: 15px; }
    .footer-signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }
    .sig-block { text-align: center; width: 200px; border-top: 1px solid #9ca3af; padding-top: 6px; font-size: 11px; font-weight: 600; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 15px; text-align: right;">
    <button onclick="window.print()" style="padding: 8px 16px; background: #07563D; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">🖨️ Print / Save as PDF</button>
  </div>

  <div class="header">
    <div>
      <h1 class="company-title">JOY CORPORATE SOLUTIONS PVT LTD</h1>
      <div style="font-size: 12px; color: #4b5563; margin-top: 2px;">
        Industrial Manpower Supply, Compliance &amp; Facility Operations<br>
        Plot 12, SIDCO Industrial Estate, Coimbatore, Tamil Nadu - 641021<br>
        <strong>GSTIN:</strong> 33AAACJ9988H1Z4 | <strong>PAN:</strong> AAACJ9988H | <strong>State Code:</strong> 33
      </div>
    </div>
    <div>
      <h2 class="invoice-title">TAX INVOICE</h2>
      <div style="font-size: 12px; text-align: right; color: #374151; margin-top: 4px;">
        <strong>Invoice No:</strong> ${run.invoice_number || run.run_number}<br>
        <strong>Invoice Date:</strong> ${run.invoice_date || new Date().toISOString().split('T')[0]}<br>
        <strong>Period:</strong> ${run.period}
      </div>
    </div>
  </div>

  <div class="meta-box">
    <div class="meta-col">
      <h4>Billed To (Client):</h4>
      <strong>${run.client_name}</strong><br>
      ${client?.billing_address || client?.registered_address || 'Industrial Estate Road'}<br>
      ${client?.city || 'Coimbatore'}, ${client?.state || 'Tamil Nadu'} - ${client?.pincode || '641001'}<br>
      <strong>GSTIN:</strong> ${client?.gstin || '33AAACE1234F1Z5'} | <strong>PAN:</strong> ${client?.pan || 'AAACE1234F'}<br>
      <strong>State Code:</strong> ${client?.state_code || '33'} (${client?.state || 'Tamil Nadu'})
    </div>
    <div class="meta-col">
      <h4>Contract &amp; Payment Details:</h4>
      <strong>Contract:</strong> ${run.contract_name}<br>
      <strong>Contract No:</strong> ${run.contract_number}<br>
      <strong>Deployed Associates:</strong> ${run.active_employee_count} Associates (${run.total_payable_days} Pay Days)<br>
      <strong>Payment Terms:</strong> ${client?.payment_terms || '30 Days Net'}<br>
      <strong>Due Date:</strong> ${run.due_date || 'Within 30 days of receipt'}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="text-center" style="width: 40px;">#</th>
        <th>Description of Services / Particulars</th>
        <th class="text-center" style="width: 80px;">SAC</th>
        <th class="text-center" style="width: 60px;">Qty</th>
        <th class="text-right" style="width: 130px;">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${run.line_items
        .map(
          (item) => `
      <tr>
        <td class="text-center">${item.sequence}</td>
        <td>
          <strong>${item.description}</strong>
          ${item.calculation_basis_text ? `<div style="font-size: 10px; color: #6b7280;">${item.calculation_basis_text}</div>` : ''}
        </td>
        <td class="text-center font-mono">${item.sac_code}</td>
        <td class="text-center">${item.quantity || 1}</td>
        <td class="text-right font-mono font-bold">${this.formatINR(item.amount)}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
    <div style="flex: 1;">
      <div class="words-box">
        <strong>Amount in Words:</strong><br>
        ${run.tax_summary.amount_in_words}
      </div>

      <div class="bank-box">
        <strong>Bank Remittance Details:</strong><br>
        Beneficiary: JOY Corporate Solutions Pvt Ltd<br>
        Bank: HDFC Bank Ltd | Account No: 50200088991122<br>
        IFSC Code: HDFC0001234 | Branch: Coimbatore Main
      </div>
    </div>

    <table class="totals-table">
      <tr>
        <td><strong>Taxable Value:</strong></td>
        <td class="text-right font-mono font-bold">${this.formatINR(run.taxable_amount)}</td>
      </tr>
      ${
        run.tax_summary.supply_type === 'INTRASTATE'
          ? `
      <tr>
        <td>CGST @ ${run.tax_summary.cgst_rate_pct}%:</td>
        <td class="text-right font-mono">${this.formatINR(run.tax_summary.cgst_amount)}</td>
      </tr>
      <tr>
        <td>SGST @ ${run.tax_summary.sgst_rate_pct}%:</td>
        <td class="text-right font-mono">${this.formatINR(run.tax_summary.sgst_amount)}</td>
      </tr>`
          : `
      <tr>
        <td>IGST @ ${run.tax_summary.igst_rate_pct}%:</td>
        <td class="text-right font-mono">${this.formatINR(run.tax_summary.igst_amount)}</td>
      </tr>`
      }
      <tr>
        <td>Round Off:</td>
        <td class="text-right font-mono">${this.formatINR(run.tax_summary.round_off_amount)}</td>
      </tr>
      <tr class="grand-total">
        <td><strong>Grand Total:</strong></td>
        <td class="text-right font-mono font-bold">${this.formatINR(run.tax_summary.grand_total)}</td>
      </tr>
    </table>
  </div>

  <div class="footer-signatures">
    <div class="sig-block">
      Prepared By<br>
      (Billing &amp; Operations Desk)
    </div>
    <div class="sig-block">
      Verified By<br>
      (Labour Compliance Head)
    </div>
    <div class="sig-block">
      For JOY Corporate Solutions Pvt Ltd<br>
      (Authorized Signatory)
    </div>
  </div>
</body>
</html>`;

    win.document.write(html);
    win.document.close();
  }

  private static escapeXml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private static downloadBlob(content: string, fileName: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
