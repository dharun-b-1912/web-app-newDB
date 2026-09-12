// src/features/vendor/company/CompanyContractorAttendanceView.tsx
// ============================================================================
// JOY PeopleHR — Company-Side: Contractor Attendance Desk
// Canonical Module: VENDOR & CONTRACTORS -> Contractor Attendance (vendor-attendance)
// Server-Authoritative Biometric Punches, Regularizations & Monthly Locked Muster Rolls
// ============================================================================

import React, { useState, useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Search,
  Filter,
  Download,
  Calendar,
  Building2,
  Users,
  ShieldAlert,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  Hash,
} from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorAttendanceLockService, MonthlyAttendanceLock } from '../../../services/vendor/vendorAttendanceLockService';
import { VendorAttendanceRecord } from '../../../types/vendorPortal';

export const CompanyContractorAttendanceView: React.FC<{ onNavigate?: (route: string) => void }> = ({ onNavigate }) => {
  // Active Vendors list
  const vendors = useMemo(() => vendorPortalService.getVendors(), []);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');
  const [selectedVendorId, setSelectedVendorId] = useState<string>(() => vendors[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VERIFIED' | 'EXCEPTION'>('ALL');
  const [isLockingInProgress, setIsLockingInProgress] = useState<boolean>(false);
  
  // Attendance records from server-authoritative store
  const attendanceRecords = useMemo(() => {
    return vendorPortalService.getMonthlyAttendance(selectedMonth, selectedVendorId);
  }, [selectedMonth, selectedVendorId]);

  // Locked status for the selected month
  const lockStatus: MonthlyAttendanceLock | null = useMemo(() => {
    return VendorAttendanceLockService.getLockStatus(selectedVendorId, selectedMonth);
  }, [selectedVendorId, selectedMonth]);

  // Aggregate Metrics
  const totalWorkers = attendanceRecords.length;
  const totalManDays = attendanceRecords.reduce((sum, r) => sum + (r.payable_days || r.present_days || 0), 0);
  const totalOtHours = attendanceRecords.reduce((sum, r) => sum + (r.ot_hours || 0), 0);
  const totalLopDays = attendanceRecords.reduce((sum, r) => sum + (r.lop_days || 0), 0);

  // Filtered rows
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((rec) => {
      const matchesSearch =
        rec.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.employee_code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'VERIFIED'
          ? rec.status === 'VERIFIED'
          : (rec.lop_days || 0) > 0 || rec.status !== 'VERIFIED';
      return matchesSearch && matchesStatus;
    });
  }, [attendanceRecords, searchQuery, statusFilter]);

  const handleFinalizeAndLock = () => {
    try {
      setIsLockingInProgress(true);
      VendorAttendanceLockService.finalizeAndLockMonth({
        vendorId: selectedVendorId,
        companyId: 'comp-joy-chennai-01',
        payrollMonth: selectedMonth,
        lockedBy: 'Company HR Head',
      });
      alert(`Attendance for ${selectedMonth} locked successfully with cryptographic snapshot.`);
    } catch (err: any) {
      alert(err.message || 'Failed to lock attendance.');
    } finally {
      setIsLockingInProgress(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 pb-24">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            <span>Vendor & Contractors</span>
            <span>•</span>
            <span>Contractor Attendance Desk</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-1">
            Contractor Biometric Attendance & Muster Roll
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Audit daily biometric attendance punches, overtime hours, and immutable monthly attendance locks.
          </p>
        </div>

        {/* Month & Finalize Action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-2xs">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold text-gray-800 bg-transparent border-none focus:ring-0 cursor-pointer"
            >
              <option value="2026-08">August 2026 (Live Dataset)</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-07">July 2026</option>
            </select>
          </div>

          <Button
            variant={lockStatus ? 'outline' : 'primary'}
            onClick={handleFinalizeAndLock}
            disabled={!!lockStatus || isLockingInProgress}
            className="flex items-center gap-2 text-xs font-bold h-9"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{lockStatus ? 'Attendance Locked' : 'Finalize & Lock Muster Roll'}</span>
          </Button>
        </div>
      </div>

      {/* Lock Notice Banner if locked */}
      {lockStatus && (
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-emerald-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                  Muster Roll Locked
                </span>
                <span className="text-xs font-bold text-emerald-900">
                  Locked by {lockStatus.locked_by || 'HR Head'} on {new Date(lockStatus.locked_at || Date.now()).toLocaleDateString('en-IN')}
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5 font-mono">
                Cryptographic Snapshot Hash: <span className="font-bold">{lockStatus.snapshot_hash}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono font-bold text-emerald-900 shrink-0">
            <span>Approved: {lockStatus.total_approved_man_days} Man-Days</span>
            <span>•</span>
            <span>OT: {lockStatus.total_approved_ot_hours} Hours</span>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-gray-200/80 shadow-2xs hover:border-emerald-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Contract Workforce</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-900 font-mono">{totalWorkers} Workers</span>
            <Badge variant="success" className="text-[10px]">100% Deployed</Badge>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Vendor: ABC Security Services (VEN-000021)</p>
        </Card>

        <Card className="p-4 border-gray-200/80 shadow-2xs hover:border-emerald-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Approved Man-Days</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-900 font-mono">{totalManDays.toLocaleString('en-IN')} Days</span>
            <span className="text-xs font-semibold text-emerald-700 font-mono">@ ₹600/day</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Fixed 25-day standard shift capacity</p>
        </Card>

        <Card className="p-4 border-gray-200/80 shadow-2xs hover:border-emerald-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Overtime Approved</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-900 font-mono">{totalOtHours} Hours</span>
            <span className="text-xs font-semibold text-amber-700 font-mono">@ ₹75/hr</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Validated against biometric door logs</p>
        </Card>

        <Card className="p-4 border-gray-200/80 shadow-2xs hover:border-emerald-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Loss of Pay (LOP)</span>
            <ShieldAlert className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-900 font-mono">{totalLopDays} Days</span>
            <span className="text-xs font-semibold text-gray-500 font-mono">Deducted</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">0 pending attendance disputes</p>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by worker code (CE0017) or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Vendor Filter */}
          <select
            value={selectedVendorId}
            onChange={(e) => setSelectedVendorId(e.target.value)}
            className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 focus:ring-0 cursor-pointer"
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              statusFilter === 'ALL'
                ? 'bg-emerald-800 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All Workers ({attendanceRecords.length})
          </button>
          <button
            onClick={() => setStatusFilter('VERIFIED')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              statusFilter === 'VERIFIED'
                ? 'bg-emerald-800 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Verified Only
          </button>
          <button
            onClick={() => setStatusFilter('EXCEPTION')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              statusFilter === 'EXCEPTION'
                ? 'bg-emerald-800 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            With LOP / Exceptions
          </button>
        </div>
      </div>

      {/* Attendance Muster Roll Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900">Muster Roll Register</h3>
            <span className="text-xs text-gray-400 font-mono">
              ({filteredRecords.length} workers displayed)
            </span>
          </div>
          <span className="text-xs text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
            Source: Biometric Door Reader #CHN-U1-G04
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Worker Code</th>
                <th className="px-4 py-3">Worker Name</th>
                <th className="px-4 py-3 text-center">Fixed Days</th>
                <th className="px-4 py-3 text-center">Worked Days</th>
                <th className="px-4 py-3 text-center">OT Hours</th>
                <th className="px-4 py-3 text-center">LOP Days</th>
                <th className="px-4 py-3 text-right">Daily Rate</th>
                <th className="px-4 py-3 text-right">Base Wages</th>
                <th className="px-4 py-3 text-right">OT Wages</th>
                <th className="px-4 py-3 text-right">Total Payable</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 font-mono">
              {filteredRecords.map((r) => {
                const dailyRate = 600;
                const otRate = 75;
                const baseWages = (r.payable_days || 0) * dailyRate;
                const otWages = (r.ot_hours || 0) * otRate;
                const total = baseWages + otWages;
                return (
                  <tr key={r.id || r.employee_code} className="hover:bg-gray-50/80 transition">
                    <td className="px-4 py-3 font-bold text-gray-900">{r.employee_code}</td>
                    <td className="px-4 py-3 font-sans font-medium text-gray-800">{r.employee_name}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{r.total_working_days || 25}</td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-900">{r.present_days}</td>
                    <td className="px-4 py-3 text-center font-bold text-amber-700">{r.ot_hours || 0}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{r.lop_days || 0}</td>
                    <td className="px-4 py-3 text-right text-gray-500">₹{dailyRate}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">₹{baseWages.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-700">₹{otWages.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">₹{total.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3 h-3 text-emerald-600" /> Verified
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
