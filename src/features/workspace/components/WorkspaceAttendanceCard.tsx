import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Clock, CheckCircle2, LogIn, LogOut, MapPin, Sun, Coffee, AlertTriangle, Navigation, X } from 'lucide-react';
import { AttendanceDaily } from '../../../types/attendance';
import { WorkLocation, workLocationService } from '../../../services/location/workLocationService';

interface Props {
  attendanceState: 'NotCheckedIn' | 'CheckedIn' | 'CheckedOut' | 'OnLeave' | 'Holiday' | 'WeeklyOff';
  todayAttendance: AttendanceDaily | null;
  onCheckIn: (coords?: { latitude: number; longitude: number; accuracy?: number }) => void;
  onCheckOut: (coords?: { latitude: number; longitude: number; accuracy?: number }, reason?: string) => void;
  isProcessing: boolean;
}

export const WorkspaceAttendanceCard: React.FC<Props> = ({
  attendanceState,
  todayAttendance,
  onCheckIn,
  onCheckOut,
  isProcessing,
}) => {
  const [elapsedText, setElapsedText] = useState<string>('00h 00m 00s');
  const [assignedLocations, setAssignedLocations] = useState<WorkLocation[]>([]);
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [isInsideAnyLocation, setIsInsideAnyLocation] = useState<boolean>(false);
  const [matchedLocationName, setMatchedLocationName] = useState<string | null>(null);
  const [nearestDistance, setNearestDistance] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Reason modal state for checkout outside assigned locations
  const [isReasonModalOpen, setIsReasonModalOpen] = useState<boolean>(false);
  const [checkoutReason, setCheckoutReason] = useState<string>('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  // Load assigned locations from backend
  useEffect(() => {
    let isMounted = true;
    workLocationService.fetchMyAssignedLocationsFromDb().then((locs) => {
      if (isMounted) setAssignedLocations(locs);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Poll / Acquire GPS position
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    const updatePosition = (pos: GeolocationPosition) => {
      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
      setCurrentCoords(coords);
      setGpsError(null);

      // Evaluate against assigned locations
      if (assignedLocations.length > 0) {
        let inside = false;
        let matchedName: string | null = null;
        let minDistance = Infinity;

        for (const loc of assignedLocations) {
          if (loc.latitude && loc.longitude) {
            const dist = workLocationService.calculateDistanceInMeters(
              coords.latitude,
              coords.longitude,
              loc.latitude,
              loc.longitude
            );
            if (dist < minDistance) minDistance = dist;
            if (dist <= loc.geofence_radius_meters) {
              inside = true;
              matchedName = loc.name;
              break;
            }
          }
        }

        setIsInsideAnyLocation(inside);
        setMatchedLocationName(matchedName);
        setNearestDistance(minDistance !== Infinity ? minDistance : null);
      }
    };

    navigator.geolocation.getCurrentPosition(
      updatePosition,
      (err) => setGpsError(err.message || 'GPS Signal Unavailable'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );

    const watchId = navigator.geolocation.watchPosition(
      updatePosition,
      (err) => setGpsError(err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [assignedLocations]);

  // Live timer when CheckedIn
  useEffect(() => {
    if (attendanceState !== 'CheckedIn' || !todayAttendance?.first_check_in) return;

    const calculateElapsed = () => {
      const now = new Date();
      const raw = todayAttendance.first_check_in;
      if (!raw) return;

      const inDate = new Date(raw.includes('T') ? raw : `${new Date().toISOString().split('T')[0]}T${raw}`);
      if (!isNaN(inDate.getTime())) {
        const diffMs = Math.max(0, now.getTime() - inDate.getTime());
        const totalSecs = Math.floor(diffMs / 1000);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        setElapsedText(`${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`);
      }
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [attendanceState, todayAttendance?.first_check_in]);

  const handleCheckInClick = () => {
    onCheckIn(currentCoords || undefined);
  };

  const handleCheckOutClick = () => {
    if (!isInsideAnyLocation) {
      // Prompt mandatory reason modal
      setCheckoutReason('');
      setReasonError(null);
      setIsReasonModalOpen(true);
    } else {
      onCheckOut(currentCoords || undefined, undefined);
    }
  };

  const handleConfirmUnauthorizedCheckout = () => {
    if (!checkoutReason || checkoutReason.trim().length < 3) {
      setReasonError('Please provide a meaningful reason (at least 3 characters).');
      return;
    }
    setIsReasonModalOpen(false);
    onCheckOut(currentCoords || undefined, checkoutReason.trim());
  };

  return (
    <>
      <Card className="p-6 bg-gradient-to-br from-[#073B2A] to-[#0A543B] text-white shadow-md rounded-2xl border border-emerald-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left Status & Timing Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                Today's Attendance Control
              </span>
            </div>

            {attendanceState === 'NotCheckedIn' && (
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Not Checked In
                </h2>
                <p className="text-xs text-emerald-200">
                  You haven't marked your presence for today yet.
                </p>
              </div>
            )}

            {attendanceState === 'CheckedIn' && (
              <div className="space-y-1">
                <div className="flex items-baseline gap-3">
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Checked In
                  </h2>
                  <span className="text-sm font-bold text-emerald-300">
                    at {todayAttendance?.first_check_in ? new Date(todayAttendance.first_check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-200">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Working Elapsed: <strong className="text-white font-bold">{elapsedText}</strong></span>
                </div>
              </div>
            )}

            {attendanceState === 'CheckedOut' && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    Day Completed
                  </h2>
                </div>
                <p className="text-xs text-emerald-200">
                  {todayAttendance?.first_check_in ? new Date(todayAttendance.first_check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'} → {todayAttendance?.last_check_out ? new Date(todayAttendance.last_check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </p>
                {(todayAttendance as any)?.unauthorized_checkout && (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 bg-amber-950/40 border border-amber-500/30 rounded-lg px-2 py-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Recorded outside assigned location. Overtime for today is set to 0.</span>
                  </div>
                )}
              </div>
            )}

            {attendanceState === 'OnLeave' && (
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Coffee className="w-6 h-6 text-amber-300" />
                  On Approved Leave
                </h2>
                <p className="text-xs text-emerald-200">
                  Your approved leave is active for today. No check-in required.
                </p>
              </div>
            )}

            {/* Geofence and Assigned Locations Status */}
            <div className="pt-2 border-t border-emerald-800/40 space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <Navigation className="w-3.5 h-3.5 text-emerald-300" />
                <span className="font-bold text-emerald-200">Live GPS Geofence:</span>
                {isInsideAnyLocation ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                    ● Inside {matchedLocationName}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40">
                    ● Outside Assigned Locations {nearestDistance !== null ? `(${nearestDistance}m away)` : ''}
                  </span>
                )}
              </div>

              {assignedLocations.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-emerald-200/80">
                  <span className="font-medium">Assigned:</span>
                  {assignedLocations.map((loc) => (
                    <span key={loc.id} className="bg-emerald-950/60 border border-emerald-700/40 px-2 py-0.5 rounded text-[10px]">
                      {loc.name} ({loc.geofence_radius_meters}m)
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Shift timings */}
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-emerald-200/90 pt-1">
              <span className="flex items-center gap-1">
                <Sun className="w-3 h-3 text-emerald-400" />
                Shift: {todayAttendance?.shift_name || 'General Shift (09:30 - 18:30)'}
              </span>
            </div>
          </div>

          {/* Right Interactive CTA */}
          <div className="self-start md:self-center">
            {attendanceState === 'NotCheckedIn' && (
              <Button
                size="lg"
                onClick={handleCheckInClick}
                disabled={isProcessing}
                className="bg-emerald-400 hover:bg-emerald-300 text-[#073B2A] font-black text-sm px-6 py-3 shadow-lg hover:shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4 mr-2" />
                {isProcessing ? 'Recording Check In...' : 'Check In Now'}
              </Button>
            )}

            {attendanceState === 'CheckedIn' && (
              <Button
                size="lg"
                onClick={handleCheckOutClick}
                disabled={isProcessing}
                className="bg-rose-500 hover:bg-rose-600 text-white font-black text-sm px-6 py-3 shadow-lg hover:shadow-rose-600/20 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {isProcessing ? 'Recording Check Out...' : 'Check Out'}
              </Button>
            )}

            {attendanceState === 'CheckedOut' && (
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-center text-xs font-bold text-emerald-200">
                Shift Recorded Successfully
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Mandatory Reason Modal for Outside Checkout */}
      {isReasonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Checkout Outside Work Location
                </h3>
              </div>
              <button
                onClick={() => setIsReasonModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              You are currently outside your assigned work locations. Checkout is allowed, but an official reason is required for administrative compliance and overtime verification.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Reason for Outside Checkout <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={checkoutReason}
                onChange={(e) => {
                  setCheckoutReason(e.target.value);
                  setReasonError(null);
                }}
                placeholder="e.g. Client site visit, emergency departure, manager authorized remote exit..."
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              {reasonError && (
                <p className="text-xs font-medium text-rose-500">{reasonError}</p>
              )}
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg text-xs text-amber-800 dark:text-amber-300">
              <strong>Notice:</strong> Outside checkouts are marked as unauthorized location events and will result in <strong>0 overtime hours</strong> for today.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsReasonModalOpen(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmUnauthorizedCheckout}
                disabled={isProcessing}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isProcessing ? 'Confirming...' : 'Confirm Checkout'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
