// src/features/faceAttend/FaceAttendEnrolmentTab.tsx
import React, { useMemo, useState, useEffect } from 'react';
import {
  Check,
  X,
  Trash2,
  Search,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Camera,
  CameraOff,
  UserCheck,
  UserX,
  AlertCircle,
  ShieldCheck,
  Filter,
  Sparkles,
} from 'lucide-react';
import { faceAttendService } from '../../services/faceAttend/faceAttendService';
import type { FaceAttendSubscription, FaceAttendTemplateRecord } from '../../types/faceAttend';
import type { Employee } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

export interface EnrolmentDirectoryRow {
  rowKey: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department: string;
  employee_avatar_url: string | null;
  isEnrolled: boolean;
  enrolment_status: 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'REVOKED' | 'DELETED' | 'NOT_ENROLLED';
  capture_method: string;
  provider_code: string;
  quality_score: number | null;
  consent_status: 'GRANTED' | 'WITHDRAWN' | 'NONE';
  face_attendance_enabled: boolean;
  face_attendance_exemption_reason: string | null;
  template?: FaceAttendTemplateRecord;
}

interface Props {
  templates: FaceAttendTemplateRecord[];
  allEmployees?: Employee[];
  onReloadEmployees?: () => Promise<void>;
  subscription: FaceAttendSubscription | null;
  isAdmin: boolean;
  onApprove: (templateId: string) => Promise<void>;
  onReject: (templateId: string, reason: string) => Promise<void>;
  onRevoke: (templateId: string, reason: string) => Promise<void>;
  onDeleteBiometrics: (employeeId: string) => Promise<void>;
}

