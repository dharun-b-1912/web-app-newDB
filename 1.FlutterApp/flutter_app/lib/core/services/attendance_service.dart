import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../models/hrms_models.dart';
import '../../repositories/supabase/supabase_attendance_repository.dart';
import '../controllers/employee_controller.dart';
import '../services/attendance_time_service.dart';
import '../utils/secure_log.dart';
import 'location_service.dart';
import 'user_service.dart';

class CheckInResult {
  final bool success;
  final String message;

  const CheckInResult({required this.success, required this.message});
}

/// App-wide Attendance Service managing Live Check-In State & Real Supabase Synchronization
class AttendanceService extends ChangeNotifier {
  static final AttendanceService instance = AttendanceService._internal();
  AttendanceService._internal();

  final SupabaseAttendanceRepository _repository = SupabaseAttendanceRepository();

  bool _isProcessing = false;
  bool get isProcessing => _isProcessing;

  AttendanceSession _session = const AttendanceSession(
    status: AttendanceStatus.notCheckedIn,
  );

  AttendanceSession get session => _session;

  Timer? _ticker;

  RealtimeChannel? _attendanceChannel;
  String? _subscribedEmpId;

  /// Initializes session listener and loads today's real attendance from Supabase
  void initializeSession() {
    UserService.instance.addListener(() {
      fetchTodayAttendance();
    });
    fetchTodayAttendance();
  }

