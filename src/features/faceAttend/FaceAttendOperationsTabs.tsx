// src/features/faceAttend/FaceAttendOperationsTabs.tsx
import React, { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Search, MapPin } from 'lucide-react';
import type { FaceAttendAttemptRecord, FaceAttendExceptionReview } from '../../types/faceAttend';

export const FaceAttendAttemptsTab: React.FC<{
  attempts: FaceAttendAttemptRecord[];
}> = ({ attempts }) => {
  const [decisionFilter, setDecisionFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return attempts.filter((a) => {
      if (decisionFilter !== 'ALL' && a.decision !== decisionFilter) return false;
      if (
        q &&
        !(
          (a.employee_name || '').toLowerCase().includes(q) ||
          (a.employee_code || '').toLowerCase().includes(q) ||
          a.correlation_id.toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [attempts, decisionFilter, search]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Face, Liveness & GPS Verification Attempt Ledger
          </h3>
          <p className="text-xs text-gray-500">
            Every check-in / check-out attempt with transparent scores, provider mode, geofence distance, and correlation ID.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Employee or correlation ID..."
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>
          <select
            value={decisionFilter}
            onChange={(e) => setDecisionFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
          >
            <option value="ALL">All Decisions</option>
            <option value="MATCH">MATCH</option>
            <option value="NO_MATCH">NO_MATCH</option>
            <option value="LOW_CONFIDENCE">LOW_CONFIDENCE</option>
            <option value="LIVENESS_FAILED">LIVENESS_FAILED</option>
            <option value="IMAGE_QUALITY_FAILED">IMAGE_QUALITY_FAILED</option>
            <option value="GEOFENCE_FAILED">GEOFENCE_FAILED</option>
            <option value="TEMPLATE_NOT_AVAILABLE">TEMPLATE_NOT_AVAILABLE</option>
            <option value="PROVIDER_UNAVAILABLE">PROVIDER_UNAVAILABLE</option>
            <option value="CONSENT_REQUIRED">CONSENT_REQUIRED</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Timestamp & Employee</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">1:1 Face</th>
                <th className="py-3 px-4 font-semibold">Liveness</th>
                <th className="py-3 px-4 font-semibold">GPS / Geofence</th>
                <th className="py-3 px-4 font-semibold">Decision & Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-500">
                    No verification attempts match the selected filter.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/70">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">{a.employee_name}</div>
                      <div className="text-[11px] text-gray-500">
                        {new Date(a.created_at).toLocaleString('en-IN')} &bull; {a.correlation_id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-700">{a.punch_type}</td>
                    <td className="py-3 px-4">
                      {a.face_similarity_score != null ? `${a.face_similarity_score.toFixed(1)}%` : '—'}
                      <div className="text-[10px] text-gray-400">{a.provider_code}</div>
                    </td>
                    <td className="py-3 px-4">
                      {a.liveness_score != null ? `${a.liveness_score.toFixed(0)}%` : '—'}{' '}
                      <span className={a.liveness_passed ? 'text-emerald-600' : 'text-rose-600'}>
                        ({a.liveness_passed ? 'Pass' : 'Fail'})
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span>{a.work_location_name || (a.geofence_passed ? 'Authorized' : 'Failed')}</span>
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {a.distance_meters != null ? `${Math.round(a.distance_meters)}m` : 'No dist'} &bull;{' '}
                        {a.gps_accuracy_meters != null ? `±${Math.round(a.gps_accuracy_meters)}m` : '—'}
                        {a.is_mock_location ? ' • MOCK GPS' : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          a.decision === 'MATCH'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {a.decision}
                      </span>
                      {a.failure_reason && (
                        <div className="text-[11px] text-gray-600 mt-1 max-w-xs">{a.failure_reason}</div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const FaceAttendExceptionsTab: React.FC<{
  exceptions: FaceAttendExceptionReview[];
  onResolve: (
    review: FaceAttendExceptionReview,
    decision: 'APPROVED' | 'REJECTED',
    notes: string
  ) => Promise<void>;
}> = ({ exceptions, onResolve }) => {
  const [busyId, setBusyId] = useState<string | null>(null);

  const act = async (review: FaceAttendExceptionReview, decision: 'APPROVED' | 'REJECTED') => {
    setBusyId(review.id);
    try {
      const notes =
        decision === 'APPROVED'
          ? 'Approved via Supervisor / HR FaceAttend fallback desk'
          : 'Rejected by Supervisor / HR after verification check';
      await onResolve(review, decision, notes);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900">
          Non-Biometric Fallback & Exception Review Queue
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Employees unable to pass automated face verification (camera failure, lighting, injury, provider outage)
          can submit attendance for Supervisor / HR approval without being marked absent automatically.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Employee & Date</th>
                <th className="py-3 px-4 font-semibold">Punch Requested</th>
                <th className="py-3 px-4 font-semibold">Fallback Reason</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Supervisor / HR Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exceptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-500">
                    No manual exception fallback requests queued.
                  </td>
                </tr>
              ) : (
                exceptions.map((ex) => (
                  <tr key={ex.id} className="hover:bg-gray-50/70">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">{ex.employee_name}</div>
                      <div className="text-[11px] text-gray-500">
                        {new Date(ex.created_at).toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-800">{ex.requested_punch_type}</td>
                    <td className="py-3 px-4 text-gray-700 max-w-sm">{ex.fallback_reason}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          ex.review_status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : ex.review_status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {ex.review_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {ex.review_status === 'PENDING' ? (
                        <>
                          <button
                            disabled={busyId === ex.id}
                            onClick={() => act(ex, 'APPROVED')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Approve & Commit
                          </button>
                          <button
                            disabled={busyId === ex.id}
                            onClick={() => act(ex, 'REJECTED')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
                          >
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-gray-500">{ex.review_notes || 'Processed'}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

