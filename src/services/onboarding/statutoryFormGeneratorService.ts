// ============================================================================
// Service: Statutory Form Generator & PDF Rendering Engine
// Divya Manpower Resources (P) Ltd.
// Generates Forms: Form 11, Form 2, Form F, Form 1, Form Q, Employee Resume
// ============================================================================

import { Employee } from '../../types';
import {
  StatutoryFormType,
  StatutoryNominee,
  PfDeclarationData,
  AppointmentOrderData,
} from '../../types/statutoryForms';

export class StatutoryFormGeneratorService {
  /**
   * Render HTML for any of the 6 statutory forms with real employee data
   */
  public static generateFormHtml(
    formType: StatutoryFormType,
    employee: Partial<Employee>,
    pfDecl?: Partial<PfDeclarationData> | null,
    nominations: StatutoryNominee[] = [],
    appointment?: Partial<AppointmentOrderData> | null,
    orgName: string = 'Enterprise Organization'
  ): string {
    switch (formType) {
      case 'FORM_11':
        return this.renderForm11(employee, pfDecl, orgName);
      case 'FORM_2':
        return this.renderForm2(employee, nominations, orgName);
      case 'FORM_F':
        return this.renderFormF(employee, nominations, orgName);
      case 'FORM_1':
        return this.renderForm1(employee, nominations, orgName);
      case 'FORM_Q':
        return this.renderFormQ(employee, appointment, orgName);
      case 'RESUME':
      default:
        return this.renderResume(employee, pfDecl, nominations, appointment, orgName);
    }
  }

