import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../../models/employee_models.dart';
import '../../models/employee_relations_models.dart';
import '../../models/hrms_models.dart';
import '../../repositories/interfaces/employee_repository.dart';
import '../../repositories/supabase/supabase_attendance_repository.dart';
import '../../repositories/supabase/supabase_employee_relations_repository.dart';
import '../../repositories/supabase/supabase_leave_repository.dart';
import '../../repositories/supabase/supabase_more_modules_repository.dart';
import '../../repositories/supabase/supabase_notification_repository.dart';
import '../services/document_upload_service.dart';
import '../services/user_service.dart';
import '../utils/validators.dart';


import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/utils/secure_log.dart';

class LeaveController extends ChangeNotifier {
  static final LeaveController instance =
      LeaveController._internal(SupabaseLeaveRepository());
  LeaveController._internal(this._leaveRepository);

  final ILeaveRepository _leaveRepository;
  RealtimeChannel? _leaveChannel;
  String? _subscribedEmployeeId;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  LeaveBalanceModel? _balance;
  LeaveBalanceModel? get balance => _balance;

  List<LeaveRequestModel> _requests = [];
  List<LeaveRequestModel> get requests => _requests;

  List<LeaveTypeConfigModel> _leaveTypes = [];
  List<LeaveTypeConfigModel> get leaveTypes => _leaveTypes;

  void initialize() {
    UserService.instance.addListener(_loadData);
    _loadData();
  }

  Future<void> refresh() => _loadData();

  Future<void> _loadData() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final user = UserService.instance.currentUser;
      final employeeId = (user.employeeUuid?.isNotEmpty == true)
          ? user.employeeUuid!
          : (user.employeeId.isNotEmpty ? user.employeeId : user.dataId);

      _subscribeRealtime(employeeId);

      _leaveTypes = await _leaveRepository.getLeaveTypes(user.companyId);
      _balance = await _leaveRepository.getLeaveBalances(employeeId);
      _requests = await _leaveRepository.getLeaveRequests(employeeId);
    } catch (e) {
      _errorMessage = "Failed to load leave data: $e";
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void _subscribeRealtime(String employeeId) {
    if (_subscribedEmployeeId == employeeId && _leaveChannel != null) return;
    _leaveChannel?.unsubscribe();

    try {
      _subscribedEmployeeId = employeeId;
      _leaveChannel = Supabase.instance.client
          .channel('leave-realtime-$employeeId')
        ..onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'leave_requests',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'employee_id',
            value: employeeId,
          ),
          callback: (payload) {
            secureLog('[REALTIME] leave_requests event for $employeeId');
            _silentRefresh();
          },
        )
        ..onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'leave_entitlements',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'employee_id',
            value: employeeId,
          ),
          callback: (payload) {
            secureLog('[REALTIME] leave_entitlements event for $employeeId');
            _silentRefresh();
          },
        )
        ..onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'leave_types',
          callback: (payload) {
            secureLog('[REALTIME] leave_types catalog event');
            _silentRefresh();
          },
        )
        ..subscribe();
    } catch (e) {
      secureLog('[REALTIME] Leave subscription notice: $e');
    }
  }

  Future<void> _silentRefresh() async {
    try {
      final user = UserService.instance.currentUser;
      final employeeId = (user.employeeUuid?.isNotEmpty == true)
          ? user.employeeUuid!
          : (user.employeeId.isNotEmpty ? user.employeeId : user.dataId);
      _leaveTypes = await _leaveRepository.getLeaveTypes(user.companyId);
      _balance = await _leaveRepository.getLeaveBalances(employeeId);
      _requests = await _leaveRepository.getLeaveRequests(employeeId);
      notifyListeners();
    } catch (_) {}
  }

  Future<bool> applyLeave({
    required LeaveType type,
    String? leaveTypeId,
    String? leaveTypeCode,
    String? leaveTypeName,
    required DateTime startDate,
    required DateTime endDate,
    double? customDays,
    bool isHalfDay = false,
    String? halfDaySession,
    String reason = "",
  }) async {
    try {
      final user = UserService.instance.currentUser;
      final days = customDays ?? (isHalfDay ? 0.5 : (endDate.difference(startDate).inDays + 1).toDouble());

      // Approver comes directly from the employee's assigned reporting manager
      final approverId = (user.reportsToId?.isNotEmpty == true) ? user.reportsToId : 'mgr-admin';
      final approverName = (user.reportsToName?.isNotEmpty == true) ? user.reportsToName : 'Reporting Manager';

      final newReq = LeaveRequestModel(
        id: "lv-${DateTime.now().millisecondsSinceEpoch}",
        employeeId: user.employeeUuid ?? user.employeeId,
        type: type,
        leaveTypeId: leaveTypeId,
        leaveTypeCode: leaveTypeCode,
        leaveTypeName: leaveTypeName,
        startDate: startDate,
        endDate: endDate,
        daysCount: days,
        isHalfDay: isHalfDay,
        halfDaySession: halfDaySession,
        reason: reason,
        status: LeaveStatus.pending,
        createdAt: DateTime.now(),
        approverId: approverId,
        approverName: approverName,
        managerId: approverId,
        managerName: approverName,
      );

      await _leaveRepository.applyLeave(newReq);
      await _loadData();
      return true;
    } catch (e) {
      _errorMessage = "Failed to apply leave: $e";
      notifyListeners();
      return false;
    }
  }

  Future<bool> cancelLeave(String requestId, {String? reason}) async {
    try {
      await _leaveRepository.cancelLeave(requestId, reason: reason);
      await _loadData();
      return true;
    } catch (e) {
      _errorMessage = "Failed to cancel leave: $e";
      notifyListeners();
      return false;
    }
  }

  @override
  void dispose() {
    _leaveChannel?.unsubscribe();
    super.dispose();
  }
}

