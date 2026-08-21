import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Crosshair,
  Smartphone,
  Navigation,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useToast } from '../../../components/ui/Toast';

export interface GpsMobileChannelViewProps {
  currentTab?: string;
  onNavigateSubPath?: (path: string) => void;
  onOpenEmployeeProfile?: (empId: string) => void;
}

export const GpsMobileChannelView: React.FC<GpsMobileChannelViewProps> = ({
  currentTab = 'gps',
  onNavigateSubPath,
  onOpenEmployeeProfile,
}) => {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'geofences' | 'mobile' | 'logs' | 'exceptions'>(() => {
    if (currentTab === 'geofences') return 'geofences';
    if (currentTab === 'mobile-clocking') return 'mobile';
    if (currentTab === 'location-logs') return 'logs';
    if (currentTab === 'location-exceptions') return 'exceptions';
    return 'attendance';
  });

  useEffect(() => {
    if (currentTab === 'geofences') setActiveSubTab('geofences');
    else if (currentTab === 'mobile-clocking') setActiveSubTab('mobile');
    else if (currentTab === 'location-logs') setActiveSubTab('logs');
    else if (currentTab === 'location-exceptions') setActiveSubTab('exceptions');
    else if (currentTab === 'gps' || currentTab === 'gps-attendance') setActiveSubTab('attendance');
  }, [currentTab]);

  const handleTabSwitch = (tab: 'attendance' | 'geofences' | 'mobile' | 'logs' | 'exceptions') => {
    setActiveSubTab(tab);
    if (onNavigateSubPath) {
      const map: Record<string, string> = {
        attendance: 'gps',
        geofences: 'geofences',
        mobile: 'mobile-clocking',
        logs: 'location-logs',
        exceptions: 'location-exceptions',
      };
      onNavigateSubPath(map[tab]);
    }
  };

  // Geofence zones
  const geofences = [
    { id: 'geo-1', name: 'Coimbatore HQ Geofence', type: 'CIRCULAR RADIUS', center: '11.0168° N, 76.9558° E', radius: '150 meters', status: 'ACTIVE', assignedEmployees: 45, violationsToday: 0 },
    { id: 'geo-2', name: 'Chennai Factory Perimeter', type: 'POLYGON (6 Coordinates)', center: '13.0827° N, 80.2707° E', radius: '350 meters', status: 'ACTIVE', assignedEmployees: 120, violationsToday: 1 },
    { id: 'geo-3', name: 'Hosur Plant Assembly Area', type: 'CIRCULAR RADIUS', center: '12.7409° N, 77.8253° E', radius: '200 meters', status: 'ACTIVE', assignedEmployees: 80, violationsToday: 0 },
    { id: 'geo-4', name: 'Bangalore Innovation Hub', type: 'CIRCULAR RADIUS', center: '12.9716° N, 77.5946° E', radius: '100 meters', status: 'ACTIVE', assignedEmployees: 25, violationsToday: 0 },
  ];

  // Mobile GPS attendance logs
  const gpsLogs = [
    { id: 'gps-1', employee_id: 'emp-hr-001', employee_name: 'Hari Priya', employee_code: 'WF-1001', department: 'People & HR', device: 'iPhone 15 Pro (iOS 18.2)', geofence: 'Coimbatore HQ Geofence', distance: '18m from center', timestamp: '09:02:44 AM', accuracy: '± 3.2m', status: 'VERIFIED', selfie_verified: true, mock_location_detected: false },
    { id: 'gps-2', employee_id: 'emp-admin-001', employee_name: 'Dharun Joy', employee_code: 'WF-1000', department: 'Executive Management', device: 'Samsung Galaxy S24 Ultra', geofence: 'Coimbatore HQ Geofence', distance: '12m from center', timestamp: '08:55:10 AM', accuracy: '± 2.8m', status: 'VERIFIED', selfie_verified: true, mock_location_detected: false },
    { id: 'gps-3', employee_id: 'emp-mgr-001', employee_name: 'Karthik Natarajan', employee_code: 'WF-1002', department: 'Engineering & DevOps', device: 'Google Pixel 8', geofence: 'Coimbatore HQ Geofence', distance: '45m from center', timestamp: '09:10:15 AM', accuracy: '± 4.1m', status: 'VERIFIED', selfie_verified: true, mock_location_detected: false },
    { id: 'gps-4', employee_id: 'emp-tl-001', employee_name: 'Deepa Subramanian', employee_code: 'WF-1003', department: 'Engineering & DevOps', device: 'OnePlus 12', geofence: 'Coimbatore HQ Geofence', distance: '22m from center', timestamp: '09:14:02 AM', accuracy: '± 3.5m', status: 'VERIFIED', selfie_verified: true, mock_location_detected: false },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Header & Channel Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <MapPin className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">GPS & Mobile Attendance Channel</h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-800 rounded-full">
              Geofence Guard Active
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Mobile clocking, coordinate geofencing, radius polygons, selfie verification, and mock-location prevention.
          </p>
        </div>

        {/* Sub-tab segmented bar */}
        <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
          <button
            onClick={() => handleTabSwitch('attendance')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5',
              activeSubTab === 'attendance' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <MapPin className="w-3.5 h-3.5" />
            GPS Live Map
          </button>
          <button
            onClick={() => handleTabSwitch('geofences')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5',
              activeSubTab === 'geofences' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Crosshair className="w-3.5 h-3.5" />
            Geofences ({geofences.length})
          </button>
          <button
            onClick={() => handleTabSwitch('mobile')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5',
              activeSubTab === 'mobile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Mobile Policy
          </button>
          <button
            onClick={() => handleTabSwitch('logs')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5',
              activeSubTab === 'logs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Navigation className="w-3.5 h-3.5" />
            Location Logs
          </button>
          <button
            onClick={() => handleTabSwitch('exceptions')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5',
              activeSubTab === 'exceptions' ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-600 hover:text-rose-700'
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Boundary Exceptions (0)
          </button>
        </div>
      </div>

      {/* 2. STATS & LIVE MAP */}
      {activeSubTab === 'attendance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
              <span className="text-gray-500 font-medium">Mobile GPS Punches</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">428</div>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3 h-3" /> 100% within geofence
              </span>
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
              <span className="text-gray-500 font-medium">Active Geofence Zones</span>
              <div className="text-2xl font-bold text-blue-700 mt-1">4 Zones</div>
              <span className="text-[11px] text-gray-500 font-medium mt-1 block">
                Avg accuracy: ± 3.2 meters
              </span>
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
              <span className="text-gray-500 font-medium">Mock Location Blocked</span>
              <div className="text-2xl font-bold text-purple-700 mt-1">0 Attempts</div>
              <span className="text-[11px] text-purple-600 font-medium mt-1 block">
                Hardware GPS integrity locked
              </span>
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
              <span className="text-gray-500 font-medium">Selfie Verification</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">100% Pass</div>
              <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
                Facial liveness matched on clock-in
              </span>
            </div>
          </div>

          {/* Interactive Geofence Map Component */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Interactive Geofence & Punch Map</h3>
              </div>
              <span className="text-[11px] text-gray-500 font-mono">Center: Coimbatore HQ (11.0168° N, 76.9558° E)</span>
            </div>

            <div className="relative h-64 bg-slate-900 flex items-center justify-center overflow-hidden">
              {/* Map Canvas Background Simulation */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />

              {/* Geofence Circles */}
              <div className="relative flex items-center justify-center">
                <div className="w-52 h-52 rounded-full border border-blue-400/40 bg-blue-500/10 animate-pulse flex items-center justify-center">
                  <div className="w-36 h-36 rounded-full border border-emerald-400/50 bg-emerald-500/15 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border border-emerald-300 bg-emerald-500/30 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-emerald-400/40" />
                    </div>
                  </div>
                </div>

                {/* Simulated live clocking markers */}
                <div className="absolute top-10 right-14 bg-emerald-500/90 text-white px-2 py-1 rounded text-[10px] font-bold shadow flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  Hari Priya (09:02 AM)
                </div>
                <div className="absolute bottom-12 left-16 bg-blue-500/90 text-white px-2 py-1 rounded text-[10px] font-bold shadow flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  Dharun Joy (08:55 AM)
                </div>
              </div>

              <div className="absolute bottom-3 right-3 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded text-[11px] text-slate-300 backdrop-blur-sm">
                Green Zone: Verified HQ Boundary (150m Radius)
              </div>
            </div>

            {/* GPS Logs Table */}
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Device & OS</th>
                  <th className="p-3">Geofence Zone</th>
                  <th className="p-3">Coordinates & Precision</th>
                  <th className="p-3">Time</th>
                  <th className="p-3 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {gpsLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/70">
                    <td className="p-3">
                      <div
                        onClick={() => onOpenEmployeeProfile?.(log.employee_id)}
                        className="font-bold text-gray-900 hover:text-[#07563D] cursor-pointer"
                      >
                        {log.employee_name}
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono">{log.employee_code}</div>
                    </td>
                    <td className="p-3 text-gray-700">{log.department}</td>
                    <td className="p-3 text-gray-600 font-medium">{log.device}</td>
                    <td className="p-3 font-medium text-blue-700">{log.geofence}</td>
                    <td className="p-3 font-mono text-gray-700">
                      {log.distance} · {log.accuracy}
                    </td>
                    <td className="p-3 font-mono font-semibold text-gray-900">{log.timestamp}</td>
                    <td className="p-3 text-right">
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                        Inside Boundary
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. GEOFENCES MANAGEMENT */}
      {activeSubTab === 'geofences' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div>
              <h3 className="text-xs font-bold text-gray-900">Geofence Boundaries Master</h3>
              <p className="text-xs text-gray-500">Configure radius zones and polygon boundaries for office campuses and factory locations.</p>
            </div>
            <button
              onClick={() => showToast('Geofence boundary creator modal opened.')}
              className="px-3 py-1.5 bg-[#07563D] text-white rounded-lg text-xs font-semibold hover:bg-[#064e37] transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Geofence Zone
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {geofences.map(geo => (
              <div key={geo.id} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{geo.name}</h4>
                    <p className="text-[11px] text-gray-500 font-mono mt-0.5">{geo.center}</p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                    {geo.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2 bg-gray-50 rounded text-[11px] text-gray-600">
                  <div>
                    <span className="text-[10px] text-gray-400 block">TYPE</span>
                    {geo.type}
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">RADIUS</span>
                    <strong>{geo.radius}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">ASSIGNED</span>
                    <strong className="text-gray-900">{geo.assignedEmployees} staff</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                  <span className="text-emerald-700 text-[11px] font-semibold">0 violations today</span>
                  <button
                    onClick={() => showToast(`Editing boundary coordinates for ${geo.name}...`)}
                    className="px-2.5 py-1 text-[11px] font-semibold border border-gray-200 rounded hover:bg-gray-50 text-gray-700"
                  >
                    Edit Boundary
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. MOBILE CLOCKING POLICIES */}
      {activeSubTab === 'mobile' && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg text-xs space-y-4">
          <h3 className="font-bold text-gray-900">Mobile Attendance Security & Fraud Rules</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 border border-gray-200 rounded-lg space-y-2">
              <h4 className="font-bold text-gray-900">Mock Location Detection</h4>
              <p className="text-gray-500 text-[11px]">Strictly rejects developer option fake GPS apps on Android & jailbroken iOS devices.</p>
              <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                ENFORCED (BLOCK CLOCK-IN)
              </span>
            </div>

            <div className="p-3 border border-gray-200 rounded-lg space-y-2">
              <h4 className="font-bold text-gray-900">Facial Liveness on Punch</h4>
              <p className="text-gray-500 text-[11px]">Requires instant selfie capture with blink detection during mobile clock-in.</p>
              <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                ENABLED
              </span>
            </div>

            <div className="p-3 border border-gray-200 rounded-lg space-y-2">
              <h4 className="font-bold text-gray-900">Offline Punch Cache</h4>
              <p className="text-gray-500 text-[11px]">Stores cryptographically signed timestamp in secure enclave when network drops.</p>
              <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">
                ENABLED (24H CACHE)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. LOCATION LOGS & EXCEPTIONS */}
      {(activeSubTab === 'logs' || activeSubTab === 'exceptions') && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg text-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">
              {activeSubTab === 'exceptions' ? 'Out-of-Geofence Clocking Queue' : 'Historical GPS Telemetry'}
            </h3>
            <span className="text-gray-500">Showing verified mobile clocking coordinates</span>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <div>
                <strong className="text-emerald-900 block">All mobile punches currently verified within geofence</strong>
                <span className="text-[11px] text-emerald-700">0 out-of-boundary violations flagged in current shift.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
