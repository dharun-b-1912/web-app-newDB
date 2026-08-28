// attendance_timezone_contract_test.dart
// ============================================================================
// WorkForceOS — Authoritative Timezone & Attendance Pipeline Contract Tests
// ============================================================================

import 'package:flutter_test/flutter_test.dart';
import 'package:workforce_os/core/services/attendance_time_service.dart';

void main() {
  group('WorkForceOS Attendance Timezone & Contract Suite', () {
    test('1. Authoritative UTC to Asia/Kolkata (IST) conversion for check-in', () {
      const rawInUtc = '2026-08-25T09:42:41.780231+00:00';
      final parsed = AttendanceTimeService.parseServerTimestamp(rawInUtc);
      expect(parsed, isNotNull);
      expect(parsed!.hour, 15);
      expect(parsed.minute, 12);
      expect(parsed.second, 41);

      final formatted = AttendanceTimeService.formatAttendanceTime(rawInUtc, withSeconds: true);
      expect(formatted, '03:12:41 PM');
    });

    test('2. Authoritative UTC to Asia/Kolkata (IST) conversion for check-out', () {
      const rawOutUtc = '2026-08-25T07:04:32.174602+00:00';
      final parsed = AttendanceTimeService.parseServerTimestamp(rawOutUtc);
      expect(parsed, isNotNull);
      expect(parsed!.hour, 12);
      expect(parsed.minute, 34);
      expect(parsed.second, 32);

      final formatted = AttendanceTimeService.formatAttendanceTime(rawOutUtc, withSeconds: true);
      expect(formatted, '12:34:32 PM');
    });

    test('3. ISO 8601 UTC string parsing with Z suffix', () {
      const rawIso = '2026-08-25T09:42:41Z';
      final formatted = AttendanceTimeService.formatAttendanceTime(rawIso, withSeconds: true);
      expect(formatted, '03:12:41 PM');
    });

    test('4. Plain TIME strings format preservation and conversion', () {
      const rawTime24 = '15:12:41';
      final formatted24 = AttendanceTimeService.formatAttendanceTime(rawTime24, withSeconds: true);
      expect(formatted24, '03:12:41 PM');

      const rawTime12 = '03:12 PM';
      final formatted12 = AttendanceTimeService.formatAttendanceTime(rawTime12);
      expect(formatted12, '03:12 PM');
    });

    test('5. Business Date determination across UTC midnight boundary in IST', () {
      // 20:30 UTC on 24th Aug is 02:00 AM on 25th Aug in Asia/Kolkata
      final lateNightUtc = DateTime.utc(2026, 8, 24, 20, 30, 0);
      final businessDate = AttendanceTimeService.getBusinessDate(lateNightUtc);
      expect(businessDate, '2026-08-25');
    });

    test('6. Worked duration calculation and formatting', () {
      final checkIn = DateTime(2026, 8, 25, 9, 30, 0);
      final checkOut = DateTime(2026, 8, 25, 18, 0, 0);

      final duration = AttendanceTimeService.calculateDuration(
        checkIn: checkIn,
        checkOut: checkOut,
        breakMinutes: 45,
      );

      // 8.5 hours (510 mins) - 45 mins break = 465 mins = 7 hours 45 mins
      expect(duration.inMinutes, 465);
      expect(AttendanceTimeService.formatDurationReadable(duration), '7h 45m');
      expect(AttendanceTimeService.formatDurationTimer(duration), '07:45:00');
    });

    test('7. Null and invalid timestamp fallback safety', () {
      expect(AttendanceTimeService.formatAttendanceTime(null), '—');
      expect(AttendanceTimeService.formatAttendanceTime(''), '—');
      expect(AttendanceTimeService.formatAttendanceTime('null'), '—');
      expect(AttendanceTimeService.formatAttendanceDate(null), '—');
    });
  });
}