  void _subscribeRealtime(String employeeId) {
    if (_subscribedEmpId == employeeId && _attendanceChannel != null) return;
    _attendanceChannel?.unsubscribe();

    try {
      _subscribedEmpId = employeeId;
      _attendanceChannel = Supabase.instance.client
          .channel('attendance-realtime-$employeeId')
        ..onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'attendance_daily_summary',
          callback: (payload) {
            secureLog('[REALTIME] attendance_daily_summary event -> refreshing attendance');
            fetchTodayAttendance();
          },
        )
        ..onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'attendance_punches',
          callback: (payload) {
            secureLog('[REALTIME] attendance_punches event -> refreshing attendance');
            fetchTodayAttendance();
          },
        )
        ..subscribe();
    } catch (e) {
      secureLog('[REALTIME] Attendance subscription notice: $e');
    }
  }

  /// Fetches today's authoritative attendance from Supabase
  Future<void> fetchTodayAttendance() async {
    final user = UserService.instance.currentUser;
    if (user.dataId.isEmpty) {
      _session = const AttendanceSession(status: AttendanceStatus.notCheckedIn);
      _ticker?.cancel();
      notifyListeners();
      return;
    }

    _subscribeRealtime(user.dataId);

    try {
      final dailyRow = await _repository.getTodayAttendance(user.dataId);

      if (dailyRow != null) {
        final firstIn = dailyRow['first_check_in']?.toString();
        final lastOut = dailyRow['last_check_out']?.toString();
        final netMins = (dailyRow['net_working_minutes'] as num?)?.toInt();

        DateTime? checkInDt;
        DateTime? checkOutDt;

        if (firstIn != null && firstIn.isNotEmpty) {
          checkInDt = AttendanceTimeService.parseServerTimestamp(firstIn, referenceDate: dailyRow['date']?.toString());
        }
        if (lastOut != null && lastOut.isNotEmpty) {
          checkOutDt = AttendanceTimeService.parseServerTimestamp(lastOut, referenceDate: dailyRow['date']?.toString());
        }

        if (checkInDt != null) {
          final isCheckOutValid = checkOutDt != null && checkOutDt.isAfter(checkInDt);
          if (isCheckOutValid) {
            _session = AttendanceSession(
              status: AttendanceStatus.checkedOut,
              checkInTime: checkInDt,
              checkOutTime: checkOutDt,
              netWorkingMinutes: netMins,
              checkInLocationName: dailyRow['location_name']?.toString() ?? user.campus,
            );
            _ticker?.cancel();
          } else {
            _session = AttendanceSession(
              status: AttendanceStatus.checkedIn,
              checkInTime: checkInDt,
              checkInLocationName: dailyRow['location_name']?.toString() ?? user.campus,
            );
            _startTickerIfNeeded();
          }
        } else {
          _session = const AttendanceSession(status: AttendanceStatus.notCheckedIn);
          _ticker?.cancel();
        }
      } else {
        _session = const AttendanceSession(status: AttendanceStatus.notCheckedIn);
        _ticker?.cancel();
      }
    } catch (e) {
      secureLog('[Attendance] fetchTodayAttendance error: $e');
    } finally {
      notifyListeners();
    }
  }

  void _startTickerIfNeeded() {
    _ticker?.cancel();
    if (_session.isCheckedIn) {
      _ticker = Timer.periodic(const Duration(seconds: 1), (timer) {
        notifyListeners();
      });
    }
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  /// Perform Real Check-In with location validation & Supabase event insertion
  /// Perform Real Check-In with location validation & Supabase event insertion
  Future<CheckInResult> performCheckIn({
    required UserLocationResult location,
    required ApprovedWorkLocation approvedLocation,
  }) async {
    if (_isProcessing) {
      return const CheckInResult(
        success: false,
        message: "Processing check-in request. Please wait...",
      );
    }

    // 1. Validate location configuration & coordinates
    final targetLoc = location.targetLocation ?? approvedLocation;
    if (!targetLoc.hasValidCoordinates) {
      return const CheckInResult(
        success: false,
        message: "Check-in blocked: Your assigned work location GPS coordinates have not been configured by HR.",
      );
    }

    // 2. Strict radius & boundary validation
    if (!location.isInside || location.state != AttendanceGpsState.insideRadius) {
      final locName = targetLoc.name;
      final radius = targetLoc.allowedRadiusMeters;
      return CheckInResult(
        success: false,
        message: "Outside authorized zone: You are ${location.formattedDistance} away from $locName (Allowed radius: ${radius.toStringAsFixed(0)}m).",
      );
    }

    // 2. Prevent duplicate check-in
    if (_session.isCheckedIn) {
      return const CheckInResult(
        success: false,
        message: "You are already checked in for today's shift.",
      );
    }

    _isProcessing = true;
    notifyListeners();

    try {
      // 3. Real Supabase insertion into attendance_punches & attendance_daily via RPC
      await _repository.recordPunchEvent(
        type: 'CHECK_IN',
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracyMeters,
        isMocked: location.isMock,
      );

      // 4. Authoritatively refresh session directly from database
      await fetchTodayAttendance();
      unawaited(NotificationController.instance.loadNotifications());

      final locName = location.targetLocation?.name ?? approvedLocation.name;
      return CheckInResult(
        success: true,
        message: "Checked in successfully at $locName (${location.distanceMeters.toStringAsFixed(0)}m).",
      );
    } catch (e) {
      secureLog('[Attendance] Check-in operation failed: $e');
      final cleanMsg = e.toString().replaceAll('Exception:', '').trim();
      return CheckInResult(
        success: false,
        message: cleanMsg.isNotEmpty ? cleanMsg : "Check-in failed. Please check your connection and try again.",
      );
    } finally {
      _isProcessing = false;
      notifyListeners();
    }
  }

  /// Perform Real Check-Out with Supabase event insertion & GPS evidence
  Future<CheckInResult> performCheckOut({UserLocationResult? location}) async {
    if (_isProcessing) {
      return const CheckInResult(
        success: false,
        message: "Processing check-out request. Please wait...",
      );
    }

    if (!_session.isCheckedIn) {
      return const CheckInResult(
        success: false,
        message: "Check-out failed: You are not currently checked in.",
      );
    }

    _isProcessing = true;
    notifyListeners();

    try {
      final loc = location ?? LocationService.instance.currentResult;

      // 1. Real Supabase insertion into attendance_punches & attendance_daily
      await _repository.recordPunchEvent(
        type: 'CHECK_OUT',
        latitude: loc.latitude != 0 ? loc.latitude : null,
        longitude: loc.longitude != 0 ? loc.longitude : null,
        accuracy: loc.accuracyMeters > 0 ? loc.accuracyMeters : null,
        isMocked: loc.isMock,
      );

      // 2. Authoritatively refresh session directly from database
      _ticker?.cancel();
      await fetchTodayAttendance();
      unawaited(NotificationController.instance.loadNotifications());

      return const CheckInResult(
        success: true,
        message: "Successfully checked out.",
      );
    } catch (e) {
      secureLog('[Attendance] Check-out operation failed: $e');
      final cleanMsg = e.toString().replaceAll('Exception:', '').trim();
      return CheckInResult(
        success: false,
        message: cleanMsg.isNotEmpty ? cleanMsg : "Check-out failed. Please check your connection and try again.",
      );
    } finally {
      _isProcessing = false;
      notifyListeners();
    }
  }

  /// Get dynamic elapsed working duration since check-in
  Duration get elapsedWorkingDuration {
    if (!_session.isCheckedIn || _session.checkInTime == null) {
      if (_session.isCheckedOut && _session.netWorkingMinutes != null) {
        return Duration(minutes: _session.netWorkingMinutes!);
      }
      if (_session.isCheckedOut && _session.checkInTime != null && _session.checkOutTime != null) {
        return AttendanceTimeService.calculateDuration(
          checkIn: _session.checkInTime,
          checkOut: _session.checkOutTime,
        );
      }
      return Duration.zero;
    }
    return AttendanceTimeService.calculateDuration(checkIn: _session.checkInTime);
  }

  /// Formatted timer string HH:MM:SS
  String get formattedTimer {
    return AttendanceTimeService.formatDurationTimer(elapsedWorkingDuration);
  }
}
