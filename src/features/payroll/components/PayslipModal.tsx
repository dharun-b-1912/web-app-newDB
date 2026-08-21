import React, { useRef } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Download, Printer, X, CheckCircle2, Building2 } from 'lucide-react';
import { Payslip } from '../../../types/payroll';
import { payrollApi } from '../../../services/payrollApi';

interface PayslipModalProps {
  payslip: Payslip | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({ payslip, isOpen, onClose }) => {
  if (!payslip || !isOpen) return null;

  const templateConfig = payrollApi.getPayslipTemplateConfig();
  const printRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = () => {
    // Open specialized print window for crisp, minimal, exact PDF download
    const printContent = printRef.current;
    if (!printContent) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payslip_${payslip.employee_code}_${payslip.pay_period.replace(/\s+/g, '_')}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 15mm;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                color: #000;
                margin: 0;
                padding: 10px;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .payslip-container {
                border: 1.5px solid #000;
                padding: 12px;
                max-width: 800px;
                margin: 0 auto;
                box-sizing: border-box;
              }
              .title-header {
                font-size: 14px;
                font-weight: 900;
                text-transform: uppercase;
                margin-bottom: 6px;
                letter-spacing: 0.5px;
              }
              .company-name {
                font-size: 15px;
                font-weight: 900;
                margin-bottom: 2px;
              }
              .company-address {
                font-size: 9.5px;
                color: #222;
                line-height: 1.35;
                margin-bottom: 10px;
                border-bottom: 1px solid #000;
                padding-bottom: 8px;
              }
              .grid-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 10px;
                margin-bottom: 8px;
              }
              .grid-table td, .grid-table th {
                border: 1px solid #000;
                padding: 3.5px 6px;
                vertical-align: middle;
              }
              .grid-table th {
                background-color: #f2f2f2;
                font-weight: bold;
                text-align: left;
              }
              .amount-col {
                text-align: right;
                font-family: "Courier New", Courier, monospace;
                font-weight: bold;
              }
              .footer-disclaimer {
                text-align: center;
                font-size: 9px;
                font-style: italic;
                margin-top: 10px;
                color: #333;
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 350);
    } else {
      window.print();
    }
  };

  // Safe daily rate calculation
  const basicAmount = payslip.earnings.find(e => e.name.toLowerCase().includes('basic'))?.amount || Math.round(payslip.gross_earnings * 0.5);
  const hraAmount = payslip.earnings.find(e => e.name.toLowerCase().includes('hra'))?.amount || Math.round(basicAmount * 0.4);
  const caAmount = payslip.earnings.find(e => e.name.toLowerCase().includes('conveyance'))?.amount || 1600;
  const medAmount = payslip.earnings.find(e => e.name.toLowerCase().includes('medical'))?.amount || 2500;
  const otAmount = payslip.earnings.find(e => e.name.toLowerCase().includes('overtime'))?.amount || 0;
  const arrearsAmount = payslip.earnings.find(e => e.name.toLowerCase().includes('arrear'))?.amount || 0;

  const pfDeduction = payslip.deductions.find(d => d.name.toLowerCase().includes('provident') || d.name.toLowerCase().includes('epf'))?.amount || Math.round(basicAmount * 0.12);
  const esiDeduction = payslip.deductions.find(d => d.name.toLowerCase().includes('esi'))?.amount || 0;
  const ptDeduction = payslip.deductions.find(d => d.name.toLowerCase().includes('professional') || d.name.toLowerCase().includes('pt'))?.amount || 208;
  const tdsDeduction = payslip.deductions.find(d => d.name.toLowerCase().includes('tds') || d.name.toLowerCase().includes('tax'))?.amount || 0;
  const advanceDeduction = payslip.deductions.find(d => d.name.toLowerCase().includes('advance'))?.amount || 0;
  const lwfDeduction = 10;

  const dailyGross = Math.round(payslip.gross_earnings / 30);
  const dailyBasic = Math.round(basicAmount / 30);
  const dailyHra = Math.round(hraAmount / 30);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="xl">
      <div className="p-4 sm:p-6 bg-white space-y-4 text-gray-900 select-text">
        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-200 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700">Template Style:</span>
            <span className="text-xs font-black text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
              {templateConfig.template_style === 'TamilNaduStandardGrid' ? 'Tamil Nadu Industrial Grid (Joy Format)' : 'Standard Enterprise'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={handleDownloadPDF}
              className="text-gray-800 hover:bg-gray-100 font-bold border-gray-300"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-[#07563D]" /> Download PDF
            </Button>
            <Button
              size="xs"
              variant="primary"
              onClick={handleDownloadPDF}
              className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold"
            >
              <Printer className="w-3.5 h-3.5 mr-1" /> Print Payslip
            </Button>
          </div>
        </div>

        {/* PRINTABLE PAYSLIP CONTAINER */}
        <div ref={printRef} className="payslip-container border-[1.5px] border-black p-4 sm:p-5 bg-white text-black font-sans text-xs">
          {/* Header Title */}
          <div className="title-header font-black text-sm uppercase tracking-wide mb-1 border-b border-transparent">
            EMPLOYEE SALARY SLIP - {payslip.pay_period.toUpperCase()}
          </div>

          {/* Company Details */}
          <div className="company-info pb-2.5 mb-2.5 border-b border-black">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="company-name font-black text-base tracking-tight">
                  {templateConfig.company_name}
                </div>
                <div className="company-address text-[10px] text-gray-800 leading-relaxed mt-0.5">
                  Company Address : {templateConfig.company_address}, Our site HR : {templateConfig.site_hr_phone}, Manager : {templateConfig.manager_phone}, ESI/EPF enquiry : {templateConfig.esi_epf_enquiry_phone}, MD : {templateConfig.md_phone} email : {templateConfig.email}, web : {templateConfig.website}
                </div>
              </div>
              {templateConfig.company_logo_url && (
                <img
                  src={templateConfig.company_logo_url}
                  alt="Company Logo"
                  className="w-14 h-14 object-contain shrink-0 rounded"
                />
              )}
            </div>
          </div>

          {/* Employee Meta 4-Row Grid */}
          <table className="grid-table w-full border-collapse border border-black text-[11px] mb-2.5">
            <tbody>
              <tr>
                <td className="border border-black p-1 font-bold bg-gray-50/50 w-[18%]">Emp ID</td>
                <td className="border border-black p-1 font-mono w-[32%]">{payslip.employee_code}</td>
                <td className="border border-black p-1 font-bold bg-gray-50/50 w-[20%]">Pay Date</td>
                <td className="border border-black p-1 font-mono w-[30%]">{payslip.payout_date || '31-Aug-2026'}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-bold bg-gray-50/50">Name</td>
                <td className="border border-black p-1 font-bold uppercase">{payslip.employee_name}</td>
                <td className="border border-black p-1 font-bold bg-gray-50/50">Pay Period</td>
                <td className="border border-black p-1 font-semibold">{payslip.pay_period}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-bold bg-gray-50/50">Department</td>
                <td className="border border-black p-1">{payslip.department}</td>
                <td className="border border-black p-1 font-bold bg-gray-50/50">Client Name</td>
                <td className="border border-black p-1 font-semibold">{templateConfig.client_name_default || 'Watertec Unit I'}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-bold bg-gray-50/50">Date of Joining</td>
                <td className="border border-black p-1 font-mono">{payslip.joining_date || '15-06-2025'}</td>
                <td className="border border-black p-1 font-bold bg-gray-50/50">Payable days</td>
                <td className="border border-black p-1 font-bold font-mono text-[#07563D]">{payslip.payable_days}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-bold bg-gray-50/50">UAN number</td>
                <td className="border border-black p-1 font-mono">{payslip.pf_uan || '100918273612'}</td>
                <td className="border border-black p-1 font-bold bg-gray-50/50">Bank A/C NO</td>
                <td className="border border-black p-1 font-mono">{payslip.account_number_masked}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-bold bg-gray-50/50">ESI number</td>
                <td className="border border-black p-1 font-mono">{payslip.esic_number || '3192847192'}</td>
                <td className="border border-black p-1 font-bold bg-gray-50/50">IFSC Code</td>
                <td className="border border-black p-1 font-mono">{payslip.ifsc_code}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-bold bg-gray-50/50">PAN Number</td>
                <td className="border border-black p-1 font-mono">{payslip.pan_number_masked}</td>
                <td className="border border-black p-1 font-bold bg-gray-50/50">OT Hours</td>
                <td className="border border-black p-1 font-mono font-bold">0.00</td>
              </tr>
            </tbody>
          </table>

          {/* Earnings & Deductions 2-Column Side-by-Side Table */}
          <table className="grid-table w-full border-collapse border border-black text-[11px] mb-2.5">
            <thead>
              <tr className="bg-gray-100 font-black">
                <th className="border border-black p-1.5 w-[28%] text-left">Earnings</th>
                <th className="border border-black p-1.5 w-[10%] text-right">Per Day</th>
                <th className="border border-black p-1.5 w-[12%] text-right">Per Month</th>
                <th className="border border-black p-1.5 w-[28%] text-left">Deductions</th>
                <th className="border border-black p-1.5 w-[10%] text-right">Per Day</th>
                <th className="border border-black p-1.5 w-[12%] text-right">Per Month</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1">Basic</td>
                <td className="border border-black p-1 amount-col">{dailyBasic}</td>
                <td className="border border-black p-1 amount-col">{basicAmount}</td>
                <td className="border border-black p-1">PF Deductions</td>
                <td className="border border-black p-1 amount-col"></td>
                <td className="border border-black p-1 amount-col">{pfDeduction.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="border border-black p-1">DA</td>
                <td className="border border-black p-1 amount-col">0</td>
                <td className="border border-black p-1 amount-col">0</td>
                <td className="border border-black p-1">ESI Deductions</td>
                <td className="border border-black p-1 amount-col"></td>
                <td className="border border-black p-1 amount-col">{esiDeduction.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="border border-black p-1">HRA</td>
                <td className="border border-black p-1 amount-col">{dailyHra}</td>
                <td className="border border-black p-1 amount-col">{hraAmount}</td>
                <td className="border border-black p-1">Professional Tax</td>
                <td className="border border-black p-1 amount-col"></td>
                <td className="border border-black p-1 amount-col">{ptDeduction.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="border border-black p-1">CA</td>
                <td className="border border-black p-1 amount-col">53</td>
                <td className="border border-black p-1 amount-col">{caAmount}</td>
                <td className="border border-black p-1">LWF</td>
                <td className="border border-black p-1 amount-col"></td>
                <td className="border border-black p-1 amount-col">{lwfDeduction.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="border border-black p-1">Food Allowance</td>
                <td className="border border-black p-1 amount-col">0</td>
                <td className="border border-black p-1 amount-col">0</td>
                <td className="border border-black p-1">Canteen</td>
                <td className="border border-black p-1 amount-col"></td>
                <td className="border border-black p-1 amount-col">0.00</td>
              </tr>
              <tr>
                <td className="border border-black p-1">Night Allowance</td>
                <td className="border border-black p-1 amount-col">0</td>
                <td className="border border-black p-1 amount-col">0</td>
                <td className="border border-black p-1">Snacks</td>
                <td className="border border-black p-1 amount-col"></td>
                <td className="border border-black p-1 amount-col">0.00</td>
              </tr>
              <tr>
                <td className="border border-black p-1">OT Wages</td>
                <td className="border border-black p-1 amount-col">0</td>
                <td className="border border-black p-1 amount-col">{otAmount}</td>
                <td className="border border-black p-1">Tent</td>
                <td className="border border-black p-1 amount-col"></td>
                <td className="border border-black p-1 amount-col">0.00</td>
              </tr>
              <tr>
                <td className="border border-black p-1">Attendance Bonus</td>
                <td className="border border-black p-1 amount-col">0</td>
                <td className="border border-black p-1 amount-col">0</td>
                <td className="border border-black p-1">Advance</td>
                <td className="border border-black p-1 amount-col"></td>
                <td className="border border-black p-1 amount-col">{advanceDeduction.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="border border-black p-1">Arrears</td>
                <td className="border border-black p-1 amount-col">0</td>
                <td className="border border-black p-1 amount-col">{arrearsAmount}</td>
                <td className="border border-black p-1">Others</td>
                <td className="border border-black p-1 amount-col"></td>
                <td className="border border-black p-1 amount-col">0.00</td>
              </tr>
              <tr>
                <td className="border border-black p-1">Holiday Wages</td>
                <td className="border border-black p-1 amount-col">0</td>
                <td className="border border-black p-1 amount-col">0</td>
                <td className="border border-black p-1">TDS</td>
                <td className="border border-black p-1 amount-col"></td>
                <td className="border border-black p-1 amount-col">{tdsDeduction.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="border border-black p-1">Production Incentive</td>
                <td className="border border-black p-1 amount-col">0</td>
                <td className="border border-black p-1 amount-col">0</td>
                <td className="border border-black p-1">Medical insurance</td>
                <td className="border border-black p-1 amount-col"></td>
                <td className="border border-black p-1 amount-col">0.00</td>
              </tr>
              <tr>
                <td className="border border-black p-1">Medical Allowance</td>
                <td className="border border-black p-1 amount-col">83</td>
                <td className="border border-black p-1 amount-col">{medAmount}</td>
                <td className="border border-black p-1 font-bold">Total Deductions</td>
                <td className="border border-black p-1 amount-col"></td>
                <td className="border border-black p-1 amount-col font-bold">{payslip.total_deductions.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* Gross Earnings vs Net Payable Row */}
          <table className="grid-table w-full border-collapse border border-black text-[12px] font-black mb-2">
            <tbody>
              <tr>
                <td className="border border-black p-1.5 w-[25%] bg-gray-100">Gross Earnings</td>
                <td className="border border-black p-1.5 w-[25%] amount-col font-mono text-sm">
                  {payslip.gross_earnings.toFixed(2)}
                </td>
                <td className="border border-black p-1.5 w-[25%] bg-gray-100">Net Payable</td>
                <td className="border border-black p-1.5 w-[25%] amount-col font-mono text-sm text-[#07563D]">
                  {payslip.net_pay.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Amount in words */}
          <div className="border border-black p-1.5 text-[11px] mb-2 font-medium">
            Amount in words: <span className="font-bold">{payslip.net_pay_in_words || 'Rupees Zero Only'}</span>
          </div>

          {/* Disclaimer Footer */}
          <div className="footer-disclaimer text-[10px] text-center italic text-gray-700 mt-2">
            {templateConfig.footer_disclaimer || '***This is a computer-generated payslip and does not require a physical signature.***'}
          </div>
        </div>
      </div>
    </Modal>
  );
};
