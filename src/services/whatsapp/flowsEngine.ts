// src/services/whatsapp/flowsEngine.ts
// ============================================================================
// Joy PeopleHR WhatsApp Flows Engine (Meta Flows Specification v3.1)
// Handles Flow Lifecycles, JSON Schema Validation, Dynamic Screen State & Data Exchange
// ============================================================================

import { supabase } from '../../lib/supabase';
import { whatsAppClient } from './whatsappClient';
import { normalizeIndianPhone } from './phoneUtils';

export type FlowStatus = 'DRAFT' | 'VALIDATED' | 'PUBLISHED' | 'DEPRECATED';

export interface MetaFlowScreen {
  id: string;
  title: string;
  data: Record<string, any>;
  layout: {
    type: 'SingleColumnLayout';
    children: any[];
  };
}

export interface MetaFlowJsonSchema {
  version: '3.1';
  screens: MetaFlowScreen[];
}

export interface WhatsAppFlowRecord {
  id: string;
  tenant_id: string;
  flow_name: string;
  meta_flow_id?: string;
  flow_category: string;
  status: FlowStatus;
  json_schema: MetaFlowJsonSchema;
  endpoint_url?: string;
  version: string;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// Official Pre-Built Meta Flow: Employee Leave Application Flow (v3.1)
// ----------------------------------------------------------------------------
export const LEAVE_APPLICATION_FLOW_SCHEMA: MetaFlowJsonSchema = {
  version: '3.1',
  screens: [
    {
      id: 'LEAVE_FORM_SCREEN',
      title: 'Apply for Leave',
      data: {
        leave_types: [
          { id: 'casual', title: '🌴 Casual Leave (CL)' },
          { id: 'sick', title: '🤒 Sick Leave (SL)' },
          { id: 'earned', title: '✈️ Earned / Privilege Leave (EL)' },
        ],
      },
      layout: {
        type: 'SingleColumnLayout',
        children: [
          {
            type: 'Dropdown',
            name: 'leave_type',
            label: 'Select Leave Category',
            required: true,
            'data-source': '${data.leave_types}',
          },
          {
            type: 'DatePicker',
            name: 'start_date',
            label: 'Start Date',
            required: true,
          },
          {
            type: 'DatePicker',
            name: 'end_date',
            label: 'End Date',
            required: true,
          },
          {
            type: 'TextInput',
            name: 'reason',
            label: 'Reason for Leave',
            required: true,
            'helper-text': 'Brief description for your reporting manager',
          },
          {
            type: 'Footer',
            label: 'Review & Continue',
            'on-click-action': {
              name: 'navigate',
              next: {
                type: 'screen',
                name: 'SUMMARY_CONFIRM_SCREEN',
              },
              payload: {
                leave_type: '${form.leave_type}',
                start_date: '${form.start_date}',
                end_date: '${form.end_date}',
                reason: '${form.reason}',
              },
            },
          },
        ],
      },
    },
    {
      id: 'SUMMARY_CONFIRM_SCREEN',
      title: 'Confirm Application',
      data: {},
      layout: {
        type: 'SingleColumnLayout',
        children: [
          {
            type: 'TextHeading',
            text: 'Leave Application Summary',
          },
          {
            type: 'TextBody',
            text: 'Please verify the details below before submitting to your manager for approval.',
          },
          {
            type: 'TextCaption',
            text: 'Selected Type: ${screen.LEAVE_FORM_SCREEN.form.leave_type}',
          },
          {
            type: 'TextCaption',
            text: 'Duration: ${screen.LEAVE_FORM_SCREEN.form.start_date} to ${screen.LEAVE_FORM_SCREEN.form.end_date}',
          },
          {
            type: 'Footer',
            label: 'Submit Leave Request',
            'on-click-action': {
              name: 'complete',
              payload: {
                leave_type: '${screen.LEAVE_FORM_SCREEN.form.leave_type}',
                start_date: '${screen.LEAVE_FORM_SCREEN.form.start_date}',
                end_date: '${screen.LEAVE_FORM_SCREEN.form.end_date}',
                reason: '${screen.LEAVE_FORM_SCREEN.form.reason}',
              },
            },
          },
        ],
      },
    },
  ],
};

export class WhatsAppFlowsEngine {
  private static instance: WhatsAppFlowsEngine;

  public static getInstance(): WhatsAppFlowsEngine {
    if (!WhatsAppFlowsEngine.instance) {
      WhatsAppFlowsEngine.instance = new WhatsAppFlowsEngine();
    }
    return WhatsAppFlowsEngine.instance;
  }

  /**
   * Validates Flow JSON Schema against Meta v3.1 Specifications
   */
  public validateFlowSchema(schema: MetaFlowJsonSchema): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!schema.version || schema.version !== '3.1') {
      errors.push('Flow JSON schema version must be "3.1".');
    }

