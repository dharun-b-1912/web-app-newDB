import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../models/hrms_models.dart';
import '../utils/secure_log.dart';
import 'user_service.dart';

/// Authoritative Attendance & GPS State Machine Enum
enum AttendanceGpsState {
  initializing,
  requestingPermission,
  locationDisabled,
  permissionDenied,
  permissionPermanentlyDenied,
  scanning,
  lowAccuracy,
  outsideRadius,
  insideRadius,
  checkingIn,
  checkedIn,
  checkingOut,
  checkedOut,
  gpsError,
  offline,
  reconnecting,
}

/// Rich Result Model representing live location telemetry & geofence evaluation
class UserLocationResult {
  final double latitude;
  final double longitude;
  final double accuracyMeters;
  final double distanceMeters;
  final bool isInside;
  final ApprovedWorkLocation? targetLocation;
  final AttendanceGpsState state;
  final String? errorMessage;
  final DateTime timestamp;
  final bool isMock;

  const UserLocationResult({
    required this.latitude,
    required this.longitude,
    this.accuracyMeters = 0.0,
    required this.distanceMeters,
    required this.isInside,
    this.targetLocation,
    required this.state,
    this.errorMessage,
    required this.timestamp,
    this.isMock = false,
  });

  /// Factory for initial locating state
  factory UserLocationResult.locating() => UserLocationResult(
        latitude: 0,
        longitude: 0,
        accuracyMeters: 0,
        distanceMeters: 0,
        isInside: false,
        state: AttendanceGpsState.scanning,
        timestamp: DateTime.now(),
      );

  /// Factory for error states
  factory UserLocationResult.error(String msg, {AttendanceGpsState state = AttendanceGpsState.gpsError}) =>
      UserLocationResult(
        latitude: 0,
        longitude: 0,
        accuracyMeters: 0,
        distanceMeters: 0,
        isInside: false,
        state: state,
        errorMessage: msg,
        timestamp: DateTime.now(),
      );

  /// Format distance for human-friendly UI display (e.g. 42m, 184m, 1.4 km)
  String get formattedDistance {
    if (state == AttendanceGpsState.scanning ||
        state == AttendanceGpsState.initializing ||
        (latitude == 0.0 && longitude == 0.0)) {
      return 'Locating...';
    }
    if (distanceMeters < 1) return '< 1m';
    if (distanceMeters < 1000) return '${distanceMeters.round()}m';
    return '${(distanceMeters / 1000).toStringAsFixed(1)} km';
  }

  /// Format accuracy for human-friendly UI display (e.g. ±8m)
  String get formattedAccuracy => '±${accuracyMeters.round()}m';
}

/// Service handling automatic GPS monitoring, multi-location geofencing,
/// state transitions, and Supabase Realtime synchronization
class LocationService extends ChangeNotifier {
  static final LocationService instance = LocationService._internal();
  LocationService._internal();

  UserLocationResult _currentResult = UserLocationResult.locating();
  UserLocationResult get currentResult => _currentResult;

  List<ApprovedWorkLocation> _authorizedLocations = [];
  List<ApprovedWorkLocation> get authorizedLocations => List.unmodifiable(_authorizedLocations);

  bool _isAcquiring = false;
  bool get isAcquiring => _isAcquiring;

  StreamSubscription<Position>? _positionStreamSub;
  Timer? _periodicAdaptiveTimer;
  RealtimeChannel? _locationChannel;
  String? _subscribedOrgId;

  // State Transition Tracking
  AttendanceGpsState _previousState = AttendanceGpsState.initializing;
  AttendanceGpsState get previousState => _previousState;

  // Geofence Entry Stream / Callbacks
  final _geofenceEntryController = StreamController<ApprovedWorkLocation>.broadcast();
  Stream<ApprovedWorkLocation> get onGeofenceEntered => _geofenceEntryController.stream;

  DateTime? _lastGeofencePromptTime;
  String? _lastPromptedLocationId;

  /// Initializes the service and starts automatic tracking
  Future<void> initialize() async {
    UserService.instance.addListener(() {
      fetchAuthorizedLocations().then((_) => evaluateLiveLocation());
    });

    await fetchAuthorizedLocations();
    await evaluateLiveLocation();
    startAutomaticTracking();
  }

  /// Starts live background/foreground position stream with battery efficiency
  void startAutomaticTracking() {
    _positionStreamSub?.cancel();
    _periodicAdaptiveTimer?.cancel();

    // 1. Geolocator Distance-Filter Stream (only triggers when moving ≥ 8 meters)
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 8,
    );

