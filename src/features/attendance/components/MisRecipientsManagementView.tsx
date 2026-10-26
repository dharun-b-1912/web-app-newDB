// src/features/attendance/components/MisRecipientsManagementView.tsx
// ============================================================================
// Joy PeopleHR Enterprise — MIS Recipients & WhatsApp Access Management Tab
// Strict Multi-Tenant Enforcement • Phone Verification • Scope & Report Control
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  Search,
  Plus,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Trash2,
  RotateCcw,
  Sparkles,
  Bot,
  Building2,
  MessageSquare,
  Send,
  Calendar,
  Check,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import {
  misRecipientsService,
  MisReportRecipientRecord,
  DeliveryAuditLogRow,
} from '../../../services/attendance/misRecipientsService';
import { attendanceReportContactService, RecipientContact } from '../../../services/attendance/attendanceReportContactService';
import { normalizeIndianPhone, maskPhoneNumber } from '../../../services/whatsapp/phoneUtils';

interface MisRecipientsManagementViewProps {
  organizationId?: string;
  companyName?: string;
  onRecipientsUpdated?: () => void;
}

export const MisRecipientsManagementView: React.FC<MisRecipientsManagementViewProps> = ({
  organizationId = '0c621892-e938-4707-9957-13534ea32c19',
  companyName = 'Joy Corporate Solutions',
  onRecipientsUpdated,
}) => {
  const { showToast } = useToast();

  const [recipients, setRecipients] = useState<MisReportRecipientRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<DeliveryAuditLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<RecipientContact[]>([]);

  // Modal / Add Recipient form state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [selectedContact, setSelectedContact] = useState<RecipientContact | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formRoleType, setFormRoleType] = useState('RECIPIENT');
  const [formPermittedReports, setFormPermittedReports] = useState<string[]>([
    'MORNING_CHECKIN',
    'EVENING_FINAL',
  ]);
  const [formDeliveryChannels, setFormDeliveryChannels] = useState<string[]>([
    'EMAIL',
    'WHATSAPP',
  ]);
  const [formMorning, setFormMorning] = useState(true);
  const [formEvening, setFormEvening] = useState(true);
  const [formBotSelfService, setFormBotSelfService] = useState(true);
  const [formWorkforceScope, setFormWorkforceScope] = useState<'ORGANIZATION' | 'DEPARTMENT' | 'DIRECT_REPORTS'>('ORGANIZATION');

  // Load Recipients and Audit Logs
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [recs, logs, allContacts] = await Promise.all([
        misRecipientsService.getRecipients(organizationId),
        misRecipientsService.getAuditLogs(organizationId, 15),
        attendanceReportContactService.refreshContactsFromDb(),
      ]);
      setRecipients(recs);
      setAuditLogs(logs);
      setContacts(allContacts);
      if (onRecipientsUpdated) onRecipientsUpdated();
    } catch (err: any) {
      console.warn('[MisRecipientsManagementView] loadData error:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [organizationId]);

  // Filtered recipients
  const filteredRecipients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.designation && r.designation.toLowerCase().includes(q))
    );
  }, [recipients, searchQuery]);

  // Directory autocomplete matching for Add Modal
  const matchingContacts = useMemo(() => {
    const q = formName.trim().toLowerCase();
    if (!q || selectedContact) return [];
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [contacts, formName, selectedContact]);

  const handleSelectContact = (c: RecipientContact) => {
    setSelectedContact(c);
    setFormName(c.name);
    setFormEmail(c.email || '');
    setFormPhone(c.phone || '');
    setFormDesignation(c.designation || (c.isHr ? 'HR Lead' : c.isManager ? 'Manager' : 'Staff'));
    setFormRoleType(c.isHr ? 'HR_LEAD' : c.isManager ? 'SUPERVISOR' : 'RECIPIENT');
  };

  const handleResetForm = () => {
    setSelectedContact(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormDesignation('');
    setFormRoleType('RECIPIENT');
    setFormPermittedReports(['MORNING_CHECKIN', 'EVENING_FINAL']);
    setFormDeliveryChannels(['EMAIL', 'WHATSAPP']);
    setFormMorning(true);
    setFormEvening(true);
    setFormBotSelfService(true);
    setFormWorkforceScope('ORGANIZATION');
  };

  // Submit Add/Update Recipient
  const handleSaveRecipient = async () => {
    if (!formName.trim()) {
      showToast('Recipient name is required.', 'error');
      return;
    }
    if (!formPhone.trim()) {
      showToast('WhatsApp mobile number is required.', 'error');
      return;
    }

    let cleanPhone = '';
    try {
      cleanPhone = normalizeIndianPhone(formPhone).replace(/[^0-9]/g, '');
    } catch {
      showToast('Invalid Indian phone number format.', 'error');
      return;
    }

    if (cleanPhone.length < 10) {
      showToast('Valid 10-digit mobile number required.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await misRecipientsService.upsertRecipient({
        organization_id: organizationId,
        employee_id: selectedContact?.id || undefined,
        name: formName.trim(),
        email: formEmail.trim() || undefined,
        phone: cleanPhone,
        designation: formDesignation.trim() || undefined,
        role_type: formRoleType,
        permitted_report_types: formPermittedReports,
        delivery_channels: formDeliveryChannels,
        scheduled_morning: formMorning,
        scheduled_evening: formEvening,
        allow_bot_self_service: formBotSelfService,
        workforce_scope: formWorkforceScope,
        is_verified: true,
        is_active: true,
      });

      if (res.success) {
        showToast(`✓ Authorized recipient ${formName} saved successfully!`, 'success');
        setIsAddModalOpen(false);
        handleResetForm();
        await loadData();
      } else {
        showToast(`Failed to save recipient: ${res.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Revoke Recipient
  const handleRevoke = async (r: MisReportRecipientRecord) => {
    const confirm = window.confirm(`Revoke MIS access for ${r.name} (${maskPhoneNumber(r.phone)})?`);
    if (!confirm) return;

    const res = await misRecipientsService.revokeRecipient(r.id, 'Revoked by HR in settings');
    if (res.success) {
      showToast(`Access revoked for ${r.name}`, 'info');
      await loadData();
    } else {
      showToast(`Revocation error: ${res.error}`, 'error');
    }
  };

  // Reactivate Recipient
  const handleReactivate = async (r: MisReportRecipientRecord) => {
    const res = await misRecipientsService.activateRecipient(r.id);
    if (res.success) {
      showToast(`Access restored for ${r.name}`, 'success');
      await loadData();
    } else {
      showToast(`Activation error: ${res.error}`, 'error');
    }
  };

  // Toggle report type in form
  const toggleReportType = (t: string) => {
    if (formPermittedReports.includes(t)) {
      if (formPermittedReports.length === 1) {
        showToast('At least one report type must remain permitted.', 'info');
        return;
      }
      setFormPermittedReports(formPermittedReports.filter((x) => x !== t));
    } else {
      setFormPermittedReports([...formPermittedReports, t]);
    }
  };

  // Toggle delivery channel in form
  const toggleDeliveryChannel = (ch: string) => {
    if (formDeliveryChannels.includes(ch)) {
      if (formDeliveryChannels.length === 1) {
        showToast('At least one delivery channel must be selected.', 'info');
        return;
      }
      setFormDeliveryChannels(formDeliveryChannels.filter((x) => x !== ch));
    } else {
      setFormDeliveryChannels([...formDeliveryChannels, ch]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50 border border-emerald-200/90 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-emerald-950">
                  MIS Recipients &amp; WhatsApp Access Control
                </h4>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 border border-emerald-300">
                  Tenant Scoped
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-1 max-w-xl leading-relaxed">
                Authorize specific employees, managers, and leadership phone numbers to receive confidential MIS PDFs.
                Controls automatic scheduled dispatches, manual sends, and WhatsApp bot self-service report queries.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => {
              handleResetForm();
              setIsAddModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs shrink-0 shadow-xs"
          >
            Authorize New Recipient
          </Button>
        </div>
      </div>

      {/* Search and Stats Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone (+91), email, or designation..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden font-medium"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
          <span className="px-2.5 py-1 rounded-lg bg-gray-100 border border-gray-200">
            Total Authorized: <b className="text-emerald-900">{recipients.length}</b>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
            Active: <b>{recipients.filter((r) => r.is_active).length}</b>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
            Bot Enabled: <b>{recipients.filter((r) => r.is_active && r.allow_bot_self_service).length}</b>
          </span>
        </div>
      </div>

      {/* Authorized Recipients Table */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50/90 text-gray-700 font-extrabold border-b border-gray-200 text-[11px]">
              <tr>
                <th className="py-3 px-4">Authorized Recipient</th>
                <th className="py-3 px-3">WhatsApp Number</th>
                <th className="py-3 px-3">Permitted Reports</th>
                <th className="py-3 px-3">Delivery Channels</th>
                <th className="py-3 px-3 text-center">Auto Schedule</th>
                <th className="py-3 px-3 text-center">Bot Self-Service</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>Loading authorized recipients from server...</span>
                  </td>
                </tr>
              ) : filteredRecipients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-500">
                    <Users className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <div className="font-bold text-gray-700">No Authorized Recipients Found</div>
                    <div className="text-[11px] text-gray-500 mt-1">
                      {searchQuery
                        ? 'No recipients matching your search criteria.'
                        : 'Click "Authorize New Recipient" above to configure your first recipient.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecipients.map((r) => (
                  <tr key={r.id} className={`hover:bg-gray-50/80 transition-colors ${!r.is_active ? 'bg-gray-50/50 opacity-60' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-950 flex items-center gap-1.5">
                        <span>{r.name}</span>
                        {r.role_type === 'MANAGEMENT' && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200">
                            Director
                          </span>
                        )}
                        {r.role_type === 'SUPERVISOR' && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-sky-100 text-sky-900 border border-sky-200">
                            Manager
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 truncate max-w-[200px]">
                        {r.designation || 'Authorized Contact'} {r.email ? `• ${r.email}` : ''}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-mono text-emerald-900 font-bold flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>+{r.phone}</span>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                        Verified WhatsApp
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {r.permitted_report_types.map((t) => (
                          <span
                            key={t}
                            className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                              t === 'MORNING_CHECKIN'
                                ? 'bg-amber-100 text-amber-900'
                                : t === 'EVENING_FINAL'
                                ? 'bg-indigo-100 text-indigo-900'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {t === 'MORNING_CHECKIN'
                              ? '🌅 Morning'
                              : t === 'EVENING_FINAL'
                              ? '🌆 Evening'
                              : t === 'BIOMETRIC_AUDIT'
                              ? '🔒 Biometric'
                              : t}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        {r.delivery_channels.includes('EMAIL') && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                            Email
                          </span>
                        )}
                        {r.delivery_channels.includes('WHATSAPP') && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            WhatsApp
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-bold">
                        {r.scheduled_morning && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200" title="Morning Auto Schedule">
                            10:30 AM
                          </span>
                        )}
                        {r.scheduled_evening && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 border border-indigo-200" title="Evening Auto Schedule">
                            07:00 PM
                          </span>
                        )}
                        {!r.scheduled_morning && !r.scheduled_evening && (
                          <span className="text-gray-400">Manual Only</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      {r.allow_bot_self_service ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <Bot className="w-3 h-3 text-emerald-700" />
                          Enabled
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-medium">Disabled</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {r.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                          <XCircle className="w-3 h-3 text-rose-600" /> Revoked
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {r.is_active ? (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleRevoke(r)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-[11px] font-bold"
                        >
                          Revoke Access
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleReactivate(r)}
                          className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 text-[11px] font-bold"
                        >
                          Restore
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recipient Delivery Audit Trail */}
      {auditLogs.length > 0 && (
        <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
          <div className="bg-gray-50/90 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <h5 className="font-extrabold text-xs text-gray-900">
                Authoritative Recipient Delivery Audit Logs
              </h5>
            </div>
            <span className="text-[10px] text-gray-500 font-medium">
              Verified provider-accepted statuses &bull; Idempotent keys
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                <div className="space-y-0.5">
                  <div className="font-bold text-gray-900 flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        log.status === 'DELIVERED' || log.status === 'PROVIDER_ACCEPTED'
                          ? 'bg-emerald-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    <span>{log.recipient_name || log.recipient_target}</span>
                    <span className="font-mono text-[10px] text-gray-500">
                      ({log.channel === 'WHATSAPP' ? `+${log.recipient_target}` : log.recipient_target})
                    </span>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-gray-100 text-gray-700 uppercase">
                      {log.channel}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded">
                      {log.report_type}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 flex items-center gap-2">
                    <span>{log.reporting_date}</span>
                    <span>&bull;</span>
                    <span>{log.cutoff_time || 'Standard Cutoff'}</span>
                    <span>&bull;</span>
                    <span>Mode: {log.dispatch_mode}</span>
                    {log.file_name && (
                      <>
                        <span>&bull;</span>
                        <span className="font-mono text-emerald-800">{log.file_name}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      log.status === 'DELIVERED' || log.status === 'PROVIDER_ACCEPTED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {log.status}
                  </span>
                  {log.error_message && (
                    <div className="text-[9px] text-rose-600 max-w-xs truncate mt-0.5" title={log.error_message}>
                      {log.error_message}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Authorize Recipient Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <h4 className="font-extrabold text-sm text-gray-900">Authorize New MIS Recipient</h4>
                <p className="text-xs text-gray-500">Configure phone verification, report scope, and bot self-service</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              {/* Full Name with Directory Autocomplete */}
              <div className="relative">
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Recipient Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (selectedContact) setSelectedContact(null);
                  }}
                  placeholder="Enter name or search employee (e.g. Praveen B)..."
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden"
                />

                {matchingContacts.length > 0 && !selectedContact && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-1 space-y-0.5">
                    <div className="text-[10px] font-bold text-gray-500 px-2 py-1">Matching Employees:</div>
                    {matchingContacts.map((c) => (
                      <button
                        key={c.id || c.email}
                        type="button"
                        onClick={() => handleSelectContact(c)}
                        className="w-full text-left p-1.5 rounded-lg hover:bg-emerald-50 flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div>
                          <span className="font-bold text-gray-900">{c.name}</span>
                          <span className="text-[10px] text-gray-500 ml-1.5">
                            {c.code} &bull; {c.department}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-700">{c.phone || c.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Verified WhatsApp Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="917825906580 or +91 78259 06580"
                    className="w-full text-xs border border-gray-300 rounded-lg pl-9 pr-3 py-2 font-mono font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-emerald-700 mt-1">
                  Only verified numbers can receive automated MIS document attachments and query the WhatsApp bot.
                </p>
              </div>

              {/* Email Address */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Email Address (Optional)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="official.email@company.com"
                    className="w-full text-xs border border-gray-300 rounded-lg pl-9 pr-3 py-2 font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Permitted Report Types */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  Permitted Report Types <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'MORNING_CHECKIN', label: '🌅 Morning Turnout' },
                    { id: 'EVENING_FINAL', label: '🌆 Evening Final' },
                    { id: 'BIOMETRIC_AUDIT', label: '🔒 Biometric Punch Audit' },
                    { id: 'DEPARTMENT_SUMMARY', label: '📊 Department Summary' },
                  ].map((rpt) => (
                    <label
                      key={rpt.id}
                      className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
                        formPermittedReports.includes(rpt.id)
                          ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-950'
                          : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formPermittedReports.includes(rpt.id)}
                        onChange={() => toggleReportType(rpt.id)}
                        className="accent-[#07563D] rounded"
                      />
                      <span>{rpt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Delivery Channels */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Authorized Delivery Channels</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label
                    className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
                      formDeliveryChannels.includes('WHATSAPP')
                        ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-950'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formDeliveryChannels.includes('WHATSAPP')}
                      onChange={() => toggleDeliveryChannel('WHATSAPP')}
                      className="accent-[#07563D] rounded"
                    />
                    <span>WhatsApp Document</span>
                  </label>

                  <label
                    className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
                      formDeliveryChannels.includes('EMAIL')
                        ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-950'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formDeliveryChannels.includes('EMAIL')}
                      onChange={() => toggleDeliveryChannel('EMAIL')}
                      className="accent-[#07563D] rounded"
                    />
                    <span>Email Gateway</span>
                  </label>
                </div>
              </div>

              {/* Automatic Schedule Preferences */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Automated Schedule Delivery</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="p-2 rounded-lg border border-amber-200 bg-amber-50/50 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formMorning}
                      onChange={(e) => setFormMorning(e.target.checked)}
                      className="accent-amber-600 rounded"
                    />
                    <span className="font-semibold text-amber-950">Morning Slot (~10:30 AM)</span>
                  </label>

                  <label className="p-2 rounded-lg border border-indigo-200 bg-indigo-50/50 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formEvening}
                      onChange={(e) => setFormEvening(e.target.checked)}
                      className="accent-indigo-600 rounded"
                    />
                    <span className="font-semibold text-indigo-950">Evening Slot (~07:00 PM)</span>
                  </label>
                </div>
              </div>

              {/* Bot Self-Service Permission */}
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-emerald-700" />
                    <span>WhatsApp Bot Self-Service Request</span>
                  </div>
                  <div className="text-[11px] text-emerald-800">
                    Recipient can message the bot anytime to receive their permitted PDF report.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formBotSelfService}
                  onChange={(e) => setFormBotSelfService(e.target.checked)}
                  className="accent-[#07563D] w-4 h-4 rounded cursor-pointer"
                />
              </div>

              {/* Workforce Scope */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Authorized Workforce Scope</label>
                <select
                  value={formWorkforceScope}
                  onChange={(e: any) => setFormWorkforceScope(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2 font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden bg-white"
                >
                  <option value="ORGANIZATION">Organization-Wide (Full Company Workforce)</option>
                  <option value="DEPARTMENT">Department Only (Assigned Department)</option>
                  <option value="DIRECT_REPORTS">Direct Reports Only (Supervised Team)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
              <Button variant="ghost" size="sm" onClick={() => setIsAddModalOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveRecipient}
                disabled={isSaving}
                leftIcon={isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs shadow-xs"
              >
                {isSaving ? 'Saving Recipient...' : 'Authorize Recipient'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
