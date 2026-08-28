import 'package:flutter_test/flutter_test.dart';
import 'package:workforce_os/core/services/document_upload_service.dart';
import 'package:workforce_os/core/services/employee_profile_mapper.dart';
import 'package:workforce_os/core/utils/app_date_time.dart';

void main() {
  group('Phase 5 — Attendance Timezone & IST Verification', () {
    test('UTC 12:00:00 converts accurately to IST 05:30 PM (17:30)', () {
      const utcIso = '2026-08-25T12:00:00Z';
      final istDt = AppDateTime.parseToIST(utcIso);

      expect(istDt, isNotNull);
      expect(istDt!.hour, equals(17));
      expect(istDt.minute, equals(30));

      final formatted = AppDateTime.formatTimeIST(utcIso);
      expect(formatted, equals('05:30 PM'));
    });

    test('Postgres timestamptz string space-separated formats accurately', () {
      const postgresTz = '2026-08-25 04:00:00+00';
      final istDt = AppDateTime.parseToIST(postgresTz);

      expect(istDt, isNotNull);
      expect(istDt!.hour, equals(9));
      expect(istDt.minute, equals(30));

      final formatted = AppDateTime.formatTimeIST(postgresTz);
      expect(formatted, equals('09:30 AM'));
    });

    test('Plain TIME strings format accurately as business IST time', () {
      expect(AppDateTime.formatTimeIST('09:30:00'), equals('09:30 AM'));
      expect(AppDateTime.formatTimeIST('18:30:00'), equals('06:30 PM'));
    });

    test('Duration timer calculations are consistent', () {
      final inTime = DateTime(2026, 8, 25, 9, 30);
      final outTime = DateTime(2026, 8, 25, 18, 30);
      final duration = AppDateTime.elapsed(inTime, outTime);

      expect(duration.inHours, equals(9));
      expect(AppDateTime.formatDuration(duration), equals('09:00:00'));
    });
  });

  group('Phase 5 — Employee Profile & Shift Realtime Mapping', () {
    test('Maps shift correctly from top-level and employment JSONB', () {
      final row = {
        'id': 'emp-uuid-1',
        'first_name': 'Haripriya',
        'last_name': 'N',
        'display_name': 'Haripriya N',
        'employment': {
          'shift_name': 'Morning Shift',
          'shift_start_time': '08:00:00',
          'shift_end_time': '17:00:00',
          'department_name': 'Technology',
          'designation_title': 'Lead Software Engineer',
        },
      };

      final user = EmployeeProfileMapper.fromEmployeesRow(row);
      expect(user.shift, equals('Morning Shift (08:00 AM - 05:00 PM)'));
      expect(user.department, equals('Technology'));
      expect(user.designation, equals('Lead Software Engineer'));
    });

    test('Maps nested shift object format', () {
      final row = {
        'id': 'emp-uuid-2',
        'first_name': 'Alexander',
        'last_name': 'Wright',
        'shift': {
          'name': 'Night Shift',
          'start_time': '20:00:00',
          'end_time': '05:00:00',
        },
      };

      final user = EmployeeProfileMapper.fromEmployeesRow(row);
      expect(user.shift, equals('Night Shift (08:00 PM - 05:00 AM)'));
    });
  });

  group('Phase 5 — Document Storage & Path Design', () {
    test('extractStoragePath cleans path correctly', () {
      final service = DocumentUploadService.instance;
      expect(
        service.extractStoragePath('storage://employee-documents/tenant1/emp1/KYC/doc.pdf'),
        equals('tenant1/emp1/KYC/doc.pdf'),
      );
      expect(
        service.extractStoragePath('https://supabase.co/storage/v1/object/public/employee-documents/tenant1/emp1/KYC/doc.pdf?v=1'),
        equals('tenant1/emp1/KYC/doc.pdf'),
      );
    });
  });
}
