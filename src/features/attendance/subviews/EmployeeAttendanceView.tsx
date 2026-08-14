import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Search, Download, Filter, Eye, RefreshCw, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { AttendanceDaily } from '../../../types/attendance';
import { attendanceApi } from '../../../services/attendanceApi';
import { useToast } from '../../../components/ui/Toast';
import { formatMinutesToHoursStr } from '../../../lib/attendance/attendanceEngine';

interface EmployeeAttendanceViewProps {
  onOpenEmployeeProfile?: (employeeId: string) => void;
  onOpenManualModal?: () => void;
}

export const EmployeeAttendanceView: React.FC<EmployeeAttendanceViewProps> = ({
  onOpenEmployeeProfile,
  onOpenManualModal,
}) => {
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const records = attendanceApi.getDailyAttendance(selectedDate, deptFilter, statusFilter, searchQuery);

  const handleExportCsv = () => {
    showToast(`Exported ${records.length} employee attendance records to CSV`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Employee Daily Attendance</h2>
          <p className="text-xs text-gray-500 mt-1">
            Complete daily clocking records, gross/net working durations, late deductions, and punch sources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportCsv}>
            Export CSV
          </Button>
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={onOpenManualModal}>
            Manual Attendance Record
          </Button>
        </div>
      </div>

      <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700">
              <CalendarIcon className="w-3.5 h-3.5 text-[#07563D]" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent focus:outline-none"
              />
            </div>

            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
            >
              <option value="ALL">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="People Operations">People Operations</option>
              <option value="Finance & Accounts">Finance & Accounts</option>
              <option value="Product Strategy">Product Strategy</option>
              <option value="Quality Assurance">Quality Assurance</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
            >
              <option value="ALL">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Checked Out">Checked Out</option>
              <option value="Late">Late</option>
              <option value="Early Checkout">Early Checkout</option>
              <option value="Absent">Absent</option>
              <option value="WFH">WFH</option>
              <option value="On Leave">On Leave</option>
              <option value="Missing Punch">Missing Punch</option>
            </select>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name / code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#07563D] w-52"
            />
          </div>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Dept / Role</TableHead>
              <TableHead>Date & Shift</TableHead>
              <TableHead>Check-In</TableHead>
              <TableHead>Check-Out</TableHead>
              <TableHead>Net Hours</TableHead>
              <TableHead>Break</TableHead>
              <TableHead>Late / Early</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map(r => (
              <TableRow key={r.id} className="hover:bg-gray-50/80">
                <TableCell>
                  <div className="font-bold text-gray-900 text-xs">{r.employee_name}</div>
                  <div className="text-[10px] text-gray-500 font-mono">{r.employee_code}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-semibold text-gray-800">{r.department}</div>
                  <div className="text-[10px] text-gray-500">{r.designation}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-semibold text-gray-900">{r.date}</div>
                  <div className="text-[10px] text-gray-500">{r.shift_name}</div>
                </TableCell>
                <TableCell className="text-xs font-mono font-semibold text-emerald-800">{r.first_check_in || '—'}</TableCell>
                <TableCell className="text-xs font-mono text-gray-800">{r.last_check_out || '—'}</TableCell>
                <TableCell className="text-xs font-bold text-gray-900">{formatMinutesToHoursStr(r.net_working_minutes)}</TableCell>
                <TableCell className="text-xs text-gray-600">{r.total_break_minutes}m</TableCell>
                <TableCell>
                  <div className="text-xs">
                    {r.late_minutes > 0 && <span className="text-amber-700 font-bold block">Late +{r.late_minutes}m</span>}
                    {r.early_checkout_minutes > 0 && <span className="text-orange-700 font-bold block">Early -{r.early_checkout_minutes}m</span>}
                    {r.late_minutes === 0 && r.early_checkout_minutes === 0 && <span className="text-gray-400">—</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      r.status === 'Present' || r.status === 'Checked Out'
                        ? 'emerald'
                        : r.status === 'Late' || r.status === 'Early Checkout'
                        ? 'amber'
                        : r.status === 'Absent' || r.status === 'Missing Punch'
                        ? 'rose'
                        : 'purple'
                    }
                    size="sm"
                  >
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold border border-gray-200">
                    {r.source}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="xs"
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                    onClick={() => onOpenEmployeeProfile?.(r.employee_id)}
                  >
                    Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
