// src/features/vendor/components/VendorEmailTemplateModal.tsx
// ============================================================================
// Joy PeopleHR — Vendor Account Activation Email Template Administration Modal
// Configurable templates, live HTML/text preview, placeholder injection, test email dispatch
// ============================================================================

import React, { useState } from 'react';
import {
  X,
  Mail,
  Eye,
  Send,
  Save,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Sparkles,
} from 'lucide-react';
import {
  VendorOnboardingService,
  VendorEmailTemplate,
} from '../../../services/vendor/vendorOnboardingService';
import { resendEmailService } from '../../../services/email/resendEmailService';

interface VendorEmailTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VendorEmailTemplateModal: React.FC<VendorEmailTemplateModalProps> = ({
  isOpen,
  onClose,
}) => {
  const currentTemplate = VendorOnboardingService.getActivationEmailTemplate();

  const [subject, setSubject] = useState(currentTemplate.subject);
  const [body, setBody] = useState(currentTemplate.body);
  const [activeTab, setActiveTab] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    const res = VendorOnboardingService.saveActivationEmailTemplate({
      subject,
      body,
    });
    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleSendTest = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      setTestStatus({ type: 'error', message: 'Please enter a valid recipient email address.' });
      return;
    }

    setIsSendingTest(true);
    setTestStatus(null);

    try {
      const res = await resendEmailService.sendVendorAccountActivationEmail({
        to: testEmailAddress,
        authorizedContactName: 'Karthik Ramanathan (Test Contact)',
        vendorLegalName: 'Acme Manpower Solutions Pvt Ltd',
        vendorCode: 'VND-7890',
        portalUrl: window.location.origin + '/vendor',
        activationToken: 'test_token_sample_123',
        companyName: 'Joy Corporate Solutions',
        customSubject: `[TEST] ${subject}`,
        expiresInDays: 7,
      });

      if (res.success) {
        setTestStatus({
          type: 'success',
          message: `Test email dispatched successfully to ${testEmailAddress}!`,
        });
      } else {
        setTestStatus({
          type: 'error',
          message: res.error || 'Failed to dispatch test email.',
        });
      }
    } catch (err: any) {
      setTestStatus({
        type: 'error',
        message: err.message || 'Error occurred while sending test email.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Sample data substitution for preview
  const previewBody = body
    .replace(/{{authorized_contact_name}}/g, 'Karthik Ramanathan')
    .replace(/{{vendor_legal_name}}/g, 'Acme Manpower Solutions Pvt Ltd')
    .replace(/{{vendor_code}}/g, 'VND-7890')
    .replace(/{{authorized_contact_email}}/g, 'karthik@acmeworkforce.com')
    .replace(/{{portal_url}}/g, window.location.origin + '/vendor')
    .replace(/{{activation_url}}/g, `${window.location.origin}/auth/accept-invite?token=sample_vact_9988&email=karthik@acmeworkforce.com&role=VENDOR_ADMIN`)
    .replace(/{{invitation_expiry}}/g, '7 days')
    .replace(/{{company_name}}/g, 'Joy Corporate Solutions')
    .replace(/{{support_email}}/g, 'hr-support@joypeoplehr.com');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl text-gray-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-[#047857]">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">Email Template Administration</h3>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-[#047857]">
                  v{currentTemplate.version}.0
                </span>
              </div>
              <p className="text-xs text-gray-500">Configure the automated account activation email dispatched to authorized vendor contacts.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-2.5">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('EDIT')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'EDIT'
                  ? 'bg-emerald-50 text-[#047857] border border-emerald-300'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Template Editor
            </button>
            <button
              onClick={() => setActiveTab('PREVIEW')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'PREVIEW'
                  ? 'bg-emerald-50 text-[#047857] border border-emerald-300'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Live Email Preview
            </button>
          </div>

          <div className="text-[11px] text-gray-400">
            Last modified: {new Date(currentTemplate.updatedAt).toLocaleDateString()} by {currentTemplate.updatedBy}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {saveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#047857]" />
              <span>Email template saved successfully! Subsequent invitations will use this configuration.</span>
            </div>
          )}

          {activeTab === 'EDIT' ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700">Email Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:border-[#047857] focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700">Email Body &amp; Placeholder Injection</label>
                  <span className="text-[11px] text-gray-400">Plain text / HTML supported</span>
                </div>

                {/* Available Placeholder Chips */}
                <div className="mb-2 p-2.5 rounded-xl bg-gray-50 border border-gray-200 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-1">Available Placeholders:</span>
                  {currentTemplate.availablePlaceholders.map((ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => setBody((prev) => `${prev} ${ph}`)}
                      className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[11px] font-mono text-[#047857] hover:border-emerald-400 hover:bg-emerald-50/50 transition-all cursor-pointer"
                      title="Click to insert into body"
                    >
                      {ph}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={13}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-3.5 text-xs font-mono text-gray-800 focus:border-[#047857] focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                <div className="text-xs font-semibold text-gray-500">Subject Preview:</div>
                <div className="text-sm font-bold text-gray-900 mt-0.5">{subject}</div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs overflow-hidden">
                <div className="border-b border-gray-200 pb-3 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-gray-900">Joy PeopleHR Automated Dispatch</span>
                  </div>
                  <span className="text-[11px] text-gray-400">Recipient: karthik@acmeworkforce.com</span>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs text-gray-800 leading-relaxed">
                  {previewBody}
                </pre>
              </div>
            </div>
          )}

          {/* Test Email Section */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/80 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#047857]" />
              <span className="text-xs font-bold text-gray-900">Send Test Email</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="Enter test recipient email address (e.g. your email)..."
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-[#047857] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSendTest}
                disabled={isSendingTest}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {isSendingTest ? 'Dispatching...' : 'Dispatch Test Email'}
              </button>
            </div>

            {testStatus && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  testStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {testStatus.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                )}
                <span>{testStatus.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50/80 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors shadow-xs"
          >
            Close
          </button>

          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#047857] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            <Save className="w-4 h-4" />
            Save Template Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
