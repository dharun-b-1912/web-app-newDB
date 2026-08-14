import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { History, Calendar, Download, TrendingUp, Search } from 'lucide-react';
import { attendanceApi } from '../../../services/attendanceApi';
import { formatMinutesToHoursStr } from '../../../lib/attendance/attendanceEngine';
import { useToast } from '../../../components/ui/Toast';

export const AttendanceHistoryView: React.FC = () => {
  const { showToast } = useToast();
  const [historyRecords] = useState(() => attendanceApi.getDailyAttendance());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Attendance History & Monthly Logs</h2>
          <p className="text-xs text-gray-500 mt-1">
            Historical attendance archive, monthly attendance percentage trends, and immutable audit log
          </p>
        </div>
        <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={() => showToast('Exported Attendance History Archive')}>
          Export Archive
        </Button>
      </div>

      <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-gray-900">Historical Attendance Logs</h3>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Date & Shift</TableHead>
              <TableHead>Check-In</TableHead>
              <TableHead>Check-Out</TableHead>
              <TableHead>Net Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historyRecords.map(r => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-bold text-gray-900 text-xs">{r.employee_name}</div>
                  <div className="text-[10px] text-gray-500 font-mono">{r.employee_code}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-semibold text-gray-900">{r.date}</div>
                  <div className="text-[10px] text-gray-500">{r.shift_name}</div>
                </TableCell>
                <TableCell className="text-xs font-mono font-semibold text-emerald-800">{r.first_check_in || '—'}</TableCell>
                <TableCell className="text-xs font-mono font-semibold text-gray-800">{r.last_check_out || '—'}</TableCell>
                <TableCell className="text-xs font-bold text-gray-900">{formatMinutesToHoursStr(r.net_working_minutes)}</TableCell>
                <TableCell>
                  <Badge variant="emerald" size="sm">{r.status}</Badge>
                </TableCell>
                <TableCell className="text-xs font-mono text-gray-600">{r.source}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
