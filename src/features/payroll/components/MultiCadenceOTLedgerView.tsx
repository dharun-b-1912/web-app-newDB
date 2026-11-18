import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../hooks/useTenant';
import {
  DayWiseOTRecord,
  WeekWiseOTSummary,
  MonthWiseOTSummary,
  TenantOTStreamSettings,
} from '../../../types/otCadence';
import { OTCadenceAggregatorService } from '../../../services/payroll/otCadenceAggregatorService';
import { payrollApi } from '../../../services/payrollApi';
import {
  Clock,
  Calendar,
  CalendarDays,
  CalendarRange,
  Zap,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

export const MultiCadenceOTLedgerView: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { organization } = useTenant();
  const orgId = organization?.id || user?.organization_id || '0c621892-e938-4707-9957-13534ea32c19';

  const [activeCadence, setActiveCadence] = useState<'day' | 'week' | 'month'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // August
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2026-08-31');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Tenant Settings
  const [settings, setSettings] = useState<TenantOTStreamSettings>(() =>
    OTCadenceAggregatorService.getTenantSettings(orgId)
  );

  // Data States
  const [dayRecords, setDayRecords] = useState<DayWiseOTRecord[]>([]);
  const [weekSummary, setWeekSummary] = useState<WeekWiseOTSummary[]>([]);
  const [monthSummary, setMonthSummary] = useState<MonthWiseOTSummary | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [days, weeks, month] = await Promise.all([
        OTCadenceAggregatorService.getDayWiseOTLedger(orgId, startDate, endDate),
        OTCadenceAggregatorService.getWeekWiseOTSummary(orgId, selectedYear, selectedMonth),
        OTCadenceAggregatorService.getMonthWiseOTSummary(orgId, selectedYear, selectedMonth, 'August 2026'),
      ]);
      setDayRecords(days);
      setWeekSummary(weeks);
      setMonthSummary(month);
    } catch (e: any) {
      showToast(e.message || 'Failed to load OT ledger', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId, startDate, endDate, selectedYear, selectedMonth]);

  const handleToggleStreamMode = () => {
    const newMode = settings.stream_mode === 'SEPARATE_STREAMS' ? 'UNIFIED' : 'SEPARATE_STREAMS';
    const updated: TenantOTStreamSettings = {
      ...settings,
      stream_mode: newMode,
      ot_disbursal_cadence: newMode === 'SEPARATE_STREAMS' ? 'MONTH_END_SEPARATE' : 'UNIFIED_CYCLE',
      updated_at: new Date().toISOString(),
    };
    setSettings(updated);
    OTCadenceAggregatorService.saveTenantSettings(updated);
    showToast(
      newMode === 'SEPARATE_STREAMS'
        ? '✓ Dual-Stream Payroll Mode Activated (Electra EV / Industrial Model)'
        : '✓ Unified Single-Slip Payroll Mode Activated (Corporate Standard)',
      'success'
    );
  };

  // Filtered Day Records
  const filteredDays = useMemo(() => {
    if (!searchQuery.trim()) return dayRecords;
    const q = searchQuery.toLowerCase();
    return dayRecords.filter(
      (d) =>
        d.employee_name.toLowerCase().includes(q) ||
        d.employee_code.toLowerCase().includes(q) ||
        d.department.toLowerCase().includes(q)
    );
  }, [dayRecords, searchQuery]);

  // Aggregate Metrics
  const totalOtHours = monthSummary?.total_ot_hours ?? dayRecords.reduce((acc, d) => acc + d.overtime_hours, 0);
  const totalOtPayout = monthSummary?.total_ot_amount ?? dayRecords.reduce((acc, d) => acc + d.day_ot_amount, 0);
  const uniqueEarners = monthSummary?.total_employees ?? new Set(dayRecords.map((d) => d.employee_id)).size;

  const handle1ClickDisburse = async () => {
    setIsLoading(true);
    try {
      const run = await payrollApi.calculatePayrollRun(
        'August 2026',
        startDate,
        endDate,
        '2026-08-31',
        orgId,
        'OT_SETTLEMENT_ONLY'
      );
      showToast(`⚡ Created Dedicated OT Settlement Run (${run.run_number}) for ₹${(run.total_net_payout || 0).toLocaleString('en-IN')}`, 'success');
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Settlement run creation failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Enterprise Toggle */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-black text-gray-900 tracking-tight">
              Biometric Overtime (OT) Multi-Cadence Ledger
            </h2>
            <Badge
              variant={settings.stream_mode === 'SEPARATE_STREAMS' ? 'warning' : 'success'}
              className="font-bold text-[10px] uppercase"
            >
              {settings.stream_mode === 'SEPARATE_STREAMS' ? 'Dual-Stream Active' : 'Unified Stream'}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Authoritative overtime hours derived directly from verified biometric & mobile punches. Compliant with <strong>Factories Act 1948 (16h/week statutory cap)</strong> and <strong>Electra EV dual-stream disbursal</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={handleToggleStreamMode}
            className={cn(
              "font-bold text-xs shadow-2xs cursor-pointer",
              settings.stream_mode === 'SEPARATE_STREAMS'
                ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
          >
            <Building2 className="w-3.5 h-3.5 mr-1 text-amber-700" />
            {settings.stream_mode === 'SEPARATE_STREAMS'
              ? 'Mode: Electra EV (Dual-Stream)'
              : 'Mode: Unified Single Run'}
          </Button>

          <Button
            size="sm"
            onClick={handle1ClickDisburse}
            disabled={isLoading || totalOtHours === 0}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 mr-1" />
            1-Click Settle via OT Run
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Punch OT Hours</div>
          <div className="text-2xl font-black text-gray-900 mt-1 font-mono">{totalOtHours.toFixed(1)} hrs</div>
          <div className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> 100% verified device punches
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total OT Disbursal Liability</div>
          <div className="text-2xl font-black text-amber-800 mt-1 font-mono">₹ {Math.round(totalOtPayout).toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-gray-500 mt-1">Excludes PF deduction basis</div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Unique OT Earners</div>
          <div className="text-2xl font-black text-gray-900 mt-1 font-mono">{uniqueEarners} Staff</div>
          <div className="text-[10px] text-gray-500 mt-1">Industrial & Plant Shifts</div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Statutory Factories Cap</div>
          <div className="text-2xl font-black text-emerald-800 mt-1 font-mono">16h / week</div>
          <div className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Audit Compliant
          </div>
        </div>
      </div>

      {/* Cadence Navigation Pills & Period Filter */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveCadence('day')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeCadence === 'day'
                ? "bg-white text-gray-900 shadow-2xs"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            Day-Wise Ledger ({dayRecords.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveCadence('week')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeCadence === 'week'
                ? "bg-white text-gray-900 shadow-2xs"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
            Week-Wise Summary ({weekSummary.length} Weeks)
          </button>

          <button
            type="button"
            onClick={() => setActiveCadence('month')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeCadence === 'month'
                ? "bg-white text-gray-900 shadow-2xs"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <CalendarRange className="w-3.5 h-3.5 text-emerald-600" />
            Month-Wise Disbursal
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold">
            <span>Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                const dt = new Date(e.target.value);
                setSelectedYear(dt.getFullYear());
                setSelectedMonth(dt.getMonth() + 1);
              }}
              className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono"
            />
          </div>

          <Button
            size="xs"
            variant="secondary"
            onClick={loadData}
            disabled={isLoading}
            className="cursor-pointer"
          >
            <RefreshCw className={cn("w-3 h-3 mr-1", isLoading && "animate-spin")} />
            Sync
          </Button>
        </div>
      </div>

      {/* CADENCE 1: DAY-WISE LEDGER */}
      {activeCadence === 'day' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div className="font-bold text-gray-900 text-xs">
              Daily Attendance Punch Overtime Ledger ({filteredDays.length} Records)
            </div>
            <input
              type="text"
              placeholder="Search employee, ID, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs w-64"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Shift & Timings</th>
                  <th className="py-2.5 px-3">Punch Window</th>
                  <th className="py-2.5 px-3 text-right">OT Mins</th>
                  <th className="py-2.5 px-3 text-right">OT Hours</th>
                  <th className="py-2.5 px-3 text-right">Rate & Mult</th>
                  <th className="py-2.5 px-3 text-right">OT Payable</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDays.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-400">
                      No daily punch overtime records found for this period.
                    </td>
                  </tr>
                ) : (
                  filteredDays.map((rec) => (
                    <tr key={rec.id} className="hover:bg-amber-50/20">
                      <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{rec.date}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-gray-900">{rec.employee_name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{rec.employee_code} &bull; {rec.department}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-gray-800">{rec.shift_name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{rec.shift_start} - {rec.shift_end}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-gray-700">
                        {rec.first_check_in || '—'} → {rec.last_check_out || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-600">{rec.overtime_minutes}m</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">{rec.overtime_hours.toFixed(1)}h</td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-600">₹{rec.hourly_rate}/h ({rec.multiplier}x)</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-gray-900">₹ {rec.day_ot_amount.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                          rec.settlement_status === 'SETTLED'
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        )}>
                          {rec.settlement_status === 'SETTLED' ? 'Settled' : 'Payable'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CADENCE 2: WEEK-WISE SUMMARY */}
      {activeCadence === 'week' && (
        <div className="space-y-4">
          {weekSummary.map((week) => (
            <div key={week.week_number} className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-gray-900 text-xs">
                    Statutory Workweek {week.week_number}: {week.week_start_date} to {week.week_end_date}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    Factories Act 1948 Weekly Audit &bull; Cap: 16.0h max OT per week
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>OT Hours: <strong className="text-amber-800">{week.total_ot_hours.toFixed(1)}h</strong></div>
                  <div>Weekly Disbursal: <strong className="text-[#07563D]">₹ {week.total_ot_amount.toLocaleString('en-IN')}</strong></div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Employee</th>
                      <th className="py-2.5 px-3 text-right">Punch OT Hours</th>
                      <th className="py-2.5 px-3 text-right">Weekly OT Amount</th>
                      <th className="py-2.5 px-3 text-center">16h Statutory Cap</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {week.employee_summaries.map((emp) => (
                      <tr key={emp.employee_id} className="hover:bg-blue-50/20">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-gray-900">{emp.employee_name}</div>
                          <div className="text-[10px] text-gray-500 font-mono">{emp.employee_code} &bull; {emp.department}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">{emp.total_ot_hours.toFixed(1)}h</td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-gray-900">₹ {emp.total_ot_amount.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-center">
                          {emp.is_cap_exceeded ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              Capped @ 16h
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Within Limit
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CADENCE 3: MONTH-WISE SUMMARY & 1-CLICK DISBURSAL */}
      {activeCadence === 'month' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-gray-900 text-xs">
                Monthly Biometric Overtime Disbursal Roll ({monthSummary?.employee_summaries.length || 0} Staff)
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                Ready for independent settlement voucher or combined unified disbursement
              </div>
            </div>

            <Button
              size="xs"
              onClick={handle1ClickDisburse}
              disabled={isLoading || totalOtHours === 0}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 mr-1" />
              Generate Dedicated OT Run
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3 text-right">OT Days</th>
                  <th className="py-2.5 px-3 text-right">Punch OT Hours</th>
                  <th className="py-2.5 px-3 text-right">Statutory Hourly Rate</th>
                  <th className="py-2.5 px-3 text-right">Gross OT Pay</th>
                  <th className="py-2.5 px-3 text-right">Net OT Payout</th>
                  <th className="py-2.5 px-3 text-center">Settlement Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!monthSummary || monthSummary.employee_summaries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">
                      No monthly overtime records available.
                    </td>
                  </tr>
                ) : (
                  monthSummary.employee_summaries.map((emp) => (
                    <tr key={emp.employee_id} className="hover:bg-emerald-50/20">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-gray-900">{emp.employee_name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{emp.employee_code} &bull; {emp.department}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">{emp.total_ot_days} Days</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">{emp.approved_ot_hours.toFixed(1)}h</td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-600">₹ {Math.round(emp.effective_ot_rate)}/h</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">₹ {emp.gross_ot_amount.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-[#07563D]">₹ {emp.net_ot_payout.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                          emp.settlement_status === 'SETTLED'
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        )}>
                          {emp.settlement_status === 'SETTLED' ? 'Disbursed' : 'Pending Disbursal'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => {
                            showToast(`Voucher for ${emp.employee_name}: ₹${emp.net_ot_payout.toLocaleString('en-IN')} (Hours: ${emp.approved_ot_hours}h)`);
                          }}
                          className="cursor-pointer"
                        >
                          View Voucher
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
