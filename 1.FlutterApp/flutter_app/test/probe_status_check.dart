// ignore_for_file: avoid_print, unused_local_variable
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  test('Probe attendance_daily_status_check values', () async {
    final client = SupabaseClient(
      'https://wmqjmyzzamgxyeuotbki.supabase.co',
      'sb_publishable_gKFzBDfNlQk5OkjhKAeBvQ_BraH24xv',
    );

    print('\n================== STATUS CHECK CONSTRAINT PROBE ==================');
    // Let's test direct insert with various statuses to see which one succeeds or what the error message says
    final candidateStatuses = [
      'present',
      'Present',
      'PRESENT',
      'P',
      'active',
      'Active',
      'ACTIVE',
      'on_time',
      'On Time',
      'ON_TIME',
      'normal',
      'IN',
    ];

    for (final st in candidateStatuses) {
      try {
        // Let's test by inserting directly with different statuses
        final res = await client.from('attendance_daily').insert({
          'id': 'probe-status-$st',
          'organization_id': 'org-joy-01',
          'company_id': 'comp-joy-01',
          'employee_id': 'emp-admin-001',
          'employee_name': 'Dharun B',
          'employee_code': 'JCS-017',
          'date': '2099-01-01',
          'status': st,
          'source': 'MOBILE',
        }).select();
        print('  STATUS: "$st" -> SUCCESS!');
        await client.from('attendance_daily').delete().eq('id', 'probe-status-$st');
        break;
      } catch (e) {
        print('  STATUS: "$st" -> REJECTED: $e');
      }
    }
    print('===================================================================\n');
  });
}