class AttendanceDetailController extends ChangeNotifier {
  static final AttendanceDetailController instance =
      AttendanceDetailController._internal(SupabaseAttendanceRepository());
  AttendanceDetailController._internal(this._attendanceRepository);

  final IAttendanceRepository _attendanceRepository;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  DateTime _selectedMonth = DateTime.now();
  DateTime get selectedMonth => _selectedMonth;

  List<TimesheetEntryModel> _timesheets = [];
  List<TimesheetEntryModel> get timesheets => _timesheets;

  AttendanceSummaryModel? _summary;
  AttendanceSummaryModel? get summary => _summary;

  List<RegularizationRequestModel> _regularizations = [];
  List<RegularizationRequestModel> get regularizations => _regularizations;

  List<AttendanceDeviationModel> _deviations = [];
  List<AttendanceDeviationModel> get deviations => _deviations;

  List<AttendanceExceptionModel> _actionableExceptions = [];
  List<AttendanceExceptionModel> get actionableExceptions => _actionableExceptions;

  AttendanceDeviationModel? get todayDeviation {
    final now = DateTime.now();
    try {
      return _deviations.firstWhere(
        (d) =>
            d.date.year == now.year &&
            d.date.month == now.month &&
            d.date.day == now.day &&
            !d.isRegularized,
      );
    } catch (_) {
      return _deviations.isNotEmpty && !_deviations.first.isRegularized ? _deviations.first : null;
    }
  }

  AttendanceExceptionModel? get latestActionableException {
    return _actionableExceptions.isNotEmpty ? _actionableExceptions.first : null;
  }

  void initialize() {
    UserService.instance.addListener(_loadData);
    _loadData();
  }

  Future<void> setMonth(DateTime month) async {
    _selectedMonth = month;
    await _loadData();
  }

  Future<void> nextMonth() async {
    _selectedMonth = DateTime(_selectedMonth.year, _selectedMonth.month + 1, 1);
    await _loadData();
  }

  Future<void> previousMonth() async {
    _selectedMonth = DateTime(_selectedMonth.year, _selectedMonth.month - 1, 1);
    await _loadData();
  }

  Future<void> refresh() => _loadData();

