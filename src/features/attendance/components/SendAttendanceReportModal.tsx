// src/features/attendance/components/SendAttendanceReportModal.tsx
// ============================================================================
// Joy PeopleHR Enterprise — Send Attendance & Punching Report Modal
// Supports Auto-Detected HR Emails, Organization Employee Directory,
// Manual Immediate Dispatch, and Particular Scheduled Time Automation
// ============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  Mail,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Eye,
  Building2,
  Clock,
  Users,
  Check,
  Download,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  Info,
  ChevronRight,
  ShieldCheck,
  Search,
  UserCheck,
  Briefcase,
  Play,
  RotateCw,
  Bell,
  Settings,
  History,
  Timer,
  Sun,
  Moon,
  MessageSquare,
  Phone,
  Shield,
  Share2,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import {
  AttendanceReportRow,
  EmployeePeriodSummary,
  attendanceReportExportService,
  computeEmployeeOvertime,
} from '../../../services/attendance/attendanceReportExportService';
import { supabase } from '../../../lib/supabase';
import { attendanceReportEmailService } from '../../../services/attendance/attendanceReportEmailService';
import { attendanceReportContactService, RecipientContact } from '../../../services/attendance/attendanceReportContactService';
import {
  attendanceReportSchedulerService,
  AttendanceReportScheduleConfig,
  ScheduleRunLog,
} from '../../../services/attendance/attendanceReportSchedulerService';
import { ClassifiedPunchEvent } from '../../../services/attendance/attendanceClassificationEngine';
import { formatMinutesToHoursStr } from '../../../lib/attendance/attendanceEngine';
import { api } from '../../../services/api';
import { normalizeIndianPhone } from '../../../services/whatsapp/phoneUtils';
import { MisRecipientsManagementView } from './MisRecipientsManagementView';
import { misRecipientsService } from '../../../services/attendance/misRecipientsService';

