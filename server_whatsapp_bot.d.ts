// Type declarations for server_whatsapp_bot.js

export interface MisReportRecipientAccess {
  authorized: boolean;
  recipient: any;
  allowBotSelfService: boolean;
  permittedReportTypes: string[];
  scope?: string;
  departmentId?: string | null;
  reason?: string;
}

export function checkMisReportAccess(phone: string, orgId?: string): Promise<MisReportRecipientAccess>;
export function normalizePhone(phone: string): string;
export function getTenDigit(phone: string): string;
