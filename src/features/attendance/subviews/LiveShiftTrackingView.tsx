import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  Radio,
  Clock,
  Battery,
  BatteryCharging,
  Zap,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Layers,
  ZoomIn,
  ZoomOut,
  ShieldCheck,
  Activity,
  ArrowRight,
  TrendingUp,
  User,
  Car,
  Footprints,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Users,
  Calendar,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import {
  shiftTrackingService,
  EmployeeLiveLocation,
  EmployeeLocationTrail,
} from '../../../services/location/shiftTrackingService';
import {
  reverseGeocode,
  resolveLocationDetails,
  ResolvedLocationDetails,
  createGoogleMapInstance,
  computeRoadRouteViaRoutesApi,
  GOOGLE_MAPS_API_KEY,
} from '../../../services/location/googleMapsService';
import {
  getEmployeeAvatarUrl,
} from '../../../utils/snapchatAvatarHelper';

export interface TimelineSegment {
  id: string;
  type: 'stay' | 'trip';
  title: string;
  subtitle: string;
  startTime: Date;
  endTime: Date;
  startLatLng: { lat: number; lng: number };
  endLatLng?: { lat: number; lng: number };
  distanceMeters: number;
  avgSpeedKmh?: number;
  batteryLevel?: number;
  waypointCount: number;
  resolvedAddress?: string;
}

export function formatDurationDiff(start: Date, end: Date): string {
  const diffMs = Math.max(0, end.getTime() - start.getTime());
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return '< 1 min';
  if (diffMins < 60) return `${diffMins} mins`;
  const hours = Math.floor(diffMins / 60);
  const remaining = diffMins % 60;
  return `${hours}h ${remaining > 0 ? `${remaining}m` : ''}`;
}

export const getEmployeeAvatar = (
  empOrName?: any,
  avatarUrl?: string,
  gender?: string
) => {
  if (typeof empOrName === 'object' && empOrName !== null) {
    return getEmployeeAvatarUrl(empOrName);
  }
  return getEmployeeAvatarUrl({
    employee_name: empOrName,
    avatar_url: avatarUrl,
    gender,
  });
};

/**
 * Creates a custom Google Maps OverlayView that binds the employee's genuine profile photo,
 * circular pin with drop pointer, and live status badge directly
 * to the employee's exact geographic coordinates (lat, lng).
 */
function createEmployeeRadarOverlay(
  map: any,
  emp: EmployeeLiveLocation,
  isSelected: boolean,
  isFleetOverview: boolean,
  onClick: () => void
) {
  if (!window.google?.maps?.OverlayView) return null;

  const overlay = new window.google.maps.OverlayView();
  let container: HTMLDivElement | null = null;

  overlay.onAdd = function () {
    container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.cursor = 'pointer';
    container.style.zIndex = isSelected ? '999' : '100';
    container.style.userSelect = 'none';

    const hasLivePing = Boolean(emp.has_live_ping);
    const isMoving = Boolean(emp.is_moving || emp.status === 'moving');
    const isStale = Boolean(emp.is_stale);
    const avatarUrl = getEmployeeAvatarUrl(emp);
    const speedStr = emp.speed > 0 ? `${Math.round(emp.speed)} km/h` : 'Travelling';
    const pingColor = !hasLivePing
      ? 'rgba(148, 163, 184, 0.25)'
      : isMoving
      ? 'rgba(59, 130, 246, 0.4)'
      : 'rgba(16, 185, 129, 0.35)';
    const pingColorInner = !hasLivePing
      ? 'rgba(203, 213, 225, 0.35)'
      : isMoving
      ? 'rgba(96, 165, 250, 0.5)'
      : 'rgba(52, 211, 153, 0.45)';
    const dotColor = !hasLivePing ? (isStale ? '#f59e0b' : '#94a3b8') : isMoving ? '#3b82f6' : '#10b981';
    const firstName = emp.employee_name?.split(' ')[0] || emp.employee_code || 'Staff';
    const timeStr = emp.last_pinged_at
      ? new Date(emp.last_pinged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    // In Fleet Overview mode or when selected, show name & status pill
    const showNameTag = isSelected || isFleetOverview;

    container.innerHTML = `
      <div style="position: relative; width: 0; height: 0; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.35));">
        ${showNameTag ? `
          <div style="position: absolute; bottom: ${isSelected ? 54 : 44}px; left: 50%; transform: translateX(-50%); margin-bottom: 4px; padding: 3px 9px; background: rgba(15, 23, 42, 0.94); border: 1.5px solid rgba(255, 255, 255, 0.3); border-radius: 9999px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 5px; white-space: nowrap; font-size: 11px; font-weight: 800; color: white; backdrop-filter: blur(6px); pointer-events: auto; z-index: 20;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: ${dotColor}; box-shadow: 0 0 6px ${dotColor};"></span>
            <span style="letter-spacing: -0.01em;">${firstName}</span>
            <span style="font-size: 9px; font-family: monospace; background: rgba(6, 78, 59, 0.85); color: #6ee7b7; padding: 1px 4px; border-radius: 3px; border: 1px solid rgba(16, 185, 129, 0.4);">${emp.employee_code || ''}</span>
            ${isMoving && hasLivePing
              ? `<span style="font-size: 9px; color: #93c5fd; background: rgba(30, 58, 138, 0.9); padding: 1px 5px; border-radius: 9999px;">🚗 ${speedStr}</span>`
              : hasLivePing
              ? `<span style="font-size: 9px; color: #6ee7b7;">• Live</span>`
              : isStale
              ? `<span style="font-size: 9px; color: #fde047;">• Check-In (${timeStr})</span>`
              : `<span style="font-size: 9px; color: #cbd5e1;">• Saved</span>`
            }
            ${emp.battery_level != null ? `<span style="font-size: 9px; color: #e2e8f0; border-left: 1px solid rgba(255,255,255,0.25); padding-left: 5px;">🔋${emp.battery_level}%</span>` : ''}
          </div>
        ` : ''}

        <!-- Profile Photo Pin Marker with Drop Pointer -->
        <div style="position: absolute; top: 0; left: 0; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; pointer-events: auto;">
          ${(isSelected || isFleetOverview) && hasLivePing ? `
            <div style="position: absolute; top: 35%; left: 50%; transform: translate(-50%, -50%); width: ${isSelected ? 76 : 56}px; height: ${isSelected ? 76 : 56}px; border-radius: 50%; background: ${pingColor}; animation: radarPing 2.2s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none;"></div>
            <div style="position: absolute; top: 35%; left: 50%; transform: translate(-50%, -50%); width: ${isSelected ? 56 : 42}px; height: ${isSelected ? 56 : 42}px; border-radius: 50%; background: ${pingColorInner}; animation: radarPulse 1.6s ease-in-out infinite; pointer-events: none;"></div>
          ` : ''}
          <div style="position: relative; width: ${isSelected ? 48 : 38}px; height: ${isSelected ? 48 : 38}px; border-radius: 50%; border: ${isSelected ? '3px solid #10b981' : '2.5px solid white'}; box-shadow: 0 4px 12px rgba(0,0,0,0.3); overflow: hidden; background: #f8fafc;">
            <img src="${avatarUrl}" alt="${emp.employee_name}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
          </div>
          <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 7px solid ${isSelected ? '#10b981' : 'white'}; margin-top: -2px;"></div>
        </div>
      </div>
    `;

    container.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });

    const panes = this.getPanes();
    panes?.overlayMouseTarget?.appendChild(container);
  };

  overlay.draw = function () {
    const projection = this.getProjection();
    if (!projection || !container) return;
    const point = projection.fromLatLngToDivPixel(
      new window.google.maps.LatLng(emp.latitude, emp.longitude)
    );
    if (point) {
      container.style.left = `${point.x}px`;
      container.style.top = `${point.y}px`;
    }
  };

  overlay.onRemove = function () {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
      container = null;
    }
  };

  overlay.setMap(map);
  return overlay;
}

function createEmployeeOverlay(
  map: any,
  emp: EmployeeLiveLocation,
  isSelected: boolean,
  isFleetOverview: boolean,
  onClick: () => void
) {
  if (window.google?.maps?.OverlayView) {
    try {
      const overlay = createEmployeeRadarOverlay(map, emp, isSelected, isFleetOverview, onClick);
      if (overlay) return overlay;
    } catch (err) {
      console.warn('[LiveShiftTrackingView] OverlayView creation error, using Marker fallback:', err);
    }
  }

  // Fallback to standard Google Maps Marker if OverlayView fails
  const marker = new window.google.maps.Marker({
    position: { lat: emp.latitude, lng: emp.longitude },
    map,
    title: `${emp.employee_name} (${emp.employee_code || emp.employee_id})`,
    icon: {
      url: getEmployeeAvatarUrl(emp, { size: isSelected ? 48 : 36 }),
      scaledSize: new window.google.maps.Size(isSelected ? 44 : 34, isSelected ? 44 : 34),
      origin: new window.google.maps.Point(0, 0),
      anchor: new window.google.maps.Point(isSelected ? 22 : 17, isSelected ? 22 : 17),
    },
    zIndex: isSelected ? 999 : 100,
  });
  marker.addListener('click', onClick);
  return marker;
}

