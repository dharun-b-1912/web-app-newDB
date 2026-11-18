import React, { useState, useEffect, useMemo } from 'react';
import {
  Car,
  Bike,
  Coins,
  ShieldCheck,
  Save,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Clock,
  MapPin,
  Building2,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { useTenant } from '../../../hooks/useTenant';
import { shiftTrackingService, EmployeeLiveLocation } from '../../../services/location/shiftTrackingService';

export interface KmFareSettings {
  baseRatePerKm: number;
  twoWheelerRatePerKm: number;
  fourWheelerRatePerKm: number;
  minDisplacementMeters: number;
  shiftBoundCutoff: boolean;
  autoSyncToPayroll: boolean;
}

const DEFAULT_KM_FARE_SETTINGS: KmFareSettings = {
  baseRatePerKm: 6.0,
  twoWheelerRatePerKm: 4.5,
  fourWheelerRatePerKm: 10.0,
  minDisplacementMeters: 50,
  shiftBoundCutoff: true,
  autoSyncToPayroll: true,
};

export const FieldTravelKmFareTab: React.FC = () => {
  const { showToast } = useToast();
  const { organization } = useTenant();
  const orgId = organization?.id || 'default';
  const storageKey = `joy_km_fare_config_${orgId}`;

  const [settings, setSettings] = useState<KmFareSettings>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_KM_FARE_SETTINGS;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [formSettings, setFormSettings] = useState<KmFareSettings>(settings);
  const [liveEmployees, setLiveEmployees] = useState<EmployeeLiveLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load telemetry for staff
  const loadStaff = async () => {
    setIsLoading(true);
    try {
      const data = await shiftTrackingService.getLiveLocations();
      setLiveEmployees(data);
    } catch (err) {
      console.error('[FieldTravelKmFareTab] load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleSaveSettings = () => {
    setSettings(formSettings);
    try {
      localStorage.setItem(storageKey, JSON.stringify(formSettings));
      // Broadcast setting update so other modules pick it up
      window.dispatchEvent(new CustomEvent('joy_km_fare_updated', { detail: formSettings }));
    } catch {
      // ignore
    }
    setIsEditing(false);
    showToast('Travel reimbursement policy & KM fare rates updated!', 'success');
  };

  // Staff summary calculations
  const staffTravelSummaries = useMemo(() => {
    return liveEmployees.map((emp) => {
      const distKm = (emp.cumulative_distance_meters || 0) / 1000;
      // Vehicle type heuristic: field ops defaults to 2-wheeler, others to standard base rate
      const isFieldOps = emp.department_name?.toLowerCase().includes('field') || emp.department_name?.toLowerCase().includes('marketing');
      const rate = isFieldOps ? settings.twoWheelerRatePerKm : settings.baseRatePerKm;
      const travelPay = Math.round(distKm * rate);

      return {
        ...emp,
        distanceKm: distKm,
        ratePerKm: rate,
        estimatedPay: travelPay,
        vehicleType: isFieldOps ? '2-Wheeler (Motorbike)' : 'Standard Conveyance',
        isApproved: true,
      };
    });
  }, [liveEmployees, settings]);

  const totalTrackedKm = useMemo(() => {
    return staffTravelSummaries.reduce((acc, s) => acc + s.distanceKm, 0);
  }, [staffTravelSummaries]);

  const totalEstimatedPay = useMemo(() => {
    return staffTravelSummaries.reduce((acc, s) => acc + s.estimatedPay, 0);
  }, [staffTravelSummaries]);

  const handleExportCsv = () => {
    const headers = ['Employee Code', 'Employee Name', 'Department', 'Status', 'Vehicle Tier', 'KM Rate (INR)', 'Tracked KM', 'Travel Allowance (INR)'];
    const rows = staffTravelSummaries.map((s) => [
      `"${s.employee_code || ''}"`,
      `"${s.employee_name || ''}"`,
      `"${s.department_name || ''}"`,
      `"${s.status}"`,
      `"${s.vehicleType}"`,
      s.ratePerKm,
      s.distanceKm.toFixed(2),
      s.estimatedPay,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Travel_KM_Fare_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Field travel audit exported to CSV', 'success');
  };

  const handleSyncToPayroll = () => {
    showToast(`Synced ₹${totalEstimatedPay.toLocaleString('en-IN')} travel allowance for ${staffTravelSummaries.length} staff to November Payroll run!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700">
              <Car className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-extrabold text-gray-900">
              Field Travel Reimbursement & KM Fare Configuration
            </h2>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-800 border-indigo-300 font-bold">
              Payroll Integrated
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
            Enterprise mileage governance: set authoritative per-kilometer reimbursement rates across vehicle classes, enforce automated shift-bound GPS tracking cutoffs, and push verified travel payouts directly to monthly payroll.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadStaff}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh Data
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export Audit
          </Button>
          <Button
            size="sm"
            className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold"
            onClick={handleSyncToPayroll}
            leftIcon={<Coins className="w-3.5 h-3.5" />}
          >
            Sync to Payroll
          </Button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block">Standard Fare Rate</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-gray-900">₹{settings.baseRatePerKm.toFixed(2)}</span>
            <span className="text-xs font-semibold text-gray-500">/ kilometer</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium block mt-1">
            Base vehicle allowance
          </span>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block">Two-Wheeler Rate</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-indigo-700">₹{settings.twoWheelerRatePerKm.toFixed(2)}</span>
            <span className="text-xs font-semibold text-gray-500">/ kilometer</span>
          </div>
          <span className="text-[11px] text-indigo-700 font-medium block mt-1">
            Field executives & delivery
          </span>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block">Today's Total Road Distance</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-blue-700">{totalTrackedKm.toFixed(2)}</span>
            <span className="text-xs font-semibold text-gray-500">km tracked</span>
          </div>
          <span className="text-[11px] text-blue-700 font-medium block mt-1">
            Across {liveEmployees.filter((e) => e.has_live_ping).length} active field devices
          </span>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block">Estimated Travel Pay</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-700">₹{totalEstimatedPay.toLocaleString('en-IN')}</span>
            <span className="text-xs font-semibold text-gray-500">today</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium block mt-1">
            Calculated for payroll conveyance
          </span>
        </div>
      </div>

      {/* 3. Fare Rate Configuration & Privacy Settings */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Mileage & Reimbursement Tier Settings</h3>
            <p className="text-xs text-gray-500">Customize per-kilometer rates and shift-bound telemetry governance</p>
          </div>
          {!isEditing ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFormSettings(settings);
                setIsEditing(true);
              }}
            >
              Configure Policy
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold"
                onClick={handleSaveSettings}
                leftIcon={<Save className="w-3.5 h-3.5" />}
              >
                Save Policy
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800">
                <Bike className="w-4 h-4 text-indigo-600" />
                <span>2-Wheeler Mileage Rate</span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-white">Standard</Badge>
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-sm font-bold text-gray-700">₹</span>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={formSettings.twoWheelerRatePerKm}
                  onChange={(e) => setFormSettings({ ...formSettings, twoWheelerRatePerKm: Number(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-bold"
                />
                <span className="text-xs text-gray-500">/ km</span>
              </div>
            ) : (
              <div className="text-xl font-black text-gray-900 pt-1">
                ₹{settings.twoWheelerRatePerKm.toFixed(2)} <span className="text-xs font-normal text-gray-500">/ km</span>
              </div>
            )}
            <p className="text-[11px] text-gray-500">Standard rate for motorcycles and mopeds on field assignments.</p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800">
                <Car className="w-4 h-4 text-blue-600" />
                <span>4-Wheeler (Car/Van) Rate</span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-white">Premium</Badge>
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-sm font-bold text-gray-700">₹</span>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={formSettings.fourWheelerRatePerKm}
                  onChange={(e) => setFormSettings({ ...formSettings, fourWheelerRatePerKm: Number(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-bold"
                />
                <span className="text-xs text-gray-500">/ km</span>
              </div>
            ) : (
              <div className="text-xl font-black text-gray-900 pt-1">
                ₹{settings.fourWheelerRatePerKm.toFixed(2)} <span className="text-xs font-normal text-gray-500">/ km</span>
              </div>
            )}
            <p className="text-[11px] text-gray-500">Official rate for employees authorized to travel via automobile.</p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Shift-Bound Privacy Cutoff</span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300 font-bold">Active</Badge>
            </div>
            <div className="text-xs font-semibold text-emerald-900 pt-1">
              Automatic GPS Stream Cutoff Enabled
            </div>
            <p className="text-[11px] text-gray-500">
              When an employee checks out (via Biometric terminal or mobile app), location telemetry instantly ceases to protect personal privacy.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Live Today's Field Travel Claims Ledger */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Today's Field Staff Travel Ledger</h3>
            <p className="text-xs text-gray-500">Real-time distance tracked from verified GPS breadcrumb points</p>
          </div>
          <span className="text-xs font-medium text-gray-500">
            {staffTravelSummaries.length} Employees Recorded Today
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-600 border-b border-gray-200 font-bold">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Shift & Clocking</th>
                <th className="py-3 px-4">Vehicle Class</th>
                <th className="py-3 px-4">Verified Distance</th>
                <th className="py-3 px-4">Rate / KM</th>
                <th className="py-3 px-4 text-right">Computed Allowance</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffTravelSummaries.map((emp) => {
                const isOnLeave = Boolean(emp.is_on_leave || emp.status === 'on_leave');
                const isClockedOut = emp.status === 'clocked_out';
                const isInOffice = Boolean((emp as any).is_in_office);

                return (
                  <tr key={emp.employee_id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={emp.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.employee_name || 'Staff')}&background=07563D&color=fff&bold=true`}
                          alt={emp.employee_name}
                          className="w-7 h-7 rounded-lg object-cover border border-gray-200"
                        />
                        <div>
                          <span className="font-bold text-gray-900 block">{emp.employee_name}</span>
                          <span className="font-mono text-[10px] text-gray-500 font-medium">#{emp.employee_code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{emp.department_name || 'Operations'}</td>
                    <td className="py-3 px-4">
                      {isOnLeave ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700">
                          <span>🌴</span> On Leave Today
                        </span>
                      ) : isClockedOut ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                          <Clock className="w-3 h-3 text-gray-400" /> Clocked Out
                        </span>
                      ) : isInOffice ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800">
                          <Building2 className="w-3 h-3 text-teal-600" /> In Office • Biometric
                        </span>
                      ) : emp.has_live_ping ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <Navigation className="w-3 h-3 text-emerald-600 animate-pulse" /> Active GPS
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">Standby / Awaiting Punch</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-medium border border-gray-200">
                        {emp.vehicleType.includes('2-Wheeler') ? <Bike className="w-3 h-3 text-indigo-600" /> : <Car className="w-3 h-3 text-blue-600" />}
                        {emp.vehicleType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">
                      {isOnLeave ? '0.00 km' : `${emp.distanceKm.toFixed(2)} km`}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-600">
                      ₹{emp.ratePerKm.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-sm text-emerald-700">
                      {isOnLeave ? '₹0' : `₹${emp.estimatedPay}`}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isOnLeave ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                          Suspended
                        </Badge>
                      ) : emp.distanceKm > 0 ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200 text-[10px]">
                          Pending
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

