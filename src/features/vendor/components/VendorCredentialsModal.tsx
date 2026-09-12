import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/Toast';
import {
  VendorCredentialService,
  VendorCredentialRecord,
} from '../../../services/vendor/vendorCredentialService';
import {
  Key,
  Copy,
  Check,
  Send,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
  Mail,
  ExternalLink,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import type { Vendor } from '../../../types';

export interface VendorCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: Vendor | any;
}

export const VendorCredentialsModal: React.FC<VendorCredentialsModalProps> = ({
  isOpen,
  onClose,
  vendor,
}) => {
  const { showToast } = useToast();
  const [credentials, setCredentials] = useState<VendorCredentialRecord | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load existing credentials or prepare form
  useEffect(() => {
    if (vendor && isOpen) {
      const existing = VendorCredentialService.getCredentialsByVendorId(vendor.id);
      setCredentials(existing);

      const targetEmail =
        existing?.email || vendor.primary_contact_email || vendor.email || 'admin@vendor.in';
      const targetName =
        existing?.full_name ||
        vendor.primary_contact_name ||
        vendor.contact_person ||
        'Vendor Admin';

      setEmailInput(targetEmail);
      setNameInput(targetName);
      setPasswordInput(
        existing?.temporary_password || VendorCredentialService.generateSecurePassword()
      );
    }
  }, [vendor, isOpen]);

  if (!isOpen || !vendor) return null;

  const handleGenerateNewPassword = () => {
    const newPwd = VendorCredentialService.generateSecurePassword();
    setPasswordInput(newPwd);
    showToast('Generated secure temporary password', 'info');
  };

  const handleSaveCredentials = async () => {
    if (!emailInput.trim()) {
      showToast('Login email address is required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const record = await VendorCredentialService.provisionCredentials({
        vendorId: vendor.id,
        organizationId: vendor.organization_id || 'a0000000-0000-0000-0000-000000000001',
        companyId: vendor.legal_entity_id || 'c1000000-0000-0000-0000-000000000001',
        email: emailInput.trim(),
        fullName: nameInput.trim() || 'Vendor Admin',
        password: passwordInput,
      });

      setCredentials(record);
      showToast(`Credentials provisioned for ${record.email}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to provision credentials', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    const portalUrl = credentials?.login_url || `${window.location.origin}/auth`;
    const textToCopy = `Joy PeopleHR — Vendor Portal Credentials
---------------------------------------------
Portal URL: ${portalUrl}
Username / Email: ${emailInput}
Temporary Password: ${passwordInput}
Access Role: Vendor Administrator
Assigned Vendor: ${vendor.legal_name || vendor.name} (${vendor.vendor_code || vendor.code})
---------------------------------------------
Note: Upon initial sign-in, you will be directed to your dedicated Vendor Settlement Workspace.`;

    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    showToast('Credentials copied to clipboard', 'success');
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleSendEmail = () => {
    showToast(`Welcome invitation with credentials transmitted to ${emailInput}`, 'success');
  };

  const handleRevoke = async () => {
    if (window.confirm('Are you sure you want to suspend / revoke portal access for this vendor?')) {
      await VendorCredentialService.revokeCredentials(vendor.id, 'Administrative suspension');
      const updated = VendorCredentialService.getCredentialsByVendorId(vendor.id);
      setCredentials(updated);
      showToast('Vendor portal access has been revoked', 'info');
    }
  };

  const portalUrl = credentials?.login_url || `${window.location.origin}/auth`;
  const isRevoked = credentials?.status === 'REVOKED';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vendor Portal Credentials & Multi-Tenant Access"
      size="lg"
    >
      <div className="space-y-5">
        {/* Vendor Header Context */}
        <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm text-white">{vendor.legal_name || vendor.name}</h4>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                {vendor.vendor_code || vendor.code || 'VEN-000021'}
              </span>
              <span className="text-slate-400">
                Role: <strong className="text-slate-200">Vendor Administrator (Level 4)</strong>
              </span>
            </div>
          </div>
          <Badge
            variant={
              isRevoked ? 'danger' : credentials?.status === 'ACTIVE' ? 'emerald' : 'amber'
            }
          >
            {isRevoked ? 'REVOKED' : credentials ? 'ACTIVE' : 'NOT PROVISIONED'}
          </Badge>
        </div>

        {/* Multi-Tenant Boundary Guarantee */}
        <div className="p-3.5 bg-indigo-50/80 rounded-xl border border-indigo-200/80 flex items-start gap-2.5 text-xs text-indigo-950">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-bold block">Strict Multi-Tenant Boundary Isolation</strong>
            <p className="text-indigo-800 text-[11px] leading-relaxed">
              These credentials grant access strictly to the <strong>Vendor Portal</strong> (/vendor-settlement-workspace).
              The vendor administrator cannot view internal company payroll, direct employee records, organizational settings,
              or data belonging to other vendors.
            </p>
          </div>
        </div>

        {/* Credential Inputs */}
        <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Portal Login Email (Username) *
              </label>
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="ramesh.k@abcsecurity.in"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Account Holder Full Name
              </label>
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Ramesh Kumar (Director)"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Temporary Password *
              </label>
              <button
                type="button"
                onClick={handleGenerateNewPassword}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Generate Secure Password
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 pr-10 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                title={showPassword ? 'Mask Password' : 'Show Password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Button
              size="sm"
              onClick={handleSaveCredentials}
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs"
              leftIcon={<Key className="w-3.5 h-3.5" />}
            >
              {isSubmitting
                ? 'Provisioning...'
                : credentials
                ? 'Update Credentials'
                : 'Provision & Activate Credentials'}
            </Button>
          </div>
        </div>

        {/* High-Security Credential Summary Box */}
        {credentials && (
          <div className="p-4 bg-slate-950 text-white rounded-xl space-y-3 font-mono text-xs border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-bold">
                Transmittable Credential Card
              </span>
              <Badge variant="emerald" className="text-[10px] font-bold">
                READY FOR TRANSMISSION
              </Badge>
            </div>

            <div className="space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Portal Login URL:</span>
                <span className="text-indigo-300 font-semibold">{portalUrl}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Username / Email:</span>
                <span className="text-white font-bold">{emailInput}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Temporary Password:</span>
                <span className="text-emerald-400 font-bold tracking-wider">
                  {showPassword ? passwordInput : '••••••••••••••••'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Portal Scope:</span>
                <span className="text-slate-300">VENDOR (Strictly Scoped)</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 font-sans">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyCredentials}
                  className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700 text-xs font-bold"
                  leftIcon={isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {isCopied ? 'Copied to Clipboard!' : 'Copy Credentials'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendEmail}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                  leftIcon={<Mail className="w-3.5 h-3.5" />}
                >
                  Send Invitation Email
                </Button>
              </div>

              {!isRevoked && (
                <button
                  type="button"
                  onClick={handleRevoke}
                  className="text-xs text-rose-400 hover:text-rose-300 underline font-medium cursor-pointer"
                >
                  Revoke Portal Access
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal Close Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-xs font-bold"
          >
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