// ============================================================================
// 12-Hour Time Helpers & Interactive 12-Hour Selector
// ============================================================================
export function formatTo12Hour(time24: string): string {
  if (!time24) return '12:00 PM';
  const parts = time24.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] ? parts[1].padStart(2, '0') : '00';
  if (isNaN(h)) h = 12;
  const period = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${String(h12).padStart(2, '0')}:${m} ${period}`;
}

export function convert12to24(hour12: number, minute: number, period: 'AM' | 'PM'): string {
  let h = hour12 % 12;
  if (period === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function deconstructTimeTo12(time24: string): { hour12: number; minute: number; period: 'AM' | 'PM' } {
  if (!time24) return { hour12: 12, minute: 0, period: 'PM' };
  const parts = time24.split(':');
  let h = parseInt(parts[0], 10);
  if (isNaN(h)) h = 12;
  const m = parseInt(parts[1], 10) || 0;
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute: m, period };
}

const TimePicker12: React.FC<{
  value24: string;
  onChange: (val24: string) => void;
  colorScheme?: 'morning' | 'evening';
}> = ({ value24, onChange, colorScheme = 'morning' }) => {
  const { hour12, minute, period } = deconstructTimeTo12(value24);
  const activeColor = colorScheme === 'morning' ? 'bg-amber-600 text-white' : 'bg-indigo-600 text-white';

  return (
    <div className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg p-1.5 shadow-2xs">
      <select
        value={hour12}
        onChange={e => onChange(convert12to24(Number(e.target.value), minute, period))}
        aria-label="Hour (1-12)"
        className="bg-white border border-gray-200 rounded px-1.5 py-1 text-xs font-bold text-gray-900 focus:outline-emerald-600 cursor-pointer"
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
          <option key={h} value={h}>
            {String(h).padStart(2, '0')}
          </option>
        ))}
      </select>
      <span className="font-bold text-gray-400">:</span>
      <select
        value={minute}
        onChange={e => onChange(convert12to24(hour12, Number(e.target.value), period))}
        aria-label="Minute (00-55)"
        className="bg-white border border-gray-200 rounded px-1.5 py-1 text-xs font-bold text-gray-900 focus:outline-emerald-600 cursor-pointer"
      >
        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
          <option key={m} value={m}>
            {String(m).padStart(2, '0')}
          </option>
        ))}
      </select>
      <div className="flex rounded-md border border-gray-200 bg-white p-0.5 ml-0.5">
        <button
          type="button"
          onClick={() => onChange(convert12to24(hour12, minute, 'AM'))}
          className={`px-2 py-0.5 text-[10px] font-black rounded transition-all ${
            period === 'AM'
              ? activeColor + ' shadow-2xs'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          AM
        </button>
        <button
          type="button"
          onClick={() => onChange(convert12to24(hour12, minute, 'PM'))}
          className={`px-2 py-0.5 text-[10px] font-black rounded transition-all ${
            period === 'PM'
              ? activeColor + ' shadow-2xs'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          PM
        </button>
      </div>
      <span className="text-[11px] font-extrabold text-gray-800 ml-1 px-1.5 py-0.5 bg-white border border-gray-200 rounded shadow-2xs">
        {formatTo12Hour(value24)}
      </span>
    </div>
  );
};

export interface SendAttendanceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredRows: AttendanceReportRow[];
  allRows: AttendanceReportRow[];
  selectedIds?: Set<string>;
  reportDate: string;
  companyName?: string;
  punches?: ClassifiedPunchEvent[];
}

export const SendAttendanceReportModal: React.FC<SendAttendanceReportModalProps> = ({
  isOpen,
  onClose,
  filteredRows,
  allRows,
  selectedIds = new Set(),
  reportDate,
  companyName = 'Joy Corporate Solutions',
  punches = [],
}) => {
  const { showToast } = useToast();

  // Active Tab: 'DISPATCH' (Manual Send) | 'SCHEDULE' (Automated Time Dispatch) | 'RECIPIENTS' (Access Control) | 'PREVIEW'
  const [activeTab, setActiveTab] = useState<'DISPATCH' | 'SCHEDULE' | 'RECIPIENTS' | 'PREVIEW'>('DISPATCH');

  // Report Period Selection: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  const [reportPeriod, setReportPeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');

  // Daily Sub-Slot Selection: Morning Check-In Turnout vs Evening Check-Out Final
  const [dailySlot, setDailySlot] = useState<'MORNING_CHECKIN' | 'EVENING_FINAL'>(() => {
    const currentHour = new Date().getHours();
    return currentHour < 14 ? 'MORNING_CHECKIN' : 'EVENING_FINAL';
  });

  // Effective report format passed to export services & dispatch
  const reportFormat: 'MORNING_CHECKIN' | 'EVENING_FINAL' | 'WEEKLY' | 'MONTHLY' =
    reportPeriod === 'DAILY' ? dailySlot : reportPeriod;

  // Active Company Payroll Billing Cycle & Periodic Realtime Ledgers
  const [payrollCycle, setPayrollCycle] = useState<{
    name: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    workingDays: number;
  } | null>(null);

  const [weeklyLedger, setWeeklyLedger] = useState<EmployeePeriodSummary[]>([]);
  const [monthlyLedger, setMonthlyLedger] = useState<EmployeePeriodSummary[]>([]);
  const [isLoadingPeriodicData, setIsLoadingPeriodicData] = useState(false);

  const getSubjectForFormat = (
    period: 'DAILY' | 'WEEKLY' | 'MONTHLY',
    slot?: 'MORNING_CHECKIN' | 'EVENING_FINAL'
  ) => {
    if (period === 'DAILY') {
      if (slot === 'MORNING_CHECKIN') {
        return `[Joy PeopleHR] Morning Check-In & Turnout Status Report — ${reportDate} (${companyName})`;
      }
      return `[Joy PeopleHR] End-of-Day Final Attendance & Working Hours Report — ${reportDate} (${companyName})`;
    }
    if (period === 'WEEKLY') {
      return `[Joy PeopleHR] Weekly HR Intelligence & Turnout Trend MIS Report — ${reportDate} (${companyName})`;
    }
    return `[Joy PeopleHR] Monthly Workforce Governance & Statutory Payroll Reconciliation MIS Report — ${payrollCycle?.name || 'October 2026'} (${companyName})`;
  };

  const getNoteForFormat = (
    period: 'DAILY' | 'WEEKLY' | 'MONTHLY',
    slot?: 'MORNING_CHECKIN' | 'EVENING_FINAL'
  ) => {
    if (period === 'DAILY') {
      if (slot === 'MORNING_CHECKIN') {
        return `Please review the morning workforce check-in status, on-time arrivals, and pending punches for ${reportDate}. Biometric and mobile punches have been verified.`;
      }
      return `Please review the daily workforce attendance summary and verified biometric machine punch logs. All shifts and check-in variances have been audited.`;
    }
    if (period === 'WEEKLY') {
      return `Please review the 7-day attendance trend, repeated punctuality violations, workforce overtime distribution, and comprehensive weekly master ledger for executive review.`;
    }
    return `Executive governance and statutory compliance MIS audit based on active company payroll billing cycle. Contains verified monthly attendance ledger, headcount movement, and 20h overtime regulatory limits for print & management sign-off.`;
  };

  const handleSelectPeriod = (period: 'DAILY' | 'WEEKLY' | 'MONTHLY') => {
    setReportPeriod(period);
    setSubject(getSubjectForFormat(period, dailySlot));
    setCustomNote(getNoteForFormat(period, dailySlot));
  };

  const handleSelectDailySlot = (slot: 'MORNING_CHECKIN' | 'EVENING_FINAL') => {
    setDailySlot(slot);
    setSubject(getSubjectForFormat('DAILY', slot));
    setCustomNote(getNoteForFormat('DAILY', slot));
  };

  // Directory & Contact State
  const [contacts, setContacts] = useState<RecipientContact[]>([]);
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryFilter, setDirectoryFilter] = useState<'ALL' | 'HR' | 'MANAGEMENT' | 'EMPLOYEE'>('ALL');
  const [isStaffDirectoryOpen, setIsStaffDirectoryOpen] = useState(false);

  // Manual Dispatch State
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [ccEmail, setCcEmail] = useState('');

  // Scope: 'FILTERED' | 'ALL' | 'SELECTED'
  const hasSelected = selectedIds.size > 0;
  const [scope, setScope] = useState<'FILTERED' | 'ALL' | 'SELECTED'>(hasSelected ? 'SELECTED' : 'FILTERED');

  // Delivery Channel: 'EMAIL' | 'WHATSAPP' | 'EMAIL_AND_WHATSAPP'
  const [deliveryChannel, setDeliveryChannel] = useState<'EMAIL' | 'WHATSAPP' | 'EMAIL_AND_WHATSAPP'>('EMAIL_AND_WHATSAPP');

  // WhatsApp Recipient Configuration State
  const [whatsAppRecipientList, setWhatsAppRecipientList] = useState<Array<{
    phone: string;
    name: string;
    role: string;
    employeeId?: string;
  }>>([
    { phone: '919840209900', name: 'Executive Leadership (Director)', role: 'Authorized Management' },
  ]);
  const [whatsAppPhoneInput, setWhatsAppPhoneInput] = useState('');
  const [showConfirmDispatchModal, setShowConfirmDispatchModal] = useState(false);
  const [detailedDeliveryResults, setDetailedDeliveryResults] = useState<any | null>(null);

  // Inclusions
  const [includePunches, setIncludePunches] = useState(true);
  const [includeShiftBreakdown, setIncludeShiftBreakdown] = useState(true);
  const [attachPdf, setAttachPdf] = useState(true);
  const [attachExcel, setAttachExcel] = useState(true);
  const [attachCsv, setAttachCsv] = useState(true);
  const [sentChecksum, setSentChecksum] = useState<string | null>(null);

  // Message & Subject
  const [subject, setSubject] = useState(() =>
    getSubjectForFormat('DAILY', new Date().getHours() < 14 ? 'MORNING_CHECKIN' : 'EVENING_FINAL')
  );
  const [customNote, setCustomNote] = useState(() =>
    getNoteForFormat('DAILY', new Date().getHours() < 14 ? 'MORNING_CHECKIN' : 'EVENING_FINAL')
  );

  // Status & Progress
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [sentSuccess, setSentSuccess] = useState<{ id: string; deliveredAt: string; recipients: string[]; mode: string } | null>(null);

  // Scheduler State
  const [scheduleConfig, setScheduleConfig] = useState<AttendanceReportScheduleConfig>(() =>
    attendanceReportSchedulerService.getScheduleConfig()
  );
  const [runLogs, setRunLogs] = useState<ScheduleRunLog[]>([]);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isTestingSchedule, setIsTestingSchedule] = useState(false);

  // Schedule Recipient Search & Directory State
  const [scheduleEmailInput, setScheduleEmailInput] = useState('');
  const [scheduleDirectorySearch, setScheduleDirectorySearch] = useState('');
  const [scheduleDirectoryFilter, setScheduleDirectoryFilter] = useState<'ALL' | 'HR' | 'MANAGEMENT' | 'EMPLOYEE'>('ALL');
  const [isScheduleInputFocused, setIsScheduleInputFocused] = useState(false);
  const [isScheduleDirectoryExpanded, setIsScheduleDirectoryExpanded] = useState(true);

  // Initialize Contacts on open without pre-filling recipients
  useEffect(() => {
    if (isOpen) {
      // 1. Refresh contacts from Supabase DB
      attendanceReportContactService.refreshContactsFromDb().then((allContacts) => {
        setContacts(allContacts);
      });

      // Do NOT prefill recipients or CC in manual tab - start completely clean
      setRecipients([]);
      setCcEmail('');

      // 2. Load schedule configuration & logs from Supabase DB
      attendanceReportSchedulerService.loadScheduleConfigAsync().then((sched) => {
        setScheduleConfig(sched);
      });

      // 3. Load authoritative WhatsApp recipients from mis_report_recipients table
      import('../../../services/attendance/misRecipientsService').then(({ misRecipientsService }) => {
        misRecipientsService.getRecipients('0c621892-e938-4707-9957-13534ea32c19').then((list) => {
          const activeWa = list
            .filter((r) => r.is_active && r.delivery_channels.includes('WHATSAPP'))
            .map((r) => ({
              phone: r.phone,
              name: r.name,
              role: r.designation || 'Authorized Recipient',
              employeeId: r.employee_id || undefined,
            }));
          if (activeWa.length > 0) {
            setWhatsAppRecipientList(activeWa);
          }
        });
      });
      attendanceReportSchedulerService.getRunLogsAsync().then((logs) => {
        setRunLogs(logs);
      });

      // 4. Load authentic Company Payroll Period & Attendance Ledgers from DB (Zero mocks)
      const loadPeriodicData = async () => {
        try {
          setIsLoadingPeriodicData(true);
          const orgId = '0c621892-e938-4707-9957-13534ea32c19';
          
          // Query active payroll billing cycle
          const { data: periodRow } = await supabase
            .from('payroll_periods')
            .select('*')
            .eq('organization_id', orgId)
            .order('start_date', { ascending: false })
            .limit(1)
            .maybeSingle();

          const pStart = periodRow?.start_date || `${reportDate.slice(0, 7)}-01`;
          const pEnd = periodRow?.end_date || reportDate;
          const pName = periodRow?.period_name || 'October 2026';

          // Query monthly attendance daily records
          const { data: monthRecs } = await supabase
            .from('attendance_daily')
            .select('*')
            .eq('organization_id', orgId)
            .gte('attendance_date', pStart)
            .lte('attendance_date', reportDate);

          // Query 7-day weekly attendance daily records
          const weeklyDates: string[] = [];
          const [curY, curM, curD] = reportDate.split('-').map(Number);
          for (let i = 6; i >= 0; i--) {
            const d = new Date(Date.UTC(curY, curM - 1, curD));
            d.setUTCDate(d.getUTCDate() - i);
            weeklyDates.push(d.toISOString().split('T')[0]);
          }
          const wStart = weeklyDates[0];

          const { data: weekRecs } = await supabase
            .from('attendance_daily')
            .select('*')
            .eq('organization_id', orgId)
            .gte('attendance_date', wStart)
            .lte('attendance_date', reportDate);

          const distinctWorkDays = Array.from(new Set((monthRecs || []).map((r: any) => r.attendance_date))).length || 23;
          setPayrollCycle({
            name: pName,
            startDate: pStart,
            endDate: pEnd,
            totalDays: 31,
            workingDays: distinctWorkDays,
          });

          // Aggregate monthly master ledger per employee from database
          const empMonthMap = new Map<string, any>();
          (monthRecs || []).forEach((r: any) => {
            const key = r.employee_id || r.employee_code;
            if (!key) return;
            const cur = empMonthMap.get(key) || {
              present: 0,
              half: 0,
              absent: 0,
              late: 0,
              workMins: 0,
              otMins: 0,
            };
            const isPres = r.status === 'PRESENT' || r.status === 'Present' || !!r.first_check_in;
            if (r.status === 'HALF_DAY') cur.half++;
            if (isPres) cur.present++;
            else if (r.status === 'ABSENT') cur.absent++;
            if ((r.late_minutes || 0) > 0) cur.late++;
            cur.workMins += (r.total_work_minutes || r.net_working_minutes || 0);
            cur.otMins += (r.overtime_minutes || 0);
            empMonthMap.set(key, cur);
          });

          const mRows: EmployeePeriodSummary[] = allRows.map((r) => {
            const emp = r.emp;
            const s = empMonthMap.get(emp.id) || empMonthMap.get(emp.employee_code) || {
              present: 0,
              half: 0,
              absent: 0,
              late: 0,
              workMins: 0,
              otMins: 0,
            };
            const attPct = distinctWorkDays > 0 ? Math.round((s.present / distinctWorkDays) * 100) : 0;
            return {
              employeeId: emp.id,
              employeeCode: emp.employee_code || '',
              employeeName: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.display_name || emp.name,
              department: emp.department_name || emp.department || 'General',
              designation: emp.designation_title || emp.designation || 'Staff',
              shift: r.shift?.shift_code || 'GEN-09',
              scheduledDays: distinctWorkDays,
              presentDays: s.present,
              halfDays: s.half,
              absentDays: Math.max(0, distinctWorkDays - s.present),
              lateDays: s.late,
              totalWorkMinutes: s.workMins,
              totalOtMinutes: s.otMins,
              attendancePct: attPct,
            };
          });
          setMonthlyLedger(mRows);

          // Aggregate weekly master ledger per employee from database
          const empWeekMap = new Map<string, any>();
          (weekRecs || []).forEach((r: any) => {
            const key = r.employee_id || r.employee_code;
            if (!key) return;
            const cur = empWeekMap.get(key) || {
              present: 0,
              late: 0,
              workMins: 0,
              otMins: 0,
              dayWiseOt: [0, 0, 0, 0, 0, 0, 0],
            };
            const isPres = r.status === 'PRESENT' || r.status === 'Present' || !!r.first_check_in;
            if (isPres) cur.present++;
            if ((r.late_minutes || 0) > 0) cur.late++;
            cur.workMins += (r.total_work_minutes || r.net_working_minutes || 0);
            cur.otMins += (r.overtime_minutes || 0);
            const dIdx = weeklyDates.indexOf(r.attendance_date);
            if (dIdx >= 0 && dIdx < 7) {
              cur.dayWiseOt[dIdx] = Math.round(((r.overtime_minutes || 0) / 60) * 10) / 10;
            }
            empWeekMap.set(key, cur);
          });

          const wRows: EmployeePeriodSummary[] = allRows.map((r) => {
            const emp = r.emp;
            const s = empWeekMap.get(emp.id) || empWeekMap.get(emp.employee_code) || {
              present: 0,
              late: 0,
              workMins: 0,
              otMins: 0,
              dayWiseOt: [0, 0, 0, 0, 0, 0, 0],
            };
            const attPct = Math.round((s.present / 7) * 100);
            return {
              employeeId: emp.id,
              employeeCode: emp.employee_code || '',
              employeeName: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.display_name || emp.name,
              department: emp.department_name || emp.department || 'General',
              designation: emp.designation_title || emp.designation || 'Staff',
              shift: r.shift?.shift_code || 'GEN-09',
              scheduledDays: 7,
              presentDays: s.present,
              halfDays: 0,
              absentDays: Math.max(0, 7 - s.present),
              lateDays: s.late,
              totalWorkMinutes: s.workMins,
              totalOtMinutes: s.otMins,
              attendancePct: attPct,
              dayWiseOt: s.dayWiseOt,
            };
          });
          setWeeklyLedger(wRows);
        } catch (err) {
          console.warn('Could not load periodic ledger data from Supabase:', err);
        } finally {
          setIsLoadingPeriodicData(false);
        }
      };

      loadPeriodicData();

      // Start scheduler daemon in background
      attendanceReportSchedulerService.initScheduler();
    }
  }, [isOpen]);

  // Target data based on chosen scope
  const targetRows = useMemo(() => {
    if (scope === 'SELECTED' && selectedIds.size > 0) {
      return allRows.filter(r => selectedIds.has(r.emp.id));
    }
    if (scope === 'ALL') {
      return allRows;
    }
    return filteredRows;
  }, [scope, selectedIds, filteredRows, allRows]);

  // Filtered contacts for manual staff directory search
  const filteredContacts = useMemo(() => {
    return attendanceReportContactService.searchContacts(directorySearch, directoryFilter);
  }, [directorySearch, directoryFilter, contacts]);

  // Contact map for fast email -> contact metadata lookup
  const contactsByEmail = useMemo(() => {
    const map = new Map<string, RecipientContact>();
    contacts.forEach(c => {
      if (c.email) map.set(c.email.trim().toLowerCase(), c);
    });
    return map;
  }, [contacts]);

  // Autocomplete suggestions matching user query in schedule recipient search
  const autocompleteScheduleSuggestions = useMemo(() => {
    const q = scheduleEmailInput.trim().toLowerCase();
    if (!q) return [];
    return contacts.filter(c => {
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q) ||
        c.designation.toLowerCase().includes(q)
      );
    }).slice(0, 8);
  }, [scheduleEmailInput, contacts]);

  // Filtered contacts for the automated schedule organization staff directory
  const filteredScheduleDirectoryContacts = useMemo(() => {
    return attendanceReportContactService.searchContacts(scheduleDirectorySearch, scheduleDirectoryFilter);
  }, [scheduleDirectorySearch, scheduleDirectoryFilter, contacts]);

  // Next run calculation
  const nextRunDetails = useMemo(() => {
    return attendanceReportSchedulerService.getNextRunDetails(scheduleConfig);
  }, [scheduleConfig]);

  if (!isOpen) return null;

  // Add recipient helper
  const handleAddEmail = (emailToAdd: string) => {
    const trimmed = emailToAdd.trim();
    if (!trimmed) return;
    const parts = trimmed.split(/[,;\s]+/).filter(Boolean);
    const valid = parts.filter(p => p.includes('@'));
    if (valid.length === 0) {
      showToast('Please enter a valid email address (e.g. hr@company.com)', 'error');
      return;
    }
    setRecipients(prev => Array.from(new Set([...prev, ...valid])));
    setNewEmailInput('');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setRecipients(prev => prev.filter(e => e !== emailToRemove));
  };

  // Select all auto-detected HR team members
  const handleSelectAllHr = () => {
    const hrEmails = contacts.filter(c => c.isHr).map(c => c.email);
    if (hrEmails.length > 0) {
      setRecipients(prev => Array.from(new Set([...prev, ...hrEmails])));
      showToast(`Added ${hrEmails.length} HR email addresses to recipients`, 'info');
    }
  };

  // Toggle contact recipient
  const handleToggleContactRecipient = (email: string) => {
    if (recipients.includes(email)) {
      handleRemoveEmail(email);
    } else {
      handleAddEmail(email);
    }
  };

  // Mask phone number for security display
  const maskPhoneNumber = (rawPhone: string): string => {
    const norm = normalizeIndianPhone(rawPhone);
    if (!norm || norm.length < 10) return rawPhone;
    const last4 = norm.slice(-4);
    const prefix = norm.startsWith('91') ? '+91 ' : '';
    const body = norm.startsWith('91') ? norm.slice(2) : norm;
    return `${prefix}${body.slice(0, 2)}•••• ••${last4.slice(2)}`;
  };

  // Toggle contact for WhatsApp delivery
  const handleToggleWhatsAppContact = (contact: RecipientContact) => {
    if (!contact.phone) {
      showToast(`No registered phone number for ${contact.name}`, 'warning');
      return;
    }
    const norm = normalizeIndianPhone(contact.phone);
    if (!norm) {
      showToast(`Invalid phone format for ${contact.name}: ${contact.phone}`, 'error');
      return;
    }
    const exists = whatsAppRecipientList.some((w) => w.phone === norm);
    if (exists) {
      setWhatsAppRecipientList((prev) => prev.filter((w) => w.phone !== norm));
      showToast(`Removed ${contact.name} from WhatsApp recipients`, 'info');
    } else {
      setWhatsAppRecipientList((prev) => [
        ...prev,
        {
          phone: norm,
          name: contact.name,
          role: contact.designation || (contact.isHr ? 'HR Leadership' : contact.isManager ? 'Manager' : 'Staff'),
        },
      ]);
      showToast(`Added ${contact.name} (${maskPhoneNumber(norm)}) to WhatsApp recipients`, 'success');
    }
  };

  // Add manual WhatsApp recipient
  const handleAddManualWhatsApp = () => {
    const trimmed = whatsAppPhoneInput.trim();
    if (!trimmed) return;
    const norm = normalizeIndianPhone(trimmed);
    if (!norm || norm.length < 10) {
      showToast('Please enter a valid 10-digit Indian phone number (e.g. 9840209900 or +91 98402 09900)', 'error');
      return;
    }
    if (whatsAppRecipientList.some((w) => w.phone === norm)) {
      showToast('This phone number is already added to recipients.', 'info');
      setWhatsAppPhoneInput('');
      return;
    }
    const matchedContact = contacts.find((c) => c.phone && normalizeIndianPhone(c.phone) === norm);
    const name = matchedContact?.name || 'Authorized Recipient';
    const role = matchedContact?.designation || (matchedContact?.isHr ? 'HR Leadership' : 'Manual Entry');

    setWhatsAppRecipientList((prev) => [
      ...prev,
      { phone: norm, name, role },
    ]);
    setWhatsAppPhoneInput('');
    showToast(`Added WhatsApp recipient: ${name} (${maskPhoneNumber(norm)})`, 'success');
  };

  // Remove WhatsApp recipient
  const handleRemoveWhatsAppRecipient = (phone: string) => {
    setWhatsAppRecipientList((prev) => prev.filter((w) => w.phone !== phone));
  };

  // Add recipient to automated schedule
  const handleAddScheduleEmail = (emailOrContact: string | RecipientContact) => {
    const email = typeof emailOrContact === 'string' ? emailOrContact.trim().toLowerCase() : emailOrContact.email.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address (e.g. hr@company.com)', 'error');
      return;
    }
    if (scheduleConfig.recipients.some(r => r.trim().toLowerCase() === email)) {
      showToast('Recipient already added to schedule', 'info');
      setScheduleEmailInput('');
      return;
    }
    const updatedRecipients = Array.from(new Set([...scheduleConfig.recipients, email]));
    const updated = {
      ...scheduleConfig,
      recipients: updatedRecipients,
    };
    setScheduleConfig(updated);
    setScheduleEmailInput('');
    attendanceReportSchedulerService.saveScheduleConfigAsync(updated).catch(() => {});
  };

  const handleToggleScheduleContact = (email: string) => {
    const emailLower = email.trim().toLowerCase();
    const isAdded = scheduleConfig.recipients.some(r => r.trim().toLowerCase() === emailLower);
    const updatedRecipients = isAdded
      ? scheduleConfig.recipients.filter(r => r.trim().toLowerCase() !== emailLower)
      : Array.from(new Set([...scheduleConfig.recipients, emailLower]));

    const updated = {
      ...scheduleConfig,
      recipients: updatedRecipients,
    };
    setScheduleConfig(updated);
    attendanceReportSchedulerService.saveScheduleConfigAsync(updated).catch(() => {});
  };

  const handleSelectAllHrToSchedule = () => {
    const hrEmails = contacts.filter(c => c.isHr).map(c => c.email.trim().toLowerCase());
    if (hrEmails.length > 0) {
      const updated = {
        ...scheduleConfig,
        recipients: Array.from(new Set([...scheduleConfig.recipients, ...hrEmails])),
      };
      setScheduleConfig(updated);
      attendanceReportSchedulerService.saveScheduleConfigAsync(updated).catch(() => {});
      showToast(`Added ${hrEmails.length} HR team members to automated schedule`, 'info');
    }
  };

  // Metrics for active scope
  const totalHeadcount = targetRows.length;
  const presentCount = targetRows.filter(
    r => r.record.status === 'Present' || r.record.status === 'Checked Out' || !!r.record.first_check_in
  ).length;
  const lateCount = targetRows.filter(r => (r.record.late_minutes || 0) > 0 || r.record.status === 'Late').length;
  const notCheckedInCount = targetRows.filter(
    r => (r.record.status === 'Not Checked In' || !r.record.status) && !r.record.first_check_in
  ).length;
  const totalNetMinutes = targetRows.reduce((acc, r) => acc + (r.record.net_working_minutes || 0), 0);
  
  // Accurate overtime metrics: evaluated against shifts, checkouts & 8h thresholds
  const overtimeStats = useMemo(() => {
    let totalMins = 0;
    let count = 0;
    targetRows.forEach(r => {
      const ot = computeEmployeeOvertime(r.record, r.shift);
      if (ot.hasOvertime) {
        totalMins += ot.overtimeMinutes;
        count += 1;
      }
    });
    return {
      totalMins,
      count,
      formattedTotal: formatMinutesToHoursStr(totalMins),
    };
  }, [targetRows]);

  // Local immediate download actions
  const handleDownloadExcel = async () => {
    try {
      const activeFmt = reportPeriod === 'DAILY' ? dailySlot : reportPeriod;
      const typeLabel =
        reportPeriod === 'WEEKLY'
          ? 'Weekly HR Intelligence'
          : reportPeriod === 'MONTHLY'
          ? 'Monthly Workforce Governance'
          : dailySlot === 'MORNING_CHECKIN'
          ? 'Morning Check-In Turnout'
          : 'Daily Attendance';

      showToast(`Generating ${typeLabel} Excel (.xlsx)...`, 'info');
      const res = await attendanceReportExportService.generateExcelWorkbook(targetRows, punches, {
        companyName,
        reportDate,
        includePunches,
        reportType: activeFmt,
        reportPeriod,
        weeklyEmployeeLedger: weeklyLedger,
        monthlyEmployeeLedger: monthlyLedger,
        payrollCycle: payrollCycle ? { periodName: payrollCycle.name, startDate: payrollCycle.startDate, endDate: payrollCycle.endDate, totalDays: payrollCycle.totalDays, workingDays: payrollCycle.workingDays } : undefined,
      });
      attendanceReportExportService.downloadFile(
        res.buffer,
        res.filename,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      showToast(`✓ Downloaded ${res.filename}`, 'success');
    } catch (err: any) {
      showToast(`Error downloading Excel: ${err.message}`, 'error');
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const activeFmt = reportPeriod === 'DAILY' ? dailySlot : reportPeriod;
      const typeLabel =
        reportPeriod === 'WEEKLY'
          ? 'Weekly HR Intelligence'
          : reportPeriod === 'MONTHLY'
          ? 'Monthly Workforce Governance'
          : dailySlot === 'MORNING_CHECKIN'
          ? 'Morning Check-In Turnout'
          : 'Daily Attendance';

      showToast(`Generating ${typeLabel} PDF (.pdf)...`, 'info');
      const res = await attendanceReportExportService.generatePdfDocument(targetRows, punches, {
        companyName,
        reportDate,
        includePunches,
        reportType: activeFmt,
        reportPeriod,
      });
      attendanceReportExportService.downloadFile(
        res.buffer,
        res.filename,
        'application/pdf'
      );
      showToast(`✓ Downloaded ${res.filename}`, 'success');
    } catch (err: any) {
      showToast(`Error downloading PDF: ${err.message}`, 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadCsv = () => {
    try {
      const activeFmt = reportPeriod === 'DAILY' ? dailySlot : reportPeriod;
      const csvStr = attendanceReportExportService.generateCsvContent(targetRows, activeFmt as any);
      const safeComp = companyName.replace(/[^a-zA-Z0-9]/g, '_');
      const filename =
        reportPeriod === 'WEEKLY'
          ? `${safeComp}_Weekly_Attendance_${reportDate}.csv`
          : reportPeriod === 'MONTHLY'
          ? `${safeComp}_Monthly_Attendance_${reportDate}.csv`
          : dailySlot === 'MORNING_CHECKIN'
          ? `${safeComp}_Morning_CheckIn_${reportDate}.csv`
          : `${safeComp}_Daily_Attendance_${reportDate}.csv`;
      attendanceReportExportService.downloadFile(csvStr, filename, 'text/csv;charset=utf-8;');
      showToast(`✓ Downloaded ${filename}`, 'success');
    } catch (err: any) {
      showToast(`Error downloading CSV: ${err.message}`, 'error');
    }
  };

  // Pre-dispatch validation & confirmation trigger
  const handleInitiateSend = () => {
    const wantsEmail = deliveryChannel !== 'WHATSAPP';
    const wantsWhatsApp = deliveryChannel !== 'EMAIL';

    if (wantsEmail && recipients.length === 0) {
      showToast('Please specify at least one recipient email address.', 'error');
      return;
    }
    if (wantsWhatsApp && whatsAppRecipientList.length === 0) {
      showToast('Please specify at least one authorized WhatsApp recipient.', 'error');
      return;
    }

    // Trigger explicit security confirmation modal for confidential MIS reports
    setShowConfirmDispatchModal(true);
  };

  // Manual Send Action (Immediate Dispatch)
  const handleSendManual = async () => {
    setShowConfirmDispatchModal(false);

    const wantsEmail = deliveryChannel !== 'WHATSAPP';
    const wantsWhatsApp = deliveryChannel !== 'EMAIL';

    if (wantsEmail && recipients.length === 0) {
      showToast('Please specify at least one recipient email address.', 'error');
      return;
    }
    if (wantsWhatsApp && whatsAppRecipientList.length === 0) {
      showToast('Please specify at least one authorized WhatsApp recipient.', 'error');
      return;
    }

    setIsSending(true);
    setSentSuccess(null);
    setSentChecksum(null);
    setDetailedDeliveryResults(null);

    try {
      const activeFmt = reportPeriod === 'DAILY' ? dailySlot : reportPeriod;
      const reportName =
        reportPeriod === 'WEEKLY'
          ? 'Weekly HR Intelligence MIS'
          : reportPeriod === 'MONTHLY'
          ? 'Monthly Workforce Governance MIS'
          : dailySlot === 'MORNING_CHECKIN'
          ? 'Morning Check-In Turnout'
          : 'Evening Final Audit';

      showToast(`Generating unified ${reportName} package and dispatching...`, 'info');

      const allTargets = [...recipients];
      if (ccEmail && ccEmail.includes('@') && !allTargets.includes(ccEmail.trim())) {
        allTargets.push(ccEmail.trim());
      }

      const { attendanceMisDeliveryService } = await import(
        '../../../services/attendance/attendanceMisDeliveryService'
      );

      const delivery = await attendanceMisDeliveryService.deliverUnifiedMisReport({
        rows: targetRows,
        punches,
        reportDate,
        reportType: activeFmt,
        companyName,
        scope,
        emailRecipients: wantsEmail ? allTargets : undefined,
        whatsAppRecipients: wantsWhatsApp ? whatsAppRecipientList.map((w) => w.phone) : undefined,
        customNote,
        attachExcel,
        attachCsv,
      });

      setDetailedDeliveryResults(delivery);

      if (delivery.success) {
        setSentSuccess({
          id: delivery.runId,
          deliveredAt: new Date().toLocaleTimeString('en-US', { hour12: true }),
          recipients: [
            ...(wantsEmail ? allTargets : []),
            ...(wantsWhatsApp ? whatsAppRecipientList.map((w) => `${w.name} (${maskPhoneNumber(w.phone)})`) : []),
          ],
          mode: `Unified ${reportName} Dispatch (${deliveryChannel === 'EMAIL' ? 'Email' : deliveryChannel === 'WHATSAPP' ? 'WhatsApp' : 'Email + WhatsApp'})`,
        });
        setSentChecksum(delivery.artifact.sha256Checksum);

        const emailCount = delivery.emailResults.attempted ? delivery.emailResults.recipients.length : 0;
        const waSuccess = delivery.whatsAppResults.deliveries.filter((d) => d.success).length;
        const summaryMsg: string[] = [];
        if (wantsEmail) summaryMsg.push(`Email (${emailCount} delivered)`);
        if (wantsWhatsApp) summaryMsg.push(`WhatsApp (${waSuccess} delivered)`);

        showToast(
          `✓ ${reportName} dispatched! (PDF: ${delivery.artifact.filename}) • ${summaryMsg.join(' • ')}`,
          'success'
        );
      } else {
        const errorList: string[] = [];
        if (delivery.emailResults.error) errorList.push(`Email: ${delivery.emailResults.error}`);
        const waErrors = delivery.whatsAppResults.deliveries.filter((d) => !d.success).map((d) => `${d.phone}: ${d.error}`);
        if (waErrors.length > 0) errorList.push(`WhatsApp: ${waErrors.join(', ')}`);
        if (delivery.rejectedRecipients.length > 0) {
          errorList.push(`Rejected: ${delivery.rejectedRecipients.map((r) => `${r.target} (${r.reason})`).join(', ')}`);
        }
        const errMsg = errorList.join(' | ') || 'Failed to dispatch report to some recipients.';
        throw new Error(errMsg);
      }
    } catch (err: any) {
      showToast(`Dispatch error: ${err.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Save Schedule Config
  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true);
    try {
      const configToSave = {
        ...scheduleConfig,
        whatsAppRecipients: whatsAppRecipientList.map((w) => w.phone),
        attachCsv: false,
      };
      const saved = await attendanceReportSchedulerService.saveScheduleConfigAsync(configToSave);
      setScheduleConfig(saved);
      const mStr = saved.morningEnabled ? formatTo12Hour(saved.morningTime) : 'Disabled';
      const eStr = saved.eveningEnabled ? formatTo12Hour(saved.eveningTime) : 'Disabled';
      showToast(
        `✓ Automated schedule saved: Morning (${mStr}) & Evening (${eStr})`,
        'success'
      );
    } catch (err: any) {
      showToast(`Failed to save schedule: ${err.message}`, 'error');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Test Run Scheduled Dispatch Now (slot: 'MORNING' or 'EVENING')
  const handleTestRunSchedule = async (slot: 'MORNING' | 'EVENING' = 'EVENING') => {
    setIsTestingSchedule(true);
    const slotLabel = slot === 'MORNING' ? 'Morning Check-In Report' : 'Evening Final Report';
    const slotTime = formatTo12Hour(slot === 'MORNING' ? scheduleConfig.morningTime : scheduleConfig.eveningTime);
    showToast(`Triggering immediate test execution of ${slotLabel} (${slotTime})...`, 'info');

    try {
      const res = await attendanceReportSchedulerService.executeDispatch({
        mode: 'MANUAL_TEST',
        slot,
        dateOverride: reportDate,
        rowsOverride: targetRows,
        punchesOverride: punches,
        customRecipients: scheduleConfig.recipients.length > 0 ? scheduleConfig.recipients : ['thirumalai@joyglobalcorp.com'],
        customWhatsAppRecipients: whatsAppRecipientList.map((w) => w.phone),
      });

      if (res.success) {
        setRunLogs(attendanceReportSchedulerService.getRunLogs());
        showToast(`✓ ${slotLabel} delivered successfully to ${res.recipients.join(', ')}!`, 'success');
      } else {
        throw new Error(res.error || 'Test run failed');
      }
    } catch (err: any) {
      showToast(`Schedule test run error: ${err.message}`, 'error');
    } finally {
      setIsTestingSchedule(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 lg:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-4xl xl:max-w-5xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#064E3B] via-[#047857] to-[#065F46] px-6 sm:px-8 py-5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-xs">
              <Mail className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg tracking-tight text-white">Send Attendance &amp; Punch Report to HR</h3>
                {scheduleConfig.enabled && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-300 text-emerald-950 shadow-2xs">
                    <Clock className="w-3 h-3" /> Auto {formatTo12Hour(scheduleConfig.morningTime || '10:30')} &amp; {formatTo12Hour(scheduleConfig.eveningTime || '19:00')}
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-100/90 mt-1 flex items-center gap-2">
                <span className="font-semibold text-white/95">{companyName}</span>
                <span>&bull;</span>
                <span>Date: <strong className="text-white">{reportDate}</strong></span>
                <span>&bull;</span>
                <span>{totalHeadcount} Total Employees</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-all flex items-center justify-center cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Spacious Modern Segmented Design */}
        <div className="border-b border-gray-200/90 bg-slate-50/90 px-6 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 p-1 bg-gray-200/70 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('DISPATCH')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'DISPATCH'
                  ? 'bg-white text-[#064E3B] shadow-xs border border-gray-200/60'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Manually Now</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SCHEDULE')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'SCHEDULE'
                  ? 'bg-white text-[#064E3B] shadow-xs border border-gray-200/60'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Automated Schedule</span>
              <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                scheduleConfig.enabled
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-200/70'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {formatTo12Hour(scheduleConfig.morningTime || '10:30')} &amp; {formatTo12Hour(scheduleConfig.eveningTime || '19:00')}
              </span>
              {scheduleConfig.enabled ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-gray-300" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('RECIPIENTS')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'RECIPIENTS'
                  ? 'bg-white text-[#064E3B] shadow-xs border border-gray-200/60'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>MIS Recipients &amp; WhatsApp Access</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PREVIEW')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'PREVIEW'
                  ? 'bg-white text-[#064E3B] shadow-xs border border-gray-200/60'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Report Data Preview</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-gray-100 text-gray-700">
                {totalHeadcount} Staff
              </span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] text-gray-500 font-semibold bg-white px-3 py-1.5 rounded-lg border border-gray-200/80 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-gray-700">Realtime Punch Sync Active</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
          {sentSuccess ? (
            /* SUCCESS STATE */
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-[#07563D] shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-emerald-950">Report Dispatched Successfully!</h4>
                <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto">
                  The complete attendance ledger and verified punch report have been sent via secure email gateway.
                </p>
              </div>

              <div className="bg-white rounded-xl p-4 border border-emerald-200/80 text-left max-w-lg mx-auto space-y-2.5 text-xs shadow-2xs">
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-gray-500 font-semibold">Mode:</span>
                  <span className="font-bold text-emerald-800">{sentSuccess.mode}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-gray-500 font-semibold">Delivered At:</span>
                  <span className="font-bold text-gray-900">{sentSuccess.deliveredAt}</span>
                </div>

                {/* Email Delivery Breakdown */}
                {detailedDeliveryResults?.emailResults?.attempted && (
                  <div className="py-1.5 border-b border-gray-100 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-semibold flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-emerald-600" /> Email Channel:
                      </span>
                      <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                        detailedDeliveryResults.emailResults.success
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {detailedDeliveryResults.emailResults.success ? 'Delivered' : 'Failed'}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-700 pl-4 space-y-0.5">
                      {detailedDeliveryResults.emailResults.recipients.map((em: string) => (
                        <div key={em} className="truncate">&bull; {em}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* WhatsApp Delivery Breakdown */}
                {detailedDeliveryResults?.whatsAppResults?.attempted && (
                  <div className="py-1.5 border-b border-gray-100 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-semibold flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp Channel:
                      </span>
                      <span className="font-bold text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                        {detailedDeliveryResults.whatsAppResults.deliveries.filter((d: any) => d.success).length} / {detailedDeliveryResults.whatsAppResults.deliveries.length} Delivered
                      </span>
                    </div>
                    <div className="text-[11px] pl-4 space-y-1">
                      {detailedDeliveryResults.whatsAppResults.deliveries.map((d: any) => (
                        <div key={d.phone} className="flex items-center justify-between">
                          <span className="text-gray-800 font-medium">
                            &bull; {d.name} ({maskPhoneNumber(d.phone)})
                          </span>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                            d.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {d.success ? '✓ Sent' : 'Failed'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rejected Recipients if any */}
                {detailedDeliveryResults?.rejectedRecipients?.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                    <div className="font-bold text-[11px] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-700" /> Authorization / Security Restrictions:
                    </div>
                    <div className="space-y-0.5 pl-4 text-[10px] text-amber-800">
                      {detailedDeliveryResults.rejectedRecipients.map((r: any, idx: number) => (
                        <div key={idx}>
                          <span className="font-semibold">{r.target}:</span> {r.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sentChecksum && (
                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                    <span className="text-gray-500 font-semibold">SHA-256 Integrity:</span>
                    <span className="font-mono text-[10px] text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded" title={sentChecksum}>
                      {sentChecksum.slice(0, 16)}...
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-500 font-semibold">Attachments Included:</span>
                  <span className="font-bold text-emerald-700">Landscape PDF (.pdf) &bull; Executive Excel (.xlsx)</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSentSuccess(null)}>
                  Send Another Report
                </Button>
                <Button size="sm" onClick={onClose} className="bg-[#07563D] hover:bg-[#064e37] text-white">
                  Done
                </Button>
              </div>
            </div>
          ) : activeTab === 'DISPATCH' ? (
            /* =========================================================================
               TAB 1: DISPATCH MANUALLY NOW
               ========================================================================= */
            <>
              {/* Report Format Selector: Daily vs Weekly vs Monthly */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-green-50 border border-emerald-200/90 rounded-2xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                    Select Report Dispatch Format &amp; Period:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isLoadingPeriodicData && (
                      <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-semibold animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" /> Syncing Period...
                      </span>
                    )}
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-950 border border-emerald-300">
                      {reportPeriod === 'DAILY'
                        ? (dailySlot === 'MORNING_CHECKIN' ? 'Daily: Morning Turnout' : 'Daily: Evening Final')
                        : reportPeriod === 'WEEKLY'
                        ? 'Period: 7-Day Weekly Trend'
                        : `Monthly Cycle: ${payrollCycle?.name || 'October 2026'}`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Card 1: Daily Attendance MIS */}
                  <div
                    onClick={() => handleSelectPeriod('DAILY')}
                    className={`p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
                      reportPeriod === 'DAILY'
                        ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/30 shadow-xs'
                        : 'bg-white/70 border-emerald-200 hover:bg-white text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="font-extrabold text-xs text-emerald-950 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-emerald-700" />
                        <span>Daily Attendance MIS</span>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        Realtime Punches
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed mb-2">
                      Arrival punctuality, active working hours, verified biometric punches, and shift variances.
                    </p>

                    {/* Sub-Slot Pills for Daily */}
                    <div className="pt-2 border-t border-emerald-100 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPeriod('DAILY');
                          handleSelectDailySlot('MORNING_CHECKIN');
                        }}
                        className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
                          reportPeriod === 'DAILY' && dailySlot === 'MORNING_CHECKIN'
                            ? 'bg-amber-100 text-amber-950 border border-amber-300 font-extrabold'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Sun className="w-3 h-3 text-amber-600" />
                        Morning (~10:30)
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPeriod('DAILY');
                          handleSelectDailySlot('EVENING_FINAL');
                        }}
                        className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
                          reportPeriod === 'DAILY' && dailySlot === 'EVENING_FINAL'
                            ? 'bg-indigo-100 text-indigo-950 border border-indigo-300 font-extrabold'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Moon className="w-3 h-3 text-indigo-600" />
                        Evening (~19:00)
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Weekly HR Intelligence MIS */}
                  <div
                    onClick={() => handleSelectPeriod('WEEKLY')}
                    className={`p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
                      reportPeriod === 'WEEKLY'
                        ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/30 shadow-xs'
                        : 'bg-white/70 border-emerald-200 hover:bg-white text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="font-extrabold text-xs text-emerald-950 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-teal-700" />
                        <span>Weekly HR Intelligence</span>
                      </div>
                      <span className="text-[9px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                        7-Day Trajectory
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      7-day turnout trend, repeated late &amp; absence radar, workforce overtime distribution, and 6-sheet audit ledger.
                    </p>
                    <div className="pt-2 mt-2 border-t border-emerald-100 flex items-center justify-between text-[10px] text-emerald-900 font-bold">
                      <span>Weekly Ledger: {weeklyLedger.length > 0 ? `${weeklyLedger.length} Staff Aggregated` : '7-Day Range'}</span>
                      <span className="text-teal-700">6 Sheets (.xlsx)</span>
                    </div>
                  </div>

                  {/* Card 3: Monthly Workforce Governance MIS */}
                  <div
                    onClick={() => handleSelectPeriod('MONTHLY')}
                    className={`p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
                      reportPeriod === 'MONTHLY'
                        ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/30 shadow-xs'
                        : 'bg-white/70 border-emerald-200 hover:bg-white text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="font-extrabold text-xs text-emerald-950 flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                        <span>Monthly Governance MIS</span>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {payrollCycle?.name || 'October 2026'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      Statutory 20h overtime limit compliance, headcount movement, and employee monthly master ledger for executive sign-off.
                    </p>
                    <div className="pt-2 mt-2 border-t border-emerald-100 flex items-center justify-between text-[10px] text-emerald-900 font-bold">
                      <span>Payroll: {payrollCycle ? `${payrollCycle.startDate} to ${payrollCycle.endDate}` : 'Billing Cycle Active'}</span>
                      <span className="text-emerald-700">Audit Ready</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Channel Selector */}
              <div className="space-y-2 bg-gradient-to-r from-slate-50 to-emerald-50/40 border border-gray-200 rounded-xl p-3.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                    Delivery Channel:
                  </label>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300">
                    {deliveryChannel === 'EMAIL' ? 'Email Gateway' : deliveryChannel === 'WHATSAPP' ? 'WhatsApp Business Cloud' : 'Email + WhatsApp (Dual Channel)'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeliveryChannel('EMAIL')}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      deliveryChannel === 'EMAIL'
                        ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 font-bold text-emerald-950 shadow-xs'
                        : 'bg-white/80 border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      deliveryChannel === 'EMAIL' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs">Email Only</div>
                      <div className="text-[10px] text-gray-500 font-normal">Excel + Landscape PDF</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryChannel('WHATSAPP')}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      deliveryChannel === 'WHATSAPP'
                        ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 font-bold text-emerald-950 shadow-xs'
                        : 'bg-white/80 border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      deliveryChannel === 'WHATSAPP' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs">WhatsApp Only</div>
                      <div className="text-[10px] text-gray-500 font-normal">Direct Document PDF</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryChannel('EMAIL_AND_WHATSAPP')}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      deliveryChannel === 'EMAIL_AND_WHATSAPP'
                        ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 font-bold text-emerald-950 shadow-xs'
                        : 'bg-white/80 border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      deliveryChannel === 'EMAIL_AND_WHATSAPP' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs">Email + WhatsApp</div>
                      <div className="text-[10px] text-gray-500 font-normal">Simultaneous Delivery</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 1. Email Recipients (To & CC) */}
              {deliveryChannel !== 'WHATSAPP' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-emerald-700" />
                      Email Recipients (To): <span className="text-rose-500">*</span>
                      {recipients.length > 0 && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full">
                          {recipients.length} selected
                        </span>
                      )}
                    </label>
                    {recipients.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setRecipients([])}
                        className="text-[10px] font-bold text-gray-400 hover:text-rose-600 transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Recipient tags & input */}
                  <div className="border border-gray-300 rounded-xl p-2.5 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 bg-white min-h-[46px] flex flex-wrap items-center gap-1.5">
                    {recipients.map(r => (
                      <span
                        key={r}
                        className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-950 border border-emerald-300 text-xs px-2.5 py-0.5 rounded-md font-semibold"
                      >
                        <span>{r}</span>
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-rose-600"
                          onClick={() => handleRemoveEmail(r)}
                        />
                      </span>
                    ))}
                    <input
                      type="email"
                      value={newEmailInput}
                      onChange={e => setNewEmailInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          handleAddEmail(newEmailInput);
                        }
                      }}
                      onBlur={() => {
                        if (newEmailInput.trim()) handleAddEmail(newEmailInput);
                      }}
                      placeholder={
                        recipients.length === 0
                          ? 'Select an employee from directory or type email and press Enter...'
                          : 'Add another recipient email...'
                      }
                      className="outline-hidden text-xs text-gray-800 flex-1 min-w-[220px] py-1 bg-transparent"
                    />
                  </div>

                  {/* CC input */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-500 w-8">CC:</span>
                    <input
                      type="email"
                      value={ccEmail}
                      onChange={e => setCcEmail(e.target.value)}
                      placeholder="Optional CC email (e.g. auditor@company.com)..."
                      className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-800 flex-1 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                    {ccEmail && (
                      <button
                        type="button"
                        onClick={() => setCcEmail('')}
                        className="text-gray-400 hover:text-rose-500 text-xs p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 1b. Dedicated WhatsApp Recipients Configuration */}
              {deliveryChannel !== 'EMAIL' && (
                <div className="space-y-3 bg-emerald-50/40 border border-emerald-200/90 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                      Authorized WhatsApp Recipients: <span className="text-rose-500">*</span>
                      {whatsAppRecipientList.length > 0 && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-emerald-200 text-emerald-950 rounded-full">
                          {whatsAppRecipientList.length} recipient{whatsAppRecipientList.length === 1 ? '' : 's'}
                        </span>
                      )}
                    </label>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Meta Approved: daily_mis_report_v1
                    </span>
                  </div>

                  {/* Selected WhatsApp Recipients Cards */}
                  <div className="space-y-1.5">
                    {whatsAppRecipientList.length === 0 ? (
                      <div className="p-3 text-center text-xs text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                        No WhatsApp recipients added. Enter a phone number below or click &ldquo;+ WA&rdquo; in the staff directory.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {whatsAppRecipientList.map((rec) => (
                          <div
                            key={rec.phone}
                            className="flex items-center justify-between bg-white border border-emerald-200 rounded-xl p-2.5 shadow-2xs"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-bold text-xs text-gray-900 truncate flex items-center gap-1.5">
                                <span>{rec.name}</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 font-extrabold border border-emerald-200 shrink-0">
                                  {rec.role}
                                </span>
                              </div>
                              <div className="text-[11px] font-mono text-emerald-800 font-medium">
                                {maskPhoneNumber(rec.phone)}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveWhatsAppRecipient(rec.phone)}
                              className="text-gray-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
                              title="Remove recipient"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Manual Phone Number Input */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={whatsAppPhoneInput}
                        onChange={(e) => setWhatsAppPhoneInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddManualWhatsApp();
                          }
                        }}
                        placeholder="Enter authorized WhatsApp mobile number (e.g. +91 98402 09900 or 9840209900)..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden font-medium"
                      />
                    </div>
                    <Button
                      type="button"
                      size="xs"
                      onClick={handleAddManualWhatsApp}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shrink-0"
                    >
                      + Add Phone
                    </Button>
                  </div>
                </div>
              )}

              {/* Organization Employees Directory */}
              <div className="bg-slate-50 border border-gray-200 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-emerald-700" />
                    Organization Staff Directory ({contacts.length} Employees)
                  </span>
                  <span className="text-[10px] text-gray-500">Click &ldquo;+ To&rdquo; for Email or &ldquo;+ WA&rdquo; for WhatsApp</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={directorySearch}
                      onChange={e => setDirectorySearch(e.target.value)}
                      placeholder="Search employee by name, code, department, email..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden"
                    />
                  </div>

                  {/* Filter category */}
                  <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5 text-[10px] font-bold">
                    {(['ALL', 'HR', 'MANAGEMENT', 'EMPLOYEE'] as const).map(tab => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setDirectoryFilter(tab)}
                        className={`px-2 py-0.5 rounded-md transition-colors ${
                          directoryFilter === tab
                            ? 'bg-[#064E3B] text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {tab === 'ALL'
                          ? `All (${contacts.length})`
                          : tab === 'HR'
                          ? 'HR Team'
                          : tab === 'MANAGEMENT'
                          ? 'Leads'
                          : 'Staff'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact Rows List */}
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 bg-white rounded-lg border border-gray-200 text-xs shadow-2xs">
                  {filteredContacts.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-xs">
                      {directorySearch
                        ? `No organization staff matched "${directorySearch}"`
                        : 'No employees found in the active organization.'}
                    </div>
                  ) : (
                    filteredContacts.map(contact => {
                      const isAdded = recipients.includes(contact.email);
                      const isCc = ccEmail.toLowerCase() === contact.email.toLowerCase();
                      const isWhatsAppAdded = Boolean(
                        contact.phone && whatsAppRecipientList.some(
                          w => normalizeIndianPhone(contact.phone || '') === w.phone
                        )
                      );

                      return (
                        <div
                          key={contact.email}
                          className={`p-2.5 flex items-center justify-between transition-colors ${
                            isAdded || isWhatsAppAdded ? 'bg-emerald-50/50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0 ${
                                contact.isHr
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : 'bg-gray-100 text-gray-800 border border-gray-200'
                              }`}
                            >
                              {contact.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 flex items-center gap-1.5 truncate">
                                <span>{contact.name}</span>
                                {contact.isHr && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-extrabold shrink-0">
                                    HR
                                  </span>
                                )}
                                {contact.isManager && !contact.isHr && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800 font-bold shrink-0">
                                    Lead
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-500 truncate">
                                {contact.code} &bull; {contact.department} &bull;{' '}
                                <span className="font-mono text-gray-700">{contact.email}</span>
                                {contact.phone && (
                                  <span className="font-mono text-emerald-700 ml-1.5 font-medium">
                                    ({maskPhoneNumber(contact.phone)})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 pl-2">
                            {deliveryChannel !== 'WHATSAPP' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleToggleContactRecipient(contact.email)}
                                  className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-all flex items-center gap-1 ${
                                    isAdded
                                      ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-2xs'
                                      : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50'
                                  }`}
                                >
                                  {isAdded ? (
                                    <>
                                      <Check className="w-3 h-3" /> Added
                                    </>
                                  ) : (
                                    '+ To'
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isCc) {
                                      setCcEmail('');
                                    } else {
                                      setCcEmail(contact.email);
                                      showToast(`Set ${contact.email} as CC`, 'info');
                                    }
                                  }}
                                  className={`text-[10px] font-semibold px-2 py-1 rounded-md border transition-colors ${
                                    isCc
                                      ? 'bg-sky-600 text-white border-sky-700'
                                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900'
                                  }`}
                                >
                                  {isCc ? 'CC active' : '+ CC'}
                                </button>
                              </>
                            )}

                            {deliveryChannel !== 'EMAIL' && (
                              contact.phone ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleWhatsAppContact(contact)}
                                  className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-all flex items-center gap-1 ${
                                    isWhatsAppAdded
                                      ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                                      : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50'
                                  }`}
                                  title={`WhatsApp: ${contact.phone}`}
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  {isWhatsAppAdded ? 'WA Added' : '+ WA'}
                                </button>
                              ) : (
                                <span className="text-[9px] text-gray-400 italic px-1">No phone</span>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 2. Scope of Report */}
              <div className="space-y-2 bg-gray-50/80 border border-gray-200 rounded-xl p-3.5">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-700" />
                  Workforce Scope to Include:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-all ${
                      scope === 'FILTERED'
                        ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-950 shadow-2xs'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportScope"
                      checked={scope === 'FILTERED'}
                      onChange={() => setScope('FILTERED')}
                      className="accent-[#07563D]"
                    />
                    <div>
                      <div>Filtered Set</div>
                      <div className="text-[10px] text-gray-500 font-normal">{filteredRows.length} employees</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-all ${
                      scope === 'ALL'
                        ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-950 shadow-2xs'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportScope"
                      checked={scope === 'ALL'}
                      onChange={() => setScope('ALL')}
                      className="accent-[#07563D]"
                    />
                    <div>
                      <div>All Active Staff</div>
                      <div className="text-[10px] text-gray-500 font-normal">{allRows.length} employees</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-all ${
                      !hasSelected
                        ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200 text-gray-400'
                        : scope === 'SELECTED'
                        ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-950 shadow-2xs'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportScope"
                      disabled={!hasSelected}
                      checked={scope === 'SELECTED'}
                      onChange={() => setScope('SELECTED')}
                      className="accent-[#07563D]"
                    />
                    <div>
                      <div>Selected ({selectedIds.size})</div>
                      <div className="text-[10px] text-gray-500 font-normal">Checked in table</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 3. Inclusions & Attachment Options */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  Report Sections &amp; Attachments:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePunches}
                      onChange={e => setIncludePunches(e.target.checked)}
                      className="accent-[#07563D] rounded-sm"
                    />
                    <span className="font-semibold text-gray-800">Detailed Biometric &amp; Machine Punch Log</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeShiftBreakdown}
                      onChange={e => setIncludeShiftBreakdown(e.target.checked)}
                      className="accent-[#07563D] rounded-sm"
                    />
                    <span className="font-semibold text-gray-800">Shift Timings &amp; Variance Breakdown</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-rose-200 bg-rose-50/30 hover:bg-rose-50/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachPdf}
                      onChange={e => setAttachPdf(e.target.checked)}
                      className="accent-rose-700 rounded-sm"
                    />
                    <span className="font-semibold text-gray-800">Attach Executive Landscape PDF (.pdf)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deliveryChannel !== 'EMAIL'}
                      onChange={e => {
                        if (e.target.checked) {
                          setDeliveryChannel(deliveryChannel === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL_AND_WHATSAPP');
                        } else {
                          setDeliveryChannel('EMAIL');
                        }
                      }}
                      className="accent-[#07563D] rounded-sm"
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold text-emerald-950 text-xs">Deliver Exact PDF via WhatsApp Document</span>
                      <span className="text-[10px] text-emerald-700 font-medium">Sends identical PDF artifact with verified SHA-256 integrity</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachExcel}
                      onChange={e => setAttachExcel(e.target.checked)}
                      className="accent-[#07563D] rounded-sm"
                    />
                    <span className="font-semibold text-gray-800">Attach Multi-Sheet Excel Workbook (.xlsx)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachCsv}
                      onChange={e => setAttachCsv(e.target.checked)}
                      className="accent-[#07563D] rounded-sm"
                    />
                    <span className="font-semibold text-gray-800">Attach Comma-Separated Values (.csv)</span>
                  </label>
                </div>
              </div>

              {/* 4. Subject & Operations Note */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Email Subject:</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-900 font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">HR &amp; Operations Note:</label>
                  <textarea
                    rows={2}
                    value={customNote}
                    onChange={e => setCustomNote(e.target.value)}
                    placeholder="Enter notes to HR (e.g. All gate biometric punches verified; 2 late arrivals flagged)..."
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs text-gray-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </>
          ) : activeTab === 'SCHEDULE' ? (
            /* =========================================================================
               TAB 2: AUTOMATED SCHEDULE (PARTICULAR TIME DISPATCH)
               ========================================================================= */
            <div className="space-y-5">
              {/* Hero Banner: Automated Dispatch Toggle */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Timer className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-emerald-950">Daily Automated Email Dispatch</h4>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          scheduleConfig.enabled
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {scheduleConfig.enabled ? 'ACTIVE RUNNER' : 'PAUSED'}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 mt-1 max-w-lg leading-relaxed">
                      Joy PeopleHR background scheduler automatically gathers verified daily punches and dispatches the
                      reconciled Excel workbook and audit report to your designated HR email IDs at your chosen time.
                    </p>
                  </div>
                </div>

                {/* Switch Toggle */}
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={scheduleConfig.enabled}
                    onChange={e => setScheduleConfig({ ...scheduleConfig, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#07563D]"></div>
                </label>
              </div>

              {/* Dual-Slot 12-Hour Scheduled Times: Morning & Evening */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ── Slot 1: Morning Check-In Turnout ── */}
                <div className={`border rounded-2xl p-4 transition-all space-y-3.5 ${
                  scheduleConfig.morningEnabled
                    ? 'bg-amber-50/40 border-amber-300/80 shadow-xs'
                    : 'bg-gray-50/70 border-gray-200 opacity-70'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                        <Sun className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <div className="font-extrabold text-xs text-amber-950 flex items-center gap-1.5">
                          <span>Slot 1: Morning Turnout</span>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">
                            12-Hour
                          </span>
                        </div>
                        <div className="text-[10px] text-amber-800/80">Arrivals &amp; Missing Morning Punches</div>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={scheduleConfig.morningEnabled}
                        onChange={e => setScheduleConfig({ ...scheduleConfig, morningEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>

                  {/* Preset 12-Hour Quick Chips for Morning */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Quick Preset Times:</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: '09:45 AM', value: '09:45' },
                        { label: '10:15 AM', value: '10:15' },
                        { label: '10:30 AM (Standard)', value: '10:30' },
                        { label: '11:00 AM', value: '11:00' },
                      ].map(t => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setScheduleConfig({ ...scheduleConfig, morningTime: t.value })}
                          className={`py-1.5 px-2 rounded-lg border text-center font-bold text-[11px] transition-all ${
                            scheduleConfig.morningTime === t.value
                              ? 'bg-amber-100 border-amber-400 text-amber-950 shadow-2xs ring-1 ring-amber-400/40'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-amber-50/60'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 12-Hour Interactive Time Picker for Morning */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                      Adjust Morning Time (12-Hour AM/PM):
                    </div>
                    <TimePicker12
                      value24={scheduleConfig.morningTime || '10:30'}
                      onChange={val => setScheduleConfig({ ...scheduleConfig, morningTime: val })}
                      colorScheme="morning"
                    />
                  </div>

                  {/* Slot 1 Direct Test Button */}
                  <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
                    <span className="text-[10px] text-amber-900/80 font-medium">
                      {scheduleConfig.morningEnabled
                        ? `Dispatches at ${formatTo12Hour(scheduleConfig.morningTime || '10:30')}`
                        : 'Morning slot disabled'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTestRunSchedule('MORNING')}
                      disabled={isTestingSchedule || scheduleConfig.recipients.length === 0}
                      className="text-[11px] font-bold text-amber-900 hover:text-amber-950 bg-amber-100/90 hover:bg-amber-200 px-2.5 py-1 rounded-md border border-amber-300 transition-all flex items-center gap-1 shadow-2xs"
                    >
                      <Play className="w-3 h-3 text-amber-700" />
                      Test Morning Report
                    </button>
                  </div>
                </div>

                {/* ── Slot 2: Evening Check-Out Final Audit ── */}
                <div className={`border rounded-2xl p-4 transition-all space-y-3.5 ${
                  scheduleConfig.eveningEnabled
                    ? 'bg-indigo-50/40 border-indigo-300/80 shadow-xs'
                    : 'bg-gray-50/70 border-gray-200 opacity-70'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                        <Moon className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <div className="font-extrabold text-xs text-indigo-950 flex items-center gap-1.5">
                          <span>Slot 2: Evening Final</span>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-indigo-200 text-indigo-900">
                            12-Hour
                          </span>
                        </div>
                        <div className="text-[10px] text-indigo-800/80">Reconciliation &amp; Working Hours</div>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={scheduleConfig.eveningEnabled}
                        onChange={e => setScheduleConfig({ ...scheduleConfig, eveningEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* Preset 12-Hour Quick Chips for Evening */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Quick Preset Times:</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: '06:30 PM (Shift End)', value: '18:30' },
                        { label: '07:00 PM (Standard)', value: '19:00' },
                        { label: '07:30 PM', value: '19:30' },
                        { label: '08:00 PM (Night Log)', value: '20:00' },
                      ].map(t => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setScheduleConfig({ ...scheduleConfig, eveningTime: t.value })}
                          className={`py-1.5 px-2 rounded-lg border text-center font-bold text-[11px] transition-all ${
                            scheduleConfig.eveningTime === t.value
                              ? 'bg-indigo-100 border-indigo-400 text-indigo-950 shadow-2xs ring-1 ring-indigo-400/40'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-indigo-50/60'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 12-Hour Interactive Time Picker for Evening */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                      Adjust Evening Time (12-Hour AM/PM):
                    </div>
                    <TimePicker12
                      value24={scheduleConfig.eveningTime || '19:00'}
                      onChange={val => setScheduleConfig({ ...scheduleConfig, eveningTime: val })}
                      colorScheme="evening"
                    />
                  </div>

                  {/* Slot 2 Direct Test Button */}
                  <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-between">
                    <span className="text-[10px] text-indigo-900/80 font-medium">
                      {scheduleConfig.eveningEnabled
                        ? `Dispatches at ${formatTo12Hour(scheduleConfig.eveningTime || '19:00')}`
                        : 'Evening slot disabled'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTestRunSchedule('EVENING')}
                      disabled={isTestingSchedule || scheduleConfig.recipients.length === 0}
                      className="text-[11px] font-bold text-indigo-900 hover:text-indigo-950 bg-indigo-100/90 hover:bg-indigo-200 px-2.5 py-1 rounded-md border border-indigo-300 transition-all flex items-center gap-1 shadow-2xs"
                    >
                      <Play className="w-3 h-3 text-indigo-700" />
                      Test Evening Report
                    </button>
                  </div>
                </div>
              </div>

              {/* Recurrence & Next Run Status Strip */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Recurrence */}
                <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-2.5">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    Dispatch Recurrence:
                  </label>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${
                        scheduleConfig.frequency === 'DAILY'
                          ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-950'
                          : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="schedFreq"
                        checked={scheduleConfig.frequency === 'DAILY'}
                        onChange={() => setScheduleConfig({ ...scheduleConfig, frequency: 'DAILY' })}
                        className="accent-[#07563D]"
                      />
                      <div>
                        <div>Every Day</div>
                        <div className="text-[10px] text-gray-500 font-normal">Mon — Sun</div>
                      </div>
                    </label>

                    <label
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${
                        scheduleConfig.frequency === 'WEEKDAYS'
                          ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-950'
                          : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="schedFreq"
                        checked={scheduleConfig.frequency === 'WEEKDAYS'}
                        onChange={() => setScheduleConfig({ ...scheduleConfig, frequency: 'WEEKDAYS' })}
                        className="accent-[#07563D]"
                      />
                      <div>
                        <div>Workdays Only</div>
                        <div className="text-[10px] text-gray-500 font-normal">Mon — Fri</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 2. Next Automated Run Countdown Card */}
                <div className="border border-emerald-200 bg-emerald-50/70 rounded-xl p-4 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                      Next Upcoming Automated Dispatch
                    </span>
                    <span className="text-[11px] font-black text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200 shadow-2xs">
                      {nextRunDetails.timeRemainingFormatted}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-extrabold text-emerald-950">
                      {nextRunDetails.nextSlot === 'MORNING' ? '🌅 Morning Turnout' : '🌆 Evening Final'}
                    </span>
                    <span className="text-xs font-semibold text-emerald-800">
                      ({formatTo12Hour(nextRunDetails.nextRunTime)})
                    </span>
                  </div>

                  <div className="text-[10px] text-emerald-700">
                    Schedule mode: 2 automated dispatches per day (Morning 10:30 AM &amp; Evening 07:00 PM)
                  </div>
                </div>
              </div>

              {/* Automated Target HR Recipients */}
              <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3.5 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Automated Scheduled Recipients:</span>
                    <span className="text-[11px] font-semibold text-gray-500">
                      ({scheduleConfig.recipients.length} configured)
                    </span>
                  </label>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleSelectAllHrToSchedule}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <UserCheck className="w-3 h-3 text-emerald-700" />
                      Select All HR
                    </button>
                    <span className="text-gray-300">&bull;</span>
                    <button
                      type="button"
                      onClick={() => {
                        const hrEmails = attendanceReportContactService.getAutoDetectedHrEmails();
                        setScheduleConfig({ ...scheduleConfig, recipients: hrEmails });
                        showToast(`Reset to ${hrEmails.length} auto-detected HR emails`, 'info');
                      }}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                    >
                      Use Auto-Detected HR Emails
                    </button>
                    {scheduleConfig.recipients.length > 0 && (
                      <>
                        <span className="text-gray-300">&bull;</span>
                        <button
                          type="button"
                          onClick={() => {
                            setScheduleConfig({ ...scheduleConfig, recipients: [] });
                            showToast('Cleared all scheduled recipients', 'info');
                          }}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                        >
                          Clear All
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Recipient tag pill list with live search input & floating autocomplete */}
                <div className="relative">
                  <div className="border border-gray-300 rounded-xl p-2 bg-white min-h-[48px] flex flex-wrap items-center gap-1.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
                    {scheduleConfig.recipients.map(r => {
                      const contact = contactsByEmail.get(r.trim().toLowerCase());
                      return (
                        <span
                          key={r}
                          className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-950 border border-emerald-300 text-xs pl-2 pr-1.5 py-1 rounded-lg font-medium shadow-2xs group"
                        >
                          {contact ? (
                            <span className="flex items-center gap-1">
                              <span className="font-bold text-emerald-900">{contact.name}</span>
                              {contact.code && (
                                <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-200/80 text-emerald-800 font-mono font-bold">
                                  {contact.code}
                                </span>
                              )}
                              <span className="text-[10px] text-emerald-700 hidden sm:inline">&lt;{r}&gt;</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-emerald-700" />
                              <span className="font-mono text-xs">{r}</span>
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setScheduleConfig({
                                ...scheduleConfig,
                                recipients: scheduleConfig.recipients.filter(x => x !== r),
                              })
                            }
                            className="p-0.5 rounded-full hover:bg-emerald-200 text-emerald-700 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Remove recipient"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })}

                    <div className="flex-1 min-w-[240px] flex items-center gap-1.5 px-1">
                      <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <input
                        type="text"
                        value={scheduleEmailInput}
                        onChange={e => setScheduleEmailInput(e.target.value)}
                        onFocus={() => setIsScheduleInputFocused(true)}
                        onBlur={() => setTimeout(() => setIsScheduleInputFocused(false), 250)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            if (scheduleEmailInput.trim()) {
                              if (autocompleteScheduleSuggestions.length > 0 && !scheduleEmailInput.includes('@')) {
                                handleAddScheduleEmail(autocompleteScheduleSuggestions[0]);
                              } else {
                                handleAddScheduleEmail(scheduleEmailInput);
                              }
                            }
                          } else if (e.key === 'Escape') {
                            setIsScheduleInputFocused(false);
                          }
                        }}
                        placeholder={
                          scheduleConfig.recipients.length === 0
                            ? 'Search employee by name, code, or type email to add to schedule...'
                            : 'Type name or email to add another recipient...'
                        }
                        className="outline-hidden text-xs text-gray-800 flex-1 py-1 bg-transparent placeholder:text-gray-400"
                      />
                      {scheduleEmailInput && (
                        <button
                          type="button"
                          onClick={() => setScheduleEmailInput('')}
                          className="text-gray-400 hover:text-gray-600 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Floating Autocomplete Dropdown */}
                  {isScheduleInputFocused && scheduleEmailInput.trim().length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-gray-100 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                      {scheduleEmailInput.includes('@') && (
                        <div
                          onMouseDown={e => {
                            e.preventDefault();
                            handleAddScheduleEmail(scheduleEmailInput);
                          }}
                          className="p-2.5 bg-emerald-50 hover:bg-emerald-100 cursor-pointer flex items-center justify-between text-xs text-emerald-950 font-bold transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-emerald-700" />
                            <span>Add custom email: <span className="font-mono underline">{scheduleEmailInput.trim()}</span></span>
                          </div>
                          <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">Press Enter</span>
                        </div>
                      )}

                      <div className="p-1.5 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Matching Organization Employees ({autocompleteScheduleSuggestions.length})</span>
                        <span className="text-[9px] text-gray-400 normal-case font-normal">Click to add to daily schedule</span>
                      </div>

                      {autocompleteScheduleSuggestions.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-500">
                          No employees matched &ldquo;{scheduleEmailInput}&rdquo;.
                          {scheduleEmailInput.includes('@')
                            ? ' You can add this email directly above.'
                            : ' Try searching by name, employee code (e.g. JCS-013), or department.'}
                        </div>
                      ) : (
                        autocompleteScheduleSuggestions.map(contact => {
                          const isAdded = scheduleConfig.recipients.some(
                            r => r.trim().toLowerCase() === contact.email.toLowerCase()
                          );
                          return (
                            <div
                              key={contact.id || contact.email}
                              onMouseDown={e => {
                                e.preventDefault();
                                handleToggleScheduleContact(contact.email);
                                setScheduleEmailInput('');
                              }}
                              className={`p-2.5 flex items-center justify-between hover:bg-emerald-50/70 cursor-pointer transition-colors ${
                                isAdded ? 'bg-emerald-50/40' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-7 h-7 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                                    contact.isHr
                                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                                  }`}
                                >
                                  {contact.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5 truncate">
                                    <span>{contact.name}</span>
                                    {contact.code && (
                                      <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-gray-100 text-gray-700">
                                        {contact.code}
                                      </span>
                                    )}
                                    {contact.isHr && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-extrabold shrink-0">
                                        HR
                                      </span>
                                    )}
                                    {contact.isManager && !contact.isHr && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800 font-bold shrink-0">
                                        Lead
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-gray-500 truncate">
                                    {contact.department} &bull; {contact.designation || 'Staff'} &bull;{' '}
                                    <span className="font-mono text-gray-700">{contact.email}</span>
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-md border transition-all flex items-center gap-1 shrink-0 ${
                                  isAdded
                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                                    : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50'
                                }`}
                              >
                                {isAdded ? (
                                  <>
                                    <Check className="w-3 h-3" /> In Schedule
                                  </>
                                ) : (
                                  '+ Add to Schedule'
                                )}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Searchable Staff Directory specifically for Schedule */}
                <div className="bg-slate-50 border border-gray-200 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setIsScheduleDirectoryExpanded(!isScheduleDirectoryExpanded)}
                      className="text-xs font-bold text-gray-800 flex items-center gap-1.5 hover:text-emerald-800 cursor-pointer"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Search Organization Directory to Add Recipients ({contacts.length} Employees)</span>
                      <ChevronRight
                        className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                          isScheduleDirectoryExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </button>
                    <span className="text-[10px] text-gray-500 font-medium">
                      {scheduleConfig.recipients.length} in automated schedule
                    </span>
                  </div>

                  {isScheduleDirectoryExpanded && (
                    <div className="space-y-2 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={scheduleDirectorySearch}
                            onChange={e => setScheduleDirectorySearch(e.target.value)}
                            placeholder="Search employee by name, code, department, email..."
                            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden"
                          />
                          {scheduleDirectorySearch && (
                            <button
                              type="button"
                              onClick={() => setScheduleDirectorySearch('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Filter category */}
                        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5 text-[10px] font-bold shrink-0">
                          {(['ALL', 'HR', 'MANAGEMENT', 'EMPLOYEE'] as const).map(tab => (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => setScheduleDirectoryFilter(tab)}
                              className={`px-2 py-0.5 rounded-md transition-colors ${
                                scheduleDirectoryFilter === tab
                                  ? 'bg-[#064E3B] text-white shadow-2xs'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              {tab === 'ALL'
                                ? `All (${contacts.length})`
                                : tab === 'HR'
                                ? 'HR Team'
                                : tab === 'MANAGEMENT'
                                ? 'Leads'
                                : 'Staff'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Contact rows list */}
                      <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 bg-white rounded-lg border border-gray-200 text-xs shadow-2xs">
                        {filteredScheduleDirectoryContacts.length === 0 ? (
                          <div className="p-4 text-center text-gray-400 text-xs">
                            {scheduleDirectorySearch
                              ? `No organization staff matched "${scheduleDirectorySearch}"`
                              : 'No employees found in the active organization.'}
                          </div>
                        ) : (
                          filteredScheduleDirectoryContacts.map(contact => {
                            const isAdded = scheduleConfig.recipients.some(
                              r => r.trim().toLowerCase() === contact.email.toLowerCase()
                            );
                            return (
                              <div
                                key={contact.id || contact.email}
                                className={`p-2.5 flex items-center justify-between transition-colors ${
                                  isAdded ? 'bg-emerald-50/50' : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`w-7 h-7 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0 ${
                                      contact.isHr
                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                        : 'bg-gray-100 text-gray-800 border border-gray-200'
                                    }`}
                                  >
                                    {contact.name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-gray-900 flex items-center gap-1.5 truncate">
                                      <span>{contact.name}</span>
                                      {contact.code && (
                                        <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-gray-100 text-gray-700">
                                          {contact.code}
                                        </span>
                                      )}
                                      {contact.isHr && (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-extrabold shrink-0">
                                          HR
                                        </span>
                                      )}
                                      {contact.isManager && !contact.isHr && (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800 font-bold shrink-0">
                                          Lead
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-gray-500 truncate">
                                      {contact.department} &bull; {contact.designation || 'Staff'} &bull;{' '}
                                      <span className="font-mono text-gray-700">{contact.email}</span>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleToggleScheduleContact(contact.email)}
                                  className={`text-[10px] font-bold px-2.5 py-1 rounded-md border transition-all flex items-center gap-1 shrink-0 ${
                                    isAdded
                                      ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-2xs'
                                      : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50'
                                  }`}
                                >
                                  {isAdded ? (
                                    <>
                                      <Check className="w-3 h-3" /> In Schedule
                                    </>
                                  ) : (
                                    '+ To Schedule'
                                  )}
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="text-[11px] text-gray-500">
                    Will automatically attach Excel (.xlsx) and CSV with verified punches.
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleTestRunSchedule(nextRunDetails.nextSlot)}
                      disabled={isTestingSchedule || scheduleConfig.recipients.length === 0}
                      leftIcon={isTestingSchedule ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 text-emerald-700" />}
                      className="text-xs font-bold"
                    >
                      {isTestingSchedule ? 'Testing...' : `Test Run Now (${nextRunDetails.nextSlot === 'MORNING' ? 'Morning' : 'Evening'})`}
                    </Button>
                    <Button
                      size="xs"
                      onClick={handleSaveSchedule}
                      disabled={isSavingSchedule}
                      leftIcon={isSavingSchedule ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold"
                    >
                      {isSavingSchedule ? 'Saving...' : 'Save Schedule Settings'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Past Dispatch Audit History Log */}
              {runLogs.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                  <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 flex items-center justify-between border-b border-gray-200">
                    <span className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-gray-500" />
                      Recent Dispatch Execution History
                    </span>
                    <span className="text-[10px] text-gray-500 font-normal">Last {runLogs.length} events</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto divide-y divide-gray-100 text-xs">
                    {runLogs.slice(0, 5).map(log => (
                      <div key={log.id} className="p-2.5 flex items-center justify-between hover:bg-gray-50">
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                log.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                            <span>{log.date} at {log.timestamp}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-extrabold uppercase">
                              {log.mode}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5 truncate max-w-md">
                            {log.message}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'RECIPIENTS' ? (
            /* =========================================================================
               TAB: MIS RECIPIENTS & WHATSAPP ACCESS
               ========================================================================= */
            <MisRecipientsManagementView
              organizationId="0c621892-e938-4707-9957-13534ea32c19"
              companyName={companyName}
              onRecipientsUpdated={() => {
                misRecipientsService.getRecipients('0c621892-e938-4707-9957-13534ea32c19').then((list) => {
                  const activeWa = list
                    .filter((r) => r.is_active && r.delivery_channels.includes('WHATSAPP'))
                    .map((r) => ({
                      phone: r.phone,
                      name: r.name,
                      role: r.designation || 'Authorized Management',
                      employeeId: r.employee_id || undefined,
                    }));
                  if (activeWa.length > 0) {
                    setWhatsAppRecipientList(activeWa);
                  }
                });
              }}
            />
          ) : (
            /* =========================================================================
               TAB: PREVIEW TAB
               ========================================================================= */
            <div className="space-y-4">
              {/* Period Mode Selector inside Preview */}
              <div className="flex items-center justify-between bg-slate-50 border border-gray-200 p-2.5 rounded-xl text-xs">
                <span className="font-bold text-gray-700 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-700" />
                  Active Preview Format:
                </span>
                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => handleSelectPeriod('DAILY')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                      reportPeriod === 'DAILY'
                        ? 'bg-[#07563D] text-white shadow-2xs'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Daily MIS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPeriod('WEEKLY')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                      reportPeriod === 'WEEKLY'
                        ? 'bg-[#07563D] text-white shadow-2xs'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Weekly Trend
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPeriod('MONTHLY')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                      reportPeriod === 'MONTHLY'
                        ? 'bg-[#07563D] text-white shadow-2xs'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Monthly Governance
                  </button>
                </div>
              </div>

              {reportPeriod === 'WEEKLY' ? (
                /* ── WEEKLY PREVIEW ── */
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-center">
                      <div className="text-[10px] font-extrabold uppercase text-teal-800">7-Day Avg Turnout</div>
                      <div className="text-xl font-black text-teal-950 mt-1">
                        {weeklyLedger.length > 0
                          ? `${Math.round(weeklyLedger.reduce((a, b) => a + b.attendancePct, 0) / weeklyLedger.length)}%`
                          : '78%'}
                      </div>
                      <div className="text-[10px] text-teal-700">Workforce Attendance</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                      <div className="text-[10px] font-extrabold uppercase text-amber-800">Repeated Late (&ge;2 Days)</div>
                      <div className="text-xl font-black text-amber-950 mt-1">
                        {weeklyLedger.filter(w => w.lateDays >= 2).length}
                      </div>
                      <div className="text-[10px] text-amber-700">Staff Flagged</div>
                    </div>
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                      <div className="text-[10px] font-extrabold uppercase text-rose-800">Repeated Absent (&ge;2 Days)</div>
                      <div className="text-xl font-black text-rose-950 mt-1">
                        {weeklyLedger.filter(w => w.absentDays >= 2).length}
                      </div>
                      <div className="text-[10px] text-rose-700">Staff Flagged</div>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
                      <div className="text-[10px] font-extrabold uppercase text-indigo-800">Weekly Overtime</div>
                      <div className="text-xl font-black text-indigo-950 mt-1">
                        {formatMinutesToHoursStr(weeklyLedger.reduce((a, b) => a + (b.totalOtMinutes || 0), 0))}
                      </div>
                      <div className="text-[10px] text-indigo-700">7-Day Total Hours</div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-100 px-3 py-2 text-[11px] font-bold text-gray-700 flex justify-between items-center">
                      <span className="font-extrabold text-gray-900">
                        📈 7-Day Weekly Workforce Master Ledger ({weeklyLedger.length || targetRows.length} Staff)
                      </span>
                      <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        6 Dedicated Excel Sheets
                      </span>
                    </div>
                    <div className="max-h-[260px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 sticky top-0">
                          <tr>
                            <th className="py-2 px-3">Employee</th>
                            <th className="py-2 px-2">Department</th>
                            <th className="py-2 px-2 text-center">Scheduled</th>
                            <th className="py-2 px-2 text-center">Present</th>
                            <th className="py-2 px-2 text-center">Late Days</th>
                            <th className="py-2 px-2 text-center">Work Hours</th>
                            <th className="py-2 px-2 text-center">Weekly Overtime</th>
                            <th className="py-2 px-3 text-center">Attendance %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(weeklyLedger.length > 0 ? weeklyLedger : targetRows.map(r => ({
                            employeeCode: r.emp.employee_code,
                            employeeName: `${r.emp.first_name || ''} ${r.emp.last_name || ''}`.trim() || r.emp.name,
                            department: r.emp.department_name || r.emp.department || 'General',
                            scheduledDays: 7,
                            presentDays: (r.record?.status === 'Present' || !!r.record?.first_check_in) ? 1 : 0,
                            lateDays: (r.record?.late_minutes || 0) > 0 ? 1 : 0,
                            totalWorkMinutes: r.record?.total_work_minutes || 0,
                            totalOtMinutes: r.record?.overtime_minutes || 0,
                            attendancePct: (r.record?.status === 'Present' || !!r.record?.first_check_in) ? 100 : 0,
                          }))).map((w: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="py-2 px-3">
                                <div className="font-bold text-gray-900">{w.employeeName}</div>
                                <div className="text-[10px] text-gray-500">{w.employeeCode}</div>
                              </td>
                              <td className="py-2 px-2 text-gray-700">{w.department}</td>
                              <td className="py-2 px-2 text-center font-medium text-gray-600">7 Days</td>
                              <td className="py-2 px-2 text-center font-bold text-emerald-800">{w.presentDays} Days</td>
                              <td className="py-2 px-2 text-center font-semibold text-amber-700">
                                {w.lateDays > 0 ? `${w.lateDays} Days` : '0'}
                              </td>
                              <td className="py-2 px-2 text-center font-medium text-gray-700">
                                {formatMinutesToHoursStr(w.totalWorkMinutes)}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {w.totalOtMinutes > 0 ? (
                                  <span className="inline-block px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-extrabold text-[10px] border border-amber-300">
                                    +{formatMinutesToHoursStr(w.totalOtMinutes)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-[11px]">0m</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  w.attendancePct >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {w.attendancePct}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : reportPeriod === 'MONTHLY' ? (
                /* ── MONTHLY PREVIEW ── */
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                      <div className="text-[10px] font-extrabold uppercase text-emerald-800">Billing Cycle</div>
                      <div className="text-lg font-black text-emerald-950 mt-1">{payrollCycle?.name || 'October 2026'}</div>
                      <div className="text-[10px] text-emerald-700">{payrollCycle?.startDate || '2026-10-01'} to {payrollCycle?.endDate || '2026-10-31'}</div>
                    </div>
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-center">
                      <div className="text-[10px] font-extrabold uppercase text-teal-800">Active Workdays</div>
                      <div className="text-xl font-black text-teal-950 mt-1">
                        {payrollCycle?.workingDays || 23} Days
                      </div>
                      <div className="text-[10px] text-teal-700">{totalHeadcount * (payrollCycle?.workingDays || 23)} Scheduled Staff Days</div>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
                      <div className="text-[10px] font-extrabold uppercase text-indigo-800">Monthly Overtime</div>
                      <div className="text-xl font-black text-indigo-950 mt-1">
                        {formatMinutesToHoursStr(monthlyLedger.reduce((a, b) => a + (b.totalOtMinutes || 0), 0))}
                      </div>
                      <div className="text-[10px] text-indigo-700">Total Statutory OT</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
                      <div className="text-[10px] font-extrabold uppercase text-purple-800">20h Limit Audit</div>
                      <div className="text-xl font-black text-purple-950 mt-1">
                        {monthlyLedger.filter(m => (m.totalOtMinutes || 0) > 1200).length} Over Limit
                      </div>
                      <div className="text-[10px] text-purple-700">Governance Compliance</div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-100 px-3 py-2 text-[11px] font-bold text-gray-700 flex justify-between items-center">
                      <span className="font-extrabold text-gray-900">
                        📊 Monthly Workforce Governance Master Ledger ({monthlyLedger.length || targetRows.length} Staff)
                      </span>
                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Payroll Cycle Oct 01 - Oct 31
                      </span>
                    </div>
                    <div className="max-h-[260px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 sticky top-0">
                          <tr>
                            <th className="py-2 px-3">Employee</th>
                            <th className="py-2 px-2">Department</th>
                            <th className="py-2 px-2 text-center">Scheduled</th>
                            <th className="py-2 px-2 text-center">Present</th>
                            <th className="py-2 px-2 text-center">Late Days</th>
                            <th className="py-2 px-2 text-center">Work Hours</th>
                            <th className="py-2 px-2 text-center">Monthly OT</th>
                            <th className="py-2 px-3 text-center">Monthly Turnout %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(monthlyLedger.length > 0 ? monthlyLedger : targetRows.map(r => ({
                            employeeCode: r.emp.employee_code,
                            employeeName: `${r.emp.first_name || ''} ${r.emp.last_name || ''}`.trim() || r.emp.name,
                            department: r.emp.department_name || r.emp.department || 'General',
                            scheduledDays: 23,
                            presentDays: (r.record?.status === 'Present' || !!r.record?.first_check_in) ? 1 : 0,
                            lateDays: (r.record?.late_minutes || 0) > 0 ? 1 : 0,
                            totalWorkMinutes: r.record?.total_work_minutes || 0,
                            totalOtMinutes: r.record?.overtime_minutes || 0,
                            attendancePct: (r.record?.status === 'Present' || !!r.record?.first_check_in) ? 100 : 0,
                          }))).map((m: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="py-2 px-3">
                                <div className="font-bold text-gray-900">{m.employeeName}</div>
                                <div className="text-[10px] text-gray-500">{m.employeeCode}</div>
                              </td>
                              <td className="py-2 px-2 text-gray-700">{m.department}</td>
                              <td className="py-2 px-2 text-center font-medium text-gray-600">{m.scheduledDays} Days</td>
                              <td className="py-2 px-2 text-center font-bold text-emerald-800">{m.presentDays} Days</td>
                              <td className="py-2 px-2 text-center font-semibold text-amber-700">
                                {m.lateDays > 0 ? `${m.lateDays} Days` : '0'}
                              </td>
                              <td className="py-2 px-2 text-center font-medium text-gray-700">
                                {formatMinutesToHoursStr(m.totalWorkMinutes)}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {m.totalOtMinutes > 0 ? (
                                  <span className={`inline-block px-1.5 py-0.2 rounded font-extrabold text-[10px] border ${
                                    m.totalOtMinutes > 1200
                                      ? 'bg-rose-100 text-rose-900 border-rose-300'
                                      : 'bg-amber-100 text-amber-900 border-amber-300'
                                  }`}>
                                    +{formatMinutesToHoursStr(m.totalOtMinutes)} {m.totalOtMinutes > 1200 ? '(!)' : ''}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-[11px]">0m</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  m.attendancePct >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {m.attendancePct}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                /* ── DAILY PREVIEW ── */
                <>
                  <div className={`grid gap-2.5 ${dailySlot === 'EVENING_FINAL' ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                      <div className="text-[10px] font-extrabold uppercase text-emerald-800">Total Workforce</div>
                      <div className="text-xl font-black text-emerald-950 mt-1">{totalHeadcount}</div>
                      <div className="text-[10px] text-emerald-700">Employees</div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                      <div className="text-[10px] font-extrabold uppercase text-emerald-800">Present / Working</div>
                      <div className="text-xl font-black text-[#07563D] mt-1">{presentCount}</div>
                      <div className="text-[10px] text-emerald-700">Active Checked In</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                      <div className="text-[10px] font-extrabold uppercase text-amber-800">Late Arrivals</div>
                      <div className="text-xl font-black text-amber-950 mt-1">{lateCount}</div>
                      <div className="text-[10px] text-amber-700">Past Grace Time</div>
                    </div>
                    {dailySlot === 'EVENING_FINAL' && (
                      <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-center shadow-2xs">
                        <div className="text-[10px] font-extrabold uppercase text-amber-800">Overtime Logged</div>
                        <div className="text-xl font-black text-amber-950 mt-1">{overtimeStats.formattedTotal}</div>
                        <div className="text-[10px] text-amber-700 font-bold">{overtimeStats.count} Staff with OT</div>
                      </div>
                    )}
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                      <div className="text-[10px] font-extrabold uppercase text-rose-800">Not Checked In</div>
                      <div className="text-xl font-black text-rose-950 mt-1">{notCheckedInCount}</div>
                      <div className="text-[10px] text-rose-700">Pending / Absent</div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-100 px-3 py-2 text-[11px] font-bold text-gray-700 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-gray-900">
                          {dailySlot === 'MORNING_CHECKIN' ? '🌅 Morning Check-In Turnout Preview' : '🌆 Full Attendance Ledger Preview'} ({targetRows.length} Rows)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const nextSlot = dailySlot === 'MORNING_CHECKIN' ? 'EVENING_FINAL' : 'MORNING_CHECKIN';
                            handleSelectDailySlot(nextSlot);
                          }}
                          className="text-[10px] font-extrabold text-emerald-800 bg-white px-2 py-0.5 rounded border border-gray-300 hover:bg-emerald-50 transition-colors shadow-2xs"
                        >
                          View {dailySlot === 'MORNING_CHECKIN' ? 'Evening Final' : 'Morning Check-In'}
                        </button>
                      </div>
                      <span className="text-[10px] text-gray-500 font-normal">Excel workbook contains full multi-sheet dataset</span>
                    </div>
                    <div className="max-h-[260px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 sticky top-0">
                          {dailySlot === 'MORNING_CHECKIN' ? (
                            <tr>
                              <th className="py-2 px-3">Employee</th>
                              <th className="py-2 px-2">Shift</th>
                              <th className="py-2 px-2 text-center">Expected In</th>
                              <th className="py-2 px-2 text-center">Morning Punch</th>
                              <th className="py-2 px-2 text-center">Late (Mins)</th>
                              <th className="py-2 px-3 text-center">Morning Turnout</th>
                            </tr>
                          ) : (
                            <tr>
                              <th className="py-2 px-3">Employee</th>
                              <th className="py-2 px-2">Shift</th>
                              <th className="py-2 px-2 text-center">In</th>
                              <th className="py-2 px-2 text-center">Out</th>
                              <th className="py-2 px-2 text-center">Net</th>
                              <th className="py-2 px-2 text-center">Overtime (OT)</th>
                              <th className="py-2 px-3 text-center">Status</th>
                            </tr>
                          )}
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {targetRows.map((r, i) => {
                            const emp = r.emp;
                            const rec = r.record;
                            const shift = r.shift;
                            const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.display_name || emp.name;
                            const code = emp.employee_code || rec.employee_code || '—';
                            const shiftCode = shift?.shift_code || r.roster?.shift_code || 'GEN-09';
                            const checkIn = rec.first_check_in || '—';
                            const checkOut = rec.last_check_out || '—';
                            const expectedIn = shift?.start_time || '09:30';
                            const lateMins = rec.late_minutes || 0;
                            const ot = computeEmployeeOvertime(rec, shift);
                            const netStr = rec.net_working_minutes > 0 ? formatMinutesToHoursStr(rec.net_working_minutes) : (rec.first_check_in && !rec.last_check_out ? 'In Progress' : '—');
                            
                            if (dailySlot === 'MORNING_CHECKIN') {
                              const morningStatus = rec.first_check_in
                                ? (lateMins > 0 ? `Late (${lateMins}m)` : 'On Time')
                                : 'Pending In';

                              return (
                                <tr key={emp.id || i} className="hover:bg-gray-50">
                                  <td className="py-2 px-3">
                                    <div className="font-bold text-gray-900">{name}</div>
                                    <div className="text-[10px] text-gray-500">{code} &bull; {emp.department_name || emp.department || 'General'}</div>
                                  </td>
                                  <td className="py-2 px-2">
                                    <span className="font-semibold text-gray-800">{shiftCode}</span>
                                    <div className="text-[10px] text-gray-500">{expectedIn} - {shift?.end_time || '18:30'}</div>
                                  </td>
                                  <td className="py-2 px-2 text-center font-medium text-gray-700">{expectedIn}</td>
                                  <td className="py-2 px-2 text-center font-bold text-emerald-800">{checkIn}</td>
                                  <td className="py-2 px-2 text-center font-semibold text-amber-700">
                                    {lateMins > 0 ? `${lateMins}m` : '0m'}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                      morningStatus === 'On Time'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : morningStatus.includes('Late')
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      {morningStatus}
                                    </span>
                                  </td>
                                </tr>
                              );
                            }

                            const statusStr = rec.status || 'Not Checked In';
                            return (
                              <tr key={emp.id || i} className="hover:bg-gray-50">
                                <td className="py-2 px-3">
                                  <div className="font-bold text-gray-900">{name}</div>
                                  <div className="text-[10px] text-gray-500">{code} &bull; {emp.department_name || emp.department || 'General'}</div>
                                </td>
                                <td className="py-2 px-2">
                                  <span className="font-semibold text-gray-800">{shiftCode}</span>
                                  <div className="text-[10px] text-gray-500">{shift?.start_time || '09:30'} - {shift?.end_time || '18:30'}</div>
                                </td>
                                <td className="py-2 px-2 text-center font-bold text-emerald-800">{checkIn}</td>
                                <td className="py-2 px-2 text-center font-bold text-gray-800">{checkOut}</td>
                                <td className="py-2 px-2 text-center font-semibold text-sky-700">{netStr}</td>
                                <td className="py-2 px-2 text-center">
                                  {ot.hasOvertime ? (
                                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                      +{ot.formatted}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-gray-400">0m</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                    statusStr === 'Present' || (statusStr as string) === 'Working'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : statusStr === 'Late'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {statusStr}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!sentSuccess && (
          <div className="border-t border-gray-200/90 bg-gray-50/95 px-6 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                leftIcon={isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin text-rose-700" /> : <FileText className="w-4 h-4 text-rose-700" />}
                className="text-xs font-bold border-rose-200 hover:bg-rose-50/60 text-rose-800"
              >
                {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF (.pdf)'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadExcel}
                leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-700" />}
                className="text-xs font-bold"
              >
                Download Excel (.xlsx)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCsv}
                leftIcon={<Download className="w-4 h-4 text-gray-700" />}
                className="text-xs font-semibold"
              >
                Download CSV
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isSending}>
                Cancel
              </Button>

              {activeTab === 'SCHEDULE' ? (
                <Button
                  size="sm"
                  onClick={handleSaveSchedule}
                  disabled={isSavingSchedule}
                  leftIcon={isSavingSchedule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs shadow-xs"
                >
                  {isSavingSchedule ? 'Saving...' : 'Save & Close'}
                </Button>
              ) : activeTab === 'RECIPIENTS' ? (
                <Button
                  size="sm"
                  onClick={() => setActiveTab('DISPATCH')}
                  className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs shadow-xs"
                >
                  Proceed to Dispatch
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleInitiateSend}
                  disabled={
                    isSending ||
                    ((deliveryChannel !== 'WHATSAPP' && recipients.length === 0) &&
                      (deliveryChannel !== 'EMAIL' && whatsAppRecipientList.length === 0))
                  }
                  leftIcon={isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs shadow-xs"
                >
                  {isSending ? 'Dispatching Report...' : `Send Report Now (${
                    (deliveryChannel !== 'WHATSAPP' ? recipients.length : 0) +
                    (deliveryChannel !== 'EMAIL' ? whatsAppRecipientList.length : 0)
                  } Recipient${
                    ((deliveryChannel !== 'WHATSAPP' ? recipients.length : 0) +
                      (deliveryChannel !== 'EMAIL' ? whatsAppRecipientList.length : 0)) === 1 ? '' : 's'
                  })`}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Explicit Confirmation Modal for Confidential MIS Dispatch */}
        {showConfirmDispatchModal && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">Confirm Confidential MIS Dispatch</h4>
                  <p className="text-xs text-gray-500">Please review destinations before dispatching official audit logs.</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-gray-200 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Report Type:</span>
                  <span className="font-bold text-gray-900">
                    {reportPeriod === 'WEEKLY'
                      ? 'Weekly HR Intelligence MIS (7-Day Trend)'
                      : reportPeriod === 'MONTHLY'
                      ? `Monthly Workforce Governance MIS (${payrollCycle?.name || 'October 2026'})`
                      : dailySlot === 'MORNING_CHECKIN'
                      ? 'Morning Check-In Turnout'
                      : 'Evening Final Reconciliation'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Workforce Scope:</span>
                  <span className="font-bold text-gray-900">
                    {scope === 'ALL' ? `Full Organization (${allRows.length} Staff)` : `Filtered / Selected Scope (${targetRows.length} Staff)`}
                  </span>
                </div>
                {deliveryChannel !== 'WHATSAPP' && (
                  <div className="flex justify-between py-1 border-b border-gray-200/60">
                    <span className="text-gray-500">Email Recipients:</span>
                    <span className="font-bold text-gray-900">{recipients.length} Email(s)</span>
                  </div>
                )}
                {deliveryChannel !== 'EMAIL' && (
                  <div className="flex justify-between py-1 border-b border-gray-200/60">
                    <span className="text-gray-500">WhatsApp Destinations:</span>
                    <span className="font-bold text-emerald-800">{whatsAppRecipientList.length} Authorized Destination(s)</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Document Security:</span>
                  <span className="font-bold text-gray-700">SHA-256 Verified Landscape PDF</span>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                Confidential Notice: This dispatch includes biometric audit logs, punctuality variances, and total hours worked.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowConfirmDispatchModal(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendManual}
                  disabled={isSending}
                  leftIcon={isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs"
                >
                  Confirm &amp; Dispatch Now
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
