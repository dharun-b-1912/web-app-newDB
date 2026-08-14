import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Tabs } from '../../components/ui/Tabs';
import { Clock, Calendar, CircleDollarSign, Download, Play, FileText } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { usePermission } from '../../hooks/usePermission';

export const TimeAndPayView: React.FC = () => {
  const { showToast } = useToast();
  const { hasPermission, primaryRole } = usePermission();
  const [activeTab, setActiveTab] = useState('attendance');

  const canViewPayroll = hasPermission('payroll', 'view');
  const canRunPayroll = hasPermission('payroll', 'manage');

  const attendanceRecords = [
    { id: 'ATT-001', name: 'Arun Kumar', dept: 'Engineering', checkIn: '09:02 AM', checkOut: '06:15 PM', hours: '9h 13m', status: 'Active' },
    { id: 'ATT-002', name: 'Deepa Sharma', dept: 'People Ops', checkIn: '08:55 AM', checkOut: '05:45 PM', hours: '8h 50m', status: 'Active' },
    { id: 'ATT-003', name: 'Karthik Raja', dept: 'Finance', checkIn: '10:15 AM', checkOut: '07:00 PM', hours: '8h 45m', status: 'Probation' },
    { id: 'ATT-004', name: 'Sneha Patel', dept: 'Engineering', checkIn: '—', checkOut: '—', hours: '0h', status: 'On Leave' },
  ];

  const payrollHistory = [
    { month: 'July 2026', totalEmployees: 428, grossPay: '₹ 4,82,50,000', netPay: '₹ 4,12,10,000', status: 'Approved', processedOn: '31 Jul 2026' },
    { month: 'June 2026', totalEmployees: 422, grossPay: '₹ 4,75,20,000', netPay: '₹ 4,05,80,000', status: 'Approved', processedOn: '30 Jun 2026' },
    { month: 'May 2026', totalEmployees: 415, grossPay: '₹ 4,68,10,000', netPay: '₹ 3,99,50,000', status: 'Approved', processedOn: '31 May 2026' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-[#07563D]">
              <CircleDollarSign className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Time, Attendance & Payroll Engine</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1 pl-11">
            Automated biometric shift tracking, leave approvals, and multi-currency payroll distribution
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={() => showToast('Attendance summary exported')}>
            Export Log
          </Button>
          {canRunPayroll && (
            <Button size="sm" leftIcon={<Play className="w-4 h-4" />} onClick={() => showToast('Initiating August 2026 Payroll Run')}>
              Run August Payroll
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Selection */}
      <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
        <Tabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'attendance', label: primaryRole === 'Manager' || primaryRole === 'Team Lead' ? 'Team Attendance Logs' : 'Biometric Attendance Logs', icon: <Clock className="w-4 h-4" />, badge: primaryRole === 'Manager' ? 18 : 428 },
            ...(canViewPayroll ? [{ id: 'payroll', label: 'Payroll & Compensation', icon: <CircleDollarSign className="w-4 h-4" /> }] : []),
            { id: 'leave', label: 'Leave Matrix & Balances', icon: <Calendar className="w-4 h-4" />, badge: 3 },
          ]}
        />
      </Card>

      {/* Content for Attendance */}
      {activeTab === 'attendance' && (
        <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Today's Shift Clocking (12 August 2026)</h2>
            <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              Biometric Sync: Online
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Logged Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceRecords.map(rec => (
                <TableRow key={rec.id}>
                  <TableCell className="font-bold text-gray-900">{rec.name}</TableCell>
                  <TableCell className="text-xs text-gray-600">{rec.dept}</TableCell>
                  <TableCell className="text-xs font-mono text-gray-800">{rec.checkIn}</TableCell>
                  <TableCell className="text-xs font-mono text-gray-800">{rec.checkOut}</TableCell>
                  <TableCell className="text-xs font-semibold text-gray-900">{rec.hours}</TableCell>
                  <TableCell>
                    <StatusBadge status={rec.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Content for Payroll */}
      {activeTab === 'payroll' && (
        <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Historical Payroll Disbursements</h2>
            <Button variant="outline" size="sm" leftIcon={<FileText className="w-3.5 h-3.5" />} onClick={() => showToast('Tax compliance report downloaded')}>
              Download Form 16 / Tax Summary
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pay Period</TableHead>
                <TableHead>Headcount</TableHead>
                <TableHead>Gross Payroll</TableHead>
                <TableHead>Net Disbursement</TableHead>
                <TableHead>Processing Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollHistory.map((p, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-bold text-gray-900">{p.month}</TableCell>
                  <TableCell className="text-xs text-gray-600">{p.totalEmployees} Employees</TableCell>
                  <TableCell className="text-xs font-semibold text-gray-900">{p.grossPay}</TableCell>
                  <TableCell className="text-xs font-bold text-[#07563D]">{p.netPay}</TableCell>
                  <TableCell className="text-xs text-gray-500">{p.processedOn}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => showToast(`Downloading bank advice for ${p.month}`)}>
                      Download Advice
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Content for Leave */}
      {activeTab === 'leave' && (
        <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-gray-900">Leave Entitlements & Approvals</h2>
          <p className="text-xs text-gray-500">3 pending leave requests requiring manager or HR approval.</p>
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-amber-700" />
              <div>
                <div className="text-xs font-bold text-gray-900">Sneha Patel — Privilege Leave (4 Days)</div>
                <div className="text-[11px] text-gray-600">14 Aug 2026 to 18 Aug 2026 • Reason: Family Function</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => showToast('Leave request rejected')}>Reject</Button>
              <Button size="sm" onClick={() => showToast('Leave request approved')}>Approve</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