  Future<void> _loadData() async {
    _isLoading = true;
    notifyListeners();

    try {
      final employeeId = UserService.instance.currentUser.dataId;
      _timesheets = await _attendanceRepository.getTimesheets(
        employeeId,
        month: _selectedMonth.month,
        year: _selectedMonth.year,
      );
      _summary = await _attendanceRepository.getAttendanceSummary(
        employeeId,
        month: _selectedMonth.month,
        year: _selectedMonth.year,
      );
      _regularizations = await _attendanceRepository.getRegularizationRequests(employeeId);
      _deviations = await _attendanceRepository.getAttendanceDeviations(employeeId);
      _actionableExceptions = await _attendanceRepository.getActionableAttendanceExceptions(employeeId);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }


  Future<bool> submitRegularization({
    required DateTime date,
    required String inTime,
    required String outTime,
    required String reason,
    String shiftName = 'General Shift',
    String shiftWindow = '09:30 AM — 06:30 PM',
    String reasonCode = 'FORGOT_CHECK_IN',
  }) async {
    try {
      final user = UserService.instance.currentUser;
      final employeeId = user.dataId.isNotEmpty ? user.dataId : user.employeeId;
      final req = RegularizationRequestModel(
        id: "reg-${DateTime.now().millisecondsSinceEpoch}",
        employeeId: employeeId,
        employeeName: user.name,
        department: user.department,
        date: date,
        shiftName: shiftName,
        shiftWindow: shiftWindow,
        requestedInTime: inTime,
        requestedOutTime: outTime,
        reasonCode: reasonCode,
        reason: reason,
        status: LeaveStatus.pending,
        statusState: RegularizationStatusState.managerPending,
        currentStage: 'MANAGER_REVIEW',
      );

      await _attendanceRepository.submitRegularization(req);
      await _loadData();
      return true;
    } catch (e) {
      return false;
    }
  }
}

class MoreModulesController extends ChangeNotifier {
  static final MoreModulesController instance =
      MoreModulesController._internal(SupabaseMoreModulesRepository());
  MoreModulesController._internal(this._repo);

  final IMoreModulesRepository _repo;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  List<EmployeeServiceConfigModel> serviceConfigs = [];
  List<ShiftRosterModel> rosters = [];
  List<PayslipModel> payslips = [];
  List<ExpenseClaimModel> claims = [];
  List<DigitalLetterModel> letters = [];
  List<DocumentModel> documents = [];
  List<PerformanceGoalModel> goals = [];
  List<AnnouncementModel> announcements = [];
  List<ComplaintModel> complaints = [];

  // Module A, B, C state
  List<HelpdeskTicketModel> helpdeskTickets = [];
  List<ServiceDefinitionModel> serviceDefinitions = [];
  List<ServiceRequestModel> serviceRequests = [];
  List<CommunicationModel> communicationsList = [];

  int get pendingClaimsCount => claims.where((c) => c.status == ExpenseStatus.pending).length;
  int get actionRequiredDocsCount => documents.where((d) => d.isPending || d.isRejected).length;
  int get pendingGrievancesCount => complaints.where((c) => c.status == ComplaintStatus.submitted || c.status == ComplaintStatus.underReview).length;
  int get openTicketsCount => helpdeskTickets.where((t) => t.status == HelpdeskStatus.open || t.status == HelpdeskStatus.inProgress).length;
  int get unreadCommunicationsCount => communicationsList.where((c) => !c.isRead).length;

  RealtimeChannel? _documentsChannel;
  String? _subscribedDocEmpId;

  void initialize() {
    UserService.instance.addListener(loadAllData);
    loadAllData();
  }

