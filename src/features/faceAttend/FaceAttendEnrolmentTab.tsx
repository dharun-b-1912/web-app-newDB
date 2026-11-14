// src/features/faceAttend/FaceAttendEnrolmentTab.tsx
import React, { useMemo, useState } from 'react';
import { Check, X, Trash2, ShieldOff, Search, Eye, Loader2 } from 'lucide-react';
import { faceAttendService } from '../../services/faceAttend/faceAttendService';
import type { FaceAttendSubscription, FaceAttendTemplateRecord } from '../../types/faceAttend';

interface Props {
  templates: FaceAttendTemplateRecord[];
  subscription: FaceAttendSubscription | null;
  isAdmin: boolean;
  onApprove: (templateId: string) => Promise<void>;
  onReject: (templateId: string, reason: string) => Promise<void>;
  onRevoke: (templateId: string, reason: string) => Promise<void>;
  onDeleteBiometrics: (employeeId: string) => Promise<void>;
}

export const FaceAttendEnrolmentTab: React.FC<Props> = ({
  templates,
  subscription,
  isAdmin,
  onApprove,
  onReject,
  onRevoke,
  onDeleteBiometrics,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inspectTpl, setInspectTpl] = useState<FaceAttendTemplateRecord | null>(null);
  const [inspectPhotos, setInspectPhotos] = useState<Array<{ label: string; url: string }>>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [confirmEraseTpl, setConfirmEraseTpl] = useState<FaceAttendTemplateRecord | null>(null);

  const openPhotoReview = async (tpl: FaceAttendTemplateRecord) => {
    setInspectTpl(tpl);
    setInspectPhotos([]);
    setLoadingPhotos(true);
    try {
      const urls = await faceAttendService.getTemplateSignedPhotoUrls(tpl);
      setInspectPhotos(urls);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const activeCount = templates.filter((t) => t.enrolment_status === 'ACTIVE').length;
  const pendingTemplates = useMemo(
    () => templates.filter((t) => t.enrolment_status === 'PENDING_APPROVAL'),
    [templates]
  );
  const [batchApproving, setBatchApproving] = useState(false);

  const handleBatchApprove = async () => {
    if (batchApproving || pendingTemplates.length === 0) return;
    setBatchApproving(true);
    try {
      for (const t of pendingTemplates) {
        await onApprove(t.id);
      }
    } finally {
      setBatchApproving(false);
    }
  };

  const maxCap = subscription?.max_enrolled_employees;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (statusFilter === 'ALL' && t.enrolment_status === 'DELETED') return false;
      if (statusFilter !== 'ALL' && t.enrolment_status !== statusFilter) return false;
      if (
        q &&
        !(
          (t.employee_name || '').toLowerCase().includes(q) ||
          (t.employee_code || '').toLowerCase().includes(q) ||
          (t.department || '').toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [templates, statusFilter, search]);

  const handleAction = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            1:1 Employee Face Enrolment & Consent Governance
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Templates stored inside private tenant-isolated vault (`faceattend-private`). Enrolled:{' '}
            <strong>{activeCount}</strong>
            {maxCap ? ` / ${maxCap} plan cap` : ' (Unlimited active plan)'}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee..."
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="ACTIVE">Active</option>
            <option value="REJECTED">Rejected</option>
            <option value="REVOKED">Revoked</option>
            <option value="DELETED">Deleted</option>
          </select>
          {isAdmin && pendingTemplates.length > 0 && (
            <button
              disabled={batchApproving}
              onClick={handleBatchApprove}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              {batchApproving ? 'Approving...' : `Approve All Pending (${pendingTemplates.length})`}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Employee</th>
                <th className="py-3 px-4 font-semibold">Method / Provider</th>
                <th className="py-3 px-4 font-semibold">Consent</th>
                <th className="py-3 px-4 font-semibold">Quality</th>
                <th className="py-3 px-4 font-semibold">Enrolment Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-500">
                    No enrolment templates matching current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((tpl) => (
                  <tr key={tpl.id} className="hover:bg-gray-50/70">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">{tpl.employee_name}</div>
                      <div className="text-gray-500">
                        {tpl.employee_code || 'No Code'} &bull; {tpl.department || 'General'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-800">{tpl.capture_method}</div>
                      <div className="text-[11px] text-gray-400">{tpl.provider_code}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          tpl.consent_status === 'GRANTED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {tpl.consent_status === 'GRANTED'
                          ? `Granted (${tpl.consent_version || 'v1.0'})`
                          : tpl.consent_status || 'None'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {tpl.quality_score != null ? `${tpl.quality_score.toFixed(0)}%` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          tpl.enrolment_status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : tpl.enrolment_status === 'PENDING_APPROVAL'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}
                      >
                        {tpl.enrolment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {tpl.enrolment_status !== 'DELETED' && tpl.primary_image_path && (
                        <button
                          onClick={() => openPhotoReview(tpl)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 cursor-pointer"
                          title="Inspect enrolled 3-angle photos to verify employee identity"
                        >
                          <Eye className="w-3 h-3" /> Verify Photos
                        </button>
                      )}
                      {isAdmin && tpl.enrolment_status === 'PENDING_APPROVAL' && (
                        <>
                          <button
                            disabled={busyId === tpl.id}
                            onClick={() => handleAction(tpl.id, () => onApprove(tpl.id))}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                          >
                            <Check className="w-3 h-3" /> Approve
                          </button>
                          <button
                            disabled={busyId === tpl.id}
                            onClick={() =>
                              handleAction(tpl.id, () =>
                                onReject(tpl.id, 'Please recapture clear front-facing photo')
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
                          >
                            <X className="w-3 h-3" /> Reject
                          </button>
                        </>
                      )}
                      {isAdmin && tpl.enrolment_status === 'ACTIVE' && (
                        <button
                          disabled={busyId === tpl.id}
                          onClick={() =>
                            handleAction(tpl.id, () => onRevoke(tpl.id, 'Revoked for re-enrolment'))
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 cursor-pointer"
                        >
                          <ShieldOff className="w-3 h-3" /> Revoke
                        </button>
                      )}
                      {isAdmin && tpl.enrolment_status !== 'DELETED' && (
                        <button
                          disabled={busyId === tpl.id}
                          onClick={() => setConfirmEraseTpl(tpl)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-rose-100 hover:text-rose-700 disabled:opacity-50 cursor-pointer"
                          title="Withdraw consent and permanently delete stored face template"
                        >
                          <Trash2 className="w-3 h-3" /> Erase
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {inspectTpl && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  Identity Verification — {inspectTpl.employee_name}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {inspectTpl.employee_code || 'No Code'} &bull; {inspectTpl.department || 'General'} &bull; Status:{' '}
                  <strong>{inspectTpl.enrolment_status}</strong>
                </p>
              </div>
              <button
                onClick={() => setInspectTpl(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inspectTpl.employee_avatar_url && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                <img
                  src={inspectTpl.employee_avatar_url}
                  alt={inspectTpl.employee_name}
                  className="w-12 h-12 rounded-full object-cover border border-gray-300"
                />
                <div className="text-xs text-gray-600">
                  <div className="font-semibold text-gray-900">HR Profile Photo</div>
                  <div>Compare this profile photo against the 3-angle captures below before approving.</div>
                </div>
              </div>
            )}

            {loadingPhotos ? (
              <div className="py-10 flex items-center justify-center gap-2 text-xs text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                Loading private tenant-isolated captures...
              </div>
            ) : inspectPhotos.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">
                No enrolment photos available for preview.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {inspectPhotos.map((photo) => (
                  <div
                    key={photo.label}
                    className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex flex-col items-center"
                  >
                    <img
                      src={photo.url}
                      alt={`${inspectTpl.employee_name} ${photo.label}`}
                      className="w-full h-44 object-cover"
                    />
                    <div className="py-1.5 text-[11px] font-semibold text-gray-700">
                      {photo.label} Angle
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              {isAdmin && inspectTpl.enrolment_status === 'PENDING_APPROVAL' && (
                <>
                  <button
                    disabled={busyId === inspectTpl.id}
                    onClick={async () => {
                      await handleAction(inspectTpl.id, () =>
                        onReject(inspectTpl.id, 'Face did not match employee identity')
                      );
                      setInspectTpl(null);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button
                    disabled={busyId === inspectTpl.id}
                    onClick={async () => {
                      await handleAction(inspectTpl.id, () => onApprove(inspectTpl.id));
                      setInspectTpl(null);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve &amp; Activate
                  </button>
                </>
              )}
              <button
                onClick={() => setInspectTpl(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmEraseTpl && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-rose-100 text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  Permanently Erase Face Data?
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  This will permanently delete all stored 3-angle face photos and withdraw biometric consent for{' '}
                  <strong>{confirmEraseTpl.employee_name}</strong>. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setConfirmEraseTpl(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={busyId === confirmEraseTpl.id}
                onClick={async () => {
                  const target = confirmEraseTpl;
                  setConfirmEraseTpl(null);
                  await handleAction(target.id, () => onDeleteBiometrics(target.employee_id));
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Confirm &amp; Erase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