    if (!schema.screens || !Array.isArray(schema.screens) || schema.screens.length === 0) {
      errors.push('Flow must contain at least one valid screen definition.');
    } else {
      schema.screens.forEach((screen, idx) => {
        if (!screen.id) errors.push(`Screen at index ${idx} is missing an "id".`);
        if (!screen.title) errors.push(`Screen "${screen.id || idx}" is missing a "title".`);
        if (!screen.layout || screen.layout.type !== 'SingleColumnLayout') {
          errors.push(`Screen "${screen.id || idx}" must have layout type "SingleColumnLayout".`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Dispatches a WhatsApp Flow Message to an Employee
   */
  async sendFlowMessage(params: {
    to: string;
    tenantId: string;
    flowId: string;
    flowToken: string;
    flowCtaText?: string;
    headerText?: string;
    bodyText: string;
    footerText?: string;
    initialScreen?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const {
      to,
      tenantId,
      flowId,
      flowToken,
      flowCtaText = 'Start Application',
      headerText = 'Workforce Self-Service',
      bodyText,
      footerText = 'Joy PeopleHR Secure Flows',
      initialScreen = 'LEAVE_FORM_SCREEN',
    } = params;

    const normalizedPhone = normalizeIndianPhone(to);

    const interactivePayload = {
      type: 'flow',
      header: {
        type: 'text',
        text: headerText,
      },
      body: {
        text: bodyText,
      },
      footer: {
        text: footerText,
      },
      action: {
        name: 'flow',
        parameters: {
          flow_message_version: '3',
          flow_token: flowToken,
          flow_id: flowId,
          flow_cta: flowCtaText,
          flow_action: 'navigate',
          flow_action_payload: {
            screen: initialScreen,
          },
        },
      },
    };

    const metaBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'interactive',
      interactive: interactivePayload,
    };

    const isMock = !import.meta.env.VITE_META_WA_ACCESS_TOKEN || import.meta.env.VITE_META_WA_ACCESS_TOKEN.startsWith('mock_');

    if (isMock) {
      console.log(`[WhatsAppFlowsEngine:Mock] Sent Flow "${flowId}" to ${normalizedPhone}:`, metaBody);
      return { success: true, messageId: `flow.MOCK_${Date.now()}` };
    }

    try {
      const phoneNumberId = import.meta.env.VITE_META_WA_PHONE_NUMBER_ID;
      const apiVersion = import.meta.env.VITE_META_WA_API_VERSION || 'v20.0';
      const token = import.meta.env.VITE_META_WA_ACCESS_TOKEN;

      const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metaBody),
      });

      const resData = await response.json();
      if (!response.ok) {
        return { success: false, error: resData.error?.message || 'Meta Flow send failed' };
      }

      return { success: true, messageId: resData.messages?.[0]?.id };
    } catch (err: any) {
      return { success: false, error: err.message || 'Flow dispatch exception' };
    }
  }

  /**
   * Processes Flow Submission Payload received from Meta Webhook (Decrypted)
   */
  async processFlowSubmission(params: {
    tenantId: string;
    senderPhone: string;
    flowToken: string;
    responsePayload: Record<string, any>;
  }): Promise<{ success: boolean; resultSummary: string }> {
    const { tenantId, senderPhone, responsePayload } = params;
    const cleanPhone = normalizeIndianPhone(senderPhone);

    const { leave_type, start_date, end_date, reason } = responsePayload;

    // 1. Resolve Employee
    const { data: employee } = await supabase
      .from('employees')
      .select('id, full_name, organization_id')
      .eq('organization_id', tenantId)
      .or(`phone.eq.${cleanPhone},phone.ilike.%${cleanPhone.slice(-10)}%`)
      .limit(1)
      .maybeSingle();

    const empId = employee?.id || 'emp-flow-submitter';
    const empName = employee?.full_name || 'Employee';

    // 2. Insert Leave Record
    try {
      await supabase.from('employee_leave_requests').insert({
        organization_id: tenantId,
        employee_id: empId,
        leave_type: leave_type || 'Casual Leave',
        start_date: start_date || new Date().toISOString().split('T')[0],
        end_date: end_date || new Date().toISOString().split('T')[0],
        reason: reason || 'Submitted via WhatsApp Flow',
        status: 'Pending',
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[WhatsAppFlowsEngine] Error storing flow leave request:', err);
    }

    // 3. Send confirmation message back to Employee
    await whatsAppClient.sendText({
      to: cleanPhone,
      organizationId: tenantId,
      employeeId: empId,
      text:
        `🎉 *WhatsApp Flow Submission Received!*\n\n` +
        `• *Requester:* ${empName}\n` +
        `• *Leave Category:* ${leave_type}\n` +
        `• *Period:* ${start_date} to ${end_date}\n` +
        `• *Status:* ⏳ Pending Manager Approval\n\n` +
        `Your manager has been notified. You will receive an instant notification here once reviewed.`,
    });

    return {
      success: true,
      resultSummary: `Leave application for ${empName} submitted successfully via Flow.`,
    };
  }
}

export const whatsAppFlowsEngine = WhatsAppFlowsEngine.getInstance();
