import React, { useState, useEffect } from 'react';
import { tlApi } from '../../../services/tlApi';
import { TlAttendanceRow } from '../../../types/tl';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Clock, Plus, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const TlAttendanceView: React.FC = () => {
  const { showToast } = useToast();
  const [rows, setRows] = useState<TlAttendanceRow[]>([]);

  useEffect(() => {
    setRows(tlApi.getTeamAttendance());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#07563D]" />
            <span>Team Attendance Live Ledger & Regularization Review</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Real-time team check-in status, shift timings, working hours, missing punch alerts & WFH verification</p>
        </div>

        <Badge variant="emerald">Real-time Attendance Active</Badge>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-mono">Employee ID</th>
              <th className="p-4">Team Member</th>
              <th className="p-4 font-mono">Shift</th>
              <th className="p-4 font-mono">Check In</th>
              <th className="p-4 font-mono">Check Out</th>
              <th className="p-4 font-mono text-right">Working Hours</th>
              <th className="p-4 font-mono">Location & Geofence</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-mono">
            {rows.map(row => (
              <tr key={row.employee_id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-bold text-gray-900">{row.employee_id}</td>
                <td className="p-4 font-sans font-extrabold text-gray-900">{row.employee_name}</td>
                <td className="p-4 font-sans text-gray-700">{row.shift}</td>
                <td className="p-4 text-emerald-700 font-bold">{row.check_in}</td>
                <td className="p-4 text-gray-700">{row.check_out}</td>
                <td className="p-4 text-right font-black text-gray-900">{row.working_hours}</td>
                <td className="p-4 font-sans text-gray-600">{row.location}</td>
                <td className="p-4 text-center font-sans"><Badge variant="emerald">{row.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
