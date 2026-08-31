import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Building,
  Factory,
  Radio,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
  Compass,
  Locate,
  Trash2,
  ExternalLink,
  Layers,
  Map as MapIcon,
  ZoomIn,
  ZoomOut,
  Globe,
  SearchCheck,
  Link as LinkIcon,
  Sparkles,
  Users,
  UserCheck,
  Shield,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useToast } from '../../../components/ui/Toast';
import {
  workLocationService,
  WorkLocation,
  AttendanceLocationEvent,
  EmployeeWorkLocationAssignment,
  parseGoogleMapsInput,
} from '../../../services/location/workLocationService';
import { mobileAttendanceClientService, MobileGpsEvidence } from '../../../services/attendance/mobileAttendanceClientService';
import { api } from '../../../services/api';
import { hrEventBus } from '../../../services/hrEventBus';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

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
  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'geofences' | 'mapping' | 'mobile' | 'logs' | 'exceptions'>(() => {
    if (currentTab === 'geofences') return 'geofences';
    if (currentTab === 'staff-mapping') return 'mapping';
    if (currentTab === 'mobile-clocking') return 'mobile';
    if (currentTab === 'location-logs') return 'logs';
    if (currentTab === 'location-exceptions') return 'exceptions';
    return 'attendance';
  });

  // Master Data
  const [locations, setLocations] = useState<WorkLocation[]>([]);
  const [locationEvents, setLocationEvents] = useState<AttendanceLocationEvent[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<EmployeeWorkLocationAssignment[]>([]);

  // Google Maps State
  const [mapType, setMapType] = useState<'m' | 'k' | 'h'>('m'); // m = roadmap, k = satellite, h = hybrid
  const [mapZoom, setMapZoom] = useState<number>(17);

  // Geofence Location Modal State
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Partial<WorkLocation> | null>(null);
  const [isDetectingModalGps, setIsDetectingModalGps] = useState(false);
  const [googleMapsUrlInput, setGoogleMapsUrlInput] = useState('');
  const [isProcessingGmapsLink, setIsProcessingGmapsLink] = useState(false);
  const [modalMapType, setModalMapType] = useState<'m' | 'k'>('m');

  // Employee Mapping Modal State
  const [isMappingEmployee, setIsMappingEmployee] = useState(false);
  const [selectedEmpForMapping, setSelectedEmpForMapping] = useState<any | null>(null);
  const [mappedLocationIds, setMappedLocationIds] = useState<string[]>([]);
  const [primaryLocationId, setPrimaryLocationId] = useState<string>('');

  // Live Real-Time Hardware GPS State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedTargetLocId, setSelectedTargetLocId] = useState<string>('');
  const [liveGps, setLiveGps] = useState<MobileGpsEvidence | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isAcquiringGps, setIsAcquiringGps] = useState<boolean>(false);
  const [isPunching, setIsPunching] = useState<boolean>(false);

  // Load Real Data
  // Load Real Database Data
  const loadData = useCallback(async () => {
    try {
      const [locs, asgns] = await Promise.all([
        workLocationService.fetchLocationsFromDb(),
        workLocationService.fetchAssignmentsFromDb(),
      ]);
      setLocations(locs);
      setAssignments(asgns);
      if (locs.length > 0 && !selectedTargetLocId) {
        setSelectedTargetLocId(locs[0].id);
      }
    } catch {
      const fallback = workLocationService.getLocations();
      setLocations(fallback);
      setAssignments(workLocationService.getAllAssignments());
      if (fallback.length > 0 && !selectedTargetLocId) {
        setSelectedTargetLocId(fallback[0].id);
      }
    }

    const evts = workLocationService.getLocationEvents();
    setLocationEvents(evts);

    api.getEmployees().then((emps) => {
      setEmployees(emps);
      if (emps.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(emps[0].id);
      }
    }).catch(() => []);
  }, [selectedEmployeeId, selectedTargetLocId]);

  // Acquire Real Hardware GPS Coordinates
  const fetchLiveHardwareGps = useCallback(async () => {
    setIsAcquiringGps(true);
    setGpsError(null);
    try {
      const pos = await mobileAttendanceClientService.getCurrentPosition();
      setLiveGps(pos);
    } catch (err: any) {
      setGpsError(err.message || 'Unable to acquire hardware GPS.');
    } finally {
      setIsAcquiringGps(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    fetchLiveHardwareGps();
    const unsub = hrEventBus.subscribe('*', () => loadData());
    return () => unsub();
  }, [loadData, fetchLiveHardwareGps]);

  useEffect(() => {
    if (currentTab === 'geofences') setActiveSubTab('geofences');
    else if (currentTab === 'staff-mapping') setActiveSubTab('mapping');
    else if (currentTab === 'mobile-clocking') setActiveSubTab('mobile');
    else if (currentTab === 'location-logs') setActiveSubTab('logs');
    else if (currentTab === 'location-exceptions') setActiveSubTab('exceptions');
    else if (currentTab === 'gps' || currentTab === 'gps-attendance') setActiveSubTab('attendance');
  }, [currentTab]);

  const handleTabSwitch = (tab: 'attendance' | 'geofences' | 'mapping' | 'mobile' | 'logs' | 'exceptions') => {
    setActiveSubTab(tab);
  };

  // Selected Target Location
  const activeLocation = useMemo(() => {
    return locations.find((l) => l.id === selectedTargetLocId) || locations[0] || null;
  }, [locations, selectedTargetLocId]);

  // Check if current selected employee is authorized for active location
  const isEmployeeAuthorizedForTarget = useMemo(() => {
    if (!selectedEmployeeId || !activeLocation) return true;
    const authorized = workLocationService.getEmployeeAuthorizedLocations(selectedEmployeeId);
    return authorized.some((l) => l.id === activeLocation.id);
  }, [selectedEmployeeId, activeLocation]);

  // Real Geofence Evaluation from Live Hardware GPS
  const liveEvaluation = useMemo(() => {
    if (!activeLocation || !liveGps) {
      return null;
    }
    return workLocationService.evaluateGeofence(
      liveGps.latitude,
      liveGps.longitude,
      liveGps.accuracyMeters,
      activeLocation,
      false
    );
  }, [liveGps, activeLocation]);

  // Submit Real GPS Punch
  const handleRealGpsPunch = async (punchType: 'CHECK_IN' | 'CHECK_OUT') => {
    if (!activeLocation || !selectedEmployeeId) {
      showToast('Select an employee and work location.', 'warning');
      return;
    }

    if (!isEmployeeAuthorizedForTarget) {
      showToast('Staff member is not mapped to this work location.', 'error');
      return;
    }

    if (!liveGps) {
      showToast('Acquiring hardware GPS location. Please allow location access.', 'warning');
      await fetchLiveHardwareGps();
      return;
    }

    setIsPunching(true);
    try {
      const res = await mobileAttendanceClientService.submitPunch({
        employeeId: selectedEmployeeId,
        workLocationId: activeLocation.id,
        punchType,
        evidence: liveGps,
      });

      showToast(`✓ ${punchType === 'CHECK_IN' ? 'Check-in' : 'Check-out'} recorded successfully at ${res.locationName} (${res.distanceMeters}m from center).`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'GPS Check-in rejected by policy.', 'error');
      loadData();
    } finally {
      setIsPunching(false);
    }
  };

  // Open Employee Mapping Modal
  const handleOpenEmployeeMapping = (emp: any) => {
    setSelectedEmpForMapping(emp);
    const existing = assignments.filter((a) => (a.employee_id === emp.id || (emp.employee_code && a.employee_id === emp.employee_code)) && a.is_active);
    if (existing.length > 0) {
      setMappedLocationIds(existing.map((e) => e.work_location_id));
      const prim = existing.find((e) => e.is_primary);
      setPrimaryLocationId(prim ? prim.work_location_id : existing[0].work_location_id);
    } else {
      // Default to all active locations with first as primary
      setMappedLocationIds(locations.map((l) => l.id));
      setPrimaryLocationId(locations[0]?.id || '');
    }
    setIsMappingEmployee(true);
  };

  // Save Employee Location Mapping
  const handleSaveEmployeeMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForMapping) return;

    if (mappedLocationIds.length === 0) {
      showToast('Please select at least one authorized work location.', 'warning');
      return;
    }

    await workLocationService.setEmployeeLocations(
      selectedEmpForMapping.id,
      mappedLocationIds,
      primaryLocationId || mappedLocationIds[0],
      undefined,
      selectedEmpForMapping.employee_code
    );

    showToast(`✓ Geofence mapping saved & synced for ${selectedEmpForMapping.display_name || selectedEmpForMapping.name}.`, 'success');
    setIsMappingEmployee(false);
    setSelectedEmpForMapping(null);
    await loadData();
  };

  // Reverse Geocoding Helper
  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          return data.display_name;
        }
      }
    } catch (err) {
      console.warn('Reverse geocoding error:', err);
    }
    return '';
  };

  // Auto-Detect Current GPS Coordinates inside Modal + Reverse Geocode
  const handleDetectModalCoordinates = async () => {
    setIsDetectingModalGps(true);
    try {
      const pos = await mobileAttendanceClientService.getCurrentPosition();
      const cleanLat = Number(pos.latitude.toFixed(7));
      const cleanLon = Number(pos.longitude.toFixed(7));

      let resolvedAddress = '';
      try {
        resolvedAddress = await reverseGeocode(cleanLat, cleanLon);
      } catch {}

      setSelectedLocation((prev) => ({
        ...prev,
        latitude: cleanLat,
        longitude: cleanLon,
        address: resolvedAddress || prev?.address || 'Peelamedu - Pudur Main Rd, Coimbatore',
        name: prev?.name && prev.name !== 'e.g. Coimbatore HQ Campus' ? prev.name : 'Joy Corporate Solutions HQ',
        accuracy_requirement_meters: Math.max(50, Math.round(pos.accuracyMeters * 1.5)),
      }));

      showToast(`📍 Locked live coordinates: ${cleanLat}, ${cleanLon} (±${pos.accuracyMeters}m)`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not acquire GPS coordinates.', 'error');
    } finally {
      setIsDetectingModalGps(false);
    }
  };

  // Parse Google Maps Link / DMS Coordinates
  const handleProcessGoogleMapsLink = async () => {
    if (!googleMapsUrlInput.trim()) return;
    setIsProcessingGmapsLink(true);

    try {
      const input = googleMapsUrlInput.trim();

      // Check Joy Corporate Solutions shortlink or keywords
      if (
        input.includes('cyya5UiZ1Brnbirz5') ||
        input.toLowerCase().includes('joy corporate solutions') ||
        input.toLowerCase().includes('joy head office') ||
        input.toLowerCase().includes('arasur')
      ) {
        setSelectedLocation((prev) => ({
          ...prev,
          name: 'Joy Corporate Solutions Private Limited (HQ)',
          latitude: 11.0844364,
          longitude: 77.1262627,
          address: 'D.No: 2 31 A9, Annur Road, Thennampalayam, Sulur, Arasur, Coimbatore, Tamil Nadu 641407',
          geofence_radius_meters: prev?.geofence_radius_meters || 100,
          accuracy_requirement_meters: 50,
        }));
        showToast('✓ Resolved Joy Corporate Solutions Private Limited (11.0844364°, 77.1262627°)', 'success');
        setIsProcessingGmapsLink(false);
        return;
      }

      const parsed = parseGoogleMapsInput(input);
      if (parsed && parsed.latitude !== undefined && parsed.longitude !== undefined) {
        let addr = parsed.address || '';
        if (!addr) {
          addr = await reverseGeocode(parsed.latitude, parsed.longitude);
        }

        setSelectedLocation((prev) => ({
          ...prev,
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          address: addr || prev?.address || 'Verified Facility Coordinates',
          name: prev?.name || parsed.name || 'Work Facility',
        }));

        showToast(`✓ Extracted coordinates from Google Maps: ${parsed.latitude}, ${parsed.longitude}`, 'success');
        setIsProcessingGmapsLink(false);
        return;
      }

      // If not parsed directly as coordinates/url, attempt address search
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&limit=1&addressdetails=1`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const match = data[0];
          const cleanLat = Number(parseFloat(match.lat).toFixed(7));
          const cleanLon = Number(parseFloat(match.lon).toFixed(7));
          setSelectedLocation((prev) => ({
            ...prev,
            latitude: cleanLat,
            longitude: cleanLon,
            address: match.display_name,
            name: prev?.name || match.name || input,
          }));
          showToast(`Found: ${match.display_name.split(',').slice(0, 3).join(',')}`, 'success');
        } else {
          // If search yielded no direct match, check if input has lat/lon numbers anywhere
          const anyCoords = input.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
          if (anyCoords) {
            const cleanLat = Number(parseFloat(anyCoords[1]).toFixed(7));
            const cleanLon = Number(parseFloat(anyCoords[2]).toFixed(7));
            setSelectedLocation((prev) => ({
              ...prev,
              latitude: cleanLat,
              longitude: cleanLon,
            }));
            showToast(`✓ Extracted coordinates: ${cleanLat}, ${cleanLon}`, 'success');
          } else {
            showToast('Could not resolve link. Please enter Latitude/Longitude or click Joy HQ preset.', 'warning');
          }
        }
      }
    } catch (err: any) {
      showToast('Error parsing Google Maps link. Please verify URL or coordinates.', 'error');
    } finally {
      setIsProcessingGmapsLink(false);
    }
  };

  // Save Geofence Location Modal Handler
  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation?.name || selectedLocation?.latitude === undefined || selectedLocation?.longitude === undefined) {
      showToast('Please provide location name and valid coordinates.', 'error');
      return;
    }

    workLocationService.saveLocation({
      ...selectedLocation,
      latitude: Number(Number(selectedLocation.latitude).toFixed(7)),
      longitude: Number(Number(selectedLocation.longitude).toFixed(7)),
      geofence_radius_meters: Number(selectedLocation.geofence_radius_meters) || 100,
      accuracy_requirement_meters: Number(selectedLocation.accuracy_requirement_meters) || 50,
    });

    showToast(`✓ Work location "${selectedLocation.name}" configured successfully.`);
    setIsEditingLocation(false);
    setSelectedLocation(null);
    loadData();
  };

  // Delete Location Handler
  const handleDeleteLocation = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove work location "${name}"?`)) {
      workLocationService.deleteLocation(id);
      showToast(`Work location "${name}" removed.`, 'info');
      loadData();
    }
  };

  // Metrics
  const mobilePunchesCount = locationEvents.filter((e) => e.event_type.startsWith('PUNCH_')).length;
  const violationsCount = locationEvents.filter((e) => e.event_type === 'OUTSIDE_GEOFENCE' || e.event_type === 'LOW_ACCURACY' || e.event_type === 'MOCK_LOCATION').length;

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
            <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-800 rounded-full">
              Multi-Tenant Geofence Active
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Google Maps powered authoritative geofence boundaries, high-accuracy GPS enforcement, and staff location mapping.
          </p>
        </div>

        {/* Sub-tab segmented bar */}
        <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs flex-wrap gap-1">
          <button
            onClick={() => handleTabSwitch('attendance')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              activeSubTab === 'attendance' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <MapPin className="w-3.5 h-3.5" />
            GPS Live Clocking
          </button>
          <button
            onClick={() => handleTabSwitch('geofences')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              activeSubTab === 'geofences' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Crosshair className="w-3.5 h-3.5" />
            Geofence Zones ({locations.length})
          </button>
          <button
            onClick={() => handleTabSwitch('mapping')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              activeSubTab === 'mapping' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Users className="w-3.5 h-3.5" />
            Staff Mapping ({employees.length})
          </button>
          <button
            onClick={() => handleTabSwitch('mobile')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              activeSubTab === 'mobile' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Mobile Policy
          </button>
          <button
            onClick={() => handleTabSwitch('logs')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              activeSubTab === 'logs' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Navigation className="w-3.5 h-3.5" />
            Location Logs ({locationEvents.length})
          </button>
          <button
            onClick={() => handleTabSwitch('exceptions')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              activeSubTab === 'exceptions' ? 'bg-white text-rose-700 shadow-xs' : 'text-gray-600 hover:text-rose-700'
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            GPS Violations ({violationsCount})
          </button>
        </div>
      </div>

      {/* 2. STATS & REAL HARDWARE GPS ATTENDANCE TERMINAL */}
      {activeSubTab === 'attendance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-2xs">
              <span className="text-gray-500 font-semibold">Mobile GPS Punches</span>
              <div className="text-2xl font-black text-gray-900 mt-1">{mobilePunchesCount}</div>
              <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Live Verified Punches
              </span>
            </div>
            <div className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-2xs">
              <span className="text-gray-500 font-semibold">Active Work Locations</span>
              <div className="text-2xl font-black text-blue-700 mt-1">{locations.length} Sites</div>
              <span className="text-[11px] text-gray-500 font-medium mt-1 block">
                Offices, Factories & Hubs
              </span>
            </div>
            <div className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-2xs">
              <span className="text-gray-500 font-semibold">Staff Geofence Mapped</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">{employees.length} Users</div>
              <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
                Authorized for Geofencing
              </span>
            </div>
            <div className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-2xs">
              <span className="text-gray-500 font-semibold">GPS Violations Blocked</span>
              <div className={cn("text-2xl font-black mt-1", violationsCount > 0 ? "text-rose-700" : "text-gray-900")}>
                {violationsCount}
              </div>
              <span className="text-[11px] text-gray-500 font-medium mt-1 block">
                Out-of-zone & low accuracy
              </span>
            </div>
          </div>

          {/* Real Hardware GPS Attendance Terminal */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Real GPS Clocking Interface */}
            <div className="lg:col-span-5 bg-gradient-to-b from-gray-900 to-slate-950 text-white p-5 rounded-2xl shadow-xl border border-gray-800 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <Locate className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">Mobile GPS Attendance Clock</h3>
                </div>
                <Badge variant="emerald">Live Geofence</Badge>
              </div>

              {/* Employee & Location Selector */}
              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="text-gray-400 font-medium block mb-1">Authenticated Staff:</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs cursor-pointer"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.display_name || emp.name} ({emp.employee_code || 'WF-EMP'}) - {emp.department_name || emp.department || 'Operations'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-400 font-medium">Target Work Location:</label>
                    {isEmployeeAuthorizedForTarget ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Mapped & Allowed
                      </span>
                    ) : (
                      <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Not Authorized
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedTargetLocId}
                    onChange={(e) => setSelectedTargetLocId(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs cursor-pointer"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.location_type} • Radius: {loc.geofence_radius_meters}m)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Location Telemetry Card */}
              {activeLocation && (
                <div className="bg-gray-800/80 p-4 rounded-xl border border-gray-700 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Live Device Coordinates:</span>
                    <button
                      onClick={fetchLiveHardwareGps}
                      disabled={isAcquiringGps}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={cn("w-3 h-3", isAcquiringGps && "animate-spin")} />
                      Refresh GPS
                    </button>
                  </div>

                  {liveGps ? (
                    <>
                      <div className="p-2 bg-gray-900/90 rounded-lg font-mono text-xs text-gray-300 border border-gray-800 flex justify-between items-center">
                        <span>Lat: {Number(liveGps.latitude.toFixed(6))}, Lon: {Number(liveGps.longitude.toFixed(6))}</span>
                        <span className="text-emerald-400 font-bold">±{liveGps.accuracyMeters}m</span>
                      </div>

                      {liveEvaluation && (
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[11px] text-gray-400 uppercase block font-semibold">Distance to Facility</span>
                            <span className="text-2xl font-black font-mono text-white">
                              {liveEvaluation.distanceMeters} m
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] text-gray-400 uppercase block font-semibold">Allowed Boundary</span>
                            <span className="text-2xl font-black font-mono text-emerald-400">
                              {activeLocation.geofence_radius_meters} m
                            </span>
                          </div>
                        </div>
                      )}

                      {liveEvaluation && (
                        <div className={cn(
                          "p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold",
                          liveEvaluation.isInside
                            ? "bg-emerald-950/60 border-emerald-700 text-emerald-300"
                            : "bg-rose-950/60 border-rose-700 text-rose-300"
                        )}>
                          {liveEvaluation.isInside ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          <span>{liveEvaluation.reason}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 text-xs">
                      {gpsError || 'Acquiring high-accuracy hardware GPS signal...'}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  onClick={() => handleRealGpsPunch('CHECK_IN')}
                  disabled={isPunching || isAcquiringGps || !isEmployeeAuthorizedForTarget}
                  className="w-full bg-[#07563D] hover:bg-[#064e37] text-white font-bold py-2.5 rounded-xl shadow-xs text-xs cursor-pointer"
                >
                  {isPunching ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5 mr-1.5" />}
                  Check In (GPS)
                </Button>

                <Button
                  onClick={() => handleRealGpsPunch('CHECK_OUT')}
                  disabled={isPunching || isAcquiringGps || !isEmployeeAuthorizedForTarget}
                  variant="outline"
                  className="w-full border-gray-700 text-gray-200 hover:bg-gray-800 font-bold py-2.5 rounded-xl text-xs cursor-pointer"
                >
                  {isPunching ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5 mr-1.5" />}
                  Check Out (GPS)
                </Button>
              </div>
            </div>

            {/* Right: Live Interactive Google Maps & Punch Feed */}
            <div className="lg:col-span-7 bg-white border border-gray-200/80 rounded-2xl shadow-2xs p-5 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                  <div className="flex items-center gap-2">
                    <MapIcon className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                      Google Maps Geofence & Boundary Radar
                    </h3>
                  </div>

                  {/* Google Maps Layer Switcher */}
                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
                    <button
                      onClick={() => setMapType('m')}
                      className={cn(
                        "px-2.5 py-1 rounded font-semibold text-[11px] transition-all cursor-pointer",
                        mapType === 'm' ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      Map
                    </button>
                    <button
                      onClick={() => setMapType('k')}
                      className={cn(
                        "px-2.5 py-1 rounded font-semibold text-[11px] transition-all cursor-pointer",
                        mapType === 'k' ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      Satellite
                    </button>
                    <button
                      onClick={() => setMapType('h')}
                      className={cn(
                        "px-2.5 py-1 rounded font-semibold text-[11px] transition-all cursor-pointer",
                        mapType === 'h' ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      Hybrid
                    </button>
                  </div>
                </div>

                {/* Embedded Live Google Maps with Geofence Perimeter Overlay */}
                {activeLocation && (
                  <div className="relative h-72 rounded-xl overflow-hidden border border-gray-200 mt-3 bg-slate-900 flex items-center justify-center group">
                    <iframe
                      title="Google Maps Geofence Visualizer"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://maps.google.com/maps?q=${activeLocation.latitude},${activeLocation.longitude}&hl=en&z=${mapZoom}&t=${mapType}&output=embed`}
                      className="w-full h-full"
                    />

                    {/* Geofence Perimeter Radar Circle */}
                    <div className="absolute pointer-events-none flex items-center justify-center">
                      <div
                        className="rounded-full border-2 border-emerald-500 bg-emerald-500/25 animate-pulse flex items-center justify-center shadow-lg"
                        style={{
                          width: `${Math.min(260, Math.max(90, (activeLocation.geofence_radius_meters / 150) * 140))}px`,
                          height: `${Math.min(260, Math.max(90, (activeLocation.geofence_radius_meters / 150) * 140))}px`,
                        }}
                      >
                        <div className="w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-400/60 shadow-md" />
                      </div>
                    </div>

                    {/* Overlay Info Badge */}
                    <div className="absolute top-2 left-2 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-lg text-[11px] text-slate-200 backdrop-blur-xs flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>{activeLocation.name}</span>
                      <span className="font-mono text-emerald-400 font-bold">({activeLocation.geofence_radius_meters}m boundary)</span>
                    </div>

                    {/* Zoom & External Google Maps Link Controls */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                      <button
                        onClick={() => setMapZoom((z) => Math.min(20, z + 1))}
                        className="p-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded-lg text-white text-xs cursor-pointer shadow-xs"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setMapZoom((z) => Math.max(12, z - 1))}
                        className="p-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded-lg text-white text-xs cursor-pointer shadow-xs"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${activeLocation.latitude},${activeLocation.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded-lg text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Google Maps
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs flex items-center justify-between text-gray-600">
                <span>Authoritative Haversine Distance: <strong className="text-gray-900">{liveEvaluation?.distanceMeters ?? 'Calculating...'} m</strong></span>
                <span>Status: <strong className={liveEvaluation?.isInside ? 'text-emerald-700' : 'text-rose-700'}>{liveEvaluation?.geofenceStatus ?? 'READY'}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. STAFF LOCATION MAPPING TAB */}
      {activeSubTab === 'mapping' && (
        <div className="bg-white border border-gray-200/80 rounded-2xl shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Employee Geofence Location Authorization & Mapping</h3>
              <p className="text-xs text-gray-500 mt-0.5">Control which employees are allowed to clock in at specific offices and factories.</p>
            </div>
            <Badge variant="blue">{employees.length} Active Staff</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Employee</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Authorized Geofence Locations</th>
                  <th className="p-3.5">Clocking Mode</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => {
                  const empAssignments = assignments.filter((a) => (a.employee_id === emp.id || (emp.employee_code && a.employee_id === emp.employee_code)) && a.is_active);
                  const isMapped = empAssignments.length > 0;
                  const assignedLocations = isMapped
                    ? locations.filter((l) => empAssignments.some((a) => a.work_location_id === l.id))
                    : locations; // default to all if unrestricted

                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/50">
                      <td className="p-3.5">
                        <strong className="text-gray-900 block">{emp.display_name || emp.name}</strong>
                        <span className="text-[11px] text-gray-400 font-mono">{emp.employee_code || 'WF-EMP'}</span>
                      </td>
                      <td className="p-3.5 text-gray-700 font-medium">{emp.department_name || emp.department || 'Operations'}</td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {assignedLocations.map((loc) => {
                            const isPrim = empAssignments.find((a) => a.work_location_id === loc.id)?.is_primary;
                            return (
                              <span
                                key={loc.id}
                                className={cn(
                                  "px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1",
                                  isPrim
                                    ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                    : "bg-gray-100 text-gray-700 border border-gray-200"
                                )}
                              >
                                {isPrim && <CheckCircle className="w-3 h-3 text-emerald-700" />}
                                {loc.name} {isPrim ? '(Primary)' : ''}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <Badge variant="emerald" size="sm">Strict Geofence</Badge>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleOpenEmployeeMapping(emp)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-[#07563D] hover:text-white text-gray-800 font-bold rounded-xl text-xs transition-all cursor-pointer"
                        >
                          Map Locations
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. GEOFENCES MANAGEMENT */}
      {activeSubTab === 'geofences' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Configurable Work Locations & Geofence Boundaries</h3>
              <p className="text-xs text-gray-500 mt-0.5">Configure facility coordinates using Google Maps link or device GPS sensor.</p>
            </div>
            <Button
              onClick={() => {
                setSelectedLocation({
                  name: 'Joy Corporate Solutions Private Limited (HQ)',
                  code: `LOC-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
                  location_type: 'OFFICE',
                  address: 'D.No: 2 31 A9, Annur Road, Thennampalayam, Sulur, Arasur, Coimbatore, Tamil Nadu 641407',
                  latitude: 11.0844364,
                  longitude: 77.1262627,
                  geofence_radius_meters: 100,
                  accuracy_requirement_meters: 50,
                  is_active: true,
                });
                setGoogleMapsUrlInput('11.0844364, 77.1262627');
                setIsEditingLocation(true);
              }}
              className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-xl text-xs py-2 px-4 shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Work Location
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locations.map((loc) => (
              <div key={loc.id} className="p-5 bg-white border border-gray-200/80 rounded-2xl shadow-2xs space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                      {loc.location_type === 'FACTORY' ? <Factory className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{loc.name}</h4>
                      <span className="text-[11px] text-gray-400 font-mono block">{loc.code} • {loc.location_type}</span>
                    </div>
                  </div>
                  <Badge variant={loc.is_active ? 'emerald' : 'gray'}>{loc.is_active ? 'Active' : 'Disabled'}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50/80 rounded-xl text-xs border border-gray-100">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold uppercase">Radius Limit</span>
                    <strong className="text-[#07563D] font-mono text-sm">{loc.geofence_radius_meters} m</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold uppercase">GPS Accuracy</span>
                    <strong className="text-gray-800 font-mono text-sm">≤ {loc.accuracy_requirement_meters} m</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold uppercase">Coordinates</span>
                    <span className="text-[11px] text-gray-600 font-mono block truncate" title={`${loc.latitude}, ${loc.longitude}`}>
                      {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                  <span className="text-gray-500 text-[11px] truncate max-w-[200px]">{loc.address || 'Standard Facility Zone'}</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50 cursor-pointer"
                      title="View in Google Maps"
                    >
                      <Globe className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => {
                        setSelectedLocation(loc);
                        setGoogleMapsUrlInput(`${loc.latitude}, ${loc.longitude}`);
                        setIsEditingLocation(true);
                      }}
                      className="px-3 py-1 text-xs font-bold border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-800 cursor-pointer"
                    >
                      Edit Configuration
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(loc.id, loc.name)}
                      className="p-1 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                      title="Delete Location"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. MOBILE POLICY TAB */}
      {activeSubTab === 'mobile' && (
        <div className="p-5 bg-white border border-gray-200/80 rounded-2xl shadow-2xs text-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Mobile Attendance Security & Fraud Rules</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 rounded-xl space-y-2 bg-gray-50/50">
              <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-600" /> Anti-Spoof Detection
              </h4>
              <p className="text-gray-500 text-[11px]">Strictly rejects developer option fake GPS apps and jailbroken iOS mock coordinates.</p>
              <Badge variant="emerald">ENFORCED (BLOCK CLOCK-IN)</Badge>
            </div>

            <div className="p-4 border border-gray-200 rounded-xl space-y-2 bg-gray-50/50">
              <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-blue-600" /> GPS Freshness Gate
              </h4>
              <p className="text-gray-500 text-[11px]">Rejects cached or old GPS fixes older than 60 seconds.</p>
              <Badge variant="blue">MAX AGE: 60 SECONDS</Badge>
            </div>

            <div className="p-4 border border-gray-200 rounded-xl space-y-2 bg-gray-50/50">
              <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-purple-600" /> Idempotent Ingestion
              </h4>
              <p className="text-gray-500 text-[11px]">Unique attempt keys protect against network retry duplicate punches.</p>
              <Badge variant="purple">ENABLED (SHA-256)</Badge>
            </div>
          </div>
        </div>
      )}

      {/* 6. LOCATION LOGS & EXCEPTIONS TAB */}
      {(activeSubTab === 'logs' || activeSubTab === 'exceptions') && (
        <div className="bg-white border border-gray-200/80 rounded-2xl shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                {activeSubTab === 'exceptions' ? 'GPS & Geofence Boundary Violation Log' : 'Authoritative GPS Attendance Audit Trail'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Immutable record of coordinates, accuracy tolerances, and distances.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {locationEvents.length > 0 ? (
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-3 py-3">Work Location</th>
                    <th className="px-3 py-3">Event Type</th>
                    <th className="px-3 py-3">Distance & Accuracy</th>
                    <th className="px-3 py-3">Timestamp</th>
                    <th className="px-4 py-3 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {locationEvents
                    .filter((e) => activeSubTab === 'logs' || e.event_type === 'OUTSIDE_GEOFENCE' || e.event_type === 'LOW_ACCURACY' || e.event_type === 'MOCK_LOCATION')
                    .map((evt) => (
                      <tr key={evt.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <strong className="text-gray-900 block">{evt.employee_name || 'Staff'}</strong>
                          <span className="text-[10px] text-gray-400 font-mono">{evt.employee_code || evt.employee_id}</span>
                        </td>
                        <td className="px-3 py-3 text-gray-700 font-medium">
                          {evt.work_location_name || 'Work Location'}
                        </td>
                        <td className="px-3 py-3 font-mono font-bold text-gray-800">
                          {evt.event_type}
                        </td>
                        <td className="px-3 py-3 font-mono text-gray-600">
                          {evt.distance_meters}m from center (±{evt.accuracy_meters}m)
                        </td>
                        <td className="px-3 py-3 font-mono text-gray-500">
                          {new Date(evt.device_timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge variant={evt.geofence_status === 'INSIDE' ? 'emerald' : 'rose'} size="sm">
                            {evt.geofence_status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-xs text-gray-500">
                No GPS location events recorded for this organization yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* GEOFENCE ZONE MODAL WITH GOOGLE MAPS URL PARSER & SATELLITE PREVIEW */}
      {isEditingLocation && selectedLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-6">
            <div className="p-4 bg-gradient-to-r from-[#07563D] to-[#0a7a57] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapIcon className="w-4 h-4 text-emerald-300" />
                <h3 className="font-bold text-sm">
                  {selectedLocation.id ? 'Edit Work Location & Google Maps Geofence' : 'Create Work Location'}
                </h3>
              </div>
              <button
                onClick={() => setIsEditingLocation(false)}
                className="text-white/80 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="p-5 space-y-3.5 text-xs">
              {/* 1. Paste Google Maps Link / DMS Coordinates / Search Input */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-blue-900 font-bold flex items-center gap-1 text-xs">
                    <LinkIcon className="w-3.5 h-3.5 text-blue-700" /> Paste Google Maps Link / DMS Coordinates
                  </label>
                  <span className="text-[10px] text-blue-600 font-mono">11°05'05.0"N 77°07'34.0"E</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={googleMapsUrlInput}
                    onChange={(e) => setGoogleMapsUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleProcessGoogleMapsLink(); } }}
                    placeholder="Paste link (https://maps.app.goo.gl/...) or 11.0844364, 77.1262627"
                    className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded-xl focus:ring-1 focus:ring-blue-600 focus:outline-none text-xs font-mono"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleProcessGoogleMapsLink}
                    disabled={isProcessingGmapsLink || !googleMapsUrlInput.trim()}
                    className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer"
                  >
                    <Sparkles className={cn("w-3.5 h-3.5 mr-1", isProcessingGmapsLink && "animate-spin")} />
                    Apply
                  </Button>
                </div>
                <div className="flex items-center gap-1.5 pt-1 text-[11px]">
                  <span className="text-blue-700 font-semibold">Quick Preset:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleMapsUrlInput('https://maps.app.goo.gl/cyya5UiZ1Brnbirz5');
                      setSelectedLocation((prev) => ({
                        ...prev,
                        name: 'Joy Corporate Solutions Private Limited (HQ)',
                        latitude: 11.0844364,
                        longitude: 77.1262627,
                        address: 'D.No: 2 31 A9, Annur Road, Thennampalayam, Sulur, Arasur, Coimbatore, Tamil Nadu 641407',
                        geofence_radius_meters: 100,
                        accuracy_requirement_meters: 50,
                      }));
                      showToast('✓ Set Joy Corporate Solutions Private Limited HQ (11.0844364°, 77.1262627°)', 'success');
                    }}
                    className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold rounded-md cursor-pointer transition-all"
                  >
                    📍 Joy HQ (Arasur Campus)
                  </button>
                </div>
              </div>

              {/* 2. Device Sensor GPS Button */}
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                <div>
                  <strong className="text-gray-800 block font-semibold text-xs">Live Device GPS Sensor</strong>
                  <span className="text-[11px] text-gray-500">Detect your current position directly</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDetectModalCoordinates}
                  disabled={isDetectingModalGps}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border-gray-300 cursor-pointer"
                >
                  <Locate className={cn("w-3.5 h-3.5 mr-1", isDetectingModalGps && "animate-spin")} />
                  {isDetectingModalGps ? 'Locating...' : 'Use Device GPS'}
                </Button>
              </div>

              {/* 3. Facility Name & Code */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Facility / Location Name:</label>
                <input
                  type="text"
                  required
                  value={selectedLocation.name || ''}
                  onChange={(e) => setSelectedLocation({ ...selectedLocation, name: e.target.value })}
                  placeholder="e.g. Joy Corporate Solutions Private Limited (HQ)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#07563D] focus:outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Location Code:</label>
                  <input
                    type="text"
                    required
                    value={selectedLocation.code || ''}
                    onChange={(e) => setSelectedLocation({ ...selectedLocation, code: e.target.value })}
                    placeholder="LOC-JOY-HQ"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#07563D] focus:outline-none uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Location Type:</label>
                  <select
                    value={selectedLocation.location_type || 'OFFICE'}
                    onChange={(e) => setSelectedLocation({ ...selectedLocation, location_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#07563D] focus:outline-none"
                  >
                    <option value="OFFICE">Office / HQ</option>
                    <option value="FACTORY">Factory / Production</option>
                    <option value="BRANCH">Branch Office</option>
                    <option value="WAREHOUSE">Warehouse</option>
                    <option value="PROJECT_SITE">Project Site</option>
                    <option value="CLIENT_SITE">Client Site</option>
                  </select>
                </div>
              </div>

              {/* 4. Exact Coordinates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Latitude:</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={selectedLocation.latitude !== undefined ? selectedLocation.latitude : ''}
                    onChange={(e) => setSelectedLocation({ ...selectedLocation, latitude: parseFloat(e.target.value) || 0 })}
                    placeholder="11.0844364"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#07563D] focus:outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Longitude:</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={selectedLocation.longitude !== undefined ? selectedLocation.longitude : ''}
                    onChange={(e) => setSelectedLocation({ ...selectedLocation, longitude: parseFloat(e.target.value) || 0 })}
                    placeholder="77.1262627"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#07563D] focus:outline-none font-mono font-bold"
                  />
                </div>
              </div>

              {/* 5. Google Maps Satellite/Map Live Preview */}
              {selectedLocation.latitude !== undefined && selectedLocation.longitude !== undefined && (
                <div className="rounded-xl overflow-hidden border border-gray-200 h-44 bg-slate-900 relative">
                  <iframe
                    title="Modal Google Maps Preview"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    loading="lazy"
                    src={`https://maps.google.com/maps?q=${selectedLocation.latitude},${selectedLocation.longitude}&hl=en&z=17&t=${modalMapType}&output=embed`}
                    className="w-full h-full"
                  />

                  {/* Satellite / Map toggle in modal */}
                  <div className="absolute top-2 right-2 flex gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-700 backdrop-blur-xs">
                    <button
                      type="button"
                      onClick={() => setModalMapType('m')}
                      className={cn("px-2 py-0.5 text-[10px] rounded font-semibold cursor-pointer", modalMapType === 'm' ? "bg-white text-gray-900" : "text-white/80")}
                    >
                      Map
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalMapType('k')}
                      className={cn("px-2 py-0.5 text-[10px] rounded font-semibold cursor-pointer", modalMapType === 'k' ? "bg-white text-gray-900" : "text-white/80")}
                    >
                      Satellite
                    </button>
                  </div>

                  <div className="absolute bottom-2 left-2 bg-slate-900/90 border border-slate-700 px-2 py-1 rounded-lg text-[10px] text-slate-200 backdrop-blur-xs flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {selectedLocation.latitude.toFixed(6)}°, {selectedLocation.longitude.toFixed(6)}°
                  </div>
                </div>
              )}

              {/* 6. Radius Slider */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-gray-700 font-semibold">Geofence Radius (Meters):</label>
                  <strong className="text-[#07563D] font-mono">{selectedLocation.geofence_radius_meters || 100}m</strong>
                </div>
                <input
                  type="range"
                  min="25"
                  max="1000"
                  step="25"
                  value={selectedLocation.geofence_radius_meters || 100}
                  onChange={(e) => setSelectedLocation({ ...selectedLocation, geofence_radius_meters: parseInt(e.target.value, 10) })}
                  className="w-full accent-[#07563D] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                  <span>50m (Office)</span>
                  <span>100m (HQ)</span>
                  <span>300m (Factory)</span>
                  <span>1000m (Plant)</span>
                </div>
              </div>

              {/* 7. Resolved Physical Address */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Physical Address / Street / Plus Code:</label>
                <input
                  type="text"
                  value={selectedLocation.address || ''}
                  onChange={(e) => setSelectedLocation({ ...selectedLocation, address: e.target.value })}
                  placeholder="D.No: 2 31 A9, Annur Road, Thennampalayam, Sulur, Arasur, Coimbatore"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#07563D] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditingLocation(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Save Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMPLOYEE WORK LOCATION ASSIGNMENT MODAL */}
      {isMappingEmployee && selectedEmpForMapping && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-200" />
                <h3 className="font-bold text-sm">
                  Map Locations for {selectedEmpForMapping.display_name || selectedEmpForMapping.name}
                </h3>
              </div>
              <button
                onClick={() => setIsMappingEmployee(false)}
                className="text-white/80 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEmployeeMapping} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-xl">
                <span className="text-[11px] text-gray-500 block">Configuring Staff Member:</span>
                <strong className="text-gray-900 text-sm block">{selectedEmpForMapping.display_name || selectedEmpForMapping.name}</strong>
                <span className="text-xs text-blue-800 font-mono">
                  {selectedEmpForMapping.employee_code || 'WF-EMP'} • {selectedEmpForMapping.department_name || selectedEmpForMapping.department || 'Operations'}
                </span>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-2">Authorized Geofence Work Locations:</label>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {locations.map((loc) => {
                    const isChecked = mappedLocationIds.includes(loc.id);
                    const isPrimary = primaryLocationId === loc.id;
                    return (
                      <div
                        key={loc.id}
                        className={cn(
                          "p-3 rounded-xl border flex items-center justify-between gap-3 transition-all",
                          isChecked ? "bg-blue-50/50 border-blue-200" : "bg-gray-50 border-gray-200 opacity-60"
                        )}
                      >
                        <label className="flex items-center gap-2.5 flex-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setMappedLocationIds([...mappedLocationIds, loc.id]);
                                if (!primaryLocationId) setPrimaryLocationId(loc.id);
                              } else {
                                setMappedLocationIds(mappedLocationIds.filter((id) => id !== loc.id));
                                if (primaryLocationId === loc.id) {
                                  const remaining = mappedLocationIds.filter((id) => id !== loc.id);
                                  setPrimaryLocationId(remaining[0] || '');
                                }
                              }
                            }}
                            className="w-4 h-4 rounded text-blue-600 accent-[#07563D] cursor-pointer"
                          />
                          <div>
                            <strong className="text-gray-900 block">{loc.name}</strong>
                            <span className="text-[11px] text-gray-500 font-mono">Radius: {loc.geofence_radius_meters}m • {loc.location_type}</span>
                          </div>
                        </label>

                        {isChecked && (
                          <button
                            type="button"
                            onClick={() => setPrimaryLocationId(loc.id)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                              isPrimary ? "bg-emerald-600 text-white shadow-xs" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            )}
                          >
                            {isPrimary ? '★ Primary HQ' : 'Set as Primary'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>When mapped, this employee can only clock in from these authorized geofence perimeters.</span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsMappingEmployee(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Save Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
