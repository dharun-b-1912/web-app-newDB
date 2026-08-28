import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/config/supabase_config.dart';
import '../../core/services/user_service.dart';
import '../../core/utils/query_timeout.dart';
import '../../core/utils/secure_log.dart';
import '../../models/employee_models.dart';
import '../interfaces/task_repository.dart';

class SupabaseTaskRepository implements ITaskRepository {
  SupabaseClient get _client => Supabase.instance.client;

  @override
  Future<List<TaskModel>> getAssignedTasks(String employeeId) async {
    try {
      if (!SupabaseConfig.isConfigured) {
        return [];
      }

      final user = UserService.instance.currentUser;
      final targetId = (user.employeeUuid?.isNotEmpty == true)
          ? user.employeeUuid!
          : (user.employeeId.isNotEmpty ? user.employeeId : employeeId);

      final List<TaskModel> allTasks = [];

      // 1. Onboarding tasks
      try {
        final obData = await withTimeout(
          _client
              .from('onboarding_tasks')
              .select()
              .or('assigned_to_user_id.eq.$targetId,assigned_to_user_id.eq.${user.dataId}')
              .order('created_at', ascending: false),
        );
        for (final row in obData) {
          allTasks.add(_mapTaskRow(row, targetId, prefix: '[Onboarding] '));
        }
      } catch (e) {
        secureLog('[Tasks] onboarding_tasks query notice: $e');
      }

      // 2. Separation tasks
      try {
        final sepData = await withTimeout(
          _client
              .from('separation_tasks')
              .select()
              .or('handover_owner_id.eq.$targetId,recipient_id.eq.$targetId')
              .order('created_at', ascending: false),
        );
        for (final row in sepData) {
          allTasks.add(_mapTaskRow(row, targetId, prefix: '[Handover] '));
        }
      } catch (e) {
        secureLog('[Tasks] separation_tasks query notice: $e');
      }

      // 3. Approval items / requests
      try {
        final appData = await withTimeout(
          _client
              .from('approval_items')
              .select()
              .eq('requested_by_id', targetId)
              .order('date_submitted', ascending: false),
        );
        for (final row in appData) {
          allTasks.add(_mapApprovalRow(row, targetId));
        }
      } catch (e) {
        secureLog('[Tasks] approval_items query notice: $e');
      }

      // 4. Employee tasks or general tasks table
      try {
        final data = await withTimeout(
          _client
              .from('employee_tasks')
              .select()
              .eq('employee_id', targetId)
              .order('created_at', ascending: false),
        );
        for (final row in data) {
          allTasks.add(_mapTaskRow(row, targetId));
        }
      } catch (e) {
        secureLog('[Tasks] employee_tasks query notice: $e');
      }

      return allTasks;
    } catch (e) {
      secureLog('[Tasks] getAssignedTasks error: $e');
      return [];
    }
  }

  TaskModel _mapTaskRow(Map<String, dynamic> row, String fallbackEmployeeId, {String prefix = ''}) {
    final rawStatus = (row['status']?.toString() ?? 'pending').toLowerCase().trim();
    final rawPriority = (row['priority']?.toString() ?? 'medium').toLowerCase().trim();

    TaskStatus status = TaskStatus.pending;
    if (rawStatus == 'in_progress' || rawStatus == 'inprogress' || rawStatus == 'active') {
      status = TaskStatus.inProgress;
    } else if (rawStatus == 'completed' || rawStatus == 'done' || rawStatus == 'resolved') {
      status = TaskStatus.completed;
    } else if (rawStatus == 'blocked' || rawStatus == 'on_hold') {
      status = TaskStatus.blocked;
    } else if (rawStatus == 'cancelled' || rawStatus == 'canceled') {
      status = TaskStatus.cancelled;
    }

    TaskPriority priority = TaskPriority.medium;
    if (rawPriority == 'low') {
      priority = TaskPriority.low;
    } else if (rawPriority == 'high') {
      priority = TaskPriority.high;
    } else if (rawPriority == 'urgent' || rawPriority == 'critical') {
      priority = TaskPriority.urgent;
    }

    final rawTitle = row['title']?.toString() ?? row['task_name']?.toString() ?? 'Assigned Task';

    return TaskModel(
      id: row['id']?.toString() ?? 'task-${DateTime.now().millisecondsSinceEpoch}',
      title: '$prefix$rawTitle',
      description: row['description']?.toString() ?? '',
      assignedToId: row['employee_id']?.toString() ??
          row['assigned_to_user_id']?.toString() ??
          row['assigned_to_id']?.toString() ??
          fallbackEmployeeId,
      assignedToName: row['employee_name']?.toString() ?? row['assigned_to_name']?.toString(),
      assignedById: row['assigned_by_id']?.toString() ?? row['created_by']?.toString(),
      assignedByName: row['assigned_by_name']?.toString() ?? row['handover_owner_name']?.toString(),
      assignedDate: DateTime.tryParse(row['assigned_date']?.toString() ?? row['created_at']?.toString() ?? ''),
      dueDate: DateTime.tryParse(row['due_date']?.toString() ?? row['deadline']?.toString() ?? ''),
      completedDate: DateTime.tryParse(row['completed_at']?.toString() ?? row['completed_date']?.toString() ?? ''),
      priority: priority,
      status: status,
      progressPercent: (row['progress_percent'] as num?)?.toInt() ?? (status == TaskStatus.completed ? 100 : 0),
    );
  }

  TaskModel _mapApprovalRow(Map<String, dynamic> row, String fallbackEmployeeId) {
    final rawStatus = (row['status']?.toString() ?? 'pending').toLowerCase().trim();
    TaskStatus status = TaskStatus.pending;
    if (rawStatus == 'approved' || rawStatus == 'completed') {
      status = TaskStatus.completed;
    } else if (rawStatus == 'rejected') {
      status = TaskStatus.cancelled;
    }

    return TaskModel(
      id: row['id']?.toString() ?? 'app-${DateTime.now().millisecondsSinceEpoch}',
      title: '[Approval] ${row['title'] ?? row['type'] ?? 'Request'}',
      description: row['details']?.toString() ?? row['amount_or_duration']?.toString() ?? '',
      assignedToId: row['requested_by_id']?.toString() ?? fallbackEmployeeId,
      assignedToName: row['requested_by_name']?.toString(),
      assignedDate: DateTime.tryParse(row['date_submitted']?.toString() ?? ''),
      priority: TaskPriority.medium,
      status: status,
      progressPercent: status == TaskStatus.completed ? 100 : 0,
    );
  }
}
