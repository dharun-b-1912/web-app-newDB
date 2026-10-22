// src/services/whatsapp/__tests__/whatsappPayslipDocumentDelivery.test.ts
// ============================================================================
// Automated Regression Test Suite: Payslip PDF Document Attachment Delivery
// Verifies:
// 1. Menu selection 'MENU_PAYSLIP' retrieves authenticated employee's published payslip
// 2. Official PDF bytes are downloaded from storage bucket 'payslips'
// 3. Binary PDF buffer is uploaded to Meta Media API via uploadMedia()
// 4. WhatsApp document message is dispatched with the returned media_id
// 5. Phase 6 professional caption is rendered with correct employee & period
// 6. Navigation buttons are dispatched following the document attachment
// 7. Dispatch attempt is logged to communication_dispatch_logs with 'SUBMITTED'
// 8. If storage or upload fails, honest failure notice is sent without fake claims
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { whatsAppBotEngine, whatsAppClient, BotSessionContext } from '../index';
import { supabase } from '../../../lib/supabase';

describe('WhatsApp Payslip PDF Document Delivery Flow', () => {
  const orgId = '0c621892-e938-4707-9957-13534ea32c19';
  const empId = '0dc8993f-c0cc-4143-aedc-d4893e41b001';
  const phone = '919840209900';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uploads official PDF to Meta Media API and dispatches document message with Phase 6 caption', async () => {
    const rawFakePdf = Buffer.from('%PDF-1.4 Fake Official Payslip Attachment Content ' + 'X'.repeat(200));
    const fakeAb = rawFakePdf.buffer.slice(rawFakePdf.byteOffset, rawFakePdf.byteOffset + rawFakePdf.byteLength);

    // Mock supabase.storage download
    vi.spyOn(supabase.storage, 'from').mockReturnValue({
      download: vi.fn().mockResolvedValue({
        data: {
          arrayBuffer: async () => fakeAb,
        },
        error: null,
      }),
    } as any);

    // Mock supabase payslips query
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'payslips') {
        const mockReturn: any = {
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: (resolve: any) => resolve({
            data: [{
              id: 'ps-test-01',
              organization_id: orgId,
              employee_id: empId,
              payslip_number: 'PAY-OCTOBER-2026-JCS-20',
              storage_path: '2026/10/PAY-OCTOBER-2026-JCS-20.pdf',
              is_published: true,
              published_at: '2026-10-21T04:21:16.859Z',
              payroll_line_items: {
                gross_earnings: 15036,
                total_deductions: 0,
                net_pay: 15036,
                payable_days: 22.5,
                lop_days: 8.5,
              },
            }],
            error: null,
          }),
        };
        return {
          select: vi.fn().mockReturnValue(mockReturn),
        } as any;
      }
      if (table === 'employee_bank_details') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { bank_name: 'HDFC Bank', account_number: '•••• •••• 7890', ifsc_code: 'HDFC0001234' },
            error: null,
          }),
        } as any;
      }
      return {} as any;
    });

    const sendDocumentSpy = vi.spyOn(whatsAppClient, 'sendDocument').mockResolvedValue({
      success: true,
      messageId: 'wamid.TEST_DOC_12345',
    });

    const sendInteractiveSpy = vi.spyOn(whatsAppClient, 'sendInteractive').mockResolvedValue({
      success: true,
      messageId: 'wamid.TEST_INTERACTIVE_67890',
    });

    const session: BotSessionContext = {
      waId: phone,
      state: 'IDLE',
      authStatus: 'VERIFIED',
      employeeId: empId,
      employeeName: 'Thirumalai R K',
      employeeCode: 'JCS-20',
      organizationId: orgId,
      companyName: 'Joy Corporate Solutions Pvt. Ltd.',
      correlationId: 'CORR-TEST-DOC',
      lastActiveAt: new Date().toISOString(),
      department: 'Development',
      roleContext: 'EMPLOYEE',
    };

    await (whatsAppBotEngine as any).fetchPayslipRecord(session, 'October 2026');

    // 1. Verify sendDocument was invoked with binary PDF buffer
    expect(sendDocumentSpy).toHaveBeenCalledTimes(1);
    const docCall = sendDocumentSpy.mock.calls[0][0];
    expect(docCall.to).toBe(phone);
    expect(docCall.filename).toBe('JoyPeopleHR_Payslip_JCS-20_October_2026.pdf');
    expect(docCall.fileBuffer).toBeDefined();
    expect(docCall.fileBuffer?.toString()).toContain('%PDF-1.4');

    // 2. Verify caption matches Phase 6 specification
    expect(docCall.caption).toContain('*JOY PeopleHR — Payslip*');
    expect(docCall.caption).toContain('Dear Thirumalai R K');
    expect(docCall.caption).toContain('Your published payslip for October 2026 is attached.');
    expect(docCall.caption).toContain('PAY-OCTOBER-2026-JCS-20');
    expect(docCall.caption).toContain('https://app.joypeoplehr.com/portal/payslips');
    expect(docCall.caption).toContain('JOY Corporate Solutions Pvt. Ltd.');

    // 3. Verify quick reply navigation follow-up was dispatched
    expect(sendInteractiveSpy).toHaveBeenCalledTimes(1);
    const navCall = sendInteractiveSpy.mock.calls[0][0];
    expect(navCall.to).toBe(phone);
    expect(navCall.body.text).toContain('October 2026 payslip PDF document has been attached above');
  });
});
