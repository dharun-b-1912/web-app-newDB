import 'package:supabase_flutter/supabase_flutter.dart';
import '../../models/hrms_models.dart';
import '../utils/query_timeout.dart';
import '../utils/secure_log.dart';
import 'employee_profile_mapper.dart';

/// State machine states for the Canonical Employee Identity Resolver
enum IdentityResolutionState {
  initial,
  authenticating,
  authenticated,
  resolvingEmployee,
  employeeResolved,
  loadingProfile,
  ready,
  // Failure states
  authFailed,
  appUserMappingMissing,
  employeeRecordMissing,
  accessDenied,
  identityConflict,
  networkError,
}

/// The result returned by EmployeeIdentityResolver
class IdentityResolutionResult {
  final bool success;
  final IdentityResolutionState state;
  final String? employeeUuid;
  final Map<String, dynamic>? employeeData;
  final UserModel? userModel;
  final String? role;
  final String? errorMessage;
  final String? safeDiagnosticInfo;

  const IdentityResolutionResult({
    required this.success,
    required this.state,
    this.employeeUuid,
    this.employeeData,
    this.userModel,
    this.role,
    this.errorMessage,
    this.safeDiagnosticInfo,
  });

  factory IdentityResolutionResult.success({
    required String employeeUuid,
    required Map<String, dynamic> employeeData,
    required UserModel userModel,
    required String role,
  }) {
    return IdentityResolutionResult(
      success: true,
      state: IdentityResolutionState.ready,
      employeeUuid: employeeUuid,
      employeeData: employeeData,
      userModel: userModel,
      role: role,
    );
  }

  factory IdentityResolutionResult.failure({
    required IdentityResolutionState state,
    required String errorMessage,
    String? safeDiagnosticInfo,
  }) {
    return IdentityResolutionResult(
      success: false,
      state: state,
      errorMessage: errorMessage,
      safeDiagnosticInfo: safeDiagnosticInfo,
    );
  }
}

/// Canonical Employee Identity Resolver
///
/// Implements verified identity chain:
///   auth.uid()
///        ↓
///   app_users.auth_user_id  (primary)
///   employee_auth_identity.auth_user_id (legacy fallback)
///        ↓
///   Conflict Detection (if both exist & disagree -> block login)
///        ↓
///   employee UUID
///        ↓
///   employees (lookup by UUID primary key)
///        ↓
///   Status Validation (active check)
///        ↓
///   UserModel
class EmployeeIdentityResolver {
  /// Inactive statuses that disallow mobile application access
  static const Set<String> _disallowedStatuses = {
    'inactive',
    'terminated',
    'blocked',
    'suspended',
    'resigned',
    'disabled',
    'archived',
    'pending_termination',
  };

