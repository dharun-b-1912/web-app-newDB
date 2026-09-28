// src/features/vendor/components/VendorDirectoryTab.tsx
// ============================================================================
// Joy PeopleHR — Enterprise Vendor Master Directory & Account Activation Workspace
// Register, search, filter, monitor compliance, manage single-use activation tokens,
// and administer automated invitation emails
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Phone,
  Mail,
  RefreshCw,
  Send,
  Copy,
  Clock,
  Settings,
  UserCheck,
  X,
  History,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { VendorMasterRecord, VendorMasterService } from '../../../services/vendor/vendorMasterService';
import { VendorOnboardingService } from '../../../services/vendor/vendorOnboardingService';
import { VendorEmailTemplateModal } from './VendorEmailTemplateModal';
import { useAuth } from '../../../hooks/useAuth';

interface VendorDirectoryTabProps {
  onOpenRegisterModal: () => void;
  onSelectVendor?: (vendorId: string) => void;
}

export const VendorDirectoryTab: React.FC<VendorDirectoryTabProps> = ({
  onOpenRegisterModal,
  onSelectVendor,
}) => {
  const { user } = useAuth();
  const organizationId = user?.organization_id || '0c621892-e938-4707-9957-13534ea32c19';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [vendors, setVendors] = useState<VendorMasterRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Email Template Admin Modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Selected Vendor for Activation Drawer
  const [selectedActivationVendor, setSelectedActivationVendor] = useState<VendorMasterRecord | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);
  const [editEmailMode, setEditEmailMode] = useState(false);
  const [newEmailValue, setNewEmailValue] = useState('');

  const fetchVendors = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await VendorMasterService.listVendors({
        organizationId,
        status: selectedStatus,
        search: searchQuery,
      });

      if (res.success) {
        setVendors(res.vendors || []);
      } else {
        setErrorMessage(res.error || 'Failed to fetch vendor directory.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while loading vendors.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [organizationId, selectedStatus]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendors();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Computed summary metrics
  const totalCount = vendors.length;
  const activeCount = vendors.filter((v) => v.status === 'ACTIVE').length;
  const underReviewCount = vendors.filter((v) => v.status === 'SUBMITTED' || v.status === 'UNDER_REVIEW').length;
  const invitedCount = vendors.filter((v) => v.status === 'INVITED').length;

  const handleOpenActivationDrawer = (vendor: VendorMasterRecord) => {
    setSelectedActivationVendor(vendor);
    setNewEmailValue(vendor.email || '');
    setEditEmailMode(false);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);
  };

  const handleResendInvitation = async () => {
    if (!selectedActivationVendor) return;
    setIsResending(true);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    const res = await VendorOnboardingService.resendActivationInvitation(
      selectedActivationVendor.id,
      user?.email || 'Company HR Admin'
    );

    setIsResending(false);
    if (res.success) {
      setActionSuccessMsg(`Activation email dispatched to ${selectedActivationVendor.email}!`);
      fetchVendors();
    } else {
      setActionErrorMsg(res.error || 'Failed to resend activation invitation.');
    }
  };

  const handleCopyActivationLink = (token?: string, email?: string) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/auth/accept-invite?token=${encodeURIComponent(
      token || 'vact_demo_sample'
    )}&email=${encodeURIComponent(email || selectedActivationVendor?.email || '')}&role=VENDOR_ADMIN`;

    navigator.clipboard.writeText(url);
    setActionSuccessMsg('Activation link copied to clipboard!');
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleUpdateContactEmail = async () => {
    if (!selectedActivationVendor || !newEmailValue.includes('@')) {
      setActionErrorMsg('Please provide a valid email address.');
      return;
    }

    const res = await VendorOnboardingService.updateContactEmail(
      selectedActivationVendor.id,
      newEmailValue,
      user?.email || 'Company HR Admin'
    );

    if (res.success) {
      setActionSuccessMsg(`Authorized contact email updated to ${newEmailValue} and fresh invitation dispatched!`);
      setEditEmailMode(false);
      fetchVendors();
    } else {
      setActionErrorMsg(res.error || 'Failed to update contact email.');
    }
  };

  const handleRevokeInvitation = async () => {
    if (!selectedActivationVendor) return;
    if (!window.confirm('Are you sure you want to revoke this pending invitation? The existing activation link will be invalidated.')) {
      return;
    }

    const res = await VendorOnboardingService.revokeActivationInvitation(
      selectedActivationVendor.id,
      'Revoked by HR administrator from Vendor Master Directory',
      user?.email || 'Company HR Admin'
    );

    if (res.success) {
      setActionSuccessMsg('Activation invitation revoked.');
      fetchVendors();
    } else {
      setActionErrorMsg(res.error || 'Failed to revoke invitation.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#047857]" />
            Vendor Master Directory
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Register, monitor compliance, manage single-use activation credentials, and track contract agreements across authorized vendors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            title="Configure automated vendor activation email template"
          >
            <Settings className="w-3.5 h-3.5 text-gray-500" />
            Email Template Admin
          </button>
          <button
            onClick={fetchVendors}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#047857]' : ''}`} />
          </button>
          <button
            onClick={onOpenRegisterModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#047857] hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Onboard New Vendor
          </button>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="text-xs text-gray-500 font-medium">Total Vendors</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Registered entities</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="text-xs text-emerald-800 font-medium">Active &amp; Deployed</div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{activeCount}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Compliant &amp; site-active</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <div className="text-xs text-blue-800 font-medium">Under HR Review</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{underReviewCount}</div>
          <div className="text-[11px] text-blue-700 mt-0.5">Pending approval</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-xs">
          <div className="text-xs text-purple-800 font-medium">Invitations Pending</div>
          <div className="text-2xl font-bold text-purple-900 mt-1">{invitedCount}</div>
          <div className="text-[11px] text-purple-700 mt-0.5">Awaiting activation link</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search vendor name, vendor code, or PAN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#047857]"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-full sm:w-48 py-2.5 px-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#047857]"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUBMITTED">Under Review</option>
          <option value="INVITED">Invited / Pending</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={fetchVendors} className="font-bold underline text-rose-900 hover:text-rose-700">
            Retry Query
          </button>
        </div>
      )}

      {/* Vendors Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-500 flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#047857]" />
            <span>Querying verified vendor records from database...</span>
          </div>
        ) : vendors.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="font-semibold text-gray-900">No Vendors Found</div>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchQuery || selectedStatus !== 'ALL'
                ? 'No vendor records match your active search or status filters.'
                : 'There are no active or registered vendors in your organization yet.'}
            </p>
            <button
              onClick={onOpenRegisterModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#047857] hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Onboard First Vendor
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Vendor Details</th>
                  <th className="py-3.5 px-4">Category &amp; Capacity</th>
                  <th className="py-3.5 px-4">PAN / GSTIN</th>
                  <th className="py-3.5 px-4">Account Activation</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{v.legalName}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono text-[11px] font-medium">
                          {v.vendorCode}
                        </span>
                        {v.phone && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {v.phone}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-gray-800 font-medium text-xs">{v.category || 'General Staffing'}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">Cap: {v.maxCapacity || 50} workers</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-600">
                      <div>
                        PAN: <span className="font-medium text-gray-800">{v.panNumber || '—'}</span>
                      </div>
                      <div>
                        GST: <span className="font-medium text-gray-800">{v.gstNumber || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              v.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : v.status === 'INVITED'
                                ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {v.status === 'ACTIVE' ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Clock className="w-3 h-3 text-purple-600" />
                            )}
                            {v.status === 'ACTIVE' ? 'Activated' : 'Invitation Sent'}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 truncate max-w-[180px]">{v.email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          v.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : v.status === 'SUBMITTED' || v.status === 'UNDER_REVIEW'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenActivationDrawer(v)}
                          className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-[#047857] transition-colors cursor-pointer"
                        >
                          Manage Activation
                        </button>
                        <button
                          onClick={() => onSelectVendor?.(v.id)}
                          className="text-[#047857] hover:text-emerald-800 font-semibold text-xs hover:underline cursor-pointer"
                        >
                          View Profile →
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Account Activation Management Drawer */}
      {selectedActivationVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-2xl text-gray-900 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/80 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-[#047857]">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Vendor Account Activation</h3>
                  <p className="text-xs text-gray-500">
                    {selectedActivationVendor.legalName} ({selectedActivationVendor.vendorCode})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedActivationVendor(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {actionSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#047857]" />
                  <span>{actionSuccessMsg}</span>
                </div>
              )}

              {actionErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>{actionErrorMsg}</span>
                </div>
              )}

              {/* Status Overview Box */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Invitation Status:</span>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                      selectedActivationVendor.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {selectedActivationVendor.status === 'ACTIVE' ? 'Activated' : 'Invitation Pending'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Authorized Contact Email:</span>
                  <span className="font-semibold text-gray-900">{selectedActivationVendor.email}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Invitation Validity:</span>
                  <span className="text-gray-700">7 Days (Single-Use Token)</span>
                </div>
              </div>

              {/* Edit Email Form */}
              {editEmailMode ? (
                <div className="p-3.5 rounded-xl border border-gray-200 bg-white space-y-2">
                  <label className="text-xs font-bold text-gray-700">Update Authorized Contact Email</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={newEmailValue}
                      onChange={(e) => setNewEmailValue(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-[#047857] focus:outline-none"
                    />
                    <button
                      onClick={handleUpdateContactEmail}
                      className="px-3 py-2 bg-[#047857] text-white rounded-lg text-xs font-semibold hover:bg-emerald-800"
                    >
                      Save &amp; Resend
                    </button>
                    <button
                      onClick={() => setEditEmailMode(false)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <button
                  onClick={handleResendInvitation}
                  disabled={isResending}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#047857] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isResending ? 'Sending...' : 'Resend Activation Email'}
                </button>

                <button
                  onClick={() => handleCopyActivationLink()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                  Copy Activation Link
                </button>

                <button
                  onClick={() => setEditEmailMode(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-gray-500" />
                  Change Contact Email
                </button>

                <button
                  onClick={handleRevokeInvitation}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-rose-600" />
                  Revoke Invitation
                </button>
              </div>
            </div>

            <div className="flex justify-end border-t border-gray-200 bg-gray-50/80 px-6 py-3.5">
              <button
                onClick={() => setSelectedActivationVendor(null)}
                className="px-4 py-2 border border-gray-200 bg-white text-xs font-semibold text-gray-700 rounded-lg hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Template Administration Modal */}
      <VendorEmailTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
      />
    </div>
  );
};
