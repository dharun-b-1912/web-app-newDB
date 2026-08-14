import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { MapPin, Navigation, ShieldCheck, CheckCircle2, Lock, Sliders, Globe } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const GpsAttendanceView: React.FC = () => {
  const { showToast } = useToast();
  const [geofenceRadius, setGeofenceRadius] = useState(200);
  const [officeLat, setOfficeLat] = useState('12.9716');
  const [officeLng, setOfficeLng] = useState('77.5946');
  const [eventPrivacyOnly, setEventPrivacyOnly] = useState(true);

  const handleSaveConfig = () => {
    showToast('Geofencing rules and event-based privacy settings updated!');
  };

  const handleSimulateGpsPunch = () => {
    showToast('Validated current coordinates (12.9718, 77.5948) — Inside HQ 200m radius! GPS punch verified.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">GPS Location & Geofencing Attendance</h2>
          <p className="text-xs text-gray-500 mt-1">
            Event-based mobile check-in verification, geofencing parameters, accuracy thresholds, and privacy controls
          </p>
        </div>
        <Button size="sm" leftIcon={<Navigation className="w-4 h-4" />} onClick={handleSimulateGpsPunch}>
          Test GPS Location Punch
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geofencing Configuration */}
        <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-gray-900 font-extrabold text-base">
            <MapPin className="w-5 h-5 text-[#07563D]" />
            <span>HQ Office Geofence Boundaries</span>
          </div>

          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
            <div className="text-xs font-bold text-emerald-900">Current Headquarters Geofence Center</div>
            <div className="text-xs font-mono text-emerald-800">
              Latitude: {officeLat} N | Longitude: {officeLng} E
            </div>
            <div className="text-[11px] text-emerald-700">
              Allowed Punch Radius: <strong className="text-emerald-950 font-bold">{geofenceRadius} Meters</strong>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Geofence Radius (Meters)</label>
              <input
                type="number"
                value={geofenceRadius}
                onChange={e => setGeofenceRadius(parseInt(e.target.value) || 50)}
                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#07563D] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Latitude</label>
                <input
                  type="text"
                  value={officeLat}
                  onChange={e => setOfficeLat(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#07563D] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Longitude</label>
                <input
                  type="text"
                  value={officeLng}
                  onChange={e => setOfficeLng(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#07563D] outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button size="sm" onClick={handleSaveConfig}>
                Save Geofence Configuration
              </Button>
            </div>
          </div>
        </Card>

        {/* Privacy & Compliance Controls */}
        <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-gray-900 font-extrabold text-base">
            <Lock className="w-5 h-5 text-[#07563D]" />
            <span>GPS Privacy & Data Safeguards</span>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-3">
              <input
                type="checkbox"
                id="eventPrivacy"
                checked={eventPrivacyOnly}
                onChange={e => setEventPrivacyOnly(e.target.checked)}
                className="mt-1 rounded text-[#07563D] focus:ring-[#07563D]"
              />
              <label htmlFor="eventPrivacy" className="text-xs text-gray-700 cursor-pointer">
                <strong className="block text-gray-900 font-bold">Event-Based Location Collection Only</strong>
                GPS coordinates are strictly captured during the instant of Check-In or Check-Out events. Continuous tracking or background location polling is strictly disabled.
              </label>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
              <div className="text-xs font-bold text-gray-900">Minimum Location Accuracy Threshold</div>
              <p className="text-[11px] text-gray-600">
                Punches are rejected if GPS accuracy is worse than <span className="font-bold text-gray-900">50 meters</span> to prevent mock location apps.
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
              <div className="text-xs font-bold text-gray-900">Field Staff Remote Punch Permission</div>
              <p className="text-[11px] text-gray-600">
                Sales & Field Engineering teams are allowed punches outside geofence radius upon manager client site assignment.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
