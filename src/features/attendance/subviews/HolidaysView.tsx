import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Calendar, Plus, RefreshCw, CheckCircle2, Sparkles, MapPin } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { leaveApi } from '../../../services/leaveApi';
import { HolidayCalendar, Holiday } from '../../../types/leave';
import { hrEventBus } from '../../../services/hrEventBus';

export const HolidaysView: React.FC = () => {
  const { showToast } = useToast();
  const [calendars, setCalendars] = useState<HolidayCalendar[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadHolidays = () => {
    const cals = leaveApi.getHolidayCalendars();
    setCalendars(cals);
  };

  useEffect(() => {
    loadHolidays();
    const unsub = hrEventBus.subscribe('leave.*', () => loadHolidays());
    return () => unsub();
  }, []);

  const activeCal = calendars.find(c => c.is_default) || calendars[0] || null;
  const holidaysList: Holiday[] = activeCal?.holidays || [];

  const handleSyncAttendance = async () => {
    setIsSyncing(true);
    try {
      const res = await leaveApi.syncHolidayCalendarToAttendanceAsync(activeCal?.id);
      showToast(`✓ Successfully synced ${res.dates.length} holidays with attendance daily & payroll ledger! (${res.syncedCount} records refreshed).`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to sync holidays', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Holiday Calendar & Overtime Rules</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
              {activeCal?.year || 2026} Official
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Enterprise statutory public holidays, state festivals, and holiday working overtime multipliers (2.0x Double Pay) for Joy Corporate Solutions Pvt Ltd.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />}
            onClick={handleSyncAttendance}
            disabled={isSyncing}
          >
            {isSyncing ? 'Syncing Attendance...' : 'Sync to Attendance Ledger'}
          </Button>
          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => showToast('Open Leave -> Holidays tab to configure regional calendars or add custom holidays.')}
          >
            Add Holiday
          </Button>
        </div>
      </div>

      <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-gray-900">
              {activeCal?.name || 'Tamil Nadu India Holidays 2026'}
            </h3>
            <span className="text-xs text-gray-400 font-mono">
              ({holidaysList.length} Scheduled Holidays)
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <span>Coimbatore HQ & Chennai Branch (Tamil Nadu)</span>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Holiday & Festival Name</TableHead>
              <TableHead>Date & Day</TableHead>
              <TableHead>Holiday Type</TableHead>
              <TableHead>Festive Category</TableHead>
              <TableHead>Payable Credit</TableHead>
              <TableHead>Overtime Multiplier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidaysList.map(hol => {
              const isMandatory = hol.type === 'Mandatory' || !hol.is_optional;
              return (
                <TableRow key={hol.id} className="hover:bg-purple-50/20">
                  <TableCell>
                    <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                      <span>{hol.name}</span>
                      {hol.half_day && (
                        <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">Half Day</span>
                      )}
                    </div>
                    {hol.description && (
                      <div className="text-[10px] text-gray-500 mt-0.5">{hol.description}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold font-mono text-gray-900">{hol.date}</div>
                    <div className="text-[10px] text-gray-500">{hol.day_of_week || 'Weekday'}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={isMandatory ? 'purple' : 'amber'} size="xs">
                      {isMandatory ? 'Public / Mandatory' : 'Restricted / Optional'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                      {hol.category || 'National Gazetted'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>1.0d Full Pay</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-purple-900">
                    2.0x Double Pay
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
