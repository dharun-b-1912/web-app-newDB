import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/config/supabase_config.dart';
import '../../core/services/attendance_time_service.dart';
import '../../core/services/user_service.dart';
import '../../core/utils/app_date_time.dart';
import '../../core/utils/query_timeout.dart';
import '../../core/utils/secure_log.dart';
import '../../models/employee_models.dart';
import '../interfaces/employee_repository.dart';

/// WorkForceOS — Supabase Attendance Repository (Production Schema Aligned)
///
/// Tables used:
///   attendance_events     — raw punch events written on check-in / check-out
///   attendance_daily      — per-day ledger (status, first/last punch, net_working_minutes)
///   attendance_regularizations — regularization requests
class SupabaseAttendanceRepository implements IAttendanceRepository {
  SupabaseClient get _client => Supabase.instance.client;

  // ────────────────────────────────────────────────────────────────────────
  // TODAY'S ATTENDANCE QUERY (used on app launch / resume / punch sync)
  // ────────────────────────────────────────────────────────────────────────

  /// Fetch the authoritative attendance_daily and attendance_events record for today.
  Future<Map<String, dynamic>?> getTodayAttendance(String employeeId) async {
    try {
      if (!SupabaseConfig.isConfigured || employeeId.trim().isEmpty) return null;

      final todayDate = AttendanceTimeService.getBusinessDate();
      final user = UserService.instance.currentUser;
      final targetId = user.employeeUuid?.isNotEmpty == true ? user.employeeUuid! : employeeId;

      Map<String, dynamic> merged = {};

      // 1. Query attendance_daily
      try {
        final orFilter = <String>{
          'employee_id.eq.$targetId',
          if (user.employeeId.isNotEmpty) 'employee_code.eq.${user.employeeId}',
          if (user.employeeId.isNotEmpty) 'employee_id.eq.${user.employeeId}',
          if (user.employeeUuid?.isNotEmpty == true) 'employee_id.eq.${user.employeeUuid}',
        }.join(',');

        final dailyDataList = await withTimeout(
          _client
              .from('attendance_daily')
              .select()
              .or(orFilter)
              .eq('date', todayDate)
              .limit(1),
        );
        if (dailyDataList.isNotEmpty) {
          merged = Map<String, dynamic>.from(dailyDataList.first);
        }
      } catch (e) {
        secureLog('[Attendance] attendance_daily query notice: $e');
      }

      // 2. Query today's attendance_events to ensure authoritative check-in/out timestamps
      try {
        final businessDateParts = todayDate.split('-').map(int.parse).toList();
        // Start of business day in IST (00:00:00 IST) converted to UTC (-5h30m)
        final businessDayStartUtc = DateTime.utc(businessDateParts[0], businessDateParts[1], businessDateParts[2])
            .subtract(AttendanceTimeService.istOffset);

        final orFilterEvents = <String>{
          'employee_id.eq.$targetId',
          if (user.employeeId.isNotEmpty) 'employee_id.eq.${user.employeeId}',
          if (user.employeeUuid?.isNotEmpty == true) 'employee_id.eq.${user.employeeUuid}',
        }.join(',');

        final events = await withTimeout(
          _client
              .from('attendance_events')
              .select()
              .or(orFilterEvents)
              .gte('timestamp', businessDayStartUtc.toIso8601String())
              .order('timestamp', ascending: true),
        );

        if (events.isNotEmpty) {
          String? firstInTimestamp;
          String? lastOutTimestamp;

          for (final ev in events) {
            final type = (ev['type'] ?? ev['event_type'] ?? '').toString().toUpperCase();
            final ts = ev['timestamp']?.toString();
            if (ts != null && ts.isNotEmpty) {
              if (type.contains('IN') || type == 'CHECK_IN') {
                firstInTimestamp ??= ts;
              } else if (type.contains('OUT') || type == 'CHECK_OUT') {
                lastOutTimestamp = ts;
              }
            }
          }

          if (firstInTimestamp != null) {
            merged['first_check_in'] = firstInTimestamp;
          }
          if (lastOutTimestamp != null) {
            merged['last_check_out'] = lastOutTimestamp;
          }
          merged['date'] = todayDate;
        }
      } catch (e) {
        secureLog('[Attendance] attendance_events query notice: $e');
      }

      if (merged.isNotEmpty) {
        AttendanceTimeService.logDiagnostic(
          context: 'getTodayAttendance',
          rawValue: merged['first_check_in'],
        );
        if (merged['last_check_out'] != null) {
          AttendanceTimeService.logDiagnostic(
            context: 'getTodayAttendance_OUT',
            rawValue: merged['last_check_out'],
          );
        }
        return merged;
      }
      return null;
    } catch (e) {
      secureLog('[Attendance] getTodayAttendance query error: $e');
      return null;
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // PUNCH EVENT INSERTION (CHECK_IN / CHECK_OUT)
  // ────────────────────────────────────────────────────────────────────────

  /// Record punch event into `attendance_events` & atomically sync `attendance_daily` + `realtime_outbox`.
  Future<void> recordPunchEvent({
    required String type,
    double? latitude,
    double? longitude,
    double? accuracy,
    String? deviceId,
    bool isMocked = false,
  }) async {
    final user = UserService.instance.currentUser;
    final employeeUuid = user.dataId;

    if (employeeUuid.isEmpty) {
      throw Exception('Authentication required: Employee identity not resolved.');
    }

    final eventId = 'evt-${DateTime.now().microsecondsSinceEpoch}-${employeeUuid.hashCode.abs()}';
    final nowIso = DateTime.now().toUtc().toIso8601String();
    final todayDate = AttendanceTimeService.getBusinessDate();
    final tenantId = (user.companyId.isNotEmpty && user.companyId != 'org-joy-corp') ? user.companyId : 'org-joy-01';
    final companyId = (user.companyUuid != null && user.companyUuid!.isNotEmpty && user.companyUuid != 'org-joy-corp')
        ? user.companyUuid!
        : 'comp-joy-01';

    // 1. Log Diagnostics for development verification
    secureLog('[ATTENDANCE][FLUTTER][START] employee=${user.employeeId} uuid=$employeeUuid type=$type');
    if (latitude != null && longitude != null) {
      secureLog('[ATTENDANCE][GPS] lat=$latitude lng=$longitude accuracy=${accuracy ?? 10.0}m isMock=$isMocked');
    }

    // 2. Execute Authoritative Server-Side GPS Validation RPC
    if (latitude != null && longitude != null) {
      try {
        final rpcRes = await withTimeout(
          _client.rpc('fn_validate_and_record_gps_attendance', params: {
            'p_tenant_id': tenantId,
            'p_org_id': tenantId,
            'p_employee_id': employeeUuid,
            'p_punch_type': type.toUpperCase().contains('OUT') ? 'CHECK_OUT' : 'CHECK_IN',
            'p_latitude': latitude,
            'p_longitude': longitude,
            'p_accuracy_meters': accuracy ?? 10.0,
            'p_device_timestamp': nowIso,
            'p_mock_location_detected': isMocked,
            'p_device_info': {
              'deviceId': deviceId ?? 'FLUTTER_MOBILE',
              'client': 'WorkForceOS Mobile v1.0',
            },
          }),
        );
        secureLog('[ATTENDANCE][RPC] fn_validate_and_record_gps_attendance success: $rpcRes');
      } catch (rpcErr) {
        secureLog('[ATTENDANCE][RPC] Exception during GPS attendance validation: $rpcErr');
        // If the server rejected the punch because outside geofence or low accuracy, rethrow to notify employee
        final errStr = rpcErr.toString();
        if (errStr.contains('outside the authorized') ||
            errStr.contains('GPS accuracy') ||
            errStr.contains('Mock location') ||
            errStr.contains('No authorized work location')) {
          final cleanMsg = errStr.replaceAll(RegExp(r'^(Exception:|PostgrestException\(message:\s*|\))'), '').trim();
          throw Exception(cleanMsg.isNotEmpty ? cleanMsg : errStr);
        }
      }
    }

    // 3. Fallback / Direct insert into attendance_events (raw punch ledger)
    final payload = {
      'id': eventId,
      'organization_id': tenantId,
      'employee_id': employeeUuid,
      'timestamp': nowIso,
      'type': type,
      'source': 'MOBILE_GPS',
      'latitude': latitude,
      'longitude': longitude,
      'device_id': deviceId ?? 'FLUTTER_MOBILE',
    };

    try {
      await withTimeout(
        _client.from('attendance_events').insert(payload),
      );
      secureLog('[ATTENDANCE][DB] punch=INSERT status=SUCCESS event_id=$eventId');
    } catch (e) {
      secureLog('[ATTENDANCE][DB] attendance_events insert notice: $e');
    }

    // 3. Atomically update/upsert attendance_daily ledger
    try {
      final existingDaily = await withTimeout(
        _client
            .from('attendance_daily')
            .select()
            .eq('employee_id', employeeUuid)
            .eq('date', todayDate)
            .maybeSingle(),
      );

      final isCheckIn = type.toUpperCase().contains('IN');
      final firstIn = isCheckIn ? nowIso : (existingDaily?['first_check_in'] ?? nowIso);
      final lastOut = isCheckIn ? (existingDaily?['last_check_out']) : nowIso;

      int netMinutes = 0;
      if (firstIn != null && lastOut != null) {
        final inDt = DateTime.tryParse(firstIn.toString());
        final outDt = DateTime.tryParse(lastOut.toString());
        if (inDt != null && outDt != null && outDt.isAfter(inDt)) {
          netMinutes = outDt.difference(inDt).inMinutes;
        }
      }

      final dailyPayload = {
        'id': existingDaily?['id'] ?? 'daily-$employeeUuid-$todayDate',
        'organization_id': tenantId,
        'company_id': companyId,
        'employee_id': employeeUuid,
        'employee_code': user.employeeId.isNotEmpty ? user.employeeId : employeeUuid,
        'employee_name': user.name,
        'department': user.department.isNotEmpty ? user.department : 'Engineering',
        'designation': user.designation.isNotEmpty ? user.designation : 'Software Engineer',
        'date': todayDate,
        'status': 'Present',
        'first_check_in': firstIn,
        'last_check_out': lastOut,
        'gross_working_minutes': netMinutes,
        'net_working_minutes': netMinutes,
        'source': 'MOBILE_GPS',
        'updated_at': nowIso,
      };

      await withTimeout(
        _client.from('attendance_daily').upsert(dailyPayload),
      );
      secureLog('[ATTENDANCE][LEDGER] employee=${user.employeeId} first_in=$firstIn last_out=$lastOut worked=${netMinutes}m status=PRESENT');
    } catch (e) {
      secureLog('[ATTENDANCE][LEDGER] attendance_daily upsert notice: $e');
    }

    // 4. Broadcast Realtime Outbox Event for cross-platform instant mesh update
    try {
      await withTimeout(
        _client.from('realtime_outbox').insert({
          'event_type': 'attendance.updated',
          'entity_type': 'ATTENDANCE_DAILY',
          'entity_id': employeeUuid,
          'organization_id': tenantId,
          'payload': {
            'employee_id': employeeUuid,
            'employee_code': user.employeeId,
            'employee_name': user.name,
            'punch_type': type,
            'timestamp': nowIso,
            'date': todayDate,
            'source': 'MOBILE_GPS',
          },
        }),
      );
      secureLog('[ATTENDANCE][REALTIME] event=UPDATE table=attendance_daily_ledger mesh=DISPATCHED');
    } catch (e) {
      secureLog('[ATTENDANCE][REALTIME] realtime_outbox notice: $e');
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // MONTHLY TIMESHEET QUERY
  // ────────────────────────────────────────────────────────────────────────

  @override
  Future<List<TimesheetEntryModel>> getTimesheets(
    String employeeId, {
    int? month,
    int? year,
  }) async {
    try {
      if (!SupabaseConfig.isConfigured) {
        return [];
      }

      final data = await _monthQuery(employeeId, month: month, year: year);
      if (data.isEmpty) {
        secureLog('[Attendance] No monthly timesheets found for $month/$year');
        return [];
      }

      return data.map(_mapDailyRow).toList();
    } catch (e) {
      secureLog('[Attendance] getTimesheets error: $e');
      return [];
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // MONTHLY ATTENDANCE SUMMARY
  // ────────────────────────────────────────────────────────────────────────

  @override
  Future<AttendanceSummaryModel> getAttendanceSummary(
    String employeeId, {
    int? month,
    int? year,
  }) async {
    try {
      if (!SupabaseConfig.isConfigured) {
        return const AttendanceSummaryModel(
          totalWorkingDays: 0,
          presentDays: 0,
          absentDays: 0,
          leaveDays: 0,
          holidaysCount: 0,
          weekOffsCount: 0,
          totalHoursWorked: '00h 00m',
          avgDailyHours: '00h 00m',
        );
      }

      final data = await _monthQuery(employeeId, month: month, year: year);
      if (data.isEmpty) {
        return const AttendanceSummaryModel(
          totalWorkingDays: 0,
          presentDays: 0,
          absentDays: 0,
          leaveDays: 0,
          holidaysCount: 0,
          weekOffsCount: 0,
          totalHoursWorked: '00h 00m',
          avgDailyHours: '00h 00m',
        );
      }

      var present = 0, absent = 0, leave = 0, holidays = 0, weekOffs = 0;
      var totalMinutes = 0, workedDayCount = 0;

      for (final row in data) {
        final status = _parseStatus(row['status']);
        switch (status) {
          case DayAttendanceStatus.present:
          case DayAttendanceStatus.late:
          case DayAttendanceStatus.regularized:
            present++;
            break;
          case DayAttendanceStatus.halfDayPresent:
          case DayAttendanceStatus.halfDay:
            present++;
            break;
          case DayAttendanceStatus.halfDayAbsent:
          case DayAttendanceStatus.absent:
            absent++;
            break;
          case DayAttendanceStatus.leave:
            leave++;
            break;
          case DayAttendanceStatus.holiday:
            holidays++;
            break;
          case DayAttendanceStatus.weekOff:
            weekOffs++;
            break;
          case DayAttendanceStatus.none:
            break;
        }
        final mins = (row['net_working_minutes'] as num?)?.toInt() ?? 0;
        if (mins > 0) {
          totalMinutes += mins;
          workedDayCount++;
        }
      }

      return AttendanceSummaryModel(
        totalWorkingDays: data.length,
        presentDays: present,
        absentDays: absent,
        leaveDays: leave,
        holidaysCount: holidays,
        weekOffsCount: weekOffs,
        totalHoursWorked: _formatDuration(totalMinutes),
        avgDailyHours:
            _formatDuration(workedDayCount > 0 ? totalMinutes ~/ workedDayCount : 0),
      );
    } catch (e) {
      secureLog('[Attendance] getAttendanceSummary error: $e');
      return const AttendanceSummaryModel(
        totalWorkingDays: 0,
        presentDays: 0,
        absentDays: 0,
        leaveDays: 0,
        holidaysCount: 0,
        weekOffsCount: 0,
        totalHoursWorked: '00h 00m',
        avgDailyHours: '00h 00m',
      );
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // REGULARIZATION REQUESTS
  // ────────────────────────────────────────────────────────────────────────

  @override
  Future<List<RegularizationRequestModel>> getRegularizationRequests(
    String employeeId,
  ) async {
    try {
      if (!SupabaseConfig.isConfigured) return [];

      final user = UserService.instance.currentUser;
      final targetId = user.dataId.isNotEmpty ? user.dataId : employeeId;
      final targetCode = user.employeeId;

      List<RegularizationRequestModel> requests = [];

      // 1. Fetch from Realtime Outbox Mesh
      try {
        final outboxRows = await withTimeout(
          _client
              .from('realtime_outbox')
              .select('*')
              .eq('entity_type', 'attendance_regularization_requests')
              .order('created_at', ascending: false)
              .limit(50),
        );

        if (outboxRows.isNotEmpty) {
          for (final row in outboxRows) {
            final payload = row['payload'];
            if (payload is Map<String, dynamic>) {
              final payloadEmpId = payload['employee_id']?.toString() ?? '';
              final payloadEmpCode = payload['employee_code']?.toString() ?? '';

              // Check if matches authenticated employee or manager view
              if (payloadEmpId == targetId || payloadEmpCode == targetCode || targetId.isEmpty) {
                final dateRaw = payload['attendance_date'] ?? payload['date'] ?? row['created_at'];
                final inTime = payload['requested_check_in'] ?? payload['requested_in'] ?? '09:30 AM';
                final outTime = payload['requested_check_out'] ?? payload['requested_out'] ?? '06:30 PM';
                final rawStatus = (payload['status'] ?? 'MANAGER_PENDING').toString().toUpperCase();

                RegularizationStatusState state = RegularizationStatusState.managerPending;
                LeaveStatus leaveStatus = LeaveStatus.pending;

                if (rawStatus.contains('HR')) {
                  state = RegularizationStatusState.hrPending;
                  leaveStatus = LeaveStatus.pending;
                } else if (rawStatus.contains('APPROV')) {
                  state = RegularizationStatusState.approved;
                  leaveStatus = LeaveStatus.approved;
                } else if (rawStatus.contains('REJECT')) {
                  state = RegularizationStatusState.rejected;
                  leaveStatus = LeaveStatus.rejected;
                } else if (rawStatus.contains('CLARIF')) {
                  state = RegularizationStatusState.clarificationRequired;
                  leaveStatus = LeaveStatus.pending;
                }

                requests.add(RegularizationRequestModel(
                  id: (payload['id'] ?? row['entity_id'] ?? row['id']).toString(),
                  employeeId: payloadEmpId.isNotEmpty ? payloadEmpId : targetId,
                  employeeName: payload['employee_name']?.toString() ?? user.name,
                  department: payload['department']?.toString() ?? user.department,
                  date: DateTime.tryParse(dateRaw.toString()) ?? DateTime.now(),
                  shiftName: payload['shift_name']?.toString() ?? 'General Shift',
                  shiftWindow: payload['shift_window']?.toString() ?? '09:30 AM — 06:30 PM',
                  originalInTime: payload['original_check_in']?.toString(),
                  originalOutTime: payload['original_check_out']?.toString(),
                  originalStatus: payload['original_status']?.toString(),
                  requestedInTime: _formatTimeString(inTime.toString()),
                  requestedOutTime: _formatTimeString(outTime.toString()),
                  reasonCode: payload['reason_code']?.toString() ?? 'FORGOT_CHECK_IN',
                  reason: payload['reason']?.toString() ?? payload['reason_text']?.toString() ?? '',
                  status: leaveStatus,
                  statusState: state,
                  currentStage: payload['current_stage']?.toString() ?? 'MANAGER_REVIEW',
                  managerComment: payload['manager_comment']?.toString(),
                  hrComment: payload['hr_comment']?.toString(),
                  createdAt: DateTime.tryParse(row['created_at']?.toString() ?? '') ?? DateTime.now(),
                ));
              }
            }
          }
        }
      } catch (outboxErr) {
        secureLog('[Attendance] outbox regularization fetch notice: $outboxErr');
      }

      return requests;
    } catch (e) {
      secureLog('[Attendance] getRegularizationRequests error: $e');
      return [];
    }
  }

  @override
  Future<RegularizationRequestModel> submitRegularization(
    RegularizationRequestModel request,
  ) async {
    try {
      if (SupabaseConfig.isConfigured) {
        final user = UserService.instance.currentUser;
        final tenantId = user.companyId.isNotEmpty ? user.companyId : 'org-joy-01';
        final nowStr = DateTime.now().toIso8601String();
        final dateStr = request.date.toIso8601String().split('T')[0];

        // 1. Try RPC submission
        try {
          await _client.rpc('fn_submit_attendance_regularization', params: {
            'p_tenant_id': tenantId,
            'p_employee_id': user.dataId.isNotEmpty ? user.dataId : user.employeeId,
            'p_date': dateStr,
            'p_requested_in': request.requestedInTime,
            'p_requested_out': request.requestedOutTime,
            'p_reason_code': request.reasonCode,
            'p_reason_text': request.reason,
            'p_actor_id': user.dataId,
          });
          secureLog('[Attendance] RPC fn_submit_attendance_regularization succeeded');
          return request;
        } catch (rpcErr) {
          secureLog('[Attendance] RPC fallback to realtime outbox: $rpcErr');
        }

        // 2. Direct Outbox Mesh Insert
        final payload = {
          'id': request.id,
          'tenant_id': tenantId,
          'organization_id': tenantId,
          'employee_id': user.dataId,
          'employee_code': user.employeeId,
          'employee_name': user.name,
          'department': user.department,
          'attendance_date': dateStr,
          'shift_name': request.shiftName,
          'shift_window': request.shiftWindow,
          'original_check_in': request.originalInTime,
          'original_check_out': request.originalOutTime,
          'original_status': request.originalStatus ?? 'ABSENT',
          'original_source': 'MOBILE_GPS',
          'requested_check_in': request.requestedInTime,
          'requested_check_out': request.requestedOutTime,
          'reason_code': request.reasonCode,
          'reason': request.reason,
          'status': 'MANAGER_PENDING',
          'current_stage': 'MANAGER_REVIEW',
          'manager_id': user.reportsToId?.isNotEmpty == true ? user.reportsToId! : 'emp-hr-001',
          'manager_name': user.reportsToName?.isNotEmpty == true ? user.reportsToName! : 'Haripriya (HR Head)',
          'timeline': [
            {
              'stage': 'SUBMITTED',
              'timestamp': nowStr,
              'actor': user.name,
              'action': 'REQUEST_SUBMITTED',
              'note': request.reason,
            }
          ],
          'created_at': nowStr,
          'updated_at': nowStr,
        };

        await _client.from('realtime_outbox').insert({
          'tenant_id': tenantId,
          'organization_id': tenantId,
          'entity_type': 'attendance_regularization_requests',
          'entity_id': request.id,
          'event_type': 'regularization.submitted',
          'actor_id': user.dataId,
          'payload': payload,
        });

        secureLog('[Attendance] Regularization outbox event created for ${request.id}');
        return request;
      }
    } catch (e) {
      secureLog('[Attendance] submitRegularization insert failed: $e');
      rethrow;
    }
    return request;
  }

  // ────────────────────────────────────────────────────────────────────────
  // ATTENDANCE DEVIATIONS (LATE / EARLY / MISSING PUNCH)
  // ────────────────────────────────────────────────────────────────────────

  @override
  Future<List<AttendanceDeviationModel>> getAttendanceDeviations(
    String employeeId,
  ) async {
    try {
      if (!SupabaseConfig.isConfigured) return [];

      final user = UserService.instance.currentUser;
      final targetId = user.dataId.isNotEmpty ? user.dataId : employeeId;
      final targetCode = user.employeeId;

      List<AttendanceDeviationModel> list = [];

      // 1. Fetch from attendance_daily rows
      try {
        final dailyRows = await withTimeout(
          _client
              .from('attendance_daily')
              .select('*')
              .or('employee_id.eq.$targetId,employee_code.eq.$targetCode')
              .order('date', ascending: false)
              .limit(30),
        );

        for (final row in dailyRows) {
          final firstIn = row['first_check_in']?.toString();
          final lastOut = row['last_check_out']?.toString();
          final dateStr = row['date']?.toString() ?? DateTime.now().toIso8601String().split('T')[0];
          final dateParsed = DateTime.tryParse(dateStr) ?? DateTime.now();

          final schedInMins = _parseTimeToMinutes(row['expected_check_in']?.toString()) ?? 570; // 09:30 AM
          final schedOutMins = _parseTimeToMinutes(row['expected_check_out']?.toString()) ?? 1110; // 06:30 PM
          final actualInMins = _parseTimeToMinutes(firstIn);
          final actualOutMins = _parseTimeToMinutes(lastOut);

          int lateMins = 0;
          int earlyMins = 0;

          if (actualInMins != null && actualInMins > schedInMins) {
            lateMins = actualInMins - schedInMins;
          }

          if (actualOutMins != null && actualOutMins < schedOutMins) {
            earlyMins = schedOutMins - actualOutMins;
          }

          String? devType;
          if (firstIn == null && lastOut == null) {
            devType = 'MISSING_ATTENDANCE';
          } else if (firstIn == null) {
            devType = 'MISSING_CHECK_IN';
          } else if (lastOut == null && dateParsed.isBefore(DateTime.now())) {
            devType = 'MISSING_CHECK_OUT';
          } else if (lateMins > 10 && earlyMins > 10) {
            devType = 'LATE_EARLY';
          } else if (lateMins > 10) {
            devType = 'LATE';
          } else if (earlyMins > 10) {
            devType = 'EARLY';
          }

          if (devType != null) {
            final isRegularized = row['status'] == 'Regularized' || row['source'] == 'REGULARIZATION';
            list.add(AttendanceDeviationModel(
              id: 'dev-$targetId-$dateStr-$devType',
              employeeId: targetId,
              employeeName: user.name,
              department: user.department,
              date: dateParsed,
              shiftCode: row['shift_code']?.toString() ?? 'GEN-09',
              shiftName: row['shift_name']?.toString() ?? 'General Shift',
              scheduledIn: row['expected_check_in']?.toString() ?? '09:30 AM',
              actualIn: firstIn != null ? _formatTimeString(firstIn) : null,
              lateMinutes: lateMins,
              lateGraceMinutes: 10,
              payableLateMinutes: lateMins > 10 ? lateMins - 10 : 0,
              scheduledOut: row['expected_check_out']?.toString() ?? '06:30 PM',
              actualOut: lastOut != null ? _formatTimeString(lastOut) : null,
              earlyMinutes: earlyMins,
              earlyGraceMinutes: 10,
              payableEarlyMinutes: earlyMins > 10 ? earlyMins - 10 : 0,
              deviationType: devType,
              status: isRegularized ? 'REGULARIZED' : 'DETECTED',
              payrollDeductionDays: isRegularized ? 0.0 : (lateMins > 120 ? 0.5 : 0.0),
            ));
          }
        }
      } catch (e) {
        secureLog('[Attendance] getAttendanceDeviations daily query error: $e');
      }

      return list;
    } catch (e) {
      secureLog('[Attendance] getAttendanceDeviations error: $e');
      return [];
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // ACTIONABLE ATTENDANCE EXCEPTIONS (MISSING CHECK-OUT, GPS, ETC.)
  // ────────────────────────────────────────────────────────────────────────

  @override
  Future<List<AttendanceExceptionModel>> getActionableAttendanceExceptions(
    String employeeId,
  ) async {
    try {
      if (!SupabaseConfig.isConfigured) return [];

      final user = UserService.instance.currentUser;
      final targetId = user.dataId.isNotEmpty ? user.dataId : employeeId;
      final targetCode = user.employeeId;

      List<AttendanceExceptionModel> list = [];

      // 1. Fetch from attendance_exceptions table if exists
      try {
        final rows = await withTimeout(
          _client
              .from('attendance_exceptions')
              .select('*')
              .or('employee_id.eq.$targetId,employee_code.eq.$targetCode')
              .neq('status', 'RESOLVED')
              .neq('status', 'DISMISSED')
              .order('work_date', ascending: false)
              .limit(10),
        );

        for (final row in rows) {
          final excType = row['exception_type']?.toString() ?? '';
          // Only return employee-actionable exceptions (do not expose internal unmapped PINs or hardware device logs)
          if (excType == 'MISSING_CHECK_OUT' ||
              excType == 'MISSING_CHECK_IN' ||
              excType == 'GPS_OUTSIDE_GEOFENCE' ||
              excType == 'GPS_LOW_ACCURACY') {
            list.add(AttendanceExceptionModel.fromJson(row));
          }
        }
      } catch (e) {
        secureLog('[Attendance] getActionableAttendanceExceptions query notice: $e');
      }

      // 2. Derive missing checkout exception from recent attendance_daily if not explicitly stored
      if (list.isEmpty) {
        try {
          final todayStr = DateTime.now().toIso8601String().split('T')[0];
          final dailyRows = await withTimeout(
            _client
                .from('attendance_daily')
                .select('*')
                .or('employee_id.eq.$targetId,employee_code.eq.$targetCode')
                .lt('date', todayStr)
                .order('date', ascending: false)
                .limit(5),
          );

          for (final row in dailyRows) {
            final firstIn = row['first_check_in']?.toString();
            final lastOut = row['last_check_out']?.toString();
            final dateStr = row['date']?.toString() ?? '';
            final status = row['status']?.toString() ?? '';

            if (firstIn != null && (lastOut == null || lastOut.isEmpty) && status != 'Regularized') {
              list.add(
                AttendanceExceptionModel(
                  id: 'exc-missout-$dateStr',
                  exceptionType: 'MISSING_CHECK_OUT',
                  severity: 'HIGH',
                  status: 'EMPLOYEE_ACTION_REQUIRED',
                  workDate: dateStr,
                  title: 'Missing Shift Check-Out',
                  description: 'You checked in at ${_formatTimeString(firstIn)} but no check-out was recorded for this shift.',
                  suggestedAction: 'Regularize Attendance',
                  actualIn: _formatTimeString(firstIn),
                  actualOut: null,
                ),
              );
              break;
            }
          }
        } catch (_) {}
      }

      return list;
    } catch (e) {
      secureLog('[Attendance] getActionableAttendanceExceptions error: $e');
      return [];
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // INTERNALS
  // ────────────────────────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> _monthQuery(
    String employeeId, {
    int? month,
    int? year,
  }) async {
    final now = DateTime.now();
    final m = month ?? now.month;
    final y = year ?? now.year;
    final lastDay = DateTime(y, m + 1, 0).day;

    final user = UserService.instance.currentUser;
    final targetId = user.employeeUuid?.isNotEmpty == true ? user.employeeUuid! : employeeId;
    final orFilter = <String>{
      'employee_id.eq.$targetId',
      if (user.employeeId.isNotEmpty) 'employee_code.eq.${user.employeeId}',
      if (user.employeeId.isNotEmpty) 'employee_id.eq.${user.employeeId}',
      if (user.employeeUuid?.isNotEmpty == true) 'employee_id.eq.${user.employeeUuid}',
    }.join(',');

    final data = await withTimeout(
      _client
          .from('attendance_daily')
          .select()
          .or(orFilter)
          .gte('date', '$y-${m.toString().padLeft(2, '0')}-01')
          .lte('date', '$y-${m.toString().padLeft(2, '0')}-$lastDay')
          .order('date', ascending: true),
    );
    return List<Map<String, dynamic>>.from(data);
  }

  TimesheetEntryModel _mapDailyRow(Map<String, dynamic> row) {
    final date = DateTime.tryParse(row['date'].toString()) ?? DateTime.now();
    final netMins = (row['net_working_minutes'] as num?)?.toInt() ?? 0;
    return TimesheetEntryModel(
      id: row['id']?.toString() ?? 'ts-${date.millisecondsSinceEpoch}',
      date: date,
      clockInTime: row['first_check_in'] != null
          ? AttendanceTimeService.formatAttendanceTime(row['first_check_in'])
          : null,
      clockOutTime: row['last_check_out'] != null
          ? AttendanceTimeService.formatAttendanceTime(row['last_check_out'])
          : null,
      totalHours: netMins > 0 ? _formatDuration(netMins) : '-',
      status: _parseStatus(row['status']),
      source: _prettySource(row['source']?.toString()),
    );
  }

  static DayAttendanceStatus _parseStatus(dynamic raw) {
    final s = (raw ?? '').toString().toUpperCase().replaceAll(' ', '_');
    switch (s) {
      case 'PRESENT':
      case 'P':
        return DayAttendanceStatus.present;
      case 'HALF_DAY_PRESENT':
      case 'HALF_DAY':
      case 'HD':
        return DayAttendanceStatus.halfDayPresent;
      case 'HALF_DAY_ABSENT':
        return DayAttendanceStatus.halfDayAbsent;
      case 'ABSENT':
      case 'A':
        return DayAttendanceStatus.absent;
      case 'LEAVE':
      case 'ON_LEAVE':
      case 'L':
        return DayAttendanceStatus.leave;
      case 'HOLIDAY':
      case 'H':
        return DayAttendanceStatus.holiday;
      case 'WEEKLY_OFF':
      case 'WEEK_OFF':
      case 'WO':
      case 'OFF':
        return DayAttendanceStatus.weekOff;
      case 'LATE':
        return DayAttendanceStatus.late;
      case 'REGULARIZED':
      case 'REGULARIZATION':
        return DayAttendanceStatus.regularized;
      default:
        return DayAttendanceStatus.present;
    }
  }

  static int? _parseTimeToMinutes(String? timeStr) {
    if (timeStr == null || timeStr.isEmpty || timeStr == '—' || timeStr == 'null') return null;
    final match = RegExp(r'(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?', caseSensitive: false).firstMatch(timeStr.trim());
    if (match == null) return null;

    int hours = int.tryParse(match.group(1) ?? '') ?? 0;
    final minutes = int.tryParse(match.group(2) ?? '') ?? 0;
    final ampm = match.group(3)?.toUpperCase();

    if (ampm == 'PM' && hours < 12) hours += 12;
    if (ampm == 'AM' && hours == 12) hours = 0;

    return hours * 60 + minutes;
  }

  /// "14:30" / "14:30:00" / ISO datetime → "02:30 PM" (IST)
  static String _formatTimeString(String raw) {
    return AppDateTime.formatTimeIST(raw);
  }

  /// 557 minutes → "09h 17m"
  static String _formatDuration(int minutes) {
    final h = minutes ~/ 60;
    final m = minutes % 60;
    return '${h.toString().padLeft(2, '0')}h ${m.toString().padLeft(2, '0')}m';
  }

  static String _prettySource(String? raw) {
    switch ((raw ?? '').toString().toUpperCase()) {
      case 'MOBILE':
      case 'MOBILE_GPS':
      case 'APP':
        return 'Mobile Geofence';
      case 'BIOMETRIC':
      case 'DEVICE':
        return 'Biometric';
      case 'WEB':
        return 'Web';
      default:
        return raw?.isNotEmpty == true ? raw! : 'Mobile Geofence';
    }
  }
}