  // ==========================================================================
  // 1. EPFO NEW FORM NO. 11 (Declaration Form)
  // ==========================================================================
  private static renderForm11(
    emp: Partial<Employee>,
    pf?: Partial<PfDeclarationData> | null,
    org: string = 'Enterprise Organization'
  ): string {
    const empAny = emp as any;
    const fullName = empAny.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Murugan P';
    const dob = empAny.date_of_birth || empAny.dob || '1988-04-12';
    const gender = empAny.gender || 'Male';
    const fatherName = empAny.father_name || empAny.father_or_spouse_name || 'Paramasivam';
    const maritalStatus = empAny.marital_status || 'Married';
    const email = empAny.email || empAny.work_email || 'employee@divyamanpower.in';
    const mobile = empAny.phone || empAny.mobile_phone || '+91 98401 23456';
    const uan = pf?.previous_uan || '101293847562';
    const pan = pf?.pan_number || empAny.pan || 'ABCDE1234F';
    const aadhaar = pf?.aadhaar_number || 'XXXX-XXXX-8921';
    const bankAcc = pf?.bank_account_no || '918273645019';
    const ifsc = pf?.bank_ifsc || 'SBIN0001234';

    return `
      <div style="font-family: 'Times New Roman', Times, serif; color: #111827; padding: 24px; max-width: 800px; margin: 0 auto; line-height: 1.4; border: 1px solid #d1d5db; background: #fff;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">EMPLOYEES' PROVIDENT FUND ORGANISATION</h2>
          <p style="margin: 2px 0; font-size: 12px;">Employees' Provident Funds Scheme, 1952 (Paragraph 34 & 57) & Employees' Pension Scheme, 1995 (Paragraph 24)</p>
          <h3 style="margin: 6px 0 0 0; font-size: 14px; font-weight: bold; text-decoration: underline;">DECLARATION BY A PERSON TAKING UP EMPLOYMENT IN AN ESTABLISHMENT (NEW FORM NO. 11)</h3>
          <p style="margin: 2px 0; font-size: 12px; font-weight: bold;">Establishment: ${org}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
          <tr>
            <td style="border: 1px solid #000; padding: 6px; width: 5%; text-align: center; font-weight: bold;">1</td>
            <td style="border: 1px solid #000; padding: 6px; width: 45%;">Name of the member (in Block Letters)</td>
            <td style="border: 1px solid #000; padding: 6px; width: 50%; font-weight: bold;">${fullName.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">2</td>
            <td style="border: 1px solid #000; padding: 6px;">Father's Name / Husband's Name</td>
            <td style="border: 1px solid #000; padding: 6px;">${fatherName}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">3</td>
            <td style="border: 1px solid #000; padding: 6px;">Date of Birth (DD/MM/YYYY) & Gender</td>
            <td style="border: 1px solid #000; padding: 6px;">${dob} &nbsp;|&nbsp; Gender: ${gender}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">4</td>
            <td style="border: 1px solid #000; padding: 6px;">Marital Status</td>
            <td style="border: 1px solid #000; padding: 6px;">${maritalStatus}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">5</td>
            <td style="border: 1px solid #000; padding: 6px;">Email ID & Mobile Number</td>
            <td style="border: 1px solid #000; padding: 6px;">${email} &nbsp;|&nbsp; ${mobile}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">6</td>
            <td style="border: 1px solid #000; padding: 6px;">Whether earlier a member of EPF Scheme, 1952?</td>
            <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">${pf?.previous_epf_member ? 'YES' : 'NO'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">7</td>
            <td style="border: 1px solid #000; padding: 6px;">Whether earlier a member of EPS, 1995?</td>
            <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">${pf?.previous_eps_member ? 'YES' : 'NO'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">8</td>
            <td style="border: 1px solid #000; padding: 6px;">Previous Universal Account Number (UAN)</td>
            <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">${uan || 'N/A'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">9</td>
            <td style="border: 1px solid #000; padding: 6px;">Date of Exit from Previous Employment</td>
            <td style="border: 1px solid #000; padding: 6px;">${pf?.previous_exit_date || 'N/A'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">10</td>
            <td style="border: 1px solid #000; padding: 6px;">International Worker (Yes / No)</td>
            <td style="border: 1px solid #000; padding: 6px;">${pf?.international_worker ? 'YES' : 'NO'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">11</td>
            <td style="border: 1px solid #000; padding: 6px;">KYC Credentials (Bank A/C, IFSC, Aadhaar, PAN)</td>
            <td style="border: 1px solid #000; padding: 6px;">
              Bank A/C: <b>${bankAcc}</b> (IFSC: ${ifsc})<br>
              Aadhaar: <b>${aadhaar}</b> &nbsp;|&nbsp; PAN: <b>${pan}</b>
            </td>
          </tr>
        </table>

        <div style="font-size: 11px; margin-top: 14px; text-align: justify;">
          <b>UNDERTAKING BY EMPLOYEE:</b> I declare that all particulars stated above are true to the best of my knowledge. In case of any untrue declaration, I will be held personally liable for statutory consequences.
        </div>

        <div style="margin-top: 36px; display: flex; justify-content: space-between; font-size: 12px;">
          <div>
            <p style="margin: 0;">Date: ${pf?.declaration_date || 'Current Date'}</p>
            <p style="margin: 4px 0 0 0;">Place: Chennai</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-weight: bold;">[ Digital / Physical Signature ]</p>
            <p style="margin: 4px 0 0 0;">Signature of the Member</p>
          </div>
        </div>

        <div style="margin-top: 24px; border-top: 1px solid #000; padding-top: 10px; font-size: 11px;">
          <b>DECLARATION BY PRESENT EMPLOYER:</b> Certified that the required details have been verified and employee enrolled under PF Code of <b>${org}</b>.
          <div style="margin-top: 24px; text-align: right; font-size: 12px; font-weight: bold;">
            Authorised Signatory with Establishment Seal
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // 2. FORM 2 (REVISED) — EPF & EPS NOMINATION
  // ==========================================================================
  private static renderForm2(
    emp: Partial<Employee>,
    nominations: StatutoryNominee[],
    org: string = 'Enterprise Organization'
  ): string {
    const empAny = emp as any;
    const fullName = empAny.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Murugan P';
    const fatherName = empAny.father_name || 'Paramasivam';
    const dob = empAny.date_of_birth || empAny.dob || '1988-04-12';
    const epfNominees = nominations.filter((n) => n.nomination_type === 'EPF');
    const epsNominees = nominations.filter((n) => n.nomination_type === 'EPS');

    const nomineeRows = epfNominees.map((nom, i) => `
      <tr>
        <td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
        <td style="border: 1px solid #000; padding: 4px;"><b>${nom.nominee_name}</b><br><small>${nom.address_line1 || 'Same as member'}</small></td>
        <td style="border: 1px solid #000; padding: 4px; text-align: center;">${nom.relationship}</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: center;">${nom.date_of_birth || nom.age + ' Years'}</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${nom.share_percentage}%</td>
        <td style="border: 1px solid #000; padding: 4px;">${nom.is_minor ? `Guardian: ${nom.guardian_name || 'Natural Guardian'} (${nom.guardian_relationship || 'Spouse'})` : 'N/A (Major)'}</td>
      </tr>
    `).join('') || `<tr><td colspan="6" style="border: 1px solid #000; padding: 8px; text-align: center;">No EPF nominees recorded</td></tr>`;

    return `
      <div style="font-family: 'Times New Roman', Times, serif; color: #111827; padding: 24px; max-width: 800px; margin: 0 auto; line-height: 1.4; border: 1px solid #d1d5db; background: #fff;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 12px;">
          <h2 style="margin: 0; font-size: 15px; font-weight: bold;">FORM 2 (REVISED)</h2>
          <p style="margin: 2px 0; font-size: 12px; font-weight: bold;">NOMINATION AND DECLARATION FORM FOR UNEXEMPTED / EXEMPTED ESTABLISHMENTS</p>
          <p style="margin: 2px 0; font-size: 11px;">Declaration and Nomination Form under the Employees' Provident Funds and Employees' Pension Scheme</p>
        </div>

        <table style="width: 100%; font-size: 11px; margin-bottom: 12px;">
          <tr>
            <td><b>1. Name (in Block Letters):</b> ${fullName.toUpperCase()}</td>
            <td><b>2. Father's / Husband's Name:</b> ${fatherName}</td>
          </tr>
          <tr>
            <td><b>3. Date of Birth:</b> ${dob}</td>
            <td><b>4. Establishment:</b> ${org}</td>
          </tr>
        </table>

        <div style="font-weight: bold; font-size: 12px; background: #f3f4f6; padding: 4px; margin-bottom: 6px; border: 1px solid #000;">
          PART A (EPF) — NOMINATION FOR EMPLOYEES' PROVIDENT FUND
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 14px;">
          <thead>
            <tr style="background: #e5e7eb;">
              <th style="border: 1px solid #000; padding: 4px; width: 5%;">Sl.</th>
              <th style="border: 1px solid #000; padding: 4px; width: 35%;">Name & Address of Nominee</th>
              <th style="border: 1px solid #000; padding: 4px; width: 15%;">Relationship</th>
              <th style="border: 1px solid #000; padding: 4px; width: 12%;">DOB / Age</th>
              <th style="border: 1px solid #000; padding: 4px; width: 10%;">Share (%)</th>
              <th style="border: 1px solid #000; padding: 4px; width: 23%;">Guardian (if minor)</th>
            </tr>
          </thead>
          <tbody>
            ${nomineeRows}
          </tbody>
        </table>

        <div style="font-weight: bold; font-size: 12px; background: #f3f4f6; padding: 4px; margin-bottom: 6px; border: 1px solid #000;">
          PART B (EPS) — FAMILY PARTICULARS FOR EMPLOYEES' PENSION SCHEME
        </div>
        <p style="font-size: 11px; margin: 4px 0 10px 0;">I hereby furnish details of my family members entitled to receive Pension under EPS 1995:</p>

        <div style="display: flex; justify-content: space-between; margin-top: 36px; font-size: 11px;">
          <div>
            Place: Chennai<br>
            Date: ${new Date().toLocaleDateString('en-IN')}
          </div>
          <div style="text-align: right;">
            <b>[ Candidate Signature / Thumb Impression ]</b><br>
            Signature of Member
          </div>
        </div>

        <div style="margin-top: 20px; border-top: 1px solid #000; padding-top: 8px; font-size: 11px;">
          <b>CERTIFICATE BY EMPLOYER:</b> Certified that the above declaration and nomination has been signed before me by <b>${fullName}</b>.
          <div style="margin-top: 20px; text-align: right; font-weight: bold;">
            Signature of Manager or other Authorised Officer & Seal
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // 3. FORM F — PAYMENT OF GRATUITY NOMINATION
  // ==========================================================================
  private static renderFormF(
    emp: Partial<Employee>,
    nominations: StatutoryNominee[],
    org: string = 'Enterprise Organization'
  ): string {
    const empAny = emp as any;
    const fullName = empAny.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Murugan P';
    const gratuityNominees = nominations.filter((n) => n.nomination_type === 'GRATUITY');

    return `
      <div style="font-family: 'Times New Roman', Times, serif; color: #111827; padding: 24px; max-width: 800px; margin: 0 auto; line-height: 1.4; border: 1px solid #d1d5db; background: #fff;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
          <h2 style="margin: 0; font-size: 16px; font-weight: bold;">FORM 'F'</h2>
          <p style="margin: 2px 0; font-size: 12px;">[See sub-rule (1) of Rule 6 of Payment of Gratuity (Central) Rules, 1972]</p>
          <h3 style="margin: 4px 0 0 0; font-size: 14px; font-weight: bold;">NOMINATION FOR PAYMENT OF GRATUITY</h3>
        </div>

        <p style="font-size: 12px;">To,<br><b>The Management, ${org}</b></p>
        <p style="font-size: 12px; text-align: justify;">
          I, <b>${fullName}</b>, hereby nominate the person(s) mentioned below to receive the gratuity payable after my death in respect of my service in the establishment:
        </p>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="border: 1px solid #000; padding: 6px;">Name & Address of Nominee(s)</th>
              <th style="border: 1px solid #000; padding: 6px;">Relationship</th>
              <th style="border: 1px solid #000; padding: 6px;">Age</th>
              <th style="border: 1px solid #000; padding: 6px;">Proportion of Gratuity (%)</th>
            </tr>
          </thead>
          <tbody>
            ${gratuityNominees.map((g) => `
              <tr>
                <td style="border: 1px solid #000; padding: 6px;"><b>${g.nominee_name}</b><br><small>${g.address_line1 || 'Same as employee'}</small></td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${g.relationship}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${g.age} Years</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">${g.share_percentage}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="font-size: 11px; margin-top: 14px;">
          <b>STATEMENT:</b> 1. I have a family within the meaning of clause (h) of Section 2 of the Act.<br>
          2. The nomination made herein is in accordance with Section 6 of the Payment of Gratuity Act.
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 36px; font-size: 12px;">
          <div>
            <b>Witnesses:</b><br>
            1. ________________________<br>
            2. ________________________
          </div>
          <div style="text-align: right;">
            <b>[ Signature / Thumb Impression ]</b><br>
            Signature of Employee
          </div>
        </div>

        <div style="margin-top: 24px; border-top: 1px solid #000; padding-top: 10px; font-size: 11px;">
          <b>ACKNOWLEDGEMENT BY EMPLOYER:</b> Received and recorded the nomination in Form F submitted by <b>${fullName}</b>.
          <div style="margin-top: 24px; text-align: right; font-weight: bold;">
            Authorised Signatory on behalf of Employer
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // 4. FORM 1 — PAYMENT OF WAGES NOMINATION
  // ==========================================================================
  private static renderForm1(
    emp: Partial<Employee>,
    nominations: StatutoryNominee[],
    org: string = 'Enterprise Organization'
  ): string {
    const empAny = emp as any;
    const fullName = empAny.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Murugan P';
    const wageNominees = nominations.filter((n) => n.nomination_type === 'WAGES');

    return `
      <div style="font-family: 'Times New Roman', Times, serif; color: #111827; padding: 24px; max-width: 800px; margin: 0 auto; line-height: 1.4; border: 1px solid #d1d5db; background: #fff;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
          <h2 style="margin: 0; font-size: 16px; font-weight: bold;">FORM 1</h2>
          <p style="margin: 2px 0; font-size: 12px;">[See Rule 3 of Payment of Wages (Nomination) Rules]</p>
          <h3 style="margin: 4px 0 0 0; font-size: 14px; font-weight: bold;">NOMINATION OF BENEFICIARY FOR UNPAID WAGES</h3>
        </div>

        <p style="font-size: 12px;">
          I, <b>${fullName}</b>, employed in <b>${org}</b>, hereby nominate the person(s) below to receive any unpaid wages due to me in the event of my death:
        </p>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="border: 1px solid #000; padding: 6px;">Nominee Full Name & Address</th>
              <th style="border: 1px solid #000; padding: 6px;">Relationship</th>
              <th style="border: 1px solid #000; padding: 6px;">Age</th>
              <th style="border: 1px solid #000; padding: 6px;">Share Percentage (%)</th>
            </tr>
          </thead>
          <tbody>
            ${wageNominees.map((w) => `
              <tr>
                <td style="border: 1px solid #000; padding: 6px;"><b>${w.nominee_name}</b><br><small>${w.address_line1 || 'Chennai'}</small></td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${w.relationship}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${w.age} Years</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">${w.share_percentage}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 12px;">
          <div>
            Place: Chennai<br>
            Date: ${new Date().toLocaleDateString('en-IN')}
          </div>
          <div style="text-align: right;">
            <b>[ Signature of Employee ]</b>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // 5. FORM Q — APPOINTMENT ORDER
  // ==========================================================================
  private static renderFormQ(
    emp: Partial<Employee>,
    appt?: Partial<AppointmentOrderData> | null,
    org: string = 'Enterprise Organization'
  ): string {
    const empAny = emp as any;
    const fullName = empAny.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Murugan P';
    const orderNo = appt?.appointment_order_no || 'DMR-APPT-2026-001';
    const doj = appt?.date_of_joining || '2026-08-01';
    const desig = appt?.designation_title || 'Senior Security Officer';
    const basic = Number(appt?.basic_wage || 12500).toLocaleString('en-IN');
    const vda = Number(appt?.vda_allowance || 3200).toLocaleString('en-IN');
    const hra = Number(appt?.hra_allowance || 4500).toLocaleString('en-IN');
    const spl = Number(appt?.special_allowance || 2800).toLocaleString('en-IN');
    const gross = Number(appt?.gross_wage || 24000).toLocaleString('en-IN');

    return `
      <div style="font-family: 'Times New Roman', Times, serif; color: #111827; padding: 24px; max-width: 800px; margin: 0 auto; line-height: 1.4; border: 1px solid #d1d5db; background: #fff;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
          <h2 style="margin: 0; font-size: 16px; font-weight: bold;">FORM 'Q'</h2>
          <p style="margin: 2px 0; font-size: 12px;">[See sub-rule (1) of Rule 27-A of TN Industrial Establishments Rules]</p>
          <h3 style="margin: 4px 0 0 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">APPOINTMENT ORDER / SERVICE CONTRACT</h3>
          <p style="margin: 2px 0; font-size: 12px; font-weight: bold;">${org}</p>
        </div>

        <table style="width: 100%; font-size: 12px; margin-bottom: 14px;">
          <tr>
            <td><b>Order Reference:</b> ${orderNo}</td>
            <td style="text-align: right;"><b>Date of Issue:</b> ${new Date().toLocaleDateString('en-IN')}</td>
          </tr>
        </table>

        <p style="font-size: 12px;">To,<br><b>Mr. / Ms. ${fullName}</b><br>Chennai, Tamil Nadu</p>

        <p style="font-size: 12px; text-align: justify;">
          We are pleased to appoint you in our establishment under the following approved commercial and statutory wage terms:
        </p>

        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
          <tr>
            <td style="border: 1px solid #000; padding: 6px; width: 45%; font-weight: bold;">1. Designation</td>
            <td style="border: 1px solid #000; padding: 6px;">${desig}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">2. Date of Joining (DOJ)</td>
            <td style="border: 1px solid #000; padding: 6px;">${doj}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">3. Basic Wage Rate</td>
            <td style="border: 1px solid #000; padding: 6px;">₹${basic} / Month</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">4. Variable Dearness Allowance (VDA)</td>
            <td style="border: 1px solid #000; padding: 6px;">₹${vda} / Month</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">5. House Rent Allowance (HRA)</td>
            <td style="border: 1px solid #000; padding: 6px;">₹${hra} / Month</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">6. Special / Other Allowances</td>
            <td style="border: 1px solid #000; padding: 6px;">₹${spl} / Month</td>
          </tr>
          <tr style="background: #f3f4f6;">
            <td style="border: 1px solid #000; padding: 6px; font-weight: bold; font-size: 13px;">TOTAL MONTHLY GROSS WAGE</td>
            <td style="border: 1px solid #000; padding: 6px; font-weight: bold; font-size: 13px; color: #047857;">₹${gross}</td>
          </tr>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 12px;">
          <div>
            <b>EMPLOYEE ACKNOWLEDGEMENT:</b><br>
            I accept the terms and conditions.<br><br>
            Signature of Employee: _______________
          </div>
          <div style="text-align: right;">
            <b>FOR ${org.toUpperCase()}</b><br><br><br>
            <b>Authorised Representative & Seal</b>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // 6. EMPLOYEE RESUME / MASTER BIO-DATA RECORD
  // ==========================================================================
  private static renderResume(
    emp: Partial<Employee>,
    pf?: Partial<PfDeclarationData> | null,
    nominations: StatutoryNominee[] = [],
    appt?: Partial<AppointmentOrderData> | null,
    org: string = 'Enterprise Organization'
  ): string {
    const empAny = emp as any;
    const fullName = empAny.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Murugan P';
    const dob = empAny.date_of_birth || empAny.dob || '1988-04-12';
    const gender = empAny.gender || 'Male';
    const bloodGroup = empAny.blood_group || 'O+';
    const doj = appt?.date_of_joining || '2026-08-01';
    const desig = appt?.designation_title || 'Senior Security Officer';

    return `
      <div style="font-family: Arial, sans-serif; color: #111827; padding: 24px; max-width: 800px; margin: 0 auto; line-height: 1.4; border: 1px solid #d1d5db; background: #fff;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #07563d; padding-bottom: 12px; margin-bottom: 16px;">
          <div>
            <h2 style="margin: 0; font-size: 18px; color: #07563d; font-weight: bold;">${org}</h2>
            <p style="margin: 2px 0; font-size: 13px; font-weight: bold; color: #4b5563;">MASTER EMPLOYEE PROFILE & BIO-DATA DOSSIER</p>
          </div>
          <div style="width: 80px; height: 95px; border: 1px dashed #9ca3af; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #6b7280; text-align: center;">
            AFFIX PHOTO
          </div>
        </div>

        <table style="width: 100%; font-size: 12px; border-collapse: collapse; margin-bottom: 16px;">
          <tr style="background: #f9fafb;">
            <td style="padding: 6px; border: 1px solid #e5e7eb; width: 25%; font-weight: bold;">Employee Name</td>
            <td style="padding: 6px; border: 1px solid #e5e7eb; width: 25%; font-weight: bold; color: #111827;">${fullName}</td>
            <td style="padding: 6px; border: 1px solid #e5e7eb; width: 25%; font-weight: bold;">Designation</td>
            <td style="padding: 6px; border: 1px solid #e5e7eb; width: 25%;">${desig}</td>
          </tr>
          <tr>
            <td style="padding: 6px; border: 1px solid #e5e7eb; font-weight: bold;">Date of Birth</td>
            <td style="padding: 6px; border: 1px solid #e5e7eb;">${dob}</td>
            <td style="padding: 6px; border: 1px solid #e5e7eb; font-weight: bold;">Date of Joining</td>
            <td style="padding: 6px; border: 1px solid #e5e7eb;">${doj}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 6px; border: 1px solid #e5e7eb; font-weight: bold;">Gender & Blood Group</td>
            <td style="padding: 6px; border: 1px solid #e5e7eb;">${gender} / ${bloodGroup}</td>
            <td style="padding: 6px; border: 1px solid #e5e7eb; font-weight: bold;">EPFO UAN</td>
            <td style="padding: 6px; border: 1px solid #e5e7eb; font-weight: bold;">${pf?.previous_uan || 'Pending'}</td>
          </tr>
          <tr>
            <td style="padding: 6px; border: 1px solid #e5e7eb; font-weight: bold;">PAN & Aadhaar</td>
            <td style="padding: 6px; border: 1px solid #e5e7eb;">${pf?.pan_number || 'ABCDE1234F'} | ${pf?.aadhaar_number || 'XXXX-8921'}</td>
            <td style="padding: 6px; border: 1px solid #e5e7eb; font-weight: bold;">Bank Account</td>
            <td style="padding: 6px; border: 1px solid #e5e7eb;">${pf?.bank_account_no || '918273645019'} (${pf?.bank_ifsc || 'SBIN0001234'})</td>
          </tr>
        </table>

        <div style="font-size: 13px; font-weight: bold; color: #07563d; margin-bottom: 6px; border-bottom: 1px solid #07563d;">
          STATUTORY NOMINATIONS SUMMARY
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="border: 1px solid #e5e7eb; padding: 6px;">Nomination Scheme</th>
              <th style="border: 1px solid #e5e7eb; padding: 6px;">Nominee Name</th>
              <th style="border: 1px solid #e5e7eb; padding: 6px;">Relationship</th>
              <th style="border: 1px solid #e5e7eb; padding: 6px;">Share</th>
            </tr>
          </thead>
          <tbody>
            ${nominations.map((n) => `
              <tr>
                <td style="border: 1px solid #e5e7eb; padding: 6px; font-weight: bold;">${n.nomination_type}</td>
                <td style="border: 1px solid #e5e7eb; padding: 6px;">${n.nominee_name}</td>
                <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: center;">${n.relationship}</td>
                <td style="border: 1px solid #e5e7eb; padding: 6px; text-align: center; font-weight: bold;">${n.share_percentage}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 36px; font-size: 12px;">
          <div>
            <b>Employee Signature:</b> ____________________
          </div>
          <div style="text-align: right;">
            <b>HR Verification Signatory:</b> ____________________
          </div>
        </div>
      </div>
    `;
  }
}
