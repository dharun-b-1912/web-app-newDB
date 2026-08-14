import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Calendar, Plus, Globe, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const HolidaysView: React.FC = () => {
  const { showToast } = useToast();

  const holidays = [
    { id: 'hol-1', name: 'Independence Day', date: '2026-08-15', day: 'Saturday', type: 'Public Holiday', branches: 'All India Offices' },
    { id: 'hol-2', name: 'Ganesh Chaturthi', date: '2026-09-14', day: 'Monday', type: 'Restricted Holiday', branches: 'MH & KA Offies' },
    { id: 'hol-3', name: 'Gandhi Jayanti', date: '2026-10-02', day: 'Friday', type: 'Public Holiday', branches: 'All India Offices' },
    { id: 'hol-4', name: 'Diwali Deepavali', date: '2026-11-08', day: 'Sunday', type: 'Public Holiday', branches: 'All India Offices' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Holiday Calendar & Overtime Rules</h2>
          <p className="text-xs text-gray-500 mt-1">
            Enterprise public holidays, restricted choices, location-specific holiday groups, and holiday working overtime multipliers (2.0x)
          </p>
        </div>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Adding official holiday to corporate roster...')}>
          Add Holiday
        </Button>
      </div>

      <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-gray-900">Official Calendar 2026</h3>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Holiday Name</TableHead>
              <TableHead>Date & Day</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Applicable Branches</TableHead>
              <TableHead>Overtime Multiplier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidays.map(hol => (
              <TableRow key={hol.id}>
                <TableCell className="font-bold text-gray-900 text-xs">{hol.name}</TableCell>
                <TableCell>
                  <div className="text-xs font-semibold text-gray-900">{hol.date}</div>
                  <div className="text-[10px] text-gray-500">{hol.day}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={hol.type === 'Public Holiday' ? 'emerald' : 'purple'} size="xs">{hol.type}</Badge>
                </TableCell>
                <TableCell className="text-xs text-gray-700">{hol.branches}</TableCell>
                <TableCell className="text-xs font-bold text-emerald-800">2.0x Double Pay</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
