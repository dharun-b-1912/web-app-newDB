import React, { useState, useEffect, useMemo } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { HolidayCalendar, Holiday, HolidayType } from '../../../types/leave';
import { Badge } from '../../../components/ui/Badge';
import {
  Calendar,
  Plus,
  Download,
  CheckCircle,
  MapPin,
  X,
  Check,
  Search,
  Filter,
  Sparkles,
  Copy,
  Trash2,
  Edit2,
  CalendarDays,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Globe,
  SlidersHorizontal,
  ChevronRight,
  Info,
  CalendarRange,
  PartyPopper,
  Flame,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';

export const HolidayCalendarView: React.FC = () => {
  const [calendars, setCalendars] = useState<HolidayCalendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('hol-tn-2026');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'All' | 'Mandatory' | 'Restricted' | 'HalfDay'>('All');
  const [viewMode, setViewMode] = useState<'agenda' | 'grid'>('agenda');

  // Modals state
  const [isAddHolidayModalOpen, setIsAddHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [isCreateCalModalOpen, setIsCreateCalModalOpen] = useState(false);
  const [editingCal, setEditingCal] = useState<HolidayCalendar | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<{ calId: string; holiday: Holiday } | null>(null);
  const [calToDelete, setCalToDelete] = useState<HolidayCalendar | null>(null);

  // Holiday Form State
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('2026-10-02');
  const [holidayType, setHolidayType] = useState<string>('Mandatory');
  const [holidayCategory, setHolidayCategory] = useState<'National' | 'Regional' | 'Religious' | 'Gazetted' | 'Corporate' | 'Cultural'>('National');
  const [holidayDesc, setHolidayDesc] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [notifyEmployees, setNotifyEmployees] = useState(true);

  // Calendar Form State
  const [calCode, setCalCode] = useState('');
  const [calName, setCalName] = useState('');
  const [calYear, setCalYear] = useState<number>(2026);
  const [calDesc, setCalDesc] = useState('');
  const [calLocations, setCalLocations] = useState<string[]>(['loc-cbe-01']);
  const [calWeeklyOffs, setCalWeeklyOffs] = useState<('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[]>(['Saturday', 'Sunday']);
  const [calMaxRestricted, setCalMaxRestricted] = useState<number>(2);

  // Duplicate Form State
  const [dupYear, setDupYear] = useState<number>(2027);
  const [dupName, setDupName] = useState('');

  const loadData = () => {
    const cals = leaveApi.getHolidayCalendars();
    setCalendars(cals);
    if (cals.length > 0 && !cals.some(c => c.id === selectedCalendarId)) {
      setSelectedCalendarId(cals[0].id);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = hrEventBus.subscribe('leave.*', () => loadData());
    return () => unsub();
  }, []);

  const activeCal = calendars.find(c => c.id === selectedCalendarId) || calendars[0] || null;

  // KPIs for the active calendar
  const holidaysList = activeCal?.holidays || [];
  const todayStr = new Date().toISOString().split('T')[0];

  const mandatoryCount = holidaysList.filter(h => h.type === 'Mandatory' || !h.is_optional).length;
  const restrictedCount = holidaysList.filter(h => h.type === 'Restricted' || h.type === 'Optional' || h.is_optional).length;
  const halfDayCount = holidaysList.filter(h => h.half_day).length;

  // Detect upcoming next holiday
  const upcomingHolidays = holidaysList
    .filter(h => h.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextHoliday = upcomingHolidays[0] || null;

  const daysUntilNext = nextHoliday
    ? Math.ceil((new Date(nextHoliday.date).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Detect weekend overlaps
  const weekendOverlaps = holidaysList.filter(h => {
    const dt = new Date(`${h.date}T00:00:00`);
    const day = dt.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  });

  // Filtered holidays
  const filteredHolidays = useMemo(() => {
    return holidaysList.filter(h => {
      const matchSearch =
        searchQuery === '' ||
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.description && h.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        h.date.includes(searchQuery);

      let matchType = true;
      if (selectedTypeFilter === 'Mandatory') {
        matchType = h.type === 'Mandatory' || !h.is_optional;
      } else if (selectedTypeFilter === 'Restricted') {
        matchType = h.type === 'Restricted' || h.type === 'Optional' || Boolean(h.is_optional);
      } else if (selectedTypeFilter === 'HalfDay') {
        matchType = Boolean(h.half_day);
      }

      return matchSearch && matchType;
    });
  }, [holidaysList, searchQuery, selectedTypeFilter]);

  // Group holidays by Month
  const groupedByMonth = useMemo(() => {
    const groups: { [key: string]: Holiday[] } = {};
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    filteredHolidays.forEach(h => {
      const parts = h.date.split('-');
      const monthIdx = parseInt(parts[1], 10) - 1;
      const monthName = monthNames[monthIdx] || 'Other';
      if (!groups[monthName]) groups[monthName] = [];
      groups[monthName].push(h);
    });

    return groups;
  }, [filteredHolidays]);

  // Handle Holiday Form Submit
  const handleSaveHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName.trim() || !activeCal) return;

    const dateObj = new Date(`${holidayDate}T00:00:00`);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const isOptional = holidayType === 'Restricted' || holidayType === 'Optional';

    if (editingHoliday) {
      leaveApi.updateHoliday(activeCal.id, {
        ...editingHoliday,
        name: holidayName,
        date: holidayDate,
        type: holidayType,
        is_optional: isOptional,
        day_of_week: dayOfWeek,
        category: holidayCategory,
        description: holidayDesc,
        half_day: isHalfDay,
        notify_employees: notifyEmployees,
      });
    } else {
      leaveApi.addHoliday(activeCal.id, {
        name: holidayName,
        date: holidayDate,
        type: holidayType,
        is_optional: isOptional,
        day_of_week: dayOfWeek,
        category: holidayCategory,
        description: holidayDesc,
        half_day: isHalfDay,
        notify_employees: notifyEmployees,
      });
    }

    setIsAddHolidayModalOpen(false);
    setEditingHoliday(null);
    setHolidayName('');
    setHolidayDesc('');
    setIsHalfDay(false);
  };

  const openAddHolidayModal = () => {
    setEditingHoliday(null);
    setHolidayName('');
    setHolidayDate(`${activeCal?.year || 2026}-10-02`);
    setHolidayType('Mandatory');
    setHolidayCategory('National');
    setHolidayDesc('');
    setIsHalfDay(false);
    setNotifyEmployees(true);
    setIsAddHolidayModalOpen(true);
  };

  const openEditHolidayModal = (h: Holiday) => {
    setEditingHoliday(h);
    setHolidayName(h.name);
    setHolidayDate(h.date);
    setHolidayType(h.type || (h.is_optional ? 'Restricted' : 'Mandatory'));
    setHolidayCategory(h.category || 'Regional');
    setHolidayDesc(h.description || '');
    setIsHalfDay(Boolean(h.half_day));
    setNotifyEmployees(h.notify_employees ?? true);
    setIsAddHolidayModalOpen(true);
  };

  // Handle Calendar Create / Edit Submit
  const handleSaveCalendar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calName.trim() || !calCode.trim()) return;

    if (editingCal) {
      leaveApi.saveHolidayCalendar({
        ...editingCal,
        code: calCode,
        name: calName,
        year: calYear,
        description: calDesc,
        location_ids: calLocations,
        weekly_offs: calWeeklyOffs,
        restricted_holiday_max_allowed: calMaxRestricted,
      });
    } else {
      const newCal: HolidayCalendar = {
        id: `hol-${calCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${calYear}`,
        code: calCode,
        name: calName,
        year: calYear,
        description: calDesc || 'Regional branch statutory holiday calendar.',
        company_id: 'comp-01',
        location_ids: calLocations,
        status: 'Active',
        weekly_offs: calWeeklyOffs,
        restricted_holiday_max_allowed: calMaxRestricted,
        holidays: [],
        created_at: new Date().toISOString(),
      };
      leaveApi.saveHolidayCalendar(newCal);
      setSelectedCalendarId(newCal.id);
    }

    setIsCreateCalModalOpen(false);
    setEditingCal(null);
  };

  const openCreateCalModal = () => {
    setEditingCal(null);
    setCalCode(`LOC-${new Date().getFullYear()}`);
    setCalName('');
    setCalYear(2026);
    setCalDesc('');
    setCalLocations(['loc-cbe-01']);
    setCalWeeklyOffs(['Saturday', 'Sunday']);
    setCalMaxRestricted(2);
    setIsCreateCalModalOpen(true);
  };

  const openEditCalModal = (cal: HolidayCalendar) => {
    setEditingCal(cal);
    setCalCode(cal.code);
    setCalName(cal.name);
    setCalYear(cal.year);
    setCalDesc(cal.description);
    setCalLocations(cal.location_ids || []);
    setCalWeeklyOffs(cal.weekly_offs || ['Saturday', 'Sunday']);
    setCalMaxRestricted(cal.restricted_holiday_max_allowed ?? 2);
    setIsCreateCalModalOpen(true);
  };

  // Handle Duplicate Submit
  const handleDuplicateCalendar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCal) return;
    const cloned = leaveApi.duplicateHolidayCalendar(activeCal.id, dupYear, dupName);
    setSelectedCalendarId(cloned.id);
    setIsDuplicateModalOpen(false);
  };

  // Handle Export to CSV / iCal
  const exportToICS = () => {
    if (!activeCal) return;
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Joy PeopleHR Enterprise//Holiday Calendar//EN',
      `X-WR-CALNAME:${activeCal.name}`,
    ];

    (activeCal.holidays || []).forEach(h => {
      const dtClean = h.date.replace(/-/g, '');
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${h.id}@joyhr.enterprise`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DTSTART;VALUE=DATE:${dtClean}`,
        `DTEND;VALUE=DATE:${dtClean}`,
        `SUMMARY:${h.name} (${h.type})`,
        `DESCRIPTION:${h.description || h.name}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');
    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeCal.code}_Holidays.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    if (!activeCal) return;
    const headers = ['Date', 'Day', 'Holiday Name', 'Type', 'Category', 'Half Day', 'Description'];
    const rows = (activeCal.holidays || []).map(h => [
      `"${h.date}"`,
      `"${h.day_of_week || ''}"`,
      `"${h.name.replace(/"/g, '""')}"`,
      `"${h.type}"`,
      `"${h.category || 'General'}"`,
      `"${h.half_day ? 'Yes' : 'No'}"`,
      `"${(h.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeCal.code}_Holidays.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Preset Templates
  const applyPresetTemplate = (presetType: 'india_central' | 'uk_bank' | 'uae_statutory') => {
    if (!activeCal) return;
    let templateHolidays: Holiday[] = [];
    const year = activeCal.year;

    if (presetType === 'india_central') {
      templateHolidays = [
        { id: `c-h1-${Date.now()}`, calendar_id: activeCal.id, name: 'Republic Day', date: `${year}-01-26`, type: 'Mandatory', is_optional: false, day_of_week: 'Mon', category: 'National', description: 'National Republic Day' },
        { id: `c-h2-${Date.now()}`, calendar_id: activeCal.id, name: 'Maha Shivratri', date: `${year}-02-16`, type: 'Restricted', is_optional: true, day_of_week: 'Mon', category: 'Religious', description: 'Maha Shivratri observance' },
        { id: `c-h3-${Date.now()}`, calendar_id: activeCal.id, name: 'Holi', date: `${year}-03-04`, type: 'Mandatory', is_optional: false, day_of_week: 'Wed', category: 'Religious', description: 'Festival of Colors' },
        { id: `c-h4-${Date.now()}`, calendar_id: activeCal.id, name: 'Good Friday', date: `${year}-04-03`, type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'Religious', description: 'Good Friday' },
        { id: `c-h5-${Date.now()}`, calendar_id: activeCal.id, name: 'Dr. Ambedkar Jayanti', date: `${year}-04-14`, type: 'Mandatory', is_optional: false, day_of_week: 'Tue', category: 'National', description: 'Ambedkar Jayanti' },
        { id: `c-h6-${Date.now()}`, calendar_id: activeCal.id, name: 'Eid-ul-Fitr', date: `${year}-03-21`, type: 'Mandatory', is_optional: false, day_of_week: 'Sat', category: 'Religious', description: 'Eid-ul-Fitr' },
        { id: `c-h7-${Date.now()}`, calendar_id: activeCal.id, name: 'Budha Purnima', date: `${year}-05-01`, type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'Religious', description: 'Budha Purnima' },
        { id: `c-h8-${Date.now()}`, calendar_id: activeCal.id, name: 'Bakrid / Eid al-Adha', date: `${year}-05-27`, type: 'Mandatory', is_optional: false, day_of_week: 'Wed', category: 'Religious', description: 'Eid al-Adha' },
        { id: `c-h9-${Date.now()}`, calendar_id: activeCal.id, name: 'Independence Day', date: `${year}-08-15`, type: 'Mandatory', is_optional: false, day_of_week: 'Sat', category: 'National', description: 'Indian Independence Day' },
        { id: `c-h10-${Date.now()}`, calendar_id: activeCal.id, name: 'Milad-un-Nabi', date: `${year}-08-26`, type: 'Mandatory', is_optional: false, day_of_week: 'Wed', category: 'Religious', description: 'Prophet Birthday' },
        { id: `c-h11-${Date.now()}`, calendar_id: activeCal.id, name: 'Mahatma Gandhi Jayanti', date: `${year}-10-02`, type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'National', description: 'Gandhi Jayanti' },
        { id: `c-h12-${Date.now()}`, calendar_id: activeCal.id, name: 'Dussehra', date: `${year}-10-20`, type: 'Mandatory', is_optional: false, day_of_week: 'Tue', category: 'Religious', description: 'Vijayadashami' },
        { id: `c-h13-${Date.now()}`, calendar_id: activeCal.id, name: 'Diwali (Deepavali)', date: `${year}-11-08`, type: 'Mandatory', is_optional: false, day_of_week: 'Sun', category: 'Religious', description: 'Diwali' },
        { id: `c-h14-${Date.now()}`, calendar_id: activeCal.id, name: 'Guru Nanak Jayanti', date: `${year}-11-24`, type: 'Mandatory', is_optional: false, day_of_week: 'Tue', category: 'Religious', description: 'Guru Nanak Birthday' },
        { id: `c-h15-${Date.now()}`, calendar_id: activeCal.id, name: 'Christmas Day', date: `${year}-12-25`, type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'Religious', description: 'Christmas' },
      ];
    } else if (presetType === 'uk_bank') {
      templateHolidays = [
        { id: `uk-h1-${Date.now()}`, calendar_id: activeCal.id, name: "New Year's Day", date: `${year}-01-01`, type: 'Mandatory', is_optional: false, day_of_week: 'Thu', category: 'National', description: 'Bank Holiday' },
        { id: `uk-h2-${Date.now()}`, calendar_id: activeCal.id, name: 'Good Friday', date: `${year}-04-03`, type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'Religious', description: 'Bank Holiday' },
        { id: `uk-h3-${Date.now()}`, calendar_id: activeCal.id, name: 'Easter Monday', date: `${year}-04-06`, type: 'Mandatory', is_optional: false, day_of_week: 'Mon', category: 'Religious', description: 'Bank Holiday' },
        { id: `uk-h4-${Date.now()}`, calendar_id: activeCal.id, name: 'Early May Bank Holiday', date: `${year}-05-04`, type: 'Mandatory', is_optional: false, day_of_week: 'Mon', category: 'National', description: 'May Day Holiday' },
        { id: `uk-h5-${Date.now()}`, calendar_id: activeCal.id, name: 'Spring Bank Holiday', date: `${year}-05-25`, type: 'Mandatory', is_optional: false, day_of_week: 'Mon', category: 'National', description: 'Late Spring Bank Holiday' },
        { id: `uk-h6-${Date.now()}`, calendar_id: activeCal.id, name: 'Summer Bank Holiday', date: `${year}-08-31`, type: 'Mandatory', is_optional: false, day_of_week: 'Mon', category: 'National', description: 'Late Summer Bank Holiday' },
        { id: `uk-h7-${Date.now()}`, calendar_id: activeCal.id, name: 'Christmas Day', date: `${year}-12-25`, type: 'Mandatory', is_optional: false, day_of_week: 'Fri', category: 'Religious', description: 'Christmas Day' },
        { id: `uk-h8-${Date.now()}`, calendar_id: activeCal.id, name: 'Boxing Day (Observed)', date: `${year}-12-28`, type: 'Mandatory', is_optional: false, day_of_week: 'Mon', category: 'National', description: 'Boxing Day Holiday' },
      ];
    }

    const updated = {
      ...activeCal,
      holidays: templateHolidays,
    };
    leaveApi.saveHolidayCalendar(updated);
    setIsTemplateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-[#07563D]/10 text-[#07563D]">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <span>Multi-Branch Holiday & Statutory Calendars</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  {calendars.length} Regional Lists
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage mandatory public, gazetted, and restricted/optional holidays across all operational locations & branches
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Quick Preset Templates */}
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Import official regional gazetted templates"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Preset Templates</span>
          </button>

          {/* Export Menu */}
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
            <button
              onClick={exportToICS}
              className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1 border-r border-gray-100 transition-colors cursor-pointer"
              title="Download iCal file for Google Calendar / Apple Calendar / Outlook"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>.ICS Sync</span>
            </button>
            <button
              onClick={exportToCSV}
              className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Export holidays to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>
          </div>

          {/* Add Calendar */}
          <button
            onClick={openCreateCalModal}
            className="px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#07563D]" />
            <span>New Calendar</span>
          </button>

          {/* Add Holiday */}
          <button
            onClick={openAddHolidayModal}
            className="px-4 py-2 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Holiday</span>
          </button>
        </div>
      </div>

      {/* Top Metrics KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 block uppercase tracking-wider">Total Holidays</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-gray-900 font-mono">{holidaysList.length}</span>
            <span className="text-[11px] text-gray-500 font-medium">Days</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-bold mt-1 block">In {activeCal?.year} Year</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 block uppercase tracking-wider">Mandatory / Gazetted</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-purple-700 font-mono">{mandatoryCount}</span>
            <span className="text-[11px] text-purple-600 font-medium">Statutory</span>
          </div>
          <span className="text-[10px] text-gray-500 font-medium mt-1 block">Compulsory paid offs</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 block uppercase tracking-wider">Restricted / Optional</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-600 font-mono">{restrictedCount}</span>
            <span className="text-[11px] text-amber-700 font-medium">Floating</span>
          </div>
          <span className="text-[10px] text-amber-800 font-bold mt-1 block">
            Max {activeCal?.restricted_holiday_max_allowed ?? 2} choices/emp
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 block uppercase tracking-wider">Weekend Overlaps</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-rose-600 font-mono">{weekendOverlaps.length}</span>
            <span className="text-[11px] text-rose-500 font-medium">Sat/Sun</span>
          </div>
          <span className="text-[10px] text-gray-500 font-medium mt-1 block">Falls on weekly off</span>
        </div>

        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-[#07563D]/10 to-emerald-50 p-4 rounded-2xl border border-emerald-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-[#07563D] block uppercase tracking-wider flex items-center gap-1">
            <PartyPopper className="w-3 h-3 text-[#07563D]" />
            <span>Next Holiday</span>
          </span>
          {nextHoliday ? (
            <div className="mt-1">
              <h4 className="text-xs font-black text-gray-900 truncate" title={nextHoliday.name}>
                {nextHoliday.name}
              </h4>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[10px] font-mono text-gray-600">{nextHoliday.date}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#07563D] text-white">
                  {daysUntilNext === 0 ? 'Today!' : `in ${daysUntilNext}d`}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 mt-2 font-medium">No upcoming holidays scheduled</p>
          )}
        </div>
      </div>

      {/* Main Content Grid: Regional Calendars on Left, Holidays on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Configured Regional Calendars */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#07563D]" />
              <span>Configured Regional Calendars</span>
            </h3>
            <span className="text-[11px] text-gray-500 font-bold font-mono">{calendars.length} Available</span>
          </div>

          <div className="space-y-2.5">
            {calendars.map(cal => {
              const isSelected = selectedCalendarId === cal.id;
              const hCount = (cal.holidays || []).length;
              return (
                <div
                  key={cal.id}
                  onClick={() => setSelectedCalendarId(cal.id)}
                  className={cn(
                    'p-4 rounded-2xl border transition-all cursor-pointer relative group',
                    isSelected
                      ? 'border-[#07563D] bg-gradient-to-r from-[#07563D]/5 to-white shadow-sm ring-1 ring-[#07563D]/20'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-2xs'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 font-mono text-[11px] font-extrabold text-gray-800">
                        {cal.year}
                      </span>
                      {cal.is_default && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          HQ Default
                        </span>
                      )}
                    </div>
                    <Badge variant="emerald" size="sm">
                      {hCount} Holidays
                    </Badge>
                  </div>

                  <h4 className="text-sm font-black text-gray-900 mt-2 tracking-tight">{cal.name}</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{cal.description}</p>

                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                    <span className="flex items-center gap-1 truncate font-medium">
                      <MapPin className="w-3 h-3 text-[#07563D] shrink-0" />
                      <span className="truncate">
                        {(cal.location_ids && cal.location_ids.length > 0 ? cal.location_ids : ['All Locations']).join(', ')}
                      </span>
                    </span>

                    {/* Action buttons on card hover / active */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          openEditCalModal(cal);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-900 rounded hover:bg-gray-100"
                        title="Edit Calendar Settings"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setDupYear(cal.year + 1);
                          setDupName(`${cal.name.replace(/\d{4}$/, '')} ${cal.year + 1}`);
                          setIsDuplicateModalOpen(true);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-900 rounded hover:bg-gray-100"
                        title="Duplicate for Next Year"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {calendars.length > 1 && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setCalToDelete(cal);
                          }}
                          className="p-1 text-gray-400 hover:text-rose-600 rounded hover:bg-rose-50"
                          title="Delete Calendar"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Main Panel: Selected Calendar Holiday List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs space-y-4">
            {/* Calendar Banner Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-gray-900 tracking-tight">
                    {activeCal?.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-[#07563D]/10 text-[#07563D] font-mono text-xs font-black">
                    {activeCal?.year}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{activeCal?.description}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-purple-800 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Max Restricted Limit: {activeCal?.restricted_holiday_max_allowed ?? 2} Days</span>
                </span>
              </div>
            </div>

            {/* Filter, Search & View Mode Switcher */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search holiday name, notes, or date (e.g. Diwali, 2026-10)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs font-medium bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#07563D]/20 focus:border-[#07563D]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Type Filter Pills */}
                <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1">
                  {(['All', 'Mandatory', 'Restricted', 'HalfDay'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setSelectedTypeFilter(type)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                        selectedTypeFilter === type
                          ? 'bg-white text-gray-900 shadow-2xs'
                          : 'text-gray-500 hover:text-gray-900'
                      )}
                    >
                      {type === 'HalfDay' ? 'Half Day' : type}
                    </button>
                  ))}
                </div>

                {/* View Mode Toggle */}
                <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1">
                  <button
                    onClick={() => setViewMode('agenda')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                      viewMode === 'agenda'
                        ? 'bg-[#07563D] text-white shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900'
                    )}
                  >
                    Agenda List
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                      viewMode === 'grid'
                        ? 'bg-[#07563D] text-white shadow-2xs'
                        : 'text-gray-500 hover:text-gray-900'
                    )}
                  >
                    Annual Grid
                  </button>
                </div>
              </div>
            </div>

            {/* Content: Agenda View */}
            {viewMode === 'agenda' && (
              <div className="space-y-6 pt-2">
                {Object.keys(groupedByMonth).length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                    <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-gray-700">No holidays found</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Try adjusting your search or filter, or click "Add Holiday" to register new dates.
                    </p>
                    <button
                      onClick={openAddHolidayModal}
                      className="mt-4 px-4 py-2 bg-[#07563D] text-white text-xs font-bold rounded-xl hover:bg-[#05402e] cursor-pointer"
                    >
                      + Add Holiday
                    </button>
                  </div>
                ) : (
                  (Object.entries(groupedByMonth) as [string, Holiday[]][]).map(([monthName, hList]) => (
                    <div key={monthName} className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-xs font-black text-gray-900 tracking-wider uppercase">
                          {monthName} {activeCal?.year}
                        </span>
                        <div className="h-px bg-gray-100 flex-1" />
                        <span className="text-[10px] font-bold text-gray-400 font-mono">
                          {hList.length} {hList.length === 1 ? 'Day' : 'Days'}
                        </span>
                      </div>

                      <div className="border border-gray-200/80 rounded-2xl overflow-hidden divide-y divide-gray-100 bg-white shadow-2xs">
                        {hList.map(h => {
                          const isPast = h.date < todayStr;
                          const isToday = h.date === todayStr;
                          const dt = new Date(`${h.date}T00:00:00`);
                          const dayNum = dt.getDay();
                          const isWeekendOverlap = dayNum === 0 || dayNum === 6;

                          return (
                            <div
                              key={h.id}
                              className={cn(
                                'p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors group',
                                isToday ? 'bg-emerald-50/50' : 'hover:bg-gray-50/70'
                              )}
                            >
                              {/* Date & Title */}
                              <div className="flex items-center gap-3.5">
                                <div
                                  className={cn(
                                    'w-14 text-center py-1.5 px-2 rounded-xl flex flex-col items-center justify-center border shrink-0',
                                    isToday
                                      ? 'bg-[#07563D] text-white border-[#07563D]'
                                      : isWeekendOverlap
                                      ? 'bg-amber-50 text-amber-900 border-amber-200'
                                      : 'bg-gray-100 text-gray-800 border-gray-200'
                                  )}
                                >
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider block">
                                    {h.day_of_week || dt.toLocaleDateString('en-US', { weekday: 'short' })}
                                  </span>
                                  <span className="text-sm font-black font-mono">
                                    {h.date.split('-')[2]}
                                  </span>
                                </div>

                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4
                                      className={cn(
                                        'font-extrabold text-sm',
                                        isPast ? 'text-gray-600' : 'text-gray-900'
                                      )}
                                    >
                                      {h.name}
                                    </h4>
                                    {isToday && (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-600 text-white uppercase tracking-wider">
                                        Today
                                      </span>
                                    )}
                                    {isWeekendOverlap && (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                                        <AlertTriangle className="w-2.5 h-2.5" />
                                        <span>Weekend Overlap</span>
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-gray-500 mt-0.5">{h.description || 'Statutory observance'}</p>
                                </div>
                              </div>

                              {/* Badges & Actions */}
                              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {h.category && (
                                    <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                                      {h.category}
                                    </span>
                                  )}
                                  <Badge
                                    variant={h.type === 'Mandatory' || !h.is_optional ? 'purple' : 'amber'}
                                    size="sm"
                                  >
                                    {h.type === 'Mandatory' || !h.is_optional ? 'Public / Mandatory' : 'Restricted / Optional'}
                                  </Badge>
                                  {h.half_day && (
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                      Half Day
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => openEditHolidayModal(h)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
                                    title="Edit Holiday"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setHolidayToDelete({ calId: activeCal.id, holiday: h })}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                    title="Delete Holiday"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Content: Annual Grid View */}
            {viewMode === 'grid' && (
              <div className="pt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December',
                ].map((mName, mIdx) => {
                  const mStr = String(mIdx + 1).padStart(2, '0');
                  const mHolidays = holidaysList.filter(h => h.date.startsWith(`${activeCal?.year}-${mStr}`));

                  // Calculate days in month
                  const daysInM = new Date(activeCal?.year || 2026, mIdx + 1, 0).getDate();
                  const firstDayIdx = new Date(activeCal?.year || 2026, mIdx, 1).getDay();

                  return (
                    <div
                      key={mName}
                      className={cn(
                        'p-4 rounded-2xl border bg-white shadow-2xs space-y-2',
                        mHolidays.length > 0 ? 'border-gray-200' : 'border-gray-100 opacity-80'
                      )}
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                        <span className="text-xs font-black text-gray-900">{mName}</span>
                        <span className="text-[10px] font-bold text-gray-400 font-mono">
                          {mHolidays.length} Holidays
                        </span>
                      </div>

                      {/* Mini Month Grid */}
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, di) => (
                          <div key={di} className="text-gray-400 font-bold py-0.5">
                            {d}
                          </div>
                        ))}

                        {/* Blank offsets */}
                        {Array.from({ length: firstDayIdx }).map((_, bi) => (
                          <div key={`blank-${bi}`} />
                        ))}

                        {/* Days */}
                        {Array.from({ length: daysInM }).map((_, dayI) => {
                          const dNum = dayI + 1;
                          const curDateStr = `${activeCal?.year}-${mStr}-${String(dNum).padStart(2, '0')}`;
                          const hFound = mHolidays.find(h => h.date === curDateStr);
                          const isWeekend = (firstDayIdx + dayI) % 7 === 0 || (firstDayIdx + dayI) % 7 === 6;

                          return (
                            <div
                              key={`day-${dNum}`}
                              title={hFound ? `${hFound.name} (${hFound.type})` : undefined}
                              className={cn(
                                'h-6 rounded flex items-center justify-center font-mono font-bold transition-all text-[10px]',
                                hFound
                                  ? hFound.type === 'Mandatory' || !hFound.is_optional
                                    ? 'bg-purple-600 text-white shadow-2xs ring-1 ring-purple-400 cursor-pointer'
                                    : 'bg-amber-500 text-white shadow-2xs ring-1 ring-amber-300 cursor-pointer'
                                  : isWeekend
                                  ? 'text-gray-400 bg-gray-50'
                                  : 'text-gray-700'
                              )}
                              onClick={() => {
                                if (hFound) {
                                  openEditHolidayModal(hFound);
                                } else {
                                  setEditingHoliday(null);
                                  setHolidayName('');
                                  setHolidayDate(curDateStr);
                                  setHolidayType('Mandatory');
                                  setHolidayCategory('Regional');
                                  setHolidayDesc('');
                                  setIsHalfDay(false);
                                  setIsAddHolidayModalOpen(true);
                                }
                              }}
                            >
                              {dNum}
                            </div>
                          );
                        })}
                      </div>

                      {/* Month Holiday Snippet Pills */}
                      {mHolidays.length > 0 && (
                        <div className="space-y-1 pt-1">
                          {mHolidays.map(h => (
                            <div
                              key={h.id}
                              onClick={() => openEditHolidayModal(h)}
                              className="text-[10px] font-bold p-1 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-between cursor-pointer"
                            >
                              <span className="truncate text-gray-800">{h.name}</span>
                              <span className="text-[9px] font-mono text-gray-500 shrink-0 ml-1">
                                {h.date.split('-')[2]}th
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Holiday Modal */}
      {isAddHolidayModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2.5 text-[#07563D]">
                <div className="p-2 rounded-xl bg-[#07563D]/10">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">
                    {editingHoliday ? 'Edit Statutory Holiday' : 'Add Holiday to Calendar'}
                  </h3>
                  <span className="text-[11px] text-gray-500 font-medium">
                    Calendar: {activeCal?.name} ({activeCal?.year})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsAddHolidayModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHoliday} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Holiday Name *</label>
                <input
                  type="text"
                  required
                  value={holidayName}
                  onChange={e => setHolidayName(e.target.value)}
                  placeholder="e.g. Diwali / Deepavali Festival"
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-bold bg-white text-gray-900 focus:ring-2 focus:ring-[#07563D]/20 focus:border-[#07563D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={holidayDate}
                    onChange={e => setHolidayDate(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-bold font-mono bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Holiday Type *</label>
                  <select
                    value={holidayType}
                    onChange={e => setHolidayType(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-bold bg-white text-gray-900"
                  >
                    <option value="Mandatory">Public / Mandatory (Compulsory)</option>
                    <option value="Restricted">Restricted / Optional (Floating)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={holidayCategory}
                    onChange={e => setHolidayCategory(e.target.value as any)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-bold bg-white text-gray-900"
                  >
                    <option value="National">National Gazetted</option>
                    <option value="Regional">Regional / State Holiday</option>
                    <option value="Religious">Religious Festival</option>
                    <option value="Corporate">Corporate Floating</option>
                    <option value="Cultural">Cultural Observance</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-xl bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isHalfDay}
                      onChange={e => setIsHalfDay(e.target.checked)}
                      className="rounded text-[#07563D] focus:ring-[#07563D]"
                    />
                    <span className="font-bold text-gray-800 text-xs">Is Half-Day Holiday</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description / Cultural Significance</label>
                <textarea
                  rows={2}
                  value={holidayDesc}
                  onChange={e => setHolidayDesc(e.target.value)}
                  placeholder="e.g. Festival of lights celebrated across India. Offices will remain closed."
                  className="w-full p-2.5 border border-gray-300 rounded-xl bg-white text-gray-900"
                />
              </div>

              <label className="flex items-center gap-2 text-gray-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={notifyEmployees}
                  onChange={e => setNotifyEmployees(e.target.checked)}
                  className="rounded text-[#07563D] focus:ring-[#07563D]"
                />
                <span className="font-medium text-xs">Notify employees and sync to company workspace calendars</span>
              </label>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddHolidayModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingHoliday ? 'Update Holiday' : 'Save Holiday'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Regional Calendar Modal */}
      {isCreateCalModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2.5 text-[#07563D]">
                <div className="p-2 rounded-xl bg-[#07563D]/10">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">
                    {editingCal ? 'Edit Regional Calendar Settings' : 'Create Regional Holiday Calendar'}
                  </h3>
                  <span className="text-[11px] text-gray-500 font-medium">
                    Branch & location-scoped public holiday schedule
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsCreateCalModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCalendar} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Calendar Name *</label>
                  <input
                    type="text"
                    required
                    value={calName}
                    onChange={e => setCalName(e.target.value)}
                    placeholder="e.g. Karnataka Tech Hub Holidays 2026"
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-bold bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Year *</label>
                  <input
                    type="number"
                    required
                    value={calYear}
                    onChange={e => setCalYear(parseInt(e.target.value, 10))}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-mono font-bold bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Code / Identifier *</label>
                  <input
                    type="text"
                    required
                    value={calCode}
                    onChange={e => setCalCode(e.target.value.toUpperCase())}
                    placeholder="e.g. KA-2026"
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-mono font-bold bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Max Restricted Days Allowed</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={calMaxRestricted}
                    onChange={e => setCalMaxRestricted(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-mono font-bold bg-white text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Applicable Locations / Branches</label>
                <input
                  type="text"
                  value={calLocations.join(', ')}
                  onChange={e => setCalLocations(e.target.value.split(',').map(s => s.trim()))}
                  placeholder="loc-cbe-01, loc-blr-01, loc-mum-01"
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-mono bg-white text-gray-900"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">Comma-separated location IDs or branch codes</span>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={calDesc}
                  onChange={e => setCalDesc(e.target.value)}
                  placeholder="Notes on statutory rules, regional labor acts, or branch applicability."
                  className="w-full p-2.5 border border-gray-300 rounded-xl bg-white text-gray-900"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateCalModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCal ? 'Save Changes' : 'Create Calendar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preset Templates Import Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-purple-50/60">
              <div className="flex items-center gap-2.5 text-purple-900">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="text-sm font-black text-gray-900">Import Preset Holiday Template</h3>
                  <span className="text-[11px] text-gray-500 font-medium">
                    Pre-fills standard official holidays for {activeCal?.year}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <p className="text-gray-600 text-xs">
                Select an official regional holiday schedule template to import into <strong className="text-gray-900">{activeCal?.name}</strong>:
              </p>

              <div
                onClick={() => applyPresetTemplate('india_central')}
                className="p-3.5 rounded-2xl border border-purple-200 bg-purple-50/40 hover:bg-purple-50 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div>
                  <h4 className="font-extrabold text-gray-900">Central India Gazetted Holidays (15 Days)</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">Republic Day, Independence Day, Gandhi Jayanti, Diwali, Eid, Christmas</p>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-600 group-hover:translate-x-0.5 transition-transform" />
              </div>

              <div
                onClick={() => applyPresetTemplate('uk_bank')}
                className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div>
                  <h4 className="font-extrabold text-gray-900">UK Statutory Bank Holidays (8 Days)</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">Good Friday, Easter Monday, Early May, Summer Bank Holiday, Boxing Day</p>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Calendar Modal */}
      {isDuplicateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2 text-[#07563D]">
                <Copy className="w-5 h-5" />
                <h3 className="text-sm font-black text-gray-900">Duplicate Calendar for Next Year</h3>
              </div>
              <button
                onClick={() => setIsDuplicateModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDuplicateCalendar} className="p-6 space-y-4 text-xs">
              <p className="text-gray-600">
                Clones all <strong>{holidaysList.length}</strong> holidays from <strong>{activeCal?.name}</strong> to a new calendar with adjusted dates for the new year.
              </p>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Year *</label>
                <input
                  type="number"
                  required
                  value={dupYear}
                  onChange={e => setDupYear(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-mono font-bold bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">New Calendar Name *</label>
                <input
                  type="text"
                  required
                  value={dupName}
                  onChange={e => setDupName(e.target.value)}
                  placeholder="e.g. Tamil Nadu India Holidays 2027"
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-bold bg-white text-gray-900"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDuplicateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>Clone Calendar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Holiday Confirmation */}
      {holidayToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-sm overflow-hidden p-6 space-y-4 text-xs">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-gray-900">Delete Holiday?</h3>
              <p className="text-gray-500 mt-1">
                Are you sure you want to remove <strong>{holidayToDelete.holiday.name}</strong> ({holidayToDelete.holiday.date}) from this calendar?
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setHolidayToDelete(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  leaveApi.deleteHoliday(holidayToDelete.calId, holidayToDelete.holiday.id);
                  setHolidayToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Calendar Confirmation */}
      {calToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-sm overflow-hidden p-6 space-y-4 text-xs">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-gray-900">Delete Regional Calendar?</h3>
              <p className="text-gray-500 mt-1">
                Are you sure you want to delete <strong>{calToDelete.name}</strong>? All associated {calToDelete.holidays?.length || 0} holidays will be removed.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setCalToDelete(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  leaveApi.deleteHolidayCalendar(calToDelete.id);
                  setCalToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
              >
                Yes, Delete Calendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
