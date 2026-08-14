import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { HolidayCalendar, PublicHoliday } from '../../../types/leave';
import { Badge } from '../../../components/ui/Badge';
import {
  Calendar,
  Plus,
  Upload,
  Download,
  Building,
  CheckCircle,
  Star,
  MapPin,
} from 'lucide-react';

export const HolidayCalendarView: React.FC = () => {
  const [calendars, setCalendars] = useState<HolidayCalendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('hol-ind-2026');

  useEffect(() => {
    setCalendars(leaveApi.getHolidayCalendars());
  }, []);

  const activeCal = calendars.find(c => c.id === selectedCalendarId) || calendars[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#07563D]" />
            <span>Multi-Branch Holiday Calendars</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage public, gazetted, and optional/restricted holiday lists by location and branch
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 flex items-center gap-1.5 hover:bg-gray-50">
            <Upload className="w-4 h-4 text-gray-500" />
            <span>Import CSV</span>
          </button>
          <button className="px-4 py-2 rounded-xl bg-[#07563D] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-[#05402e]">
            <Plus className="w-4 h-4" />
            <span>Add Holiday</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Selector Cards */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Configured Regional Calendars</h3>
          {calendars.map(cal => (
            <div
              key={cal.id}
              onClick={() => setSelectedCalendarId(cal.id)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                selectedCalendarId === cal.id
                  ? 'border-[#07563D] bg-[#07563D]/5 shadow-xs'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-gray-800">{cal.year}</span>
                <Badge variant="emerald" size="sm">
                  {cal.holidays.length} Holidays
                </Badge>
              </div>
              <h4 className="text-sm font-extrabold text-gray-900 mt-1">{cal.name}</h4>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#07563D]" />
                <span>Locations: {cal.applicable_locations.join(', ')}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Selected Calendar Holiday List Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">{activeCal.name} ({activeCal.year})</h3>
              <p className="text-xs text-gray-500">Official list of mandatory public and optional/restricted holidays</p>
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full">
              Max Restricted Limit: {activeCal.restricted_holiday_max_allowed} Days
            </span>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {activeCal.holidays.map((h, idx) => (
              <div key={idx} className="p-3 bg-white flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="text-center bg-gray-100 px-2.5 py-1 rounded-lg">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">{h.day_of_week}</span>
                    <span className="text-xs font-mono font-black text-gray-900">{h.date}</span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-gray-900">{h.name}</h4>
                    <span className="text-[10px] text-gray-400 font-medium">{h.description}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={h.type === 'Mandatory' ? 'purple' : 'amber'} size="sm">
                    {h.type === 'Mandatory' ? 'Public / Mandatory' : 'Restricted / Optional'}
                  </Badge>
                  {h.half_day && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">Half Day</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
