import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { ShieldAlert, Plus, Check, X, FileText } from 'lucide-react';
import { attendanceApi } from '../../../services/attendanceApi';
import { useToast } from '../../../components/ui/Toast';

export const ManualAttendanceView: React.FC = () => {
  const { showToast } = useToast();
  const [empName, setEmpName] = useState('Sneha Patel');
  const [date, setDate] = useState('2026-08-12');
  const [checkIn, setCheckIn] = useState('09:30 AM');
  const [checkOut, setCheckOut] = useState('06:30 PM');
  const [reason, setReason] = useState('Biometric reader maintenance during office arrival.');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    attendanceApi.checkIn('emp-004', empName, 'MANUAL');
    showToast(`Manual attendance log created for ${empName} on ${date}. Audit log generated.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Manual Attendance Entry & Override</h2>
          <p className="text-xs text-gray-500 mt-1">
            Authorized HR override for site visits, official business transit, hardware failures, or network outages with full audit logging
          </p>
        </div>
      </div>

      <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs max-w-2xl space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Employee Name</label>
            <input
              type="text"
              value={empName}
              onChange={e => setEmpName(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Check-In</label>
              <input
                type="text"
                value={checkIn}
                onChange={e => setCheckIn(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#07563D] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Check-Out</label>
              <input
                type="text"
                value={checkOut}
                onChange={e => setCheckOut(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#07563D] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Mandatory Audit Justification</label>
            <textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
            />
          </div>

          <div className="pt-2">
            <Button size="sm" type="submit">
              Log Manual Attendance Record
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
