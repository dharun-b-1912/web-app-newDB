import 'package:flutter_test/flutter_test.dart';
import 'package:workforce_os/core/services/employee_profile_mapper.dart';
import 'package:workforce_os/core/services/document_upload_service.dart';
import 'package:workforce_os/core/utils/app_date_time.dart';
import 'package:workforce_os/models/employee_models.dart';
import 'package:workforce_os/models/hrms_models.dart';
import 'package:workforce_os/repositories/supabase/supabase_leave_repository.dart';
import 'package:workforce_os/repositories/supabase/supabase_more_modules_repository.dart';

void main() {
  group('Realtime Sync & Data Mapping Verification', () {
    test('Web to Mobile: Employee Profile Realtime Row Transformation', () {
      final postgresEmployeePayload = {
        'id': 'emp-joy-101',
        'employee_code': 'JOY-2026-001',
        'first_name': 'Aravind',
        'last_name': 'Kumar',
        'display_name': 'Aravind Kumar',
        'work_email': 'aravind.k@joycorporate.com',
        'avatar_url': 'https://storage.supabase.co/avatars/aravind.png',
        'status': 'Active',
        'employment_type': 'Full-Time',
        'profile': {
          'phone': '+91 9876543210',
          'gender': 'Male',
          'dob': '1995-06-15',
          'marital_status': 'Single',
          'blood_group': 'O+',
          'current_address': 'Coimbatore, Tamil Nadu, India',
          'emergency_contact': {
            'name': 'Suresh Kumar',
            'relationship': 'Father',
            'phone': '+91 9876500000',
          },
        },
        'employment': {
          'department_name': 'Engineering & AI',
          'designation_title': 'Principal Solutions Architect',
          'joining_date': '2023-01-10',
          'reporting_manager_name': 'Sundar Pichai',
          'shift_name': 'General Shift',
          'shift_start_time': '09:00:00',
          'shift_end_time': '18:00:00',
          'work_location': 'Joy Tech Park, Tower A',
        },
      };

      final UserModel mappedUser = EmployeeProfileMapper.fromEmployeesRow(postgresEmployeePayload);

      expect(mappedUser.employeeUuid, equals('emp-joy-101'));
      expect(mappedUser.employeeId, equals('JOY-2026-001'));
      expect(mappedUser.name, equals('Aravind Kumar'));
      expect(mappedUser.officeEmail, equals('aravind.k@joycorporate.com'));
      expect(mappedUser.department, equals('Engineering & AI'));
      expect(mappedUser.designation, equals('Principal Solutions Architect'));
      expect(mappedUser.contactNumber, equals('+91 9876543210'));
      expect(mappedUser.reportsToName, equals('Sundar Pichai'));
      expect(mappedUser.shift, equals('General Shift (09:00 AM - 06:00 PM)'));
    });

    test('Realtime Shift Roster: Web Matrix Multi-Shift Resolver', () async {
      final repo = SupabaseMoreModulesRepository();
      
      // Test when no DB is configured (clean fallback week with Saturday/Sunday off)
      final roster = await repo.getShiftRoster('emp-joy-101');
      expect(roster.length, equals(7));
      
      // Mon to Fri should not be off-day, Sat & Sun should be off-day
      expect(roster[5].isOffDay, isTrue); // Saturday
      expect(roster[5].shiftName, equals('Weekly Off'));
      expect(roster[6].isOffDay, isTrue); // Sunday
      expect(roster[6].shiftName, equals('Weekly Off'));
    });

    test('Realtime Attendance Sync: IST Conversion and Duration Accuracy', () {
      const punchInUtc = '2026-08-25T03:30:00Z'; // 09:00 AM IST
      const punchOutUtc = '2026-08-25T12:30:00Z'; // 06:00 PM IST

      final istIn = AppDateTime.parseToIST(punchInUtc);
      final istOut = AppDateTime.parseToIST(punchOutUtc);

      expect(istIn, isNotNull);
      expect(istOut, isNotNull);
      expect(AppDateTime.formatTimeIST(punchInUtc), equals('09:00 AM'));
      expect(AppDateTime.formatTimeIST(punchOutUtc), equals('06:00 PM'));

      final duration = AppDateTime.elapsed(istIn!, istOut!);
      expect(duration.inHours, equals(9));
      expect(AppDateTime.formatDuration(duration), equals('09:00:00'));
    });

    test('Realtime Leave Synchronization: Leave Type & Balance Calculations', () {
      const balanceModel = LeaveBalanceModel(
        casualAvailable: 12.0,
        casualUsed: 3.0,
        sickAvailable: 8.0,
        sickUsed: 1.0,
        earnedAvailable: 15.0,
        earnedUsed: 5.0,
        items: [
          DynamicLeaveBalanceItem(
            leaveTypeCode: 'CL',
            leaveTypeName: 'Casual Leave',
            available: 12.0,
            used: 3.0,
          ),
          DynamicLeaveBalanceItem(
            leaveTypeCode: 'SL',
            leaveTypeName: 'Sick Leave',
            available: 8.0,
            used: 1.0,
          ),
        ],
      );

      expect(balanceModel.casualAvailable, equals(12.0));
      expect(balanceModel.casualUsed, equals(3.0));
      expect(balanceModel.sickAvailable, equals(8.0));
      expect(balanceModel.sickUsed, equals(1.0));
      expect(balanceModel.earnedAvailable, equals(15.0));
      expect(balanceModel.earnedUsed, equals(5.0));
      expect(balanceModel.items.length, equals(2));
    });

    test('Leave Status & Type Parsing from Database', () {
      expect(SupabaseLeaveRepository.parseLeaveType('Casual Leave'), equals(LeaveType.casual));
      expect(SupabaseLeaveRepository.parseLeaveType('Sick Leave (SL)'), equals(LeaveType.sick));
      expect(SupabaseLeaveRepository.parseLeaveType('Earned Leave'), equals(LeaveType.earned));
      expect(SupabaseLeaveRepository.parseLeaveType('Maternity Leave'), equals(LeaveType.maternity));
      expect(SupabaseLeaveRepository.parseLeaveType('Paternity Leave'), equals(LeaveType.paternity));
    });

    test('Storage Bucket & Document Path Sanitization for KYC / Docs', () {
      final docService = DocumentUploadService.instance;
      
      const rawUrl1 = 'https://wmqjmyzzamgxyeuotbki.supabase.co/storage/v1/object/public/employee-documents/org-01/emp-101/PAN_Card.pdf';
      final cleanPath1 = docService.extractStoragePath(rawUrl1);
      expect(cleanPath1, equals('org-01/emp-101/PAN_Card.pdf'));

      const rawSchemePath = 'storage://employee-documents/org-01/emp-101/Offer_Letter.pdf';
      final cleanPath2 = docService.extractStoragePath(rawSchemePath);
      expect(cleanPath2, equals('org-01/emp-101/Offer_Letter.pdf'));
    });

    test('Task Model & Status Synchronization Serialization', () {
      final taskModel = TaskModel(
        id: 'task-sync-99',
        title: 'Complete Security Training',
        description: 'Complete mandatory compliance training module',
        priority: TaskPriority.urgent,
        status: TaskStatus.inProgress,
        dueDate: DateTime(2026, 8, 30),
        progressPercent: 50,
      );

      expect(taskModel.id, equals('task-sync-99'));
      expect(taskModel.priority, equals(TaskPriority.urgent));
      expect(taskModel.status, equals(TaskStatus.inProgress));
      expect(taskModel.dueDate, equals(DateTime(2026, 8, 30)));
    });
  });
}