  /// Resolves the authenticated Supabase user into a verified UserModel.
  static Future<IdentityResolutionResult> resolve({
    required SupabaseClient client,
    required String authUid,
    String? authEmail,
    String? authAvatarUrl,
  }) async {
    try {
      secureLog('[Identity] Starting identity resolution for auth_user_id=$authUid');

      String? appUserEmployeeId;
      String? resolvedRole;
      String? appUserStatus;

      // 1. Primary: Look up app_users mapping
      try {
        final appUser = await withTimeout(
          client
              .from('app_users')
              .select('id, employee_id, email, name, avatar_url, roles, status')
              .eq('auth_user_id', authUid)
              .maybeSingle(),
        );

        if (appUser != null && appUser['employee_id'] != null) {
          final idStr = appUser['employee_id'].toString().trim();
          if (idStr.isNotEmpty) {
            appUserEmployeeId = idStr;
            appUserStatus = appUser['status']?.toString();
            // Resolve role from roles array or role string
            if (appUser['roles'] is List && (appUser['roles'] as List).isNotEmpty) {
              resolvedRole = (appUser['roles'] as List).first.toString();
            } else if (appUser['role'] != null) {
              resolvedRole = appUser['role'].toString();
            }
            secureLog('[Identity] app_users found -> employee_id=$appUserEmployeeId, role=$resolvedRole');
          }
        }
      } catch (e) {
        secureLog('[Identity] app_users query warning: $e');
      }

      // 2. Legacy fallback: Look up employee_auth_identity / employee_auth_identities if app_users missing
      String? legacyEmployeeId;
      if (appUserEmployeeId == null) {
        for (final table in const ['employee_auth_identity', 'employee_auth_identities']) {
          try {
            final legacy = await withTimeout(
              client
                  .from(table)
                  .select('employee_id')
                  .eq('auth_user_id', authUid)
                  .maybeSingle(),
            );

            if (legacy != null && legacy['employee_id'] != null) {
              final idStr = legacy['employee_id'].toString().trim();
              if (idStr.isNotEmpty) {
                legacyEmployeeId = idStr;
                secureLog('[Identity] $table found -> employee_id=$legacyEmployeeId');
                break;
              }
            }
          } catch (e) {
            secureLog('[Identity] $table query notice: $e');
          }
        }
      }

      // 3. Identity Conflict Detection
      if (appUserEmployeeId != null &&
          legacyEmployeeId != null &&
          appUserEmployeeId != legacyEmployeeId) {
        secureLog('[Identity] CONFLICT DETECTED: app_users=$appUserEmployeeId vs legacy=$legacyEmployeeId');
        return IdentityResolutionResult.failure(
          state: IdentityResolutionState.identityConflict,
          errorMessage: 'Security conflict in employee identity mappings. Please contact HR.',
          safeDiagnosticInfo: 'Identity conflict between app_users and employee_auth_identity',
        );
      }

      // 4. Determine final mapped employee UUID
      final resolvedEmployeeUuid = appUserEmployeeId ?? legacyEmployeeId;
      if (resolvedEmployeeUuid == null || resolvedEmployeeUuid.isEmpty) {
        secureLog('[Identity] No mapping found in app_users or employee_auth_identity for auth_user_id=$authUid');
        return IdentityResolutionResult.failure(
          state: IdentityResolutionState.appUserMappingMissing,
          errorMessage: 'Your account is authenticated, but no employee profile was found. Please contact HR.',
          safeDiagnosticInfo: 'No identity mapping found for auth_user_id',
        );
      }

      // 5. Query employees table by UUID primary key (never by email)
      secureLog('[Identity] Querying employees table for id=$resolvedEmployeeUuid');
      final empRecord = await withTimeout(
        client
            .from('employees')
            .select()
            .eq('id', resolvedEmployeeUuid)
            .maybeSingle(),
      );

      if (empRecord == null) {
        secureLog('[Identity] Employee record missing for id=$resolvedEmployeeUuid');
        return IdentityResolutionResult.failure(
          state: IdentityResolutionState.employeeRecordMissing,
          errorMessage: 'Employee profile record not found in system. Please contact HR.',
          safeDiagnosticInfo: 'Employee row not found for resolved UUID',
        );
      }

      // 6. Employee Status Validation
      final empStatus = (empRecord['status']?.toString() ?? 'active').toLowerCase().trim();
      final userAppStatus = (appUserStatus ?? 'active').toLowerCase().trim();

      if (_disallowedStatuses.contains(empStatus) || _disallowedStatuses.contains(userAppStatus)) {
        secureLog('[Identity] Access Denied: Employee status is inactive/blocked ($empStatus / $userAppStatus)');
        return IdentityResolutionResult.failure(
          state: IdentityResolutionState.accessDenied,
          errorMessage: 'Your employee account is not currently active. Please contact HR.',
          safeDiagnosticInfo: 'Employee status is $empStatus',
        );
      }

      // 7. Fetch statutory, bank account, and emergency contacts if available
      Map<String, dynamic>? statutory;
      try {
        statutory = await withTimeout(
          client
              .from('employee_statutory_details')
              .select()
              .eq('employee_id', resolvedEmployeeUuid)
              .maybeSingle(),
        );
      } catch (e) {
        secureLog('[Identity] employee_statutory_details notice: $e');
      }

      Map<String, dynamic>? bankAccount;
      try {
        bankAccount = await withTimeout(
          client
              .from('employee_bank_accounts')
              .select()
              .eq('employee_id', resolvedEmployeeUuid)
              .maybeSingle(),
        );
      } catch (e) {
        secureLog('[Identity] employee_bank_accounts notice: $e');
      }

      Map<String, dynamic>? emergencyContact;
      try {
        emergencyContact = await withTimeout(
          client
              .from('employee_emergency_contacts')
              .select()
              .eq('employee_id', resolvedEmployeeUuid)
              .maybeSingle(),
        );
      } catch (e) {
        secureLog('[Identity] employee_emergency_contacts notice: $e');
      }

      // 7.1 Resolve authoritative Shift from shifts / shift_assignments / attendance_roster_entries
      final shiftId = empRecord['shift_id']?.toString() ??
          (empRecord['employment'] is Map ? empRecord['employment']['shift_id']?.toString() : null);
      if (shiftId != null && shiftId.isNotEmpty) {
        try {
          final shiftRow = await withTimeout(
            client.from('shifts').select().eq('id', shiftId).maybeSingle(),
          );
          if (shiftRow != null) {
            empRecord['shift_name'] = shiftRow['name'] ?? shiftRow['shift_name'] ?? empRecord['shift_name'];
            empRecord['shift_start_time'] = shiftRow['start_time'] ?? shiftRow['shift_start_time'] ?? empRecord['shift_start_time'];
            empRecord['shift_end_time'] = shiftRow['end_time'] ?? shiftRow['shift_end_time'] ?? empRecord['shift_end_time'];
            empRecord['shift'] = shiftRow;
            secureLog('[Identity] Resolved shift from shifts table: ${empRecord['shift_name']}');
          }
        } catch (e) {
          secureLog('[Identity] shifts table lookup notice: $e');
        }
      }

      try {
        final nowIST = DateTime.now().toUtc().add(const Duration(hours: 5, minutes: 30));
        final todayStr = '${nowIST.year}-${nowIST.month.toString().padLeft(2, '0')}-${nowIST.day.toString().padLeft(2, '0')}';
        final rosterToday = await withTimeout(
          client
              .from('attendance_roster_entries')
              .select()
              .eq('employee_id', resolvedEmployeeUuid)
              .eq('date', todayStr)
              .maybeSingle(),
        );
        if (rosterToday != null && rosterToday['shift_name'] != null) {
          empRecord['shift_name'] = rosterToday['shift_name'];
          empRecord['shift_start_time'] = rosterToday['start_time'] ?? empRecord['shift_start_time'];
          empRecord['shift_end_time'] = rosterToday['end_time'] ?? empRecord['shift_end_time'];
          secureLog('[Identity] Resolved shift from today roster: ${empRecord['shift_name']}');
        }
      } catch (_) {}

      // 7.2 Resolve authoritative Organization from organizations table
      final orgId = empRecord['organization_id']?.toString() ??
          empRecord['tenant_id']?.toString() ??
          (empRecord['employment'] is Map ? empRecord['employment']['organization_id']?.toString() : null);
      if (orgId != null && orgId.isNotEmpty) {
        try {
          final orgRow = await withTimeout(
            client.from('organizations').select().eq('id', orgId).maybeSingle(),
          );
          if (orgRow != null) {
            empRecord['organization_name'] = orgRow['name'] ?? orgRow['display_name'] ?? orgRow['legal_name'];
            empRecord['company_name'] = orgRow['name'] ?? orgRow['display_name'] ?? empRecord['company_name'];
            empRecord['organization'] = orgRow;
            secureLog('[Identity] Resolved organization from organizations table: ${empRecord['company_name']}');
          }
        } catch (e) {
          secureLog('[Identity] organizations table lookup notice: $e');
        }
      }

      // 8. Map to canonical UserModel
      final userModel = EmployeeProfileMapper.fromEmployeesRow(
        empRecord,
        authEmail: authEmail,
        authAvatarUrl: authAvatarUrl,
        role: resolvedRole ?? 'EMPLOYEE',
        statutory: statutory,
        bankAccount: bankAccount,
        emergencyContact: emergencyContact,
      );

      secureLog('[Identity] Successfully resolved employee: ${userModel.name} (${userModel.employeeId})');

      return IdentityResolutionResult.success(
        employeeUuid: resolvedEmployeeUuid,
        employeeData: empRecord,
        userModel: userModel,
        role: resolvedRole ?? 'EMPLOYEE',
      );
    } catch (e) {
      secureLog('[Identity] Unexpected error during resolution: $e');
      return IdentityResolutionResult.failure(
        state: IdentityResolutionState.networkError,
        errorMessage: 'Connection error during employee identity resolution. Please try again.',
        safeDiagnosticInfo: 'Exception during resolution: $e',
      );
    }
  }

  /// Convenience wrapper to directly fetch the employee row
  static Future<Map<String, dynamic>?> resolveEmployeeRow(
    SupabaseClient client,
    String authUid,
  ) async {
    final result = await resolve(client: client, authUid: authUid);
    return result.employeeData;
  }
}