export interface LiveShiftTrackingViewProps {
  onOpenEmployeeProfile?: (empId: string) => void;
}

export const LiveShiftTrackingView: React.FC<LiveShiftTrackingViewProps> = ({

  onOpenEmployeeProfile,
}) => {
  const { showToast } = useToast();

  const [liveEmployees, setLiveEmployees] = useState<EmployeeLiveLocation[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [trails, setTrails] = useState<EmployeeLocationTrail[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingTrails, setIsLoadingTrails] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'live' | 'moving' | 'on_leave' | 'offline'>('ALL');
  const [computedRoadDistanceMeters, setComputedRoadDistanceMeters] = useState<number>(0);
  const [isJsMapReady, setIsJsMapReady] = useState<boolean>(false);
  const [isFleetOverview, setIsFleetOverview] = useState<boolean>(false);

  // Google Maps settings
  const [mapType, setMapType] = useState<'m' | 'k' | 'h'>('m'); // Roadmap, Satellite, Hybrid
  const [mapZoom, setMapZoom] = useState<number>(16);
  const [resolvedAddress, setResolvedAddress] = useState<string>('');
  const [locationDetails, setLocationDetails] = useState<ResolvedLocationDetails | null>(null);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [showGeofence, setShowGeofence] = useState<boolean>(true);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [timelineViewMode, setTimelineViewMode] = useState<'smart' | 'raw'>('smart');
  const [stopAddressMap, setStopAddressMap] = useState<Record<string, ResolvedLocationDetails>>({});

  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const googleMapInstanceRef = React.useRef<any>(null);
  const markersRef = React.useRef<any[]>([]);
  const routePolylineRef = React.useRef<any>(null);
  const directionsRendererRef = React.useRef<any>(null);
  const trailMarkersRef = React.useRef<any[]>([]);
  const geofenceCircleRef = React.useRef<any>(null);
  const selectedEmployeeIdRef = React.useRef<string | null>(null);
  selectedEmployeeIdRef.current = selectedEmployeeId;

  // Calendar / Date selection state (defaults to today YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [autoFollow, setAutoFollow] = useState<boolean>(true);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const trailTotalDistance = useMemo(() => {
    if (computedRoadDistanceMeters > 0) {
      return computedRoadDistanceMeters;
    }
    if (trails.length === 0) return 0;
    const last = trails[trails.length - 1];
    if (last && typeof last.cumulative_distance_meters === 'number' && last.cumulative_distance_meters > 0) {
      return last.cumulative_distance_meters;
    }
    // Filter out indoor stationary drift / heartbeat / initial ping noise:
    // Only sum legitimate physical movements (displacement >= 30m and verified speed)
    return trails.reduce((acc, t) => {
      const isInitial = t.metadata?.is_initial === true;
      const isHeartbeat = t.metadata?.is_heartbeat === true;
      const disp = Number(t.displacement_meters) || 0;
      if (isInitial || isHeartbeat || disp < 30 || (t.speed != null && t.speed < 0.65 && disp < 45)) {
        return acc;
      }
      return acc + disp;
    }, 0);
  }, [trails, computedRoadDistanceMeters]);

  const fitAllEmployeesBounds = useCallback(() => {
    if (!googleMapInstanceRef.current || !window.google?.maps) return;
    const bounds = new window.google.maps.LatLngBounds();
    let count = 0;
    liveEmployees.forEach((emp) => {
      // Only fit bounds around employees actively transmitting live GPS today
      if (emp.has_live_ping && !emp.is_on_leave && emp.latitude && emp.longitude && emp.latitude !== 0) {
        bounds.extend(new window.google.maps.LatLng(emp.latitude, emp.longitude));
        count++;
      }
    });
    if (count > 0) {
      googleMapInstanceRef.current.fitBounds(bounds, {
        top: 80,
        right: 80,
        bottom: 80,
        left: 80,
      });
      if (count === 1) {
        googleMapInstanceRef.current.setZoom(16);
      }
    }
  }, [liveEmployees]);

  // Load live employees
  const loadLiveLocations = useCallback(async (silent: boolean = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await shiftTrackingService.getLiveLocations();
      setLiveEmployees(data);
      if (data.length > 0) {
        setSelectedEmployeeId((prev) => {
          const firstLive = data.find((d) => d.has_live_ping);
          if (!prev) {
            return firstLive ? firstLive.employee_id : data[0].employee_id;
          }
          const currentEmp = data.find((d) => d.employee_id === prev);
          if (firstLive && currentEmp && !currentEmp.has_live_ping) {
            return firstLive.employee_id;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('[LiveShiftTrackingView] Load error:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  // Load trails for selected employee on the selected calendar date
  const loadEmployeeTrails = useCallback(async (empId: string, dateStr?: string) => {
    setIsLoadingTrails(true);
    setComputedRoadDistanceMeters(0);
    try {
      const targetDate = dateStr || selectedDate;
      const trailData = await shiftTrackingService.getEmployeeTrails(empId, targetDate);
      setTrails(trailData);
    } catch (err) {
      console.error('[LiveShiftTrackingView] Trail error:', err);
    } finally {
      setIsLoadingTrails(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadLiveLocations();

    // Subscribe to live telemetry push on employee_live_locations & attendance_punches
    const unsubLive = shiftTrackingService.subscribeLiveUpdates('', () => {
      loadLiveLocations(true);
    });

    // Subscribe to real-time breadcrumb trail additions
    const unsubTrails = shiftTrackingService.subscribeTrailUpdates('', (newTrail) => {
      const currentSelected = selectedEmployeeIdRef.current;
      if (currentSelected && newTrail.employee_id === currentSelected) {
        setTrails((prev) => {
          if (prev.some((t) => t.id === newTrail.id)) return prev;
          return [...prev, newTrail];
        });
      }
    });

    return () => {
      unsubLive();
      unsubTrails();
    };
  }, [loadLiveLocations]);

  useEffect(() => {
    if (selectedEmployeeId) {
      loadEmployeeTrails(selectedEmployeeId, selectedDate);
    }
  }, [selectedEmployeeId, selectedDate, loadEmployeeTrails]);

  // Selected employee data
  const activeEmployee = useMemo(() => {
    return liveEmployees.find((e) => e.employee_id === selectedEmployeeId) || liveEmployees[0] || null;
  }, [liveEmployees, selectedEmployeeId]);

  // Cluster historical trail breadcrumbs into clear Stays (dwell stops) and Trips (transit)
  const timelineSegments = useMemo<TimelineSegment[]>(() => {
    if (!trails || trails.length === 0) {
      if (activeEmployee && activeEmployee.latitude !== 0) {
        const start = activeEmployee.last_pinged_at ? new Date(activeEmployee.last_pinged_at) : new Date();
        const hasLive = Boolean(activeEmployee.has_live_ping);
        return [
          {
            id: 'active-stay-origin',
            type: 'stay',
            title: locationDetails?.title || 'Workplace Station',
            subtitle: hasLive ? 'Stationary at desk • Live GPS Signal Active' : 'Last Known Location',
            startTime: start,
            endTime: new Date(),
            startLatLng: { lat: activeEmployee.latitude, lng: activeEmployee.longitude },
            distanceMeters: 0,
            waypointCount: 1,
            resolvedAddress: locationDetails?.address || resolvedAddress,
          },
        ];
      }
      return [];
    }

    const segments: TimelineSegment[] = [];
    const sorted = [...trails].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );

    let currentStayPoints: EmployeeLocationTrail[] = [];

    for (let i = 0; i < sorted.length; i++) {
      finalPtLoop: {
        const pt = sorted[i];
        if (!pt.latitude || !pt.longitude) break finalPtLoop;

        if (currentStayPoints.length === 0) {
          currentStayPoints.push(pt);
          break finalPtLoop;
        }

        const anchor = currentStayPoints[0];
        const R = 6371000;
        const dLat = ((pt.latitude - anchor.latitude) * Math.PI) / 180;
        const dLon = ((pt.longitude - anchor.longitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((anchor.latitude * Math.PI) / 180) *
            Math.cos((pt.latitude * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const distFromAnchor = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        // Threshold: 35m defines a Stay vs Transit
        if (distFromAnchor < 35.0) {
          currentStayPoints.push(pt);
        } else {
          // Close previous Stay
          const sFirst = currentStayPoints[0];
          const sLast = currentStayPoints[currentStayPoints.length - 1];
          const sStart = new Date(sFirst.recorded_at);
          const sEnd = new Date(sLast.recorded_at);
          const isFirstStop = segments.length === 0;

          const sKey = `${sFirst.latitude.toFixed(4)},${sFirst.longitude.toFixed(4)}`;
          const stopDetails = stopAddressMap[sKey] || (isFirstStop ? locationDetails : null);
          const stopTitle = stopDetails?.title || (isFirstStop ? 'Shift Origin' : `Stop #${Math.floor(segments.length / 2) + 1}`);
          const stopAddr = stopDetails?.address || (isFirstStop ? (locationDetails?.address || resolvedAddress) : undefined);

          segments.push({
            id: `stay-${sFirst.id}`,
            type: 'stay',
            title: stopTitle,
            subtitle: `Stationary for ${formatDurationDiff(sStart, sEnd)}`,
            startTime: sStart,
            endTime: sEnd,
            startLatLng: { lat: sFirst.latitude, lng: sFirst.longitude },
            distanceMeters: 0,
            waypointCount: currentStayPoints.length,
            resolvedAddress: stopAddr,
          });

          // Create Trip segment
          const prevTime = new Date(sLast.recorded_at);
          const currTime = new Date(pt.recorded_at);
          const speedKmh = pt.speed > 0 ? pt.speed * 3.6 : undefined;

          segments.push({
            id: `trip-${pt.id}`,
            type: 'trip',
            title: 'Transit / Commute',
            subtitle: `${(distFromAnchor / 1000).toFixed(2)} km displacement • ${speedKmh ? `${Math.round(speedKmh)} km/h` : 'In transit'}`,
            startTime: prevTime,
            endTime: currTime,
            startLatLng: { lat: sLast.latitude, lng: sLast.longitude },
            endLatLng: { lat: pt.latitude, lng: pt.longitude },
            distanceMeters: distFromAnchor,
            avgSpeedKmh: speedKmh,
            waypointCount: 1,
          });

          currentStayPoints = [pt];
        }
      }
    }

    if (currentStayPoints.length > 0) {
      const sFirst = currentStayPoints[0];
      const sLast = currentStayPoints[currentStayPoints.length - 1];
      const sStart = new Date(sFirst.recorded_at);
      const sEnd = new Date(sLast.recorded_at);
      const isFirstStop = segments.length === 0;

      const sKey = `${sFirst.latitude.toFixed(4)},${sFirst.longitude.toFixed(4)}`;
      const stopDetails = stopAddressMap[sKey] || (isFirstStop ? locationDetails : null);
      const stopTitle = stopDetails?.title || (isFirstStop ? 'Shift Origin' : `Stop #${Math.floor(segments.length / 2) + 1}`);
      const stopAddr = stopDetails?.address || (isFirstStop ? (locationDetails?.address || resolvedAddress) : undefined);

      segments.push({
        id: `stay-${sFirst.id}`,
        type: 'stay',
        title: stopTitle,
        subtitle: `Stationary for ${formatDurationDiff(sStart, sEnd)}`,
        startTime: sStart,
        endTime: sEnd,
        startLatLng: { lat: sFirst.latitude, lng: sFirst.longitude },
        distanceMeters: 0,
        waypointCount: currentStayPoints.length,
        resolvedAddress: stopAddr,
      });
    }

    return segments;
  }, [trails, activeEmployee, locationDetails, resolvedAddress, stopAddressMap]);

  // Reverse-geocode all distinct stay stops in trails into real Google Maps place names
  useEffect(() => {
    trails.forEach((t) => {
      if (!t.latitude || !t.longitude || t.latitude === 0) return;
      const key = `${t.latitude.toFixed(4)},${t.longitude.toFixed(4)}`;
      if (!stopAddressMap[key]) {
        resolveLocationDetails(t.latitude, t.longitude)
          .then((details) => {
            setStopAddressMap((prev) => ({ ...prev, [key]: details }));
          })
          .catch(() => {});
      }
    });
  }, [trails, stopAddressMap]);

  // Reverse-geocode active employee's GPS coordinates into Place name and Street Address
  useEffect(() => {
    if (activeEmployee && activeEmployee.latitude !== 0) {
      setIsGeocoding(true);
      resolveLocationDetails(activeEmployee.latitude, activeEmployee.longitude)
        .then((details) => {
          setLocationDetails(details);
          setResolvedAddress(details.fullAddress);
        })
        .catch(() => {
          setLocationDetails(null);
          setResolvedAddress('');
        })
        .finally(() => {
          setIsGeocoding(false);
        });
    } else {
      setLocationDetails(null);
      setResolvedAddress('No GPS coordinates reported yet');
    }
  }, [activeEmployee?.latitude, activeEmployee?.longitude]);

  // Initialize and synchronize interactive Google Maps JavaScript API instance
  useEffect(() => {
    let isMounted = true;
    if (mapContainerRef.current && !googleMapInstanceRef.current) {
      const initialCenter =
        activeEmployee && activeEmployee.latitude && activeEmployee.latitude !== 0
          ? { lat: activeEmployee.latitude, lng: activeEmployee.longitude }
          : { lat: 11.0844364, lng: 77.1262627 };

      createGoogleMapInstance(mapContainerRef.current, {
        center: initialCenter,
        zoom: mapZoom,
        mapTypeId: mapType === 'k' ? 'satellite' : mapType === 'h' ? 'hybrid' : 'roadmap',
      })
        .then((map) => {
          if (isMounted) {
            googleMapInstanceRef.current = map;
            setIsJsMapReady(true);
            map.addListener('dragstart', () => {
              setAutoFollow(false);
            });
          }
        })
        .catch((err) => {
          console.warn('[LiveShiftTrackingView] Google Maps JS API init error:', err);
          if (isMounted) setIsJsMapReady(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [activeEmployee?.latitude, activeEmployee?.longitude]);

  // Pan map when active employee coordinates update (respects autoFollow)
  useEffect(() => {
    if (googleMapInstanceRef.current && activeEmployee && autoFollow && activeEmployee.latitude !== 0) {
      googleMapInstanceRef.current.panTo({
        lat: activeEmployee.latitude,
        lng: activeEmployee.longitude,
      });
    }
  }, [activeEmployee?.latitude, activeEmployee?.longitude, autoFollow]);

  // Update zoom and map type
  useEffect(() => {
    if (googleMapInstanceRef.current) {
      googleMapInstanceRef.current.setZoom(mapZoom);
      googleMapInstanceRef.current.setMapTypeId(
        mapType === 'k' ? 'satellite' : mapType === 'h' ? 'hybrid' : 'roadmap'
      );
    }
  }, [mapZoom, mapType]);

  // Render Authorized Office Geofence Circle (100m) on Google Maps
  useEffect(() => {
    if (!googleMapInstanceRef.current || !window.google?.maps) return;

    if (geofenceCircleRef.current) {
      geofenceCircleRef.current.setMap(null);
      geofenceCircleRef.current = null;
    }

    if (showGeofence) {
      const circle = new window.google.maps.Circle({
        center: { lat: 11.0844364, lng: 77.1262627 },
        radius: 100, // 100-meter authorized office radius
        strokeColor: '#059669',
        strokeOpacity: 0.85,
        strokeWeight: 2,
        fillColor: '#10b981',
        fillOpacity: 0.16,
        map: googleMapInstanceRef.current,
      });
      geofenceCircleRef.current = circle;
    }

    return () => {
      if (geofenceCircleRef.current) {
        geofenceCircleRef.current.setMap(null);
        geofenceCircleRef.current = null;
      }
    };
  }, [showGeofence, isJsMapReady]);

  // Render polyline and waypoint markers when trails update (Step B: Road-snapping via DirectionsService)
  useEffect(() => {
    if (!googleMapInstanceRef.current || !window.google?.maps) return;

    // Clear previous route polyline
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }

    // Clear previous directions renderer
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }

    // Clear previous trail waypoint markers
    trailMarkersRef.current.forEach((m) => {
      if (typeof m.setMap === 'function') m.setMap(null);
    });
    trailMarkersRef.current = [];

    if (trails.length === 0) {
      setComputedRoadDistanceMeters(0);
      return;
    }

    // Filter out indoor stationary jitter points (< 25m from previous waypoint)
    const coordinates: { lat: number; lng: number }[] = [];
    trails.forEach((t) => {
      if (coordinates.length === 0) {
        coordinates.push({ lat: t.latitude, lng: t.longitude });
      } else {
        const prev = coordinates[coordinates.length - 1];
        const R = 6371000;
        const dLat = ((t.latitude - prev.lat) * Math.PI) / 180;
        const dLon = ((t.longitude - prev.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((prev.lat * Math.PI) / 180) *
            Math.cos((t.latitude * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        // Only add distinct waypoint if displacement is >= 25m or confirmed moving speed
        if (dist >= 25.0 || (t.speed != null && t.speed >= 0.75)) {
          coordinates.push({ lat: t.latitude, lng: t.longitude });
        }
      }
    });

    // If active employee has a real live coordinate, include it in coordinates if it extends the route
    if (activeEmployee && activeEmployee.has_live_ping && activeEmployee.latitude !== 0) {
      const last = coordinates.length > 0 ? coordinates[coordinates.length - 1] : null;
      if (!last || Math.abs(last.lat - activeEmployee.latitude) > 0.0001 || Math.abs(last.lng - activeEmployee.longitude) > 0.0001) {
        coordinates.push({ lat: activeEmployee.latitude, lng: activeEmployee.longitude });
      }
    }

    // If 2 or more genuine transit waypoints exist, render Google Routes API road-snapped route
    if (coordinates.length >= 2) {
      const origin = coordinates[0];
      const destination = coordinates[coordinates.length - 1];
      const intermediatePoints = coordinates.slice(1, -1);

      let isCancelled = false;

      // 1. Try modern Google Routes API v2 (active on your Google Cloud project)
      computeRoadRouteViaRoutesApi(origin, destination, intermediatePoints).then((routesResult) => {
        if (isCancelled || !googleMapInstanceRef.current) return;

        if (routesResult && routesResult.polylinePoints.length > 0) {
          setComputedRoadDistanceMeters(routesResult.distanceMeters);

          // Clear previous directions renderer if any
          if (directionsRendererRef.current) {
            directionsRendererRef.current.setMap(null);
            directionsRendererRef.current = null;
          }
          if (routePolylineRef.current) {
            routePolylineRef.current.setMap(null);
            routePolylineRef.current = null;
          }

          // Draw high-resolution road-following polyline
          const polyline = new window.google.maps.Polyline({
            path: routesResult.polylinePoints,
            geodesic: true,
            strokeColor: '#059669', // Emerald 600
            strokeOpacity: 0.92,
            strokeWeight: 5,
            map: googleMapInstanceRef.current,
          });
          routePolylineRef.current = polyline;

          // Fit bounds to the road route
          const bounds = new window.google.maps.LatLngBounds();
          routesResult.polylinePoints.forEach((pt) => bounds.extend(pt));
          googleMapInstanceRef.current.fitBounds(bounds, {
            top: 60,
            right: 60,
            bottom: 60,
            left: 60,
          });
        } else {
          // Fallback: try legacy directions service if configured, or straight line
          const directionsService = new window.google.maps.DirectionsService();
          let sampledWaypoints = intermediatePoints.slice(0, 23).map((pt) => ({
            location: new window.google.maps.LatLng(pt.lat, pt.lng),
            stopover: false,
          }));

          directionsService.route(
            {
              origin: new window.google.maps.LatLng(origin.lat, origin.lng),
              destination: new window.google.maps.LatLng(destination.lat, destination.lng),
              waypoints: sampledWaypoints,
              travelMode: window.google.maps.TravelMode.DRIVING,
              optimizeWaypoints: false,
            },
            (result: any, status: any) => {
              if (isCancelled || !googleMapInstanceRef.current) return;
              if (status === 'OK' && result) {
                if (!directionsRendererRef.current) {
                  directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                    map: googleMapInstanceRef.current,
                    suppressMarkers: true,
                    preserveViewport: false,
                    polylineOptions: {
                      strokeColor: '#059669',
                      strokeOpacity: 0.9,
                      strokeWeight: 4,
                    },
                  });
                }
                directionsRendererRef.current.setDirections(result);
              } else {
                if (googleMapInstanceRef.current && !routePolylineRef.current) {
                  const polyline = new window.google.maps.Polyline({
                    path: coordinates,
                    geodesic: true,
                    strokeColor: '#059669',
                    strokeOpacity: 0.85,
                    strokeWeight: 4,
                    map: googleMapInstanceRef.current,
                  });
                  routePolylineRef.current = polyline;
                }
              }
            }
          );
        }
      });

      // Fit map bounds to show complete historical route AND live position
      const bounds = new window.google.maps.LatLngBounds();
      coordinates.forEach((c) => bounds.extend(c));
      if (activeEmployee && activeEmployee.latitude !== 0 && activeEmployee.has_live_ping) {
        bounds.extend(new window.google.maps.LatLng(activeEmployee.latitude, activeEmployee.longitude));
      }
      googleMapInstanceRef.current.fitBounds(bounds, {
        top: 60,
        right: 60,
        bottom: 60,
        left: 60,
      });
    } else {
      setComputedRoadDistanceMeters(0);
      if (coordinates.length === 1 && googleMapInstanceRef.current) {
        googleMapInstanceRef.current.panTo(coordinates[0]);
      }
    }

    // Start Waypoint Marker (First recorded ping of the day)
    const startPt = trails[0];
    const startMarker = new window.google.maps.Marker({
      position: { lat: startPt.latitude, lng: startPt.longitude },
      map: googleMapInstanceRef.current,
      title: `Route Start: ${new Date(startPt.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: '#2563EB', // Blue
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      },
      label: {
        text: 'S',
        color: '#FFFFFF',
        fontSize: '9px',
        fontWeight: 'bold',
      },
      zIndex: 200,
    });
    trailMarkersRef.current.push(startMarker);

    // Latest / Finish Waypoint Marker if > 1 waypoint
    if (trails.length > 1) {
      const endPt = trails[trails.length - 1];
      const endMarker = new window.google.maps.Marker({
        position: { lat: endPt.latitude, lng: endPt.longitude },
        map: googleMapInstanceRef.current,
        title: `Latest Waypoint: ${new Date(endPt.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#059669', // Emerald
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
        label: {
          text: 'L',
          color: '#FFFFFF',
          fontSize: '9px',
          fontWeight: 'bold',
        },
        zIndex: 201,
      });
      trailMarkersRef.current.push(endMarker);
    }

    return () => {
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      trailMarkersRef.current.forEach((m) => {
        if (typeof m.setMap === 'function') m.setMap(null);
      });
      trailMarkersRef.current = [];
    };
  }, [trails, activeEmployee?.latitude, activeEmployee?.longitude, activeEmployee?.has_live_ping, isJsMapReady]);

  // Render profile avatar markers for all employees on the Google Map
  useEffect(() => {
    if (!googleMapInstanceRef.current || !window.google?.maps) return;

    // Clear previous markers / overlays
    markersRef.current.forEach((m) => {
      if (typeof m.setMap === 'function') m.setMap(null);
    });
    markersRef.current = [];

    // Create marker overlay for each employee with coordinates (live GPS or last known position)
    liveEmployees.forEach((emp) => {
      // Rule 1: Employees on leave NEVER have radar markers on the company map (privacy & labor compliance)
      if (emp.is_on_leave || emp.status === 'on_leave') return;

      // Rule 2: Must have valid coordinates
      if (!emp.latitude || !emp.longitude || emp.latitude === 0) return;

      // Rule 3: Only employees actively transmitting live GPS today appear on the live radar!
      // In Fleet Overview mode, offline staff are NEVER plotted to avoid showing stale locations.
      if (!emp.has_live_ping) {
        if (isFleetOverview || emp.employee_id !== activeEmployee?.employee_id) return;
      }

      // Rule 4: Filter pins according to selected tab (unless in Fleet Overview mode, which shows all active live fleet):
      if (!isFleetOverview) {
        if (statusFilter === 'live' && !emp.has_live_ping) return;
        if (statusFilter === 'moving' && (!emp.has_live_ping || (!emp.is_moving && emp.status !== 'moving'))) return;
        if (statusFilter === 'on_leave') return;
        if (statusFilter === 'offline' && emp.has_live_ping && emp.employee_id !== activeEmployee?.employee_id) return;
      }

      const isSelected = emp.employee_id === activeEmployee?.employee_id;

      try {
        const overlay = createEmployeeOverlay(
          googleMapInstanceRef.current,
          emp,
          isSelected,
          isFleetOverview,
          () => {
            setSelectedEmployeeId(emp.employee_id);
            setIsFleetOverview(false);
            setAutoFollow(true);
            googleMapInstanceRef.current.panTo({ lat: emp.latitude, lng: emp.longitude });
            googleMapInstanceRef.current.setZoom(17);
          }
        );

        if (overlay) {
          markersRef.current.push(overlay);
        }
      } catch (err) {
        console.warn('[LiveShiftTrackingView] Overlay creation error:', err);
      }
    });
  }, [liveEmployees, activeEmployee?.employee_id, isJsMapReady, statusFilter, isFleetOverview]);

  // Filtered list
  const filteredEmployees = useMemo(() => {
    return liveEmployees.filter((emp) => {
      const matchesSearch =
        !searchQuery ||
        (emp.employee_name && emp.employee_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (emp.employee_code && emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (emp.department_name && emp.department_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'live' && emp.has_live_ping && !emp.is_on_leave) ||
        (statusFilter === 'moving' && emp.has_live_ping && (emp.is_moving || emp.status === 'moving')) ||
        (statusFilter === 'on_leave' && (emp.is_on_leave || emp.status === 'on_leave')) ||
        (statusFilter === 'offline' && !emp.has_live_ping && !emp.is_on_leave);

      return matchesSearch && matchesStatus;
    });
  }, [liveEmployees, searchQuery, statusFilter]);

  // Summary counts
  const counts = useMemo(() => {
    const total = liveEmployees.length;
    const onLeave = liveEmployees.filter((e) => e.is_on_leave || e.status === 'on_leave').length;
    const liveTracking = liveEmployees.filter((e) => e.has_live_ping && !e.is_on_leave && e.status !== 'clocked_out').length;
    const moving = liveEmployees.filter((e) => e.has_live_ping && (e.is_moving || e.status === 'moving')).length;
    const stationary = liveEmployees.filter((e) => e.has_live_ping && !e.is_moving && e.status !== 'clocked_out').length;
    const clockedOut = liveEmployees.filter((e) => e.status === 'clocked_out').length;
    const offline = liveEmployees.filter((e) => !e.has_live_ping && !e.is_on_leave && e.status !== 'clocked_out').length;
    return { total, liveTracking, moving, stationary, clockedOut, onLeave, offline };
  }, [liveEmployees]);

  const handleRefresh = async () => {
    await loadLiveLocations();
    if (selectedEmployeeId) {
      await loadEmployeeTrails(selectedEmployeeId);
    }
    showToast('Telemetry refreshed from live GPS streams!', 'success');
  };

  const openInGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Navigation className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-gray-900 tracking-tight">
                  Employee Shift Route & Live Fleet Radar
                </h1>
                <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live GPS Stream Active
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                  Google Maps API Active
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time Google Maps telemetry with battery-efficient 50m displacement triggers and shift-bound privacy controls.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />}
          >
            Refresh Radar
          </Button>
        </div>
      </div>

      {/* 2. Top Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-2xs">
          <span className="text-gray-500 font-semibold">Active GPS Tracking</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{counts.liveTracking}</div>
          <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> Live Hardware Pings
          </span>
        </div>

        <div className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-2xs">
          <span className="text-gray-500 font-semibold">In Transit / Moving</span>
          <div className="text-2xl font-black text-blue-700 mt-1">{counts.moving}</div>
          <span className="text-[11px] text-blue-600 font-bold flex items-center gap-1 mt-1">
            <Car className="w-3.5 h-3.5" /> Speed &gt; 1.0 km/h
          </span>
        </div>

        <div className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-2xs">
          <span className="text-gray-500 font-semibold">Stationary (Live Signal)</span>
          <div className="text-2xl font-black text-amber-700 mt-1">{counts.stationary}</div>
          <span className="text-[11px] text-amber-600 font-bold flex items-center gap-1 mt-1">
            <Clock className="w-3.5 h-3.5" /> At Office / Site
          </span>
        </div>

        <div className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 font-semibold">On Leave / Awaiting</span>
            {counts.onLeave > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                {counts.onLeave} on Leave
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-gray-700 mt-1">
            {counts.offline}
          </div>
          <span className="text-[11px] text-gray-500 font-bold flex items-center gap-1 mt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-gray-400" /> Total Staff: {counts.total} ({counts.liveTracking} Live)
          </span>
        </div>
      </div>

      {/* 3. Main Split View: Employees Left | Google Maps Radar Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Field Staff Directory (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search staff, ID, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex gap-1 overflow-x-auto pb-1 text-[11px]">
              {(['ALL', 'live', 'moving', 'on_leave', 'offline'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-semibold whitespace-nowrap cursor-pointer transition-all',
                    statusFilter === status
                      ? 'bg-gray-900 text-white shadow-2xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {status === 'ALL'
                    ? `All (${counts.total})`
                    : status === 'live'
                    ? `Live GPS (${counts.liveTracking})`
                    : status === 'moving'
                    ? `Moving (${counts.moving})`
                    : status === 'on_leave'
                    ? `On Leave (${counts.onLeave})`
                    : `Awaiting GPS (${counts.offline})`}
                </button>
              ))}
            </div>

            {/* Staff List */}
            <div className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto pr-1">
              {filteredEmployees.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  No field employees match the filter criteria.
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = emp.employee_id === activeEmployee?.employee_id;
                  const hasLive = Boolean(emp.has_live_ping);
                  const isOnLeave = Boolean(emp.is_on_leave || emp.status === 'on_leave');
                  const isClockedOut = emp.status === 'clocked_out';
                  const isMoving = hasLive && (emp.is_moving || emp.status === 'moving');
                  const distKm = (emp.cumulative_distance_meters / 1000).toFixed(1);

                  return (
                    <div
                      key={emp.employee_id}
                      onClick={() => {
                        setSelectedEmployeeId(emp.employee_id);
                        setAutoFollow(true);
                      }}
                      className={cn(
                        'p-3 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-2.5 border my-1',
                        isSelected
                          ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                          : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="relative shrink-0">
                          <img
                            src={getEmployeeAvatar(emp, emp.avatar_url, emp.gender)}
                            alt={emp.employee_name || 'Staff'}
                            className={cn(
                              'w-9 h-9 rounded-xl object-cover border bg-gray-50',
                              isSelected
                                ? 'border-emerald-500 ring-2 ring-emerald-300'
                                : hasLive
                                ? 'border-emerald-400'
                                : isOnLeave
                                ? 'border-purple-200 opacity-75'
                                : 'border-gray-200 opacity-80'
                            )}
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.onerror = null;
                              target.src = getEmployeeAvatar(emp, emp.avatar_url, emp.gender);
                            }}
                          />
                          <span
                            className={cn(
                              'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white',
                              isMoving
                                ? 'bg-blue-500 animate-pulse'
                                : hasLive
                                ? 'bg-emerald-500'
                                : isOnLeave
                                ? 'bg-purple-500'
                                : isClockedOut
                                ? 'bg-amber-400'
                                : 'bg-gray-300'
                            )}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-gray-900">
                              {emp.employee_name || 'Staff Member'}
                            </span>
                            <span className="text-[10px] font-mono text-gray-500 font-medium">
                              #{emp.employee_code || emp.employee_id}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 truncate max-w-[160px]">
                            {emp.department_name || 'Field Operations'}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500 font-medium">
                            {isOnLeave ? (
                              <span className="text-purple-700 font-medium flex items-center gap-1">
                                <span>🌴</span>
                                {emp.leave_reason || 'Approved Leave Today'}
                              </span>
                            ) : isClockedOut ? (
                              <span className="text-gray-500 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3 text-gray-400" />
                                Shift ended / Clocked out
                              </span>
                            ) : hasLive ? (
                              <>
                                <span className="flex items-center gap-1">
                                  <Footprints className="w-3 h-3 text-emerald-600" />
                                  {distKm} km
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  {emp.is_charging ? (
                                    <BatteryCharging className="w-3 h-3 text-emerald-600 animate-pulse" />
                                  ) : (
                                    <Battery className="w-3 h-3 text-gray-400" />
                                  )}
                                  {emp.battery_level != null ? `${emp.battery_level}%` : '--'}
                                </span>
                              </>
                            ) : emp.is_stale && emp.latitude !== 0 ? (
                              <span className="text-amber-800 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Check-in point ({emp.minutes_since_ping ? `${Math.floor(emp.minutes_since_ping / 60)}h ago` : 'Morning'})
                              </span>
                            ) : (
                              <span className="text-gray-400 italic flex items-center gap-1">
                                <Radio className="w-3 h-3 text-gray-300" />
                                Awaiting mobile check-in
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {isOnLeave ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            🌴 On Leave
                          </span>
                        ) : isClockedOut ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            Clocked Out
                          </span>
                        ) : isMoving ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                            {emp.speed ? `${Math.round(emp.speed)} km/h` : 'Moving'}
                          </span>
                        ) : hasLive ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            Live GPS
                          </span>
                        ) : emp.is_stale && emp.latitude !== 0 ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Check-In Point
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                            Awaiting Punch
                          </span>
                        )}
                        <div className="text-[9px] text-gray-400 mt-1">
                          {isOnLeave
                            ? 'On Leave'
                            : emp.last_pinged_at
                            ? new Date(emp.last_pinged_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Offline'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Google Maps Interactive Radar & Route (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {activeEmployee ? (
            <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-4">
              {/* Active Employee Details Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={getEmployeeAvatar(activeEmployee, activeEmployee.avatar_url, activeEmployee.gender)}
                      alt={activeEmployee.employee_name || 'Staff'}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-600 shadow-sm bg-gray-50"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = getEmployeeAvatar(activeEmployee, activeEmployee.avatar_url, activeEmployee.gender);
                      }}
                    />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm text-gray-900">
                        {activeEmployee.employee_name}
                      </h3>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {activeEmployee.employee_code}
                      </Badge>
                      <span className="text-[11px] text-gray-500 font-medium">
                        {activeEmployee.department_name}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 mt-1 text-xs">
                      <div className="flex items-center gap-3 text-gray-500">
                        {activeEmployee.latitude !== 0 ? (
                          <>
                            <span className="font-mono text-emerald-700 font-bold">
                              Lat: {activeEmployee.latitude.toFixed(5)}, Lng: {activeEmployee.longitude.toFixed(5)}
                            </span>
                            <span>•</span>
                            <span>Accuracy: &plusmn;{Math.round(activeEmployee.accuracy)}m</span>
                            {activeEmployee.battery_level != null && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  {activeEmployee.is_charging ? (
                                    <BatteryCharging className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                                  ) : (
                                    <Battery className="w-3.5 h-3.5 text-gray-500" />
                                  )}
                                  Battery: {activeEmployee.battery_level}%{activeEmployee.is_charging ? ' (Charging)' : ''}
                                </span>
                              </>
                            )}
                          </>
                        ) : (
                          <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            No Mobile GPS Signal Reported Yet
                          </span>
                        )}
                      </div>

                      {/* Google Maps Reverse-Geocoded Landmark & Street Location */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-[11px] text-gray-800 bg-emerald-50/80 border border-emerald-200 px-2.5 py-1.5 rounded-lg mt-0.5 max-w-xl">
                        <div className="flex items-center gap-1 shrink-0">
                          <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span className="font-bold text-emerald-950 shrink-0">Google Maps Location:</span>
                        </div>
                        {isGeocoding ? (
                          <span className="text-gray-400 italic">Resolving address from Google Maps API...</span>
                        ) : locationDetails?.title ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-emerald-900 bg-emerald-200/80 px-1.5 py-0.5 rounded text-[10px] border border-emerald-300">
                              {locationDetails.title}
                            </span>
                            <span className="text-gray-700 truncate font-medium">
                              {locationDetails.address}
                            </span>
                          </div>
                        ) : (
                          <span className="truncate text-gray-700 font-medium">
                            {resolvedAddress || 'No location signal transmitted'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openInGoogleMaps(activeEmployee.latitude, activeEmployee.longitude)}
                    leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                  >
                    Google Maps
                  </Button>
                </div>
              </div>

              {/* Informational Alert if Selected Employee is on Leave, Clocked Out, or has no active live ping today */}
              {(activeEmployee.is_on_leave || activeEmployee.status === 'on_leave') ? (
                <div className="p-3 bg-purple-50/90 border border-purple-200 rounded-xl flex items-center justify-between text-xs text-purple-900">
                  <div className="flex items-center gap-2">
                    <span className="text-base shrink-0">🌴</span>
                    <span>
                      <strong>On Leave Today: </strong>
                      {activeEmployee.employee_name} has an active leave record ({activeEmployee.leave_reason || 'Approved Leave'}). Real-time GPS tracking is suspended for leave privacy.
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300 font-bold shrink-0">
                    Shift Inactive
                  </Badge>
                </div>
              ) : activeEmployee.status === 'clocked_out' ? (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs text-gray-700">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                    <span>
                      <strong>Shift Completed: </strong>
                      {activeEmployee.employee_name} has clocked out for today. Real-time GPS telemetry terminates automatically upon checkout.
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-gray-200 text-gray-700 border-gray-300 font-bold shrink-0">
                    Clocked Out
                  </Badge>
                </div>
              ) : !activeEmployee.has_live_ping ? (
                <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      {activeEmployee.is_stale && activeEmployee.latitude !== 0 ? (
                        <>
                          <strong>Morning Check-In Point ({activeEmployee.last_pinged_at ? new Date(activeEmployee.last_pinged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Earlier'}{activeEmployee.minutes_since_ping ? ` • ${Math.floor(activeEmployee.minutes_since_ping / 60)}h ago` : ''}): </strong>
                          Phone has not transmitted background GPS since check-in. Showing punch location. Have the employee open the JOY PeopleHR app on their phone to sync their current office location.
                        </>
                      ) : activeEmployee.latitude !== 0 ? (
                        <>
                          <strong>Last Known Position: </strong>
                          Recorded earlier. Awaiting live mobile GPS transmission for today.
                        </>
                      ) : (
                        <>
                          <strong>Awaiting Mobile Clock-In: </strong>
                          No device GPS coordinates received yet today. Real-time GPS stream activates when the employee clocks in.
                        </>
                      )}
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 font-bold shrink-0">
                    {activeEmployee.is_stale ? 'Check-In Location' : 'Awaiting GPS'}
                  </Badge>
                </div>
              ) : null}

              {/* Google Map Container: Render Map if employee has valid coordinates */}
              {activeEmployee.latitude !== 0 ? (
                <div className="relative h-96 rounded-2xl overflow-hidden border border-gray-200 bg-slate-900 shadow-inner group">
                  {/* Interactive Google Maps JavaScript API Canvas */}
                  <div
                    ref={mapContainerRef}
                    className={cn(
                      'w-full h-full absolute inset-0 transition-opacity duration-300',
                      isJsMapReady ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
                    )}
                  />

                  {/* Reliable Fallback (Never rejected by API restrictions) */}
                  {!isJsMapReady && (
                    <iframe
                      title="Google Maps Employee Live Tracker"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://maps.google.com/maps?q=${activeEmployee.latitude},${activeEmployee.longitude}&hl=en&z=${mapZoom}&t=${mapType}&output=embed`}
                      className="w-full h-full"
                    />
                  )}

                  {/* Radar Target Pulse Pin Overlay for static iframe fallback only (Google Maps JS uses OverlayView) */}
                  {!isJsMapReady && autoFollow && activeEmployee && activeEmployee.latitude !== 0 && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="relative flex flex-col items-center justify-center">
                        {/* Floating Info Tooltip Badge */}
                        <div className="mb-2 px-3 py-1.5 backdrop-blur-md rounded-2xl shadow-2xl border text-white text-xs font-bold flex items-center gap-2 bg-gray-950/90 border-white/20 pointer-events-auto">
                          <span
                            className={cn(
                              'w-2.5 h-2.5 rounded-full',
                              activeEmployee.is_moving ? 'bg-blue-400 animate-ping' : 'bg-emerald-400 animate-ping'
                            )}
                          />
                          <span className="font-extrabold">{activeEmployee.employee_name}</span>
                          <span className="text-[11px] text-emerald-300 font-mono font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                            {activeEmployee.employee_code}
                          </span>
                          {activeEmployee.is_moving ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-500/40 animate-pulse">
                              <Car className="w-3 h-3 text-blue-400" />
                              {activeEmployee.speed > 0 ? `${Math.round(activeEmployee.speed)} km/h` : 'Travelling'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-300 font-normal">
                              • Live GPS
                            </span>
                          )}
                          {activeEmployee.battery_level != null && (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-gray-300 border-l border-white/20 pl-2">
                              {activeEmployee.is_charging ? (
                                <BatteryCharging className="w-3 h-3 text-emerald-400 animate-pulse" />
                              ) : (
                                <Battery className="w-3 h-3 text-emerald-400" />
                              )}
                              {activeEmployee.battery_level}%
                            </span>
                          )}
                        </div>

                        {/* Outer Radar Waves */}
                        <div className="relative flex items-center justify-center">
                          <span
                            className={cn(
                              'absolute w-20 h-20 rounded-full animate-ping',
                              activeEmployee.is_moving ? 'bg-blue-500/30' : 'bg-emerald-500/25'
                            )}
                          />
                          <span
                            className={cn(
                              'absolute w-14 h-14 rounded-full animate-pulse',
                              activeEmployee.is_moving ? 'bg-blue-400/40' : 'bg-emerald-400/40'
                            )}
                          />
                          <div className="relative w-11 h-11 rounded-full border-2 border-white shadow-xl overflow-hidden bg-white">
                            <img
                              src={getEmployeeAvatar(activeEmployee, activeEmployee.avatar_url, activeEmployee.gender)}
                              alt={activeEmployee.employee_name || 'Staff'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Map Controls Floating Overlay */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs p-1.5 rounded-xl shadow-lg border border-gray-200 text-xs flex-wrap">
                    {/* View All Staff / Fleet Radar Toggle */}
                    <button
                      onClick={() => {
                        setIsFleetOverview((prev) => {
                          const next = !prev;
                          if (next) {
                            setAutoFollow(false);
                            fitAllEmployeesBounds();
                          } else if (activeEmployee && activeEmployee.latitude !== 0) {
                            googleMapInstanceRef.current?.panTo({
                              lat: activeEmployee.latitude,
                              lng: activeEmployee.longitude,
                            });
                            googleMapInstanceRef.current?.setZoom(17);
                          }
                          return next;
                        });
                      }}
                      className={cn(
                        'px-2.5 py-1 rounded-md font-bold cursor-pointer transition-all flex items-center gap-1.5',
                        isFleetOverview
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm ring-1 ring-emerald-400'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                      title="View all employees simultaneously on one company map (Snap Map style)"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>View All Live ({liveEmployees.filter((e) => e.has_live_ping && !e.is_on_leave && e.latitude !== 0).length})</span>
                    </button>

                    <div className="w-px h-4 bg-gray-200 mx-0.5" />

                    <button
                      onClick={() => {
                        setAutoFollow((prev) => {
                          const next = !prev;
                          if (next && googleMapInstanceRef.current && activeEmployee && activeEmployee.latitude !== 0) {
                            setIsFleetOverview(false);
                            googleMapInstanceRef.current.panTo({
                              lat: activeEmployee.latitude,
                              lng: activeEmployee.longitude,
                            });
                          }
                          return next;
                        });
                      }}
                      className={cn(
                        'px-2 py-1 rounded-md font-bold cursor-pointer transition-all flex items-center gap-1',
                        autoFollow ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-700 hover:bg-gray-100'
                      )}
                      title="Automatically center map on moving employee"
                    >
                      <Compass className={cn('w-3.5 h-3.5', autoFollow && 'animate-spin')} />
                      <span>Auto-Follow</span>
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-0.5" />
                    <button
                      onClick={() => setShowGeofence((p) => !p)}
                      className={cn(
                        'px-2 py-1 rounded-md font-bold cursor-pointer transition-all flex items-center gap-1',
                        showGeofence ? 'bg-emerald-700 text-white shadow-xs' : 'text-gray-700 hover:bg-gray-100'
                      )}
                      title="Toggle Authorized Office Geofence Circle (100m)"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Office Geofence</span>
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-0.5" />
                    <button
                      onClick={() => setMapType('m')}
                      className={cn(
                        'px-2 py-1 rounded-md font-bold cursor-pointer transition-all',
                        mapType === 'm' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      Map
                    </button>
                    <button
                      onClick={() => setMapType('k')}
                      className={cn(
                        'px-2 py-1 rounded-md font-bold cursor-pointer transition-all',
                        mapType === 'k' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      Satellite
                    </button>
                    <button
                      onClick={() => setMapType('h')}
                      className={cn(
                        'px-2 py-1 rounded-md font-bold cursor-pointer transition-all',
                        mapType === 'h' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      Hybrid
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-1" />
                    <button
                      onClick={() => setMapZoom((z) => Math.min(20, z + 1))}
                      className="p-1 rounded hover:bg-gray-100 text-gray-700 cursor-pointer"
                      title="Zoom in"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setMapZoom((z) => Math.max(12, z - 1))}
                      className="p-1 rounded hover:bg-gray-100 text-gray-700 cursor-pointer"
                      title="Zoom out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bottom Left Floating Stats Card */}
                  <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs p-2.5 rounded-xl shadow-lg border border-gray-200 text-xs flex items-center gap-4">
                    <div>
                      <span className="text-[10px] text-gray-500 font-semibold block uppercase">Total Distance</span>
                      <span className="text-sm font-black text-gray-900">
                        {trailTotalDistance > 0
                          ? `${(trailTotalDistance / 1000).toFixed(2)} km`
                          : activeEmployee.has_live_ping
                          ? `${(activeEmployee.cumulative_distance_meters / 1000).toFixed(2)} km`
                          : '--'}
                      </span>
                    </div>
                    <div className="w-px h-6 bg-gray-200" />
                    <div>
                      <span className="text-[10px] text-gray-500 font-semibold block uppercase">Current Speed</span>
                      <span className="text-sm font-black text-blue-700">
                        {activeEmployee.has_live_ping
                          ? activeEmployee.speed > 0
                            ? `${Math.round(activeEmployee.speed)} km/h`
                            : '0 km/h (Stationary)'
                          : 'Offline'}
                      </span>
                    </div>
                    <div className="w-px h-6 bg-gray-200" />
                    <div>
                      <span className="text-[10px] text-gray-500 font-semibold block uppercase">Estimated Travel Pay</span>
                      <span className="text-sm font-black text-emerald-700">
                        {trailTotalDistance > 0
                          ? `₹${((trailTotalDistance / 1000) * 6).toFixed(0)}`
                          : activeEmployee.has_live_ping
                          ? `₹${((activeEmployee.cumulative_distance_meters / 1000) * 6).toFixed(0)}`
                          : '₹0'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-96 rounded-2xl border-2 border-dashed border-gray-200 bg-gradient-to-b from-gray-50/70 to-white flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
                    <Radio className="w-8 h-8 animate-pulse" />
                  </div>
                  <div className="max-w-md space-y-1.5">
                    <h4 className="text-base font-bold text-gray-900">
                      No Live GPS Signal for {activeEmployee.employee_name}
                    </h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      This device has not transmitted satellite coordinates today. As soon as the employee opens the mobile app or moves during their shift hours with device GPS turned on, their position will stream onto this map live.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-[11px] font-semibold text-gray-600 border border-gray-200">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    Mobile App Status: Standby / Awaiting GPS Fix
                  </div>
                </div>
              )}

              {/* All Employees Quick Fleet Radar Bar */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-gray-800">
                    <Users className="w-4 h-4 text-emerald-700" />
                    <span>All Organization Field Staff ({liveEmployees.length})</span>
                  </div>
                  <span className="text-[11px] text-gray-500">
                    Click any employee to focus map & inspect their location
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                  {liveEmployees.map((emp) => {
                    const isSelected = emp.employee_id === activeEmployee?.employee_id;
                    const hasLivePing = Boolean(emp.has_live_ping);
                    return (
                      <button
                        key={emp.employee_id}
                        onClick={() => setSelectedEmployeeId(emp.employee_id)}
                        className={cn(
                          'flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-left shrink-0 transition-all cursor-pointer',
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                            : 'bg-white hover:bg-gray-100 text-gray-800 border-gray-200'
                        )}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={getEmployeeAvatar(emp, emp.avatar_url, emp.gender)}
                            alt={emp.employee_name || 'Staff'}
                            className="w-7 h-7 rounded-full object-cover border border-white bg-gray-50"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.onerror = null;
                              target.src = getEmployeeAvatar(emp, emp.avatar_url, emp.gender);
                            }}
                          />
                          <span
                            className={cn(
                              'absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white',
                              hasLivePing ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'
                            )}
                          />
                        </div>
                        <div className="max-w-[120px]">
                          <div className={cn('text-[11px] font-bold leading-tight truncate', isSelected ? 'text-white' : 'text-gray-900')}>
                            {emp.employee_name}
                          </div>
                          <div className={cn('text-[9px] font-mono', isSelected ? 'text-emerald-100' : 'text-gray-500')}>
                            {emp.employee_code}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Google Maps Travel Timeline & Calendar Route Inspector */}
              <div className="space-y-3 pt-3 border-t border-gray-100">
                {/* Header with Title and Calendar Date Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-700" />
                    <h4 className="font-extrabold text-xs text-gray-900 uppercase tracking-wider">
                      Google Maps Travel Timeline
                    </h4>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                      {trails.length} Waypoints
                    </span>
                  </div>

                  {/* Calendar Date Picker Controls */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedDate(todayStr)}
                      className={cn(
                        'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer',
                        selectedDate === todayStr
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                          : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200'
                      )}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDate(yesterdayStr)}
                      className={cn(
                        'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer',
                        selectedDate === yesterdayStr
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                          : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200'
                      )}
                    >
                      Yesterday
                    </button>
                    <div className="relative flex items-center">
                      <input
                        type="date"
                        value={selectedDate}
                        max={todayStr}
                        onChange={(e) => {
                          if (e.target.value) setSelectedDate(e.target.value);
                        }}
                        className="px-2 py-0.5 text-xs font-medium border border-gray-300 rounded-lg bg-white text-gray-800 shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                        title="Pick any date from calendar to inspect historical travel"
                      />
                    </div>
                  </div>
                </div>

                {/* Day Summary Travel Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 font-semibold block uppercase">Date</span>
                    <span className="font-extrabold text-gray-900">
                      {selectedDate === todayStr ? 'Today' : selectedDate === yesterdayStr ? 'Yesterday' : selectedDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-semibold block uppercase">Total Distance</span>
                    <span className="font-extrabold text-emerald-700">
                      {(trailTotalDistance / 1000).toFixed(2)} km
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-semibold block uppercase">Timeline Window</span>
                    <span className="font-extrabold text-gray-800 truncate block">
                      {trails.length > 0
                        ? `${new Date(trails[0].recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(trails[trails.length - 1].recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : '--'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-semibold block uppercase">Travel Allowance</span>
                    <span className="font-extrabold text-blue-700">
                      ₹{((trailTotalDistance / 1000) * 6).toFixed(0)}
                    </span>
                  </div>
                </div>

                {/* Timeline Mode Selector & Waypoint Timeline List (Step C) */}
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  {/* Mode Tabs */}
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50/80 border-b border-gray-200">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTimelineViewMode('smart')}
                        className={cn(
                          'px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer',
                          timelineViewMode === 'smart'
                            ? 'bg-white text-emerald-800 shadow-2xs border border-gray-200/80'
                            : 'text-gray-500 hover:text-gray-800'
                        )}
                      >
                        <Footprints className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Smart Timeline (Stays & Trips)</span>
                        <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                          {timelineSegments.length}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimelineViewMode('raw')}
                        className={cn(
                          'px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer',
                          timelineViewMode === 'raw'
                            ? 'bg-white text-emerald-800 shadow-2xs border border-gray-200/80'
                            : 'text-gray-500 hover:text-gray-800'
                        )}
                      >
                        <Navigation className="w-3.5 h-3.5 text-blue-600" />
                        <span>Raw GPS Log</span>
                        <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-gray-200 text-gray-700">
                          {trails.length}
                        </span>
                      </button>
                    </div>
                    <span className="text-[10px] text-gray-400 hidden sm:inline">
                      Click any item to inspect on Google Map
                    </span>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 text-xs">
                    {timelineViewMode === 'smart' ? (
                      timelineSegments.length === 0 ? (
                        <div className="py-8 px-4 text-center space-y-2">
                          <div className="w-10 h-10 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                            <Calendar className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="text-xs font-bold text-gray-800">
                            No travel segments recorded on {selectedDate}
                          </div>
                          <p className="text-[11px] text-gray-500 max-w-sm mx-auto leading-relaxed">
                            Telemetry automatically groups waypoints into verified workplace Stays and road-snapped commute Trips during active shifts.
                          </p>
                        </div>
                      ) : (
                        timelineSegments.map((seg) => {
                          const isStay = seg.type === 'stay';
                          const isSelected = selectedSegmentId === seg.id;

                          return (
                            <div
                              key={seg.id}
                              onClick={() => {
                                setSelectedSegmentId(seg.id);
                                if (googleMapInstanceRef.current) {
                                  googleMapInstanceRef.current.panTo(seg.startLatLng);
                                  googleMapInstanceRef.current.setZoom(isStay ? 18 : 16);
                                }
                              }}
                              className={cn(
                                'p-3 flex items-start justify-between gap-3 transition-colors cursor-pointer group',
                                isSelected
                                  ? 'bg-emerald-50/80 ring-1 ring-emerald-500/30'
                                  : isStay
                                  ? 'hover:bg-emerald-50/30'
                                  : 'hover:bg-blue-50/30 bg-slate-50/40'
                              )}
                              title="Click to pan and focus Google Map on this segment"
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <div
                                  className={cn(
                                    'w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 shadow-2xs transition-transform group-hover:scale-105',
                                    isStay
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-blue-600 text-white'
                                  )}
                                >
                                  {isStay ? (
                                    <MapPin className="w-4 h-4" />
                                  ) : (
                                    <Car className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-gray-900 leading-tight">
                                      {seg.title}
                                    </span>
                                    <span
                                      className={cn(
                                        'px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded-md tracking-wider',
                                        isStay
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-blue-100 text-blue-800'
                                      )}
                                    >
                                      {isStay ? 'Stay / Dwell' : 'Trip / Transit'}
                                    </span>
                                    {seg.avgSpeedKmh && seg.avgSpeedKmh > 0 ? (
                                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                        {Math.round(seg.avgSpeedKmh)} km/h
                                      </span>
                                    ) : null}
                                  </div>

                                  <div className="text-[11px] text-gray-600 font-medium">
                                    {seg.subtitle}
                                  </div>

                                  {seg.resolvedAddress && (
                                    <div className="text-[10px] text-gray-500 truncate max-w-md flex items-center gap-1">
                                      <span className="font-semibold text-gray-700">Address:</span>
                                      <span className="truncate">{seg.resolvedAddress}</span>
                                    </div>
                                  )}

                                  <div className="text-[10px] text-gray-400 font-mono">
                                    {seg.startLatLng.lat.toFixed(5)}, {seg.startLatLng.lng.toFixed(5)}
                                    {seg.waypointCount > 1 && (
                                      <span className="text-gray-500 font-sans ml-1">
                                        • {seg.waypointCount} GPS heartbeats
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0 space-y-0.5">
                                <div className="text-[11px] font-bold text-gray-900 font-mono">
                                  {seg.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {' – '}
                                  {seg.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="text-[10px] font-semibold text-emerald-700">
                                  {formatDurationDiff(seg.startTime, seg.endTime)}
                                </div>
                                {seg.distanceMeters > 0 && (
                                  <div className="text-[10px] font-bold text-blue-700">
                                    {(seg.distanceMeters / 1000).toFixed(2)} km
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )
                    ) : trails.length === 0 ? (
                      <div className="py-8 px-4 text-center space-y-2">
                        <div className="w-10 h-10 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                          <Calendar className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="text-xs font-bold text-gray-800">
                          No travel waypoints recorded on {selectedDate}
                        </div>
                        <p className="text-[11px] text-gray-500 max-w-sm mx-auto leading-relaxed">
                          Travel waypoints are logged strictly when {activeEmployee.employee_name}'s mobile device travels &ge; 50 meters during an active shift. Zero synthetic or mock data is injected.
                        </p>
                      </div>
                    ) : (
                      trails.map((point, index) => {
                        const isLatest = index === trails.length - 1;
                        const isStart = index === 0;

                        return (
                          <div
                            key={point.id}
                            onClick={() => {
                              if (googleMapInstanceRef.current) {
                                googleMapInstanceRef.current.panTo({
                                  lat: point.latitude,
                                  lng: point.longitude,
                                });
                                googleMapInstanceRef.current.setZoom(18);
                              }
                            }}
                            className={cn(
                              'p-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer group',
                              isLatest ? 'bg-emerald-50/60 font-semibold' : 'hover:bg-gray-50'
                            )}
                            title="Click to pan Google Map to this waypoint"
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={cn(
                                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-transform group-hover:scale-110 shadow-2xs',
                                  isStart
                                    ? 'bg-blue-600 text-white'
                                    : isLatest
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                )}
                              >
                                {isStart ? 'S' : isLatest ? 'L' : index + 1}
                              </div>
                              <div>
                                <div className="text-gray-900 font-medium flex items-center gap-1.5">
                                  <span>
                                    {isStart
                                      ? 'Shift Origin / Start'
                                      : isLatest
                                      ? 'Latest Waypoint'
                                      : `Waypoint #${index + 1}`}
                                  </span>
                                  {point.speed > 0 && (
                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1 rounded">
                                      {Math.round(point.speed)} km/h
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                                  <span className="font-mono text-gray-400">{point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}</span>
                                  {isStart && <span className="text-emerald-700 font-bold">• Office / Origin</span>}
                                  {isLatest && activeEmployee.has_live_ping && locationDetails?.title && (
                                    <span className="text-blue-700 font-bold">• Near {locationDetails.title}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-right">
                              <div>
                                <span className="text-[10px] text-gray-400 block font-normal">Displacement</span>
                                <span className="font-bold text-gray-800">
                                  {point.displacement_meters > 0
                                    ? `+${Math.round(point.displacement_meters)}m`
                                    : 'Origin'}
                                </span>
                              </div>

                              <div className="w-16">
                                <span className="text-[10px] text-gray-400 block font-normal">Cumulative</span>
                                <span className="font-bold text-emerald-700">
                                  {(point.cumulative_distance_meters / 1000).toFixed(2)} km
                                </span>
                              </div>

                              <div className="w-16 text-gray-500 font-mono text-[11px]">
                                {new Date(point.recorded_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center text-gray-400 border border-gray-200 rounded-xl">
              <Navigation className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-gray-600">No active field staff detected.</p>
              <p className="text-xs text-gray-400 mt-1">
                Tracking activates automatically when employees clock in through the mobile app.
              </p>
            </Card>
          )}

          {/* Privacy & Compliance Assurance Notice */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-3 text-xs text-blue-900">
            <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Enterprise Shift-Bound Privacy Enforcement</span>
              <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                Location telemetry strictly begins at Check-In and automatically terminates at Check-Out.
                Pings are throttled to displacement increments &ge; 50 meters to minimize device battery consumption
                and comply with employment data privacy standards.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
