import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/services/user_service.dart';
import '../../../../core/utils/secure_log.dart';
import '../../../../models/employee_models.dart';
import '../../../../repositories/interfaces/task_repository.dart';
import '../../../../repositories/supabase/supabase_task_repository.dart';

class TaskController extends ChangeNotifier {
  static final TaskController instance = TaskController._internal(SupabaseTaskRepository());
  TaskController._internal(this._repo);

  final ITaskRepository _repo;
  RealtimeChannel? _taskChannel;
  String? _subscribedEmployeeId;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  List<TaskModel> _tasks = [];
  List<TaskModel> get tasks => _tasks;

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
      _tasks = await _repo.getAssignedTasks(employeeId);
    } catch (e) {
      _errorMessage = "Failed to load tasks: $e";
      secureLog('[Tasks] Load error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void _subscribeRealtime(String employeeId) {
    if (_subscribedEmployeeId == employeeId && _taskChannel != null) return;
    _taskChannel?.unsubscribe();

    try {
      _subscribedEmployeeId = employeeId;
      _taskChannel = Supabase.instance.client
          .channel('employee-tasks-$employeeId')
        ..onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'employee_tasks',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'employee_id',
            value: employeeId,
          ),
          callback: (payload) {
            secureLog('[REALTIME] employee_tasks change event received');
            _silentRefresh();
          },
        )
        ..subscribe();
    } catch (e) {
      secureLog('[REALTIME] Task subscription notice: $e');
    }
  }

  Future<void> _silentRefresh() async {
    try {
      final user = UserService.instance.currentUser;
      final employeeId = (user.employeeUuid?.isNotEmpty == true)
          ? user.employeeUuid!
          : (user.employeeId.isNotEmpty ? user.employeeId : user.dataId);
      _tasks = await _repo.getAssignedTasks(employeeId);
      notifyListeners();
    } catch (_) {}
  }

  @override
  void dispose() {
    _taskChannel?.unsubscribe();
    super.dispose();
  }
}
