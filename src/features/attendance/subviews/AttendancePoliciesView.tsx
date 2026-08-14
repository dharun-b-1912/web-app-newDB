import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Shield, Settings, CheckCircle2, Plus, Sliders } from 'lucide-react';
import { AttendancePolicy } from '../../../types/attendance';
import { DEFAULT_ATTENDANCE_POLICY } from '../../../lib/attendance/attendanceEngine';
import { useToast } from '../../../components/ui/Toast';

export const AttendancePoliciesView: React.FC = () => {
  const { showToast } = useToast();
  const [policies, setPolicies] = useState<AttendancePolicy[]>([
    DEFAULT_ATTENDANCE_POLICY,
    {
      id: 'pol-shift-night',
      name: 'US & UK Operations Night Shift Policy',
      description: 'Custom night shift rules spanning 22:00 -> 06:00 with 30m late grace and 7h net threshold',
      required_hours_per_day: 8,
      late_grace_minutes: 30,
      early_checkout_grace_minutes: 30,
      half_day_hours_threshold: 4,
      overtime_min_minutes: 30,
      max_wfh_days_per_month: 12,
      geofence_enabled: false,
      allowed_radius_meters: 500,
      night_shift_enabled: true,
      night_shift_cutoff_hour: 6,
      assignment_type: 'Department',
      assigned_to: 'Engineering & Customer Support',
    },
  ]);

  const handleSavePolicy = () => {
    showToast('Enterprise Attendance Policy rules saved and deployed across organization!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Attendance Policy Configuration</h2>
          <p className="text-xs text-gray-500 mt-1">
            Define grace periods, working hour thresholds, half-day triggers, night shift cutoffs, and policy precedence rules
          </p>
        </div>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Creating new attendance policy template...')}>
          Create Policy Rule
        </Button>
      </div>

      <div className="space-y-4">
        {policies.map(pol => (
          <Card key={pol.id} className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-gray-900">{pol.name}</h3>
                  <Badge variant="emerald" size="xs">{pol.assignment_type}: {pol.assigned_to}</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{pol.description}</p>
              </div>
              <Button size="xs" variant="outline" leftIcon={<Settings className="w-3.5 h-3.5" />} onClick={handleSavePolicy}>
                Edit Rules
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-[10px] font-bold uppercase text-gray-500">Required Hours</div>
                <div className="text-lg font-black text-gray-900">{pol.required_hours_per_day} Hours / Day</div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-[10px] font-bold uppercase text-gray-500">Late Grace Period</div>
                <div className="text-lg font-black text-amber-800">{pol.late_grace_minutes} Minutes</div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-[10px] font-bold uppercase text-gray-500">Early Checkout Grace</div>
                <div className="text-lg font-black text-orange-800">{pol.early_checkout_grace_minutes} Minutes</div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-[10px] font-bold uppercase text-gray-500">Half-Day Threshold</div>
                <div className="text-lg font-black text-cyan-800">&lt; {pol.half_day_hours_threshold} Hours</div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-[10px] font-bold uppercase text-gray-500">Min. Overtime</div>
                <div className="text-lg font-black text-indigo-800">&gt; {pol.overtime_min_minutes} Minutes</div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-[10px] font-bold uppercase text-gray-500">Night Shift Support</div>
                <div className="text-lg font-black text-emerald-800">{pol.night_shift_enabled ? 'Enabled' : 'Disabled'}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