  void _subscribeRealtime(String employeeId) {
    if (_subscribedDocEmpId == employeeId && _documentsChannel != null) return;
    _documentsChannel?.unsubscribe();

    try {
      _subscribedDocEmpId = employeeId;
      _documentsChannel = Supabase.instance.client
          .channel('more-modules-realtime-$employeeId')
        ..onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'employee_service_configs',
          callback: (payload) {
            secureLog('[REALTIME] employee_service_configs change event');
            loadAllData();
          },
        )
        ..onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'expense_claims',
          callback: (payload) {
            secureLog('[REALTIME] expense_claims change event');
            loadAllData();
          },
        )
        ..onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'digital_letters',
          callback: (payload) {
            secureLog('[REALTIME] digital_letters change event');
            loadAllData();
          },
        )
        ..onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'helpdesk_tickets',
          callback: (payload) {
            secureLog('[REALTIME] helpdesk_tickets change event');
            loadAllData();
          },
        )
        ..onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'helpdesk_messages',
          callback: (payload) {
            secureLog('[REALTIME] helpdesk_messages change event');
            loadAllData();
          },
        )
        ..onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'service_definitions',
          callback: (payload) {
            secureLog('[REALTIME] service_definitions change event');
            loadAllData();
          },
        )
        ..onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'service_requests',
          callback: (payload) {
            secureLog('[REALTIME] service_requests change event');
            loadAllData();
          },
        )
        ..onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'communications',
          callback: (payload) {
            secureLog('[REALTIME] communications change event');
            loadAllData();
          },
        )
        ..onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'employee_documents',
          callback: (payload) {
            secureLog('[REALTIME] employee_documents change event');
            _silentRefreshDocuments();
          },
        )
        ..onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'shift_rosters',
          callback: (payload) {
            secureLog('[REALTIME] shift_rosters change event');
            _silentRefreshDocuments();
          },
        )
        ..subscribe();
    } catch (e) {
      secureLog('[REALTIME] More Modules subscription notice: $e');
    }
  }

  Future<void> _silentRefreshDocuments() async {
    try {
      final user = UserService.instance.currentUser;
      final empId = user.dataId;
      payslips = await _repo.getPayslips(empId);
      documents = await _repo.getDocuments(empId, companyId: user.companyId, requesterRole: user.role);
      rosters = await _repo.getShiftRoster(empId);
      claims = await _repo.getExpenseClaims(empId);
      letters = await _repo.getDigitalLetters(empId);
      notifyListeners();
    } catch (_) {}
  }

  Future<void> loadAllData() async {
    _isLoading = true;
    notifyListeners();

    try {
      final user = UserService.instance.currentUser;
      final empId = user.dataId;
      _subscribeRealtime(empId);

      serviceConfigs = await _repo.getServiceConfigs(user.companyId);
      rosters = await _repo.getShiftRoster(empId);
      payslips = await _repo.getPayslips(empId);
      claims = await _repo.getExpenseClaims(empId);
      letters = await _repo.getDigitalLetters(empId);
      documents = await _repo.getDocuments(empId, companyId: user.companyId, requesterRole: user.role);
      goals = await _repo.getPerformanceGoals(empId);
      announcements = await _repo.getAnnouncements();
      complaints = await _repo.getComplaints(empId);

      // Load Employee Relations Modules A, B, C
      helpdeskTickets = await SupabaseEmployeeRelationsRepository.instance.getHelpdeskTickets(empId);
      serviceDefinitions = await SupabaseEmployeeRelationsRepository.instance.getServiceDefinitions();
      serviceRequests = await SupabaseEmployeeRelationsRepository.instance.getServiceRequests(empId);
      communicationsList = await SupabaseEmployeeRelationsRepository.instance.getCommunications(empId);
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> uploadDocument({
    required String documentType,
    required String fileName,
    required String fileExtension,
    required String fileSize,
    String? filePath,
  }) async {
    try {
      final user = UserService.instance.currentUser;
      String? storageUrl;

      if (filePath != null && filePath.isNotEmpty) {
        final file = File(filePath);
        if (await file.exists()) {
          storageUrl = await DocumentUploadService.instance.uploadEmployeeDocument(
            tenantId: user.companyId.isNotEmpty ? user.companyId : 'org-default',
            employeeId: user.employeeUuid ?? user.employeeId,
            docCategory: documentType.toUpperCase().replaceAll(' ', '_'),
            file: file,
            fileName: fileName,
            employeeName: user.name,
          );
        }
      }

      final newDoc = DocumentModel(
        id: "doc-${DateTime.now().millisecondsSinceEpoch}",
        name: "$documentType Document",
        category: DocumentCategory.personal,
        fileType: fileExtension.toUpperCase().replaceAll('.', ''),
        fileSize: fileSize,
        uploadedAt: DateTime.now(),
        companyId: user.companyId,
        employeeId: user.employeeId,
        documentType: documentType,
        fileExtension: fileExtension,
        fileUrl: storageUrl,
        storagePath: "company/${user.companyId}/employees/${user.employeeId}/documents/doc-${DateTime.now().millisecondsSinceEpoch}/${Validators.sanitizeFileName(fileName)}",
        uploadedBy: user.name,
        isPrivate: true,
      );
      await _repo.uploadDocument(newDoc);
      await loadAllData();
      return true;
    } catch (_) {
      return false;
    }
  }


  Future<bool> submitExpenseClaim({
    required String title,
    required String category,
    required double amount,
    required String description,
    Uint8List? receiptBytes,
    String? receiptFileName,
  }) async {
    try {
      final user = UserService.instance.currentUser;
      String? uploadedUrl;

      if (receiptBytes != null && receiptFileName != null && receiptFileName.isNotEmpty) {
        uploadedUrl = await DocumentUploadService.instance.uploadExpenseReceipt(
          tenantId: user.companyId.isNotEmpty ? user.companyId : 'org-joy-01',
          employeeId: user.employeeUuid ?? user.employeeId,
          bytes: receiptBytes,
          fileName: receiptFileName,
        );
      }

      final claim = ExpenseClaimModel(
        id: "exp-${DateTime.now().millisecondsSinceEpoch}",
        title: title,
        category: category,
        amount: amount,
        date: DateTime.now(),
        description: description,
        status: ExpenseStatus.pending,
        attachmentName: receiptFileName,
        receiptUrl: uploadedUrl,
      );
      await _repo.submitExpenseClaim(claim);
      await loadAllData();
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> acknowledgeDigitalLetter(String letterId, {String? signatureData}) async {
    try {
      await _repo.acknowledgeDigitalLetter(letterId, signatureData: signatureData);
      await loadAllData();
    } catch (_) {}
  }

final Map<String, CompanyOrganizationModel> _tenantOrganizations = {};

  Future<bool> submitComplaint({
    required String subject,
    required String category,
    required String description,
  }) async {
    try {
      final user = UserService.instance.currentUser;
      final companyId = user.companyId;

      ComplaintDestinationType destType = ComplaintDestinationType.normalApprover;
      String? destId;
      String? destName;

      if (category == "POSH Complaint") {
        final org = _tenantOrganizations[companyId];

        if (org != null && org.poshCommittee != null && org.poshCommittee!.isActive) {
          destType = ComplaintDestinationType.poshCommittee;
          destId = org.poshCommittee!.id;
          destName = org.poshCommittee!.committeeName;
        } else if (org != null && org.companyAdminId.isNotEmpty) {
          destType = ComplaintDestinationType.companyAdmin;
          destId = org.companyAdminId;
          destName = org.companyAdminName;
        } else {
          return false;
        }
      } else {
        destType = ComplaintDestinationType.normalApprover;
        destId = user.reportsToId;
        destName = user.reportsToName;
      }

      final complaint = ComplaintModel(
        id: "cmp-${DateTime.now().millisecondsSinceEpoch}",
        subject: subject,
        category: category,
        description: description,
        createdAt: DateTime.now(),
        status: ComplaintStatus.submitted,
        companyId: companyId,
        destinationType: destType,
        destinationId: destId,
        destinationName: destName,
      );
      await _repo.submitComplaint(complaint);
      await loadAllData();
      return true;
    } catch (_) {
      return false;
    }
  }
  Future<bool> submitHelpdeskTicket({
    required String category,
    required String subject,
    required String description,
    required TicketPriority priority,
    Uint8List? attachmentBytes,
    String? attachmentFileName,
  }) async {
    try {
      final tkt = await SupabaseEmployeeRelationsRepository.instance.submitHelpdeskTicket(
        category: category,
        subject: subject,
        description: description,
        priority: priority,
        attachmentBytes: attachmentBytes,
        attachmentFileName: attachmentFileName,
      );
      if (tkt != null) {
        helpdeskTickets.removeWhere((x) => x.id == tkt.id || x.ticketNumber == tkt.ticketNumber);
        helpdeskTickets.insert(0, tkt);
        notifyListeners();
        await loadAllData();
        return true;
      }
    } catch (_) {}
    return false;
  }

  Future<bool> sendTicketMessage(String ticketId, String message) async {
    try {
      final msg = await SupabaseEmployeeRelationsRepository.instance.sendTicketMessage(ticketId, message);
      if (msg != null) {
        await loadAllData();
        return true;
      }
    } catch (_) {}
    return false;
  }

  Future<bool> submitServiceRequest({
    required ServiceDefinitionModel definition,
    required Map<String, dynamic> formData,
    List<Map<String, dynamic>> attachments = const [],
  }) async {
    try {
      final req = await SupabaseEmployeeRelationsRepository.instance.submitServiceRequest(
        definition: definition,
        formData: formData,
        attachments: attachments,
      );
      if (req != null) {
        await loadAllData();
        return true;
      }
    } catch (_) {}
    return false;
  }

  Future<bool> acknowledgeCommunication(String communicationId) async {
    try {
      final ok = await SupabaseEmployeeRelationsRepository.instance.acknowledgeCommunication(communicationId);
      if (ok) {
        await loadAllData();
        return true;
      }
    } catch (_) {}
    return false;
  }
}

class NotificationController extends ChangeNotifier {
  static final NotificationController instance =
      NotificationController._internal(SupabaseNotificationRepository());
  NotificationController._internal(this._repo);

  final INotificationRepository _repo;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;
  bool get hasError => _errorMessage != null;

  List<NotificationItemModel> _notifications = [];
  List<NotificationItemModel> get notifications => _notifications;

  List<ActivityItemModel> _activities = [];
  List<ActivityItemModel> get activities => _activities;

  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  RealtimeChannel? _notificationChannel;
  String? _subscribedTargetId;

  void initialize() {
    UserService.instance.addListener(() {
      loadNotifications();
    });
    loadNotifications();
  }

  void _subscribeRealtime(String targetId) {
    if (_subscribedTargetId == targetId && _notificationChannel != null) return;
    _notificationChannel?.unsubscribe();

    try {
      _subscribedTargetId = targetId;
      _notificationChannel = Supabase.instance.client
          .channel('notifications-realtime-$targetId')
        ..onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'notification_events',
          callback: (payload) {
            secureLog('[REALTIME] notification_events change event -> refreshing notifications');
            loadNotifications();
          },
        )
        ..onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'document_requirements',
          callback: (payload) {
            secureLog('[REALTIME] document_requirements change event -> refreshing notifications');
            loadNotifications();
          },
        )
        ..subscribe();
    } catch (e) {
      secureLog('[REALTIME] Notification subscription notice: $e');
    }
  }

  Future<void> loadNotifications() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final user = UserService.instance.currentUser;
      final targetId = (user.employeeUuid?.isNotEmpty == true)
          ? user.employeeUuid!
          : (user.employeeId.isNotEmpty ? user.employeeId : user.dataId);

      if (targetId.isNotEmpty) {
        _subscribeRealtime(targetId);
      }

      final fetched = await _repo.getNotifications(targetId);
      final activities = await _repo.getRecentActivities(targetId);

      _notifications = fetched;
      _activities = activities;
      _errorMessage = null;
    } catch (e) {
      _errorMessage = 'Unable to load notifications. Please check your connection.';
      secureLog('[NotificationController] loadNotifications error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> markAsRead(String id) async {
    final idx = _notifications.indexWhere((n) => n.id == id);
    if (idx != -1) {
      final old = _notifications[idx];
      _notifications[idx] = NotificationItemModel(
        id: old.id,
        title: old.title,
        message: old.message,
        timestamp: old.timestamp,
        isRead: true,
        icon: old.icon,
        notificationType: old.notificationType,
        entityType: old.entityType,
        entityId: old.entityId,
        dueDate: old.dueDate,
        status: old.status,
        rejectionReason: old.rejectionReason,
      );
      notifyListeners();
    }
    await _repo.markNotificationAsRead(id);
  }
}