export const FaceAttendEnrolmentTab: React.FC<Props> = ({
  templates,
  allEmployees,
  onReloadEmployees,
  subscription,
  isAdmin,
  onApprove,
  onReject,
  onRevoke,
  onDeleteBiometrics,
}) => {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>(allEmployees || []);

  // Filter & Pagination States
  const [cadenceTab, setCadenceTab] = useState<'ALL' | 'ENROLLED' | 'NOT_ENROLLED' | 'EXEMPTED' | 'PENDING'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Inspect Modal State
  const [inspectTpl, setInspectTpl] = useState<FaceAttendTemplateRecord | null>(null);
  const [inspectPhotos, setInspectPhotos] = useState<Array<{ label: string; url: string }>>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [confirmEraseTpl, setConfirmEraseTpl] = useState<FaceAttendTemplateRecord | null>(null);

  // Dedicated Camera Exemption Modal State
  const [exemptModalTarget, setExemptModalTarget] = useState<EnrolmentDirectoryRow | null>(null);
  const [customExemptReason, setCustomExemptReason] = useState('Phone camera broken / damaged');

  // Load employees from API if not provided
  useEffect(() => {
    if (allEmployees && allEmployees.length > 0) {
      setEmployees(allEmployees);
    } else {
      let isMounted = true;
      api
        .getEmployees()
        .then((list) => {
          if (isMounted && list && list.length > 0) {
            setEmployees(list);
          }
        })
        .catch(() => {
          const syncList = api.getEmployeesSync();
          if (isMounted && syncList && syncList.length > 0) {
            setEmployees(syncList);
          }
        });
      return () => {
        isMounted = false;
      };
    }
  }, [allEmployees]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, cadenceTab, pageSize]);

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

  // Build Unified Workforce Directory: Enrolled + Not Enrolled (e.g. Priyanka M N)
  const directoryRows = useMemo<EnrolmentDirectoryRow[]>(() => {
    const rows: EnrolmentDirectoryRow[] = [];
    const handledEmpIds = new Set<string>();

    // 1. Process templates first
    for (const t of templates) {
      const matchedEmp = employees.find(
        (e) => e.id === t.employee_id || (e.employee_code && t.employee_code && e.employee_code.toLowerCase() === t.employee_code.toLowerCase())
      );
      if (matchedEmp) {
        handledEmpIds.add(matchedEmp.id);
      }
      handledEmpIds.add(t.employee_id);

      const isFaceEnabled = matchedEmp?.face_attendance_enabled !== undefined
        ? matchedEmp.face_attendance_enabled
        : (t.face_attendance_enabled ?? true);
      const exemptionReason = matchedEmp?.face_attendance_exemption_reason || t.face_attendance_exemption_reason || null;

      rows.push({
        rowKey: t.id,
        employee_id: t.employee_id,
        employee_name: t.employee_name || matchedEmp?.display_name || matchedEmp?.first_name || 'Employee',
        employee_code: t.employee_code || matchedEmp?.employee_code || '',
        department: t.department || matchedEmp?.department_name || matchedEmp?.department || 'General',
        employee_avatar_url: t.employee_avatar_url || matchedEmp?.avatar_url || null,
        isEnrolled: true,
        enrolment_status: t.enrolment_status,
        capture_method: t.capture_method || 'BUILTIN_FACE_ENGINE',
        provider_code: t.provider_code || 'SELF',
        quality_score: t.quality_score,
        consent_status: t.consent_status,
        face_attendance_enabled: isFaceEnabled,
        face_attendance_exemption_reason: exemptionReason,
        template: t,
      });
    }

    // 2. Process non-enrolled workforce (e.g. Priyanka M N who cannot enroll or has not enrolled)
    for (const emp of employees) {
      if (handledEmpIds.has(emp.id)) continue;
      handledEmpIds.add(emp.id);

      const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.display_name || (emp as any).name || 'Employee';
      const isFaceEnabled = emp.face_attendance_enabled ?? true;
      const exemptionReason = emp.face_attendance_exemption_reason || null;

      rows.push({
        rowKey: `non-enrolled-${emp.id}`,
        employee_id: emp.id,
        employee_name: empName,
        employee_code: emp.employee_code || `WF-${emp.id.slice(0, 6)}`,
        department: emp.department_name || emp.department || 'General',
        employee_avatar_url: emp.avatar_url || null,
        isEnrolled: false,
        enrolment_status: 'NOT_ENROLLED',
        capture_method: 'Not Enrolled',
        provider_code: '—',
        quality_score: null,
        consent_status: 'NONE',
        face_attendance_enabled: isFaceEnabled,
        face_attendance_exemption_reason: exemptionReason,
      });
    }

    return rows;
  }, [templates, employees]);

  // Aggregate Metrics
  const totalEmployeesCount = directoryRows.length;
  const enrolledCount = directoryRows.filter((r) => r.isEnrolled && r.enrolment_status !== 'DELETED').length;
  const notEnrolledCount = directoryRows.filter((r) => !r.isEnrolled).length;
  const cameraExemptedCount = directoryRows.filter((r) => r.face_attendance_enabled === false).length;
  const pendingTemplates = useMemo(
    () => directoryRows.filter((r) => r.enrolment_status === 'PENDING_APPROVAL' && r.template),
    [directoryRows]
  );
  const pendingCount = pendingTemplates.length;

  const maxCap = subscription?.max_enrolled_employees;
  const [batchApproving, setBatchApproving] = useState(false);

  const handleBatchApprove = async () => {
    if (batchApproving || pendingTemplates.length === 0) return;
    setBatchApproving(true);
    try {
      for (const t of pendingTemplates) {
        if (t.template) {
          await onApprove(t.template.id);
        }
      }
      showToast(`✓ Batch approved ${pendingTemplates.length} pending face enrolments`);
      onReloadEmployees?.();
    } finally {
      setBatchApproving(false);
    }
  };

  // Filtered Rows
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return directoryRows.filter((row) => {
      // 1. Cadence Segment Filter
      if (cadenceTab === 'ENROLLED' && !row.isEnrolled) return false;
      if (cadenceTab === 'NOT_ENROLLED' && row.isEnrolled) return false;
      if (cadenceTab === 'EXEMPTED' && row.face_attendance_enabled !== false) return false;
      if (cadenceTab === 'PENDING' && row.enrolment_status !== 'PENDING_APPROVAL') return false;

      // 2. Status Dropdown Filter
      if (statusFilter === 'ALL' && row.enrolment_status === 'DELETED') return false;
      if (statusFilter === 'NOT_ENROLLED' && row.enrolment_status !== 'NOT_ENROLLED') return false;
      if (statusFilter === 'CAMERA_EXEMPTED' && row.face_attendance_enabled !== false) return false;
      if (
        statusFilter !== 'ALL' &&
        statusFilter !== 'NOT_ENROLLED' &&
        statusFilter !== 'CAMERA_EXEMPTED' &&
        row.enrolment_status !== statusFilter
      ) {
        return false;
      }

      // 3. Search Query Filter (name, code, department, reason)
      if (q) {
        const matchName = (row.employee_name || '').toLowerCase().includes(q);
        const matchCode = (row.employee_code || '').toLowerCase().includes(q);
        const matchDept = (row.department || '').toLowerCase().includes(q);
        const matchReason = (row.face_attendance_exemption_reason || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchDept && !matchReason) {
          return false;
        }
      }

      return true;
    });
  }, [directoryRows, cadenceTab, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleAction = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
    } finally {
      setBusyId(null);
    }
  };

  // Open Camera Exemption Modal
  const openExemptModal = (row: EnrolmentDirectoryRow) => {
    setExemptModalTarget(row);
    setCustomExemptReason(row.face_attendance_exemption_reason || 'Phone camera broken / damaged');
  };

  // Confirm Exemption Action (Works for both enrolled and not-enrolled like Priyanka M N)
  const handleConfirmExemption = async () => {
    if (!exemptModalTarget) return;
    const target = exemptModalTarget;
    const reason = customExemptReason.trim() || 'Phone camera broken / damaged';
    setBusyId(target.rowKey);
    try {
      const res = await faceAttendService.toggleEmployeeFaceExemption(target.employee_id, false, reason);
      if (res.ok) {
        setEmployees((prev) =>
          prev.map((e) =>
            e.id === target.employee_id
              ? { ...e, face_attendance_enabled: false, face_attendance_exemption_reason: reason }
              : e
          )
        );
        if (target.template) {
          target.template.face_attendance_enabled = false;
          target.template.face_attendance_exemption_reason = reason;
        }
        showToast(`✓ Camera attendance exempted for ${target.employee_name} (${reason})`, 'success');
        setExemptModalTarget(null);
        onReloadEmployees?.();
      } else {
        showToast(res.error || 'Failed to exempt employee', 'error');
      }
    } finally {
      setBusyId(null);
    }
  };

  // Re-enforce Camera Action
  const handleReEnforceCamera = async (row: EnrolmentDirectoryRow) => {
    setBusyId(row.rowKey);
    try {
      const res = await faceAttendService.toggleEmployeeFaceExemption(row.employee_id, true, null);
      if (res.ok) {
        setEmployees((prev) =>
          prev.map((e) =>
            e.id === row.employee_id
              ? { ...e, face_attendance_enabled: true, face_attendance_exemption_reason: null }
              : e
          )
        );
        if (row.template) {
          row.template.face_attendance_enabled = true;
          row.template.face_attendance_exemption_reason = null;
        }
        showToast(`✓ Camera face verification re-enforced for ${row.employee_name}`, 'success');
        onReloadEmployees?.();
      } else {
        showToast(res.error || 'Failed to re-enforce camera', 'error');
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Governance Overview */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Camera className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold text-gray-900 tracking-tight">
              Workforce Face Enrolment & Camera Governance Directory
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Audit registered face templates and manage camera exemptions. Non-enrolled staff (e.g. damaged device or broken phone camera) can be exempted directly so they are never blocked from clocking.
          </p>
        </div>

        {/* Quick Summary Pill Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Enrolled: {enrolledCount}</span>
            {maxCap && <span className="text-[10px] text-emerald-600 font-normal">/ {maxCap} cap</span>}
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5">
            <UserX className="w-3.5 h-3.5 text-amber-600" />
            <span>Not Enrolled: {notEnrolledCount}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold flex items-center gap-1.5">
            <CameraOff className="w-3.5 h-3.5 text-purple-600" />
            <span>Exempted: {cameraExemptedCount}</span>
          </div>
        </div>
      </div>

      {/* Segmented Quick Filter Navigation Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setCadenceTab('ALL')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              cadenceTab === 'ALL'
                ? "bg-white text-gray-900 shadow-2xs"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            All Staff ({totalEmployeesCount})
          </button>

          <button
            type="button"
            onClick={() => setCadenceTab('ENROLLED')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1",
              cadenceTab === 'ENROLLED'
                ? "bg-white text-emerald-800 shadow-2xs"
                : "text-gray-600 hover:text-emerald-800"
            )}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            Enrolled ({enrolledCount})
          </button>

          <button
            type="button"
            onClick={() => setCadenceTab('NOT_ENROLLED')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1",
              cadenceTab === 'NOT_ENROLLED'
                ? "bg-white text-amber-800 shadow-2xs"
                : "text-gray-600 hover:text-amber-800"
            )}
          >
            <UserX className="w-3.5 h-3.5 text-amber-600" />
            Not Enrolled ({notEnrolledCount})
          </button>

          <button
            type="button"
            onClick={() => setCadenceTab('EXEMPTED')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1",
              cadenceTab === 'EXEMPTED'
                ? "bg-white text-purple-800 shadow-2xs"
                : "text-gray-600 hover:text-purple-800"
            )}
          >
            <CameraOff className="w-3.5 h-3.5 text-purple-600" />
            Camera Exempted ({cameraExemptedCount})
          </button>

          {pendingCount > 0 && (
            <button
              type="button"
              onClick={() => setCadenceTab('PENDING')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1",
                cadenceTab === 'PENDING'
                  ? "bg-amber-100 text-amber-900 shadow-2xs"
                  : "text-amber-700 hover:bg-amber-50"
              )}
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Pending ({pendingCount})
            </button>
          )}
        </div>

        {/* Search & Status Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Priyanka, code, dept..."
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 w-52 sm:w-64"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="NOT_ENROLLED">Not Enrolled</option>
            <option value="CAMERA_EXEMPTED">Camera Exempted</option>
            <option value="ACTIVE">Enrolled: Active</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="REVOKED">Revoked</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {isAdmin && pendingCount > 0 && (
            <button
              disabled={batchApproving}
              onClick={handleBatchApprove}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              {batchApproving ? 'Approving...' : `Approve Pending (${pendingCount})`}
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
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
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <UserX className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <div>No employee records matching current criteria.</div>
                    <p className="text-[11px] text-gray-400 mt-0.5">Try resetting the search or status filter.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.rowKey} className="hover:bg-gray-50/70 transition-colors">
                    {/* Employee Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {row.employee_avatar_url ? (
                          <img
                            src={row.employee_avatar_url}
                            alt={row.employee_name}
                            className="w-7 h-7 rounded-full object-cover border border-gray-200 shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0 border border-emerald-200">
                            {row.employee_name
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((w) => w[0])
                              .join('')
                              .toUpperCase() || 'EM'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 flex items-center gap-1.5 flex-wrap">
                            <span className="truncate">{row.employee_name}</span>
                            {row.face_attendance_enabled === false && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 shrink-0"
                                title={`Camera face verification exempted: ${row.face_attendance_exemption_reason || 'Exempted by HR'}`}
                              >
                                <CameraOff className="w-2.5 h-2.5 text-purple-700" />
                                Camera Exempted
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 font-mono truncate">
                            {row.employee_code} &bull; {row.department}
                          </div>
                          {row.face_attendance_enabled === false && row.face_attendance_exemption_reason && (
                            <div className="text-[10px] text-purple-700 font-medium truncate mt-0.5">
                              Exemption: {row.face_attendance_exemption_reason}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Method / Provider */}
                    <td className="py-3 px-4">
                      {row.isEnrolled ? (
                        <>
                          <div className="text-gray-800 font-medium">{row.capture_method}</div>
                          <div className="text-[11px] text-gray-400 font-mono">{row.provider_code}</div>
                        </>
                      ) : (
                        <span className="text-gray-400 font-mono text-[11px]">Pending Enrolment</span>
                      )}
                    </td>

                    {/* Consent */}
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium",
                          row.consent_status === 'GRANTED'
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        )}
                      >
                        {row.consent_status === 'GRANTED' ? 'Granted (v1.0)' : 'Not Signed'}
                      </span>
                    </td>

                    {/* Quality */}
                    <td className="py-3 px-4 font-mono">
                      {row.quality_score != null ? `${Math.round(row.quality_score * 100)}%` : '—'}
                    </td>

                    {/* Enrolment Status */}
                    <td className="py-3 px-4">
                      {row.enrolment_status === 'NOT_ENROLLED' ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Not Enrolled
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium",
                            row.enrolment_status === 'ACTIVE'
                              ? "bg-emerald-50 text-emerald-700"
                              : row.enrolment_status === 'PENDING_APPROVAL'
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                          )}
                        >
                          {row.enrolment_status}
                        </span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Verify Photos (for enrolled templates) */}
                        {row.template && (
                          <button
                            onClick={() => openPhotoReview(row.template!)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 text-[11px] font-medium cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-gray-500" /> Verify Photos
                          </button>
                        )}

                        {/* Revoke / Approve (for enrolled templates) */}
                        {isAdmin && row.template && row.enrolment_status === 'ACTIVE' && (
                          <button
                            disabled={busyId === row.rowKey}
                            onClick={() =>
                              handleAction(row.rowKey, () =>
                                onRevoke(row.template!.id, 'Administrative revocation by HR')
                              )
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-800 hover:bg-amber-100 text-[11px] font-medium cursor-pointer"
                          >
                            Revoke
                          </button>
                        )}

                        {/* Erase (for enrolled templates) */}
                        {isAdmin && row.template && row.enrolment_status !== 'DELETED' && (
                          <button
                            disabled={busyId === row.rowKey}
                            onClick={() => setConfirmEraseTpl(row.template!)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-rose-100 hover:text-rose-700 text-[11px] font-medium cursor-pointer"
                            title="Withdraw consent and delete stored face template"
                          >
                            <Trash2 className="w-3 h-3" /> Erase
                          </button>
                        )}

                        {/* CAMERA EXEMPTION BUTTON (Available for BOTH enrolled and non-enrolled!) */}
                        {isAdmin && (
                          <button
                            disabled={busyId === row.rowKey}
                            onClick={() => {
                              if (row.face_attendance_enabled === false) {
                                handleReEnforceCamera(row);
                              } else {
                                openExemptModal(row);
                              }
                            }}
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors cursor-pointer",
                              row.face_attendance_enabled === false
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                            )}
                            title={
                              row.face_attendance_enabled === false
                                ? "Re-enforce Camera Face Verification"
                                : "Exempt employee from camera requirement (e.g. Broken phone camera)"
                            }
                          >
                            {row.face_attendance_enabled === false ? (
                              <>
                                <Camera className="w-3 h-3 text-emerald-600" /> Re-enforce Camera
                              </>
                            ) : (
                              <>
                                <CameraOff className="w-3 h-3 text-slate-500" /> Exempt Camera
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span>
              Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to{' '}
              {Math.min(page * pageSize, filtered.length)} of {filtered.length} employees
            </span>
            <span className="text-gray-300">|</span>
            <label className="flex items-center gap-1">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-0.5 border border-gray-200 rounded bg-white text-xs"
              >
                <option value={15}>15</option>
                <option value={30}>30</option>
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

      {/* DEDICATED CAMERA EXEMPTION MODAL */}
      {exemptModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                  <CameraOff className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900">
                    Exempt from Camera & Face Attendance
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {exemptModalTarget.employee_name} ({exemptModalTarget.employee_code} &bull; {exemptModalTarget.department})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setExemptModalTarget(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-900 leading-relaxed">
              <strong>Permit Non-Camera Attendance:</strong> This employee will be allowed to clock in/out via standard mobile / GPS without taking a live camera selfie or facial verification. Use this when the employee's phone camera is damaged, or device cannot enroll.
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Quick Reason Presets</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Phone camera broken / damaged',
                  'Basic phone / No front camera',
                  'Approved medical / eye condition',
                  'Temporary field device issue',
                  'Exempted by HR Head',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCustomExemptReason(preset)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer",
                      customExemptReason === preset
                        ? "bg-purple-100 text-purple-900 border-purple-300 font-bold"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700">Exemption Reason (Recorded in Audit Ledger)</label>
              <input
                type="text"
                value={customExemptReason}
                onChange={(e) => setCustomExemptReason(e.target.value)}
                placeholder="Enter specific reason..."
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setExemptModalTarget(null)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={busyId === exemptModalTarget.rowKey}
                onClick={handleConfirmExemption}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <CameraOff className="w-3.5 h-3.5" />
                Confirm &amp; Exempt Camera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT ENROLMENT PHOTOS MODAL */}
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

      {/* CONFIRM PERMANENT ERASE MODAL */}
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
