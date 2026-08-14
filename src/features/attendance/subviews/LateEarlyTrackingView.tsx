import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Clock, LogOut, AlertCircle, CheckCircle, FileText, Download } from 'lucide-react';
import { attendanceApi } from '../../../services/attendanceApi';
import { useToast } from '../../../components/ui/Toast';

export const LateEarlyTrackingView: React.FC = () => {
  const { showToast } = useToast();
  const [dailyRecords] = useState(() => attendanceApi.getDailyAttendance());

  const lateList = dailyRecords.filter(r => r.status === 'Late' || r.late_minutes > 0);
  const earlyList = dailyRecords.filter(r => r.status === 'Early Checkout' || r.early_checkout_minutes > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Late Arrival & Early Checkout Tracking</h2>
          <p className="text-xs text-gray-500 mt-1">
            Audit late arrivals exceeding grace thresholds, early departures before shift end, and manager exceptions
          </p>
        </div>
        <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={() => showToast('Exported Late & Early report to Excel')}>
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Late Arrival Tracking */}
        <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                <Clock className="w-5 h-5" />
              </span>
              <h3 className="text-base font-extrabold text-gray-900">Late Arrivals Today</h3>
            </div>
            <Badge variant="amber" size="sm">{lateList.length} Flagged</Badge>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Shift Start</TableHead>
                <TableHead>Check-In</TableHead>
                <TableHead>Late Mins</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lateList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-xs text-gray-500">
                    No late arrivals logged today! Perfect punctuality.
                  </TableCell>
                </TableRow>
              ) : (
                lateList.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-bold text-gray-900 text-xs">{r.employee_name}</div>
                      <div className="text-[10px] text-gray-500">{r.department}</div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{r.expected_check_in}</TableCell>
                    <TableCell className="text-xs font-mono font-bold text-amber-800">{r.first_check_in}</TableCell>
                    <TableCell className="text-xs font-bold text-rose-700">+{r.late_minutes}m</TableCell>
                    <TableCell>
                      <Badge variant="amber" size="xs">Grace Exceeded</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Early Checkout Tracking */}
        <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-orange-50 text-orange-700">
                <LogOut className="w-5 h-5" />
              </span>
              <h3 className="text-base font-extrabold text-gray-900">Early Checkouts Today</h3>
            </div>
            <Badge variant="amber" size="sm">{earlyList.length} Flagged</Badge>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Expected End</TableHead>
                <TableHead>Check-Out</TableHead>
                <TableHead>Shortfall</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {earlyList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-xs text-gray-500">
                    No early departures recorded today.
                  </TableCell>
                </TableRow>
              ) : (
                earlyList.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-bold text-gray-900 text-xs">{r.employee_name}</div>
                      <div className="text-[10px] text-gray-500">{r.department}</div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{r.expected_check_out}</TableCell>
                    <TableCell className="text-xs font-mono font-bold text-orange-800">{r.last_check_out}</TableCell>
                    <TableCell className="text-xs font-bold text-rose-700">-{r.early_checkout_minutes}m</TableCell>
                    <TableCell>
                      <Badge variant="amber" size="sm">Early Departure</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};
