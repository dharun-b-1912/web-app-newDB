import React, { useState } from 'react';
import { essApi } from '../../../services/essApi';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Clock, Calendar, MapPin, Plus, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const EssAttendanceView: React.FC = () => {
  const { showToast } = useToast();
  const attendance = essApi.getAttendanceState();
  const [clockedIn, setClockedIn] = useState(attendance.is_clocked_in);

  const history = [
    { date: '2026-08-11', checkIn: '09:05 AM', checkOut: '06:12 PM', hours: '09h 07m', overtime: '01h 07m', status: 'Present', loc: 'MAA Office' },
    { date: '2026-08-10', checkIn: '09:00 AM', checkOut: '06:05 PM', hours: '09h 05m', overtime: '01h 05m', status: 'Present', loc: 'MAA Office' },
    { date: '2026-08-09', checkIn: '09:12 AM', checkOut: '06:00 PM', hours: '08h 48m', overtime: '00h 00m', status: 'Present (WFH)', loc: 'Hybrid WFH' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#07563D]" />
            <span>My Attendance & Regularization Ledger</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Clock in/out, view working hours, shift timings, overtime hours and submit attendance regularization</p>
        </div>

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Attendance Regularization Request modal opened')}>
          Regularize Attendance
        </Button>
      </div>

      {/* Attendance History Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Attendance Log History</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-mono">Date</th>
              <th className="p-4 font-mono">Check In</th>
              <th className="p-4 font-mono">Check Out</th>
              <th className="p-4 font-mono text-right">Working Hours</th>
              <th className="p-4 font-mono text-right">Overtime</th>
              <th className="p-4 font-mono">Location</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-mono">
            {history.map(row => (
              <tr key={row.date} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-bold text-gray-900">{row.date}</td>
                <td className="p-4 text-emerald-700 font-bold">{row.checkIn}</td>
                <td className="p-4 text-gray-700">{row.checkOut}</td>
                <td className="p-4 text-right font-black text-gray-900">{row.hours}</td>
                <td className="p-4 text-right text-emerald-800 font-bold">{row.overtime}</td>
                <td className="p-4 font-sans text-gray-600">{row.loc}</td>
                <td className="p-4 text-center font-sans"><Badge variant="emerald">{row.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
