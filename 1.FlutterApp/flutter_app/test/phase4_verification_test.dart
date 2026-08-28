import 'package:flutter_test/flutter_test.dart';
import 'package:workforce_os/models/employee_models.dart';
import 'package:workforce_os/repositories/supabase/supabase_leave_repository.dart';
import 'package:workforce_os/repositories/supabase/supabase_task_repository.dart';

void main() {
  test('Phase 4: Leave models & dynamic balance checks', () {
    final emptyBalance = LeaveBalanceModel.empty();
    expect(emptyBalance.casualAvailable, 0.0);
    expect(emptyBalance.casualUsed, 0.0);
    expect(emptyBalance.sickAvailable, 0.0);
    expect(emptyBalance.earnedAvailable, 0.0);
    expect(emptyBalance.items.isEmpty, true);

    const dynamicItem = DynamicLeaveBalanceItem(
      leaveTypeCode: 'ML',
      leaveTypeName: 'Maternity Leave',
      available: 12.0,
      used: 0.0,
    );
    expect(dynamicItem.leaveTypeCode, 'ML');
    expect(dynamicItem.available, 12.0);
  });

  test('Phase 4: Task model validation', () {
    const task = TaskModel(
      id: 'task-101',
      title: 'Fix Leave Sync',
      description: 'Connect to live Supabase leave tables',
      priority: TaskPriority.urgent,
      status: TaskStatus.inProgress,
      progressPercent: 75,
    );

    expect(task.id, 'task-101');
    expect(task.priority, TaskPriority.urgent);
    expect(task.status, TaskStatus.inProgress);
    expect(task.progressPercent, 75);
  });

  test('Phase 4: SupabaseTaskRepository returns empty list when unconfigured / empty', () async {
    final repo = SupabaseTaskRepository();
    final tasks = await repo.getAssignedTasks('test-emp');
    expect(tasks, isEmpty);
  });

  test('Phase 4: SupabaseLeaveRepository leave type parsing', () {
    expect(SupabaseLeaveRepository.parseLeaveType('Casual Leave'), LeaveType.casual);
    expect(SupabaseLeaveRepository.parseLeaveType('Sick Leave (SL)'), LeaveType.sick);
    expect(SupabaseLeaveRepository.parseLeaveType('Earned Leave'), LeaveType.earned);
    expect(SupabaseLeaveRepository.parseLeaveType('Maternity Leave'), LeaveType.maternity);
    expect(SupabaseLeaveRepository.parseLeaveType('Paternity Leave'), LeaveType.paternity);
  });
}
