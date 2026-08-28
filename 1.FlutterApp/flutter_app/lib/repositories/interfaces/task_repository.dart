import '../../models/employee_models.dart';

abstract class ITaskRepository {
  Future<List<TaskModel>> getAssignedTasks(String employeeId);
}