    try {
      _positionStreamSub = Geolocator.getPositionStream(
        locationSettings: locationSettings,
      ).listen(
        (Position pos) {
          _processPosition(pos);
        },
        onError: (err) {
          secureLog('[GPS Stream] Error: $err');
          _evaluateFallbackPosition();
        },
      );
    } catch (e) {
      secureLog('[GPS Stream] Init error: $e');
    }

    // 2. Adaptive periodic verification (every 25 seconds while app is foregrounded)
    _periodicAdaptiveTimer = Timer.periodic(const Duration(seconds: 25), (_) {
      evaluateLiveLocation(silent: true);
    });
  }

  /// Pauses automatic tracking when app goes to background
  void pauseTracking() {
    _positionStreamSub?.cancel();
    _positionStreamSub = null;
    _periodicAdaptiveTimer?.cancel();
    _periodicAdaptiveTimer = null;
  }

  /// Resumes automatic tracking when app comes back to foreground
  void resumeTracking() {
    startAutomaticTracking();
    evaluateLiveLocation();
  }

  /// Subscribes to Supabase Realtime changes for work_locations, assignments, and policies
  void _subscribeRealtime(String orgId) {
    if (_subscribedOrgId == orgId && _locationChannel != null) return;
    _locationChannel?.unsubscribe();

    try {
      _subscribedOrgId = orgId;
      _locationChannel = Supabase.instance.client
          .channel('gps-locations-$orgId')
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: 'work_locations',
            callback: (payload) {
              secureLog('[REALTIME GPS] work_locations changed -> updating geofence parameters');
              refreshLocationsAndEvaluate();
            },
          )
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: 'employee_work_locations',
            callback: (payload) {
              secureLog('[REALTIME GPS] employee_work_locations changed -> updating employee assignments');
              refreshLocationsAndEvaluate();
            },
          )
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: 'attendance_location_policy',
            callback: (payload) {
              secureLog('[REALTIME GPS] attendance_location_policy changed -> re-evaluating');
              refreshLocationsAndEvaluate();
            },
          )
          .subscribe();
    } catch (e) {
      secureLog('[REALTIME GPS] Subscription notice: $e');
    }
  }

  /// Fetches authorized work locations dynamically from Supabase
  Future<List<ApprovedWorkLocation>> fetchAuthorizedLocations() async {
    final user = UserService.instance.currentUser;
    final orgId = user.companyId.isNotEmpty ? user.companyId : 'org-joy-01';
    final empId = user.dataId.isNotEmpty ? user.dataId : user.employeeId;

    _subscribeRealtime(orgId);

    try {
      final client = Supabase.instance.client;

      // 1. Try calling the dedicated RPC function
      try {
        final rpcResult = await client.rpc('fn_get_employee_authorized_locations', params: {
          'p_tenant_id': orgId,
          'p_employee_id': empId,
        });

        if (rpcResult is List && rpcResult.isNotEmpty) {
          _authorizedLocations = rpcResult
              .map((item) => ApprovedWorkLocation.fromJson(Map<String, dynamic>.from(item)))
              .where((loc) => loc.hasValidCoordinates)
              .toList();
          if (_authorizedLocations.isNotEmpty) {
            return _authorizedLocations;
          }
        }
      } catch (rpcErr) {
        secureLog('[GPS] RPC fn_get_employee_authorized_locations fallback: $rpcErr');
      }

      // 2. Direct Query Fallback
      final locData = await client
          .from('work_locations')
          .select()
          .eq('is_active', true);

      if (locData.isNotEmpty) {
        _authorizedLocations = locData
            .map((item) => ApprovedWorkLocation.fromJson(Map<String, dynamic>.from(item)))
            .where((loc) => loc.hasValidCoordinates)
            .toList();
      } else {
        _authorizedLocations = user.approvedLocation.hasValidCoordinates
            ? [user.approvedLocation]
            : [];
      }
    } catch (e) {
      secureLog('[GPS] Error fetching work locations: $e');
      _authorizedLocations = user.approvedLocation.hasValidCoordinates
          ? [user.approvedLocation]
          : [];
    }

    return _authorizedLocations;
  }

  /// Full Refresh: Loads locations and evaluates live GPS
  Future<UserLocationResult> refreshLocationsAndEvaluate() async {
    await fetchAuthorizedLocations();
    return evaluateLiveLocation(silent: true);
  }

  /// Real Device GPS / Network Acquisition & Evaluation with fast resilient fallback
  Future<UserLocationResult> evaluateLiveLocation({bool silent = false}) async {
    if (_isAcquiring) return _currentResult;
    _isAcquiring = true;

    // Preserve existing valid coordinates instead of wiping to 0,0
    if (!silent && _currentResult.latitude == 0.0) {
      _currentResult = UserLocationResult.locating();
      notifyListeners();
    }

    try {
      // 1. Check if device location service (GPS hardware) is enabled
      bool serviceEnabled = true;
      try {
        serviceEnabled = await Geolocator.isLocationServiceEnabled();
      } catch (e) {
        secureLog('[GPS] isLocationServiceEnabled check notice: $e');
      }

      if (!serviceEnabled) {
        // Try requesting anyway or report disabled
        LocationPermission permission = await Geolocator.checkPermission();
        if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
          _transitionTo(UserLocationResult.error(
            'Location services or permissions are disabled. Please enable GPS in device settings.',
            state: AttendanceGpsState.locationDisabled,
          ));
          _isAcquiring = false;
          return _currentResult;
        }
      }

      // 2. Check and request location permissions
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          _transitionTo(UserLocationResult.error(
            'Location permission is required for attendance clocking.',
            state: AttendanceGpsState.permissionDenied,
          ));
          _isAcquiring = false;
          return _currentResult;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        _transitionTo(UserLocationResult.error(
          'Location permissions are permanently denied. Please enable them in App Settings.',
          state: AttendanceGpsState.permissionPermanentlyDenied,
        ));
        _isAcquiring = false;
        return _currentResult;
      }

      // 3. Acquire Real Fresh Device Position
      Position? position;
      try {
        position = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 8),
          ),
        );
      } catch (posErr) {
        secureLog('[GPS] High accuracy timeout ($posErr), attempting standard accuracy');
        try {
          position = await Geolocator.getCurrentPosition(
            locationSettings: const LocationSettings(
              accuracy: LocationAccuracy.medium,
              timeLimit: Duration(seconds: 5),
            ),
          );
        } catch (medErr) {
          secureLog('[GPS] Medium accuracy error ($medErr), attempting last known fix');
          try {
            position = await Geolocator.getLastKnownPosition();
          } catch (_) {}
        }
      }

      if (position == null || (position.latitude == 0.0 && position.longitude == 0.0)) {
        _transitionTo(UserLocationResult.error(
          'Unable to acquire device GPS signal. Please move to an open area and tap Re-scan GPS.',
          state: AttendanceGpsState.gpsError,
        ));
        _isAcquiring = false;
        return _currentResult;
      }

      _processPosition(position);
    } catch (e) {
      secureLog('[GPS] Position acquisition exception: $e');
      _transitionTo(UserLocationResult.error(
        'Unable to determine your location: ${e.toString().replaceAll('Exception:', '').trim()}',
        state: AttendanceGpsState.gpsError,
      ));
    } finally {
      _isAcquiring = false;
      notifyListeners();
    }

    return _currentResult;
  }

  /// Processes live position updates against authorized geofences
  void _processPosition(Position position) {
    if (position.latitude == 0.0 && position.longitude == 0.0) {
      _transitionTo(UserLocationResult.error(
        'Scanning GPS signal...',
        state: AttendanceGpsState.scanning,
      ));
      return;
    }

    if (_authorizedLocations.isEmpty) {
      fetchAuthorizedLocations();
    }

    final rawLocations = _authorizedLocations.isNotEmpty
        ? _authorizedLocations
        : [UserService.instance.currentUser.approvedLocation];

    final validLocations = rawLocations.where((loc) => loc.hasValidCoordinates).toList();

    if (validLocations.isEmpty) {
      final blockedResult = UserLocationResult(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracyMeters: position.accuracy,
        distanceMeters: double.infinity,
        isInside: false,
        targetLocation: null,
        state: AttendanceGpsState.outsideRadius,
        errorMessage: 'Check-in blocked: Your assigned work location GPS coordinates have not been configured by HR.',
        timestamp: position.timestamp,
        isMock: position.isMocked,
      );
      _transitionTo(blockedResult);
      return;
    }

    ApprovedWorkLocation? nearestLocation;
    double minDistance = double.infinity;

    for (final loc in validLocations) {
      final dist = Geolocator.distanceBetween(
        position.latitude,
        position.longitude,
        loc.latitude,
        loc.longitude,
      );

      if (dist < minDistance) {
        minDistance = dist;
        nearestLocation = loc;
      }
    }

    final target = nearestLocation ?? validLocations.first;
    final isInside = minDistance <= target.allowedRadiusMeters;
    final isAccuracyTooLow = position.accuracy > target.allowedRadiusMeters;

    AttendanceGpsState newState;
    if (isAccuracyTooLow && (!isInside || position.accuracy > (target.allowedRadiusMeters * 1.5))) {
      newState = AttendanceGpsState.lowAccuracy;
    } else if (isInside) {
      newState = AttendanceGpsState.insideRadius;
    } else {
      newState = AttendanceGpsState.outsideRadius;
    }

    final distStr = minDistance < 1000 ? '${minDistance.round()}m' : '${(minDistance / 1000).toStringAsFixed(1)} km';
    final newResult = UserLocationResult(
      latitude: position.latitude,
      longitude: position.longitude,
      accuracyMeters: position.accuracy,
      distanceMeters: minDistance,
      isInside: isInside && !isAccuracyTooLow,
      targetLocation: target,
      state: newState,
      errorMessage: isAccuracyTooLow
          ? 'GPS accuracy (±${position.accuracy.toStringAsFixed(0)}m) is too low for geofence validation. Move to an open outdoor area.'
          : (!isInside
              ? 'Outside authorized zone: You are $distStr away from ${target.name} (Allowed radius: ${target.allowedRadiusMeters.round()}m).'
              : null),
      timestamp: position.timestamp,
      isMock: position.isMocked,
    );

    // Geofence Entry Transition Detection (OUTSIDE -> INSIDE)
    if (_previousState == AttendanceGpsState.outsideRadius && newState == AttendanceGpsState.insideRadius) {
      _handleGeofenceEntered(target);
    }

    _transitionTo(newResult);

    final user = UserService.instance.currentUser;
    final ageSeconds = DateTime.now().difference(position.timestamp).inSeconds;
    secureLog(
      '\n================== GPS CHECK DIAGNOSTIC ==================\n'
      'employee_id: ${user.employeeId.isNotEmpty ? user.employeeId : user.dataId}\n'
      'organization_id: ${user.companyId.isNotEmpty ? user.companyId : "org-joy-01"}\n'
      'selected_work_location_id: ${target.id}\n'
      'selected_work_location_name: ${target.name}\n'
      'configured: lat=${target.latitude.toStringAsFixed(7)}, lng=${target.longitude.toStringAsFixed(7)}, radius=${target.allowedRadiusMeters.round()}m\n'
      'device: lat=${position.latitude.toStringAsFixed(7)}, lng=${position.longitude.toStringAsFixed(7)}, accuracy=±${position.accuracy.round()}m\n'
      'gps_timestamp: ${position.timestamp.toIso8601String()} (age: ${ageSeconds}s)\n'
      'calculated_distance_meters: ${minDistance.toStringAsFixed(1)}m\n'
      'inside_radius: ${isInside && !isAccuracyTooLow}\n'
      'result_state: $newState\n'
      '==========================================================\n',
    );
  }

  /// Triggers smart geofence entered event with anti-spam cooldown
  void _handleGeofenceEntered(ApprovedWorkLocation target) {
    final now = DateTime.now();
    if (_lastGeofencePromptTime != null &&
        _lastPromptedLocationId == target.id &&
        now.difference(_lastGeofencePromptTime!).inMinutes < 5) {
      return; // Cooldown active to prevent repetitive prompts
    }

    _lastGeofencePromptTime = now;
    _lastPromptedLocationId = target.id;
    _geofenceEntryController.add(target);
    secureLog('[GEOFENCE] Entered authorized radius for ${target.name}');
  }

  void _evaluateFallbackPosition() async {
    try {
      final lastPos = await Geolocator.getLastKnownPosition();
      if (lastPos != null) {
        _processPosition(lastPos);
      }
    } catch (_) {}
  }

  void _transitionTo(UserLocationResult result) {
    _previousState = _currentResult.state;
    _currentResult = result;
    notifyListeners();
  }

  /// Opens System App Settings
  Future<bool> openAppSettings() async {
    return await Geolocator.openAppSettings();
  }

  /// Opens Device Location Settings
  Future<bool> openLocationSettings() async {
    return await Geolocator.openLocationSettings();
  }

  @override
  void dispose() {
    _positionStreamSub?.cancel();
    _periodicAdaptiveTimer?.cancel();
    _geofenceEntryController.close();
    _locationChannel?.unsubscribe();
    super.dispose();
  }
}
