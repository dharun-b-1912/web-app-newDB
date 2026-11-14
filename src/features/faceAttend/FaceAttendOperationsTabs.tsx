// src/features/faceAttend/FaceAttendOperationsTabs.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Search, MapPin, AlertCircle, Info, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import type { FaceAttendAttemptRecord, FaceAttendExceptionReview } from '../../types/faceAttend';

interface DecisionInfo {
  label: string;
  badgeClass: string;
  solution: string;
  actionHint: string;
}

const getDecisionInfo = (attempt: FaceAttendAttemptRecord): DecisionInfo => {
  const d = attempt.decision;
  const reason = attempt.failure_reason || '';

  if (d === 'MATCH') {
    return {
      label: 'Verified & Passed',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      solution: 'Verification successful. Check-in/out punch has been committed to the attendance register.',
      actionHint: 'No action needed',
    };
  }

  if (d === 'LOW_CONFIDENCE') {
    return {
      label: 'Low Face Match',
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
      solution:
        'Face match score is below policy threshold. Ask employee to stand facing a clear light source without backlighting, mask, or cap. If employee appearance has significantly changed, re-register face in Enrolment tab.',
      actionHint: 'Instruct: Retake in good lighting / Re-enroll',
    };
  }

  if (d === 'LIVENESS_FAILED') {
    return {
      label: 'Liveness Failed',
      badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
      solution:
        'Anti-spoofing check did not detect natural face movement. Ask employee to hold phone steadily at eye level, blink naturally inside the oval guide, and turn head slightly. Screen replays and photos are blocked.',
      actionHint: 'Instruct: Hold eye-level & blink inside oval',
    };
  }

  if (d === 'GEOFENCE_FAILED' || attempt.geofence_passed === false) {
    const dist = attempt.distance_meters != null ? `${Math.round(attempt.distance_meters)}m away` : 'out of boundary';
    return {
      label: 'Outside Workplace Range',
      badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
      solution: `Employee was ${dist} from authorized site. Ask employee to turn on High Accuracy GPS & Wi-Fi. If employee has moved to another site, assign their work location in Employee Master.`,
      actionHint: 'Instruct: Turn on GPS Wi-Fi / Update site',
    };
  }

  if (d === 'TEMPLATE_NOT_AVAILABLE') {
    return {
      label: 'Enrolment Missing',
      badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
      solution:
        'No active registered face template found. Employee self-enrolment is now auto-approved: ask employee to open mobile app, complete 3-angle Face Registration, and try again immediately.',
      actionHint: 'Instruct: Complete Face Registration in app',
    };
  }

  if (d === 'PROVIDER_UNAVAILABLE') {
    return {
      label: 'Service Delay / Timeout',
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
      solution:
        'Cloud verification service encountered a temporary connection timeout. Ask employee to tap Capture again after 30 seconds, or approve via Exception Fallback tab.',
      actionHint: 'Instruct: Tap Capture again / Fallback approve',
    };
  }

  if (d === 'CONSENT_REQUIRED') {
    return {
      label: 'Consent Needed',
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
      solution:
        'Biometric privacy consent has not been granted. Ask employee to accept the consent agreement prompt in the mobile app before scanning.',
      actionHint: 'Instruct: Accept consent prompt in app',
    };
  }

  if (d === 'IMAGE_QUALITY_FAILED') {
    return {
      label: 'Blurry / Dark Image',
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
      solution:
        'Selfie image quality is too dark or blurry. Ask employee to wipe camera lens and step into adequate light.',
      actionHint: 'Instruct: Clean lens & brighten room',
    };
  }

  if (d === 'NO_MATCH') {
    return {
      label: 'Face Not Recognized',
      badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
      solution:
        'The scanned face does not match the enrolled biometric profile. Verify employee identity or re-enroll photos via Enrolment tab.',
      actionHint: 'Verify identity & re-enroll',
    };
  }

  return {
    label: d || 'Other Error',
    badgeClass: 'bg-gray-100 text-gray-700 border border-gray-200',
    solution: reason || 'Review attempt logs or approve via Exception Fallback desk.',
    actionHint: 'Review error details',
  };
};

