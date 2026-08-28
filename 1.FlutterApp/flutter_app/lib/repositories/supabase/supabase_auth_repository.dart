// supabase_auth_repository.dart — debugPrint is globally available
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/services/employee_identity_resolver.dart';
import '../../core/services/user_service.dart';
import '../../core/utils/query_timeout.dart';
import '../../core/utils/secure_log.dart';
import '../../core/utils/validators.dart';
import '../../models/hrms_models.dart';
import '../interfaces/auth_repository.dart';

/// WorkForceOS — Supabase Authentication Repository
///
/// Identity chain (schema-aligned):
///   Supabase Auth → auth.uid()
///       ↓
///   app_users.auth_user_id (unique uuid)
///   employee_auth_identity.auth_user_id (legacy fallback)
///       ↓
///   Conflict Detection
///       ↓
///   employee UUID → employees.id
///       ↓
///   Status Validation
///       ↓
///   UserModel (loaded into UserService)
class SupabaseAuthRepository implements IAuthRepository {
  SupabaseClient get _client => Supabase.instance.client;

  // ────────────────────────────────────────────────────────────────────────
  // PRIMARY AUTH ENTRY POINT (used by AuthController / LoginScreen)
  // ────────────────────────────────────────────────────────────────────────

  @override
  Future<AuthResult> authenticateUser({
    required String identifier,
    String? password,
    String? otp,
  }) async {
    final trimmedIdentifier = identifier.trim();
    final isEmail = trimmedIdentifier.contains('@');

    if (password == null && otp == null) {
      return const AuthResult(
        success: false,
        errorMessage: "Password is required.",
      );
    }

    try {
      String emailToAuth = trimmedIdentifier;

      // Phone number → resolve work email from employees.profile jsonb.
      if (!isEmail) {
        emailToAuth = await _resolveEmailFromPhone(trimmedIdentifier);
        if (emailToAuth.isEmpty) {
          return const AuthResult(
            success: false,
            errorMessage: "No employee found with this phone number.",
          );
        }
      }

      AuthResponse response;
      if (otp != null && otp.isNotEmpty) {
        response = await _client.auth.verifyOTP(
          email: emailToAuth,
          token: otp,
          type: OtpType.magiclink,
        );
      } else {
        response = await _client.auth.signInWithPassword(
          email: emailToAuth,
          password: password!,
        );
      }

      final authUser = response.user;
      if (authUser == null) {
        return const AuthResult(
          success: false,
          errorMessage: "Authentication failed. Invalid credentials.",
        );
      }

      secureLog('[Auth] Supabase Auth OK — uid: ${authUser.id}');

      // Canonical Identity Resolution & Status Validation
      final resolution = await EmployeeIdentityResolver.resolve(
        client: _client,
        authUid: authUser.id,
        authEmail: authUser.email,
        authAvatarUrl: authUser.userMetadata?['avatar_url'] as String?,
      );

      if (resolution.success && resolution.userModel != null) {
        UserService.instance.setUser(resolution.userModel!);
        secureLog('[Auth] Employee resolved → ${resolution.userModel!.employeeId} / ${resolution.userModel!.name}');
        return AuthResult(
          success: true,
          user: resolution.userModel,
          employeeId: resolution.userModel!.dataId,
        );
      } else {
        secureLog('[Auth] Identity resolution failed: ${resolution.state} — ${resolution.safeDiagnosticInfo}');
        await _client.auth.signOut().catchError((_) {});
        return AuthResult(
          success: false,
          errorMessage: resolution.errorMessage ?? "Your account is authenticated, but no employee profile was found. Contact HR.",
        );
      }
    } on AuthException catch (e) {
      secureLog('[Auth] AuthException: ${e.message}');
      return AuthResult(
        success: false,
        errorMessage: _friendlyAuthError(e.message),
      );
    } catch (e) {
      secureLog('[Auth] Unexpected error: $e');
      return const AuthResult(
        success: false,
        errorMessage: "Authentication failed. Check your connection and try again.",
      );
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // SIGN IN WITH PASSWORD (secondary — kept for interface compatibility)
  // ────────────────────────────────────────────────────────────────────────

  @override
  Future<UserModel?> signInWithPassword(String email, String password) async {
    final result = await authenticateUser(
      identifier: email,
      password: password,
    );
    return result.user;
  }

  // ────────────────────────────────────────────────────────────────────────
  // SIGN OUT
  // ────────────────────────────────────────────────────────────────────────

  @override
  Future<void> signOut() async {
    try {
      await _client.auth.signOut();
      secureLog('[Auth] Signed out');
    } catch (e) {
      secureLog('[Auth] Sign out error: $e');
    } finally {
      UserService.instance.clearUser();
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // SESSION RESTORATION (on app startup)
  // ────────────────────────────────────────────────────────────────────────

  @override
  Future<UserModel?> restoreSession() async {
    try {
      final session = _client.auth.currentSession;
      if (session == null) {
        secureLog('[Auth] No active session — showing Login');
        return null;
      }

      final authUser = session.user;
      secureLog('[Auth] Session found — uid: ${authUser.id}');

      final resolution = await EmployeeIdentityResolver.resolve(
        client: _client,
        authUid: authUser.id,
        authEmail: authUser.email,
        authAvatarUrl: authUser.userMetadata?['avatar_url'] as String?,
      );

      if (resolution.success && resolution.userModel != null) {
        UserService.instance.setUser(resolution.userModel!);
        secureLog('[Auth] Session restored → ${resolution.userModel!.name}');
        return resolution.userModel;
      } else {
        secureLog('[Auth] Session found but resolution failed (${resolution.state}) — clearing');
        await signOut();
        return null;
      }
    } catch (e) {
      secureLog('[Auth] Session restore error: $e');
      return null;
    }
  }


  // ────────────────────────────────────────────────────────────────────────
  // PASSWORD MANAGEMENT
  // ────────────────────────────────────────────────────────────────────────

  @override
  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      final isValid = await verifyPassword(currentPassword);
      if (!isValid) return false;
      await _client.auth.updateUser(UserAttributes(password: newPassword));
      return true;
    } catch (e) {
      secureLog('[Auth] Change password error: $e');
      return false;
    }
  }

  @override
  Future<bool> resetPasswordForEmail(String email) async {
    try {
      await _client.auth.resetPasswordForEmail(
        email,
        redirectTo: 'workforceos://reset-password',
      );
      return true;
    } catch (e) {
      secureLog('[Auth] Reset password error: $e');
      return false;
    }
  }

  /// Verifies the user's password without altering the current session.
  ///
  /// SECURITY NOTE: This method uses signInWithPassword which creates a new
  /// session token. This is a known limitation — Supabase has no dedicated
  /// password verification endpoint. The new token replaces the old one.
  ///
  /// TODO: Replace with a server-side Edge Function that verifies the password
  /// via Supabase service_role key and returns a boolean, without creating
  /// a new session. This would be the proper fix for this security concern.
  @override
  Future<bool> verifyPassword(String password) async {
    try {
      final currentUser = _client.auth.currentUser;
      if (currentUser?.email == null) return false;
      final res = await _client.auth.signInWithPassword(
        email: currentUser!.email!,
        password: password,
      );
      return res.user != null;
    } catch (e) {
      secureLog('[Auth] Verify password error: $e');
      return false;
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // SENSITIVE STATUTORY DETAILS (after password verification)
  // Tables per schema: employee_statutory_details, employee_bank_accounts
  // ────────────────────────────────────────────────────────────────────────

  @override
  Future<PayrollStatutoryModel?> getSensitiveStatutoryDetails(String employeeId) async {
    try {
      final statData = await withTimeout(
        _client
            .from('employee_statutory_details')
            .select()
            .eq('employee_id', employeeId)
            .maybeSingle(),
      );

      final bankData = await withTimeout(
        _client
            .from('employee_bank_accounts')
            .select()
            .eq('employee_id', employeeId)
            .maybeSingle(),
      );

      if (statData != null || bankData != null) {
        return PayrollStatutoryModel(
          bankName: bankData?['bank_name'] ?? 'N/A',
          branchName: bankData?['bank_branch'] ?? 'N/A',
          accountNumber: bankData?['account_number'] ?? 'N/A',
          ifscCode: bankData?['ifsc_code'] ?? 'N/A',
          pfNumber: statData?['pf_number'] ?? 'N/A',
          esiNumber: statData?['esi_number'] ?? 'N/A',
        );
      }
    } catch (e) {
      secureLog('[Auth] Statutory details error: $e');
    }

    return UserService.instance.currentUser.payrollStatutory ??
        const PayrollStatutoryModel(
          bankName: 'N/A',
          branchName: 'N/A',
          accountNumber: 'N/A',
          ifscCode: 'N/A',
          pfNumber: 'N/A',
          esiNumber: 'N/A',
        );
  }

  // ────────────────────────────────────────────────────────────────────────
  // PHONE LOOKUP HELPER
  // ────────────────────────────────────────────────────────────────────────


  /// Phone → work_email lookup. The employees table has no top-level phone
  /// column in this schema; the value lives in the profile jsonb.
  Future<String> _resolveEmailFromPhone(String phone) async {
    if (!Validators.isValidPhone(phone)) {
      return '';
    }
    final cleanedPhone = phone.replaceAll(RegExp(r'[\s\-\(\)]'), '');
    for (final key in const ['phone', 'mobile', 'contact_number', 'phone_number']) {
      try {
        final column = 'profile->>$key';
        final record = await withTimeout(
          _client
              .from('employees')
              .select('work_email')
              .filter(column, 'eq', cleanedPhone)
              .maybeSingle(),
        );
        if (record != null && record['work_email'] != null) {
          return record['work_email'].toString();
        }
      } catch (e) {
        secureLog('[Auth] Phone lookup ($key) failed: $e');
      }
    }
    return '';
  }

  // ────────────────────────────────────────────────────────────────────────
  // HELPER: Convert Supabase AuthException to user-friendly message
  // ────────────────────────────────────────────────────────────────────────

  String _friendlyAuthError(String? message) {
    final msg = message?.toLowerCase() ?? '';
    // Supabase-side DB failure (e.g. broken trigger / access-token hook).
    // Credentials were accepted — this is a server problem, not a password one.
    if (msg.contains('database error') ||
        msg.contains('unexpected_failure') ||
        msg.contains('internal error')) {
      return 'Sign-in is temporarily unavailable due to a server configuration '
          'issue. Your credentials are fine — please contact your administrator.';
    }
    if (msg.contains('invalid login') || msg.contains('invalid credentials')) {
      return 'Invalid work email or password.';
    }
    if (msg.contains('email not confirmed')) {
      return 'Email not verified. Contact your HR administrator.';
    }
    if (msg.contains('too many requests') || msg.contains('rate limit')) {
      return 'Too many attempts. Please wait a few minutes and try again.';
    }
    if (msg.contains('network') || msg.contains('connection') || msg.contains('timeout')) {
      return 'Connection error. Check your internet connection.';
    }
    if (msg.contains('user not found')) {
      return 'No account found for this email.';
    }
    return 'Authentication failed. Please try again.';
  }
}
