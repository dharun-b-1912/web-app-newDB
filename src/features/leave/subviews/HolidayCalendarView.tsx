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
  X,
  Check,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

export const HolidayCalendarView: React.FC = () => {
  const [calendars, setCalendars] = useState<HolidayCalendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('hol-ind-2026');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [newDate, setNewDate] = useState('2026-10-02');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'Mandatory' | 'Restricted'>('Mandatory');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    setCalendars(leaveApi.getHolidayCalendars());
  }, []);

  const activeCal = calendars.find(c => c.id === selectedCalendarId) || calendars[0];

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const dateObj = new Date(newDate);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

    const newHoliday: PublicHoliday = {
      id: `hol-${Date.now()}`,
      date: newDate,
      name: newName,
      type: newType,
      day_of_week: dayOfWeek,
      description: newDesc,
    };

    setCalendars(prev =>
      prev.map(c =>
        c.id === selectedCalendarId
          ? { ...c, holidays: [...c.holidays, newHoliday].sort((a, b) => a.date.localeCompare(b.date)) }
          : c
      )
    );

    setIsAddModalOpen(false);
    setNewName('');
    setNewDesc('');
  };

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
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Holiday</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Selector Cards */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
            Configured Regional Calendars
          </h3>
          {calendars.map(cal => (
            <div
              key={cal.id}
              onClick={() => setSelectedCalendarId(cal.id)}
              className={cn(
                'p-4 rounded-2xl border cursor-pointer transition-all',
                selectedCalendarId === cal.id
                  ? 'border-[#07563D] bg-[#07563D]/5 shadow-xs'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
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
              <h3 className="text-sm font-extrabold text-gray-900">
                {activeCal?.name} ({activeCal?.year})
              </h3>
              <p className="text-xs text-gray-500">Official list of mandatory public and optional/restricted holidays</p>
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full">
              Max Restricted Limit: {activeCal?.restricted_holiday_max_allowed} Days
            </span>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {activeCal?.holidays.map((h, idx) => (
              <div key={idx} className="p-3 bg-white flex items-center justify-between text-xs hover:bg-gray-50/50">
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
                  {h.half_day && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                      Half Day
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Holiday Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2 text-[#07563D]">
                <Calendar className="w-5 h-5" />
                <h3 className="text-sm font-black text-gray-900">Add Holiday to Calendar</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddHoliday} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Holiday Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Diwali Festival"
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-bold bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-bold font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Holiday Type *</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as any)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-bold bg-white"
                  >
                    <option value="Mandatory">Public / Mandatory</option>
                    <option value="Restricted">Restricted / Optional</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="e.g. Festival of Lights celebration"
                  className="w-full p-2.5 border border-gray-300 rounded-xl bg-white"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Holiday</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