export const FaceAttendAttemptsTab: React.FC<{
  attempts: FaceAttendAttemptRecord[];
}> = ({ attempts }) => {
  const [decisionFilter, setDecisionFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [search, decisionFilter, pageSize]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return attempts.filter((a) => {
      if (decisionFilter !== 'ALL' && a.decision !== decisionFilter) return false;
      if (
        q &&
        !(
          (a.employee_name || '').toLowerCase().includes(q) ||
          (a.employee_code || '').toLowerCase().includes(q) ||
          a.correlation_id.toLowerCase().includes(q) ||
          (a.work_location_name || '').toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [attempts, decisionFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedAttempts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Face, Liveness & GPS Verification Attempt Ledger
          </h3>
          <p className="text-xs text-gray-500">
            Every check-in / check-out attempt with simplified status terms and instant step-by-step HR guidance to resolve employee issues.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee, site, or ID..."
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>
          <select
            value={decisionFilter}
            onChange={(e) => setDecisionFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
          >
            <option value="ALL">All Outcomes ({attempts.length})</option>
            <option value="MATCH">✅ Verified & Passed (MATCH)</option>
            <option value="LOW_CONFIDENCE">⚠️ Low Face Match (LOW_CONFIDENCE)</option>
            <option value="LIVENESS_FAILED">❌ Liveness Failed (LIVENESS_FAILED)</option>
            <option value="GEOFENCE_FAILED">📍 Outside Workplace (GEOFENCE_FAILED)</option>
            <option value="TEMPLATE_NOT_AVAILABLE">👤 Enrolment Missing (TEMPLATE_NOT_AVAILABLE)</option>
            <option value="PROVIDER_UNAVAILABLE">🔄 Service Timeout (PROVIDER_UNAVAILABLE)</option>
            <option value="CONSENT_REQUIRED">📝 Consent Needed (CONSENT_REQUIRED)</option>
            <option value="IMAGE_QUALITY_FAILED">📸 Blurry / Dark (IMAGE_QUALITY_FAILED)</option>
            <option value="NO_MATCH">⛔ Face Not Recognized (NO_MATCH)</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">Employee & Timestamp</th>
                <th className="py-3 px-3 font-semibold whitespace-nowrap">Type</th>
                <th className="py-3 px-3 font-semibold whitespace-nowrap">Face Match</th>
                <th className="py-3 px-3 font-semibold whitespace-nowrap">Liveness</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">GPS & Boundary</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">Verification Status</th>
                <th className="py-3 px-4 font-semibold min-w-[280px]">HR Solution & Intimation Steps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    No verification attempts match the selected filter.
                  </td>
                </tr>
              ) : (
                paginatedAttempts.map((a) => {
                  const info = getDecisionInfo(a);
                  return (
                    <tr key={a.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4 align-top min-w-[190px]">
                        <div className="font-semibold text-gray-900 leading-tight">{a.employee_name}</div>
                        <div className="text-[11px] text-gray-500 font-mono mt-0.5 whitespace-nowrap">
                          {a.employee_code ? `${a.employee_code} • ` : ''}
                          {new Date(a.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5 whitespace-nowrap">
                          {new Date(a.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                          })}{' '}
                          • ID: {a.correlation_id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap ${
                            a.punch_type === 'CHECK_IN'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {a.punch_type === 'CHECK_IN' ? 'Check-In' : 'Check-Out'}
                        </span>
                      </td>
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <div className="font-semibold text-gray-900 text-xs">
                          {a.face_similarity_score != null ? `${a.face_similarity_score.toFixed(1)}%` : '—'}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5 uppercase tracking-wider">
                          {a.provider_code || 'BUILTIN'}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <div className="font-semibold text-gray-900 text-xs">
                          {a.liveness_score != null ? `${a.liveness_score.toFixed(0)}%` : '—'}
                        </div>
                        <span
                          className={`inline-block text-[11px] font-medium whitespace-nowrap mt-0.5 ${
                            a.liveness_passed ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {a.liveness_passed ? 'Pass (Real)' : 'Fail (Spoof)'}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-top min-w-[190px]">
                        <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate max-w-[170px]" title={a.work_location_name || ''}>
                            {a.work_location_name || (a.geofence_passed ? 'Authorized Site' : 'Unknown Site')}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5 whitespace-nowrap">
                          {a.distance_meters != null ? `${Math.round(a.distance_meters)}m from center` : 'No GPS'}{' '}
                          &bull; {a.gps_accuracy_meters != null ? `±${Math.round(a.gps_accuracy_meters)}m` : '—'}
                        </div>
                        {a.is_mock_location && (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold mt-1">
                            FAKE GPS DETECTED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top min-w-[160px]">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${info.badgeClass}`}>
                          {info.label}
                        </span>
                        {a.failure_reason && a.decision !== 'MATCH' && (
                          <div className="text-[11px] text-gray-500 mt-1.5 max-w-[160px] leading-tight">
                            {a.failure_reason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top min-w-[320px]">
                        <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-200/80">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 mb-1">
                            {a.decision === 'MATCH' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            )}
                            <span className="font-semibold">{info.actionHint}</span>
                          </div>
                          <p className="text-[11px] text-gray-600 leading-relaxed">{info.solution}</p>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Clean Pagination Bar */}
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span>
              Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to{' '}
              {Math.min(page * pageSize, filtered.length)} of {filtered.length} attempts
            </span>
            <span className="text-gray-300">|</span>
            <label className="flex items-center gap-1">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-0.5 border border-gray-200 rounded bg-white text-xs"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded border border-gray-200 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded border border-gray-200 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [batchResolving, setBatchResolving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const pendingList = exceptions.filter((e) => e.review_status === 'PENDING');
  const filtered = exceptions.filter((e) => {
    if (statusFilter === 'ALL') return true;
    return e.review_status === statusFilter;
  });

  useEffect(() => {
    setPage(1);
  }, [statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleBatchResolveAll = async () => {
    if (batchResolving || pendingList.length === 0) return;
    setBatchResolving(true);
    try {
      for (const ex of pendingList) {
        await onResolve(ex, 'APPROVED', 'Approved & verified by HR (Batch resolve)');
      }
    } finally {
      setBatchResolving(false);
    }
  };

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
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Non-Biometric Fallback & Exception Review Queue
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Employees unable to pass automated face verification can submit attendance for Supervisor / HR approval without being marked absent automatically.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
          >
            <option value="ALL">All Statuses ({exceptions.length})</option>
            <option value="PENDING">Pending Only ({pendingList.length})</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          {pendingList.length > 0 && (
            <button
              disabled={batchResolving}
              onClick={handleBatchResolveAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {batchResolving ? 'Resolving...' : `Approve All Pending (${pendingList.length})`}
            </button>
          )}
        </div>
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-500">
                    No manual exception fallback requests queued.
                  </td>
                </tr>
              ) : (
                paginatedList.map((ex) => (
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

        {/* Clean Pagination Bar */}
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span>
              Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to{' '}
              {Math.min(page * pageSize, filtered.length)} of {filtered.length} requests
            </span>
            <span className="text-gray-300">|</span>
            <label className="flex items-center gap-1">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-0.5 border border-gray-200 rounded bg-white text-xs"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded border border-gray-200 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded border border-gray-200 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

